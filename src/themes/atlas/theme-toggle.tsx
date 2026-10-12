"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { focusRing } from "./atlas-ui";
import { setAtlasTheme, useAtlasTheme } from "./use-atlas-theme";

/** Square nav button that switches Atlas between dark (default) and the Editorial paper palette. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useAtlasTheme();
  const light = theme === "light";

  // In development, Strict Mode's remount resets <html> attributes and drops the
  // one the inline script set. Re-apply the stored value; a no-op in production.
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") document.documentElement.setAttribute("data-theme", stored);
    } catch {
      // Storage unavailable: keep the default.
    }
  }, []);

  const Icon = light ? Sun : Moon;

  return (
    <button
      type="button"
      aria-pressed={light}
      aria-label="Light mode"
      title="Toggle light mode"
      onClick={() => setAtlasTheme(light ? "dark" : "light")}
      className={cn(
        "inline-flex size-12 items-center justify-center border-l border-line text-muted-foreground transition-colors hover:bg-invert-bg hover:text-invert-fg",
        focusRing,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
