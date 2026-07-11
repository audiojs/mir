export interface MelodyOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** YIN analysis window, samples, default 2048 */
  frameSize?: number
  /** frame hop, samples, default 512 */
  hop?: number
  /** YIN threshold, passed through to @audio/pitch-yin */
  threshold?: number
}

export interface MelodyResult {
  /** frame center times, seconds */
  times: Float32Array
  /** Hz per frame, 0 where unvoiced */
  f0: Float32Array
  /** 1 = voiced, 0 = unvoiced, per frame */
  voiced: Uint8Array
}

/** Frame-level F0 contour via YIN, with voicing flags (MIREX melody shape). */
export default function melody(data: Float32Array, options?: MelodyOptions): MelodyResult
