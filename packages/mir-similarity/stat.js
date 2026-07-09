// stat manifest — audio similarity (distance between recordings).
// Two-signal analysis: pass the comparison take as `ref` (an audio instance is
// pre-rendered to channel data by the host; raw Float32Array[] also accepted).

import similarityFn from './similarity.js'

const fold = (channels) => {
	const n = channels[0]?.length || 0
	const mono = new Float32Array(n)
	for (const ch of channels) for (let i = 0; i < n; i++) mono[i] += ch[i] / channels.length
	return mono
}

export const similarity = {
	stat: 'similarity',
	compute: (channels, { sampleRate, ref, ...opts }) => {
		if (!ref) throw new Error('similarity: pass { ref } — the take to compare against')
		const b = ref[0] instanceof Float32Array ? fold(ref) : ref
		return similarityFn(fold(channels), b, { fs: sampleRate, ...opts })
	},
}
