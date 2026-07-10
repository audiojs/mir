# @audio/mir-coversong

> Cover song identification — frame-chroma sequences compared after Optimal Transposition Index alignment (Ellis 2007 lineage); recognizes a composition through key changes, re-orchestration and level differences.

`npm install @audio/mir-coversong`

```js
import coversong from '@audio/mir-coversong'

let r = coversong(takeA, takeB, { fs: 44100 })
// { score: 0..1 (mean cosine at best alignment), transposition: semitones b→a, lag: frames }
```

Options: - `fs` — sample rate (default 44100, Hz) · `maxLag` — search window as a fraction of the shorter sequence (default 0.5)

Also exported as an `audio.js` stat manifest (`./audio` — pass the comparison take as `{ ref }`).

Part of [@audio/mir](https://github.com/audiojs/mir).
