// Structural segmentation — Foote novelty (Foote 2000): MFCC timbre frames → cosine
// self-similarity → checkerboard-kernel correlation along the diagonal → novelty peaks
// = section boundaries (verse/chorus/texture changes).

import mfcc from '@audio/spectral-mfcc'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { fs=44100, frameSize=2048, hop=1024, kernel=16 (frames per
 *   checkerboard quadrant), sensitivity=1 (higher → fewer boundaries) }
 * @returns {{ boundaries: number[] (seconds), novelty: Float32Array, times: Float32Array }}
 */
export default function structure (data, { fs = 44100, frameSize = 2048, hop = 1024, kernel = 16, sensitivity = 1 } = {}) {
	let nFrames = Math.max(0, Math.floor((data.length - frameSize) / hop) + 1)
	// timbre vectors: c1..c12 (drop c0 energy), L2-normalized
	let feats = []
	for (let i = 0; i < nFrames; i++) {
		let c = mfcc(data.subarray(i * hop, i * hop + frameSize), { fs })
		let v = Float64Array.from(c.subarray(1))
		let norm = Math.hypot(...v) || 1
		for (let k = 0; k < v.length; k++) v[k] /= norm
		feats.push(v)
	}
	let sim = (a, b) => {
		let s = 0
		for (let k = 0; k < a.length; k++) s += a[k] * b[k]
		return s
	}

	let K = kernel
	let novelty = new Float32Array(nFrames)
	for (let i = K; i < nFrames - K; i++) {
		let n = 0
		for (let u = 0; u < K; u++) {
			for (let v = 0; v < K; v++) {
				let within = sim(feats[i - 1 - u], feats[i - 1 - v]) + sim(feats[i + u], feats[i + v])
				let across = 2 * sim(feats[i - 1 - u], feats[i + v])
				n += within - across
			}
		}
		novelty[i] = n / (K * K)
	}

	// peak pick: local maxima above mean + sensitivity·std, min distance K
	let mean = 0
	for (let v of novelty) mean += v
	mean /= nFrames
	let sd = 0
	for (let v of novelty) sd += (v - mean) ** 2
	sd = Math.sqrt(sd / nFrames)
	let thresh = mean + sensitivity * sd

	let boundaries = []
	let last = -Infinity
	for (let i = K; i < nFrames - K; i++) {
		if (novelty[i] > thresh && novelty[i] >= novelty[i - 1] && novelty[i] >= novelty[i + 1] && i - last >= K) {
			boundaries.push((i * hop + frameSize / 2) / fs)
			last = i
		}
	}
	let times = new Float32Array(nFrames)
	for (let i = 0; i < nFrames; i++) times[i] = (i * hop + frameSize / 2) / fs
	return { boundaries, novelty, times }
}
