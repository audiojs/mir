/** Chroma (pitch-class profile) — 12-D energy vector by pitch class, L1-normalized. */
export interface ChromaOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** 'pcp' (Fujishima 1999, default) or 'nnls' (Mauch & Dixon 2010) */
  method?: 'pcp' | 'nnls'
  /** analysis band low edge for 'pcp', default 65 (Hz) */
  minFreq?: number
  /** analysis band high edge for 'pcp', default 2093 (Hz) */
  maxFreq?: number
  /** partials per pitch template for 'nnls', default 8 */
  harmonics?: number
  /** NMF update steps for 'nnls', default 30 */
  iterations?: number
}

/** data.length must be a power of 2 — one FFT frame per call. */
export default function chroma(data: Float32Array | Float64Array, options?: ChromaOptions): Float64Array
