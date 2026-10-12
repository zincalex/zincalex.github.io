import { site } from "@/content/site";
import type { PhotoFraming } from "@/content/types";
import { initials } from "@/lib/content";
import { photoAspect, photoLayout } from "@/lib/photo-framing";
import { cn } from "@/lib/utils";

/**
 * Profile photo from site.person.photo, or an initials avatar while the file
 * is missing. `available` comes from hasProfilePhoto() in the route's page.tsx.
 */
export function ProfilePhoto({
  available,
  className,
  initialsClassName,
  width,
  height,
  priority = false,
  framing,
}: {
  available: boolean;
  /** Overrides site.person.photo.framing (live preview in the photo admin). */
  framing?: PhotoFraming;
  /** Size, shape and border; applied to both the photo and the avatar. */
  className?: string;
  /** Colours and font of the initials avatar. */
  initialsClassName?: string;
  width: number;
  height: number;
  /** Eager, high-priority load (the photo is the LCP image of some Atlas landings). */
  priority?: boolean;
}) {
  const { photo, name } = site.person;
  if (available) {
    // Size the photo to its own aspect ratio, zoom around the focal point (x, y) and move it
    // to the frame centre (src/lib/photo-framing.ts).
    const layout = photoLayout(framing ?? photo.framing, photoAspect(photo));
    return (
      <span className={cn("relative block overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, images unoptimized */}
        <img
          src={photo.src}
          alt={photo.alt}
          width={width}
          height={height}
          {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
          className="absolute max-w-none object-cover"
          style={{
            width: `${layout.width}%`,
            height: `${layout.height}%`,
            left: `${layout.left}%`,
            top: `${layout.top}%`,
            objectPosition: layout.objectPosition,
          }}
        />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={`Initials avatar of ${name}`}
      className={cn("flex items-center justify-center select-none", className, initialsClassName)}
    >
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
}
