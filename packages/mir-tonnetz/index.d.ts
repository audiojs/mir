/**
 * Tonal centroid (Tonnetz) — projects a 12-bin chroma vector onto three
 * interval circles (fifths, minor thirds, major thirds; Harte 2006).
 * @returns Float32Array[6]: [fifths.sin, fifths.cos, minor3rds.sin, minor3rds.cos, major3rds.sin, major3rds.cos]
 */
export default function tonnetz(chroma: Float64Array | Float32Array | number[]): Float32Array
