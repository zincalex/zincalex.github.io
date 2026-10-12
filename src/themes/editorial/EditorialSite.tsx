"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import { AvailabilityPill } from "@/components/shared/availability-pill";
import { MaybeLink } from "@/components/shared/placeholder-badge";
import { ProfilePhoto } from "@/components/shared/profile-photo";
import { SkipLink } from "@/components/shared/skip-link";
import { StyleSwitcher } from "@/components/shared/style-switcher";
import ScrollProgress from "@/components/smoothui/scroll-progress";
import { FloatingTooltip } from "@/components/unlumen-ui/floating-tooltip";
import { site } from "@/content/site";
import { SECTION_IDS, type SectionId } from "@/content/types";
import { roleLine, shownAvailability } from "@/lib/content";
import { cn } from "@/lib/utils";
import {
  AboutSection,
  ContactSection,
  CountriesSection,
  EducationSection,
  ExperienceSection,
  HonorsSection,
  ProjectsSection,
  PublicationsSection,
} from "./editorial-sections";
import { focusRing, navLabel, sectionNumber, smallCaps, textLink, useActiveSection, useHydrated } from "./editorial-ui";

function SectionsToc({ active }: { active: SectionId }) {
  return (
    <nav aria-label="Sections" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
      <ol className="flex gap-5 py-1 whitespace-nowrap lg:flex-col lg:gap-0.5">
        {SECTION_IDS.map((id) => {
          const current = id === active;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "group flex items-baseline gap-3 py-1 text-sm transition-colors",
                  current ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  focusRing,
                )}
              >
                <span aria-hidden="true" className="text-xs tabular-nums opacity-70">
                  {sectionNumber(id)}
                </span>
                <span className={cn(current && "underline decoration-1 underline-offset-4")}>{navLabel(id)}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Sidebar({ active, photoAvailable }: { active: SectionId; photoAvailable: boolean }) {
  const { person } = site;
  return (
    <header className="lg:sticky lg:top-12 lg:col-span-4 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pb-8">
      <div className="flex items-start gap-5 lg:block">
        <ProfilePhoto
          available={photoAvailable}
          width={112}
          height={140}
          className={cn(
            "aspect-[4/5] w-20 shrink-0 rounded-sm border border-border lg:w-28",
            photoAvailable && "grayscale-[40%] sepia-[15%]",
          )}
          initialsClassName="bg-card font-serif text-3xl text-primary italic lg:text-4xl"
        />
        <div className="lg:mt-6">
          <h1 className="font-serif text-4xl leading-tight font-normal tracking-tight">{person.name}</h1>
          <p className="mt-2 text-base text-foreground">{roleLine(person)}</p>
        </div>
      </div>
      <AvailabilityPill
        text={shownAvailability(person)}
        className="mt-4 border-primary/30 bg-card text-foreground"
        dotClassName="bg-primary"
      />
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Research with {person.department}
        <br />
        {person.affiliation}
      </p>
      <ul aria-label="Profiles" className={cn("mt-4 flex flex-wrap gap-x-4 gap-y-1 text-base", smallCaps)}>
        {person.links.map((l) => (
          <li key={l.label}>
            <MaybeLink link={l} className={textLink} />
          </li>
        ))}
      </ul>
      <div className="mt-8 border-t border-border pt-4">
        <SectionsToc active={active} />
      </div>
    </header>
  );
}

export function EditorialSite({ photoAvailable }: { photoAvailable: boolean }) {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  // Server HTML and the hydration pass always use the animated variant; the
  // reduced-motion preference is only applied once hydrated (no mismatch).
  const motionOn = !(hydrated && reduced);
  const active = useActiveSection(SECTION_IDS);
  return (
    <MotionConfig reducedMotion="user">
      <div className="theme-editorial min-h-screen bg-background font-sans text-foreground">
        <SkipLink />
        <ScrollProgress variant="bar" position="top" thickness={2} color="var(--primary)" />
        <FloatingTooltip.Provider variant="outline">
          <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-12 lg:pt-16">
            <Sidebar active={active} photoAvailable={photoAvailable} />
            <main id="main" tabIndex={-1} className="mt-4 focus:outline-none lg:col-span-8 lg:mt-0">
              <AboutSection animate={motionOn} />
              <PublicationsSection />
              <ProjectsSection />
              <ExperienceSection />
              <EducationSection />
              <HonorsSection />
              <CountriesSection pulse={hydrated && !reduced} />
              <ContactSection />
            </main>
          </div>
        </FloatingTooltip.Provider>
        <footer className="mt-8 border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8 md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} {site.person.name}
              <span className="font-serif italic"> · Set in Newsreader &amp; Inter</span>
            </p>
            <StyleSwitcher
              className="self-start border-border bg-card md:self-auto"
              linkClassName="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-primary"
              activeLinkClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            />
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
