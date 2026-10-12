import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import photoFraming from "@/content/photo-framing.json";
import { site } from "@/content/site";

import {
  DEFAULT_PHOTO_FRAMING,
  focusRange,
  panFraming,
  photoAspect,
  photoLayout,
  resolvePhotoFraming,
  sanitizePhotoFraming,
  visibleFraming,
} from "./photo-framing";

describe("sanitizePhotoFraming", () => {
  it("accepts valid values unchanged and drops extra keys", () => {
    const result = sanitizePhotoFraming({ size: 260, zoom: 1.15, x: 60, y: 45, path: "/etc/passwd" });
    expect(result).toEqual({ ok: true, value: { size: 260, zoom: 1.15, x: 60, y: 45 } });
  });

  it("clamps to the allowed ranges", () => {
    expect(sanitizePhotoFraming({ size: 10, zoom: 0.2, x: -5, y: 300 })).toEqual({
      ok: true,
      value: { size: 120, zoom: 1, x: 0, y: 100 },
    });
    expect(sanitizePhotoFraming({ size: 9999, zoom: 12, x: 100.01, y: -0.01 })).toEqual({
      ok: true,
      value: { size: 480, zoom: 4, x: 100, y: 0 },
    });
  });

  it("rounds size to px, zoom to 2 and x/y to 1 decimal", () => {
    expect(sanitizePhotoFraming({ size: 260.6, zoom: 1.23456, x: 33.333, y: 66.666 })).toEqual({
      ok: true,
      value: { size: 261, zoom: 1.23, x: 33.3, y: 66.7 },
    });
  });

  it("rejects non-objects, missing keys and non-numbers", () => {
    for (const input of [null, undefined, 5, "x", [], [260, 1, 50, 50]]) {
      expect(sanitizePhotoFraming(input).ok, JSON.stringify(input)).toBe(false);
    }
    expect(sanitizePhotoFraming({ zoom: 1, x: 50, y: 50 }).ok).toBe(false);
    expect(sanitizePhotoFraming({ size: "260", zoom: 1, x: 50, y: 50 }).ok).toBe(false);
    expect(sanitizePhotoFraming({ size: 260, zoom: NaN, x: 50, y: 50 }).ok).toBe(false);
    expect(sanitizePhotoFraming({ size: 260, zoom: 1, x: Infinity, y: 50 }).ok).toBe(false);
    expect(sanitizePhotoFraming({ size: 260, zoom: 1, x: 50, y: null }).ok).toBe(false);
  });

  it("the saved photo-framing.json is already valid and is what site.ts uses", () => {
    expect(sanitizePhotoFraming(photoFraming)).toEqual({ ok: true, value: photoFraming });
    expect(site.person.photo.framing).toEqual(photoFraming);
  });
});

describe("photo layout math", () => {
  it("fills defaults and never zooms below 1", () => {
    expect(resolvePhotoFraming()).toEqual(DEFAULT_PHOTO_FRAMING);
    expect(resolvePhotoFraming({ zoom: 0.5 }).zoom).toBe(1);
  });

  it("zoom 1 shows the whole photo whatever the focal point", () => {
    expect(photoLayout({ zoom: 1, x: 10, y: 90 })).toMatchObject({ width: 100, height: 100, left: 0, top: 0 });
  });

  it("puts the focal point at the frame centre when it can", () => {
    const { width, left, top, objectPosition } = photoLayout({ zoom: 2, x: 40, y: 60 });
    expect(width).toBe(200);
    // Focal point in frame %: left + x * zoom = 50.
    expect(left + 40 * 2).toBeCloseTo(50);
    expect(top + 60 * 2).toBeCloseTo(50);
    expect(objectPosition).toBe("40% 60%");
  });

  it("clamps so the photo always covers the frame", () => {
    const { left, top, width } = photoLayout({ zoom: 2, x: 0, y: 100 });
    expect(left).toBe(0);
    expect(top).toBe(-100);
    expect(top + width).toBe(100);
  });

  it("focusRange narrows with zoom and collapses to the centre at 1×", () => {
    expect(focusRange(1)).toEqual({ x: { min: 50, max: 50 }, y: { min: 50, max: 50 } });
    expect(focusRange(2)).toEqual({ x: { min: 25, max: 75 }, y: { min: 25, max: 75 } });
    expect(focusRange(0.5)).toEqual({ x: { min: 50, max: 50 }, y: { min: 50, max: 50 } });
  });

  it("visibleFraming clamps x/y to what is on screen", () => {
    expect(visibleFraming({ size: 260, zoom: 1.15, x: 60, y: 45 })).toEqual({ size: 260, zoom: 1.15, x: 56.5, y: 45 });
    expect(visibleFraming({ size: 260, zoom: 2, x: 10, y: 90 })).toEqual({ size: 260, zoom: 2, x: 25, y: 75 });
  });

  it("dragging moves the photo with the pointer (focal point the other way)", () => {
    const start = { size: 260, zoom: 2, x: 50, y: 50 };
    // 100 px right in a 200 px frame at 2× = 25% of the photo.
    expect(panFraming(start, 100, 0, 200)).toEqual({ ...start, x: 25 });
    expect(panFraming(start, 0, -40, 200)).toEqual({ ...start, y: 60 });
    // Clamped at the photo edge.
    expect(panFraming(start, 1000, -1000, 200)).toEqual({ ...start, x: 25, y: 75 });
    // Nothing to move at 1×, and a zero-size frame is ignored.
    expect(panFraming({ ...start, zoom: 1 }, 100, 100, 200)).toMatchObject({ x: 50, y: 50 });
    expect(panFraming(start, 100, 100, 0)).toEqual(start);
  });
});

describe("non-square photos", () => {
  const PORTRAIT = 3 / 4; // 768×1024
  const LANDSCAPE = 4 / 3;

  it("photoAspect reads width / height and treats missing sizes as square", () => {
    expect(photoAspect({ width: 768, height: 1024 })).toBe(0.75);
    expect(photoAspect({})).toBe(1);
    expect(photoAspect({ width: 0, height: 100 })).toBe(1);
    expect(photoAspect()).toBe(1);
  });

  it("sizes the photo to its own aspect ratio so it just covers the frame at 1×", () => {
    // Centred: 12.5% of the photo (16.67% of the frame) overflows on each long side.
    const portrait = photoLayout({ zoom: 1, x: 50, y: 50 }, PORTRAIT);
    expect(portrait).toMatchObject({ width: 100, left: 0 });
    expect(portrait.height).toBeCloseTo(133.33, 2);
    expect(portrait.top).toBeCloseTo(-16.67, 2);
    const landscape = photoLayout({ zoom: 1, x: 50, y: 50 }, LANDSCAPE);
    expect(landscape).toMatchObject({ height: 100, top: 0 });
    expect(landscape.width).toBeCloseTo(133.33, 2);
    expect(landscape.left).toBeCloseTo(-16.67, 2);
  });

  it("a portrait photo can move vertically at 1× and reaches its top and bottom edges", () => {
    const range = focusRange(1, PORTRAIT);
    expect(range.x).toEqual({ min: 50, max: 50 });
    expect(range.y.min).toBeCloseTo(37.5);
    expect(range.y.max).toBeCloseTo(62.5);
    // y = 0 shows the top edge of the photo at the top of the frame.
    expect(photoLayout({ zoom: 1, x: 50, y: 0 }, PORTRAIT).top).toBe(0);
    const bottom = photoLayout({ zoom: 1, x: 50, y: 100 }, PORTRAIT);
    expect(bottom.top + bottom.height).toBeCloseTo(100);
  });

  it("puts the focal point at the frame centre on both axes", () => {
    for (const aspect of [PORTRAIT, LANDSCAPE]) {
      const { width, height, left, top } = photoLayout({ zoom: 1.8, x: 55, y: 30 }, aspect);
      expect(left + (55 * width) / 100, String(aspect)).toBeCloseTo(50);
      expect(top + (30 * height) / 100, String(aspect)).toBeCloseTo(50);
    }
  });

  it("focusRange is per axis and covers the whole visible band", () => {
    const portrait = focusRange(1.8, PORTRAIT);
    expect(portrait.x.min).toBeCloseTo(50 / 1.8);
    expect(portrait.y.min).toBeCloseTo(50 / 2.4);
    expect(portrait.y.max).toBeCloseTo(100 - 50 / 2.4);
    const landscape = focusRange(1, LANDSCAPE);
    expect(landscape.y).toEqual({ min: 50, max: 50 });
    expect(landscape.x.min).toBeCloseTo(37.5);
    // At the edge of the range the photo edge touches the frame edge.
    const edge = photoLayout({ zoom: 1.8, x: 50, y: portrait.y.min }, PORTRAIT);
    expect(edge.top).toBeCloseTo(0);
  });

  it("visibleFraming clamps each axis to its own range", () => {
    expect(visibleFraming({ size: 260, zoom: 1, x: 10, y: 10 }, PORTRAIT)).toEqual({ size: 260, zoom: 1, x: 50, y: 37.5 });
    expect(visibleFraming({ size: 260, zoom: 1, x: 10, y: 10 }, LANDSCAPE)).toEqual({ size: 260, zoom: 1, x: 37.5, y: 50 });
  });

  it("dragging moves the photo 1:1 with the pointer on both axes", () => {
    const start = { size: 260, zoom: 2, x: 50, y: 50 };
    // Portrait at 2× in a 300 px frame: 600 px wide, 800 px tall.
    const moved = panFraming(start, 60, -80, 300, PORTRAIT);
    expect(moved.x).toBe(40); // 60 / 600 = 10%
    expect(moved.y).toBe(60); // 80 / 800 = 10%
    // Same pointer motion, same on-screen photo motion: the focal point moves dx / photo px.
    const { width, height } = photoLayout(start, PORTRAIT);
    expect(((50 - moved.x) / 100) * ((300 * width) / 100)).toBeCloseTo(60);
    expect(((moved.y - 50) / 100) * ((300 * height) / 100)).toBeCloseTo(80);
    // Portrait at 1×: horizontal is locked, vertical still moves.
    expect(panFraming({ ...start, zoom: 1 }, 100, 20, 300, PORTRAIT)).toMatchObject({ x: 50, y: 45 });
  });
});

/** Pixel size from a JPEG's SOF segment (enough to check site.ts against the real file). */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1]!;
    const length = buf.readUInt16BE(i + 2);
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

describe("site.person.photo size", () => {
  const file = path.join(process.cwd(), "public", site.person.photo.src);
  it.runIf(existsSync(file) && /\.jpe?g$/i.test(file))("matches the real profile photo", () => {
    const { width, height } = site.person.photo;
    expect(jpegSize(readFileSync(file))).toEqual({ width, height });
  });
});
