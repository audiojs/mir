export type ChromaVec = Float64Array | Float32Array | number[]

export interface ChordTemplate {
  root: number
  quality: 'maj' | 'min'
  label: string
  vec: Float64Array
}

/** 24 binary chord templates: C, C#, … B (major) then C, C#, … B (minor). */
export const TEMPLATES: ChordTemplate[]

export interface ChordOptions {
  /** cosine similarity floor below which the result is 'N', default 0.3 */
  minConfidence?: number
}

export interface ChordResult {
  /** pitch class 0..11, or -1 for no-chord */
  root: number
  quality: 'maj' | 'min' | 'N'
  /** e.g. 'C', 'Am', 'N' */
  label: string
  /** cosine similarity of the winning template, -1..1 */
  confidence: number
}

/** Classify a single chroma frame as one of 24 major/minor triads (Fujishima, 1999). */
export default function chord(chromaVec: ChromaVec, params?: ChordOptions): ChordResult

export interface SmoothOptions {
  /** self-transition probability, stickier when higher, default 0.5 */
  selfProb?: number
}

export interface SmoothedChord {
  root: number
  quality: 'maj' | 'min'
  label: string
}

/** Viterbi-smooth a chroma-frame sequence into a stable chord sequence. */
export function smooth(frames: ChromaVec[], params?: SmoothOptions): SmoothedChord[]
