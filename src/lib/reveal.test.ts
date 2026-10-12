import { describe, expect, it, vi } from "vitest";

import { REVEAL_ATTR, REVEAL_FALLBACK_MS, REVEAL_SCRIPT } from "./reveal";

/** Runs the inline script with a fake matchMedia + document; returns the attributes and timers. */
function runScript(motionOk: boolean) {
  const attrs: Record<string, string> = {};
  const timers: { fn: () => void; ms: number }[] = [];
  const window = { matchMedia: () => ({ matches: motionOk }) };
  const document = {
    documentElement: {
      getAttribute: (name: string) => attrs[name] ?? null,
      setAttribute: (name: string, value: string) => {
        attrs[name] = value;
      },
      removeAttribute: (name: string) => {
        delete attrs[name];
      },
    },
  };
  const setTimeout = vi.fn((fn: () => void, ms: number) => timers.push({ fn, ms }));
  new Function("window", "document", "setTimeout", REVEAL_SCRIPT)(window, document, setTimeout);
  return { attrs, timers };
}

describe("REVEAL_SCRIPT", () => {
  it("gates the reveals and drops the gate if no Reveal took over in time", () => {
    const { attrs, timers } = runScript(true);
    expect(attrs).toEqual({ [REVEAL_ATTR]: "wait" });
    expect(timers.map((t) => t.ms)).toEqual([REVEAL_FALLBACK_MS]);
    timers[0]!.fn();
    expect(attrs).toEqual({});
  });

  it("keeps the gate once a Reveal has switched it on", () => {
    const { attrs, timers } = runScript(true);
    attrs[REVEAL_ATTR] = "on";
    timers[0]!.fn();
    expect(attrs).toEqual({ [REVEAL_ATTR]: "on" });
  });

  it("sets nothing under reduced motion, so sections are visible at once", () => {
    const { attrs, timers } = runScript(false);
    expect(attrs).toEqual({});
    expect(timers).toEqual([]);
  });
});
