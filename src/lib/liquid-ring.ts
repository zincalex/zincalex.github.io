/**
 * Geometry for the "liquid" photo rings (src/themes/atlas/landing/split/photo-orbit.tsx):
 * a circle whose radius is nudged by a few slow, low-frequency sine waves, drawn as a
 * smooth closed path. Pure functions, deterministic for a given time.
 */

export interface RingWave {
  /** Number of bulges around the ring (low = soft, blob-like). */
  lobes: number;
  /** Peak radial offset as a fraction of the base radius (0.01 = 1%). */
  amp: number;
  /** Phase drift in radians per second (sign sets the direction the bulge travels). */
  speed: number;
  /** Starting phase in radians. */
  phase: number;
}

const TAU = Math.PI * 2;

/** Rounded to 2 decimals so the path strings stay short and stable. */
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Radius of the wobbling ring at angle `theta` (radians) and time `t` (seconds). */
export function ringRadius(r: number, theta: number, t: number, waves: readonly RingWave[]): number {
  let k = 1;
  for (const w of waves) k += w.amp * Math.sin(w.lobes * theta + w.phase + w.speed * t);
  return r * k;
}

/** Point on the wobbling ring; angle in degrees, 0° = 3 o'clock, clockwise (SVG y-down). */
export function ringPoint(
  cx: number,
  cy: number,
  r: number,
  deg: number,
  t: number,
  waves: readonly RingWave[],
): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  const rr = ringRadius(r, a, t, waves);
  return { x: round2(cx + rr * Math.cos(a)), y: round2(cy + rr * Math.sin(a)) };
}

/**
 * Closed SVG path through `points` samples of the ring, smoothed with uniform Catmull-Rom
 * splines (converted to cubic Béziers). Starts at 3 o'clock and runs clockwise, like an
 * SVG <circle>, so dash patterns line up the same way.
 */
export function liquidRingPath(
  cx: number,
  cy: number,
  r: number,
  t: number,
  waves: readonly RingWave[],
  points = 72,
): string {
  const n = Math.max(3, Math.floor(points));
  const xs = new Array<number>(n);
  const ys = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = ringRadius(r, a, t, waves);
    xs[i] = cx + rr * Math.cos(a);
    ys[i] = cy + rr * Math.sin(a);
  }
  const at = (i: number) => (i + n) % n;
  let d = `M${round2(xs[0]!)} ${round2(ys[0]!)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = i;
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = xs[p1]! + (xs[p2]! - xs[p0]!) / 6;
    const c1y = ys[p1]! + (ys[p2]! - ys[p0]!) / 6;
    const c2x = xs[p2]! - (xs[p3]! - xs[p1]!) / 6;
    const c2y = ys[p2]! - (ys[p3]! - ys[p1]!) / 6;
    d += `C${round2(c1x)} ${round2(c1y)} ${round2(c2x)} ${round2(c2y)} ${round2(xs[p2]!)} ${round2(ys[p2]!)}`;
  }
  return `${d}Z`;
}

/**
 * The same ring as a perfect circle, built from two arcs: no trigonometry, so the server
 * and the browser render the exact same string (the liquid path replaces it after mount).
 */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}Z`;
}
