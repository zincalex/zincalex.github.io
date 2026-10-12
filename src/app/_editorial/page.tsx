import type { Metadata } from "next";
import { hasProfilePhoto } from "@/lib/profile-photo";
import { EditorialSite } from "@/themes/editorial/EditorialSite";

// Hidden: the leading underscore makes `_editorial` a private folder, so Next.js does not
// route or export it. Rename the folder back to `editorial` to serve it at /editorial/.

export const metadata: Metadata = { title: "Editorial" };

export default function EditorialPage() {
  return <EditorialSite photoAvailable={hasProfilePhoto()} />;
}
