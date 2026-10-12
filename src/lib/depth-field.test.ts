import { describe, expect, it } from "vitest";

import {
  bucketColors,
  clampDpr,
  depthBucket,
  FIELD,
  fieldView,
  gridSize,
  hexToRgb,
  makeGrid,
  pointSize,
  project,
  type Projected,
  shouldRun,
  sweepDepth,
  wrapDepth,
} from "./depth-field";

describe("depth field grid", () => {
  it("uses 64×28 points from 768px and 36×20 below", () => {
    const desktop = gridSize(1440);
    const phone = gridSize(390);
    expect(desktop.cols * desktop.rows).toBe(1792);
    expect(phone.cols * phone.rows).toBe(720);
    expect(gridSize(768)).toEqual(desktop);
    expect(gridSize(767)).toEqual(phone);
    expect(makeGrid(desktop.cols, desktop.rows).length).toBe(1792 * 2);
    expect(makeGrid(phone.cols, phone.rows).length).toBe(720 * 2);
  });

  it("spreads u over [-1, 1] and z over [zNear, zFar)", () => {
    const g = makeGrid(4, 3);
    const us = [...g].filter((_, i) => i % 2 === 0);
    const zs = [...g].filter((_, i) => i % 2 === 1);
    expect(Math.min(...us)).toBe(-1);
    expect(Math.max(...us)).toBe(1);
    expect(Math.min(...zs)).toBeCloseTo(FIELD.zNear);
    expect(Math.max(...zs)).toBeLessThan(FIELD.zFar);
  });

  it("drifts toward the camera and wraps at the near plane", () => {
    expect(wrapDepth(3, 0)).toBeCloseTo(3);
    expect(wrapDepth(3, 10)).toBeCloseTo(3 - FIELD.speed * 10);
    const range = FIELD.zFar - FIELD.zNear;
    expect(wrapDepth(FIELD.zNear, 1)).toBeCloseTo(FIELD.zFar - FIELD.speed);
    for (const t of [0, 5, 123.4, 9999]) {
      const z = wrapDepth(FIELD.zNear + range / 2, t);
      expect(z).toBeGreaterThanOrEqual(FIELD.zNear);
      expect(z).toBeLessThan(FIELD.zFar);
    }
  });
});

describe("projection", () => {
  const out: Projected = { sx: 0, sy: 0, depth: 0 };

  it("keeps the centre column inside the canvas for every depth in range", () => {
    for (const [w, h] of [
      [1440, 808],
      [1024, 608],
      [390, 1400],
    ] as const) {
      const view = fieldView(w, h);
      for (let z = FIELD.zNear; z < FIELD.zFar; z += 0.25) {
        expect(project(0, 0, z, 0, view, out), `${w}x${h} z=${z}`).toBe(true);
        expect(out.sx).toBeGreaterThanOrEqual(0);
        expect(out.sx).toBeLessThanOrEqual(w);
        expect(out.sy).toBeGreaterThanOrEqual(FIELD.horizon * h);
        expect(out.sy).toBeLessThanOrEqual(h);
      }
    }
  });

  it("puts nearer points lower on screen and reports a normalised depth", () => {
    const view = fieldView(1440, 808);
    project(0, 0, 2, 0, view, out);
    const near = { ...out };
    project(0, 0, 6, 0, view, out);
    expect(near.sy).toBeGreaterThan(out.sy);
    expect(near.depth).toBeLessThan(out.depth);
    expect(out.depth).toBeLessThanOrEqual(1);
  });

  it("rejects points far outside the canvas", () => {
    const view = fieldView(1440, 808);
    expect(project(view.halfX * 50, 0, FIELD.zNear, 0, view, out)).toBe(false);
  });
});

describe("depth buckets and colours", () => {
  it("maps [0, 1] onto four buckets", () => {
    expect(depthBucket(0)).toBe(0);
    expect(depthBucket(0.24)).toBe(0);
    expect(depthBucket(0.25)).toBe(1);
    expect(depthBucket(0.5)).toBe(2);
    expect(depthBucket(0.99)).toBe(3);
    expect(depthBucket(1)).toBe(3);
    expect(depthBucket(-1)).toBe(0);
    expect(depthBucket(Number.NaN)).toBe(3);
  });

  it("builds four rgba colours, near ones tinted and more opaque", () => {
    expect(hexToRgb("#9a3412")).toEqual([0x9a, 0x34, 0x12]);
    expect(hexToRgb("nope")).toEqual([0, 0, 0]);
    const colors = bucketColors("#8b98a5", "#5eead4", 0.55);
    expect(colors).toHaveLength(4);
    expect(colors[0]).toMatch(/^rgba\(\d+,\d+,\d+,0\.550\)$/);
    expect(colors[3]).toBe("rgba(139,152,165,0.143)");
  });

  it("sizes dots ~35% above the original 1–2.2 px, keeping the near:far ratio", () => {
    expect(pointSize(0)).toBeCloseTo(2.97);
    expect(pointSize(1)).toBeCloseTo(1.35);
    expect(pointSize(0.5)).toBeCloseTo((2.97 + 1.35) / 2);
    expect(pointSize(0) / pointSize(1)).toBeCloseTo(2.2, 1);
    // Largest drawn dot (near, light-mode x1.3, DPR 1.5) stays inside the 4 px off-canvas margin.
    expect((pointSize(0) * 1.3 * FIELD.maxDpr) / 2).toBeLessThan(4);
  });
});

describe("loop control", () => {
  it("caps the device pixel ratio at 1.5", () => {
    expect(clampDpr(Number.NaN)).toBe(1);
    expect(clampDpr(0.5)).toBe(1);
    expect(clampDpr(1)).toBe(1);
    expect(clampDpr(1.25)).toBe(1.25);
    expect(clampDpr(3)).toBe(1.5);
    expect(clampDpr(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("runs only when in view, visible and with motion allowed", () => {
    for (const inView of [true, false]) {
      for (const hidden of [true, false]) {
        for (const reduced of [true, false]) {
          expect(shouldRun({ inView, hidden, reduced })).toBe(inView && !hidden && !reduced);
        }
      }
    }
  });

  it("sweeps far to near for 3.5 s every 9 s", () => {
    expect(sweepDepth(0)).toBeCloseTo(FIELD.zFar);
    expect(sweepDepth(1.75)).toBeCloseTo((FIELD.zFar + FIELD.zNear) / 2);
    expect(sweepDepth(4)).toBeNull();
    expect(sweepDepth(9)).toBeCloseTo(FIELD.zFar);
  });
});
