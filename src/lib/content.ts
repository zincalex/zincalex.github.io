import { site } from "@/content/site";
import type { Person, ProjectCategory, Publication, PublicationStatus } from "@/content/types";

export const STATUS_LABEL: Record<PublicationStatus, string> = {
  published: "Published",
  preprint: "Preprint",
  "under-review": "Under review",
  "under-submission": "Under submission",
  "in-preparation": "In preparation",
};

/** "Under review for ESWA" (status + short venue for pending work); "Published" etc. otherwise. */
export function publicationStatusLabel(pub: Pick<Publication, "status" | "venueShort">): string {
  const label = STATUS_LABEL[pub.status];
  const pending = pub.status === "under-review" || pub.status === "under-submission";
  return pending && pub.venueShort ? `${label} for ${pub.venueShort}` : label;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** '2025-10' -> 'Oct 2025'. Returns the input unchanged if it is not 'YYYY-MM'. */
export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return value;
  return `${MONTHS[month - 1]} ${match[1]}`;
}

/** "Software Development Engineer", or "… at Employer" once an employer is set. */
export function roleLine(person: Pick<Person, "role" | "employer"> = site.person): string {
  return person.employer ? `${person.role} at ${person.employer}` : person.role;
}

/** "AV" from "Alessandro Viespoli" (used by the initials avatar). */
export function initials(name: string = site.person.name): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

type AvailabilityFields = Pick<Person, "availability" | "showAvailability">;

/** The availability note to render, or undefined when unset or `showAvailability` is not true. */
export function shownAvailability(person: AvailabilityFields = site.person): string | undefined {
  if (!person.showAvailability) return undefined;
  return person.availability?.trim() || undefined;
}

/** "Looking to start a PhD" from "Looking to start a PhD · computer vision & robotics"; "" when hidden or unset. */
export function availabilityShort(person: AvailabilityFields = site.person): string {
  const value = shownAvailability(person) ?? "";
  return value.split(" · ")[0]!.trim();
}

/** "a, b and c" (plain-language list for screen-reader text). */
export function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export function splitAuthors(
  authors: string[],
  ownerName: string = site.person.name,
): { name: string; isOwner: boolean }[] {
  return authors.map((name) => ({ name, isOwner: name === ownerName }));
}

export type ProjectFilter = "all" | ProjectCategory;

export const projectCategories: { id: ProjectFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "vision", label: "Vision" },
  { id: "robotics", label: "Robotics" },
  { id: "ml", label: "Learning" },
];
