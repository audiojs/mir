import test, { almost, ok, is } from 'tst'
import { chroma, chord, smoothChords, key, TEMPLATES, tonnetz, melody, tempogram, structure, fingerprint, fingerprintMatch, multif0, transcribe, drums, downbeat, similarity, coversong } from './index.js'

let fs = 44100

// --- signal generators ---

function sine(freq, n, sampleRate = fs) {
  let d = new Float32Array(n)
  for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / sampleRate)
  return d
}

// frequency-modulated sine: instantaneous pitch varies ±depth Hz around baseFreq
function vibrato(baseFreq, depth, modFreq, n, sampleRate = fs) {
  let d = new Float32Array(n), phase = 0
  for (let i = 0; i < n; i++) {
    let f = baseFreq + depth * Math.sin(2 * Math.PI * modFreq * i / sampleRate)
    d[i] = Math.sin(phase)
    phase += 2 * Math.PI * f / sampleRate
  }
  return d
}

// two equal-amplitude sines at f1 and f2
function twosines(f1, f2, n, sampleRate = fs) {
  let d = new Float32Array(n)
  for (let i = 0; i < n; i++)
    d[i] = 0.5 * Math.sin(2 * Math.PI * f1 * i / sampleRate)
           + 0.5 * Math.sin(2 * Math.PI * f2 * i / sampleRate)
  return d
}

function silence(n) { return new Float32Array(n) }

// band-limited sawtooth: sum of H harmonics with 1/h amplitude (simulates a pitched instrument)
function saw(freq, n, harmonics = 10, sampleRate = fs) {
  let d = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let h = 1; h <= harmonics; h++) {
      if (h * freq > sampleRate / 2) break
      s += Math.sin(2 * Math.PI * h * freq * i / sampleRate) / h
    }
    d[i] = s
  }
  return d
}

// chord synthesized as a sum of sawtooths at MIDI pitches
function synthChord(midiNotes, n, harmonics = 6, sampleRate = fs) {
  let d = new Float32Array(n)
  for (let m of midiNotes) {
    let f0 = 440 * Math.pow(2, (m - 69) / 12)
    for (let i = 0; i < n; i++) {
      for (let h = 1; h <= harmonics; h++) {
        if (h * f0 > sampleRate / 2) break
        d[i] += Math.sin(2 * Math.PI * h * f0 * i / sampleRate) / h
      }
    }
  }
  return d
}

// deterministic low-correlation noise: sum of 16 inharmonic sines at irrational ratios
function noise(n, sampleRate = fs) {
  let d = new Float32Array(n)
  let freqs = [317, 641, 1013, 1499, 2003, 2749, 3571, 4201, 5003, 6007, 7109, 8221, 9337, 10613, 11903, 13001]
  for (let i = 0; i < n; i++) {
    let v = 0
    for (let f of freqs) v += Math.sin(2 * Math.PI * f * i / sampleRate)
    d[i] = v / freqs.length
  }
  return d
}

// deterministic white noise via Box–Muller over a seeded LCG
function whiteNoise(n, seed = 42) {
  let d = new Float32Array(n)
  let s = seed
  let rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  for (let i = 0; i < n; i += 2) {
    let u1 = Math.max(1e-12, rand()), u2 = rand()
    let r = Math.sqrt(-2 * Math.log(u1))
    d[i] = r * Math.cos(2 * Math.PI * u2)
    if (i + 1 < n) d[i + 1] = r * Math.sin(2 * Math.PI * u2)
  }
  return d
}

// =============================================================================
// Chroma — PCP and NNLS
// =============================================================================

test('chroma pcp — C major triad peaks at C, E, G', () => {
  // C4 E4 G4 = MIDI 60, 64, 67 = pitch classes 0, 4, 7
  let c = chroma(synthChord([60, 64, 67], 4096), { fs })
  is(c.length, 12)
  let sum = 0
  for (let x of c) sum += x
  almost(sum, 1, 1e-6)
  // the three chord tones should dominate the 12-bin profile
  let top3 = [...c].map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).sort((a, b) => a - b)
  is(top3.join(','), '0,4,7')
})

test('chroma nnls — C major triad peaks at C, E, G', () => {
  let c = chroma(synthChord([60, 64, 67], 4096), { fs, method: 'nnls' })
  let top3 = [...c].map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).sort((a, b) => a - b)
  is(top3.join(','), '0,4,7')
})

test('chroma nnls — A minor triad peaks at A, C, E', () => {
  // A4 C5 E5 = MIDI 69, 72, 76 = pitch classes 9, 0, 4
  let c = chroma(synthChord([69, 72, 76], 4096), { fs, method: 'nnls' })
  let top3 = [...c].map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).sort((a, b) => a - b)
  is(top3.join(','), '0,4,9')
})

test('chroma pcp — silence gives zero-vector (not NaN)', () => {
  let c = chroma(silence(4096), { fs })
  is(c.length, 12)
  let sum = 0
  for (let x of c) sum += x
  is(sum, 0)
})


// =============================================================================
// Chord templates + Viterbi smoothing
// =============================================================================

test('chord — C major triad → "C"', () => {
  let c = chroma(synthChord([60, 64, 67], 4096), { fs, method: 'nnls' })
  let r = chord(c)
  is(r.label, 'C')
  is(r.quality, 'maj')
  is(r.root, 0)
})

test('chord — A minor triad → "Am"', () => {
  let c = chroma(synthChord([69, 72, 76], 4096), { fs, method: 'nnls' })
  let r = chord(c)
  is(r.label, 'Am')
  is(r.quality, 'min')
  is(r.root, 9)
})

test('chord — F major triad → "F"', () => {
  // F4 A4 C5 = MIDI 65, 69, 72
  let c = chroma(synthChord([65, 69, 72], 4096), { fs, method: 'nnls' })
  let r = chord(c)
  is(r.label, 'F')
})

test('chord — G major triad → "G"', () => {
  // G4 B4 D5 = MIDI 67, 71, 74
  let c = chroma(synthChord([67, 71, 74], 4096), { fs, method: 'nnls' })
  let r = chord(c)
  is(r.label, 'G')
})

test('chord — zero chroma → "N"', () => {
  let r = chord(new Float64Array(12))
  is(r.label, 'N')
})

test('chord — 24 binary templates', () => {
  is(TEMPLATES.length, 24)
  // each template has exactly 3 active tones
  for (let t of TEMPLATES) {
    let nz = 0
    for (let i = 0; i < 12; i++) if (t.vec[i] > 0) nz++
    is(nz, 3)
  }
})

test('smoothChords — I-IV-V-I progression with repeats', () => {
  // each chord held for 2 frames
  let progs = [[60,64,67],[60,64,67],[65,69,72],[65,69,72],[67,71,74],[67,71,74],[60,64,67],[60,64,67]]
  let frames = progs.map(p => chroma(synthChord(p, 4096), { fs, method: 'nnls' }))
  let seq = smoothChords(frames).map(s => s.label)
  is(seq.join(' '), 'C C F F G G C C')
})

test('smoothChords — Viterbi stabilizes noisy chord stream', () => {
  // C for 3 frames, one spurious frame, C for 3 more → smoothed should stay C throughout
  let c = chroma(synthChord([60, 64, 67], 4096), { fs, method: 'nnls' })
  let spur = new Float64Array(12)
  spur[1] = 0.5; spur[2] = 0.3; spur[6] = 0.2       // random non-chord
  let frames = [c, c, c, spur, c, c, c]
  let seq = smoothChords(frames, { selfProb: 0.9 }).map(s => s.label)
  ok(seq.every(l => l === 'C'), `stable: ${seq.join(' ')}`)
})


// =============================================================================
// Key detection (Krumhansl–Schmuckler)
// =============================================================================

test('key — C major chroma → C major', () => {
  let c = chroma(synthChord([60, 64, 67], 4096), { fs, method: 'nnls' })
  let r = key(c)
  is(r.label, 'C')
  is(r.mode, 'major')
  is(r.tonic, 0)
})

test('key — A minor chroma → A minor', () => {
  let c = chroma(synthChord([69, 72, 76], 4096), { fs, method: 'nnls' })
  let r = key(c)
  is(r.label, 'Am')
  is(r.mode, 'minor')
  is(r.tonic, 9)
})

test('key — full C major scale resolves to C major', () => {
  // play the C major scale: C D E F G A B → pitch classes 0 2 4 5 7 9 11
  let frames = [0, 2, 4, 5, 7, 9, 11].map(pc => {
    let midi = 60 + pc      // C4 up
    return chroma(synthChord([midi], 4096), { fs, method: 'nnls' })
  })
  let r = key(frames)
  is(r.label, 'C')
  is(r.mode, 'major')
})

test('key — scores are sorted descending', () => {
  let c = chroma(synthChord([60, 64, 67], 4096), { fs, method: 'nnls' })
  let r = key(c)
  is(r.scores.length, 24)
  for (let i = 1; i < r.scores.length; i++) ok(r.scores[i].score <= r.scores[i - 1].score)
})


test('tonnetz — 6 dims; circle magnitudes invariant under transposition', () => {
	let c = chroma(synthChord([60, 64, 67], 4096), { fs })
	let tz = tonnetz(c)
	is(tz.length, 6)
	ok(Math.hypot(...tz) > 0.01, 'non-degenerate for a triad')
	for (let shift of [1, 3, 5, 7]) {
		let rot = new Float32Array(12)
		for (let k = 0; k < 12; k++) rot[(k + shift) % 12] = c[k]
		let tz2 = tonnetz(rot)
		for (let j = 0; j < 3; j++) {
			almost(Math.hypot(tz2[2 * j], tz2[2 * j + 1]), Math.hypot(tz[2 * j], tz[2 * j + 1]), 1e-4, 'circle ' + j + ' magnitude, shift ' + shift)
		}
	}
	ok(tonnetz(new Float32Array(12)).every(v => v === 0), 'zero chroma → zeros')
})

test('melody — steady tone tracks flat, sweep tracks rising, silence unvoiced', () => {
	let { f0, voiced } = melody(sine(440, fs), { fs })
	let v = 0, err = 0
	for (let i = 2; i < f0.length - 2; i++) if (voiced[i]) { v++; err = Math.max(err, Math.abs(f0[i] - 440)) }
	ok(v > f0.length * 0.8, 'mostly voiced')
	ok(err < 3, '±3 Hz on steady 440')

	let n = fs * 2
	let sweep = new Float32Array(n), phase = 0
	for (let i = 0; i < n; i++) { let f = 220 * Math.pow(4, i / n); sweep[i] = Math.sin(phase += 2 * Math.PI * f / fs) }
	let m = melody(sweep, { fs })
	let q = Math.floor(m.f0.length / 4), head = 0, hn = 0, tail = 0, tn = 0
	for (let i = 1; i < q; i++) if (m.voiced[i]) { head += m.f0[i]; hn++ }
	for (let i = m.f0.length - q; i < m.f0.length - 1; i++) if (m.voiced[i]) { tail += m.f0[i]; tn++ }
	ok(tail / tn > 2.5 * (head / hn), 'sweep rises ~2 octaves')

	let s = melody(silence(fs), { fs })
	ok(Array.from(s.voiced).every(v => v === 0), 'silence unvoiced')
})

test('tempogram — 120 BPM click track reads ~120 everywhere', () => {
	let n = fs * 12
	let d = new Float32Array(n)
	let period = fs / 2 // 120 BPM
	for (let t = 0; t < n; t += period) {
		for (let i = 0; i < 300 && t + i < n; i++) d[t + i] += Math.sin(2 * Math.PI * 1000 * i / fs) * Math.exp(-i / 60)
	}
	let { bpm, times } = tempogram(d, { fs, window: 6, hop: 2 })
	ok(bpm.length >= 3, 'several windows')
	for (let i = 0; i < bpm.length; i++) almost(bpm[i], 120, 10, 'window at ' + times[i].toFixed(1) + 's → ' + bpm[i].toFixed(1) + ' BPM')
})

function texSaw (n, f = 220) {
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) { let s = 0; for (let h = 1; h <= 10; h++) s += Math.sin(2 * Math.PI * h * f * i / fs) / h; d[i] = 0.4 * s }
	return d
}
function texNoise (n, seed = 3) {
	let d = new Float32Array(n), s = seed
	for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = 0.4 * (s / 0x3fffffff - 1) }
	return d
}

test('structure — texture changes produce boundaries near the seams', () => {
	let a = texSaw(2 * fs), b = texNoise(2 * fs), c = texSaw(2 * fs, 220)
	let d = new Float32Array(6 * fs)
	d.set(a, 0); d.set(b, 2 * fs); d.set(c, 4 * fs)
	let { boundaries } = structure(d, { fs })
	ok(boundaries.length >= 2 && boundaries.length <= 4, boundaries.length + ' boundaries')
	ok(boundaries.some(t => Math.abs(t - 2) < 0.35), 'seam at 2 s found (' + boundaries.map(x => x.toFixed(2)).join(', ') + ')')
	ok(boundaries.some(t => Math.abs(t - 4) < 0.35), 'seam at 4 s found')
})

// deterministic pseudo-music: chirps + tone steps + noise bursts
function track (seconds, seed = 11) {
	let n = Math.round(seconds * fs)
	let d = new Float32Array(n), s = seed
	let rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
	for (let seg = 0; seg < seconds * 4; seg++) {
		let start = Math.round(seg * fs / 4), len = fs / 4
		let f = 200 + Math.floor(rand() * 30) * 60
		for (let i = 0; i < len && start + i < n; i++) {
			d[start + i] += 0.5 * Math.sin(2 * Math.PI * (f + 100 * i / len) * i / fs) + 0.15 * Math.sin(2 * Math.PI * 3 * f * i / fs)
		}
	}
	return d
}

test('fingerprint — self-match, snippet offset, noise robustness, rejection', () => {
	let full = track(8)
	let fpFull = fingerprint(full)
	ok(fpFull.length > 200, fpFull.length + ' landmarks')

	let self = fingerprintMatch(fpFull, fpFull)
	is(self.offset, 0)
	ok(self.score > 100, 'self score ' + self.score)

	let snipStart = 3 * fs
	let snippet = full.slice(snipStart, snipStart + 2 * fs)
	let m = fingerprintMatch(fpFull, fingerprint(snippet))
	let expected = Math.round(snipStart / 512)
	ok(Math.abs(m.offset - expected) <= 2, 'offset ' + m.offset + ' ≈ ' + expected)
	ok(m.score > 20, 'snippet score ' + m.score)

	let noisy = Float32Array.from(snippet)
	let s2 = 99
	for (let i = 0; i < noisy.length; i++) { s2 = (s2 * 1103515245 + 12345) & 0x7fffffff; noisy[i] += 0.05 * (s2 / 0x3fffffff - 1) }
	let mn = fingerprintMatch(fpFull, fingerprint(noisy))
	ok(Math.abs(mn.offset - expected) <= 2, 'noisy offset holds')
	ok(mn.score > m.score * 0.3, 'noisy score ' + mn.score + ' vs ' + m.score)

	let junk = fingerprintMatch(fpFull, fingerprint(texNoise(2 * fs, 77)))
	ok(junk.score < m.score * 0.2, 'unrelated noise rejected (' + junk.score + ')')
})

// --- polyphonic pitch ---

function harmonicTone (freqs, n, nh = 5) {
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++)
		for (let [f, a] of freqs)
			for (let h = 1; h <= nh; h++) d[i] += a / h * Math.sin(2 * Math.PI * f * h * i / fs)
	return d
}

test('multif0 — duet and triad resolved, single note stays single', () => {
	let duet = multif0(harmonicTone([[220, 0.5], [330, 0.4]], fs), { fs })[8].pitches.map(p => p.freq)
	ok(duet.some(f => Math.abs(1200 * Math.log2(f / 220)) < 50), '220 found')
	ok(duet.some(f => Math.abs(1200 * Math.log2(f / 330)) < 50), '330 found')
	is(duet.length, 2, 'no spurious pitches')

	let single = multif0(harmonicTone([[440, 0.5]], fs), { fs })[8].pitches
	is(single.length, 1)
	almost(single[0].freq, 440, 6)

	let triad = multif0(harmonicTone([[262, 0.5], [330, 0.45], [392, 0.4]], fs, 4), { fs })[8].pitches.map(p => p.freq)
	for (let f of [262, 330, 392]) ok(triad.some(g => Math.abs(1200 * Math.log2(g / f)) < 50), `${f} in triad`)
})

test('transcribe — two sequential notes → events with right midi and timing', () => {
	let n = fs * 2, d = new Float32Array(n)
	for (let i = 0; i < fs * 0.9; i++) for (let h = 1; h <= 5; h++) d[i] += 0.5 / h * Math.sin(2 * Math.PI * 262 * h * i / fs)
	for (let i = fs; i < fs * 1.9; i++) for (let h = 1; h <= 5; h++) d[i] += 0.5 / h * Math.sin(2 * Math.PI * 392 * h * i / fs)
	let notes = transcribe(d, { fs })
	is(notes.length, 2, 'two notes')
	is(notes[0].midi, 60, 'C4')
	is(notes[1].midi, 67, 'G4')
	ok(Math.abs(notes[0].time) < 0.15 && Math.abs(notes[1].time - 1) < 0.15, 'timing')
	ok(notes[0].duration > 0.6 && notes[1].duration > 0.6, 'durations')
})

// --- rhythm section ---

function kick (n) { let d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = Math.exp(-i / (n / 6)) * Math.sin(2 * Math.PI * 55 * i / fs * (1 + 1.5 * Math.exp(-i / (n / 12)))); return d }
function snare (n, seed = 22222) { let d = new Float32Array(n); let r = seed; for (let i = 0; i < n; i++) { r = (r * 1664525 + 1013904223) >>> 0; d[i] = Math.exp(-i / (n / 5)) * (0.5 * Math.sin(2 * Math.PI * 190 * i / fs) + 0.7 * (r / 2147483648 - 1)) } return d }
function hat (n, seed = 77777) { let d = new Float32Array(n); let r = seed, hp = 0; for (let i = 0; i < n; i++) { r = (r * 1664525 + 1013904223) >>> 0; let x = (r / 2147483648 - 1); hp = 0.7 * (hp + x); d[i] = Math.exp(-i / (n / 4)) * (x - hp) } return d }

test('drums — kick / snare / hihat classified at their onsets', () => {
	let n = fs * 2, d = new Float32Array(n)
	let put = (gen, t, len) => { let g = gen(len); let at = Math.round(t * fs); for (let i = 0; i < len && at + i < n; i++) d[at + i] += g[i] }
	put(kick, 0.2, 8000); put(snare, 0.7, 6000); put(hat, 1.2, 3000); put(kick, 1.6, 8000)
	let evs = drums(d, { fs })
	let near = (t) => evs.find(e => Math.abs(e.time - t) < 0.08)
	ok(near(0.2)?.type === 'kick', `kick @0.2 (${near(0.2)?.type})`)
	ok(near(0.7)?.type === 'snare', `snare @0.7 (${near(0.7)?.type})`)
	ok(near(1.2)?.type === 'hihat', `hihat @1.2 (${near(1.2)?.type})`)
	ok(near(1.6)?.type === 'kick', `kick @1.6 (${near(1.6)?.type})`)
})

test('downbeat — bass-heavy beat 1 found in a 4/4 grid', () => {
	let n = fs * 4, d = new Float32Array(n)
	let beats = []
	for (let b = 0; b < 8; b++) {
		let t = 0.25 + b * 0.46
		beats.push(t)
		let at = Math.round(t * fs)
		if (b % 4 === 1) { let g = kick(9000); for (let i = 0; i < 9000 && at + i < n; i++) d[at + i] += 1.5 * g[i] }
		else { let g = hat(2500); for (let i = 0; i < 2500 && at + i < n; i++) d[at + i] += 0.6 * g[i] }
	}
	let r = downbeat(d, { beats, meter: 4, fs })
	is(r.phase, 1, 'phase = the bass-heavy beat')
	almost(r.downbeats[0], beats[1], 1e-9)
})

// --- catalog-level ---

test('similarity — self ≈ 1-ish, tone vs noise low', () => {
	let a = harmonicTone([[262, 0.5], [392, 0.3]], fs)
	let b = harmonicTone([[262, 0.5], [392, 0.3]], fs)
	let self = similarity(a, b, { fs })
	ok(self.score > 0.9, `self ${self.score.toFixed(3)}`)
	let noise = new Float32Array(fs)
	let r = 12345
	for (let i = 0; i < fs; i++) { r = (r * 1664525 + 1013904223) >>> 0; noise[i] = 0.5 * (r / 2147483648 - 1) }
	let cross = similarity(a, noise, { fs })
	ok(cross.score < self.score - 0.25, `tone vs noise ${cross.score.toFixed(3)}`)
})

test('coversong — transposed progression recognized with right OTI', () => {
	let prog = (shift) => {
		let n = fs * 2, d = new Float32Array(n)
		let chords = [[262, 330, 392], [294, 370, 440], [330, 415, 494], [262, 330, 392]]
		chords.forEach((cs, ci) => {
			let at = Math.round(ci * 0.5 * fs)
			for (let i = 0; i < fs / 2 && at + i < n; i++)
				for (let f of cs) d[at + i] += 0.3 * Math.sin(2 * Math.PI * f * 2 ** (shift / 12) * (i / fs))
		})
		return d
	}
	let same = coversong(prog(0), prog(3), { fs })
	ok(same.score > 0.8, `cover score ${same.score.toFixed(3)}`)
	is(same.transposition, 3, 'OTI = 3 semitones')
	let r = 999, noise = new Float32Array(fs * 2)
	for (let i = 0; i < noise.length; i++) { r = (r * 1664525 + 1013904223) >>> 0; noise[i] = 0.5 * (r / 2147483648 - 1) }
	let diff = coversong(prog(0), noise, { fs })
	ok(diff.score < same.score - 0.2, `noise not a cover (${diff.score.toFixed(3)})`)
})
