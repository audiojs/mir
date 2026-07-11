export interface FingerprintOptions {
  /** analysis window, samples, default 1024 */
  frameSize?: number
  /** frame hop, samples, default 512 */
  hop?: number
  /** kept spectral peaks per frame, default 5 */
  peaksPerFrame?: number
  /** target peaks paired per anchor, default 5 */
  fanout?: number
  /** max anchor→target Δt, frames, default 32 */
  window?: number
}

export interface Landmark {
  hash: number
  /** frame index; frame = hop/fs seconds */
  t: number
}

/** Landmark constellation hashing (Wang 2003, Shazam class). */
export default function fingerprint(data: Float32Array, options?: FingerprintOptions): Landmark[]

export interface MatchResult {
  /** votes for the best time offset */
  score: number
  /** frames, b's position within a */
  offset: number
}

/** Match two fingerprints via offset-histogram vote over shared hashes. */
export function match(fpA: Landmark[], fpB: Landmark[]): MatchResult
