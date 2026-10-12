"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import {
  bucketColors,
  clampDpr,
  DEPTH_BUCKETS,
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
  terrainHeight,
  wrapDepth,
  yawAt,
} from "@/lib/depth-field";
import { ATLAS_COLORS, type AtlasTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { useAtlasTheme } from "../../use-atlas-theme";

interface Palette {
  buckets: string[];
  nearCss: string;
  /** Dot size multiplier (light mode draws slightly larger dots). */
  sizeScale: number;
}

/**
 * Dark: grey fog mixing toward the accent. Light: every dot is a saturated red
 * (ATLAS_COLORS.light.fieldDot, more vivid than the rust --primary); near dots reach .5
 * alpha and are a bit larger so they stay visible on the paper. The theme effect below
 * swaps palettes live on toggle.
 */
function paletteFor(theme: AtlasTheme): Palette {
  const c = ATLAS_COLORS[theme];
  const light = theme === "light";
  const near = hexToRgb(c.fieldNear);
  return {
    buckets: bucketColors(c.fieldDot, c.fieldNear, light ? 0.5 : 0.55),
    nearCss: `rgb(${near[0]},${near[1]},${near[2]})`,
    sizeScale: light ? 1.3 : 1,
  };
}

/**
 * Landing background: a dotted terrain drifting toward the viewer with a slow scan sweep.
 * Canvas 2D, one rAF loop that runs only while the hero is on screen and the tab is
 * visible; DPR capped at 1.5. Under reduced motion it draws one static frame.
 * Decorative: aria-hidden, no pointer events.
 */
export function DepthField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useAtlasTheme();
  const reduced = useReducedMotion();
  const paletteRef = useRef<Palette>(paletteFor("dark"));
  const redrawRef = useRef<(() => void) | null>(null);

  // Theme changes (useAtlasTheme observes <html data-theme>): the next frame uses the
  // new colours; a static field redraws now.
  useEffect(() => {
    paletteRef.current = paletteFor(theme);
    redrawRef.current?.();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.closest("section") ?? canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.dataset.running = "false";
      return;
    }
    const still = Boolean(reduced) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dpr = 1;
    let cssW = 0;
    let cssH = 0;
    let view = fieldView(1, 1);
    let grid: Float32Array = new Float32Array(0);
    let gridCols = 0;
    // Per-bucket [x, y, size] triples, plus highlighted points [x, y, size, alpha].
    let bucketData: Float32Array[] = [];
    const bucketCount = new Int32Array(DEPTH_BUCKETS);
    let hiData: Float32Array = new Float32Array(0);

    let t = 0;
    let last = 0;
    let frameNo = 0;
    let raf = 0;
    let resizeRaf = 0;
    let running = false;
    let inView = true;
    let destroyed = false;

    const out: Projected = { sx: 0, sy: 0, depth: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = clampDpr(window.devicePixelRatio);
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssH * dpr);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      view = fieldView(w, h);
      const { cols, rows } = gridSize(cssW);
      if (cols !== gridCols || grid.length !== cols * rows * 2) {
        gridCols = cols;
        grid = makeGrid(cols, rows);
        const n = cols * rows;
        bucketData = Array.from({ length: DEPTH_BUCKETS }, () => new Float32Array(n * 3));
        hiData = new Float32Array(n * 4);
      }
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H || !grid.length) return false;
      const palette = paletteRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);

      const yaw = still ? 0 : yawAt(t);
      const sweep = still ? null : sweepDepth(t);
      bucketCount.fill(0);
      let hiCount = 0;
      for (let k = 0; k < grid.length; k += 2) {
        const x = grid[k]! * view.halfX;
        const z = still ? grid[k + 1]! : wrapDepth(grid[k + 1]!, t);
        const y = terrainHeight(x, z, t);
        if (!project(x, y, z, yaw, view, out)) continue;
        const size = pointSize(out.depth) * dpr * palette.sizeScale;
        const b = depthBucket(out.depth);
        const arr = bucketData[b]!;
        const o = bucketCount[b]! * 3;
        arr[o] = out.sx;
        arr[o + 1] = out.sy;
        arr[o + 2] = size;
        bucketCount[b]!++;

        if (sweep !== null) {
          const d = Math.abs(z - sweep);
          const boost = d < FIELD.sweepBand ? FIELD.sweepBoost * (1 - d / FIELD.sweepBand) : 0;
          if (boost > 0.02) {
            const h = hiCount * 4;
            hiData[h] = out.sx;
            hiData[h + 1] = out.sy;
            hiData[h + 2] = size;
            hiData[h + 3] = Math.min(1, boost);
            hiCount++;
          }
        }
      }

      // One fillStyle per depth bucket, far to near.
      for (let b = DEPTH_BUCKETS - 1; b >= 0; b--) {
        const arr = bucketData[b]!;
        const n = bucketCount[b]! * 3;
        ctx.fillStyle = palette.buckets[b]!;
        for (let o = 0; o < n; o += 3) {
          const s = arr[o + 2]!;
          ctx.fillRect(arr[o]! - s / 2, arr[o + 1]! - s / 2, s, s);
        }
      }
      // Sweep highlights in the near colour.
      if (hiCount) {
        ctx.fillStyle = palette.nearCss;
        for (let h = 0; h < hiCount * 4; h += 4) {
          const s = hiData[h + 2]!;
          ctx.globalAlpha = hiData[h + 3]!;
          ctx.fillRect(hiData[h]! - s / 2, hiData[h + 1]! - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      }
      if (!("drawn" in canvas.dataset)) canvas.dataset.drawn = "";
      return true;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      // Phones: 30 fps (skip every other frame).
      frameNo++;
      if (cssW < 768 && frameNo % 2 === 1) return;
      t += cssW < 768 ? dt * 2 : dt;
      draw();
    };

    const sync = () => {
      const run = shouldRun({ inView, hidden: document.hidden, reduced: still });
      if (run && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!run && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
      canvas.dataset.running = String(running);
    };

    const scheduleResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (destroyed) return;
        resize();
        // The loop redraws on its own; a paused or static field redraws once.
        if (!running) draw();
      });
    };

    resize();
    draw();
    redrawRef.current = () => {
      if (!running) draw();
    };

    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    if (!still) {
      if (typeof IntersectionObserver === "function") {
        io = new IntersectionObserver(([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          sync();
        });
        io.observe(host);
      }
      document.addEventListener("visibilitychange", sync);
    }
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(scheduleResize);
      ro.observe(host);
    } else {
      window.addEventListener("resize", scheduleResize);
    }
    sync();

    return () => {
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      redrawRef.current = null;
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="depth-field"
      className={cn("fade-in-slow pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
