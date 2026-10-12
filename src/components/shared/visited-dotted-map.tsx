"use client";

import { memo, type ReactNode } from "react";
import { DottedMap } from "@/components/ui/dotted-map";
import { site } from "@/content/site";
import { getVisited } from "@/lib/geo";

// Computed once at module load: stable references keep the memoised map from re-rendering.
export const VISITED = getVisited(site.visitedCountries);

const MARKERS = VISITED.map((c) => ({
  lat: c.lat,
  lng: c.lng,
  name: c.name,
  note: c.note,
}));

/** Accessible summary of the map; the Atlas globe reuses it as screen-reader text. */
export const VISITED_MAP_LABEL = `Dotted world map with markers on the ${VISITED.length} countries I have visited: ${VISITED.map((c) => c.name).join(", ")}.`;

export type VisitedMarker = (typeof MARKERS)[number];

export interface MarkerOverlayArgs {
  x: number;
  y: number;
  r: number;
  marker: Pick<VisitedMarker, "name" | "note">;
}

/** Default hover target: a larger invisible circle with a native tooltip. */
function TitleHitArea({ x, y, r, marker }: MarkerOverlayArgs) {
  return (
    <circle cx={x} cy={y} r={Math.max(r * 2.5, 1.6)} fill="transparent" data-country={marker.name}>
      <title>{marker.note ? `${marker.name} · ${marker.note}` : marker.name}</title>
    </circle>
  );
}

export interface VisitedDottedMapProps {
  dotColor: string;
  markerColor: string;
  /**
   * Land dot radius in viewBox units (the map is 150×75 with ~1.5 units
   * between dots). 0.4 keeps the continents readable at a 390px width.
   */
  dotRadius?: number;
  markerSize?: number;
  pulse?: boolean;
  /** Must be a stable (module-level) component so the memoised map is not rebuilt. */
  MarkerOverlay?: (args: MarkerOverlayArgs) => ReactNode;
  testId?: string;
  className?: string;
}

/**
 * Magic UI dotted world map with one marker per visited country, shared by
 * both styles. The map draws thousands of dots, so it is memoised and only
 * re-renders when a prop changes (e.g. `pulse` after hydration).
 */
export const VisitedDottedMap = memo(function VisitedDottedMap({
  dotColor,
  markerColor,
  dotRadius = 0.4,
  markerSize = 0.6,
  pulse = false,
  MarkerOverlay = TitleHitArea,
  testId = "visited-dotted-map",
  className,
}: VisitedDottedMapProps) {
  const markers = MARKERS.map((m) => ({ ...m, size: markerSize }));
  return (
    <DottedMap<VisitedMarker & { size: number }>
      width={150}
      height={75}
      markers={markers}
      dotColor={dotColor}
      markerColor={markerColor}
      dotRadius={dotRadius}
      pulse={pulse}
      role="img"
      aria-label={VISITED_MAP_LABEL}
      data-testid={testId}
      className={className}
      renderMarkerOverlay={({ marker, x, y, r }) => <MarkerOverlay x={x} y={y} r={r} marker={marker} />}
    />
  );
});
