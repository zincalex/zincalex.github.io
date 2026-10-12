"use client";

// Building blocks of the Atlas landing. Each one reads site.ts, takes a className, and
// an optional `i` that opts it into the CSS blur-fade entrance (.hero-blur in
// globals.css, staggered by --i; static under reduced motion).

import { ArrowDown, Mail } from "lucide-react";
import { type CSSProperties, Fragment, useEffect } from "react";

import { ProfilePhoto } from "@/components/shared/profile-photo";
import { site } from "@/content/site";
import type { PhotoFraming } from "@/content/types";
import { availabilityShort } from "@/lib/content";
import { HERO_ENTER_ATTR } from "@/lib/hero-enter";
import { cn } from "@/lib/utils";

import { focusRing, hudLabel, LinkButton } from "../atlas-ui";

export interface BlockProps {
  className?: string;
  /** Stagger index of the blur-fade entrance; omit for no entrance. */
  i?: number;
}

/**
 * className + style for the CSS entrance at stagger index i (globals.css): "hero-blur"
 * (fade, blur to sharp, small rise), "hero-photo" (fade + scale-up) or "hero-fade".
 */
export function entrance(
  i: number | undefined,
  className?: string,
  kind: "hero-blur" | "hero-photo" | "hero-fade" = "hero-blur",
  /** Sub-index inside block i (each word of the name, each link button): +j × --enter-sub. */
  j?: number,
): { className: string; style?: CSSProperties } {
  if (i === undefined) return { className: cn(className) };
  const style: Record<string, number> = { "--i": i };
  if (j !== undefined) style["--j"] = j;
  return { className: cn(kind, className), style: style as CSSProperties };
}

/**
 * Releases the entrance gate (<html data-hero="wait"> from HERO_ENTER_SCRIPT) once the hero
 * has mounted and the web fonts are ready, two frames later so the first frame with the
 * final fonts is painted and hydration's long tasks are over. Before, the CSS entrances
 * started at first paint and their short stagger ran out behind hydration/font swap, so
 * the text appeared all at once.
 */
export function useHeroEntrance() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute(HERO_ENTER_ATTR) !== "wait") return;
    let cancelled = false;
    let raf = 0;
    const go = () => {
      if (!cancelled) root.setAttribute(HERO_ENTER_ATTR, "go");
    };
    const start = () => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(go);
      });
    };
    if (document.fonts?.ready) document.fonts.ready.then(start, start);
    else start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);
}

/** The pulsing availability dot (static under reduced motion). */
export function PingDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative flex size-2 shrink-0", className)}>
      <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  );
}

/** Mono row "● Looking to start a PhD"; nothing at all while person.showAvailability is false. */
export function HeroEyebrow({ className, i }: BlockProps) {
  const short = availabilityShort(site.person);
  if (!short) return null;
  return (
    <p {...entrance(i, cn(hudLabel, "flex items-center gap-2 text-foreground", className))}>
      <PingDot />
      {short}
    </p>
  );
}

/**
 * The page's only h1: the person's name. Size comes from the hero. With an entrance, each
 * word rises in on its own (aria-hidden copies, 90ms apart); the sr-only full name keeps
 * the heading's accessible name "First Last".
 */
export function HeroName({ className, i }: BlockProps) {
  const { name } = site.person;
  const cls = cn("font-display text-foreground", className);
  if (i === undefined) {
    return (
      <h1 id="hero-title" className={cls}>
        {name}
      </h1>
    );
  }
  return (
    <h1 id="hero-title" className={cls} style={{ "--enter-sub": "90ms" } as CSSProperties}>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true">
        {name.split(" ").map((word, k) => (
          <Fragment key={k}>
            {k > 0 ? " " : null}
            <span {...entrance(i, "inline-block", "hero-blur", k)}>{word}</span>
          </Fragment>
        ))}
      </span>
    </h1>
  );
}

/** Bold sans line under the name ("Software engineer"). */
export function HeroHeadline({ className, i }: BlockProps) {
  return (
    <p {...entrance(i, cn("font-display tracking-[-0.03em] text-muted-foreground", className))}>{site.hero.headline}</p>
  );
}

const bioText = "mx-auto w-full max-w-[78ch] text-center leading-relaxed text-foreground/90";

/**
 * About text plus the actions (CTAs + links), centered: every bio paragraph first, then
 * the CTAs and links, on all screen sizes. Entrance order follows the reading order.
 */
export function HeroBody({
  className,
  bioClassName,
  actionsClassName,
  i,
}: BlockProps & { bioClassName?: string; actionsClassName?: string }) {
  const at = (k: number) => (i === undefined ? undefined : i + k);
  const paragraphs = site.person.bio.length;
  return (
    <div className={cn("flex flex-col", className)}>
      {site.person.bio.map((p, k) => (
        <p key={p} {...entrance(at(k), cn(bioText, k > 0 && "mt-4", bioClassName))}>
          {p}
        </p>
      ))}
      <div className={cn("mt-6 flex flex-col items-center gap-4 md:mt-7", actionsClassName)}>
        <HeroCtas i={at(paragraphs)} className="w-full justify-center" />
        <HeroLinks i={at(paragraphs + 1)} className="justify-center" />
      </div>
    </div>
  );
}

const ctaBase = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-none px-6 font-mono text-[11px] font-bold tracking-[0.12em] uppercase transition-colors",
  focusRing,
);

const CTA_CLASS = {
  solid: "bg-invert-bg text-invert-fg transition-opacity hover:opacity-80",
  outline: "border border-line-strong bg-background text-foreground hover:bg-invert-bg hover:text-invert-fg",
} as const;

/** "View research" (solid) and "Get in touch" (outline); side by side from 360px. */
export function HeroCtas({ className, i }: BlockProps) {
  return (
    <div {...entrance(i, cn("flex flex-col gap-3 min-[360px]:flex-row", className))}>
      {site.hero.ctas.map((cta) => {
        const Icon = cta.variant === "solid" ? ArrowDown : Mail;
        return (
          <a
            key={cta.label}
            href={cta.href}
            className={cn(ctaBase, CTA_CLASS[cta.variant], "min-[360px]:flex-1 sm:flex-none")}
          >
            <Icon aria-hidden="true" className="size-4" />
            {cta.label}
          </a>
        );
      })}
    </div>
  );
}

/**
 * Entrance index of the skills strip below the hero, always last: CTAs sit at
 * base + 3 + bio.length and the links one later; the strip comes two blocks after the
 * links, so it starts after the last link button (6 × 50ms sub-stagger).
 */
export function skillsEntranceIndex(): number {
  const base = availabilityShort(site.person) ? 1 : 0;
  return base + 3 + site.person.bio.length + 3;
}

/** GitHub, LinkedIn, Email, Google Scholar, ORCID, CV. */
export function HeroLinks({ className, i }: BlockProps) {
  return (
    <ul aria-label="Profiles and links" className={cn("flex flex-wrap gap-2", className)}>
      {/* Each button enters on its own, 50ms (--enter-sub) after the previous one. */}
      {site.person.links.map((l, k) => (
        <li key={l.label} {...entrance(i, undefined, "hero-blur", k)}>
          <LinkButton link={l} size="sm" className="bg-background/60" />
        </li>
      ))}
    </ul>
  );
}

/** The profile photo (eager, high priority) or the initials avatar. */
export function HeroPhoto({
  available,
  className,
  initialsClassName,
  size = 512,
  framing,
}: {
  available: boolean;
  className?: string;
  initialsClassName?: string;
  size?: number;
  /** Overrides site.person.photo.framing (photo admin preview). */
  framing?: PhotoFraming;
}) {
  return (
    <ProfilePhoto
      available={available}
      framing={framing}
      priority
      width={size}
      height={size}
      className={className}
      initialsClassName={cn("bg-card font-display font-semibold text-primary", initialsClassName)}
    />
  );
}
