// SPDX-License-Identifier: GPL-2.0-or-later
/**
 * Chord sequence from bass and treble chroma: Chordino (Mauch 2010, "Automatic chord transcription from audio using
 * computational models of musical context", PhD thesis; ported from the reference c4dm/nnls-chroma Chordino.cpp and
 * chromamethods.cpp). Each frame scores 217 chords (18 types on 12 roots, and no-chord) by the dot product of its
 * 24-D bass+treble chroma with the chord's profile; a Viterbi path through them, 0.99 to stay on a chord, gives
 * the sequence.
 */

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// The plugin's built-in dictionary (staticChordvalues): bass intervals, treble intervals, Chordino's name, Harte
// quality. A chord type with no bass interval accepts any of its notes in the bass.
const TYPES = [
  [[0], [0, 4, 7], '', 'maj'], [[], [0, 4, 7], '', 'maj'],
  [[0], [0, 3, 7], 'm', 'min'], [[], [0, 3, 7], 'm', 'min'],
  [[10], [0, 3, 6, 10], 'm7b5', 'hdim7'], [[0], [0, 3, 6, 10], 'm7b5', 'hdim7'],
  [[0], [0, 4, 7, 9], '6', 'maj6'], [[0], [0, 4, 7, 10], '7', '7'], [[0], [0, 4, 7, 11], 'maj7', 'maj7'],
  [[0], [0, 3, 7, 10], 'm7', 'min7'], [[0], [0, 3, 7, 9], 'm6', 'min6'],
  [[4], [0, 4, 7], '', 'maj'], [[7], [0, 4, 7], '', 'maj'],
  [[0], [0, 3, 6], 'dim', 'dim'], [[0], [0, 4, 8], 'aug', 'aug'],
  [[2], [0, 4, 7], '', 'maj'], [[10], [0, 4, 7], '', 'maj'], [[4], [0, 4, 7, 10], '7', '7']
]

let cache = new Map()
function dictionary(boostN) {
  if (cache.has(boostN)) return cache.get(boostN)
  let chords = []
  for (let [bassIv, treble, name, quality] of TYPES) {
    // roots in the plugin's order, A first (it breaks ties by order)
    for (let a = 0; a < 12; a++) {
      let root = (a + 9) % 12, bass = bassIv.length ? (root + bassIv[0]) % 12 : root, v = new Float64Array(24)
      for (let k = 0; k < 12; k++) {
        let r = (k - root + 12) % 12
        v[k] = bassIv.includes(r) ? 1 : treble.includes(r) ? 0.5 : 0
        v[12 + k] = treble.includes(r) ? 1 : 0
      }
      let label = NAMES[root] + name + (bass !== root ? '/' + NAMES[bass] : '')
      chords.push({ root, quality, bass, label, v })
    }
  }
  let N = new Float64Array(24).fill(0.5, 0, 12).fill(1, 12)
  chords.push({ root: -1, quality: 'N', bass: -1, label: 'N', v: N })
  // each profile over its RMS; no-chord's also times (1 + boostN)
  chords.forEach((c, i) => {
    let rms = Math.sqrt(c.v.reduce((s, x) => s + x * x, 0) / 24)
    if (i === chords.length - 1) rms /= 1 + boostN
    for (let k = 0; k < 24; k++) c.v[k] /= rms
  })
  cache.set(boostN, chords)
  return chords
}

/**
 * @param {{times: ArrayLike<number>, treble: ArrayLike<number>[], bass: ArrayLike<number>[]}} chromagram
 *   bass and treble chroma per frame (C first, unnormalised, as NNLS Chroma gives them) and the frames' times
 * @param {{boostN?: number, end?: number}} [params] boostN lifts no-chord (default 0.1); end: where the last chord
 *   ends (default: one frame after the last)
 * @returns {{time: number, duration: number, root: number, quality: string, bass: number, label: string, confidence: number}[]}
 *   quality in Harte's shorthand (maj, min, 7, maj7, min7, maj6, min6, dim, aug, hdim7) or 'N'; bass as a pitch
 *   class; confidence: the cosine of the frames' chroma with the chord's profile, averaged
 */
export default function chordino({ times, treble, bass }, params) {
  let T = treble.length
  if (!T) return []
  let chords = dictionary(params?.boostN ?? 0.1), S = chords.length, noChord = S - 1
  let self = 0.99, off = (1 - self) / (S - 1)
  let obs = new Float64Array(S), x = new Float64Array(24)
  let delta = new Float64Array(S), next = new Float64Array(S), psi = new Int32Array(T * S)
  let salience = t => {
    for (let k = 0; k < 12; k++) { x[k] = bass[t][k]; x[12 + k] = treble[t][k] }
    let sum = 0
    for (let c = 0; c < S; c++) {
      let v = 0, p = chords[c].v
      for (let k = 0; k < 24; k++) v += p[k] * x[k]
      if (c === noChord) v *= 0.7
      v = Math.min(200, Math.max(0, v))
      sum += obs[c] = 1.3 ** v
    }
    for (let c = 0; c < S; c++) obs[c] /= sum
  }

  // Viterbi, starting on no-chord, each frame's probabilities rescaled to sum 1 (viterbi.cpp)
  salience(0)
  delta.fill(0); delta[noChord] = 1
  for (let t = 1; t < T; t++) {
    salience(t)
    // the best predecessor of j is j itself or the best other state: the first and second best states suffice
    let i1 = -1, m1 = -1, i2 = -1, m2 = -1
    for (let i = 0; i < S; i++) {
      if (delta[i] > m1) { i2 = i1; m2 = m1; i1 = i; m1 = delta[i] }
      else if (delta[i] > m2) { i2 = i; m2 = delta[i] }
    }
    let sum = 0
    for (let j = 0; j < S; j++) {
      let best = noChord, val = 0
      if (obs[j] > 0) {
        let oi = j === i1 ? i2 : i1, ov = (j === i1 ? m2 : m1) * off, sv = delta[j] * self
        // as the plugin's scan in state order, keeping the first strict maximum
        if (sv > ov || (sv === ov && j < oi)) { val = sv; best = j } else { val = ov; best = oi }
        if (!(val > 0)) { val = 0; best = noChord }
      }
      next[j] = val * obs[j]; psi[t * S + j] = best; sum += next[j]
    }
    if (sum > 0) for (let j = 0; j < S; j++) delta[j] = next[j] / sum
    else delta.fill(1 / S)
  }
  let path = new Int32Array(T), best = 0
  path[T - 1] = noChord
  for (let i = 0; i < S; i++) if (delta[i] > best) { best = delta[i]; path[T - 1] = i }
  for (let t = T - 1; t > 0; t--) path[t - 1] = psi[t * S + path[t]]

  // segments: a chord from the frame it starts on to the next change; states that share a label merge
  let end = params?.end ?? (T > 1 ? times[T - 1] + (times[T - 1] - times[T - 2]) : times[0]), out = [], cs = 0, cn = 0
  for (let t = 0; t < T; t++) {
    let c = chords[path[t]]
    if (!out.length || out.at(-1).label !== c.label) {
      if (out.length) out.at(-1).confidence = cs / cn
      out.push({ time: times[t], duration: 0, root: c.root, quality: c.quality, bass: c.bass, label: c.label, confidence: 0 })
      cs = cn = 0
    }
    cs += cosine(c.v, bass[t], treble[t]); cn++
  }
  out.at(-1).confidence = cs / cn
  for (let i = 0; i < out.length; i++) out[i].duration = (i + 1 < out.length ? out[i + 1].time : end) - out[i].time
  return out
}

function cosine(p, b, tr) {
  let d = 0, np = 0, nx = 0
  for (let k = 0; k < 12; k++) {
    d += p[k] * b[k] + p[12 + k] * tr[k]
    np += p[k] * p[k] + p[12 + k] * p[12 + k]
    nx += b[k] * b[k] + tr[k] * tr[k]
  }
  return np && nx ? d / Math.sqrt(np * nx) : 0
}
