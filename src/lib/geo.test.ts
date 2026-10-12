import { describe, expect, it } from "vitest";

import { countryName, getVisited, iso2ToNumeric, visitedFeatureIds, worldFeatures } from "./geo";

describe("geo", () => {
  it("maps ISO alpha-2 to zero-padded numeric ids", () => {
    expect(iso2ToNumeric("IT")).toBe("380");
    expect(iso2ToNumeric("at")).toBe("040");
    expect(iso2ToNumeric("XX")).toBeUndefined();
  });

  it("resolves English country names, preferring everyday short names", () => {
    expect(countryName("IT")).toBe("Italy");
    expect(countryName("TW")).toBe("Taiwan");
    expect(countryName("MK")).toBe("North Macedonia");
    expect(countryName("CN")).toBe("China");
    expect(countryName("US")).toBe("United States");
  });

  it("loads the world features", () => {
    expect(worldFeatures.features.length).toBeGreaterThan(150);
  });

  it("computes a mainland centroid for Italy", () => {
    const [it] = getVisited([{ iso2: "IT" }]);
    expect(it.lat).toBeGreaterThanOrEqual(36);
    expect(it.lat).toBeLessThanOrEqual(47.5);
    expect(it.lng).toBeGreaterThanOrEqual(6);
    expect(it.lng).toBeLessThanOrEqual(19);
  });

  it("uses the largest polygon for France (not dragged to French Guiana)", () => {
    const [fr] = getVisited([{ iso2: "FR" }]);
    expect(fr.lat).toBeGreaterThanOrEqual(41);
    expect(fr.lat).toBeLessThanOrEqual(51.5);
    expect(fr.lng).toBeGreaterThan(-5);
  });

  it("honours lat/lng overrides", () => {
    const [x] = getVisited([{ iso2: "IT", lat: 45.4, lng: 11.9 }]);
    expect([x.lat, x.lng]).toEqual([45.4, 11.9]);
  });

  it("builds a set of visited feature ids", () => {
    expect([...visitedFeatureIds([{ iso2: "IT" }, { iso2: "FR" }])]).toEqual(["380", "250"]);
  });


});
