// SPDX-License-Identifier: GPL-2.0-or-later
import { logSpectrum, magnitudes, tuningVotes, tuningOf, semitones, fold } from './nnls.js'

/**
 * Chromagram of a whole signal by NNLS Chroma (Mauch & Dixon 2010), as the reference Vamp plugin runs it: Hann
 * frames of `blockSize` samples every `stepSize`, frame k centred on k·stepSize (zeros before the start); the
 * tuning is read from every frame's log-frequency spectrum, then each frame is tuned, whitened and transcribed.
 *
 * `chromagram(samples, opts)` → { times, tuning, treble, bass }: frame times (s), the concert A found (Hz), and
 * treble and bass chroma per frame (Float32Array(12), C first, unnormalised).
 * `chromagram(opts)` → `write(block)` takes samples; `write()` ends and returns the same. The tuning needs every
 * frame, so the frames' log spectra are held until the end: 1 KB per frame, about 80 MB an hour at the defaults.
 *
 * @param {Float32Array|Float64Array|{fs?: number, blockSize?: number, stepSize?: number, tuning?: number, whitening?: number, s?: number}} data
 * @param {{fs?: number, blockSize?: number, stepSize?: number, tuning?: number, whitening?: number, s?: number}} [opts]
 */
export default function chromagram(data, opts) {
  if (!ArrayBuffer.isView(data) && !Array.isArray(data)) return writer(data)
  let write = writer(opts)
  write(data)
  return write()
}

function writer({ fs = 44100, blockSize, stepSize, tuning, whitening = 1, s = 0.7 } = {}) {
  // 16384 at 44.1 kHz, as the plugin; the same duration (0.34–0.51 s) at other rates
  let N = blockSize ?? 2 ** Math.round(Math.log2(fs * 16384 / 44100)), H = stepSize ?? N / 8
  if ((N & (N - 1)) !== 0) throw new Error('chromagram: blockSize must be a power of 2')
  let win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N))
  let buf = new Float32Array(2 * N), len = N / 2, base = -N / 2   // buf[0] is sample `base`; the first half-frame is zeros
  let total = 0, k = 0, spectra = [], votes = new Float64Array(3), frame = new Float64Array(N)

  let take = () => {
    let off = k * H - N / 2 - base
    for (let i = 0; i < N; i++) frame[i] = (off + i < len ? buf[off + i] : 0) * win[i]
    let ls = logSpectrum(magnitudes(frame), fs, N)
    tuningVotes(ls, votes)
    spectra.push(ls)
    k++
  }

  let push = block => {
    if (len + block.length > buf.length) {
      // drop what the next frame no longer needs; buf then holds at most N + block.length ≤ 2N
      let drop = Math.min(len, k * H - N / 2 - base)
      buf.copyWithin(0, drop, len); len -= drop; base += drop
    }
    buf.set(block, len); len += block.length; total += block.length
    while (k * H + N / 2 <= total) take()
  }

  return block => {
    if (block) { for (let i = 0; i < block.length; i += N) push(block.subarray(i, i + N)); return }
    while (k * H < total) take()
    let t = tuning == null ? tuningOf(votes) : wrap(12 * Math.log2(tuning / 440))
    let times = Float64Array.from(spectra, (_, i) => i * H / fs), treble = [], bass = []
    for (let ls of spectra) { let c = fold(semitones(ls, { tuning: t, whitening, s })); treble.push(c.treble); bass.push(c.bass) }
    spectra = []
    return { times, tuning: 440 * 2 ** (t / 12), treble, bass }
  }
}

// a tuning a semitone or more off names the notes a semitone off, as the plugin's range (-0.5, 0.5] does
const wrap = t => t - Math.ceil(t - 0.5)
