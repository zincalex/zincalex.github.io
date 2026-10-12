import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The Atlas page is the only public route. Editorial is hidden (src/app/_editorial is a
// private folder); its specs were removed: see "Editorial (hidden)" in the README.
const ROUTES = ["/"] as const;
const BIO_START = "I am a Software Engineer at Amazon, where I work on machine learning systems";
const PHOTO_ALT = "Alessandro Viespoli at his graduation, wearing a laurel wreath";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;
const SHOTS_DIR = path.join(__dirname, "..", ".agents", "screenshots");
const VISITED_COUNT = 24;
const SKILL_LABELS = ["Code", "Agent workflows", "AWS", "Libraries", "Operating systems"] as const;

function slugOf(route: string) {
  if (route === "/") return "atlas";
  return route.replaceAll("/", "");
}

/**
 * Saves a viewport-sized shot as SHOTS_DIR/<viewportName>.png and a full-page shot as
 * SHOTS_DIR/full/<fullName>.png. Full pages are taller than 1600px: downscale before viewing.
 */
async function shoot(page: Page, viewportName: string, fullName: string) {
  await page.screenshot({ path: path.join(SHOTS_DIR, `${viewportName}.png`) });
  await page.screenshot({ path: path.join(SHOTS_DIR, "full", `${fullName}.png`), fullPage: true });
}

/** Viewport shot name: the Atlas route opens on its hero. */
function viewportShotName(route: string, mode: string) {
  if (route === "/") return `atlas-hero-${mode}`;
  return `${slugOf(route)}-${mode}`;
}

/**
 * Decodes a PNG in the page: the share of pixels that differ from the top-left pixel
 * and the share close to the given accent color.
 */
function pixelStats(page: Page, png: Buffer, accent: [number, number, number]) {
  return page.evaluate(
    async ({ b64, accent: [ar, ag, ab] }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const [r0, g0, b0] = [data[0]!, data[1]!, data[2]!];
      let differ = 0;
      let accentPx = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
        if (Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0) > 30) differ++;
        if (Math.abs(r - ar) + Math.abs(g - ag) + Math.abs(b - ab) < 60) accentPx++;
      }
      const total = data.length / 4;
      return { differ: differ / total, accent: accentPx / total };
    },
    { b64: png.toString("base64"), accent },
  );
}

/** Share of pixels that differ (by more than a small tolerance) between two same-size PNGs. */
function pixelDiff(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([aB64, bB64]) => {
      const load = async (b64: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [da, db] = [await load(aB64), await load(bB64)];
      if (da.length !== db.length) return 1;
      let changed = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i]! - db[i]!) + Math.abs(da[i + 1]! - db[i + 1]!) + Math.abs(da[i + 2]! - db[i + 2]!) > 24) changed++;
      }
      return changed / (da.length / 4);
    },
    [a.toString("base64"), b.toString("base64")] as const,
  );
}

/** Collects page errors and console errors. */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  // Scroll through the page so once-only in-view reveal animations fire.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(120);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`${slugOf(route)} @ ${vp.name}`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route);
      await settle(page);
      await expect(page.locator("h1")).toHaveCount(1);
      const countries = page.locator("#countries");
      await countries.scrollIntoViewIfNeeded();
      await expect(countries).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await shoot(page, viewportShotName(route, `dark-${vp.name}`), `${slugOf(route)}-${vp.name}`);
      expect(errors).toEqual([]);
    });
  }

  test(`${slugOf(route)} @ reduced motion`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await settle(page);
    await expect(page.locator("h1")).toHaveCount(1);
    await shoot(page, viewportShotName(route, "reduced"), `${slugOf(route)}-reduced`);
    expect(errors).toEqual([]);
  });

  test(`${slugOf(route)}: SDE role, hidden PhD availability, profile photo, no removed sections`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).not.toContainText(/PhD student/i);
    await expect(body).toContainText("Software Development Engineer");
    // person.showAvailability is false: the note is not rendered anywhere (nor in the page source).
    await expect(body).not.toContainText(/Looking to start a PhD|Open to PhD/);
    expect(await page.content()).not.toMatch(/Looking to start a PhD|Open to PhD/);
    // The graduation photo replaces the initials avatar, exactly once (in the hero).
    await expect(page.getByRole("img", { name: /Initials avatar/ })).toHaveCount(0);
    const photo = page.getByRole("img", { name: PHOTO_ALT });
    await expect(photo).toHaveCount(1);
    await expect(photo).toHaveAttribute("src", "/images/profile.jpg");
    await photo.scrollIntoViewIfNeeded();
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(768);
    for (const id of ["news", "teaching"]) await expect(page.locator(`#${id}`)).toHaveCount(0);
    await expect(page.locator("#honors")).toContainText("Huawei Seeds for the Future Program");
    await expect(page.getByRole("link", { name: /alessandro\.viesp@gmail\.com|^Email/ }).first()).toHaveAttribute(
      "href",
      "mailto:alessandro.viesp@gmail.com",
    );
    // The TIAGo project shows the header GIF, lazy-loaded with alt text.
    const gif = page.locator('#projects img[src$="quest2.gif"]');
    await expect(gif).toHaveCount(1);
    await expect(gif).toHaveAttribute("loading", "lazy");
    await expect(gif).toHaveAttribute("alt", /TIAGo/);
  });
}

test("atlas: no stats, grouped skills marquee and a modest travel globe", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // The hero facts/stats card under the photo was removed.
  await expect(page.locator('[data-testid="atlas-stats"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/countries visited/i);
  // Skills strip: the five categories, technical items only, as uppercase mono items with square bullets.
  const skills = page.getByRole("region", { name: "Technical skills" });
  const expectSkillText = async () => {
    for (const label of SKILL_LABELS) await expect(skills).toContainText(label);
    for (const notASkill of ["University of Padova", "PKLot", "Remote sensing", "vision transformers"]) {
      await expect(skills).not.toContainText(notASkill);
    }
  };
  await expect(skills.locator(".animate-marquee").first()).toBeAttached();
  await expectSkillText();
  const code = skills.locator(".animate-marquee").first().getByText("Code", { exact: true });
  await expect(code).toHaveCSS("text-transform", "uppercase");
  await expect(code).toHaveCSS("font-family", /Geist Mono/);
  expect(await code.locator("span[aria-hidden]").evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    "rgba(0, 0, 0, 0)",
  );
  await expect(skills.locator("[class*='rounded']")).toHaveCount(0);
  // Always moving: hovering the strip does not pause it.
  const run = skills.locator(".animate-marquee").first();
  await skills.scrollIntoViewIfNeeded();
  await skills.hover();
  await expect(run).toHaveCSS("animation-play-state", "running");
  const x0 = await run.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  await page.waitForTimeout(600);
  const x1 = await run.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  expect(x1, "marquee offset while hovered").toBeLessThan(x0);
  // Travel: a 3D globe with the visited countries filled. Its three.js chunk and map texture are prepared in idle time after the
  // intro; the canvas mounts only once the section is near.
  const globe = page.locator('[data-testid="atlas-globe"]');
  const canvas = globe.locator("canvas");
  await expect(canvas).toHaveCount(0);
  await page.locator("#countries").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveCount(1, { timeout: 15_000 });
  // No flat map, counter or chip list next to it; screen readers still get the list.
  await expect(page.locator('[data-testid="atlas-dotted-map"]')).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Countries visited" })).toHaveCount(0);
  await expect(globe.locator("figcaption")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Each highlighted dot");
  await expect(globe.locator("p.sr-only")).toContainText(`${VISITED_COUNT} countries I have visited`);
  // Hovering the centre (Europe) shows the country under the pointer.
  await page.waitForTimeout(500);
  await canvas.hover();
  const tooltip = page.getByTestId("globe-tooltip");
  await expect(tooltip).toBeVisible({ timeout: 3_000 });
  await expect(tooltip).not.toHaveText("");
  // It keeps turning under the pointer: two frames 500 ms apart differ.
  const before = await canvas.screenshot();
  await page.waitForTimeout(500);
  const turned = await pixelDiff(page, before, await canvas.screenshot());
  expect(turned, "share of changed globe pixels while hovered").toBeGreaterThan(0.002);
  // Drag to rotate still works, and auto-rotation resumes afterwards.
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const afterDrag = await canvas.screenshot();
  await page.waitForTimeout(500);
  expect(await pixelDiff(page, afterDrag, await canvas.screenshot())).toBeGreaterThan(0.002);
  // The canvas actually draws: the ocean sphere and land across the stage, teal visited countries.
  const dark = await pixelStats(page, await canvas.screenshot(), [0x5e, 0xea, 0xd4]);
  // A blank canvas gives 0 for both.
  expect(dark.differ, JSON.stringify(dark)).toBeGreaterThan(0.03);
  expect(dark.accent, JSON.stringify(dark)).toBeGreaterThan(0.001);
  await globe.screenshot({ path: path.join(SHOTS_DIR, "atlas-globe-dark.png") });
  await page.getByRole("button", { name: "Light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.waitForTimeout(600);
  const light = await pixelStats(page, await canvas.screenshot(), [0x9a, 0x34, 0x12]);
  // Rust visited countries on the paper-toned sphere.
  expect(light.differ, JSON.stringify(light)).toBeGreaterThan(0.03);
  expect(light.accent, JSON.stringify(light)).toBeGreaterThan(0.001);
  await globe.screenshot({ path: path.join(SHOTS_DIR, "atlas-globe-light.png") });
  await page.evaluate(() => localStorage.removeItem("atlas-theme"));

  // Reduced motion: static grouped skill list instead of the marquee, flat map instead of the globe.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(skills.locator("dt")).toHaveText([...SKILL_LABELS]);
  await expect(skills.locator(".animate-marquee")).toHaveCount(0);
  await expectSkillText();
  await expect(skills.locator("dt").first()).toHaveCSS("text-transform", "uppercase");
  await page.locator("#countries").scrollIntoViewIfNeeded();
  const map = page.locator('[data-testid="atlas-dotted-map"]');
  await expect(map).toHaveAttribute("role", "img");
  await expect(map.locator("circle[fill='#5eead4']")).toHaveCount(VISITED_COUNT);
  await page.waitForTimeout(500);
  await expect(page.locator("canvas")).toHaveCount(0);
  // Light mode + reduced motion: the same map in rust.
  await page.addInitScript(() => localStorage.setItem("atlas-theme", "light"));
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.locator("#countries").scrollIntoViewIfNeeded();
  await expect(map.locator("circle[fill='#9a3412']")).toHaveCount(VISITED_COUNT);
  await page.waitForTimeout(500);
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("atlas sections: one green heading each, link-only contact, photo, no scroll rail", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await settle(page);
  await expect(page.getByTestId("scroll-rail")).toHaveCount(0);
  await expect(page.getByTestId("scroll-progress-line")).toHaveCount(0);
  // Nothing reserves room for a rail any more: main spans the full width.
  expect(await page.locator("#main").evaluate((el) => getComputedStyle(el).paddingRight)).toBe("0px");

  // About is the hero (section#about with the h1), not a titled section.
  await expect(page.locator("section#about > h2")).toHaveCount(0);
  const labels: Record<string, string> = {
    publications: "Publications",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    honors: "Honors",
    countries: "Travel",
    contact: "Contact",
  };
  for (const [id, label] of Object.entries(labels)) {
    const section = page.locator(`section#${id}`);
    const heading = section.locator(":scope > h2");
    await expect(heading, id).toHaveCount(1);
    await expect(heading, id).toHaveText(label);
    await expect(heading, id).toHaveCSS("text-transform", "uppercase");
    await expect(heading, id).toHaveCSS("font-family", /Geist Mono/);
    await expect(heading, id).toHaveCSS("color", "rgb(94, 234, 212)");
    await expect(section, id).toHaveAttribute("aria-labelledby", (await heading.getAttribute("id")) ?? "");
    // No second, larger title under the label.
    await expect(section.locator(":scope > p, :scope > div > h2"), id).toHaveCount(0);
  }
  for (const gone of ["Selected projects", "Get in touch", "Papers & manuscripts", "Places I have been", "Awards & programs"]) {
    await expect(page.locator("#main section h2").filter({ hasText: gone })).toHaveCount(0);
  }

  // Contact: only the link buttons.
  const contact = page.locator("#contact");
  await expect(contact).not.toContainText(/Looking to start a PhD|Open to PhD/);
  await expect(contact).not.toContainText("Padova, Italy");
  await expect(contact.locator("p")).toHaveCount(0);
  await expect(contact.getByRole("list", { name: "Contact links" }).getByRole("listitem")).toHaveCount(6);

  const shot = async (selector: string, name: string) => {
    // Instant: the page uses smooth scrolling, which a second scroll call would cancel.
    await page
      .locator(selector)
      .evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "instant" }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SHOTS_DIR, name) });
  };
  await shot("#about", "atlas-about-dark.png");
  const photo = page.locator("#about img");
  await expect(photo).toHaveAttribute("alt", PHOTO_ALT);
  expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(768);
  await shot("#projects", "atlas-projects-heading-dark.png");
  await shot("#countries", "atlas-travel-dark.png");
  await shot("#contact", "atlas-contact-dark.png");

  await page.getByRole("button", { name: "Light mode" }).click();
  await expect(page.locator("#projects > h2")).toHaveCSS("color", "rgb(154, 52, 18)");
  await shot("#about", "atlas-about-light.png");
  await shot("#contact", "atlas-contact-light.png");
  await page.evaluate(() => localStorage.removeItem("atlas-theme"));
  expect(errors).toEqual([]);
});

test("footer: no landing switcher and no link to Editorial", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("navigation", { name: "Landing switcher" })).toHaveCount(0);
  await expect(page.locator('a[href*="editorial"], a[href^="/v1"], a[href^="/v2"], a[href^="/v3"]')).toHaveCount(0);
});

for (const route of ROUTES) {
  test(`${slugOf(route)}: About lives in the hero, once`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveAccessibleName("Alessandro Viespoli");
    await expect(page.locator("main").getByText(BIO_START)).toHaveCount(1);
    const about = page.locator("#about");
    await expect(about.getByText(BIO_START)).toHaveCount(1);
    await expect(about.locator('[data-testid="atlas-stats"]')).toHaveCount(0);
    await expect(about.getByRole("list", { name: "Research interests" })).toHaveCount(0);
    await expect(about.getByRole("list", { name: "Profiles and links" }).getByRole("listitem")).toHaveCount(6);
    await expect(about.getByRole("link", { name: "View research" })).toHaveAttribute("href", "#publications");
    await expect(about.getByRole("link", { name: "Get in touch" })).toHaveAttribute("href", "#contact");
    // No facts card (Currently / Looking for / Research / Based in) and no "/ role at employer" eyebrow.
    for (const gone of ["Looking to start a PhD", "Open to PhD", "Based in", "Software Development Engineer at Amazon"]) {
      await expect(about).not.toContainText(gone);
    }
    await expect(about).toContainText("University of Padova");
    await expect(about).not.toContainText("DEI");
    // No orbiting cards or clips remain.
    await expect(page.locator('[data-testid="hero-card"], [data-hero-field], video')).toHaveCount(0);
    // The nav "About" link lands on the hero.
    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "About" }).click();
    await expect(about).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

const FIRST_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 700 },
  { width: 390, height: 844 },
] as const;

for (const route of ROUTES) {
  for (const vp of FIRST_VIEWPORTS) {
    test(`${slugOf(route)}: first viewport @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(2400); // entrances settle (~2.2s sequence)
      const box = async (locator: ReturnType<Page["locator"]>) => (await locator.boundingBox())!;
      const bio = await box(page.locator("#about p", { hasText: BIO_START }));
      const h1 = await box(page.locator("h1"));
      expect(h1.y + h1.height).toBeLessThanOrEqual(vp.height);
      if (vp.width >= 1024) {
        expect(bio.y + bio.height, "bio[0] fully visible").toBeLessThanOrEqual(vp.height);
      } else {
        expect(bio.y, "bio[0] starts on the first screen").toBeLessThanOrEqual(vp.height);
        const ctas = await box(page.getByRole("link", { name: "View research" }));
        expect(ctas.y + ctas.height, "CTAs on the first screen").toBeLessThanOrEqual(vp.height);
        const links = await box(page.getByRole("list", { name: "Profiles and links" }));
        expect(links.y, "links within a thumb-scroll").toBeLessThanOrEqual(vp.height * 1.15);
      }
      if (vp.width === 1440) {
        const strip = await box(page.getByRole("region", { name: "Technical skills" }));
        expect(strip.y, "skills strip in the first viewport").toBeLessThanOrEqual(vp.height);
      }
      const photo = page.getByRole("img", { name: PHOTO_ALT });
      if (vp.width >= 1024) {
        const p = await box(photo);
        expect(p.y + p.height, "photo visible").toBeLessThanOrEqual(vp.height);
      }
      await page.screenshot({ path: path.join(SHOTS_DIR, `${slugOf(route)}-first-${vp.width}x${vp.height}.png`) });
    });
  }
}

test("landing: turning photo rings, no interest line; static under reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const ring = page.locator(".photo-orbit-spin").first();
  expect(await ring.evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");
  await expect(page.locator("#about")).not.toContainText("Interested in");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(await ring.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await expect(page.locator(".hero-blur").first()).toHaveCSS("opacity", "1");
});

test("landing: the dot field animates, pauses offscreen, and is static under reduced motion", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const field = page.getByTestId("depth-field");
  await expect(field).toHaveAttribute("aria-hidden", "true");
  await expect(field).toHaveCSS("pointer-events", "none");
  await expect(field).toHaveAttribute("data-running", "true");
  await page.waitForTimeout(900);
  const a = await field.screenshot();
  await page.waitForTimeout(400);
  expect(await pixelDiff(page, a, await field.screenshot()), "changed field pixels").toBeGreaterThan(0.002);
  // Backing store DPR is capped at 1.5.
  const ratio = await field.evaluate((c: HTMLCanvasElement) => c.width / c.getBoundingClientRect().width);
  expect(ratio).toBeLessThanOrEqual(1.5 + 0.01);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(field).toHaveAttribute("data-running", "false");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(field).toHaveAttribute("data-running", "true");

  // Light mode: rust points on paper.
  await page.getByRole("button", { name: "Light mode" }).click();
  await page.waitForTimeout(600);
  const light = await pixelStats(page, await field.screenshot(), [0x9a, 0x34, 0x12]);
  expect(light.accent, JSON.stringify(light)).toBeGreaterThan(0.0002);
  await page.evaluate(() => localStorage.removeItem("atlas-theme"));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(field).toHaveAttribute("data-running", "false");
  const s0 = await field.screenshot();
  await page.waitForTimeout(600);
  expect(await pixelDiff(page, s0, await field.screenshot())).toBe(0);
  expect(errors).toEqual([]);
});

const PAPER = "rgb(250, 248, 243)";

test("atlas light mode: toggle, persistence, no flash", async ({ page, context }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const html = page.locator("html");
  const atlas = page.locator(".theme-atlas");
  const toggle = page.getByRole("button", { name: "Light mode" });

  // (a) Mouse: dark by default, click switches to the Editorial paper and persists.
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(atlas).not.toHaveCSS("background-color", PAPER);
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(atlas).toHaveCSS("background-color", PAPER);
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBe("light");
  // Light map colors match Editorial; the hero name ink is not the dark: white.
  await expect(page.locator('[data-testid="atlas-dotted-map"] circle[fill="#9a3412"]')).toHaveCount(VISITED_COUNT);
  await expect(page.locator("#hero-title")).toHaveCSS("color", "rgb(28, 25, 23)");

  // Persists across reloads.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(atlas).toHaveCSS("background-color", PAPER);

  // (b) Keyboard: Space toggles back to dark.
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(atlas).not.toHaveCSS("background-color", PAPER);
  expect(await page.evaluate(() => localStorage.getItem("atlas-theme"))).toBe("dark");
  expect(errors).toEqual([]);

  // (c) No flash: with Next's JS blocked, the inline <head> script alone paints paper.
  const noJs = await context.newPage();
  await noJs.addInitScript(() => localStorage.setItem("atlas-theme", "light"));
  await noJs.route("**/_next/static/**/*.js", (r) => r.abort());
  await noJs.goto("/");
  await expect(noJs.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(noJs.locator(".theme-atlas")).toHaveCSS("background-color", PAPER);
  await noJs.close();

  // (d) Light-mode screenshots.
  for (const vp of VIEWPORTS) {
    const shot = await context.newPage();
    const shotErrors = collectErrors(shot);
    await shot.addInitScript(() => localStorage.setItem("atlas-theme", "light"));
    await shot.setViewportSize({ width: vp.width, height: vp.height });
    await shot.goto("/");
    await settle(shot);
    await shoot(shot, `atlas-hero-light-${vp.name}`, `atlas-light-${vp.name}`);
    expect(shotErrors).toEqual([]);
    await shot.close();
  }
});

for (const route of ROUTES) test(`${slugOf(route)} a11y: contrast and names in dark and light`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  await settle(page);
  const rules = ["color-contrast", "image-alt", "button-name", "link-name", "aria-hidden-focus"];
  const audit = async (mode: string) => {
    const { violations } = await new AxeBuilder({ page }).withRules(rules).analyze();
    const summary = violations.map((v) => ({ mode, id: v.id, targets: v.nodes.map((n) => n.target.join(" ")) }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  };
  await audit("dark");
  await page.getByRole("button", { name: "Light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // Let color transitions finish before measuring contrast.
  await page.waitForTimeout(500);
  await audit("light");
  await page.evaluate(() => localStorage.removeItem("atlas-theme"));
});

test("removed routes are gone from the export", async ({ page }) => {
  // /editorial/ is hidden (private _editorial folder), /v1/–/v3/ were the landing previews,
  // /admin/ is the dev-only photo admin (page.dev.tsx, routed only under `next dev`).
  for (const route of [
    "/atlas/",
    "/liquid/",
    "/retro/",
    "/v1/",
    "/v2/",
    "/v3/",
    "/editorial/",
    "/admin/",
    "/images/hero/CREDITS.md",
  ]) {
    const res = await page.goto(route);
    expect(res?.status(), route).toBe(404);
  }
});

test("no route overflows horizontally at phone, tablet or desktop widths", async ({ page }) => {
  for (const route of ROUTES) {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} @ ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

for (const route of ROUTES) {
  test(`${slugOf(route)} skip link is the first tab stop`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveText("Skip to content");
    await expect(focused).toHaveAttribute("href", "#main");
  });
}
