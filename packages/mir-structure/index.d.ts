export interface StructureOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** MFCC analysis window, samples, default 2048 */
  frameSize?: number
  /** MFCC analysis hop, samples, default 1024 */
  hop?: number
  /** checkerboard-kernel quadrant size, frames, default 16 */
  kernel?: number
  /** novelty-peak threshold in std-devs above the mean, default 1 */
  sensitivity?: number
}

export interface StructureResult {
  /** detected section-boundary times, seconds */
  boundaries: number[]
  /** checkerboard-kernel novelty score per frame */
  novelty: Float32Array
  /** frame center times, seconds, same length as novelty */
  times: Float32Array
}

/** Foote novelty structural segmentation over MFCC self-similarity (Foote 2000). */
export default function structure(data: Float32Array, options?: StructureOptions): StructureResult
