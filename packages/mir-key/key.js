const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Krumhansl–Kessler major and minor key profiles.
 * From Krumhansl & Kessler (1982), as used in the Krumhansl–Schmuckler
 * key-finding algorithm. Values are perceived stability ratings per scale degree.
 */
export const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
export const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

/**
 * Detect musical key from a chroma vector using the Krumhansl–Schmuckler
 * algorithm: Pearson correlation between the input chroma and each of 24
 * rotated major/minor key profiles. The key with the highest correlation wins.
 *
 * Accepts either a single 12-D chroma vector or an array of frames (in which
 * case the mean across frames is used).
 *
 * @param {(Float64Array | Float32Array | number[]) | (Float64Array | Float32Array | number[])[]} input
 * @param {{profile?: {major: number[], minor: number[]}}} [params]
 * @returns {{tonic: number, mode: 'major'|'minor', label: string, confidence: number, scores: {label: string, score: number}[]}}
 */
export default function key(input, params) {
  let profile = params?.profile ?? { major: KK_MAJOR, minor: KK_MINOR }

  // accept single vector or sequence of frames
  let v = new Float64Array(12)
  if (Array.isArray(input) && input.length && typeof input[0] !== 'number') {
    for (let f of input) for (let i = 0; i < 12; i++) v[i] += f[i]
    for (let i = 0; i < 12; i++) v[i] /= input.length
  } else {
    for (let i = 0; i < 12; i++) v[i] = input[i]
  }

  let scores = []
  for (let r = 0; r < 12; r++) {
    scores.push({ label: NOTE_NAMES[r],        score: pearson(v, rotate(profile.major, r)) })
    scores.push({ label: NOTE_NAMES[r] + 'm',  score: pearson(v, rotate(profile.minor, r)) })
  }
  scores.sort((a, b) => b.score - a.score)

  let best = scores[0]
  let mode = best.label.endsWith('m') ? 'minor' : 'major'
  let tonic = NOTE_NAMES.indexOf(mode === 'minor' ? best.label.slice(0, -1) : best.label)
  return { tonic, mode, label: best.label, confidence: best.score, scores }
}

function rotate(arr, r) {
  let out = new Array(12)
  for (let i = 0; i < 12; i++) out[i] = arr[(i - r + 12) % 12]
  return out
}

function pearson(a, b) {
  let n = 12
  let ma = 0, mb = 0
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i] }
  ma /= n; mb /= n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    let ax = a[i] - ma, bx = b[i] - mb
    num += ax * bx
    da += ax * ax
    db += bx * bx
  }
  let denom = Math.sqrt(da * db)
  return denom === 0 ? 0 : num / denom
}
