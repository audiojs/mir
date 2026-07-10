// stat manifest — chromagram (pitch-class profile over time).
// Whole-signal MIR analysis over the mono fold → { times, frames, mean }.

import chromaFn from './chroma.js'

export const chroma = {
	stat: 'chroma',
	compute: (channels, { sampleRate, frameSize = 8192, hopSize = 4096, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		const times = [], frames = [], mean = new Float64Array(12)
		for (let pos = 0; pos + frameSize <= n; pos += hopSize) {
			const c = chromaFn(mono.subarray(pos, pos + frameSize), { fs: sampleRate, ...opts })
			times.push((pos + frameSize / 2) / sampleRate)
			frames.push(c)
			for (let k = 0; k < 12; k++) mean[k] += c[k]
		}
		let s = 0
		for (const x of mean) s += x
		if (s > 0) for (let k = 0; k < 12; k++) mean[k] /= s
		return { times: Float32Array.from(times), frames, mean }
	},
}
