// stat manifest — tonal centroid (Tonnetz) trajectory over time.
// Chromagram frames over the mono fold projected onto Harte's interval circles
// → { times, frames (6-D each), mean }.

import tonnetzFn from './tonnetz.js'
import chromaFn from '@audio/mir-chroma'

export const tonnetz = {
	stat: 'tonnetz',
	compute: (channels, { sampleRate, frameSize = 8192, hopSize = 4096, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		const times = [], frames = [], mean = new Float64Array(6)
		for (let pos = 0; pos + frameSize <= n; pos += hopSize) {
			const t6 = tonnetzFn(chromaFn(mono.subarray(pos, pos + frameSize), { fs: sampleRate, ...opts }))
			times.push((pos + frameSize / 2) / sampleRate)
			frames.push(t6)
			for (let k = 0; k < 6; k++) mean[k] += t6[k]
		}
		if (frames.length) for (let k = 0; k < 6; k++) mean[k] /= frames.length
		return { times: Float32Array.from(times), frames, mean }
	},
}
