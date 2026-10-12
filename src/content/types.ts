/**
 * Content model shared by every style; the data itself lives in ./site.ts.
 * Anything marked `placeholder: true` is not verified yet and is
 * rendered with a small "TODO" badge (links are rendered as plain text, never as
 * broken hrefs).
 */

export type LinkKind =
  | "github"
  | "linkedin"
  | "email"
  | "scholar"
  | "orcid"
  | "cv"
  | "arxiv"
  | "pdf"
  | "code"
  | "website"
  | "video";

export interface SiteLink {
  label: string;
  href: string;
  kind: LinkKind;
  placeholder?: boolean;
}

export interface Person {
  name: string;
  /** Current job title, e.g. "Software Development Engineer". */
  role: string;
  /** Optional current employer; rendered next to the role only when set. */
  employer?: string;
  /** Short availability note shown as a pill with a pulsing dot (omit to hide). */
  availability?: string;
  /** Renders `availability` only when true; false keeps it off every page and the metadata. */
  showAvailability?: boolean;
  affiliation: string;
  department: string;
  location: string;
  /** Profile photo; if the file is missing the themes show an initials avatar instead. */
  photo: {
    src: string;
    alt: string;
    /** Pixel size of the file, so the framing math knows its aspect ratio. Missing = square. */
    width?: number;
    height?: number;
    framing?: PhotoFraming;
  };
  bio: string[];
  interests: string[];
  links: SiteLink[];
}

export type PublicationStatus =
  | "published"
  | "preprint"
  | "under-review"
  | "under-submission"
  | "in-preparation";

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  /** Full venue name (kept for metadata; not rendered, the status chip shows `venueShort`). */
  venue: string;
  /** Short venue name appended to the status chip, e.g. "Under review for ESWA". */
  venueShort?: string;
  year: number | string;
  status: PublicationStatus;
  abstract: string;
  links: SiteLink[];
  bibtex?: string;
  placeholder?: boolean;
}

export type ProjectCategory = "vision" | "robotics" | "ml";

export interface ProjectMedia {
  src: string;
  alt: string;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  period?: string;
  collaborators?: string[];
  tags: string[];
  category: ProjectCategory;
  links: SiteLink[];
  media?: ProjectMedia[];
  placeholder?: boolean;
}

/** Used for both education and experience. Empty `org`/`period` are simply not rendered. */
export interface TimelineItem {
  title: string;
  org?: string;
  location?: string;
  period?: string;
  details?: string[];
  /** Final grade (education), shown as a small badge next to the period, e.g. "110/110 cum laude · GPA 4.0". */
  grade?: string;
  /** Course list (education), rendered as one wrapped dot-separated line. */
  courses?: string[];
  placeholder?: boolean;
}

export interface Honor {
  title: string;
  org?: string;
  location?: string;
  /** 'YYYY-MM' or 'YYYY'. */
  date: string;
  details?: string;
  placeholder?: boolean;
}
export interface SkillGroup {
  id: "code" | "agents" | "aws" | "libraries" | "os";
  label: string;
  items: string[];
}


export interface VisitedCountry {
  /** ISO 3166-1 alpha-2 code, e.g. 'IT'. */
  iso2: string;
  note?: string;
  /** Optional marker override; defaults to the centroid of the largest polygon. */
  lat?: number;
  lng?: number;
  placeholder?: boolean;
}

export const SECTION_IDS = [
  "about",
  "publications",
  "experience",
  "education",
  "projects",
  "honors",
  "countries",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface NavItem {
  id: SectionId;
  label: string;
}

export interface HeroCta {
  label: string;
  href: string;
  variant: "solid" | "outline";
}

export interface Hero {
  /** Short bold sans line under the name, e.g. "Software engineer". */
  headline: string;
  ctas: HeroCta[];
}

export interface SiteContent {
  person: Person;
  hero: Hero;
  skills: SkillGroup[];
  publications: Publication[];
  projects: Project[];
  experience: TimelineItem[];
  education: TimelineItem[];
  honors: Honor[];
  visitedCountries: VisitedCountry[];
  nav: NavItem[];
  /** Set to false to hide the TODO badges once the content is final. */
  showPlaceholderBadges: boolean;
}

/** How the profile photo is sized and cropped inside its frame. */
export interface PhotoFraming {
  /** Diameter of the landing portrait (photo + rings) in px on desktop; capped on small screens. */
  size?: number;
  /** Magnification: 1 = whole photo, 1.5 = 50% closer. Values below 1 are treated as 1. */
  zoom?: number;
  /** Point of the photo (in % from the left) that should sit at the centre of the frame. */
  x?: number;
  /** Point of the photo (in % from the top) that should sit at the centre of the frame. */
  y?: number;
}
