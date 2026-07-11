# @audio/mir-chroma

> Chroma (pitch-class profile) — a 12-D vector where each bin holds the energy attributed to one pitch class (C, C♯, …, B), folding all octaves together.

`npm install @audio/mir-chroma`

```js
import chroma from '@audio/mir-chroma'

let c = chroma(data, { fs: 44100 })   // Float64Array[12], L1-normalized (sums to 1)
```

Two methods:

- **`'pcp'`** (default) — classical Fujishima (1999). Each spectral bin is mapped to its nearest pitch class by log-frequency rounding and power-accumulated.
- **`'nnls'`** — Mauch & Dixon (2010) NNLS Chroma. Fits the observed spectrum as a nonnegative combination of synthetic pitch-tone profiles (fundamental + 1/h-decaying overtones) via multiplicative NMF updates, then folds pitch activations into pitch classes. Cleaner on polyphonic audio — suppresses octave and harmonic confusion that PCP is prone to.

Options: - `fs` — sample rate (default 44100, Hz) · `method` — `'pcp'` or `'nnls'` (default `'pcp'`) · `minFreq`/`maxFreq` — analysis band for `'pcp'` (default 65/2093, Hz, ≈C2–C7) · `harmonics` — partials per pitch template for `'nnls'` (default 8) · `iterations` — NMF update steps for `'nnls'` (default 30)

`data` must be a power-of-2-length window (throws otherwise) — chroma operates on one FFT frame per call; slide it yourself for a chromagram.

Also exported as an `audio.js` stat manifest (`./audio`) — chromagram frames over time plus their normalized mean.

Part of [@audio/mir](https://github.com/audiojs/mir).
