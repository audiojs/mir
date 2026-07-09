// stat manifest — polyphonic note transcription (onset/offset/pitch events).
// Whole-signal MIR analysis over the mono fold.

import transcribeFn from './transcribe.js'

export const transcribe = {
	stat: 'transcribe',
	compute: (channels, { sampleRate, ...opts }) => {
		const n = channels[0]?.length || 0
		const mono = new Float32Array(n)
		for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
		return transcribeFn(mono, { fs: sampleRate, ...opts })
	},
}
