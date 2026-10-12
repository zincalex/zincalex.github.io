# zincalex.github.io

Personal homepage of Alessandro Viespoli: Software Development Engineer, open to PhD positions in computer vision & robotics.

Stack: Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS v4 · registry components (Magic UI, Smooth UI, Unlumen UI).

## The site: Research Atlas at `/`

Dark and minimal, inspired by getartcraft.com. `/` is the only page. The landing (`src/themes/atlas/landing/split/`) puts the About content in the first viewport: name, headline, bio, CTAs and profile links on the left; the photo in slowly turning, colour-cycling rings and a hairline facts card (facts, stats) on the right. Behind it a quiet dotted depth field drifts toward the viewer (Canvas 2D, no cursor interaction; pauses offscreen, DPR ≤ 1.5, static under reduced motion; math in `src/lib/depth-field.ts`). Below the hero, a mono uppercase strip (Magic UI Marquee) never pauses and shows the technical skills grouped as Code, Agent workflows, AWS, Libraries and Operating systems. A short CSS fade reveals the sections below (each titled by a single small mono label). A small "Travel" section near the end is an interactive globe (React Three Fiber + drei) that starts over Europe and keeps turning, hover included: drag to rotate, hover for country names. The countries are painted from the world-atlas shapes into an equirectangular canvas texture (visited ones in the accent, thin borders, a faint graticule) wrapped on a sphere. Its three.js chunk and texture are prepared in idle time, the canvas mounts only when the section comes near, and it falls back to the dotted map under reduced motion or without WebGL (`src/themes/atlas/globe/`, texture painter in `src/lib/globe.ts`). Code: `src/themes/atlas/`, page at `src/app/(atlas)/page.tsx`. Everything respects `prefers-reduced-motion`.

**Light and dark mode.** Dark is the default. The sun/moon toggle at the right of the nav switches to the light (Editorial paper) palette, where the accent and the background dots turn rust red. The choice is remembered in `localStorage` (`atlas-theme`), and the inline script in `src/app/layout.tsx` applies it before paint, so there is no flash. Tokens live in `src/app/globals.css` (`.theme-atlas` and `:root[data-theme="light"] .theme-atlas`); colours for canvas/SVG/WebGL are in `src/lib/theme.ts`.

## Editorial (hidden)

A second, light and typographic style (Newsreader + Inter, sticky sidebar, Smooth UI and Unlumen UI components) is kept in the code but not published. Its route lives in `src/app/_editorial/`: the leading underscore makes it a Next.js private folder, so it is not routed or exported, and nothing on the site links to it. The theme code is in `src/themes/editorial/`; it shares `src/components/shared/` (dotted map, profile photo, style switcher) with Atlas.

To restore it at `/editorial/`:

1. Rename `src/app/_editorial` back to `src/app/editorial`.
2. Optionally link to it again, e.g. put `<StyleSwitcher />` (`@/components/shared/style-switcher`) in the `AtlasSite` footer.
3. Add `"/editorial/"` back to `ROUTES` in `e2e/screens.spec.ts` and remove it from the "removed routes" test.

## Run locally

```bash
npm install
npm run dev -- -p 3001   # http://localhost:3001 (the Kiro IDE uses 3000)
npm run build            # static export into out/
npm start                # preview the export on http://localhost:4173
```

## Edit content

Everything personal lives in **`src/content/site.ts`** (types in `src/content/types.ts`). The themes do not hard-code personal text.

- Search the file for `TODO` to find what still needs your input: CV, publication links, the research collaboration start date, and the skill entries marked `// TODO: confirm`. Experience and education come from the draft CV.
- `person.role` and `person.employer` (optional; shown as "… at Employer" once set) drive the metadata. The availability note is rendered (hero eyebrow, metadata, Editorial) only when the `showAvailability` constant at the top of `site.ts` is `true`; while it is `false` the text is left out of the build entirely.
- `skills` is the grouped list shown in the Atlas marquee.
- `visitedCountries` uses ISO 3166-1 alpha-2 codes (e.g. `{ iso2: "IT", note: "Home" }`). Add an optional `lat`/`lng` to move a marker.
- Items with `placeholder: true` show a small dashed **TODO** badge. Placeholder links render as plain text, never as broken links. Set `showPlaceholderBadges: false` to hide the badges.

### Landing text
`hero.headline` (one bold sans line) and `hero.ctas` are in `site.ts`. The bio and facts come from `person`.

### Photo and CV

- **Profile photo:** `public/images/profile.jpg` (768×1024 portrait of the graduation photo). To replace it, overwrite the file, update `person.photo.width` / `height` in `site.ts` to its pixel size (the framing math uses its aspect ratio, and a test checks the values) and rebuild; if it is missing, the hero shows an initials avatar. The alt text is `person.photo.alt` in `site.ts`. Size and position are set in the photo admin (below).
- **CV:** the published CV is **`public/cv.pdf`**, linked from the CV button (`href: "/cv.pdf"` in `site.ts`). To update it, replace that file. The working copy `CV.pdf` in the repo root is git-ignored and never published.
### Photo admin
A local page for sizing and positioning the portrait. It only exists under `next dev` (`page.dev.tsx`, enabled in `next.config.ts`), so it is never part of the static export.
1. Run `npm run dev -- -p 3001` and, in a second terminal, `npm run admin` (the save server, on 127.0.0.1:4321 only; needs Node ≥ 22.18, which loads `src/lib/photo-framing.ts` directly).
2. Open http://localhost:3001/admin (localhost, not the Network URL: the save server only accepts localhost pages). The preview is the real hero portrait with its rings; the sun/moon button switches dark/light.
3. Drag the photo to position it, zoom with the wheel, a pinch or the slider, and set the size. With the photo focused, arrow keys move it (Shift for bigger steps) and + / − zoom.
4. Click **Save**. It writes `src/content/photo-framing.json` (`size`, `zoom`, `x`, `y`), which `site.ts` imports; open pages update by themselves. **Reset** goes back to the saved values.

The save server accepts only these four numbers (clamped to size 120–480 px, zoom 1–4, x/y 0–100) and writes only that file.

## Tests

```bash
npm run lint && npm run typecheck
npm test                         # Vitest: content, geo, globe, theme, depth-field and photo-framing math
npm run build && npm run shots   # Playwright smoke tests + screenshots of /
```

`npm run shots` serves `out/` on port 4173 and writes screenshots to `.agents/screenshots/` (git-ignored): viewport-sized shots at the top level (for example `atlas-hero-{dark,light}-{desktop,mobile}.png`, `atlas-first-*.png`, `atlas-about-*.png`, `atlas-contact-*.png`, `atlas-globe-*.png`) and full-page captures in `full/`. The first run needs `npx playwright install chromium`.

## Deploy to GitHub Pages

The repository has no commits and no remote yet (the local branch is already `main`). From this folder:

1. On GitHub, create a **public**, empty repository named exactly `zincalex.github.io` under the `zincalex` account.
2. Commit and push:

   ```bash
   git add -A && git commit -m "Initial site"
   git remote add origin git@github.com:zincalex/zincalex.github.io.git
   git push -u origin main
   ```

3. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

On every push to `main`, `.github/workflows/deploy.yml` builds the static export and publishes `out/` to https://zincalex.github.io/, with Atlas at `/` (Editorial stays hidden until restored).

## Credits & licenses

- [Magic UI](https://magicui.design/) (MIT; Marquee, Dotted Map), [Smooth UI](https://smoothui.dev/) and [Unlumen UI](https://ui.unlumen.com/). Registry components are copied into `src/components/`; see each project for its license.
- [three.js](https://threejs.org/), [React Three Fiber](https://r3f.docs.pmnd.rs/) and [drei](https://github.com/pmndrs/drei) (all MIT), for the Atlas travel globe
- [svg-dotted-map](https://github.com/thejessewinton/svg-dotted-map), used by the Magic UI Dotted Map
- [world-atlas](https://github.com/topojson/world-atlas) (ISC), using [Natural Earth](https://www.naturalearthdata.com/) data (public domain), for the marker positions and the globe's country shapes and borders
