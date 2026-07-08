// Cover-song identification (Ellis 2007 lineage) — frame-chroma sequences compared
// after Optimal Transposition Index alignment: rotate one sequence by the OTI, then
// take the best mean-cosine over time lags. Recognizes the composition through key
// changes, re-orchestration and level differences; tempo is assumed comparable
// (beat-synchronous input tightens that — pass beat-averaged frames if available).

import chroma from '@audio/mir-chroma'

function frames (data, fs, N = 8192, hop = 4096) {
	let out = []
	for (let pos = 0; pos + N <= data.length; pos += hop) {
		let c = chroma(data.subarray(pos, pos + N), { fs })
		let norm = Math.hypot(...c) + 1e-12
		out.push(c.map(x => x / norm))
	}
	return out
}

const rot = (v, t) => v.map((_, k) => v[(k + t) % 12])

/**
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @param {object} opts — { fs=44100, maxLag=0.5 (fraction of shorter sequence) }
 * @returns {{ score (0..1 mean cosine at best alignment), transposition (semitones b→a), lag (frames) }}
 */
export default function coversong (a, b, opts = {}) {
	let fs = opts.fs ?? 44100
	let fa = frames(a, fs), fb = frames(b, fs)
	if (!fa.length || !fb.length) return { score: 0, transposition: 0, lag: 0 }

	// OTI from global chroma means
	let ma = new Float64Array(12), mb = new Float64Array(12)
	for (let f of fa) for (let k = 0; k < 12; k++) ma[k] += f[k]
	for (let f of fb) for (let k = 0; k < 12; k++) mb[k] += f[k]
	let oti = 0, best = -1
	for (let t = 0; t < 12; t++) {
		let s = 0
		for (let k = 0; k < 12; k++) s += ma[k] * mb[(k + t) % 12]
		if (s > best) { best = s; oti = t }
	}

	// best mean-cosine over lags, OTI ±1 semitone
	let maxLag = Math.round((opts.maxLag ?? 0.5) * Math.min(fa.length, fb.length))
	let score = 0, atLag = 0, atT = oti
	for (let t of [oti, (oti + 1) % 12, (oti + 11) % 12]) {
		let rb = fb.map(f => rot(f, t))
		for (let lag = -maxLag; lag <= maxLag; lag++) {
			let s = 0, n = 0
			for (let i = 0; i < fa.length; i++) {
				let j = i + lag
				if (j < 0 || j >= rb.length) continue
				for (let k = 0; k < 12; k++) s += fa[i][k] * rb[j][k]
				n++
			}
			if (n >= 4 && s / n > score) { score = s / n; atLag = lag; atT = t }
		}
	}
	return { score, transposition: atT, lag: atLag }
}
