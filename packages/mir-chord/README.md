# @audio/mir-chord

> Chord detection — classify a chroma vector as one of 24 major/minor triads via cosine similarity with binary templates (Fujishima, 1999), with an optional Viterbi smoother for chord sequences.

`npm install @audio/mir-chord`

```js
import chord, { smooth as smoothChords, TEMPLATES } from '@audio/mir-chord'

let r = chord(chromaVec)
// { root: 0..11 | -1, quality: 'maj'|'min'|'N', label: 'C'|'Am'|…|'N', confidence: -1..1 }
```

Each of the 24 templates is a length-12 binary vector (root, +4, +7 for major; root, +3, +7 for minor). `chord()` picks the highest-cosine template; below `minConfidence` it reports no-chord (`'N'`).

Options: - `minConfidence` — cosine similarity floor below which the result is `'N'` (default 0.3)

```js
let seq = smoothChords(frames, { selfProb: 0.5 })
// [{ root, quality, label }, …] — one per input frame
```

`smoothChords(frames, params)` runs Viterbi over a 24-state chord grid with a sticky self-transition prior — a lightweight stand-in for Mauch-style context models, effective at stabilizing short, noisy chroma sequences into held chords.

Options: - `selfProb` — probability mass on staying in the same chord frame-to-frame; higher = stickier (default 0.5)

`TEMPLATES` is exported as the raw array of `{ root, quality, label, vec }` used for matching.

Part of [@audio/mir](https://github.com/audiojs/mir).
