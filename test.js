import test, { almost, ok, is } from 'tst'
import { chroma, chord, smoothChords, key, TEMPLATES, tonnetz, melody, tempogram } from './index.js'

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
