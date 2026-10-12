import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ATLAS_COLORS, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "./theme";

/** Runs the inline script against a fake localStorage + document and returns the attributes it set. */
function runInitScript(getItem: (key: string) => string | null) {
  const attrs: Record<string, string> = {};
  const localStorage = { getItem };
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attrs[name] = value;
      },
    },
  };
  new Function("localStorage", "document", THEME_INIT_SCRIPT)(localStorage, document);
  return attrs;
}

describe("THEME_INIT_SCRIPT", () => {
  it("reads the atlas-theme key", () => {
    const keys: string[] = [];
    runInitScript((k) => {
      keys.push(k);
      return null;
    });
    expect(keys).toEqual([THEME_STORAGE_KEY]);
  });

  it("applies a stored light theme", () => {
    expect(runInitScript(() => "light")).toEqual({ "data-theme": "light" });
  });

  it("applies a stored dark theme", () => {
    expect(runInitScript(() => "dark")).toEqual({ "data-theme": "dark" });
  });

  it("ignores a missing or unknown value", () => {
    expect(runInitScript(() => null)).toEqual({});
    expect(runInitScript(() => "blue")).toEqual({});
  });

  it("does not throw when localStorage is unavailable", () => {
    expect(() =>
      runInitScript(() => {
        throw new Error("SecurityError");
      }),
    ).not.toThrow();
  });
});

describe("ATLAS_COLORS", () => {
  it("light mode reuses the Editorial map colors", () => {
    const src = readFileSync(
      fileURLToPath(new URL("../themes/editorial/editorial-map.tsx", import.meta.url)),
      "utf8",
    );
    const m = /EDITORIAL_MAP_COLORS = \{ dot: "(#[0-9a-f]+)", marker: "(#[0-9a-f]+)" \}/.exec(src);
    expect(m).not.toBeNull();
    expect(ATLAS_COLORS.light.mapDot).toBe(m![1]);
    expect(ATLAS_COLORS.light.accent).toBe(m![2]);
    expect(ATLAS_COLORS.light).toEqual({
      accent: "#9a3412",
      mapDot: "#a8a29e",
      globeOcean: "#ede7db",
      globeLand: "#d6d3d1",
      globeBorder: "#f7f3ec",
      globeGraticule: "#e3dccd",
      fieldDot: "#d13a1f",
      fieldNear: "#d13a1f",
    });
  });

  it("dark mode keeps the teal accent", () => {
    expect(ATLAS_COLORS.dark.accent).toBe("#5eead4");
  });

  it("globe land, ocean and accent are distinct in both themes", () => {
    for (const c of Object.values(ATLAS_COLORS)) {
      expect(new Set([c.globeOcean, c.globeLand, c.accent]).size).toBe(3);
    }
  });
});
