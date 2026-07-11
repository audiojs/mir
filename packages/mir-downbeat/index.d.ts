export interface DownbeatOptions {
  /** beat times, seconds, from a beat tracker (e.g. @audio/beat) — required, throws RangeError if omitted */
  beats: number[]
  /** beats per bar, default 4 */
  meter?: number
  /** sample rate, default 44100 */
  fs?: number
}

export interface DownbeatResult {
  /** the subset of opts.beats that fall on the winning phase */
  downbeats: number[]
  /** winning bar phase, 0..meter-1 */
  phase: number
  meter: number
  /** 0..1, margin between the best and second-best phase score */
  confidence: number
}

/** Score each of `meter` candidate bar phases by bass energy, onset strength and chroma flux; best phase wins. */
export default function downbeat(data: Float32Array, options: DownbeatOptions): DownbeatResult
