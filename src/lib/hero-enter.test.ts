import { describe, expect, it, vi } from "vitest";

import { HERO_ENTER_ATTR, HERO_ENTER_FALLBACK_MS, HERO_ENTER_SCRIPT } from "./hero-enter";

/** Runs the inline script with a fake matchMedia + document; returns the attribute writes and timers. */
function runScript(motionOk: boolean) {
  const attrs: Record<string, string> = {};
  const timers: { fn: () => void; ms: number }[] = [];
  const window = { matchMedia: () => ({ matches: motionOk }) };
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attrs[name] = value;
      },
    },
  };
  const setTimeout = vi.fn((fn: () => void, ms: number) => timers.push({ fn, ms }));
  new Function("window", "document", "setTimeout", HERO_ENTER_SCRIPT)(window, document, setTimeout);
  return { attrs, timers };
}

describe("HERO_ENTER_SCRIPT", () => {
  it("holds the entrance and releases it after the fallback delay", () => {
    const { attrs, timers } = runScript(true);
    expect(attrs).toEqual({ [HERO_ENTER_ATTR]: "wait" });
    expect(timers.map((t) => t.ms)).toEqual([HERO_ENTER_FALLBACK_MS]);
    timers[0]!.fn();
    expect(attrs).toEqual({ [HERO_ENTER_ATTR]: "go" });
  });

  it("sets nothing under reduced motion, so content is visible at once", () => {
    const { attrs, timers } = runScript(false);
    expect(attrs).toEqual({});
    expect(timers).toEqual([]);
  });
});
