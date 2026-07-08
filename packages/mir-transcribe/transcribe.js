// Polyphonic transcription — multiple-F0 frames tracked into note events by pitch
// continuity: consecutive frames within ±60 cents extend a note, gaps close it, notes
// shorter than minDuration are dropped. Velocity from median frame salience.

import multif0 from '@audio/mir-multif0'

const hzToMidi = f => 69 + 12 * Math.log2(f / 440)

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — multif0 opts + { minDuration=0.08 s, maxGap=1 frame }
 * @returns {Array<{time, duration, midi, freq, velocity}>}
 */
export default function transcribe (data, opts = {}) {
	let frames = multif0(data, opts)
	let minDur = opts.minDuration ?? 0.08
	let maxGap = opts.maxGap ?? 1
	let hopT = frames.length > 1 ? frames[1].time - frames[0].time : 0.05

	let active = []                          // { midi, freq, start, last, saliences, gap }
	let done = []
	let close = (n) => { done.push(n) }

	for (let fr of frames) {
		let used = new Set()
		for (let a of active) {
			let hit = fr.pitches.find((p, i) => !used.has(i) && Math.abs(1200 * Math.log2(p.freq / a.freq)) < 60)
			if (hit) {
				used.add(fr.pitches.indexOf(hit))
				a.last = fr.time
				a.gap = 0
				a.saliences.push(hit.salience)
			} else if (++a.gap > maxGap) close(a)
		}
		active = active.filter(a => a.gap <= maxGap)
		fr.pitches.forEach((p, i) => {
			if (used.has(i)) return
			active.push({ midi: Math.round(hzToMidi(p.freq)), freq: p.freq, start: fr.time, last: fr.time, saliences: [p.salience], gap: 0 })
		})
	}
	active.forEach(close)

	let peak = Math.max(1e-9, ...done.flatMap(n => n.saliences))
	return done
		.map(n => ({
			time: n.start - hopT / 2,
			duration: n.last - n.start + hopT,
			midi: n.midi,
			freq: n.freq,
			velocity: Math.min(1, median(n.saliences) / peak),
		}))
		.filter(n => n.duration >= minDur)
		.sort((a, b) => a.time - b.time || a.midi - b.midi)
}

function median (a) {
	let s = [...a].sort((x, y) => x - y)
	return s[s.length >> 1]
}
