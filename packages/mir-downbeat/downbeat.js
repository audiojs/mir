// Downbeat estimation — given a beat grid, find the bar phase: downbeats carry more
// bass energy, stronger onsets, and harmonic change (chroma flux). Score each of the
// `meter` candidate phases by those cues summed over its beats; best phase wins.

import chroma from '@audio/mir-chroma'
import { fft } from 'fourier-transform'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { beats: number[] (s, required), meter=4, fs=44100 }
 * @returns {{ downbeats: number[], phase, meter, confidence }}
 */
export default function downbeat (data, opts = {}) {
	let beats = opts.beats
	if (!beats?.length) throw new RangeError('downbeat: opts.beats (beat times from @audio/beat) is required')
	let meter = opts.meter ?? 4
	let fs = opts.fs ?? 44100

	let N = 4096, half = N >> 1, binHz = fs / N
	let win = new Float64Array(N)
	for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)
	let kBass = Math.round(150 / binHz)
	let buf = new Float64Array(N)

	// per-beat cues
	let cues = beats.map((t, i) => {
		let pos = Math.min(Math.max(0, Math.round(t * fs)), Math.max(0, data.length - N))
		for (let j = 0; j < N; j++) buf[j] = (data[pos + j] || 0) * win[j]
		let [re, im] = fft(buf)
		let bass = 0, total = 1e-12
		for (let k = 1; k <= half; k++) {
			let e = re[k] * re[k] + im[k] * im[k]
			total += e
			if (k <= kBass) bass += e
		}
		// chroma flux: harmonic change across the beat
		let W = 4096
		let a = Math.max(0, pos - W), b = Math.min(data.length - W, pos)
		let flux = 0
		if (b > a && b + W <= data.length) {
			let ca = chroma(Float32Array.prototype.slice.call(data, a, a + W), { fs })
			let cb = chroma(Float32Array.prototype.slice.call(data, b, b + W), { fs })
			let na = Math.hypot(...ca) + 1e-9, nb = Math.hypot(...cb) + 1e-9
			for (let k = 0; k < 12; k++) flux += Math.abs(cb[k] / nb - ca[k] / na)
		}
		return { bass: bass / total, energy: Math.sqrt(total), flux }
	})
	let ePeak = Math.max(1e-12, ...cues.map(c => c.energy))

	let scores = []
	for (let p = 0; p < meter; p++) {
		let s = 0, n = 0
		for (let i = p; i < beats.length; i += meter) {
			s += 2 * cues[i].bass + cues[i].energy / ePeak + 1.5 * cues[i].flux
			n++
		}
		scores.push(n ? s / n : 0)
	}
	let phase = scores.indexOf(Math.max(...scores))
	let sorted = [...scores].sort((a, b) => b - a)
	return {
		downbeats: beats.filter((_, i) => i % meter === phase),
		phase, meter,
		confidence: sorted[1] > 0 ? Math.min(1, (sorted[0] - sorted[1]) / sorted[0] * 2) : 1,
	}
}
