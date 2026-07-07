// Landmark audio fingerprinting (Wang 2003, Shazam class): spectrogram peak
// constellation → anchor→target hashes (f1, f2, Δt) → matching = offset-histogram vote.
// Robust to noise and level; exact-match identification, not similarity.

import { fft } from 'fourier-transform'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { fs=44100, frameSize=1024, hop=512, peaksPerFrame=5, fanout=5,
 *   window=32 (max Δt frames for pairing) }
 * @returns {Array<{hash:number, t:number}>} landmarks (t in frames; frame = hop/fs seconds)
 */
export default function fingerprint (data, { frameSize = 1024, hop = 512, peaksPerFrame = 5, fanout = 5, window = 32 } = {}) {
	let half = frameSize / 2
	let nFrames = Math.max(0, Math.floor((data.length - frameSize) / hop) + 1)
	let win = new Float64Array(frameSize)
	for (let i = 0; i < frameSize; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / frameSize)
	let buf = new Float64Array(frameSize)

	// constellation: per-frame prominent spectral peaks
	let peaks = [] // [{t, f}]
	for (let t = 0; t < nFrames; t++) {
		for (let i = 0; i < frameSize; i++) buf[i] = data[t * hop + i] * win[i]
		let [re, im] = fft(buf)
		let mag = new Float64Array(half)
		let mean = 0
		for (let k = 1; k < half; k++) { mag[k] = re[k] * re[k] + im[k] * im[k]; mean += mag[k] }
		mean /= half
		let frame = []
		for (let k = 3; k < half - 3; k++) {
			if (mag[k] > 4 * mean && mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > mag[k - 2] && mag[k] >= mag[k + 2]) {
				frame.push({ k, m: mag[k] })
			}
		}
		frame.sort((a, b) => b.m - a.m)
		for (let p of frame.slice(0, peaksPerFrame)) peaks.push({ t, f: p.k })
	}

	// pair anchors with forward targets
	let landmarks = []
	for (let i = 0; i < peaks.length; i++) {
		let a = peaks[i], fan = 0
		for (let j = i + 1; j < peaks.length && fan < fanout; j++) {
			let b = peaks[j]
			let dt = b.t - a.t
			if (dt < 1) continue
			if (dt > window) break
			landmarks.push({ hash: (a.f * 512 + b.f) * 64 + dt, t: a.t })
			fan++
		}
	}
	return landmarks
}

/**
 * Match two fingerprints: histogram of time offsets over shared hashes.
 * @returns {{ score: number (votes for the best offset), offset: number (frames, b within a) }}
 */
export function match (fpA, fpB) {
	let index = new Map()
	for (let l of fpA) {
		let arr = index.get(l.hash)
		if (arr) arr.push(l.t)
		else index.set(l.hash, [l.t])
	}
	let hist = new Map()
	for (let l of fpB) {
		let arr = index.get(l.hash)
		if (!arr) continue
		for (let ta of arr) {
			let off = ta - l.t
			hist.set(off, (hist.get(off) || 0) + 1)
		}
	}
	let score = 0, offset = 0
	for (let [off, count] of hist) if (count > score) { score = count; offset = off }
	return { score, offset }
}
