// Profile photo framing: pure math and validation. Shared by ProfilePhoto, the dev-only
// photo admin (src/app/(atlas)/admin) and its save server (scripts/admin-server.mjs, which
// imports this file directly through Node's type stripping: keep it free of runtime imports
// and of non-erasable TypeScript syntax such as enums).
import type { PhotoFraming } from "@/content/types";

export type ResolvedPhotoFraming = Required<PhotoFraming>;

/** Accepted ranges; the save server clamps every value into them. */
export const PHOTO_FRAMING_LIMITS = {
  size: { min: 120, max: 480 },
  zoom: { min: 1, max: 4 },
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 },
} as const;

/** Used for any value missing from the framing. */
export const DEFAULT_PHOTO_FRAMING: ResolvedPhotoFraming = { size: 260, zoom: 1, x: 50, y: 50 };

/** Local save server of the photo admin (`npm run admin`), bound to 127.0.0.1 only. */
export const PHOTO_ADMIN_PORT = 4321;

const KEYS = ["size", "zoom", "x", "y"] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Rounds to `digits` decimals (size is whole pixels, zoom 2 decimals, x/y 1 decimal). */
function round(value: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

const DIGITS: Record<(typeof KEYS)[number], number> = { size: 0, zoom: 2, x: 1, y: 1 };

export type SanitizeResult = { ok: true; value: ResolvedPhotoFraming } | { ok: false; error: string };

/**
 * Validates untrusted input (the admin's POST body): an object whose size, zoom, x and y are
 * all finite numbers. Values are clamped to PHOTO_FRAMING_LIMITS and rounded; extra keys are
 * dropped, so only these four values are ever written.
 */
export function sanitizePhotoFraming(input: unknown): SanitizeResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Expected an object with size, zoom, x and y." };
  }
  const record = input as Record<string, unknown>;
  const value = { ...DEFAULT_PHOTO_FRAMING };
  for (const key of KEYS) {
    const raw = record[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return { ok: false, error: `"${key}" must be a finite number.` };
    }
    const { min, max } = PHOTO_FRAMING_LIMITS[key];
    value[key] = round(clamp(raw, min, max), DIGITS[key]);
  }
  return { ok: true, value };
}

/** Fills in defaults and keeps zoom ≥ 1 (a smaller photo would not cover the frame). */
export function resolvePhotoFraming(framing: PhotoFraming = {}): ResolvedPhotoFraming {
  return {
    size: framing.size ?? DEFAULT_PHOTO_FRAMING.size,
    zoom: Math.max(1, framing.zoom ?? DEFAULT_PHOTO_FRAMING.zoom),
    x: framing.x ?? DEFAULT_PHOTO_FRAMING.x,
    y: framing.y ?? DEFAULT_PHOTO_FRAMING.y,
  };
}

/**
 * Width / height of the photo file (site.person.photo.width/height). Missing or invalid
 * dimensions count as a square photo.
 */
export function photoAspect(photo: { width?: number; height?: number } = {}): number {
  const { width, height } = photo;
  if (!width || !height || !(width > 0) || !(height > 0)) return 1;
  return width / height;
}

/**
 * Size of the photo at zoom `zoom`, in % of the (square) frame: the smallest box with the
 * photo's own aspect ratio that covers the frame, times the zoom. A portrait photo is 100%
 * wide and taller than the frame at 1×; a landscape one is 100% tall and wider.
 */
function coverSize(zoom: number, aspect: number) {
  const z = Math.max(1, zoom);
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  return { width: z * 100 * Math.max(1, a), height: z * 100 * Math.max(1, 1 / a) };
}

type Range = { min: number; max: number };

/** Focal points (in % of the photo) that can reach the frame centre when the photo is `sizePct` % of the frame. */
function axisRange(sizePct: number): Range {
  return { min: 5000 / sizePct, max: 100 - 5000 / sizePct };
}

/**
 * Range of focal points (in %, per axis) that can actually reach the frame centre at this
 * zoom for a photo of this aspect ratio (width / height): beyond it the photo edge would show,
 * so photoLayout() stops moving the image. An axis where the photo just fits the frame
 * collapses to 50.
 */
export function focusRange(zoom: number, aspect = 1): { x: Range; y: Range } {
  const { width, height } = coverSize(zoom, aspect);
  return { x: axisRange(width), y: axisRange(height) };
}

/** Clamps x/y into focusRange(zoom, aspect), i.e. the values that match what is on screen. */
export function visibleFraming(framing: ResolvedPhotoFraming, aspect = 1): ResolvedPhotoFraming {
  const range = focusRange(framing.zoom, aspect);
  return {
    ...framing,
    x: round(clamp(framing.x, range.x.min, range.x.max), 1),
    y: round(clamp(framing.y, range.y.min, range.y.max), 1),
  };
}

/**
 * Position and size of the <img> inside the frame (all in % of the frame): the photo is sized
 * to its own aspect ratio so it covers the frame, zoomed around the focal point (x, y) and
 * moved so that point sits at the frame centre, clamped so the photo always covers the frame.
 */
export function photoLayout(framing: PhotoFraming = {}, aspect = 1) {
  const { zoom, x, y } = resolvePhotoFraming(framing);
  const { width, height } = coverSize(zoom, aspect);
  const offset = (p: number, sizePct: number) => Math.min(0, Math.max(100 - sizePct, 50 - (p * sizePct) / 100));
  return {
    width,
    height,
    left: offset(x, width),
    top: offset(y, height),
    objectPosition: `${x}% ${y}%`,
  };
}

/**
 * New focal point after dragging the photo by (dx, dy) screen pixels in a frame `framePx`
 * wide: the photo follows the pointer 1:1, so the focal point moves the other way. The result
 * is clamped to the visible range.
 */
export function panFraming(
  framing: ResolvedPhotoFraming,
  dx: number,
  dy: number,
  framePx: number,
  aspect = 1,
): ResolvedPhotoFraming {
  if (framePx <= 0) return visibleFraming(framing, aspect);
  const start = visibleFraming(framing, aspect);
  // Photo size in screen px per axis; 1 px of drag moves the focal point 100 / size %.
  const { width, height } = coverSize(start.zoom, aspect);
  const xScale = 100 / ((framePx * width) / 100);
  const yScale = 100 / ((framePx * height) / 100);
  return visibleFraming({ ...start, x: start.x - dx * xScale, y: start.y - dy * yScale }, aspect);
}
