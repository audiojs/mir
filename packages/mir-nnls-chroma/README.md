# @audio/mir-nnls-chroma

> NNLS Chroma (Mauch & Dixon, ISMIR 2010): treble and bass chromagram of a whole signal, with its tuning, as the reference Vamp plugin computes it.

`npm install @audio/mir-nnls-chroma`

```js
import chromagram from '@audio/mir-nnls-chroma'

let { times, tuning, treble, bass } = chromagram(samples, { fs: 44100 })
// streaming: let write = chromagram({ fs }); write(block) …; write() → the same
```

As the reference plugin ([c4dm/nnls-chroma](https://github.com/c4dm/nnls-chroma)) with its defaults: Hann frames of 16384 samples at 44.1 kHz (about 0.37 s at any rate) every blockSize/8, frame k centred on k·stepSize; the tuning is read from every frame's log-frequency spectrum, then each frame is tuned, whitened (running mean and deviation over half an octave) and transcribed (NNLS against notes of 20 partials at 0.7^(h−1)); treble and bass chroma come from the note activations through the plugin's two profiles. `tuning` is the concert A found (Hz); the chroma are unnormalised, C first.

Checked against the plugin itself on real recordings: every stage (log-frequency spectrum, tuned spectrum, note activations, both chromas) within 3.5·10⁻⁵ relative, the tuning within 0.01 Hz.

Options: - `blockSize`, `stepSize`: frame and hop (samples) · `tuning`: fix the concert A (Hz) instead of reading it · `whitening`: exponent of the running deviation (default 1) · `s`: partial decay of the note profiles (default 0.7)

The tuning needs every frame, so the log spectra are held until the end: 1 KB per frame, about 80 MB an hour at the defaults.

For chords from this chromagram: [@audio/mir-chordino](../mir-chordino). For a one-frame chroma under MIT: [@audio/mir-chroma](../mir-chroma).

License: GPL-2.0-or-later, as the plugin it translates ([LICENSE](./LICENSE)).

Part of [@audio/mir](https://github.com/audiojs/mir).
