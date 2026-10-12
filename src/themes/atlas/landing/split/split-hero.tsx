"use client";

import type { CSSProperties } from "react";

import { site } from "@/content/site";
import type { PhotoFraming } from "@/content/types";
import { availabilityShort } from "@/lib/content";
import { resolvePhotoFraming } from "@/lib/photo-framing";
import { cn } from "@/lib/utils";

import { HeroBody, HeroEyebrow, HeroHeadline, HeroName, useHeroEntrance } from "../shared";
import { DepthField } from "./depth-field";
import { PhotoOrbit } from "./photo-orbit";

export interface HeroProps {
  /** hasProfilePhoto() from the route's page.tsx; false renders the initials avatar. */
  photoAvailable: boolean;
  /** Overrides site.person.photo.framing (live preview in the photo admin). */
  framing?: PhotoFraming;
}

/**
 * The Atlas landing (Split intro) over a quiet dot field: the portrait in liquid,
 * colour-cycling rings side by side with the name and headline (stacked on phones),
 * then the centered bio and the actions.
 */
export function SplitHero({ photoAvailable, framing = site.person.photo.framing }: HeroProps) {
  // The eyebrow (availability) renders only while person.showAvailability is true.
  const eyebrow = Boolean(availabilityShort(site.person));
  const base = eyebrow ? 1 : 0;
  // Starts the nav/photo/text/skills entrance once mounted and fonts are ready (globals.css).
  useHeroEntrance();
  return (
    <section
      id="about"
      aria-labelledby="hero-title"
      className="relative isolate scroll-mt-12 overflow-hidden border-b border-line md:flex md:min-h-[calc(100svh-5.75rem)] md:items-center"
    >
      {/* Drifting dot field (no cursor interaction); faded behind the centered text. */}
      <DepthField className="-z-10 [mask-image:radial-gradient(ellipse_at_center,rgb(0_0_0/0.3)_0_35%,black_80%)]" />
      <div className="mx-auto w-full max-w-6xl px-5 py-10 md:py-12 lg:py-10 short:py-5">
        {/*
          One shrink-to-fit column, centered in the page: its width is the photo + name row
          (the widest item), and the bio/CTA/links block below is `w-0 min-w-full`, so it adds
          no width of its own and fills exactly that row. Before, the row was sized by its
          content and the bio by max-w-[78ch] in a separate full-width block, so their edges
          never lined up (bio ~80px inside the row at 1440px, a little outside at 1024px).
          On phones the column is the full content width and everything stacks centered.
        */}
        <div className="mx-auto w-fit max-w-full">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-center md:gap-10 md:text-left lg:gap-12 short:gap-8">
            <PhotoOrbit
              i={0}
              available={photoAvailable}
              framing={framing}
              // Diameter from the photo framing (photo admin); capped on small and short screens.
              style={{ "--photo-size": `${resolvePhotoFraming(framing).size}px` } as CSSProperties}
              className="size-[min(var(--photo-size),70vw)] md:size-[min(var(--photo-size),30vw)] short:size-[min(var(--photo-size),180px)]"
            />
            <div className="min-w-0">
              <HeroEyebrow i={1} className="justify-center md:justify-start" />
              <HeroName
                i={base + 1}
                className={cn(
                  "text-[clamp(2.5rem,4.4vw,4rem)] leading-[0.95] font-[700] tracking-[-0.03em] [font-stretch:115%] short:text-[2.5rem]",
                  eyebrow && "mt-5 short:mt-4",
                )}
              />
              <HeroHeadline
                i={base + 2}
                className="mt-3 text-[clamp(1.5rem,2vw,2rem)] leading-[1.1] font-semibold [font-stretch:110%]"
              />
            </div>
          </div>
          <HeroBody
            i={base + 3}
            className="mt-8 w-0 min-w-full md:mt-10 lg:mt-8 short:mt-5"
            bioClassName="text-base md:max-w-none short:text-[15px] short:leading-6"
            actionsClassName="short:mt-5"
          />
        </div>
      </div>
    </section>
  );
}
