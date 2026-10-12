import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createMap } from "svg-dotted-map";
import { describe, expect, it } from "vitest";

import {
  availabilityShort,
  formatMonth,
  initials,
  joinWords,
  publicationStatusLabel,
  roleLine,
  shownAvailability,
  splitAuthors,
} from "@/lib/content";
import { countryName, getVisited, iso2ToNumeric, worldFeatures } from "@/lib/geo";

import { site } from "./site";
import { SECTION_IDS, type SiteLink } from "./types";

function allLinks(): SiteLink[] {
  return [
    ...site.person.links,
    ...site.publications.flatMap((p) => p.links),
    ...site.projects.flatMap((p) => p.links),
  ];
}

describe("site content", () => {
  it("every visited country maps to a feature in the world atlas", () => {
    const ids = new Set(worldFeatures.features.map((f) => String(f.id)));
    for (const c of site.visitedCountries) {
      const numeric = iso2ToNumeric(c.iso2);
      expect(numeric, c.iso2).toBeDefined();
      expect(ids.has(numeric!), c.iso2).toBe(true);
    }
  });

  it("lists exactly the 24 confirmed visited countries, none of them placeholders", () => {
    expect(site.visitedCountries.map((c) => c.iso2)).toEqual([
      "IT", "PT", "ES", "FR", "GB", "IE", "DE", "BE", "NL", "DK", "SE", "AT",
      "CH", "SI", "HR", "ME", "GR", "TN", "EG", "CN", "IN", "JP", "TW", "US",
    ]);
    expect(site.visitedCountries.map((c) => c.iso2)).not.toContain("MK");
    expect(site.visitedCountries.some((c) => c.placeholder)).toBe(false);
    for (const c of site.visitedCountries) {
      expect(countryName(c.iso2), c.iso2).not.toBe(c.iso2);
    }
  });

  it("every visited country gets its own marker cell on the dotted map", () => {
    // Same grid as VisitedDottedMap (150×75, default 5000 samples).
    const { addMarkers } = createMap({ width: 150, height: 75, mapSamples: 5000 });
    const cells = addMarkers(getVisited(site.visitedCountries).map((v) => ({ lat: v.lat, lng: v.lng }))).map(
      (m) => `${m.x.toFixed(2)},${m.y.toFixed(2)}`,
    );
    expect(new Set(cells).size).toBe(site.visitedCountries.length);
  });

  it("does not claim a PhD position; role is SDE and the PhD search is a hidden availability note", () => {
    const text = JSON.stringify(site);
    expect(text).not.toMatch(/PhD student|PhD candidate/i);
    expect(site.person.role).toBe("Software Development Engineer");
    // Hidden from the UI: the flag is off, so nothing renders and the text is left out of the build.
    expect(site.person.showAvailability).toBe(false);
    expect(shownAvailability()).toBeUndefined();
    expect(availabilityShort()).toBe("");
    expect(text).not.toMatch(/Looking to start a PhD|Open to PhD/);
    const source = readFileSync(path.join(process.cwd(), "src", "content", "site.ts"), "utf8");
    expect(source).toContain('"Looking to start a PhD · computer vision & robotics"');
    expect(source).not.toMatch(/Open to PhD positions/);
    expect(site.experience[0]?.title).toBe("Software Development Engineer");
    expect(roleLine({ role: "SDE" })).toBe("SDE");
    expect(roleLine({ role: "SDE", employer: "Acme" })).toBe("SDE at Acme");
  });

  it("has the real contact links and the single Huawei honor", () => {
    const byKind = Object.fromEntries(site.person.links.map((l) => [l.kind, l]));
    expect(byKind.email).toMatchObject({ href: "mailto:alessandro.viesp@gmail.com" });
    expect(byKind.scholar).toMatchObject({ href: "https://scholar.google.com/citations?user=xgo8Xj0AAAAJ&hl=it" });
    expect(byKind.orcid).toMatchObject({ href: "https://orcid.org/0009-0005-6288-9663" });
    for (const k of ["email", "scholar", "orcid"]) expect(byKind[k]?.placeholder, k).toBeFalsy();
    expect(site.honors).toHaveLength(1);
    expect(site.honors[0]).toMatchObject({
      title: "Huawei Seeds for the Future Program",
      location: "Remote",
      date: "2022-10",
    });
  });

  it("experience and education come from the CV, with no placeholders left for them", () => {
    expect(site.person.employer).toBe("Amazon");
    expect(site.experience[0]).toMatchObject(
      { title: "Software Development Engineer", org: "Amazon", location: "Madrid, Spain", period: "Jun 2026 – present" },
    );
    expect(site.experience[2]).toMatchObject(
      { title: "Software Development Engineer Intern", org: "Amazon", period: "Mar 2025 – Sep 2025" },
    );
    expect(site.education).toMatchObject([
      { title: "M.Sc. Computer Engineering — AI & Robotics", org: "University of Padova", period: "Oct 2023 – Mar 2026" },
      { title: "B.Sc. Computer Engineering", org: "University of Padova", period: "Sep 2020 – Sep 2023" },
    ]);
    for (const it of [...site.experience, ...site.education]) {
      expect(it.placeholder, it.title).toBeFalsy();
      expect(`${it.title} ${it.period}`).not.toMatch(/YYYY|degree name/);
      // CV text is kept in full, but PDF-extraction artefacts (non-breaking hyphens, ligatures) are not.
      for (const d of [...(it.details ?? []), ...(it.courses ?? [])]) expect(d, d).not.toMatch(/[\u2011\ufb00-\ufb06]/);
    }
    // Every CV bullet, uncut.
    expect(site.experience[0]?.details).toHaveLength(4);
    expect(site.experience[2]?.details).toHaveLength(4);
    expect(site.experience[2]?.details?.[1]).toContain("51.2% improvement in customer purchasing behavior");
    // Grades are a badge field, not a details bullet.
    expect(site.education.map((e) => e.grade)).toEqual(["110/110 cum laude · GPA 4.0", "110/110 cum laude · GPA 3.76"]);
    for (const e of site.education) expect(e.details ?? [], e.title).not.toContainEqual(expect.stringMatching(/Final score/));
    expect(site.education[0]?.courses).toHaveLength(13);
    expect(site.education[1]?.courses).toHaveLength(15);
  });

  it("the research collaboration is a free-time entry with the University of Padova only", () => {
    expect(site.experience[1]).toMatchObject({
      title: "Research collaboration",
      org: "University of Padova",
      location: "Padova, Italy",
      period: "Oct 2025 – present",
    });
    expect(site.experience[1]?.details?.join(" ")).toMatch(/free time/);
    // Prof. Nanni appears only as a co-author of the publication.
    const { publications, ...rest } = site;
    expect(JSON.stringify(rest)).not.toMatch(/Nanni/);
    expect(publications[0]?.authors).toContain("Loris Nanni");
  });

  it("is based in Madrid and the headline is just the role", () => {
    expect(site.person.location).toBe("Madrid, Spain");
    expect(site.hero.headline).toBe("Software engineer at Amazon");
    expect(JSON.stringify(site)).not.toMatch(/on the way to a PhD/);
  });

  it("lists the projects in the requested order, with CV languages/libraries as tags and no course context", () => {
    expect(site.projects.map((p) => p.id)).toEqual([
      "vit-drop",
      "polo-cv",
      "eurosat-land-cover",
      "tiago-apriltag-quest",
      "hyra",
      "gatto",
    ]);
    const tags = Object.fromEntries(site.projects.map((p) => [p.id, p.tags]));
    expect(tags).toEqual({
      "vit-drop": ["Python", "PyTorch", "Hugging Face"],
      "polo-cv": ["C++", "OpenCV", "CMake"],
      "eurosat-land-cover": ["Python", "PyTorch"],
      "tiago-apriltag-quest": ["C++", "ROS1"],
      hyra: ["Python"],
      gatto: ["Python"],
    });
    for (const p of site.projects) expect(Object.keys(p), p.id).not.toContain("context");
    expect(JSON.stringify(site.projects)).not.toMatch(/Intelligent Robotics 2024|course/i);
  });
  it("contains no phone number and links the published CV", () => {
    const text = JSON.stringify(site);
    // International prefixes such as "(+39)" / "+39 3…" and 3-3-4 digit groups.
    expect(text).not.toMatch(/\(\+\d|\+\d{2}[ \d]{8,}|\d{3}[ .-]\d{3}[ .-]\d{4}/);
    const cv = site.person.links.find((l) => l.kind === "cv");
    expect(cv).toMatchObject({ href: "/cv.pdf" });
    expect(cv?.placeholder).toBeFalsy();
    expect(existsSync(path.join(process.cwd(), "public", "cv.pdf"))).toBe(true);
  });
  it("groups technical skills into the five requested categories", () => {
    expect(site.skills.map((g) => g.label)).toEqual([
      "Code",
      "Agent workflows",
      "AWS",
      "Libraries",
      "Operating systems",
    ]);
    for (const g of site.skills) expect(g.items.length, g.label).toBeGreaterThan(0);
    expect(site.skills.find((g) => g.id === "os")?.items).toContain("Windows");
    expect(site.skills.find((g) => g.id === "agents")?.items).toEqual([
      "Claude",
      "Codex",
      "Prompt & context engineering",
      "Strands Agents SDK",
    ]);
  });

  it("nav ids are unique and match the section ids in order", () => {
    const ids = site.nav.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...SECTION_IDS]);
    expect(ids).toEqual([
      "about",
      "publications",
      "experience",
      "education",
      "projects",
      "honors",
      "countries",
      "contact",
    ]);
  });

  it("real links are absolute https, mailto or root-relative", () => {
    for (const link of allLinks().filter((l) => !l.placeholder)) {
      expect(link.href, link.label).toMatch(/^(https:\/\/|mailto:|\/)/);
    }
  });

  it("links without a real href are marked as placeholders", () => {
    for (const link of allLinks()) {
      if (link.href === "#" || link.href === "") {
        expect(link.placeholder, link.label).toBe(true);
      }
    }
  });

  it("every project media item has alt text", () => {
    for (const p of site.projects) {
      for (const m of p.media ?? []) {
        expect(m.alt.trim().length, p.id).toBeGreaterThan(0);
      }
    }
  });

  it("publication authors include the site owner", () => {
    for (const p of site.publications) {
      expect(p.authors).toContain(site.person.name);
    }
  });
});

describe("hero content", () => {
  const { hero } = site;
  const sectionHref = new RegExp(`^#(${SECTION_IDS.join("|")})$`);

  it("has no orbit media, meta row or description (About lives in the hero)", () => {
    expect(existsSync(path.join(process.cwd(), "public", "images", "hero"))).toBe(false);
    for (const key of ["media", "meta", "description"]) expect(Object.keys(hero), key).not.toContain(key);
    expect(JSON.stringify(site)).not.toMatch(/\/images\/hero\//);
  });

  it("has no rotating \"Interested in\" words", () => {
    expect(Object.keys(hero)).not.toContain("focus");
    expect(JSON.stringify(site)).not.toMatch(/Interested in/);
  });

  it("CTAs target a section or a real https/mailto URL", () => {
    expect(hero.ctas.length).toBeGreaterThan(0);
    for (const cta of hero.ctas) {
      expect(cta.href, cta.label).toMatch(new RegExp(`${sectionHref.source}|^(https://|mailto:)`));
    }
  });

  it("never claims a PhD", () => {
    expect(JSON.stringify(site)).not.toMatch(/PhD student/i);
  });
});

describe("publication status", () => {
  it("the ESWA manuscript is under review, with no leftover TODO wording", () => {
    const pub = site.publications[0]!;
    expect(pub.status).toBe("under-review");
    // The chip reads "Under review for ESWA"; the full venue is metadata only (not rendered).
    expect(pub.venue).toBe("Expert Systems with Applications");
    expect(publicationStatusLabel(pub)).toBe("Under review for ESWA");
    expect(publicationStatusLabel({ status: "published", venueShort: "ESWA" })).toBe("Published");
    expect(publicationStatusLabel({ status: "under-review" })).toBe("Under review");
    expect(pub.bibtex).toContain("Under review at Expert Systems with Applications");
    expect(JSON.stringify(site)).not.toMatch(/in preparation/i);
  });

  it("the LinkedIn and CV links are real", () => {
    const byKind = Object.fromEntries(site.person.links.map((l) => [l.kind, l]));
    expect(byKind.linkedin).toMatchObject({ href: "https://www.linkedin.com/in/alessandroviespoli/" });
    expect(byKind.linkedin?.placeholder).toBeFalsy();
    expect(byKind.cv?.placeholder).toBeFalsy();
  });
});

describe("content helpers", () => {
  it("shows the availability only when showAvailability is true", () => {
    const note = "Looking to start a PhD · computer vision & robotics";
    expect(shownAvailability({ availability: note, showAvailability: true })).toBe(note);
    expect(availabilityShort({ availability: note, showAvailability: true })).toBe("Looking to start a PhD");
    expect(availabilityShort({ availability: "Open to collaborations", showAvailability: true })).toBe(
      "Open to collaborations",
    );
    for (const hidden of [{ availability: note, showAvailability: false }, { availability: note }]) {
      expect(shownAvailability(hidden)).toBeUndefined();
      expect(availabilityShort(hidden)).toBe("");
    }
    expect(shownAvailability({ showAvailability: true })).toBeUndefined();
    expect(shownAvailability({ availability: "  ", showAvailability: true })).toBeUndefined();
    expect(availabilityShort({})).toBe("");
  });


  it("joins words into a plain-language list", () => {
    expect(joinWords(["vision", "robots", "depth"])).toBe("vision, robots and depth");
    expect(joinWords(["a", "b"])).toBe("a and b");
    expect(joinWords(["a"])).toBe("a");
    expect(joinWords([])).toBe("");
  });

  it("formats YYYY-MM dates", () => {
    expect(formatMonth("2025-10")).toBe("Oct 2025");
    expect(formatMonth("2026-01")).toBe("Jan 2026");
    expect(formatMonth("YYYY-MM")).toBe("YYYY-MM");
    expect(formatMonth("2025-13")).toBe("2025-13");
  });

  it("builds initials for the avatar", () => {
    expect(initials("Alessandro Viespoli")).toBe("AV");
  });

  it("flags the owner among authors", () => {
    expect(splitAuthors(["Alessandro Viespoli", "Loris Nanni"], "Alessandro Viespoli")).toEqual([
      { name: "Alessandro Viespoli", isOwner: true },
      { name: "Loris Nanni", isOwner: false },
    ]);
  });
});

describe("experience order", () => {
  it("lists experience newest start date first", () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const start = (period = "") => {
      const [mon, year] = period.split(" ");
      return Number(year) * 12 + months.indexOf(mon ?? "");
    };
    const starts = site.experience.map((e) => start(e.period));
    expect(starts).toEqual([...starts].sort((a, b) => b - a));
  });
});
