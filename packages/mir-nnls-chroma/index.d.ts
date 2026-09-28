// @audio/mir-nnls-chroma: chromagram of a whole signal by NNLS Chroma (Mauch & Dixon 2010), as the reference Vamp plugin.

export interface ChromagramOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** frame length, a power of 2: default 16384 at 44.1 kHz, about 0.37 s at any rate */
  blockSize?: number
  /** hop, default blockSize / 8 */
  stepSize?: number
  /** concert A (Hz); read from the signal when not given */
  tuning?: number
  /** spectral whitening exponent, default 1 */
  whitening?: number
  /** partial decay of the note profiles, default 0.7 */
  s?: number
}

export interface Chromagram {
  /** frame centres, seconds */
  times: Float64Array
  /** concert A, Hz */
  tuning: number
  /** treble chroma per frame, C first, unnormalised */
  treble: Float32Array[]
  /** bass chroma per frame, C first, unnormalised */
  bass: Float32Array[]
}

/** NNLS Chroma of a whole signal. */
export default function chromagram(data: Float32Array | Float64Array, options?: ChromagramOptions): Chromagram
/** Streaming form: write(block) takes samples; write() ends and returns the chromagram. */
export default function chromagram(options?: ChromagramOptions): (block?: Float32Array | Float64Array) => Chromagram | undefined
