// Start gate for the Atlas section reveals (.atlas-reveal in globals.css). Pure module: safe in
// Server Components, client code and Vitest.

/** <html> attribute: "wait" while the page hydrates, "on" once Reveal observers run. */
export const REVEAL_ATTR = "data-reveal";
/** Without a hydrated Reveal by then (JS failed or very slow), the inline script drops the gate. */
export const REVEAL_FALLBACK_MS = 4000;

/**
 * Runs in <head> before first paint (src/app/layout.tsx). With motion allowed it sets
 * <html data-reveal="wait">, the only state in which an unrevealed section is hidden, and
 * removes it after REVEAL_FALLBACK_MS unless a Reveal has switched it to "on". Reduced
 * motion or no JS: nothing is set, so every section is visible at once. Keep the literals
 * in sync with the constants above.
 */
export const REVEAL_SCRIPT = `(function(){try{var d=document.documentElement;if(!window.matchMedia("(prefers-reduced-motion: no-preference)").matches)return;d.setAttribute("data-reveal","wait");setTimeout(function(){if(d.getAttribute("data-reveal")==="wait")d.removeAttribute("data-reveal")},4000)}catch(e){}})()`;
