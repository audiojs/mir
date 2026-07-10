# @audio/mir-multif0

> Multiple-F0 estimation — Klapuri (2006) iterative spectral subtraction: whiten the magnitude spectrum, find the maximum-salience F0, subtract its harmonic pattern, repeat until salience collapses.

`npm install @audio/mir-multif0`

```js
import multif0 from '@audio/mir-multif0'

let frames = multif0(data, { fs: 44100 })
// Array<{ time, pitches: Array<{ freq, salience }> }>
```

Options: - `fs` — sample rate (default 44100, Hz) · `frameSize` — analysis window, samples (default 4096) · `hopSize` — frame hop, samples (default `frameSize / 2`) · `minFreq`/`maxFreq` — pitch search range (default 60/1200, Hz) · `maxPitches` — pitches per frame (default 6) · `harmonics` — partials scored per candidate (default 12) · `threshold` — fraction of the frame's top salience a pitch must reach (default 0.4)

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
