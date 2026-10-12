/**
 * Pure geo helpers (no React). World geometry comes from the locally bundled
 * world-atlas TopoJSON (Natural Earth 1:110m). Feature ids are zero-padded
 * ISO 3166-1 numeric codes, e.g. Italy = '380'.
 */
import { geoArea, geoCentroid } from "d3-geo";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import type { Feature, FeatureCollection, Geometry, MultiLineString, MultiPolygon, Polygon } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

import type { VisitedCountry } from "@/content/types";

countries.registerLocale(en);

export type CountryFeature = Feature<Geometry, { name: string }>;
export type CountryFeatureCollection = FeatureCollection<Geometry, { name: string }>;

const topology = world as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>;
}>;

export const worldFeatures: CountryFeatureCollection = feature(
  topology,
  topology.objects.countries,
) as CountryFeatureCollection;

let bordersMemo: MultiLineString | null = null;

/** Borders shared by two countries, each arc once (coastlines are left out). */
export function countryBorders(): MultiLineString {
  bordersMemo ??= mesh(topology, topology.objects.countries, (a, b) => a !== b);
  return bordersMemo;
}

/** 'IT' -> '380' (zero-padded to 3 chars), undefined for unknown codes. */
export function iso2ToNumeric(iso2: string): string | undefined {
  const numeric = countries.alpha2ToNumeric(iso2.toUpperCase());
  return numeric ? numeric.padStart(3, "0") : undefined;
}

/** Everyday names where the library's official name is long or formal. */
const SHORT_NAMES: Record<string, string> = {
  CN: "China",
  MK: "North Macedonia",
  TW: "Taiwan",
  US: "United States",
};

/** 'IT' -> 'Italy'. Falls back to the code itself. */
export function countryName(iso2: string): string {
  const code = iso2.toUpperCase();
  return SHORT_NAMES[code] ?? countries.getName(code, "en", { select: "official" }) ?? iso2;
}

export function visitedFeatureIds(list: VisitedCountry[]): Set<string> {
  const ids = new Set<string>();
  for (const c of list) {
    const id = iso2ToNumeric(c.iso2);
    if (id) ids.add(id);
  }
  return ids;
}

function featureById(id: string): CountryFeature | undefined {
  return worldFeatures.features.find((f) => String(f.id) === id);
}

/**
 * Centroid of the largest polygon, so countries with overseas parts
 * (France + French Guiana, USA + Alaska/Hawaii) get a marker on the mainland.
 */
function largestPolygonCentroid(f: CountryFeature): [number, number] {
  const g = f.geometry;
  if (g.type === "MultiPolygon") {
    let best: Polygon | null = null;
    let bestArea = -1;
    for (const coordinates of (g as MultiPolygon).coordinates) {
      const poly: Polygon = { type: "Polygon", coordinates };
      const area = geoArea(poly);
      if (area > bestArea) {
        bestArea = area;
        best = poly;
      }
    }
    if (best) return geoCentroid(best) as [number, number];
  }
  return geoCentroid(f) as [number, number];
}

export interface VisitedInfo {
  iso2: string;
  name: string;
  numericId: string | undefined;
  lat: number;
  lng: number;
  note?: string;
  placeholder: boolean;
}

export function getVisited(list: VisitedCountry[]): VisitedInfo[] {
  return list.map((c) => {
    const numericId = iso2ToNumeric(c.iso2);
    const f = numericId ? featureById(numericId) : undefined;
    const [cLng, cLat] = f ? largestPolygonCentroid(f) : [0, 0];
    return {
      iso2: c.iso2.toUpperCase(),
      name: countryName(c.iso2),
      numericId,
      lat: c.lat ?? cLat,
      lng: c.lng ?? cLng,
      note: c.note,
      placeholder: Boolean(c.placeholder),
    };
  });
}
