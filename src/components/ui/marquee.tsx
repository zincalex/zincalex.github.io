import { type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string
  /**
   * Content to be displayed in the marquee
   */
  children: React.ReactNode
  /**
   * Number of times to repeat the content
   * @default 4
   */
  repeat?: number
}

/** Magic UI Marquee, trimmed to the horizontal, never-pausing strip the Atlas skills band uses. */
export function Marquee({
  className,
  children,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex flex-row gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        className
      )}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className="flex shrink-0 animate-marquee flex-row justify-around gap-(--gap)"
          >
            {children}
          </div>
        ))}
    </div>
  )
}
