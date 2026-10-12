"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const STYLE_ROUTES = [
  { href: "/", label: "Atlas" },
  { href: "/editorial/", label: "Editorial" },
] as const;

function normalize(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * Small inline pill (rendered in each footer) to switch between the two
 * styles. It sits in the page flow, so it never covers content.
 * Neutral by default; each theme restyles it via the className props.
 *
 * Uses plain <a> (full page load) on purpose: each style scopes its own
 * fonts and palette to its route, which a client-side navigation would keep.
 */
export function StyleSwitcher({
  className,
  linkClassName,
  activeLinkClassName,
}: {
  className?: string;
  linkClassName?: string;
  activeLinkClassName?: string;
}) {
  const pathname = normalize(usePathname() ?? "/");
  return (
    <nav
      aria-label="Style switcher"
      className={cn("inline-flex items-center gap-2 rounded-full border border-zinc-200 p-1 text-xs", className)}
    >
      <span className="pl-2 text-current opacity-70">Style</span>
      <ul className="flex items-center gap-0.5">
        {STYLE_ROUTES.map((r) => {
          const active = pathname === r.href;
          return (
            <li key={r.href}>
              <a
                href={r.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-2.5 py-1 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900",
                  linkClassName,
                  active && cn("bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white", activeLinkClassName),
                )}
              >
                {r.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
