const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * 24 binary chord templates: C, C#, … B (major) then C, C#, … B (minor).
 * Each template is a length-12 vector with 1 on chord tones, 0 elsewhere.
 */
export const TEMPLATES = buildTemplates()

function buildTemplates() {
  let T = []
  // major: root, +4, +7
  for (let r = 0; r < 12; r++) {
    let t = new Float64Array(12)
    t[r] = 1; t[(r + 4) % 12] = 1; t[(r + 7) % 12] = 1
    T.push({ root: r, quality: 'maj', label: NOTE_NAMES[r], vec: t })
  }
  // minor: root, +3, +7
  for (let r = 0; r < 12; r++) {
    let t = new Float64Array(12)
    t[r] = 1; t[(r + 3) % 12] = 1; t[(r + 7) % 12] = 1
    T.push({ root: r, quality: 'min', label: NOTE_NAMES[r] + 'm', vec: t })
  }
  return T
}

/**
 * Classify a single chroma frame as one of 24 major/minor triads
 * via cosine similarity with binary templates (Fujishima, 1999).
 *
 * @param {Float64Array | Float32Array | number[]} chromaVec - length-12 chroma vector
 * @param {{minConfidence?: number}} [params]
 * @returns {{root: number, quality: 'maj'|'min'|'N', label: string, confidence: number}}
 */
export default function chord(chromaVec, params) {
  let minConf = params?.minConfidence ?? 0.3
  let cNorm = l2norm(chromaVec)
  if (cNorm === 0) return { root: -1, quality: 'N', label: 'N', confidence: 0 }

  let best = null, bestSim = -Infinity
  for (let t of TEMPLATES) {
    let sim = cosine(chromaVec, t.vec, cNorm)
    if (sim > bestSim) { bestSim = sim; best = t }
  }
  if (bestSim < minConf) return { root: -1, quality: 'N', label: 'N', confidence: bestSim }
  return { root: best.root, quality: best.quality, label: best.label, confidence: bestSim }
}

/**
 * Smooth a sequence of chroma frames into a chord sequence using Viterbi
 * with a sticky self-transition prior. A simple stand-in for Mauch-style
 * context models — works well in practice for short segments.
 *
 * @param {(Float64Array|Float32Array|number[])[]} frames - array of chroma vectors
 * @param {{selfProb?: number}} [params]
 * @returns {{root: number, quality: 'maj'|'min'|'N', label: string}[]}
 */
export function smooth(frames, params) {
  let selfProb = params?.selfProb ?? 0.5
  let n = frames.length
  if (n === 0) return []
  let S = TEMPLATES.length         // 24 states
  let logSelf = Math.log(selfProb)
  let logSwitch = Math.log((1 - selfProb) / (S - 1))

  // observation log-likelihoods: cosine similarity mapped to log-prob
  let logObs = (frame) => {
    let norm = l2norm(frame)
    let out = new Float64Array(S)
    if (norm === 0) { out.fill(-1e9); return out }
    for (let i = 0; i < S; i++) {
      let sim = cosine(frame, TEMPLATES[i].vec, norm)
      // map [-1,1] → log-prob; temperature 8 gives reasonably sharp distributions
      out[i] = 8 * sim
    }
    return out
  }

  // Viterbi
  let delta = logObs(frames[0])
  let psi = new Array(n)
  for (let t = 1; t < n; t++) {
    let lo = logObs(frames[t])
    let next = new Float64Array(S)
    let back = new Int32Array(S)
    for (let j = 0; j < S; j++) {
      let bestVal = -Infinity, bestI = 0
      for (let i = 0; i < S; i++) {
        let v = delta[i] + (i === j ? logSelf : logSwitch)
        if (v > bestVal) { bestVal = v; bestI = i }
      }
      next[j] = bestVal + lo[j]
      back[j] = bestI
    }
    psi[t] = back
    delta = next
  }

  // backtrace
  let path = new Int32Array(n)
  let last = 0, lastVal = -Infinity
  for (let i = 0; i < S; i++) if (delta[i] > lastVal) { lastVal = delta[i]; last = i }
  path[n - 1] = last
  for (let t = n - 1; t > 0; t--) path[t - 1] = psi[t][path[t]]

  return [...path].map(i => ({
    root: TEMPLATES[i].root,
    quality: TEMPLATES[i].quality,
    label: TEMPLATES[i].label,
  }))
}

function l2norm(v) {
  let s = 0
  for (let i = 0; i < 12; i++) s += v[i] * v[i]
  return Math.sqrt(s)
}

function cosine(a, b, aNorm) {
  let dot = 0, bNorm = 0
  for (let i = 0; i < 12; i++) { dot += a[i] * b[i]; bNorm += b[i] * b[i] }
  bNorm = Math.sqrt(bNorm)
  return aNorm && bNorm ? dot / (aNorm * bNorm) : 0
}
