"use client";

import { PlaceholderBadge } from "@/components/shared/placeholder-badge";
import { VISITED, VisitedDottedMap, type MarkerOverlayArgs } from "@/components/shared/visited-dotted-map";
import { FloatingTooltip, useFloatingTooltip } from "@/components/unlumen-ui/floating-tooltip";
import { cn } from "@/lib/utils";
import { smallCaps } from "./editorial-ui";

// stone-400 land dots (r 0.4) stay visible on the paper background down to 390px.
export const EDITORIAL_MAP_COLORS = { dot: "#a8a29e", marker: "#9a3412" } as const;

/** Invisible, larger hit area around a marker that drives the floating tooltip. */
function MarkerHitArea({ x, y, r, marker }: MarkerOverlayArgs) {
  const tooltip = useFloatingTooltip();
  return (
    <circle
      cx={x}
      cy={y}
      r={Math.max(r * 2.5, 1.6)}
      fill="transparent"
      data-country={marker.name}
      onMouseEnter={() => {
        tooltip?.setContent(marker.name, marker.note);
        tooltip?.setIsActive(true);
      }}
      onMouseLeave={() => tooltip?.setIsActive(false)}
    />
  );
}

export function EditorialCountries({ pulse }: { pulse: boolean }) {
  return (
    <>
      <figure>
        <div className="aspect-[2/1] w-full">
          <VisitedDottedMap
            dotColor={EDITORIAL_MAP_COLORS.dot}
            markerColor={EDITORIAL_MAP_COLORS.marker}
            pulse={pulse}
            MarkerOverlay={MarkerHitArea}
            testId="editorial-dotted-map"
          />
        </div>
        <figcaption className="mt-4 font-serif text-base text-muted-foreground italic">
          Places I have been so far. Hover a marker for its name.
        </figcaption>
      </figure>
      {/* Hover tooltips are a bonus: each chip already carries the name and note as text. */}
      <ul aria-label="Countries visited" className="mt-6 flex flex-wrap gap-2">
        {VISITED.map((c) => (
          <li key={c.iso2}>
            <FloatingTooltip.Trigger content={c.name} description={c.note}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                {c.name}
                {c.note ? <span className={cn("text-muted-foreground", smallCaps)}>· {c.note}</span> : null}
                {c.placeholder ? <PlaceholderBadge /> : null}
              </span>
            </FloatingTooltip.Trigger>
          </li>
        ))}
      </ul>
    </>
  );
}
