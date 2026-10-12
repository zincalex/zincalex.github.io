"use client";

import {
  BriefcaseBusiness,
  Code,
  FileText,
  FileUser,
  FolderGit2,
  Globe,
  GraduationCap,
  IdCard,
  Mail,
  Play,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { MaybeLink } from "@/components/shared/placeholder-badge";
import type { LinkKind, SiteLink } from "@/content/types";
import { cn } from "@/lib/utils";

/** Visible teal focus ring on the dark background. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ICONS: Record<LinkKind, LucideIcon> = {
  // lucide-react has no brand icons; these are neutral stand-ins.
  github: FolderGit2,
  linkedin: BriefcaseBusiness,
  email: Mail,
  scholar: GraduationCap,
  orcid: IdCard,
  cv: FileUser,
  arxiv: FileText,
  pdf: FileText,
  code: Code,
  website: Globe,
  video: Play,
};

/** Artcraft-style mono label: uppercase, 11px, wide tracking. */
export const hudLabel = "font-mono text-[11px] font-medium uppercase tracking-[0.15em]";

/** Outline link button; placeholder links render as text + TODO badge. `sm` = square hairline HUD variant. */
export function LinkButton({ link, className, size }: { link: SiteLink; className?: string; size?: "sm" }) {
  const Icon = ICONS[link.kind];
  return (
    <MaybeLink
      link={link}
      className={cn(
        "inline-flex items-center gap-1.5 border text-foreground",
        size === "sm" ? cn("h-9 rounded-none border-line px-3", hudLabel) : "rounded-md border-border px-3 py-1.5 text-sm",
        !link.placeholder && cn("transition-colors hover:border-primary hover:text-primary", focusRing),
        link.placeholder && "border-dashed text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} />
      {link.label}
    </MaybeLink>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Section title: the small uppercase mono label (teal in dark, rust in light). */
export function SectionHeading({ id, label }: { id: string; label: string }) {
  return (
    <h2 id={id} className="mb-6 font-mono text-sm font-medium tracking-[0.2em] text-primary uppercase md:mb-8 md:text-base">
      {label}
    </h2>
  );
}

const subscribe = () => () => {};

/** false during SSR and hydration, true afterwards (avoids hydration mismatches). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
