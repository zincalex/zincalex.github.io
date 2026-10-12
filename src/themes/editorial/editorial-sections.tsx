"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MaybeLink, PlaceholderBadge } from "@/components/shared/placeholder-badge";
import BasicAccordion from "@/components/smoothui/basic-accordion";
import AnimatedTabs from "@/components/smoothui/animated-tabs";
import { TextReveal } from "@/components/unlumen-ui/text-reveal";
import { site } from "@/content/site";
import type { Project, Publication, TimelineItem } from "@/content/types";
import {
  formatMonth,
  projectCategories,
  publicationStatusLabel,
  roleLine,
  shownAvailability,
  splitAuthors,
  type ProjectFilter,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { EditorialCountries } from "./editorial-map";
import { focusRing, Section, smallCaps, textLink } from "./editorial-ui";

const prose = "max-w-prose text-lg leading-8 text-foreground/90";

/** First paragraph animates in word by word; under reduced motion it is plain text at full opacity. */
export function AboutSection({ animate }: { animate: boolean }) {
  const [lead, ...rest] = site.person.bio;
  const leadClass = "max-w-prose font-serif text-2xl leading-relaxed text-foreground";
  return (
    <Section id="about" className="border-t-0 pt-0 lg:pt-0">
      {animate ? (
        <TextReveal as="p" text={lead} splitBy="words" staggerDelay={0.03} className={leadClass} />
      ) : (
        <p className={leadClass}>{lead}</p>
      )}
      <div className="mt-6 space-y-5">
        {rest.map((p) => (
          <p key={p} className={prose}>
            {p}
          </p>
        ))}
      </div>
      <p className="mt-6 text-base text-muted-foreground">
        <span className={cn("text-foreground", smallCaps)}>Interests</span> —{" "}
        {site.person.interests.join(" · ")}
      </p>
    </Section>
  );
}

function CopyBibtex({ bibtex }: { bibtex: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bibtex);
      setState("copied");
    } catch {
      setState("error");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  };
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className={cn(
          "rounded-[2px] border border-border bg-card px-3 py-1 text-sm transition-colors hover:border-primary hover:text-primary",
          focusRing,
        )}
      >
        Copy BibTeX
      </button>
      <span role="status" className="text-sm text-muted-foreground">
        {state === "copied" ? "Copied to clipboard" : state === "error" ? "Copy failed, select the text instead" : ""}
      </span>
    </div>
  );
}

function PublicationEntry({ pub }: { pub: Publication }) {
  const items = [
    {
      id: `${pub.id}-abstract`,
      title: "Abstract",
      content: <p className="max-w-prose text-base leading-7 text-foreground/90">{pub.abstract}</p>,
    },
    ...(pub.bibtex
      ? [
          {
            id: `${pub.id}-bibtex`,
            title: "BibTeX",
            content: (
              <>
                <pre className="overflow-x-auto rounded-[2px] border border-border bg-background p-4 font-mono text-xs leading-relaxed">
                  <code>{pub.bibtex}</code>
                </pre>
                <CopyBibtex bibtex={pub.bibtex} />
              </>
            ),
          },
        ]
      : []),
  ];
  return (
    <article aria-labelledby={`pub-${pub.id}`}>
      <p className={cn("text-sm text-primary", smallCaps)}>
        {publicationStatusLabel(pub)} · {pub.year}
        {pub.placeholder ? <PlaceholderBadge /> : null}
      </p>
      <h3 id={`pub-${pub.id}`} className="mt-2 font-serif text-xl leading-snug font-medium">
        {pub.title}
      </h3>
      <p className="mt-2 text-base text-muted-foreground">
        {splitAuthors(pub.authors).map((a, i, all) => (
          <span key={a.name}>
            {a.isOwner ? (
              <span className="text-foreground underline decoration-primary decoration-1 underline-offset-4">
                {a.name}
              </span>
            ) : (
              a.name
            )}
            {i < all.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>
      <ul aria-label="Publication links" className={cn("mt-3 flex flex-wrap gap-x-5 gap-y-1 text-base", smallCaps)}>
        {pub.links.map((l) => (
          <li key={l.label}>
            <MaybeLink link={l} className={textLink} />
          </li>
        ))}
      </ul>
      <BasicAccordion items={items} allowMultiple className="editorial-accordion mt-6 rounded-[2px] bg-card" />
    </article>
  );
}

export function PublicationsSection() {
  return (
    <Section id="publications">
      <ol className="space-y-12">
        {site.publications.map((pub) => (
          <li key={pub.id}>
            <PublicationEntry pub={pub} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

function ProjectEntry({ project }: { project: Project }) {
  // The TIAGo entry shows its second GIF (the repo's header clip: objects placed on the delivery table).
  const media = project.media?.[1] ?? project.media?.[0];
  return (
    <article aria-labelledby={`project-${project.id}`} className={cn(media && "grid gap-6 md:grid-cols-2")}>
      <div>
        <h3 id={`project-${project.id}`} className="font-serif text-xl leading-snug font-medium">
          {project.title}
          {project.placeholder ? <PlaceholderBadge /> : null}
        </h3>
        {project.period || project.collaborators?.length ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {[project.period, project.collaborators?.length ? `with ${project.collaborators.join(", ")}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <p className="mt-3 text-base leading-7 text-foreground/90">{project.summary}</p>
        <ul aria-label="Tools" className={cn("mt-3 flex flex-wrap gap-x-3 text-sm text-muted-foreground", smallCaps)}>
          {project.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <ul aria-label="Project links" className={cn("mt-2 flex flex-wrap gap-x-5 text-base", smallCaps)}>
          {project.links.map((l) => (
            <li key={l.label}>
              <MaybeLink link={l} className={textLink} />
            </li>
          ))}
        </ul>
      </div>
      {media ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote GIF, static export */}
          <img
            src={media.src}
            alt={media.alt}
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            className="aspect-video h-auto w-full rounded-[2px] border border-border bg-muted object-cover"
          />
          <figcaption className="mt-2 font-serif text-sm text-muted-foreground italic">{media.alt}.</figcaption>
        </figure>
      ) : null}
    </article>
  );
}

const TABS_ID = "editorial-projects";

export function ProjectsSection() {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  // Entries only fade in after the reader switches tabs, so the server HTML is fully visible.
  const [touched, setTouched] = useState(false);
  const shown = site.projects.filter((p) => filter === "all" || p.category === filter);
  return (
    <Section id="projects">
      <AnimatedTabs
        tabs={projectCategories}
        activeTab={filter}
        onChange={(id) => {
          setTouched(true);
          setFilter(id as ProjectFilter);
        }}
        variant="underline"
        layoutId={TABS_ID}
        className="editorial-tabs mb-8"
      />
      <div
        role="tabpanel"
        id={`${TABS_ID}-panel`}
        aria-labelledby={`${TABS_ID}-tab-${filter}`}
        tabIndex={0}
        className={focusRing}
      >
        <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2">
          {shown.map((p) => (
            <motion.li
              key={`${filter}-${p.id}`}
              initial={touched ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(p.media?.length && "md:col-span-2")}
            >
              <ProjectEntry project={p} />
            </motion.li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function CvRows({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="divide-y divide-border">
      {items.map((it, i) => (
        <li key={`${it.title}-${i}`} className="grid gap-1 py-5 sm:grid-cols-[8rem_1fr] sm:gap-6">
          <p className="text-sm text-muted-foreground tabular-nums">{it.period}</p>
          <div>
            <h3 className="font-serif text-lg leading-snug font-medium">
              {it.title}
              {it.placeholder ? <PlaceholderBadge /> : null}
            </h3>
            {it.org || it.location ? (
              <p className="mt-0.5 text-base text-muted-foreground">{[it.org, it.location].filter(Boolean).join(", ")}</p>
            ) : null}
            {it.grade ? <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{it.grade}</p> : null}
            {it.details?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
                {it.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ExperienceSection() {
  return (
    <Section id="experience">
      <CvRows items={site.experience} />
    </Section>
  );
}

export function EducationSection() {
  return (
    <Section id="education">
      <CvRows items={site.education} />
    </Section>
  );
}

export function HonorsSection() {
  return (
    <Section id="honors">
      <ul className="space-y-5">
        {site.honors.map((h, i) => (
          <li key={`${h.title}-${i}`} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
            <span className="text-sm text-muted-foreground tabular-nums">
              <time dateTime={h.date}>{formatMonth(h.date)}</time>
            </span>
            <div>
              <p className="font-serif text-lg leading-snug font-medium">
                {h.title}
                {h.placeholder ? <PlaceholderBadge /> : null}
              </p>
              {h.org || h.location ? (
                <p className="mt-0.5 text-base text-muted-foreground">{[h.org, h.location].filter(Boolean).join(", ")}</p>
              ) : null}
              {h.details ? <p className="mt-2 max-w-prose text-base leading-7 text-foreground/90">{h.details}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function CountriesSection({ pulse }: { pulse: boolean }) {
  return (
    <Section id="countries">
      <EditorialCountries pulse={pulse} />
    </Section>
  );
}

export function ContactSection() {
  const { person } = site;
  const email = person.links.find((l) => l.kind === "email");
  const others = person.links.filter((l) => l.kind !== "email");
  return (
    <Section id="contact">
      {email ? (
        <p className="font-serif text-3xl leading-tight md:text-4xl">
          <MaybeLink link={email} className={textLink} badgeClassName="font-sans">
            {email.placeholder ? "Email address to be added" : email.href.replace(/^mailto:/, "")}
          </MaybeLink>
        </p>
      ) : null}
      {shownAvailability(person) ? <p className="mt-4 font-serif text-xl italic">{shownAvailability(person)}.</p> : null}
      <p className="mt-2 text-base text-muted-foreground">
        {roleLine(person)}, {person.location}
      </p>
      <ul aria-label="Contact links" className={cn("mt-6 flex flex-wrap gap-x-6 gap-y-2 text-lg", smallCaps)}>
        {others.map((l) => (
          <li key={l.label}>
            <MaybeLink link={l} className={textLink} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
