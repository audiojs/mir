# @audio/mir-similarity

> Audio similarity — timbral distance from frame-MFCC statistics (mean + variance, symmetrized) blended with harmonic distance from mean-chroma cosine. Classical single-Gaussian MFCC baseline (Logan/Aucouturier lineage).

`npm install @audio/mir-similarity`

```js
import similarity from '@audio/mir-similarity'

let r = similarity(takeA, takeB, { fs: 44100 })
// { score: 0..1, timbre: 0..1, harmony: 0..1 }
```

Options: - `fs` — sample rate (default 44100, Hz) · `weight` — timbre vs. harmony blend, 1 = timbre only (default 0.5)

Also exported as an `audio.js` stat manifest (`./audio` — pass the comparison take as `{ ref }`).

Part of [@audio/mir](https://github.com/audiojs/mir).
