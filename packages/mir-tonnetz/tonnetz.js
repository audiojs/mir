// Tonal centroid (Tonnetz) — project 12-bin chroma onto three interval circles:
// fifths (r=1), minor thirds (r=1), major thirds (r=0.5) → 6-dim harmonic space.
// Harte, Sandler & Gasser, "Detecting harmonic change in musical audio", 2006.

const CIRCLES = [
	[7 * Math.PI / 6, 1],   // fifths
	[3 * Math.PI / 2, 1],   // minor thirds
	[2 * Math.PI / 3, 0.5], // major thirds
]

export default function tonnetz (chroma) {
	let sum = 0
	for (let k = 0; k < 12; k++) sum += chroma[k]
	let out = new Float32Array(6)
	if (sum <= 0) return out
	for (let j = 0; j < 3; j++) {
		let [w, r] = CIRCLES[j]
		let s = 0, c = 0
		for (let k = 0; k < 12; k++) {
			let v = chroma[k] / sum
			s += r * Math.sin(w * k) * v
			c += r * Math.cos(w * k) * v
		}
		out[2 * j] = s
		out[2 * j + 1] = c
	}
	return out
}
