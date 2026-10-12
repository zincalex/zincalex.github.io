import type { ReactNode } from "react";

import { site } from "@/content/site";
import type { SiteLink } from "@/content/types";
import { cn } from "@/lib/utils";

/** Small dashed "TODO" badge, shown only while site.showPlaceholderBadges is true. */
export function PlaceholderBadge({ className }: { className?: string }) {
  if (!site.showPlaceholderBadges) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center rounded border border-dashed border-current px-1 py-px align-middle font-mono text-[0.625rem] leading-none font-semibold tracking-wide uppercase opacity-70",
        className,
      )}
      title="Placeholder: to be filled in"
    >
      TODO
    </span>
  );
}

/** External sites and PDFs (e.g. /cv.pdf) open in a new tab. */
function isExternal(href: string) {
  return /^https?:\/\//.test(href) || /\.pdf($|[?#])/i.test(href);
}

/**
 * Real links render as <a> (external ones open in a new tab);
 * placeholder links render as non-interactive text plus a TODO badge,
 * so the site never ships broken hrefs.
 */
export function MaybeLink({
  link,
  className,
  badgeClassName,
  children,
}: {
  link: SiteLink;
  className?: string;
  badgeClassName?: string;
  children?: ReactNode;
}) {
  const content = children ?? link.label;
  if (link.placeholder) {
    return (
      <span className={cn("cursor-default opacity-80", className)} aria-disabled="true">
        {content}
        <PlaceholderBadge className={badgeClassName} />
      </span>
    );
  }
  const external = isExternal(link.href);
  return (
    <a
      href={link.href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {content}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
