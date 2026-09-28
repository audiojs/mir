// SPDX-License-Identifier: GPL-2.0-or-later
/**
 * NNLS Chroma (Mauch & Dixon, "Approximate note transcription for the improved identification of difficult
 * chords", ISMIR 2010), ported from the reference Vamp plugin (c4dm/nnls-chroma: NNLSBase.cpp, Chordino.cpp,
 * chromamethods.cpp, nnls.c) with its defaults: a log-frequency spectrum at 3 bins per semitone, the tuning read
 * from that spectrum, running standardisation (spectral whitening), and non-negative least squares against a
 * dictionary of harmonic notes, folded into treble and bass chroma.
 */

import rfft from 'fourier-transform'

const BPS = 3                 // bins per semitone
const BINS = 256              // log-frequency bins, MIDI 20..105 (84 semitones A0..G#7 plus an edge on each side)
const NOTES = 84              // semitones of the note dictionary, A0 (MIDI 21) first
const TUNE_TOP = 160          // bins that vote on the tuning: round(256·0.62/3)·3 + 1

// Treble and bass profiles over the 84 semitones, A0 first (chromamethods.h)
const TREBLE = Float64Array.of(0.000350, 0.003144, 0.008717, 0.017037, 0.028058, 0.041719, 0.057942, 0.076638, 0.097701, 0.121014, 0.146447, 0.173856, 0.203090, 0.233984, 0.266366, 0.300054, 0.334860, 0.370590, 0.407044, 0.444018, 0.481304, 0.518696, 0.555982, 0.592956, 0.629410, 0.665140, 0.699946, 0.733634, 0.766016, 0.796910, 0.826144, 0.853553, 0.878986, 0.902299, 0.923362, 0.942058, 0.958281, 0.971942, 0.982963, 0.991283, 0.996856, 0.999650, 0.999650, 0.996856, 0.991283, 0.982963, 0.971942, 0.958281, 0.942058, 0.923362, 0.902299, 0.878986, 0.853553, 0.826144, 0.796910, 0.766016, 0.733634, 0.699946, 0.665140, 0.629410, 0.592956, 0.555982, 0.518696, 0.481304, 0.444018, 0.407044, 0.370590, 0.334860, 0.300054, 0.266366, 0.233984, 0.203090, 0.173856, 0.146447, 0.121014, 0.097701, 0.076638, 0.057942, 0.041719, 0.028058, 0.017037, 0.008717, 0.003144, 0.000350)
const BASS = new Float64Array(NOTES)
BASS.set([0.001769, 0.015848, 0.043608, 0.084265, 0.136670, 0.199341, 0.270509, 0.348162, 0.430105, 0.514023, 0.597545, 0.678311, 0.754038, 0.822586, 0.882019, 0.930656, 0.967124, 0.990393, 0.999803, 0.995091, 0.976388, 0.944223, 0.899505, 0.843498, 0.777785, 0.704222, 0.624888, 0.542025, 0.457975, 0.375112, 0.295778, 0.222215, 0.156502, 0.100495, 0.055777, 0.023612, 0.004909])

const cospuls = (x, c, w) => Math.abs(x - c) <= 0.5 * w ? Math.cos((x - c) * 2 * Math.PI / w) * 0.5 + 0.5 : 0

/** Sparse map from the magnitude spectrum (N/2 bins) to the 256 log-frequency bins (logFreqMatrix). */
let kernels = new Map()
function kernel(fs, N) {
  let id = fs + '/' + N
  if (kernels.has(id)) return kernels.get(id)
  let nFFT = N / 2, os = 80, binHz = fs / N, width = 2 * binHz, c = Math.log(2) / 36
  let cq = new Float64Array(BINS)
  for (let i = 20, k = 0; i < 105; i++) for (let b = 0; b < BPS; b++) cq[k++] = 440 * 2 ** (0.083333333333 * (i + b / BPS - 69))
  cq[BINS - 1] = 440 * 2 ** (0.083333 * (105 - 69))
  let act = new Float64Array(2 * os)
  for (let i = 0; i < 2 * os; i++) act[i] = cospuls(i * binHz / os, binHz, width)
  let lo = 2 ** 0.084, hi = 2 ** (-0.084 * 2), fft = [], note = [], val = []
  for (let q = 0; q < BINS; q++) for (let f = 1; f < nFFT; f++) {
    let ff = f * binHz, s = os * (f - 1)
    if (!(cq[q] * lo + width > ff && cq[q] * hi - width < ff)) continue
    let sum = 0
    for (let o = s; o < s + 2 * os; o++) {
      let x = o * binHz / os
      if (x > 0) sum += cospuls(36 * Math.log2(x / cq[q]), 0, 2) / (c * x) * act[o - s]
    }
    if (sum > 0) { fft.push(f); note.push(q); val.push(sum) }
  }
  let k = { fft: Int32Array.from(fft), note: Int32Array.from(note), val: Float64Array.from(val) }
  kernels.set(id, k)
  return k
}

/**
 * Note dictionary: 84 columns of 256, partials 1..20 at amplitude s^(h-1) (dictionaryMatrix), kept as sparse
 * columns, with its Gram matrix DᵀD for the normal equations.
 */
let dicts = new Map()
function dictionary(s) {
  if (dicts.has(s)) return dicts.get(s)
  let d = new Float64Array(BINS * NOTES)
  for (let n = 0; n < NOTES; n++) for (let h = 1; h <= 20; h++) {
    let fb = (n + 1) * BPS + 1 + BPS * 12 * Math.log2(h), amp = s ** (h - 1)
    for (let b = 0; b < BINS; b++) if (Math.abs(b + 1 - fb) < 2) d[b + BINS * n] += cospuls(b + 1, fb, BPS) * amp
  }
  let cols = Array.from({ length: NOTES }, (_, n) => {
    let at = [], v = []
    for (let b = 0; b < BINS; b++) if (d[b + BINS * n]) { at.push(b); v.push(d[b + BINS * n]) }
    return { at: Int32Array.from(at), v: Float64Array.from(v) }
  })
  let G = new Float64Array(NOTES * NOTES)
  for (let i = 0; i < NOTES; i++) for (let j = 0; j < NOTES; j++) {
    let g = 0
    for (let b = 0; b < BINS; b++) g += d[b + BINS * i] * d[b + BINS * j]
    G[i * NOTES + j] = g
  }
  let dict = { cols, G }
  dicts.set(s, dict)
  return dict
}

// Hamming window over half an octave (19 bins), normalised to unit sum: the running mean and deviation
const HW = (() => {
  let n = BPS * 6 + 1, w = Float64Array.from({ length: n }, (_, i) => 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1)))
  let s = w.reduce((a, b) => a + b)
  return w.map(v => v / s)
})()

/**
 * Log-frequency spectrum of one frame's magnitudes (scaled as an unnormalised DFT). Frames whose peak is under
 * N·2/16384 are silence (NNLSBase::baseProcess).
 */
export function logSpectrum(mag, fs, N) {
  let K = kernel(fs, N), out = new Float32Array(BINS), max = 0
  for (let i = 0; i < mag.length; i++) { if (mag[i] > N) mag[i] = N; if (mag[i] > max) max = mag[i] }
  if (max < N * 2 / 16384) return out
  for (let i = 0; i < K.val.length; i++) out[K.note[i]] += mag[K.fft[i]] * K.val[i]
  return out
}

/** Magnitudes of a windowed frame, scaled as an unnormalised DFT (the Vamp host's input). */
export function magnitudes(frame) {
  let N = frame.length, spec = rfft(frame), mag = new Float64Array(N / 2)
  for (let i = 0; i < N / 2; i++) mag[i] = spec[i] * N / 2
  return mag
}

/** Tuning votes of one log spectrum: the energy at each of the 3 positions within a semitone. */
export function tuningVotes(ls, acc = new Float64Array(BPS)) {
  for (let t = 0; t < TUNE_TOP; t += BPS) for (let b = 0; b < BPS; b++) acc[b] += ls[t + b]
  return acc
}

/** Tuning in semitones from 440 Hz, (-0.5, 0.5], from summed votes: the phase of the 3-bin periodicity. */
export function tuningOf(votes) {
  let re = 0, im = 0
  for (let b = 0; b < BPS; b++) { re += votes[b] * Math.cos(2 * Math.PI * b / BPS); im += votes[b] * Math.sin(2 * Math.PI * b / BPS) }
  return Math.atan2(im, re) / (2 * Math.PI)
}

function convolve(x) {
  // SpecialConvolution: centred, edges hold the first and last valid values
  let n = x.length, k = HW.length, h = k >> 1, z = new Float64Array(n)
  for (let i = k - 1; i < n; i++) { let s = 0; for (let m = 0; m < k; m++) s += x[i - m] * HW[m]; z[i - h] = s }
  for (let i = 0; i < h; i++) z[i] = z[h]
  for (let i = n - h; i < n; i++) z[i] = z[n - h - 1]
  return z
}

/**
 * Tuned log spectrum, whitened: shifted by `tuning` semitones, minus its running mean over half an octave, divided
 * by the running deviation raised to `whitening` (the plugin's "Tuned Log-frequency Spectrum").
 */
export function tunedSpectrum(ls, tuning = 0, whitening = 1) {
  let sh = tuning * BPS, i0 = Math.floor(sh), fr = sh - i0, y = new Float64Array(BINS)
  for (let k = 2; k < BINS - 3; k++) y[k] = ls[k + i0] * (1 - fr) + ls[k + i0 + 1] * fr
  let mean = convolve(y), dev = new Float64Array(BINS)
  for (let i = 0; i < BINS; i++) dev[i] = (y[i] - mean[i]) ** 2
  dev = convolve(dev)
  for (let i = 0; i < BINS; i++) {
    let sd = Math.sqrt(dev[i])
    if (sd > 0) y[i] = y[i] - mean[i] > 0 ? (y[i] - mean[i]) / sd ** whitening : 0
  }
  return y
}

/**
 * Note activations (84 semitones, A0 first) of one log spectrum: NNLS against the note dictionary, over the notes
 * with energy in their bin; the rest stay 0.
 */
export function semitones(ls, { tuning = 0, whitening = 1, s = 0.7 } = {}) {
  let b = tunedSpectrum(ls, tuning, whitening), x = new Float64Array(NOTES), sig = []
  for (let n = 0; n < NOTES; n++) { let i = BPS * n + 3; if (b[i - 1] + b[i] + b[i + 1] > 0) sig.push(n) }
  if (!sig.length) return x
  let { cols, G } = dictionary(s), n = sig.length, AtA = new Float64Array(n * n), Atb = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) AtA[i * n + j] = G[sig[i] * NOTES + sig[j]]
    let { at, v } = cols[sig[i]], y = 0
    for (let k = 0; k < at.length; k++) y += v[k] * b[at[k]]
    Atb[i] = y
  }
  let r = nnls(AtA, Atb, n)
  sig.forEach((m, j) => x[m] = r[j])
  return x
}

/** Treble and bass chroma (C first) of note activations. */
export function fold(x) {
  let treble = new Float32Array(12), bass = new Float32Array(12)
  for (let n = 0; n < NOTES; n++) {
    if (!x[n]) continue
    let pc = (n + 9) % 12   // semitone 0 is A
    treble[pc] += x[n] * TREBLE[n]; bass[pc] += x[n] * BASS[n]
  }
  return { treble, bass }
}

/**
 * Non-negative least squares, min ‖A·x − b‖ subject to x ≥ 0, from AᵀA (n×n) and Aᵀb: Lawson & Hanson's active
 * set ("Solving Least Squares Problems", 1974, ch. 23; NNLS.FOR, the reference's solver) on the normal equations,
 * as FNNLS (Bro & De Jong, J. Chemometrics 11, 1997). Same solution, a quarter of the time; iterations capped at
 * 3n as NNLS.FOR.
 */
export function nnls(AtA, Atb, n) {
  let x = new Float64Array(n), z = new Float64Array(n), w = Float64Array.from(Atb), P = new Uint8Array(n)
  let L = new Float64Array(n * n), idx = new Int32Array(n), y = new Float64Array(n), iter = 0
  // z = the unconstrained solution over set P (Cholesky of AtA[P,P]), 0 elsewhere
  let solve = () => {
    let k = 0
    for (let i = 0; i < n; i++) if (P[i]) idx[k++] = i
    for (let i = 0; i < k; i++) for (let j = 0; j <= i; j++) {
      let v = AtA[idx[i] * n + idx[j]]
      for (let m = 0; m < j; m++) v -= L[i * n + m] * L[j * n + m]
      L[i * n + j] = i === j ? Math.sqrt(v) : v / L[j * n + j]
    }
    for (let i = 0; i < k; i++) { let v = Atb[idx[i]]; for (let m = 0; m < i; m++) v -= L[i * n + m] * y[m]; y[i] = v / L[i * n + i] }
    for (let i = k - 1; i >= 0; i--) { let v = y[i]; for (let m = i + 1; m < k; m++) v -= L[m * n + i] * y[m]; y[i] = v / L[i * n + i] }
    z.fill(0)
    for (let i = 0; i < k; i++) z[idx[i]] = y[i]
  }
  for (;;) {
    // the most positive gradient enters P, if its coefficient comes out positive
    let j = -1, wmax = 0
    for (let i = 0; i < n; i++) if (!P[i] && w[i] > wmax) { wmax = w[i]; j = i }
    if (j < 0) return x
    P[j] = 1
    solve()
    if (!(z[j] > 0)) { P[j] = 0; w[j] = 0; continue }
    // step back to feasibility, dropping the coefficients that reach 0
    for (;;) {
      let alpha = 2, im = -1
      for (let i = 0; i < n; i++) if (P[i] && z[i] <= 0) { let a = x[i] / (x[i] - z[i]); if (a < alpha) { alpha = a; im = i } }
      if (im < 0) break
      if (++iter > 3 * n) return x
      for (let i = 0; i < n; i++) if (P[i]) x[i] += alpha * (z[i] - x[i])
      // the one that set alpha leaves exactly; round-off may take others to 0 as well
      x[im] = 0
      for (let i = 0; i < n; i++) if (P[i] && x[i] <= 0) { P[i] = 0; x[i] = 0 }
      solve()
    }
    x.set(z)
    for (let i = 0; i < n; i++) {
      if (P[i]) { w[i] = 0; continue }
      let v = Atb[i]
      for (let m = 0; m < n; m++) v -= AtA[i * n + m] * x[m]
      w[i] = v
    }
  }
}
