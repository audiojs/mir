export type ChromaVec = Float64Array | Float32Array | number[]

/** Krumhansl–Kessler (1982) major key profile, 12 scale-degree stability ratings. */
export const KK_MAJOR: number[]
/** Krumhansl–Kessler (1982) minor key profile, 12 scale-degree stability ratings. */
export const KK_MINOR: number[]

export interface KeyProfile {
  major: number[]
  minor: number[]
}

export interface KeyOptions {
  /** reference key profiles, default Krumhansl–Kessler (KK_MAJOR/KK_MINOR) */
  profile?: KeyProfile
}

export interface KeyScore {
  /** e.g. 'C', 'Am' */
  label: string
  /** Pearson correlation, -1..1 */
  score: number
}

export interface KeyResult {
  /** pitch class 0..11 */
  tonic: number
  mode: 'major' | 'minor'
  /** e.g. 'C', 'Am' */
  label: string
  /** correlation of the winning key, -1..1 */
  confidence: number
  /** all 24 candidates, sorted descending by score */
  scores: KeyScore[]
}

/**
 * Krumhansl–Schmuckler key detection. Accepts a single chroma vector, or an
 * array of chroma frames (averaged across frames before scoring).
 */
export default function key(input: ChromaVec | ChromaVec[], params?: KeyOptions): KeyResult
