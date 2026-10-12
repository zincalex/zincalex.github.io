import { hasProfilePhoto } from "@/lib/profile-photo";
import { AtlasSite } from "@/themes/atlas/AtlasSite";

// Research Atlas is the site's only public style, served at `/`.
// Geist / Geist Mono come from the root layout; the palette lives in .theme-atlas (globals.css).
export default function HomePage() {
  return <AtlasSite photoAvailable={hasProfilePhoto()} />;
}
