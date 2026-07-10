// stat manifest — local tempo over time (onset autocorrelation).
// Whole-signal MIR analysis over the mono fold → frames of BPM salience.

import tempogramFn from './tempogram.js'

export const tempogram = {
	stat: 'tempogram',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return tempogramFn(mono, { fs: sampleRate, ...opts })
	},
}
