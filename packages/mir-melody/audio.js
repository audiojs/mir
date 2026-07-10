// stat manifest — continuous melody F0 contour (frame-level Hz).
// Whole-signal MIR analysis over the mono fold → Float32Array of Hz per frame.

import melodyFn from './melody.js'

export const melody = {
	stat: 'melody',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return melodyFn(mono, { fs: sampleRate, ...opts })
	},
}
