export interface DrumsOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** onset-picker threshold, passed through to @audio/onset's peakPick */
  delta?: number
}

export interface DrumEvent {
  /** onset time, seconds */
  time: number
  type: 'kick' | 'snare' | 'hihat'
  /** 0..1, normalized to the loudest event */
  strength: number
  /** post-onset band-energy fractions, sum to ~1 */
  bands: { low: number, mid: number, high: number }
}

/** Spectral-flux onsets classified by post-onset band energy. */
export default function drums(data: Float32Array, options?: DrumsOptions): DrumEvent[]
