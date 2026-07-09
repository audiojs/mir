// stat manifest — structural segmentation (self-similarity novelty; verse/chorus boundaries).
// Whole-signal MIR analysis over the mono fold → [{time,…}].

import structureFn from './structure.js'

export const structure = {
	stat: 'structure',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return structureFn(mono, { fs: sampleRate, ...opts })
	},
}
