// Tempogram — local tempo over time: onset envelope (spectral flux) autocorrelated
// over sliding windows. Shorter lags accumulate more terms, biasing toward the
// notated tempo over its subdivisions (librosa/MIREX tempogram class).

import { spectralFlux } from '@audio/onset'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { fs=44100, frameSize=2048, hopSize=512,
 *   window=6 (s), hop=2 (s), minBpm=40, maxBpm=240 }
 * @returns {{ times: Float32Array, bpm: Float32Array, matrix: Float32Array[],
 *   odfRate: number, minLag: number, maxLag: number }}
 */
export default function tempogram (data, { fs = 44100, frameSize = 2048, hopSize = 512, window = 6, hop = 2, minBpm = 40, maxBpm = 240 } = {}) {
	let { odf } = spectralFlux(data, { fs, frameSize, hopSize })
	let odfRate = fs / hopSize
	let winN = Math.round(window * odfRate)
	let hopN = Math.max(1, Math.round(hop * odfRate))
	let minLag = Math.max(1, Math.round(odfRate * 60 / maxBpm))
	let maxLag = Math.round(odfRate * 60 / minBpm)

	let times = [], bpms = [], matrix = []
	for (let s = 0; s + winN <= odf.length; s += hopN) {
		let mean = 0
		for (let i = s; i < s + winN; i++) mean += odf[i]
		mean /= winN

		let row = new Float32Array(maxLag - minLag + 1)
		let best = -Infinity, bestLag = minLag
		for (let lag = minLag; lag <= maxLag; lag++) {
			let acc = 0
			for (let i = s + lag; i < s + winN; i++) acc += (odf[i] - mean) * (odf[i - lag] - mean)
			row[lag - minLag] = acc
			if (acc > best) { best = acc; bestLag = lag }
		}
		matrix.push(row)
		times.push((s + winN / 2) / odfRate)
		bpms.push(60 * odfRate / bestLag)
	}
	return { times: Float32Array.from(times), bpm: Float32Array.from(bpms), matrix, odfRate, minLag, maxLag }
}
