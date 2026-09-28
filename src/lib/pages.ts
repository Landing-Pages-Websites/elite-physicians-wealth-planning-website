import raw from "./page-content.json";

/**
 * Interior-page copy, captured from the client's own live site.
 *
 * `customer_asks` promises to "preserve accurate, compliance-reviewed source
 * information while improving structure and expanding thin pages". That is an
 * instruction to REUSE the client's approved copy, not to author fresh copy in
 * their voice — so none of the text below was written here. It was fetched from
 * elitephysicianwealthplanning.com (the legacy singular domain the manifest
 * marks reference-only), parsed out of each page's <main>, and held as data
 * rather than retyped into components, so its provenance stays checkable:
 * `build/source-capture/` keeps the raw HTML and `sourceUrl` names the page
 * every route came from.
 *
 * Four substitutions are applied at capture time, each forced by `hard_rules`:
 *   1. The company is "Elite Physicians Wealth Planning" (plural) per the
 *      manifest brand. The PRODUCT is "Elite Physician Wealth Blueprint™"
 *      (singular) — the manifest uses both, deliberately, so the rename is
 *      scoped to the company and the Blueprint name is left alone.
 *   2. info@elitephysicianwealthplanning.com → info@fiscalvisionfinancial.com.
 *      The rule names the reference-site address as incorrect outright.
 *   3. The street address is stripped. No public address may appear "until the
 *      White Plains versus Waldorf discrepancy is authoritatively resolved".
 *   4. "2026 5-Star Wealth Manager" is dropped from Michael's billing. He "may
 *      be identified only with the verified ChFC® and RICP® designations", and
 *      a third-party rating in this vertical carries its own disclosure duties.
 *
 * Build-stage markers the source renders as visible body copy — "[Pending]",
 * "[X business days — pending]" — are scrubbed here too.
 *
 * Thirteen source routes are deliberately NOT here; see build/CLIENT-GAPS.md.
 */
export type PageSection = {
  readonly eyebrow: string | null;
  readonly heading: string | null;
  readonly paras: readonly string[];
  readonly items: readonly string[];
  /** The source closes nearly every page with a persuasive block; rendered as a CTA band. */
  readonly isCta?: boolean;
};

export type PageContent = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string | null;
  readonly headline: string;
  readonly lede: string | null;
  readonly sections: readonly PageSection[];
  /** The source page this copy came from, for provenance. */
  readonly sourceUrl: string;
};

const PAGES = raw as Record<string, PageContent>;

export function getPage(route: string): PageContent {
  const page = PAGES[route];
  if (!page) throw new Error(`No captured copy for route ${route}`);
  return page;
}

export function hasPage(route: string): boolean {
  return route in PAGES;
}

/** Every route with captured copy, for the sitemap and the route audit. */
export function allRoutes(): readonly string[] {
  return Object.keys(PAGES).sort();
}

/** Sections minus the closing CTA, which the page kit renders separately. */
export function bodySections(page: PageContent): readonly PageSection[] {
  return page.sections.filter((s) => !s.isCta);
}

export function ctaSection(page: PageContent): PageSection | null {
  return page.sections.find((s) => s.isCta) ?? null;
}
