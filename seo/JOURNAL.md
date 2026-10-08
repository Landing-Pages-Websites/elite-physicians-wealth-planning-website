# SEO Journal — Elite Physicians Wealth Planning (elitephysicianswealthplanning.com)

> Newest entry on top. Every entry: what ran · findings (tagged) · what changed · what's pending · next review.

---

## 2026-10-09 — Charter built; client Drive content placed (team, practice pages, Risk Protection, guide)

- **Trigger / request:** the client's Drive folder (bios, headshots, compliance-approved blueprint, guide PDF, practice landing handoff). The request was "implement everything, don't change the design much". It fits the Charter §3 verdict (commercial/transactional), so nothing needed reconciling: money pages and trust pages only, no authored informational content.
- **Skills / tools used:** seo-orchestrator (Charter), seo-content-protocol (brief, source test), local production build + Playwright, repo palette/contrast gates.
- **Phase(s):** 0 Intake · 7 Implementation & QA.
- **Findings:**
  - `[fact]` The launch domain still serves a GoDaddy placeholder. The site is reachable only on vercel.app; DNS cutover is pending (Charter §2).
  - `[fact]` The blueprint's `/physicians/*` career-stage copy was already live verbatim. What was missing: Risk Protection, the per-service disclosures, team bios and photos, a downloadable guide, and the two practice pages.
  - `[inference]` The bio pages add first-party E-E-A-T (named people, roles, photos, Person JSON-LD) where the site had a seven-name list with one-line titles.
- **Changed / produced:** 11 new URLs. The sitemap went from 29 to 40 (still under the 60-page launch cap):
  - seven `/about/team/<name>` bio pages;
  - `/practice-solutions`;
  - `/physicians/commercial-lending-sba-financing`;
  - `/physicians/business-insurance-risk-management`;
  - `/services/risk-protection`.

  Also: Risk Protection links on 10 pages; disclosure bands on 7 pages; the guide PDF at `/guides/` with `X-Robots-Tag: noindex`; Person JSON-LD on the bio pages; titles and meta descriptions from the handoff's SEO notes, trimmed to 155 characters.
- **Decision & rationale:** no copy was authored. The only edits are logged substitutions (brand pluralisation; "four decades" → "three decades", the claim that stays true under both client documents). Images that conflict with the client's own blueprint were held (`build/CLIENT-GAPS.md`).
- **Charter updated?** Created (§1–§7).
- **Pending / next action:**
  - DNS cutover (apex canonical, `www` → apex, legacy singular domain 301 path-for-path).
  - Lead endpoint and GTM/GA4 before launch.
  - GSC + Bing verification on day one.
- **Next review date + KPI to watch:** two weeks after cutover. Indexed count vs the 40 submitted, and impressions on the money pages.
