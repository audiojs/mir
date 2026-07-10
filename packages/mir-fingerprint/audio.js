// stat manifest — landmark audio fingerprint (Wang/Shazam-class hash set).
// Whole-signal MIR analysis over the mono fold.

import fingerprintFn from './fingerprint.js'

export const fingerprint = {
	stat: 'fingerprint',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return fingerprintFn(mono, { fs: sampleRate, ...opts })
	},
}
