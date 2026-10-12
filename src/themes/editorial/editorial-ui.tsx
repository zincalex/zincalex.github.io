"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { SECTION_IDS, type SectionId } from "@/content/types";
import { cn } from "@/lib/utils";

export const focusRing =
  "rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Inline text link: ink colour, accent underline. */
export const textLink = cn(
  "underline decoration-primary/40 decoration-1 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary",
  focusRing,
);

/** Small-caps label used for tags, kickers and link lists. */
export const smallCaps = "[font-variant-caps:all-small-caps] tracking-[0.08em]";

const noop = () => () => {};

/** false during SSR and the hydration pass, true afterwards (no setState in an effect). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function navLabel(id: SectionId) {
  return site.nav.find((n) => n.id === id)?.label ?? id;
}

/** '01', '02', ... in the fixed section order. */
export function sectionNumber(id: SectionId) {
  return String(SECTION_IDS.indexOf(id) + 1).padStart(2, "0");
}

/**
 * The section currently crossing a thin band near the top of the viewport.
 * Updates happen in the observer callback, never synchronously in the effect.
 */
export function useActiveSection(ids: readonly SectionId[]): SectionId {
  const [active, setActive] = useState<SectionId>(ids[0]);
  useEffect(() => {
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = ids.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function Section({
  id,
  title,
  className,
  children,
}: {
  id: SectionId;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("scroll-mt-8 border-t border-border py-12 lg:py-16", className)}
    >
      <p aria-hidden="true" className="font-sans text-xs font-medium tracking-[0.2em] text-primary tabular-nums">
        {sectionNumber(id)}
      </p>
      <h2 id={headingId} className="mt-2 mb-8 font-serif text-3xl leading-tight font-normal tracking-tight">
        {title ?? navLabel(id)}
      </h2>
      {children}
    </section>
  );
}
