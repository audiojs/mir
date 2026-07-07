// Melody contour — frame-level F0 track via YIN, with voicing flags.
// MIREX melody-extraction shape: { times, f0 (Hz, 0 = unvoiced), voiced }.

import yin from '@audio/pitch-yin'

/**
 * @param {Float32Array} data — mono PCM
 * @param {object} opts — { fs=44100, frameSize=2048, hop=512, threshold }
 * @returns {{ times: Float32Array, f0: Float32Array, voiced: Uint8Array }}
 */
export default function melody (data, { fs = 44100, frameSize = 2048, hop = 512, threshold } = {}) {
	let nFrames = Math.max(0, Math.floor((data.length - frameSize) / hop) + 1)
	let times = new Float32Array(nFrames)
	let f0 = new Float32Array(nFrames)
	let voiced = new Uint8Array(nFrames)
	for (let i = 0; i < nFrames; i++) {
		let r = yin(data.subarray(i * hop, i * hop + frameSize), { fs, threshold })
		times[i] = (i * hop + frameSize / 2) / fs
		if (r) { f0[i] = r.freq; voiced[i] = 1 }
	}
	return { times, f0, voiced }
}
