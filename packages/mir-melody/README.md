# @audio/mir-melody

> Melody contour — frame-level F0 track via YIN with voicing flags (MIREX melody-extraction shape).

`npm install @audio/mir-melody`

```js
import melody from '@audio/mir-melody'

let { times, f0, voiced } = melody(data, { fs: 44100 })
// times: Float32Array (s, frame centers) · f0: Float32Array (Hz, 0 = unvoiced) · voiced: Uint8Array (0|1)
```

One frame per hop; `f0[i]` is only meaningful where `voiced[i] === 1` (unvoiced frames are left at 0, not NaN).

Options: - `fs` — sample rate (default 44100, Hz) · `frameSize` — YIN analysis window, samples (default 2048) · `hop` — frame hop, samples (default 512) · `threshold` — passed through to `@audio/pitch-yin`'s YIN threshold (default from `@audio/pitch-yin`)

**Use when:** tracking a single predominant pitch line (vocal/lead) over time; for chords or polyphony use `@audio/mir-multif0`.

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
