# @audio/mir-transcribe

> Polyphonic transcription — `@audio/mir-multif0` frames tracked into note events by pitch continuity: consecutive frames within ±60 cents extend a note, gaps close it, short notes are dropped. Velocity from median frame salience.

`npm install @audio/mir-transcribe`

```js
import transcribe from '@audio/mir-transcribe'

let notes = transcribe(data, { fs: 44100 })
// Array<{ time, duration, midi, freq, velocity }>
```

Options: everything `@audio/mir-multif0` takes (`fs`, `frameSize`, `hopSize`, `minFreq`, `maxFreq`, `maxPitches`, `harmonics`, `threshold`), plus - `minDuration` — shortest kept note (default 0.08, seconds) · `maxGap` — frames a pitch may drop out before its note closes (default 1)

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
