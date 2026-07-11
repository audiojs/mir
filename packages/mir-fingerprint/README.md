# @audio/mir-fingerprint

> Landmark audio fingerprinting (Wang 2003, Shazam class) — spectrogram peak constellation → anchor→target hashes `(f1, f2, Δt)` → matching by offset-histogram vote. Robust to noise and level; exact-match identification, not similarity.

`npm install @audio/mir-fingerprint`

```js
import fingerprint, { match } from '@audio/mir-fingerprint'

let fp = fingerprint(data, { fs: 44100 })
// Array<{ hash: number, t: number }> — t in frames (frame = hop/fs seconds)

let r = match(fpA, fpB)
// { score: number (votes for the best time offset), offset: number (frames, b within a) }
```

`fingerprint()` finds prominent spectral peaks per frame (magnitude > 4× the frame mean and a local max), keeps the strongest `peaksPerFrame`, then pairs each peak as an anchor with up to `fanout` forward peaks within `window` frames — each pair becomes one hash landmark.

`match()` builds a hash→time index from `fpA`, then for every `fpB` landmark with a matching hash accumulates a histogram of time offsets; the offset with the most votes is the alignment, and its vote count is the match confidence. A near-duplicate clip scores high at one dominant offset; unrelated audio spreads votes thinly across many offsets.

Options: - `fs` — sample rate (default 44100, Hz) · `frameSize` — analysis window, samples (default 1024) · `hop` — frame hop, samples (default 512) · `peaksPerFrame` — kept peaks per frame (default 5) · `fanout` — target peaks paired per anchor (default 5) · `window` — max anchor→target Δt, frames (default 32)

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
