import { SphereGeometry, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { site } from "@/content/site";

import { getVisited, iso2ToNumeric } from "./geo";
import {
  countryLabel,
  createCountryLocator,
  drawGlobeTexture,
  GLOBE_TEXTURE_ROTATION_Y,
  GLOBE_TEXTURE_SIZE,
  type GlobeTextureContext,
  globeTextureProjection,
  latLngToVector3,
  splitVisitedFeatures,
  textureUvToLatLng,
  vector3ToLatLng,
} from "./globe";

const COLORS = { ocean: "#000001", land: "#000002", visited: "#000003", border: "#000004", graticule: "#000005" };

/** Records what the texture painter does, without a real canvas. */
function recordingContext() {
  const ops: { op: "fill" | "stroke" | "fillRect"; style: string; points: number }[] = [];
  let points = 0;
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "miter",
    beginPath: () => {
      points = 0;
    },
    moveTo: () => {
      points++;
    },
    lineTo: () => {
      points++;
    },
    arc: () => {
      points++;
    },
    closePath: () => {},
    fill: () => ops.push({ op: "fill", style: String(ctx.fillStyle), points }),
    stroke: () => ops.push({ op: "stroke", style: String(ctx.strokeStyle), points }),
    fillRect: () => ops.push({ op: "fillRect", style: String(ctx.fillStyle), points: 0 }),
  };
  return { ctx: ctx as unknown as GlobeTextureContext, ops };
}

describe("globe", () => {
  it("round-trips lat/lng through vector3", () => {
    for (const [lat, lng] of [
      [0, 0],
      [45, 10],
      [-33.9, 151.2],
      [64.1, -21.9],
      [-89, 179],
    ]) {
      const back = vector3ToLatLng(latLngToVector3(lat, lng, 2.5));
      expect(Math.abs(back.lat - lat)).toBeLessThan(1e-9);
      expect(Math.abs(back.lng - lng)).toBeLessThan(1e-9);
    }
  });

  it("puts lat 0 / lng 0 on +z and the north pole on +y", () => {
    const [x, y, z] = latLngToVector3(0, 0);
    expect([x, y, z].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([0, 0, 1]);
    expect(latLngToVector3(90, 0)[1]).toBeCloseTo(1, 12);
  });

  it("locates countries, including across the antimeridian", () => {
    const locate = createCountryLocator();
    expect(locate(12.5, 42.5)?.id).toBe("380");
    expect(locate(179.5, 66)?.id).toBe("643");
    expect(locate(-30, 0)).toBeUndefined();
  });

  it("the tooltip lookup names the country under a lat/lng", () => {
    const locate = createCountryLocator();
    const visitedById = new Map(getVisited(site.visitedCountries).map((v) => [v.numericId!, v]));
    const cases = [
      { lat: 42, lng: 12, id: "380", name: "Italy" },
      { lat: 36, lng: 138, id: "392", name: "Japan" },
      { lat: 39, lng: -98, id: "840", name: "United States" },
    ];
    for (const c of cases) {
      const f = locate(c.lng, c.lat);
      expect(f?.id, c.name).toBe(c.id);
      expect(countryLabel(f!, visitedById)).toBe(c.name);
      expect(visitedById.has(String(f!.id)), c.name).toBe(true);
    }
  });

  it("labels visited countries with the site's display name", () => {
    const locate = createCountryLocator();
    const us = locate(-100, 40)!;
    const ru = locate(90, 60)!;
    const visitedById = new Map([["840", { iso2: "US", name: "United States", numericId: "840", lat: 0, lng: 0, placeholder: false }]]);
    expect(countryLabel(us, visitedById)).toBe("United States");
    expect(countryLabel(ru, visitedById)).toBe(ru.properties.name);
  });

  it("every visited ISO code maps to exactly one world-atlas feature to fill", () => {
    const { visited, other } = splitVisitedFeatures();
    expect(visited).toHaveLength(site.visitedCountries.length);
    expect(new Set(visited.map((f) => String(f.id)))).toEqual(
      new Set(site.visitedCountries.map((c) => iso2ToNumeric(c.iso2))),
    );
    expect(other.some((f) => String(f.id) === iso2ToNumeric("RU"))).toBe(true);
    expect(other.some((f) => String(f.id) === iso2ToNumeric("IT"))).toBe(false);
  });

  it("the texture projection and the sphere UVs agree with latLngToVector3", () => {
    const { width, height } = GLOBE_TEXTURE_SIZE;
    const projection = globeTextureProjection(width, height);
    for (const [lat, lng] of [
      [42, 12],
      [36, 138],
      [39, -98],
      [-33.9, 151.2],
    ]) {
      // Canvas row 0 is the top; with flipY it becomes uv.y = 1.
      const [x, y] = projection([lng, lat])!;
      const back = textureUvToLatLng(x / width, 1 - y / height);
      expect(back.lat).toBeCloseTo(lat, 9);
      expect(back.lng).toBeCloseTo(lng, 9);
    }
    // Each sphere vertex, turned like the mesh, sits where its UV's lat/lng says.
    const geometry = new SphereGeometry(1, 24, 16);
    const pos = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyAxisAngle(new Vector3(0, 1, 0), GLOBE_TEXTURE_ROTATION_Y);
      const { lat, lng } = textureUvToLatLng(uv.getX(i), uv.getY(i));
      const expected = latLngToVector3(lat, lng);
      expect(v.distanceTo(new Vector3(...expected)), `vertex ${i}`).toBeLessThan(1e-6);
    }
    geometry.dispose();
  });

  it("paints ocean, graticule, land, visited countries and borders, in that order", () => {
    const { ctx, ops } = recordingContext();
    drawGlobeTexture(ctx, COLORS);
    expect(ops.map((o) => `${o.op}:${o.style}`)).toEqual([
      `fillRect:${COLORS.ocean}`,
      `stroke:${COLORS.graticule}`,
      `fill:${COLORS.land}`,
      `fill:${COLORS.visited}`,
      `stroke:${COLORS.border}`,
    ]);
    for (const o of ops.slice(1)) expect(o.points, o.style).toBeGreaterThan(100);
  });

  it("builds the texture paths quickly", () => {
    const { ctx } = recordingContext();
    drawGlobeTexture(ctx, COLORS); // warm-up (JIT, border mesh memo)
    const t0 = performance.now();
    drawGlobeTexture(ctx, COLORS);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(200);
  });
});
