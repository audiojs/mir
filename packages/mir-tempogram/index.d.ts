export interface TempogramOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** onset-envelope STFT frame, samples, default 2048 */
  frameSize?: number
  /** onset-envelope STFT hop, samples, default 512 */
  hopSize?: number
  /** autocorrelation window, seconds, default 6 */
  window?: number
  /** autocorrelation window hop, seconds, default 2 */
  hop?: number
  /** tempo search range low edge, BPM, default 40 */
  minBpm?: number
  /** tempo search range high edge, BPM, default 240 */
  maxBpm?: number
}

export interface TempogramResult {
  /** window center times, seconds */
  times: Float32Array
  /** best BPM per window (argmax of matrix[i]) */
  bpm: Float32Array
  /** raw autocorrelation, one row per window, lags minLag..maxLag */
  matrix: Float32Array[]
  /** onset-envelope frame rate, Hz */
  odfRate: number
  /** shortest lag searched, frames */
  minLag: number
  /** longest lag searched, frames */
  maxLag: number
}

/** Local tempo over time: onset envelope autocorrelated over sliding windows. */
export default function tempogram(data: Float32Array, options?: TempogramOptions): TempogramResult
