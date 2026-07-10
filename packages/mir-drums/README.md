# @audio/mir-drums

> Drum transcription — spectral-flux onsets classified by post-onset band energy: kick = sub dominance (40-130 Hz), hihat/cymbal = HF dominance (>5 kHz), snare = the broadband mid case.

`npm install @audio/mir-drums`

```js
import drums from '@audio/mir-drums'

let events = drums(data, { fs: 44100 })
// Array<{ time, type: 'kick'|'snare'|'hihat', strength: 0..1, bands: { low, mid, high } }>
```

Options: - `fs` — sample rate (default 44100, Hz) · `delta` — onset-picker threshold, passed through to `@audio/onset`'s `peakPick` (default from `@audio/onset`)

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
