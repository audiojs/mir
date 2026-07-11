import type { Multif0Options } from '@audio/mir-multif0'

export interface TranscribeOptions extends Multif0Options {
  /** shortest kept note, seconds, default 0.08 */
  minDuration?: number
  /** frames a pitch may drop out before its note closes, default 1 */
  maxGap?: number
}

export interface NoteEvent {
  /** onset time, seconds */
  time: number
  /** seconds */
  duration: number
  /** MIDI note number */
  midi: number
  /** Hz */
  freq: number
  /** 0..1, from median frame salience */
  velocity: number
}

/** Track @audio/mir-multif0 frames into note events by pitch continuity (±60 cents). */
export default function transcribe(data: Float32Array, options?: TranscribeOptions): NoteEvent[]
