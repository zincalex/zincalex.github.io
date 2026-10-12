import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
// GitHub Pages USER site (zincalex.github.io) is served at the domain root,
// so no basePath/assetPrefix. trailingSlash emits out/<route>/index.html,
// which GitHub Pages and `serve` both resolve without rewrites.
export default function nextConfig(phase: string): NextConfig {
  return {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    reactStrictMode: true,
    // `page.dev.tsx` files (the photo admin at /admin) are routes only under `next dev`;
    // `next build` ignores them, so they never reach the static export.
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER ? ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
    // three ships modern ESM (examples/jsm) that the R3F globe imports via drei.
    transpilePackages: ["three"],
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
