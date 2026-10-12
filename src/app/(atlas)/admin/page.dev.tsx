import type { Metadata } from "next";

import photoFraming from "@/content/photo-framing.json";
import { resolvePhotoFraming } from "@/lib/photo-framing";
import { hasProfilePhoto } from "@/lib/profile-photo";

import { PhotoAdmin } from "./photo-admin";

// Dev-only route: the `.dev.tsx` page extension is only enabled for `next dev`
// (next.config.ts), so /admin is never built into the static export.
export const metadata: Metadata = {
  title: "Photo admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <PhotoAdmin photoAvailable={hasProfilePhoto()} saved={resolvePhotoFraming(photoFraming)} />;
}
