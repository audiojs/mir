// @audio/mir-chordino: chord sequence by Chordino (Mauch 2010) from NNLS chroma, as the reference Vamp plugin.

export interface ChordinoOptions {
  /** lifts the no-chord profile, default 0.1 */
  boostN?: number
  /** where the last chord ends (s), default one frame after the last */
  end?: number
}

export interface ChordSegment {
  /** start, seconds */
  time: number
  duration: number
  /** pitch class 0..11, or -1 for no-chord */
  root: number
  /** Harte shorthand */
  quality: 'maj' | 'min' | '7' | 'maj7' | 'min7' | 'maj6' | 'min6' | 'dim' | 'aug' | 'hdim7' | 'N'
  /** pitch class in the bass, -1 for no-chord */
  bass: number
  /** e.g. 'C', 'Am', 'G7', 'C/E', 'N' */
  label: string
  /** cosine of the frames' bass+treble chroma with the chord's profile, 0..1 */
  confidence: number
}

/** Chord sequence from bass and treble chroma, as @audio/mir-nnls-chroma's chromagram gives them. */
export default function chordino(chromagram: { times: ArrayLike<number>, treble: ArrayLike<number>[], bass: ArrayLike<number>[] }, params?: ChordinoOptions): ChordSegment[]
