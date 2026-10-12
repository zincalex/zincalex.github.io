"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import { Fragment } from "react";

import { SkipLink } from "@/components/shared/skip-link";
import { Marquee } from "@/components/ui/marquee";
import { site } from "@/content/site";
import type { SkillGroup } from "@/content/types";
import { cn } from "@/lib/utils";

import {
  ContactSection,
  CountriesSection,
  EducationSection,
  ExperienceSection,
  HonorsSection,
  ProjectsSection,
  PublicationsSection,
} from "./atlas-sections";
import { focusRing, useHydrated } from "./atlas-ui";
import { entrance, skillsEntranceIndex } from "./landing/shared";
import { SplitHero } from "./landing/split/split-hero";
import { ThemeToggle } from "./theme-toggle";

const navLink = cn(
  "px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.15em] text-muted-foreground uppercase transition-colors hover:bg-invert-bg hover:text-invert-fg focus-visible:bg-invert-bg focus-visible:text-invert-fg",
  focusRing,
);

/**
 * Artcraft-style nav: one 48px row on md+.
 * Below md, row 1 holds the name + theme toggle and row 2 a scrollable section list.
 */
function Header() {
  return (
    // hero-nav: slides/fades down on first load (globals.css; static under reduced motion).
    <header className="hero-nav sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur-md">
      <div className="flex flex-col md:h-12 md:flex-row md:items-stretch">
        <div className="flex h-12 items-center justify-between md:contents">
          <a
            href="#main"
            className={cn(
              "flex shrink-0 items-center self-stretch px-5 font-display text-sm font-semibold tracking-[0.08em] text-foreground uppercase",
              focusRing,
            )}
          >
            {site.person.name}
          </a>
          <ThemeToggle className="md:order-last" />
        </div>
        <nav
          aria-label="Sections"
          className="overflow-x-auto border-t border-line px-3.5 [scrollbar-width:none] md:ml-auto md:flex md:items-center md:border-t-0 md:px-4"
        >
          <ul className="flex gap-2 py-2 whitespace-nowrap md:gap-3 md:py-0">
            {site.nav.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className={navLink}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** Square bullet color per skill group (FEAT-001 orbit tokens; light mode remaps them). */
const SKILL_COLOR: Record<SkillGroup["id"], string> = {
  code: "bg-orbit-3",
  agents: "bg-orbit-2",
  aws: "bg-orbit-1",
  libraries: "bg-orbit-4",
  os: "bg-primary",
};

const stripItem =
  "flex items-center gap-3 whitespace-nowrap px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em]";
const stripLabel = "font-mono text-[11px] uppercase tracking-[0.15em]";

/**
 * One marquee run, Artcraft strip style: each group is its category item, then its
 * skills, then a hairline divider (after every group, so repeated runs stay separated).
 */
function SkillsRun() {
  return (
    <>
      {site.skills.map((g) => (
        <Fragment key={g.id}>
          <span className={cn(stripItem, "font-semibold text-foreground")}>
            <span aria-hidden="true" className={cn("size-1.5 shrink-0", SKILL_COLOR[g.id])} />
            {g.label}
          </span>
          {g.items.map((item) => (
            <span key={item} className={cn(stripItem, "font-medium text-muted-foreground")}>
              <span aria-hidden="true" className={cn("size-1 shrink-0 opacity-70", SKILL_COLOR[g.id])} />
              {item}
            </span>
          ))}
          <span aria-hidden="true" className="h-4 w-px shrink-0 self-center bg-line" />
        </Fragment>
      ))}
    </>
  );
}

function SkillsBand() {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const animated = hydrated && !reduced;
  const summary = site.skills.map((g) => `${g.label}: ${g.items.join(", ")}`).join("; ");
  // Fades in last, after the hero's link buttons (photo 0, name 1, headline 2, bio 3…, CTAs, links).
  const reveal = entrance(skillsEntranceIndex(), "border-b border-line", "hero-fade");

  return (
    <section aria-label="Technical skills" className={reveal.className} style={reveal.style}>
      {animated ? (
        <>
          <p className="sr-only">Technical skills. {summary}.</p>
          {/* Fixed h-11: the strip's top edge frames the first desktop viewport (hero min-h = 100svh − 5.75rem). */}
          <div aria-hidden="true" className="relative flex h-11 items-center">
            {/* p-0!: the registry Marquee pads by default; the strip is just the item height. */}
            {/* No pause on hover or focus: the strip always keeps moving (static list under reduced motion). */}
            <Marquee className="w-full p-0! [--duration:60s] [--gap:0px]">
              <SkillsRun />
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background md:w-32" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background md:w-32" />
          </div>
        </>
      ) : (
        <dl className="mx-auto grid max-w-6xl gap-x-8 gap-y-3 px-5 py-5 sm:grid-cols-[auto_1fr]">
          {site.skills.map((g) => (
            <Fragment key={g.id}>
              <dt className={cn(stripLabel, "flex items-center gap-3 font-semibold text-foreground")}>
                <span aria-hidden="true" className={cn("size-1.5 shrink-0", SKILL_COLOR[g.id])} />
                {g.label}
              </dt>
              <dd className="flex flex-wrap gap-x-5 gap-y-1.5">
                {g.items.map((item) => (
                  <span key={item} className={cn(stripLabel, "inline-flex items-center gap-2 font-medium text-muted-foreground")}>
                    <span aria-hidden="true" className={cn("size-1 shrink-0 opacity-70", SKILL_COLOR[g.id])} />
                    {item}
                  </span>
                ))}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * The Atlas page. The landing hero (src/themes/atlas/landing/) holds the About content,
 * so there is no separate About section below.
 */
export function AtlasSite({ photoAvailable }: { photoAvailable: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="dark theme-atlas min-h-screen bg-background font-sans text-foreground">
        <SkipLink />
        <Header />
        <main id="main" tabIndex={-1} className="focus:outline-none">
          <SplitHero photoAvailable={photoAvailable} />
          <SkillsBand />
          <div className="mx-auto max-w-6xl space-y-16 px-5 py-14 md:space-y-24 md:py-20">
            <PublicationsSection />
            <ExperienceSection />
            <EducationSection />
            <ProjectsSection />
            <HonorsSection />
            <CountriesSection />
            <ContactSection />
          </div>
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {site.person.name}
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
