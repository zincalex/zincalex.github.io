// Atlas light/dark theme constants. Pure module: safe in Server Components,
// client code and Vitest. Dark is the default; light reuses the Editorial palette.

export type AtlasTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "atlas-theme";

/**
 * Runs in <head> before first paint (see src/app/layout.tsx). Applies a stored
 * "light" / "dark" choice to <html data-theme>; anything else is ignored.
 * Keep the key literal in sync with THEME_STORAGE_KEY.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("atlas-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/**
 * Colors for things CSS variables cannot reach (SVG fills, WebGL materials).
 * The light values equal EDITORIAL_MAP_COLORS and the Editorial paper.
 */
export const ATLAS_COLORS: Record<
  AtlasTheme,
  {
    accent: string;
    mapDot: string;
    /** Travel globe texture: ocean, land, shared borders and the 10° graticule (visited = accent). */
    globeOcean: string;
    globeLand: string;
    globeBorder: string;
    globeGraticule: string;
    /** Landing depth field: far points (fog) and near points / sweep highlight. */
    fieldDot: string;
    fieldNear: string;
  }
> = {
  dark: {
    accent: "#5eead4",
    mapDot: "#64748b",
    globeOcean: "#101b26",
    globeLand: "#334155",
    globeBorder: "#101b26",
    globeGraticule: "#17232f",
    fieldDot: "#8b98a5",
    fieldNear: "#5eead4",
  },
  light: {
    accent: "#9a3412",
    mapDot: "#a8a29e",
    globeOcean: "#ede7db",
    globeLand: "#d6d3d1",
    globeBorder: "#f7f3ec",
    globeGraticule: "#e3dccd",
    // A more saturated, slightly darker red than the rust --primary (~oklch(0.58 0.2 32)),
    // so the dots read as red on the paper at the same alpha.
    fieldDot: "#d13a1f",
    fieldNear: "#d13a1f",
  },
};
