# @audio/mir

> Music information retrieval — chroma, chord, key, and MIREX-parity analysis atoms.

## Atoms

| Package | Status | What |
|---|---|---|
| `@audio/mir-chroma` | ✔ | 12-bin pitch-class profile — PCP and NNLS methods |
| `@audio/mir-chord` | ✔ | Chord detection — 24 binary templates + Viterbi smoothing |
| `@audio/mir-key` | ✔ | Key detection — Krumhansl-Schmuckler profiles |
| `@audio/mir-tempogram` | ✔ | Local tempo over time — autocorrelated onset envelope |
| `@audio/mir-tonnetz` | ✔ | Tonal centroid features — chroma projected onto fifths/thirds circles |
| `@audio/mir-structure` | ✔ | Structural segmentation — Foote novelty on MFCC self-similarity |
| `@audio/mir-downbeat` | ✔ | Downbeat estimation |
| `@audio/mir-melody` | ✔ | Continuous melody F0 contour — YIN per frame |
| `@audio/mir-multif0` | ✔ | Multiple simultaneous F0 — Klapuri iterative spectral subtraction |
| `@audio/mir-fingerprint` | ✔ | Audio fingerprinting — Shazam-class landmark hashing |
| `@audio/mir-similarity` | ✔ | Audio similarity metric |
| `@audio/mir-transcribe` | ✔ | Polyphonic transcription |
| `@audio/mir-drums` | ✔ | Drum transcription |
| `@audio/mir-coversong` | ✔ | Cover song identification |

ML-tier tasks (genre, mood, tags, stem separation) are deferred — they need hosted model weights, which conflicts with the no-ML-in-the-hot-path stance.

`chroma`/`chord`/`key` originated in [pitch](https://github.com/audiojs/pitch) and were extracted here.

## Usage

```js
import { chroma, chord, key } from '@audio/mir'

let c = chroma(samples, { fs: 44100 })         // Float32Array[12]
let ch = chord(c)                              // 'C', 'Am', …
let k = key(c)                                 // { key: 'C major', scores: [...] }
```
