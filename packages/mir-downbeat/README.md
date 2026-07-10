# @audio/mir-downbeat

> Downbeat estimation — scores each candidate bar phase by bass energy, onset strength and chroma flux summed over its beats; best phase wins.

`npm install @audio/mir-downbeat`

```js
import downbeat from '@audio/mir-downbeat'

let r = downbeat(data, { beats, fs: 44100 })   // beats: number[] (s) from a beat tracker, e.g. @audio/beat
// { downbeats: number[], phase: number, meter: number, confidence: 0..1 }
```

Options: - `beats` — beat times in seconds (required, throws `RangeError` if omitted) · `meter` — beats per bar (default 4) · `fs` — sample rate (default 44100, Hz)

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
