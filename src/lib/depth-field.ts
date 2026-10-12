// Atlas landing depth field (dot background): pure math, no DOM. Safe in Vitest.
// A dotted terrain on the x–z ground plane, seen by a camera pitched down, that
// drifts toward the viewer like a slow depth-map / LiDAR scan.

const DEG = Math.PI / 180;

export const FIELD = {
  /** Nearest and farthest ground depth, in world units. */
  zNear: 1.2,
  zFar: 7,
  /** Camera height above the ground plane. */
  camY: 1,
  pitch: 22 * DEG,
  /** Horizon line, as a share of the canvas height. */
  horizon: 0.34,
  /** The nearest row lands at this share of the canvas height. */
  nearRow: 0.98,
  /** Drift toward the camera, in z units per second. */
  speed: 0.035,
  yawAmp: 5 * DEG,
  yawPeriod: 48,
  /** A scan sweep starts every `sweepEvery` s and crosses the field in `sweepDur` s. */
  sweepEvery: 9,
  sweepDur: 3.5,
  /** Half-width of the sweep band, in z units. */
  sweepBand: 0.18,
  sweepBoost: 0.3,
  /** Point size in CSS px, far to near (~35% above the original 1 / 2.2, same near:far ratio). */
  sizeFar: 1.35,
  sizeNear: 2.97,
  maxDpr: 1.5,
} as const;

export const DEPTH_BUCKETS = 4;

/** Grid density: 64×28 (1,792 points) from 768px wide, 36×20 (720) below. */
export function gridSize(cssWidth: number): { cols: number; rows: number } {
  return cssWidth >= 768 ? { cols: 64, rows: 28 } : { cols: 36, rows: 20 };
}

/**
 * Grid points as [u, z0] pairs: u in [-1, 1] across (scaled by the view's half-width),
 * z0 evenly spread over [zNear, zFar).
 */
export function makeGrid(cols: number, rows: number): Float32Array {
  const out = new Float32Array(cols * rows * 2);
  const range = FIELD.zFar - FIELD.zNear;
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const z = FIELD.zNear + (r / rows) * range;
    for (let c = 0; c < cols; c++) {
      out[k++] = cols === 1 ? 0 : (c / (cols - 1)) * 2 - 1;
      out[k++] = z;
    }
  }
  return out;
}

/** Depth after drifting toward the camera for t seconds, wrapped back to the far plane. */
export function wrapDepth(z0: number, t: number): number {
  const range = FIELD.zFar - FIELD.zNear;
  const d = (((z0 - FIELD.zNear - FIELD.speed * t) % range) + range) % range;
  return FIELD.zNear + d;
}

/** Terrain height at (x, z) and time t. */
export function terrainHeight(x: number, z: number, t: number): number {
  return (
    0.22 * Math.sin(1.6 * x + 0.35 * t) +
    0.14 * Math.sin(2.3 * z - 0.27 * t) +
    0.08 * Math.sin(3.1 * (x + z) + 0.5 * t)
  );
}

export function yawAt(t: number): number {
  return FIELD.yawAmp * Math.sin((2 * Math.PI * t) / FIELD.yawPeriod);
}

/** Depth of the scan band at time t, or null between sweeps. */
export function sweepDepth(t: number): number | null {
  const phase = ((t % FIELD.sweepEvery) + FIELD.sweepEvery) % FIELD.sweepEvery;
  if (phase >= FIELD.sweepDur) return null;
  return FIELD.zFar - (phase / FIELD.sweepDur) * (FIELD.zFar - FIELD.zNear);
}

export interface FieldView {
  w: number;
  h: number;
  /** Focal length in px. */
  f: number;
  /** Screen y of the optical axis. */
  cy: number;
  /** World half-width that u = ±1 maps to. */
  halfX: number;
}

/** Camera-space y/z ratio of a ground point straight ahead at depth z. */
function groundRatio(z: number): number {
  const { camY, pitch } = FIELD;
  const yc = -camY * Math.cos(pitch) + z * Math.sin(pitch);
  const zc = camY * Math.sin(pitch) + z * Math.cos(pitch);
  return yc / zc;
}

/** Projection constants for a w×h canvas (any unit, usually device px). */
export function fieldView(w: number, h: number): FieldView {
  const tanP = Math.tan(FIELD.pitch);
  const f = ((FIELD.nearRow - FIELD.horizon) * h) / (tanP - groundRatio(FIELD.zNear));
  const cy = FIELD.horizon * h + f * tanP;
  // Rows fill the width at 60 % of the depth range; nearer rows run past the edges.
  const zMid = FIELD.zNear + 0.6 * (FIELD.zFar - FIELD.zNear);
  const zcMid = FIELD.camY * Math.sin(FIELD.pitch) + zMid * Math.cos(FIELD.pitch);
  const halfX = f > 0 ? ((w / 2) * zcMid * 1.08) / f : 1;
  return { w, h, f, cy, halfX };
}

export interface Projected {
  sx: number;
  sy: number;
  /** 0 at the near plane, 1 at the far plane. */
  depth: number;
}

/**
 * Projects a world point (x, y, z) to screen space. Writes into `out` and returns true
 * when it lands in front of the camera and inside the canvas (with a small margin).
 */
export function project(x: number, y: number, z: number, yaw: number, view: FieldView, out: Projected): boolean {
  const { camY, pitch } = FIELD;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const xr = x * cosY - z * sinY;
  const zr = x * sinY + z * cosY;
  const dy = y - camY;
  const yc = dy * Math.cos(pitch) + zr * Math.sin(pitch);
  const zc = -dy * Math.sin(pitch) + zr * Math.cos(pitch);
  if (zc <= 0.05) return false;
  out.sx = view.w / 2 + (view.f * xr) / zc;
  out.sy = view.cy - (view.f * yc) / zc;
  out.depth = Math.min(1, Math.max(0, (z - FIELD.zNear) / (FIELD.zFar - FIELD.zNear)));
  const m = 4;
  return out.sx >= -m && out.sx <= view.w + m && out.sy >= -m && out.sy <= view.h + m;
}

/** 0 (near) … 3 (far): one fillStyle per bucket per frame. */
export function depthBucket(depth: number): number {
  if (!Number.isFinite(depth)) return DEPTH_BUCKETS - 1;
  return Math.min(DEPTH_BUCKETS - 1, Math.max(0, Math.floor(depth * DEPTH_BUCKETS)));
}

/** Point size in CSS px for a depth in [0, 1]. */
export function pointSize(depth: number): number {
  return FIELD.sizeNear + (FIELD.sizeFar - FIELD.sizeNear) * depth;
}

/** devicePixelRatio, with NaN / < 1 treated as 1 and capped at 1.5. */
export function clampDpr(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(FIELD.maxDpr, value);
}

/** The animation loop runs only while the hero is on screen, the tab is visible and motion is allowed. */
export function shouldRun({ inView, hidden, reduced }: { inView: boolean; hidden: boolean; reduced: boolean }): boolean {
  return inView && !hidden && !reduced;
}

/** "#5eead4" -> [94, 234, 212]. Invalid input gives black. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The four bucket colours, near to far: near points mix toward `near`, far ones fade
 * toward 0 alpha (fog). `maxAlpha` is .55 in dark and .5 in light.
 */
export function bucketColors(dot: string, near: string, maxAlpha: number): string[] {
  const a = hexToRgb(dot);
  const b = hexToRgb(near);
  const mix = [0.45, 0.2, 0, 0];
  const alpha = [1, 0.78, 0.52, 0.26];
  return mix.map((m, i) => {
    const c = a.map((v, j) => Math.round(v + (b[j]! - v) * m));
    return `rgba(${c[0]},${c[1]},${c[2]},${(maxAlpha * alpha[i]!).toFixed(3)})`;
  });
}
