// Server-only (uses node:fs): import it from page.tsx files, never from a client component.
import { existsSync } from "node:fs";
import path from "node:path";

import { site } from "@/content/site";

/**
 * True when site.person.photo.src (e.g. /images/profile.jpg) exists in public/.
 * Checked at build time (and per request in `next dev`), so dropping the file
 * in and rebuilding swaps the initials avatar for the real photo without a
 * 404 request for a missing image.
 */
export function hasProfilePhoto(src: string = site.person.photo.src): boolean {
  if (!src.startsWith("/")) return true; // remote URL: assume it exists
  return existsSync(path.join(process.cwd(), "public", src));
}
