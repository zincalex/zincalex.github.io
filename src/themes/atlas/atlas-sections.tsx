"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { PlaceholderBadge } from "@/components/shared/placeholder-badge";
import { site } from "@/content/site";
import type { SectionId, TimelineItem } from "@/content/types";
import { formatMonth, publicationStatusLabel, splitAuthors } from "@/lib/content";
import { REVEAL_ATTR } from "@/lib/reveal";
import { cn } from "@/lib/utils";

import { Chip, focusRing, hudLabel, LinkButton, SectionHeading } from "./atlas-ui";
import { AtlasGlobe } from "./globe/atlas-globe";

function navLabel(id: SectionId) {
  return site.nav.find((n) => n.id === id)?.label ?? id;
}

/** Set on a .atlas-reveal wrapper once it has entered the viewport. */
const REVEALED_ATTR = "data-revealed";

/**
 * Fade + small drop-in of a section the first time it scrolls into view. JS only flips
 * an attribute; the animation is a CSS opacity/transform transition (.atlas-reveal in
 * globals.css), which the compositor keeps running through main-thread work such as the
 * globe mounting. Hidden only under <html data-reveal> (REVEAL_SCRIPT), so content shows
 * without JS and under reduced motion.
 */
function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Hydrated: from now on the observers below are responsible for revealing.
    const root = document.documentElement;
    if (root.getAttribute(REVEAL_ATTR) === "wait") root.setAttribute(REVEAL_ATTR, "on");
    const reveal = () => el.setAttribute(REVEALED_ATTR, "");
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }
    // The huge top margin counts sections already scrolled past as "in view", so a
    // fast scroll (or an anchor jump) that skips the observer never leaves one hidden.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        reveal();
        io.disconnect();
      },
      { rootMargin: "100000px 0px -50px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("atlas-reveal", className)}>
      {children}
    </div>
  );
}

function Section({ id, className, children }: { id: SectionId; className?: string; children: ReactNode }) {
  const headingId = `${id}-title`;
  return (
    <Reveal className={className}>
      <section id={id} aria-labelledby={headingId} className="scroll-mt-28">
        <SectionHeading id={headingId} label={navLabel(id)} />
        {children}
      </section>
    </Reveal>
  );
}

const card = "rounded-lg border border-border bg-card";

export function PublicationsSection() {
  return (
    <Section id="publications">
      <ul className="space-y-6">
        {site.publications.map((pub) => (
          <li key={pub.id}>
            <article aria-labelledby={`pub-${pub.id}`} className={cn(card, "border-l-2 border-l-primary p-6")}>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-primary">
                  {publicationStatusLabel(pub)}
                </span>
                <span>{pub.year}</span>
                {pub.placeholder ? <PlaceholderBadge /> : null}
              </div>
              <h3 id={`pub-${pub.id}`} className="mt-3 text-lg leading-snug font-semibold text-foreground">
                {pub.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {splitAuthors(pub.authors).map((a, i, all) => (
                  <span key={a.name}>
                    {a.isOwner ? <strong className="font-semibold text-foreground">{a.name}</strong> : a.name}
                    {i < all.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{pub.abstract}</p>
              <ul aria-label="Publication links" className="mt-5 flex flex-wrap gap-2">
                {pub.links.map((l) => (
                  <li key={l.label}>
                    <LinkButton link={l} />
                  </li>
                ))}
              </ul>
              {pub.bibtex ? (
                <details className="group mt-5">
                  <summary
                    className={cn(
                      "inline-flex cursor-pointer list-none items-center gap-1 rounded font-mono text-xs text-primary",
                      focusRing,
                    )}
                  >
                    <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                      ›
                    </span>
                    BibTeX
                  </summary>
                  <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground/90">
                    <code>{pub.bibtex}</code>
                  </pre>
                </details>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function ProjectsSection() {
  return (
    <Section id="projects">
      {/* Six equal cards: 2 columns on md, 3 on lg (two even rows). */}
      <ul className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {site.projects.map((p) => {
          // Second clip when available (the TIAGo header GIF on the delivery table).
          const media = p.media?.[1] ?? p.media?.[0];
          return (
            <li key={p.id} className={cn(card, "flex flex-col overflow-hidden")}>
              {media ? (
                // Small fixed-height strip, not a banner: the card keeps the same width as the others.
                // eslint-disable-next-line @next/next/no-img-element -- remote GIF, static export
                <img
                  src={media.src}
                  alt={media.alt}
                  loading="lazy"
                  decoding="async"
                  width={1920}
                  height={1080}
                  className="h-28 w-full border-b border-border bg-background object-cover"
                />
              ) : null}
              <article aria-labelledby={`project-${p.id}`} className="flex flex-1 flex-col p-4 md:p-5">
                {/* Linkable as #project-<id>; scroll-mt clears the sticky header. */}
                <h3 id={`project-${p.id}`} className="scroll-mt-28 text-base font-semibold text-foreground">
                  {p.title}
                  {p.placeholder ? <PlaceholderBadge /> : null}
                </h3>
                {p.period ? <p className="mt-1 font-mono text-xs text-muted-foreground">{p.period}</p> : null}
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{p.summary}</p>
                {p.collaborators?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">With {p.collaborators.join(", ")}</p>
                ) : null}
                <ul aria-label="Tools" className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <li key={t}>
                      <Chip>{t}</Chip>
                    </li>
                  ))}
                </ul>
                <ul aria-label="Project links" className="mt-auto flex flex-wrap gap-2 pt-4 md:pt-5">
                  {p.links.map((l) => (
                    <li key={l.label}>
                      <LinkButton link={l} />
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((it, i) => (
        <li key={`${it.title}-${i}`} className={cn(card, "p-5")}>
          {it.period || it.grade ? (
            // Period left, grade badge right; the badge wraps under the period on narrow cards.
            <div className="mb-1 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              {it.period ? <p className="font-mono text-xs text-muted-foreground">{it.period}</p> : null}
              {it.grade ? (
                <p className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[0.6875rem] leading-4 text-primary">
                  <span className="sr-only">Final grade: </span>
                  {it.grade}
                </p>
              ) : null}
            </div>
          ) : null}
          <h3 className="font-semibold text-foreground">
            {it.title}
            {it.placeholder ? <PlaceholderBadge /> : null}
          </h3>
          {it.org || it.location ? (
            <p className="mt-1 text-sm text-muted-foreground">{[it.org, it.location].filter(Boolean).join(" · ")}</p>
          ) : null}
          {it.details?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
              {it.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
          {it.courses?.length ? (
            <div className="mt-4">
              <p className={cn(hudLabel, "text-muted-foreground")}>Main courses</p>
              {/* One wrapped, dot-separated line; the dots are decorative. */}
              <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs leading-relaxed text-foreground/80">
                {it.courses.map((c, k, all) => (
                  <li key={c} className="inline-flex items-center gap-2">
                    {c}
                    {k < all.length - 1 ? (
                      <span aria-hidden="true" className="text-muted-foreground">
                        ·
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ExperienceSection() {
  return (
    <Section id="experience">
      <Timeline items={site.experience} />
    </Section>
  );
}

export function EducationSection() {
  return (
    <Section id="education">
      <Timeline items={site.education} />
    </Section>
  );
}

export function HonorsSection() {
  return (
    <Section id="honors">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {site.honors.map((h, i) => (
          <li key={`${h.title}-${i}`} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            {/* min-w-0 + flex-1: the text takes the row's full width, so it only wraps when the card is narrow. */}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {h.title}
                {h.placeholder ? <PlaceholderBadge /> : null}
              </p>
              {h.org || h.location ? (
                <p className="text-sm text-muted-foreground">{[h.org, h.location].filter(Boolean).join(" · ")}</p>
              ) : null}
              {h.details ? <p className="mt-2 text-sm leading-relaxed text-foreground/90">{h.details}</p> : null}
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground sm:order-none">
              <time dateTime={h.date}>{formatMonth(h.date)}</time>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** A quiet travel note: the dotted globe only, no counters. */
export function CountriesSection() {
  return (
    <Section id="countries">
      <AtlasGlobe />
    </Section>
  );
}

export function ContactSection() {
  return (
    <Section id="contact">
      <div className={cn(card, "p-6 md:p-8")}>
        <ul aria-label="Contact links" className="flex flex-wrap gap-2">
          {site.person.links.map((l) => (
            <li key={l.label}>
              <LinkButton link={l} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
