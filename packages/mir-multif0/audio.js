// stat manifest — multiple-F0 estimation (simultaneous pitches per frame; Klapuri).
// Whole-signal MIR analysis over the mono fold.

import multif0Fn from './multif0.js'

export const multif0 = {
	stat: 'multif0',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return multif0Fn(mono, { fs: sampleRate, ...opts })
	},
}
