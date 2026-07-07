# @audio/mir

> Music information retrieval — chroma, chord and key detection atoms, with a MIREX-parity roadmap.

## Atoms

| Package | Status | What |
|---|---|---|
| `@audio/mir-chroma` | ✔ | 12-bin pitch-class profile — PCP and NNLS methods |
| `@audio/mir-chord` | ✔ | Chord detection — 24 binary templates + Viterbi smoothing |
| `@audio/mir-key` | ✔ | Key detection — Krumhansl-Schmuckler profiles |
| `@audio/mir-tempogram` | planned | local tempo over time |
| `@audio/mir-tonnetz` | planned | tonal centroid features |
| `@audio/mir-structure` | planned | structural segmentation |
| `@audio/mir-downbeat` | planned | downbeat estimation |
| `@audio/mir-melody` | planned | continuous melody F0 contour |
| `@audio/mir-multif0` | planned | multiple simultaneous F0 |
| `@audio/mir-fingerprint` | planned | audio fingerprinting |
| `@audio/mir-similarity` | planned | audio similarity metric |
| `@audio/mir-transcribe` | planned | polyphonic transcription |
| `@audio/mir-drums` | planned | drum transcription |
| `@audio/mir-coversong` | planned | cover song identification |

ML-tier tasks (genre, mood, tags, stem separation) are deferred — they need hosted model weights, which conflicts with the no-ML-in-the-hot-path stance.

`chroma`/`chord`/`key` originated in [pitch-detection](https://github.com/audiojs/pitch-detection) and were extracted here.

## Usage

```js
import { chroma, chord, key } from '@audio/mir'

let c = chroma(samples, { fs: 44100 })         // Float32Array[12]
let ch = chord(c)                              // 'C', 'Am', …
let k = key(c)                                 // { key: 'C major', scores: [...] }
```
