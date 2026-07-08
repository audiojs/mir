// Multiple-F0 estimation — Klapuri (2006) iterative spectral subtraction: whiten the
// magnitude spectrum, find the maximum-salience F0 (harmonic-weighted sum of partial
// amplitudes), subtract its harmonic pattern, repeat until salience collapses.

import { fft } from 'fourier-transform'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { fs=44100, frameSize=4096, hopSize=2048, minFreq=60, maxFreq=1200,
 *   maxPitches=6, harmonics=12, threshold=0.4 (fraction of the frame's top salience) }
 * @returns {Array<{time, pitches: Array<{freq, salience}>}>}
 */
export default function multif0 (data, opts = {}) {
	let fs = opts.fs ?? 44100
	let N = opts.frameSize ?? 4096
	let hop = opts.hopSize ?? (N >> 1)
	let minF = opts.minFreq ?? 60
	let maxF = opts.maxFreq ?? 1200
	let maxP = opts.maxPitches ?? 6
	let H = opts.harmonics ?? 12
	let thr = opts.threshold ?? 0.4
	let half = N >> 1
	let binHz = fs / N

	// candidate F0 grid: 10 cents
	let cands = []
	for (let f = minF; f <= maxF; f *= 2 ** (10 / 1200)) cands.push(f)

	let win = new Float64Array(N)
	for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)

	let frames = []
	let buf = new Float64Array(N)
	for (let pos = 0; pos + N <= data.length; pos += hop) {
		for (let i = 0; i < N; i++) buf[i] = data[pos + i] * win[i]
		let [re, im] = fft(buf)
		let mag = new Float64Array(half + 1)
		for (let k = 0; k <= half; k++) mag[k] = Math.hypot(re[k], im[k])

		// spectral whitening (Klapuri 2006): bandwise power compression ν = 0.33 —
		// per log-spaced band, gain g = σ^(ν−1) interpolated across centers; keeps
		// partial ordering locally while flattening the global tilt
		let nb = 30
		let centers = [], gains = []
		for (let b = 0; b <= nb; b++) {
			let fc = 50 * (fs / 2 / 50) ** (b / nb)
			let k0 = Math.max(1, Math.round(fc * 0.7 / binHz)), k1 = Math.min(half, Math.round(fc * 1.4 / binHz))
			let s = 0
			for (let k = k0; k <= k1; k++) s += mag[k] * mag[k]
			let sigma = Math.sqrt(s / Math.max(1, k1 - k0 + 1))
			centers.push(fc / binHz); gains.push(sigma > 1e-12 ? sigma ** (0.33 - 1) : 0)
		}
		let white = new Float64Array(half + 1)
		for (let k = 1, b = 0; k <= half; k++) {
			while (b < nb && centers[b + 1] < k) b++
			let t = Math.min(1, Math.max(0, (k - centers[b]) / Math.max(1e-9, centers[b + 1] - centers[b])))
			white[k] = mag[k] * (gains[b] * (1 - t) + gains[b + 1] * t)
		}
		let wPeak = Math.max(...white)

		// iterative pick-and-subtract
		let pitches = []
		let first = 0
		let residual = Float64Array.from(white)
		let salience = (f) => {
			let s = 0, present = 0, fund = 0
			for (let h = 1; h <= H; h++) {
				let k = Math.round(h * f / binHz)
				if (k > half) break
				let m = Math.max(residual[k] || 0, residual[k - 1] || 0, residual[k + 1] || 0)
				if (m > 0.1 * wPeak) present++               // partial present (relative to frame peak)
				if (h === 1) fund = m
				s += m * (f + 52) / (h * f + 320)            // Klapuri partial weight g(h)
			}
			return { s, present, fund }
		}
		for (let it = 0; it < maxP; it++) {
			let best = 0, bestF = 0
			let scored = []
			for (let f of cands) {
				if (pitches.some(p => Math.abs(1200 * Math.log2(f / p.freq)) < 50)) continue
				let { s, present, fund } = salience(f)
				if (present < 2 || fund < 0.1 * wPeak) continue  // reject single-peak / missing-fundamental
				scored.push([f, s])
				if (s > best) { best = s; bestF = f }
			}
			if (!it) first = best
			if (best < thr * first || bestF === 0) break
			pitches.push({ freq: bestF, salience: best })
			for (let h = 1; h <= H; h++) {
				let k = Math.round(h * bestF / binHz)
				if (k > half) break
				for (let j = Math.max(0, k - 3); j <= Math.min(half, k + 3); j++) residual[j] *= 0.1
			}
		}
		frames.push({ time: (pos + N / 2) / fs, pitches })
	}
	return frames
}
