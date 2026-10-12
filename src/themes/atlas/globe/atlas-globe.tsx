"use client";

import { useInView, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { VISITED_MAP_LABEL, VisitedDottedMap } from "@/components/shared/visited-dotted-map";
import { ATLAS_COLORS } from "@/lib/theme";

import { useHydrated } from "../atlas-ui";
import { readAtlasTheme, useAtlasTheme } from "../use-atlas-theme";
import type { GlobeHover } from "./globe-scene";

/** The flat dotted map: shown before hydration, while the 3D chunk loads, under reduced motion and without WebGL. */
function GlobeFallback() {
  const colors = ATLAS_COLORS[useAtlasTheme()];
  return (
    <div className="flex h-full items-center justify-center">
      <div className="aspect-[2/1] w-full">
        <VisitedDottedMap dotColor={colors.mapDot} markerColor={colors.accent} testId="atlas-dotted-map" />
      </div>
    </div>
  );
}

// three.js + R3F live in their own chunk: prefetched in idle time after the hero intro
// (useWarmGlobeChunk), otherwise fetched once the section is near the viewport.
const GlobeScene = dynamic(() => import("./globe-scene"), { ssr: false, loading: () => <GlobeFallback /> });

/** The warm-up waits for the hero entrance (≈2 s) so it never competes with it. */
const WARM_DELAY_MS = 2500;

/** Data saver on or a 2g-class connection: the 3D chunk is only fetched on demand. */
function prefersLightLoad(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || /2g/.test(c?.effectiveType ?? "");
}

/** Runs fn in an idle period (or right away without requestIdleCallback); returns a cancel. */
function whenIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback !== "function") {
    fn();
    return () => {};
  }
  const id = window.requestIdleCallback(fn, { timeout: 2000 });
  return () => window.cancelIdleCallback(id);
}

/**
 * Fetches, parses and evaluates the globe chunk during idle time once the page has settled,
 * then paints the globe's map texture in a later idle slot, so scrolling to Travel does not
 * pay for either in one long task (which used to stall the reveals of Honors, Travel and
 * Contact). true once the chunk is loaded and the texture painted.
 */
function useWarmGlobeChunk(enabled: boolean): boolean {
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    if (!enabled || prefersLightLoad()) return;
    let cancelled = false;
    let cancelIdle = () => {};
    const load = () => {
      import("./globe-scene").then(
        (mod) => {
          if (cancelled) return;
          cancelIdle = whenIdle(() => {
            if (cancelled) return;
            mod.prepareGlobeTexture(readAtlasTheme());
            setWarm(true);
          });
        },
        () => {}, // Network error: the near-viewport path retries through dynamic().
      );
    };
    const timer = window.setTimeout(() => {
      cancelIdle = whenIdle(load);
    }, WARM_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelIdle();
    };
  }, [enabled]);
  return warm;
}

let webglCache: boolean | null = null;
function getWebglSnapshot(): boolean {
  if (webglCache === null) {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      webglCache = ctx !== null;
      // Free the probe context right away (browsers cap live WebGL contexts).
      ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
const noSubscribe = () => () => {};

/** false on the server and during hydration; afterwards, whether a WebGL context can be created. */
function useWebglAvailable(): boolean {
  return useSyncExternalStore(noSubscribe, getWebglSnapshot, () => false);
}

/** Atlas Travel: an interactive globe with visited countries filled (drag to rotate, hover for names). */
export function AtlasGlobe() {
  const ref = useRef<HTMLElement>(null);
  const theme = useAtlasTheme();
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  const webgl = useWebglAvailable();
  const showGlobe = hydrated && webgl && !reduced;
  const warm = useWarmGlobeChunk(showGlobe);
  // A warm chunk mounts the canvas well ahead of the section (cheap now); a cold one keeps
  // the old, closer trigger so the download is not started for a section far away.
  const nearWarm = useInView(ref, { margin: "1200px 0px", once: true });
  const nearCold = useInView(ref, { margin: "400px 0px", once: true });
  const near = (warm && nearWarm) || nearCold;
  const visible = useInView(ref);
  const [hover, setHover] = useState<GlobeHover | null>(null);

  return (
    <figure ref={ref} data-testid="atlas-globe" className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="relative h-[340px] md:h-[440px]">
        {showGlobe && near ? (
          <>
            <div aria-hidden="true" className="absolute inset-0">
              <GlobeScene theme={theme} active={visible} onHover={setHover} />
            </div>
            {hover ? (
              <div
                data-testid="globe-tooltip"
                aria-hidden="true"
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-md border border-border bg-popover/95 px-2 py-1 font-mono text-xs whitespace-nowrap text-popover-foreground shadow"
                style={{ left: hover.x, top: hover.y }}
              >
                {hover.name}
                {hover.visited ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                    <span className="size-1.5 bg-primary" />
                    visited
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className="sr-only">{VISITED_MAP_LABEL}</p>
          </>
        ) : (
          <GlobeFallback />
        )}
      </div>
    </figure>
  );
}
