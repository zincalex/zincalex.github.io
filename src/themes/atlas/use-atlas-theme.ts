"use client";

import { useSyncExternalStore } from "react";

import { type AtlasTheme, THEME_STORAGE_KEY } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme currently applied to <html> (client only). */
export function readAtlasTheme(): AtlasTheme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): AtlasTheme {
  return "dark";
}

/** Current Atlas theme, read from <html data-theme>. "dark" during SSR and hydration. */
export function useAtlasTheme(): AtlasTheme {
  return useSyncExternalStore(subscribe, readAtlasTheme, getServerSnapshot);
}

/** Applies a theme to <html> and remembers it (localStorage may be unavailable). */
export function setAtlasTheme(theme: AtlasTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
}
