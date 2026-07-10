// stat manifest — drum transcription (kick/snare/hat onsets).
// Whole-signal MIR analysis over the mono fold.

import drumsFn from './drums.js'

export const drums = {
	stat: 'drums',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return drumsFn(mono, { fs: sampleRate, ...opts })
	},
}
