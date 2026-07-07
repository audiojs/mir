import rfft from 'fourier-transform'

const PITCH_MIN = 24   // MIDI C1
const PITCH_MAX = 96   // MIDI C7
const A4_MIDI = 69
const A4_HZ = 440

/**
 * Chroma (pitch-class profile) feature — a 12-D vector where each bin holds
 * the energy attributed to one pitch class (C, C♯, …, B).
 *
 * Two variants:
 *
 * - **'pcp'** (default) — classical Fujishima (1999). Each spectral bin is
 *   mapped to its nearest pitch class and energies are accumulated.
 * - **'nnls'** — Mauch & Dixon (2010) NNLS Chroma. Fits the observed spectrum
 *   as a nonnegative combination of synthetic pitch-tone profiles (fundamental
 *   plus geometrically decaying overtones). Much cleaner on polyphonic audio,
 *   suppresses octave and harmonic confusion.
 *
 * @param {Float32Array | Float64Array} data - window, length must be a power of 2
 * @param {{fs?: number, method?: 'pcp'|'nnls', minFreq?: number, maxFreq?: number, harmonics?: number, iterations?: number}} [params]
 * @returns {Float64Array} length-12 chroma vector, L1-normalized
 */
export default function chroma(data, params) {
  let fs = params?.fs || 44100
  let method = params?.method ?? 'pcp'
  let minFreq = params?.minFreq ?? 65        // ~C2
  let maxFreq = params?.maxFreq ?? 2093      // ~C7
  let N = data.length
  if ((N & (N - 1)) !== 0) throw new Error('chroma: window length must be a power of 2')

  let spec = rfft(data)
  let half = spec.length
  let binHz = fs / N

  if (method === 'pcp') return pcp(spec, half, binHz, minFreq, maxFreq)
  if (method === 'nnls') return nnls(spec, half, binHz, params?.harmonics ?? 8, params?.iterations ?? 30)
  throw new Error(`chroma: unknown method "${method}"`)
}

function pcp(spec, half, binHz, minFreq, maxFreq) {
  let out = new Float64Array(12)
  for (let b = 1; b < half; b++) {
    let f = b * binHz
    if (f < minFreq || f > maxFreq) continue
    let midi = A4_MIDI + 12 * Math.log2(f / A4_HZ)
    let pc = ((Math.round(midi) % 12) + 12) % 12
    out[pc] += spec[b] * spec[b]   // power
  }
  normalize(out)
  return out
}

// cached pitch dictionary per (half, binHz, harmonics)
let dictCache = new Map()
function pitchDict(half, binHz, harmonics) {
  let key = `${half}|${binHz}|${harmonics}`
  let cached = dictCache.get(key)
  if (cached) return cached

  let P = PITCH_MAX - PITCH_MIN + 1
  let D = new Array(P)
  let sigma = 0.5   // Gaussian width in semitones
  for (let p = 0; p < P; p++) {
    let col = new Float64Array(half)
    let f0 = A4_HZ * Math.pow(2, (PITCH_MIN + p - A4_MIDI) / 12)
    for (let h = 1; h <= harmonics; h++) {
      let fh = h * f0
      if (fh >= (half - 1) * binHz) break
      let w = 1 / h       // 1/h amplitude decay
      // Gaussian lobe in log-frequency centered at fh
      let bc = fh / binHz
      let bLo = Math.max(1, Math.floor(bc - 6))
      let bHi = Math.min(half - 1, Math.ceil(bc + 6))
      for (let b = bLo; b <= bHi; b++) {
        let fBin = b * binHz
        if (fBin <= 0) continue
        let semis = 12 * Math.log2(fBin / fh)
        col[b] += w * Math.exp(-0.5 * (semis / sigma) ** 2)
      }
    }
    // normalize column
    let colSum = 0
    for (let b = 0; b < half; b++) colSum += col[b] * col[b]
    if (colSum > 0) {
      let s = 1 / Math.sqrt(colSum)
      for (let b = 0; b < half; b++) col[b] *= s
    }
    D[p] = col
  }
  dictCache.set(key, D)
  return D
}

function nnls(spec, half, binHz, harmonics, iterations) {
  let D = pitchDict(half, binHz, harmonics)
  let P = D.length

  // observation: √spectrum for better loudness scaling
  let s = new Float64Array(half)
  for (let i = 0; i < half; i++) s[i] = Math.sqrt(spec[i])

  // multiplicative NMF update: a ← a · (Dᵀ s) / (Dᵀ D a + ε)
  let a = new Float64Array(P).fill(1)
  let eps = 1e-9
  for (let it = 0; it < iterations; it++) {
    // reconstruction r = D a
    let r = new Float64Array(half)
    for (let p = 0; p < P; p++) {
      let ap = a[p]
      if (ap === 0) continue
      let col = D[p]
      for (let b = 0; b < half; b++) r[b] += ap * col[b]
    }
    // update each a[p]
    for (let p = 0; p < P; p++) {
      let col = D[p]
      let num = 0, den = 0
      for (let b = 0; b < half; b++) {
        num += col[b] * s[b]
        den += col[b] * r[b]
      }
      a[p] = a[p] * num / (den + eps)
    }
  }

  // fold into chroma: sum activations per pitch class
  let out = new Float64Array(12)
  for (let p = 0; p < P; p++) out[(PITCH_MIN + p) % 12] += a[p]
  normalize(out)
  return out
}

function normalize(v) {
  let sum = 0
  for (let x of v) sum += x
  if (sum > 0) for (let i = 0; i < v.length; i++) v[i] /= sum
}
