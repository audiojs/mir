# @audio/mir-tonnetz

> Tonal centroid (Tonnetz) — projects a 12-bin chroma vector onto three interval circles (fifths, minor thirds, major thirds), giving a 6-D harmonic-change feature (Harte, Sandler & Gasser, 2006).

`npm install @audio/mir-tonnetz`

```js
import tonnetz from '@audio/mir-tonnetz'

let tz = tonnetz(chromaVec)
// Float32Array[6] — [fifths.sin, fifths.cos, minor3rds.sin, minor3rds.cos, major3rds.sin, major3rds.cos]
```

No options — `tonnetz()` takes a length-12 chroma vector (any normalization) and returns a fixed 6-D point. Consecutive Tonnetz points that jump far apart flag harmonic change (chord/key boundaries); a static point means harmonic stasis. Zero-energy chroma maps to the zero vector.

Also exported as an `audio.js` stat manifest (`./audio`) — Tonnetz frames over time (via `@audio/mir-chroma` internally) plus their mean.

Part of [@audio/mir](https://github.com/audiojs/mir).
