import { cn } from "@/lib/utils";

/** First focusable element on every style page; jumps to <main id="main">. */
export function SkipLink({ className }: { className?: string }) {
  return (
    <a
      href="#main"
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900",
        className,
      )}
    >
      Skip to content
    </a>
  );
}
