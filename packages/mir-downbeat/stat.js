// stat manifest — downbeat estimation (bar-level “1” within the beat grid).
// Whole-signal MIR analysis over the mono fold.

import downbeatFn from './downbeat.js'

export const downbeat = {
	stat: 'downbeat',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return downbeatFn(mono, { fs: sampleRate, ...opts })
	},
}
