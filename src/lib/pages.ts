import supplied from "./client-content.json";
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
  /**
   * The source's own heading level. An h3 is a SUBSECTION of the h2 above it —
   * the "Each pillar connects to the others" blocks are h3s — and flattening
   * them to h2 both broke the document outline and turned one grouped idea into
   * five more full-width bands.
   */
  readonly level: 2 | 3;
  /**
   * Where the source linked this block. The source wraps whole cross-sell
   * blocks in an anchor; the first parser dropped it, which cost the site 60
   * in-content links. Null when the target is a route we do not ship, or when
   * it would link a page to itself.
   */
  readonly href: string | null;
  /**
   * The source linked this block at a route we deliberately do not ship (the
   * twelve unwritten articles, the assessment). The heading is real, the
   * destination is not — so the page says "In preparation" rather than
   * presenting a headline that goes nowhere, which is what /insights already
   * does and what /resources was not doing.
   */
  readonly pending?: boolean;
  readonly paras: readonly string[];
  readonly items: readonly string[];
  /** Paragraphs that follow the list. The client's bios close a list and keep talking. */
  readonly after?: readonly string[];
  /** The words of the link to `href`, where the heading alone would make a poor anchor. */
  readonly linkLabel?: string;
  /** A team member's slug: the band shows their photograph beside the copy. */
  readonly profile?: string;
  /** The source closes nearly every page with a persuasive block; rendered as a CTA band. */
  readonly isCta?: boolean;
};

/** An optional extra field on a page's own lead form. */
export type FormField = {
  readonly name: string;
  readonly label: string;
  readonly type?: string;
  readonly options?: readonly string[];
};

/**
 * A page that closes on its own lead form rather than the shared CTA band —
 * the two practice pages, whose leads route to a different person.
 */
export type PageForm = {
  /** The hero's action, in the client's words. */
  readonly primary: string;
  readonly submit: string;
  readonly intent: string;
  readonly fields: readonly FormField[];
};

/**
 * An h2 section together with the h3 subsections that belong under it.
 *
 * `lead` is null for a run of h3s that has no h2 above it — /about/team opens
 * with seven people and no section heading, and promoting the first of them to
 * lead made the whole firm render as sub-items of its founder.
 */
export type SectionGroup = {
  readonly lead: PageSection | null;
  readonly subsections: readonly PageSection[];
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
  /** Compliance language the client supplied for this page, set beneath it. */
  readonly disclosure?: readonly string[];
  readonly form?: PageForm;
};

/**
 * What the client's Drive delivery of 2026-10-08 changes on a captured page.
 * Generated by scripts/build-client-content.py — never hand-written.
 */
type Revision = {
  readonly lede?: string;
  readonly description?: string;
  readonly disclosure?: readonly string[];
  /** /about/team: the people are rendered from the roster, not as h3 stubs. */
  readonly dropLevel3?: boolean;
  readonly insert?: readonly {
    readonly after?: string;
    readonly before?: string;
    readonly sections: readonly PageSection[];
  }[];
  readonly links?: Readonly<Record<string, { readonly href: string; readonly label: string }>>;
};

type ClientContent = {
  readonly pages: Record<string, PageContent>;
  readonly revisions: Record<string, Revision>;
};

const CLIENT = supplied as unknown as ClientContent;

function insertSections(sections: readonly PageSection[], rev: Revision): PageSection[] {
  const out = [...sections];
  for (const { after, before, sections: added } of rev.insert ?? []) {
    const anchor = out.findIndex((s) => s.heading === (after ?? before));
    // An anchor that no longer exists means the capture changed under us.
    if (anchor < 0) throw new Error(`Revision anchor not found: ${after ?? before}`);
    out.splice(after ? anchor + 1 : anchor, 0, ...added);
  }
  return out;
}

function revise(page: PageContent, rev: Revision | undefined): PageContent {
  if (!rev) return page;
  const sections = insertSections(
    page.sections.filter((s) => !(rev.dropLevel3 && s.level === 3)),
    rev,
  ).map((s) => {
    const link = s.heading ? rev.links?.[s.heading] : undefined;
    return link ? { ...s, href: link.href, linkLabel: link.label } : s;
  });
  return {
    ...page,
    lede: rev.lede ?? page.lede,
    description: rev.description ?? page.description,
    disclosure: rev.disclosure ?? page.disclosure,
    sections,
  };
}

const CAPTURED = raw as Record<string, PageContent>;

/** The legacy capture with the client's revisions applied, plus their new pages. */
const PAGES: Record<string, PageContent> = {
  ...Object.fromEntries(
    Object.entries(CAPTURED).map(([route, page]) => [route, revise(page, CLIENT.revisions[route])]),
  ),
  ...CLIENT.pages,
};

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

/**
 * The title as Next should render it.
 *
 * The root layout appends " | Elite Physicians Wealth Planning" to every page
 * title. A page whose own name already contains the brand — /about is called
 * "About Elite Physicians Wealth Planning" — would otherwise render it twice,
 * so that one opts out of the template rather than being renamed.
 */
export function metaTitle(page: PageContent): string | { absolute: string } {
  return page.title.includes("Elite Physicians Wealth Planning")
    ? { absolute: page.title }
    : page.title;
}

/** Sections minus the closing CTA, which the page kit renders separately. */
export function bodySections(page: PageContent): readonly PageSection[] {
  return page.sections.filter((s) => !s.isCta);
}

export function ctaSection(page: PageContent): PageSection | null {
  return page.sections.find((s) => s.isCta) ?? null;
}

/**
 * Body sections with each run of h3s folded under the h2 that introduces them,
 * so the page renders one band per idea instead of one band per heading.
 */
export function groupedBody(page: PageContent): readonly SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const section of bodySections(page)) {
    // A subsection with no body and nowhere to go is an empty promise. The
    // source's FAQ blocks are questions whose answers were never written, and
    // rendering them gave four routes a band headed "Common questions" holding
    // three questions and no answers.
    const empty = !section.paras.length && !section.items.length && !section.href;
    const previous = groups[groups.length - 1];
    if (section.level === 3 && !previous) {
      // A run of h3s with nothing above it: peers, not children of the first.
      if (!empty) groups.push({ lead: null, subsections: [section] });
      continue;
    }
    if (section.level === 3 && previous) {
      if (empty) continue;
      groups[groups.length - 1] = {
        lead: previous.lead,
        subsections: [...previous.subsections, section],
      };
    } else {
      groups.push({ lead: section, subsections: [] });
    }
  }
  // A lead that introduced only empty subsections now introduces nothing.
  return groups.filter(
    (g) =>
      g.subsections.length > 0 ||
      (g.lead !== null &&
        (g.lead.paras.length > 0 || g.lead.items.length > 0 || Boolean(g.lead.href))),
  );
}
