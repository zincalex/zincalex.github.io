import { describe, expect, it } from "vitest";

import { circlePath, liquidRingPath, ringPoint, ringRadius, type RingWave } from "./liquid-ring";

const WAVES: RingWave[] = [
  { lobes: 2, amp: 0.012, speed: 0.4, phase: 0 },
  { lobes: 3, amp: 0.008, speed: -0.3, phase: 1 },
];

/** "M1 2C3 4 ..." -> [[1, 2], [3, 4], ...] */
function coords(d: string): [number, number][] {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i]!, nums[i + 1]!]);
  return out;
}

describe("liquid ring geometry", () => {
  it("is deterministic for a given time and changes over time", () => {
    const a = liquidRingPath(200, 200, 176, 3.2, WAVES);
    expect(liquidRingPath(200, 200, 176, 3.2, WAVES)).toBe(a);
    expect(liquidRingPath(200, 200, 176, 4.2, WAVES)).not.toBe(a);
  });

  it("closes, starts at 3 o'clock and has one cubic segment per sample", () => {
    const d = liquidRingPath(200, 200, 100, 0, [], 64);
    expect(d.startsWith("M300 200")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(64);
    // The last segment ends back on the start point.
    const pts = coords(d);
    expect(pts.at(-1)).toEqual([300, 200]);
  });

  it("keeps every number to at most 2 decimals", () => {
    const d = liquidRingPath(200, 200, 196, 12.345, WAVES, 80);
    for (const n of d.match(/-?\d+(\.\d+)?/g)!) expect(n).toMatch(/^-?\d+(\.\d{1,2})?$/);
  });

  it("stays within the summed wave amplitude of the base radius", () => {
    const r = 184;
    const maxAmp = WAVES.reduce((s, w) => s + w.amp, 0);
    for (const t of [0, 1.7, 9.3]) {
      for (const [x, y] of coords(liquidRingPath(200, 200, r, t, WAVES, 96))) {
        const dist = Math.hypot(x - 200, y - 200);
        // Bézier control points can sit slightly outside the curve; allow a small margin.
        expect(dist).toBeGreaterThan(r * (1 - maxAmp) - 1);
        expect(dist).toBeLessThan(r * (1 + maxAmp) + 1);
      }
    }
  });

  it("is a perfect circle without waves", () => {
    expect(ringRadius(150, 1.23, 99, [])).toBe(150);
    expect(ringPoint(200, 200, 100, 90, 0, [])).toEqual({ x: 200, y: 300 });
    expect(circlePath(200, 200, 176)).toBe("M376 200A176 176 0 1 1 24 200A176 176 0 1 1 376 200Z");
  });
});
