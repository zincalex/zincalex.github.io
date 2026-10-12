// Start gate for the Atlas landing entrance (.hero-* in globals.css). Pure module: safe in
// Server Components, client code and Vitest.

/** <html> attribute: "wait" holds every entrance on its first keyframe, "go" plays them. */
export const HERO_ENTER_ATTR = "data-hero";
/** The inline script releases the entrance on its own after this long (JS bundle failed or slow). */
export const HERO_ENTER_FALLBACK_MS = 1500;

/**
 * Runs in <head> before first paint (src/app/layout.tsx). With motion allowed it sets
 * <html data-hero="wait"> and arms the fallback; useHeroEntrance() sets "go" earlier, once
 * the hero has mounted and the web fonts are ready. Reduced motion or no JS: nothing is
 * set, so the content is visible at once. Keep the literals in sync with the constants above.
 */
export const HERO_ENTER_SCRIPT = `(function(){try{var d=document.documentElement;if(!window.matchMedia("(prefers-reduced-motion: no-preference)").matches)return;d.setAttribute("data-hero","wait");setTimeout(function(){d.setAttribute("data-hero","go")},1500)}catch(e){}})()`;
