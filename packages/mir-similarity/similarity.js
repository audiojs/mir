// Audio similarity — timbral distance from frame-MFCC statistics (mean + variance,
// symmetrized) blended with harmonic similarity from mean-chroma cosine. The classical
// single-Gaussian MFCC baseline (Logan/Aucouturier lineage).

import mfcc from '@audio/spectral-mfcc'
import chroma from '@audio/mir-chroma'

function stats (data, fs, N = 2048, hop = 1024) {
	let bins = 13
	let sum = new Float64Array(bins), sq = new Float64Array(bins), n = 0
	for (let pos = 0; pos + N <= data.length; pos += hop) {
		let c = mfcc(data.subarray(pos, pos + N), { fs, bins })
		for (let k = 0; k < bins; k++) { sum[k] += c[k]; sq[k] += c[k] * c[k] }
		n++
	}
	let mu = sum.map(s => s / Math.max(1, n))
	let va = sq.map((s, k) => Math.max(1e-9, s / Math.max(1, n) - mu[k] * mu[k]))
	return { mu, va }
}

function meanChroma (data, fs, N = 8192, hop = 4096) {
	let m = new Float64Array(12), n = 0
	for (let pos = 0; pos + N <= data.length; pos += hop) {
		let c = chroma(data.subarray(pos, pos + N), { fs })
		for (let k = 0; k < 12; k++) m[k] += c[k]
		n++
	}
	let norm = Math.hypot(...m) + 1e-12
	return m.map(x => x / norm)
}

/**
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @param {object} opts — { fs=44100, weight=0.5 (timbre vs harmony) }
 * @returns {{ score (0..1), timbre (0..1), harmony (0..1) }}
 */
export default function similarity (a, b, opts = {}) {
	let fs = opts.fs ?? 44100
	let w = opts.weight ?? 0.5
	let sa = stats(a, fs), sb = stats(b, fs)
	// symmetrized variance-normalized distance between the two Gaussians
	let d = 0
	for (let k = 0; k < sa.mu.length; k++) {
		let dm = sa.mu[k] - sb.mu[k]
		d += dm * dm / (sa.va[k] + sb.va[k]) + 0.5 * (sa.va[k] / sb.va[k] + sb.va[k] / sa.va[k] - 2)
	}
	let timbre = Math.exp(-d / sa.mu.length)
	let ca = meanChroma(a, fs), cb = meanChroma(b, fs)
	let harmony = Math.max(0, ca.reduce((s, x, k) => s + x * cb[k], 0))
	return { score: w * timbre + (1 - w) * harmony, timbre, harmony }
}
