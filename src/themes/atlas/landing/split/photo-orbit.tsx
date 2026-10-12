"use client";

import { useReducedMotion } from "motion/react";
import { type CSSProperties, type RefObject, useEffect, useRef } from "react";

import type { PhotoFraming } from "@/content/types";
import { circlePath, liquidRingPath, ringRadius, type RingWave } from "@/lib/liquid-ring";
import { cn } from "@/lib/utils";

import { entrance, HeroPhoto } from "../shared";

const C = 200;
const INNER = 176;
const MIDDLE = 184;
const OUTER = 196;

type RingId = "inner" | "middle" | "outer";

const RADIUS: Record<RingId, number> = { inner: INNER, middle: MIDDLE, outer: OUTER };

/**
 * Slow, low-lobe waves per ring (amplitudes sum to ~1.6-2.2% of the radius), each drifting
 * at its own speed so the three rings never bulge in step.
 */
const WAVES: Record<RingId, RingWave[]> = {
  inner: [
    { lobes: 2, amp: 0.009, speed: 0.31, phase: 0.4 },
    { lobes: 3, amp: 0.006, speed: -0.23, phase: 2.1 },
    { lobes: 4, amp: 0.003, speed: 0.41, phase: 4.0 },
  ],
  middle: [
    { lobes: 3, amp: 0.008, speed: -0.27, phase: 1.3 },
    { lobes: 2, amp: 0.006, speed: 0.19, phase: 3.6 },
    { lobes: 4, amp: 0.002, speed: -0.37, phase: 0.2 },
  ],
  outer: [
    { lobes: 2, amp: 0.011, speed: -0.21, phase: 2.7 },
    { lobes: 3, amp: 0.008, speed: 0.29, phase: 0.9 },
    { lobes: 4, amp: 0.003, speed: -0.33, phase: 5.1 },
  ],
};

/** Irregular tick angles (degrees) on the outer ring. */
const OUTER_TICKS = [4, 19, 27, 51, 63, 88, 97, 121, 146, 158, 183, 204, 219, 246, 262, 289, 311, 337];
/** A few small dots on the inner ring. */
const INNER_DOTS = [38, 162, 251];

const tickLength = (k: number) => (k % 3 === 0 ? 7 : 4);

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  // Rounded so server and browser render identical attributes (Math.sin/cos can differ in the last digits).
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return { x: round(C + r * Math.cos(a)), y: round(C + r * Math.sin(a)) };
}

/** Ring spin (.photo-orbit-spin): duration and direction. */
const spin = (dur: string, reverse = false) => ({ "--dur": dur, ...(reverse ? { "--dir": "reverse" } : {}) }) as CSSProperties;

/** Wobble eases in over the first seconds, so the first frame does not snap away from the circle. */
const EASE_IN_S = 2;
/** The wobble is slow; 30 fps is plenty (the CSS spin keeps running at full rate). */
const FRAME_MS = 1000 / 30;

/**
 * Moves the ring paths, ticks and dots to the liquid shape at time `t`, or back to the
 * static circle (t = null). Only touches the DOM; React keeps rendering the static
 * geometry, so server and client markup always match.
 */
function applyShape(svg: SVGSVGElement, t: number | null) {
  const ease = t === null ? 0 : Math.min(1, t / EASE_IN_S);
  const scale = ease * ease * (3 - 2 * ease);
  const waves = (id: RingId) => WAVES[id].map((w) => ({ ...w, amp: w.amp * scale }));
  const time = t ?? 0;

  for (const id of ["inner", "middle", "outer"] as const) {
    const d = t === null ? circlePath(C, C, RADIUS[id]) : liquidRingPath(C, C, RADIUS[id], time, waves(id), 72);
    svg.querySelectorAll<SVGPathElement>(`path[data-ring="${id}"]`).forEach((p) => p.setAttribute("d", d));
  }

  const place = (r: number, deg: number, id: RingId, inset = 0) => {
    const a = (deg * Math.PI) / 180;
    const rr = (t === null ? r : ringRadius(r, a, time, waves(id))) - inset;
    return [(C + rr * Math.cos(a)).toFixed(2), (C + rr * Math.sin(a)).toFixed(2)] as const;
  };
  svg.querySelectorAll<SVGLineElement>("line[data-tick]").forEach((el) => {
    const deg = Number(el.dataset.tick);
    const len = Number(el.dataset.len);
    const [x1, y1] = place(OUTER, deg, "outer", len);
    const [x2, y2] = place(OUTER, deg, "outer");
    el.setAttribute("x1", x1);
    el.setAttribute("y1", y1);
    el.setAttribute("x2", x2);
    el.setAttribute("y2", y2);
  });
  svg.querySelectorAll<SVGCircleElement>("circle[data-dot]").forEach((el) => {
    const [cx, cy] = place(INNER, Number(el.dataset.dot), "inner");
    el.setAttribute("cx", cx);
    el.setAttribute("cy", cy);
  });
}

/**
 * Liquid ring loop: client-only, after mount. Runs only while the portrait is on screen,
 * the tab is visible and motion is allowed; under reduced motion the rings stay circles.
 */
function useLiquidRings(svgRef: RefObject<SVGSVGElement | null>) {
  const reduced = useReducedMotion();
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let inView = true;
    let running = false;
    let raf = 0;
    let last = 0;
    let t = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      if (dt < FRAME_MS) return;
      last = now;
      t += Math.min(0.1, dt / 1000);
      applyShape(svg, t);
    };
    const sync = () => {
      const run = inView && !document.hidden;
      if (run && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!run && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "function") {
      io = new IntersectionObserver(([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        sync();
      });
      io.observe(svg);
    }
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      applyShape(svg, null);
    };
  }, [svgRef, reduced]);
}

/**
 * Landing 1 portrait: the round photo inside three thin rings. Each ring turns at its own
 * speed (inner clockwise, middle and outer counter-clockwise) and gently wobbles like a
 * liquid (useLiquidRings); the coloured arcs stretch, shrink and chase each other while
 * cycling through the --orbit-cycle-* colours (globals.css). The arc paths use
 * pathLength=360, so dash values are in degrees. Static circles under reduced motion.
 */
export function PhotoOrbit({
  available,
  className,
  style,
  framing,
  i,
}: {
  available: boolean;
  className?: string;
  style?: CSSProperties;
  /** Overrides site.person.photo.framing (photo admin preview). */
  framing?: PhotoFraming;
  /** Entrance stagger index: the portrait fades and scales up at i, the rings fade in at i + 1. */
  i?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  useLiquidRings(svgRef);
  const root = entrance(i, cn("relative aspect-square shrink-0", className), "hero-photo");
  const rings = entrance(i === undefined ? undefined : i + 1, "absolute inset-0 size-full overflow-visible", "hero-fade");

  return (
    <div className={root.className} style={{ ...style, ...root.style }}>
      {/* Soft static accent glow behind the photo. */}
      <div
        aria-hidden="true"
        className="absolute inset-[4%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_14%,transparent),transparent)]"
      />
      <svg
        ref={svgRef}
        aria-hidden="true"
        viewBox="0 0 400 400"
        className={rings.className}
        style={rings.style}
        fill="none"
      >
        <g className="photo-orbit-spin" style={spin("28s")}>
          <path data-ring="inner" d={circlePath(C, C, INNER)} className="stroke-[var(--orbit-ring)]" strokeWidth={1} />
          <path
            data-ring="inner"
            d={circlePath(C, C, INNER)}
            pathLength={360}
            className="photo-orbit-arc-inner stroke-[var(--orbit-cycle-1)]"
            strokeWidth={1.75}
            strokeOpacity={0.8}
            strokeLinecap="round"
            strokeDasharray="96 22 18 224"
          />
          {INNER_DOTS.map((deg) => {
            const p = polar(INNER, deg);
            return <circle key={deg} data-dot={deg} cx={p.x} cy={p.y} r={2} className="fill-line-strong" />;
          })}
        </g>
        <g className="photo-orbit-spin" style={spin("40s", true)}>
          <path
            data-ring="middle"
            d={circlePath(C, C, MIDDLE)}
            pathLength={360}
            className="stroke-line-strong"
            strokeWidth={1}
            strokeOpacity={0.6}
            strokeLinecap="round"
            strokeDasharray="1.2 4.8"
          />
        </g>
        <g className="photo-orbit-spin" style={spin("52s", true)}>
          <path data-ring="outer" d={circlePath(C, C, OUTER)} className="stroke-line" strokeWidth={1} />
          {OUTER_TICKS.map((deg, k) => {
            const a = polar(OUTER - tickLength(k), deg);
            const b = polar(OUTER, deg);
            return (
              <line
                key={deg}
                data-tick={deg}
                data-len={tickLength(k)}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="stroke-line-strong"
                strokeWidth={1}
              />
            );
          })}
          <path
            data-ring="outer"
            d={circlePath(C, C, OUTER)}
            pathLength={360}
            className="photo-orbit-arc-outer stroke-[var(--orbit-cycle-2)]"
            strokeWidth={1.75}
            strokeOpacity={0.8}
            strokeLinecap="round"
            strokeDasharray="70 30 12 248"
            // Starts the pattern at 140° (where the rotated <circle> used to put it).
            strokeDashoffset={-140}
          />
        </g>
      </svg>
      <div className="absolute inset-[13%] overflow-hidden rounded-full ring-1 ring-line">
        <HeroPhoto
          available={available}
          framing={framing}
          className="size-full rounded-full"
          initialsClassName="text-5xl"
        />
      </div>
    </div>
  );
}
