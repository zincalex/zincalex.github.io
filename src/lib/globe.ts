/**
 * Pure helpers for the Atlas 3D globe (no three.js, no DOM), so they run in
 * Vitest. Coordinates use a y-up sphere where lat 0 / lng 0 faces +z:
 * x = r·cosφ·sinλ, y = r·sinφ, z = r·cosφ·cosλ.
 */
import { geoBounds, geoContains, geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";

import { site } from "@/content/site";

import { type CountryFeature, countryBorders, type VisitedInfo, visitedFeatureIds, worldFeatures } from "./geo";

export type Vec3 = [number, number, number];

export interface LatLng {
  lat: number;
  lng: number;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function latLngToVector3(lat: number, lng: number, r = 1): Vec3 {
  const phi = lat * RAD;
  const lambda = lng * RAD;
  return [r * Math.cos(phi) * Math.sin(lambda), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(lambda)];
}

export function vector3ToLatLng([x, y, z]: readonly [number, number, number]): LatLng {
  const r = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, y / r))) * DEG;
  const lng = Math.atan2(x, z) * DEG;
  return { lat, lng };
}

export type CountryLocator = (lng: number, lat: number) => CountryFeature | undefined;

/**
 * Point-in-country lookup. A geoBounds box per feature filters candidates
 * (boxes with west > east cross the antimeridian), then geoContains decides.
 */
export function createCountryLocator(features: readonly CountryFeature[] = worldFeatures.features): CountryLocator {
  const boxes = features.map((f) => {
    const [[west, south], [east, north]] = geoBounds(f);
    return { f, west, south, east, north };
  });
  return (lng, lat) => {
    for (const b of boxes) {
      if (lat < b.south || lat > b.north) continue;
      const inLng = b.west <= b.east ? lng >= b.west && lng <= b.east : lng >= b.west || lng <= b.east;
      if (inLng && geoContains(b.f, [lng, lat])) return b.f;
    }
    return undefined;
  };
}

const featureIdOf = (f: CountryFeature) => (f.id === undefined ? "" : String(f.id));

/** Visited countries use the site's display name (e.g. 'United States'); others use the atlas name. */
export function countryLabel(feature: CountryFeature, visitedById: ReadonlyMap<string, VisitedInfo>): string {
  return visitedById.get(featureIdOf(feature))?.name ?? feature.properties.name;
}

/**
 * Equirectangular texture wrapped on a three.js SphereGeometry. Its u = 0.5 meridian
 * (lng 0 in the texture) lies on +x, so the mesh turns by -90° about y to put lng 0 on +z,
 * matching latLngToVector3 (and the hover lookup through vector3ToLatLng).
 */
export const GLOBE_TEXTURE_ROTATION_Y = -Math.PI / 2;

/** Geographic point of a texture coordinate (uv.y = 1 is the north pole, as with flipY). */
export function textureUvToLatLng(u: number, v: number): LatLng {
  return { lat: (v - 0.5) * 180, lng: u * 360 - 180 };
}

/** Texture size: 2:1 equirectangular, power of two so mipmaps work. */
export const GLOBE_TEXTURE_SIZE = { width: 2048, height: 1024 } as const;

export interface GlobeTextureColors {
  ocean: string;
  land: string;
  visited: string;
  border: string;
  graticule: string;
}

/** The subset of CanvasRenderingContext2D the texture painter uses (a stub in tests). */
export type GlobeTextureContext = Pick<
  CanvasRenderingContext2D,
  | "fillStyle"
  | "strokeStyle"
  | "lineWidth"
  | "lineJoin"
  | "fillRect"
  | "beginPath"
  | "moveTo"
  | "lineTo"
  | "arc"
  | "closePath"
  | "fill"
  | "stroke"
>;

/** Plate carrée onto the texture: lng -180 at x = 0, lat 90 at y = 0 (what textureUvToLatLng expects). */
export function globeTextureProjection(width: number = GLOBE_TEXTURE_SIZE.width, height: number = GLOBE_TEXTURE_SIZE.height) {
  return geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
}

/** Features of the visited countries, split from the rest of the land. */
export function splitVisitedFeatures(
  visitedIds: ReadonlySet<string> = visitedFeatureIds(site.visitedCountries),
  features: readonly CountryFeature[] = worldFeatures.features,
): { visited: CountryFeature[]; other: CountryFeature[] } {
  const visited: CountryFeature[] = [];
  const other: CountryFeature[] = [];
  for (const f of features) (visitedIds.has(featureIdOf(f)) ? visited : other).push(f);
  return { visited, other };
}

/**
 * Paints the globe map into a 2:1 canvas: ocean, a 10° graticule, land,
 * visited countries in the accent and thin shared borders. Each layer is one path and
 * one fill/stroke call, so the whole map costs a handful of draw calls.
 */
export function drawGlobeTexture(
  ctx: GlobeTextureContext,
  colors: GlobeTextureColors,
  {
    width = GLOBE_TEXTURE_SIZE.width,
    height = GLOBE_TEXTURE_SIZE.height,
    visitedIds,
  }: { width?: number; height?: number; visitedIds?: ReadonlySet<string> } = {},
): void {
  const path = geoPath(globeTextureProjection(width, height), ctx);
  const scale = width / GLOBE_TEXTURE_SIZE.width;
  const { visited, other } = splitVisitedFeatures(visitedIds);

  ctx.fillStyle = colors.ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = colors.graticule;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  ctx.beginPath();
  for (const f of other) path(f);
  ctx.fillStyle = colors.land;
  ctx.fill();

  ctx.beginPath();
  for (const f of visited) path(f);
  ctx.fillStyle = colors.visited;
  ctx.fill();

  ctx.beginPath();
  path(countryBorders());
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5 * scale;
  ctx.lineJoin = "round";
  ctx.stroke();
}
