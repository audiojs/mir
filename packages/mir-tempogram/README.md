# @audio/mir-tempogram

> Tempogram — local tempo over time: an onset envelope (spectral flux) autocorrelated over sliding windows (librosa/MIREX tempogram class).

`npm install @audio/mir-tempogram`

```js
import tempogram from '@audio/mir-tempogram'

let r = tempogram(data, { fs: 44100 })
// { times: Float32Array (s), bpm: Float32Array (best BPM per window),
//   matrix: Float32Array[] (raw autocorrelation, one row per window, lags minLag..maxLag),
//   odfRate: number (onset-envelope frame rate, Hz), minLag: number, maxLag: number (frames) }
```

One row of `matrix` per analysis window; `bpm[i]` is `60 * odfRate / argmax(matrix[i])`. Shorter lags accumulate more autocorrelation terms, so the estimate biases toward the notated tempo over its subdivisions (e.g. picks the quarter-note over the eighth-note pulse).

Options: - `fs` — sample rate (default 44100, Hz) · `frameSize`/`hopSize` — onset-envelope STFT (default 2048/512) · `window` — autocorrelation window (default 6, seconds) · `hop` — window hop (default 2, seconds) · `minBpm`/`maxBpm` — tempo search range (default 40/240)

**Use when:** tempo drifts or varies within a track; for a single global tempo estimate use a beat tracker directly (e.g. `@audio/beat`).

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
