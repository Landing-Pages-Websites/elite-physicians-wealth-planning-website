# SEO Charter — Elite Physicians Wealth Planning (elitephysicianswealthplanning.com)

**Created:** 2026-10-09  ·  **Last refreshed:** 2026-10-09  ·  **Owner:** [OWNER] (Gomega / Michael A. Epps)
**Confidence:** provisional. The site is pre-launch: no Search Console, analytics or lead data exists for the launch domain yet.
**Data access:** GSC no · GA4 no (no tag on the site) · CRM/leads no (`NEXT_PUBLIC_LEAD_ENDPOINT` unset) · crawl yes (vercel.app deployment)

---

## 1. Identity & business model

- **What the site sells / does:** coordinated financial planning for physicians (tax-planning coordination, retirement, wealth management, practice-owner planning, estate/legacy, risk protection), plus practice financing (commercial/SBA lending) and business insurance through Roderick Johnson. Regulated (YMYL): investment, insurance and lending disclosures apply.
- **Who it serves:** physicians by career stage (residents → retirement), practice owners, dentists, surgeons, CRNAs/NPs/PAs, healthcare executives.
- **Highest-value conversions (ranked):** 1. strategy call booked (Google Calendar embed on `/schedule`) · 2. consultation / contact request · 3. practice financing consultation · 4. practice risk review · 5. guide download (lead magnet).
- **Target markets:** United States; firm based in the DC/Maryland area (no street address published until White Plains vs Waldorf is resolved).
- **Archetype:** national professional service (lead-gen, consultation-led).
- **Life-cycle stage:** pre-launch on a new domain. A legacy site exists on the singular domain `elitephysicianwealthplanning.com`.
- **Right-to-win / wedge:** one coordinated team covering both of a physician's balance sheets: the household (planning, investments, retirement) and the practice (financing, business insurance, succession).

## 2. Current SEO standing — as of 2026-10-09

- **Health state:** not discovered. The launch domain still serves a GoDaddy Website Builder placeholder; the built site lives only on `elite-physicians-wealth-planning.vercel.app` (verified 2026-10-08: all 29 sitemap URLs return 200).
- **Primary failing constraint:** row 1, eligibility. The domain is not pointed at the site (DNS cutover pending at GoDaddy), and `www.` fails TLS on the current host.
- **Falsifier:** once the domain resolves to Vercel and GSC shows the sitemap processed, re-run the hierarchy from row 2.
- **Host decision:** apex `https://elitephysicianswealthplanning.com` is canonical (`metadataBase`, sitemap, robots, breadcrumbs all use it). At cutover, `www` must 301 to apex, and the legacy singular domain must 301 path-for-path (the redirect map is in `next.config.ts`).

## 3. Targeting — current vs. intended

- **Currently targets:** commercial service and audience pages (services, career stages, specialties), plus trust pages (founder, team, process).
- **Should target:** the same commercial and trust intents. The business converts through consultations, not ad-supported reading.
- **Gap:** none in intent. The gaps are trust and conversion: team bios without photos, an empty guide gate, a missing Risk Protection service, and no practice-financing or business-insurance pages.
- **VERDICT:** commercial / transactional. Build money pages and the trust pages that support them, using client-supplied, compliance-reviewed copy only. Informational articles ship only once the client supplies reviewed copy (the 12 `/insights` titles stay "in preparation"). Launch stays under 60 URLs.

## 4. Topical-authority state

- **Core subject:** financial planning for physicians and medical practices.
- **Hubs:** `/services`, `/physicians` (career stages), `/who-we-serve` (specialties), `/practice-solutions` (practice financing + business insurance, added 2026-10-09).
- **Missing:** the 12 cornerstone articles (client copy not supplied), and the Physician Financial Checkup (questions and result logic not supplied).
- **Cannibalization watch:** `/services/practice-owner-planning` and `/physicians/practice-owners` share an audience. The service page owns "practice owner financial planning", the audience page owns the career-stage framing.

## 5. Money pages & conversion paths

- **Money pages:** `/schedule`, `/consultation`, `/contact`, the six `/services/*` pages, `/physicians/commercial-lending-sba-financing`, `/physicians/business-insurance-risk-management`.
- **Conversion mechanism:** the Google Calendar booking embed works. Every form validates, but no lead endpoint is set, so submissions fall back to `mailto:`. Nothing is tracked yet: there is no GTM/GA4 container.

## 6. The directive

- **Fix now:** 1. DNS cutover with an apex host (operator: GoDaddy holder) · 2. set `NEXT_PUBLIC_LEAD_ENDPOINT` · 3. install GTM/GA4 and confirm `form_submission` and `guide_download` fire · 4. trust pages complete (team photos and bios — done 2026-10-09) · 5. GSC + Bing verification on day one.
- **Roadmap:** 0–30d after launch: index check per money page, CTR review. 31–90d: add client-reviewed cornerstone articles a few at a time, each linking to a money page.
- **DO-NOT-DO:** no authored informational volume; no testimonials, ratings or performance claims without compliance review; no indexing services; no back-dated dates; no `www`/apex flip after launch.

## 7. Uncertainties / missing data

- GSC ownership of the launch domain is unknown.
- The legacy singular domain's index footprint and backlinks are unmeasured. Check before cutover so its redirects carry equity.
