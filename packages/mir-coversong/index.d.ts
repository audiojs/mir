export interface CoversongOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** search window as a fraction of the shorter sequence, default 0.5 */
  maxLag?: number
}

export interface CoversongResult {
  /** mean cosine at the best alignment, 0..1 */
  score: number
  /** semitones, b→a */
  transposition: number
  /** frames */
  lag: number
}

/** Cover-song identification via Optimal Transposition Index chroma alignment (Ellis 2007 lineage). */
export default function coversong(a: Float32Array, b: Float32Array, options?: CoversongOptions): CoversongResult
