// @audio/mir — music information retrieval umbrella re-exporting @audio/mir-* atoms.
// For smaller bundles, depend directly on the individual atom.

export { default as chroma } from '@audio/mir-chroma'
export { default as chord, TEMPLATES, smooth as smoothChords } from '@audio/mir-chord'
export { default as key, KK_MAJOR, KK_MINOR } from '@audio/mir-key'
export { default as tonnetz } from '@audio/mir-tonnetz'
export { default as melody } from '@audio/mir-melody'
export { default as tempogram } from '@audio/mir-tempogram'
