# @audio/mir-key

> Key detection — Krumhansl–Schmuckler: Pearson correlation between a chroma vector and each of 24 rotated Krumhansl–Kessler (1982) major/minor key profiles. Highest correlation wins.

`npm install @audio/mir-key`

```js
import key, { KK_MAJOR, KK_MINOR } from '@audio/mir-key'

let r = key(chromaVec)
// { tonic: 0..11, mode: 'major'|'minor', label: 'C'|'Am'|…, confidence: -1..1, scores: [{label, score}, …] }
```

`scores` holds all 24 candidates sorted descending by correlation — `scores[0]` is the winner (`confidence` mirrors its score).

`input` accepts a single 12-D chroma vector, or an array of chroma frames (averaged across frames first) — pass a chromagram directly to key a whole passage instead of one instant.

Options: - `profile` — `{ major: number[12], minor: number[12] }` override for the reference key profiles (default Krumhansl–Kessler `KK_MAJOR`/`KK_MINOR`, also exported directly)

**Use when:** a single global-key estimate is enough; for time-varying tonality, run `key()` over a sliding window of chroma frames.

Part of [@audio/mir](https://github.com/audiojs/mir).
