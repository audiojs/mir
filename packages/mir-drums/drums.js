// Drum transcription — spectral-flux onsets classified by post-onset band energy:
// kick = sub dominance (40–130 Hz), hihat/cymbal = HF dominance (>5 kHz), snare = the
// broadband mid case (150 Hz–2 kHz body + noise skirt). Classical banded baseline.

import { spectralFlux, peakPick } from '@audio/onset'
import { fft } from 'fourier-transform'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { fs=44100, window=0.06 s analysis after each onset, threshold }
 * @returns {Array<{time, type: 'kick'|'snare'|'hihat', strength, bands: {low, mid, high}}>}
 */
export default function drums (data, opts = {}) {
	let fs = opts.fs ?? 44100
	let { odf, hopSize } = spectralFlux(data, { fs })
	let onsets = peakPick(odf, { fs, hopSize, delta: opts.delta })

	let N = 2048
	let win = new Float64Array(N)
	for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)
	let half = N >> 1, binHz = fs / N
	let kLow = [Math.round(40 / binHz), Math.round(130 / binHz)]
	let kMid = [Math.round(150 / binHz), Math.round(2000 / binHz)]
	let kHigh = [Math.round(5000 / binHz), half]

	let buf = new Float64Array(N)
	let events = []
	for (let t of onsets) {
		let pos = Math.min(Math.max(0, Math.round(t * fs)), data.length - N)
		for (let i = 0; i < N; i++) buf[i] = data[pos + i] * win[i]
		let [re, im] = fft(buf)
		let band = ([a, b]) => {
			let s = 0
			for (let k = a; k <= b && k <= half; k++) s += re[k] * re[k] + im[k] * im[k]
			return Math.sqrt(s)
		}
		let low = band(kLow), mid = band(kMid), high = band(kHigh)
		let total = low + mid + high + 1e-12
		let type = low / total > 0.45 ? 'kick'
			: high / total > 0.45 ? 'hihat'
			: 'snare'
		events.push({ time: t, type, strength: total, bands: { low: low / total, mid: mid / total, high: high / total } })
	}
	let peak = Math.max(1e-12, ...events.map(e => e.strength))
	for (let e of events) e.strength /= peak
	return events
}
