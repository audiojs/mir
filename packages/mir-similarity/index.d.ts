export interface SimilarityOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** timbre vs. harmony blend, 1 = timbre only, default 0.5 */
  weight?: number
}

export interface SimilarityResult {
  /** weighted blend of timbre and harmony, 0..1 */
  score: number
  /** MFCC-Gaussian distance, 0..1 */
  timbre: number
  /** mean-chroma cosine, 0..1 */
  harmony: number
}

/** Timbral (MFCC single-Gaussian) + harmonic (chroma cosine) similarity between two takes. */
export default function similarity(a: Float32Array, b: Float32Array, options?: SimilarityOptions): SimilarityResult
