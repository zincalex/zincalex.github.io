import { cn } from "@/lib/utils";

/** Availability pill with a softly pulsing dot (static under reduced motion); renders nothing without text. */
export function AvailabilityPill({
  text,
  className,
  dotClassName,
}: {
  text?: string;
  className?: string;
  /** Background colour of the dot, e.g. "bg-primary". */
  dotClassName?: string;
}) {
  if (!text) return null;
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm", className)}>
      <span aria-hidden="true" className="relative flex size-2 shrink-0">
        <span
          className={cn(
            "absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping",
            dotClassName,
          )}
        />
        <span className={cn("relative inline-flex size-2 rounded-full", dotClassName)} />
      </span>
      {text}
    </p>
  );
}
