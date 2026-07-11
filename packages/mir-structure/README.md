# @audio/mir-structure

> Structural segmentation — Foote novelty (Foote 2000): MFCC timbre frames → cosine self-similarity → checkerboard-kernel correlation along the diagonal → novelty peaks mark section boundaries (verse/chorus/texture changes).

`npm install @audio/mir-structure`

```js
import structure from '@audio/mir-structure'

let { boundaries, novelty, times } = structure(data, { fs: 44100 })
// boundaries: number[] (s, detected section edges)
// novelty: Float32Array (one value per frame, checkerboard-kernel score; 0 in the un-scoreable edge margins)
// times: Float32Array (s, frame centers, same length as novelty)
```

`boundaries` are peak-picked from `novelty`: local maxima above `mean + sensitivity·std`, at least `kernel` frames apart.

Options: - `fs` — sample rate (default 44100, Hz) · `frameSize`/`hop` — MFCC analysis window/hop (default 2048/1024) · `kernel` — checkerboard quadrant size, frames (default 16 — wider kernel = broader-scale boundaries) · `sensitivity` — novelty threshold in std-devs above the mean (default 1, higher → fewer boundaries)

Also exported as an `audio.js` stat manifest (`./audio`).

Part of [@audio/mir](https://github.com/audiojs/mir).
