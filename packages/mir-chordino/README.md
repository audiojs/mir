# @audio/mir-chordino

> Chordino (Mauch 2010): chord sequence from NNLS chroma, as the reference Vamp plugin.

`npm install @audio/mir-chordino @audio/mir-nnls-chroma`

```js
import chromagram from '@audio/mir-nnls-chroma'
import chordino from '@audio/mir-chordino'

let chords = chordino(chromagram(samples, { fs }), { end: samples.length / fs })
// [{ time, duration, root, quality, bass, label, confidence }, …]: 'N', 'C', 'Am', 'G7', 'C/E', …
```

As the reference plugin ([c4dm/nnls-chroma](https://github.com/c4dm/nnls-chroma)) with its built-in dictionary: each frame's 24-D bass and treble chroma scores 217 chords: 18 types on 12 roots (maj, min, 7, maj7, min7, maj6, min6, dim, aug, hdim7; maj over its 3rd, 5th, 2nd or ♭7th, 7 over its 3rd, hdim7 over its ♭7th) and no-chord; a Viterbi path, 0.99 to stay, starting on no-chord, gives the sequence. `quality` is Harte's shorthand, `bass` the pitch class in the bass. On the plugin's own regression recording (Zweieck, "Duell", 237 s) its labels and change times equal the plugin's.

Options: - `boostN`: lifts the no-chord profile (default 0.1) · `end`: where the last chord ends (s)

Ref: M. Mauch, "Automatic chord transcription from audio using computational models of musical context", PhD thesis, Queen Mary University of London, 2010.

License: GPL-2.0-or-later, as the plugin it translates ([LICENSE](./LICENSE)).

Part of [@audio/mir](https://github.com/audiojs/mir).
