export interface Multif0Options {
  /** sample rate, default 44100 */
  fs?: number
  /** analysis window, samples, default 4096 */
  frameSize?: number
  /** frame hop, samples, default frameSize/2 */
  hopSize?: number
  /** pitch search range low edge, Hz, default 60 */
  minFreq?: number
  /** pitch search range high edge, Hz, default 1200 */
  maxFreq?: number
  /** pitches per frame, default 6 */
  maxPitches?: number
  /** partials scored per candidate, default 12 */
  harmonics?: number
  /** fraction of the frame's top salience a pitch must reach, default 0.4 */
  threshold?: number
}

export interface Pitch {
  freq: number
  salience: number
}

export interface Multif0Frame {
  /** frame center time, seconds */
  time: number
  pitches: Pitch[]
}

/** Klapuri (2006) iterative spectral-subtraction multi-F0 estimation. */
export default function multif0(data: Float32Array, options?: Multif0Options): Multif0Frame[]
