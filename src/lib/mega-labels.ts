const MAX_LABEL_LENGTH = 48;

/**
 * A kebab-case `data-mega-section` name from a band's own heading (site copy,
 * never visitor input), or the fallback when the band has no heading.
 */
export function sectionName(heading: string | null | undefined, fallback: string): string {
  const slug = (heading ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_LABEL_LENGTH)
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
