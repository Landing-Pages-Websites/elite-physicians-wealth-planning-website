# Production ledger — Elite Physicians Wealth Planning

Stage 2: approved homepage mockup → production website.
Branch `build/production-direction-a`, off `main` at `f5be6b7` + `143f572`.

---

## Direction

**Direction A, "The Consult Ledger", promoted to `/`.**

Chosen by the **operator**, who replied "execute" to a recommendation of A. Recorded
honestly: the recommendation came from a design audit (below), *not* from evidence in
this repo. There is none — `public/design/a/section_manifest.json` and
`public/design/b/section_manifest.json` are byte-identical, and both palette contracts
self-report `"verdict": "APPROVED"`. Nothing in the clone records which direction the
client approved.

**Direction B is intact on disk** (`/variant-b`, `src/components/variant-b/`,
`public/design/b/`, `public/images/design/b/`) and stays there until A ships. Reverting
to B is a one-line change in `src/app/page.tsx` plus its CSS import.

---

## Inherited commit — provenance unknown

`143f572` "feat: add strategy-call capture to both directions, rebalance the ledger"
landed on local `main` at 01:05 on 3 Sep 2026, authored as Hyder Shah, **during this
session and not by this agent**. It has never been pushed.

It adds `src/components/shared/strategy-call-form.tsx` (a shared, `tone`-prop lead form),
a `#form` section on both directions, `NEXT_PUBLIC_LEAD_ENDPOINT` with a `mailto:`
fallback, and rebalances the five-decisions ledger 46% → 72%.

**Retained, not reverted.** It is coherent, it matches the audit's own finding about the
five-decisions dead space, and it is authored under the operator's identity. Flagged here
because it modifies approved composition (five-decisions width) and appends a new section
after the approved closing section — both of which need the operator's confirmation that
they were intended.

---

## Design audit → the professional pass

The approved mockups are AI-generated. A frame-by-frame review of all 16 reference frames
(8 sections × 2 directions) by 11 independent reviewers raised **300 findings, 72 of them
blockers**; 10 of 11 reviewers rated Direction A the stronger board. Full report:
`https://claude.ai/code/artifact/1f46cf54-e542-40fd-9e97-e177e2a8e379`

Deviations applied to the build, each classed per the skill's taxonomy. Defect classes are
fixed on the builder's authority; `taste` is not, and none was taken.

| Frame | Change | Class | Justification |
|---|---|---|---|
| 05-five-decisions | Dropped literal `Orientation: ` prefix from the eyebrow | spec-text-as-ui | `orientation` is a manifest *field name*. The copy after it is real; the prefix is build spec |
| 03-separate-rooms | Same prefix removed | spec-text-as-ui | as above |
| 06-white-coat-paths | Same prefix removed; kept the italic display treatment the frame shows | spec-text-as-ui | as above |
| 03-separate-rooms | **Removed the navy notch tab reading "The Consult Ledger"** | spec-text-as-ui | Internal A/B codename published as the practice's brand. Removed rather than refilled — inventing replacement brand furniture is not ours to do |
| 04-blueprint-rounds | **Removed the "The Consult Ledger" logo lockup** over the invented tagline "PHYSICIAN WEALTH ADVISORY"; the section's own orientation line now opens it, gold rule kept | spec-text-as-ui | as above. Two build artifacts, neither client copy |
| 08-next-decision | **Removed the dashed guide-cover slot** rendering `guide.availability` | spec-text-as-ui + ai-tell + legibility | Three defects in one element: "CUSTOMER INPUT REQUIRED…" as reader-facing copy, a wireframe dashed border shipped as UI, and 9px type. `guide.requestNote` below already states the truth the hard rule requires |
| 05, 03, 06, 04, 07 | Gold eyebrows on light bands → navy | accessibility | Gold `#C8A65A` on ivory `#F6F2E8` measures **2.07:1**; on white **2.32:1**. AA failure at any size. Gold retained for rules, nodes and CTA fills, where it passes on navy (~6.5:1) |
| whole build | 8 bare hex literals promoted to documented derived tokens in `globals.css @theme` | grid-alignment | Each is a tint/shade of a contract token, not a new hue. Naming them makes the palette gate meaningful |

**Not applied.** The audit's `taste` findings (5 of 300) and every finding scoped to
Direction B were left alone. Findings that describe the *mockup* but do not reproduce in
the *code* — the placeholder-caption text, the "Outcome: Navigate to…" captions — were
verified absent from Direction A's source and needed no change.

---

## New unapproved surfaces

The client approved a homepage. They have not seen either of these.

- **`SiteHeader`** — `src/components/site/site-header.tsx`. The wordmark is **lifted**
  from the hero, not duplicated: `one-plan.tsx` previously rendered that lockup as its
  first child and has been given a height-reserving spacer in its place. `fixed`, not
  `sticky`, so it takes no space in flow and the `composition_map` fold requirement
  (brand + headline + actions + portrait card + proof row together inside 1536×864)
  survives. Nav points at on-page anchors because those are the destinations that exist
  today; they become the contracted `/our-process`, `/who-we-serve` and
  `/meet-michael-epps` paths when those pages ship.
- **`SiteFooter`** — `src/components/site/site-footer.tsx`. Deliberately *not* a copy of
  `ContactClose`, which lives inside approved section 08 and already carries contact
  details. The footer does a different job — navigation plus the compliance lines that
  must appear on every route. The disclaimer therefore appears twice on the homepage;
  that is a compliance line repeating, not duplication to remove.

---

## Rulings recorded

- **`hard_rules` over repo `CLAUDE.md`.** `CLAUDE.md` "Conversion" requires *"named
  testimonials (with faces), metrics, ratings"* and the `design-review` rubric scores the
  same. `hard_rules` forbid inventing testimonials, ratings, awards and credentials
  outright. **The hard rule wins.** A `CHANGES_REQUIRED` finding demanding proof elements
  is answered with this row, not fixed.
- **`≥6 kebab-case section anchors per LP`** — satisfied without manufacturing anything:
  the homepage ships 9 in DOM order. The floor is **not** to be forced onto `/privacy` or
  `/disclosures` when those arrive; manufacturing structure there manufactures copy.
- **Standing data-viz default suspended.** The global "render first-party data as an
  original build-time chart image wired to `og:image`" default is void here —
  `hard_rules` ban market-chart imagery outright.
- **Legacy domain.** `elitephysicianwealthplanning.com` (singular) → the plural launch
  domain is a **DNS cutover on the client side**, not a `next.config.ts` edit. Flagged,
  not executed. `metadataBase`, canonical and sitemap already use the plural domain.

---

## Routing

- `/` is the approved homepage (was the A/B chooser).
- `/variant-a` → `/` permanent redirect. Those review links may already be shared; a 404
  would be worse.
- `/variant-b` still live for comparison.
- `sitemap.ts` emits only routes that exist — currently `/` alone.

---

## Verification — 3 Sep 2026

| Gate | Result |
|---|---|
| `npm run build` | pass, 6 static pages |
| `npm run lint` | pass, 0 problems |
| `npm run check:palette` | pass — 6 contract tokens, 8 documented derived shades, 0 bare literals |
| `npm run verify` (browser, 1536/1440/390) | pass on `/` and `/variant-b`: 0 overflow, 0 broken images, exactly 1 `h1`, 9 anchors |

Not yet run: `design-review` and `code-review` agents; section-by-section fidelity read of
the built page against `public/design/a/refs/*.png`.

---

## Open — needs the operator

1. **Scaffolding decision.** `bridgeCount: 1` — the `app.gomega.ai/review-bridge` script
   is still in `layout.tsx`, and `public/review-routes.json` still lists the old review
   routes. Neither has been touched: the skill treats scaffolding removal as a checkpoint,
   and `review-routes.json` is fetched by the bridge from the deployed origin, so
   "unreferenced in `src/`" does not mean unused.
2. **Sitemap approval** — proposed below, not built.
3. Everything in `CLIENT-GAPS.md`.

---

## Review round 1 — both ship gates run, 3 Sep 2026

`code-review` and `design-review` both returned **CHANGES_REQUESTED**. Fixed:

**Correctness / layout**
- Header height was a hardcoded `h-[52px]` spacer duplicating a height it could not
  see; measured 109px at 375px. Now a single `--header-h` token consumed by the header's
  `min-height`, the hero spacer and anchor offsets, so the three cannot drift.
- Wordmark wrapped to two lines under 334px available width, which is what drove the
  109px. `whitespace-nowrap` + `shrink-0`, and `poweredBy` is hidden below `sm` (it still
  appears in the hero identity line and the footer).
- Desktop nav itself wrapped at 1024–1279px; moved to the `xl:` breakpoint.
- Every anchor landed its target *under* the fixed header. `scroll-margin-top:
  var(--header-h)` on `section[id]`/`main[id]`.
- The mobile menu was a `<details>` in the persistent layout, so `open` survived hash
  navigation and the panel sat over the destination. Now the Popover API — Escape and
  light-dismiss for free, still zero client JS.
- `/variant-b` was inheriting Direction A's chrome, covering its own wordmark bar. The
  homepage moved into a `(site)` route group; variant-b renders bare.

**Rendering defects the mockup review could not see**
- `white-coat-paths` route stub `M58 421 H135` rendered **as a strikethrough through the
  word "ownership"** in the lead paragraph. Moved into the gutter at `M32 470 H72`.
- `five-decisions` spine was painted over by the `relative` rows — the motif rendered as
  unattached fragments, breaking `page_flow`'s continuous-route rule. `z-10` on the spine.
- `strategy-call` repeated two paragraphs verbatim from `next-decision` ~1,100px above.
  Removed. **Nothing replaced them**: writing a fresh sentence would be inventing
  reader-facing copy on a regulated site.

**Accessibility**
- Focus ring was gold — 2.07:1 on ivory, below the 3:1 floor of WCAG 1.4.11. Navy is now
  the default ring; gold only inside the dark bands.
- Footer links were ~20px tap targets → `min-h-11`.
- `text-charcoal/70` (4.46:1) and `text-mist/50` (4.43:1) at 11px both missed AA → `/80`, `/70`.
- Menu button border 2.38:1 → `/45`.
- Added a skip link and `id="main"`.

**Links** — every in-content CTA pointed at the legacy singular domain that `sitemap.ts`
declares reference-only, so each one ejected the visitor off-site past the form. All now
use on-site anchors (`LINKS.*Onsite`), which become the contracted `/our-process`,
`/who-we-serve` and `/meet-michael-epps` routes as those pages ship.

**Gate hardening** — `check-palette.mjs` passed `#f0f`, `#ff00ffcc` and
`font-family: "Winterlude"`, mis-reported every line number (comment stripping collapsed
newlines), stripped `//` inside CSS and inside `https://` URLs, and never checked
`rgba()`. All fixed, plus a try/catch around the contract read.

**Also deduplicated**: two `splitNameCredentials` implementations, two `tel:` href
builders (now `telHref()` in `content.ts`), the orphaned `.va-notch` rule, and a dead
`sitemap.ts` branch.

### Open design findings NOT fixed — operator or client call

- **Surgeons photo has malformed hands** at 4x (fused digits, detached thumb). Asset
  problem; added to CLIENT-GAPS.
- **Mobile `white-coat-paths` collapses to five identical rounded cards** — the desktop
  diagonal collage has no mobile equivalent. Restructuring it changes an approved
  composition, so it is a `taste` call, not craft.
- **Two CTA finishes** ship on one page: flat `bg-gold` (header, form) vs the glossy
  `.va-gold-btn` bevel (hero, next-decision). Unifying means changing the approved hero
  button. `taste`.
- **Same portrait, same crop, twice** on one page. Resolve when the real asset lands.
- **`five-decisions` still leaves ~430px of empty field** at 1440 even after the 46%→72%
  rebalance.
- **Mobile hero H1 breaks to a one-word orphan** ("More,") because `headlineLines()`
  forces the desktop three-line break at every width. Fixing it changes the approved
  line-break invariant in `typography_contract.json`. `taste`.
- **Photo bleed shows ghost lettering** behind copy at 390px in `blueprint-rounds` and
  `accountable-planner`.
- **Gold at 2.07:1 on ivory** is the manifest's mandated structural motif; on light bands
  the route is barely perceptible. Darkening it for light grounds departs from the
  palette contract, so it needs a ruling.

### Verification after fixes

| Gate | Result |
|---|---|
| `npm run build` | pass |
| `npm run lint` | pass, 0 problems |
| `npm run check:palette` | pass |
| `npm run verify` 1536/1440/390 | pass on `/` and `/variant-b`: 0 overflow, 0 broken images, 1 `h1`, 10 anchors |

---

## Stage 2 — productionize intake (2026-09-28)

Branch `build/productionize-full-site`, cut from `main` at `8a3b128` **before any edit**.
A push from `main` publishes on this git-linked Vercel project; there is no merge step to
catch it.

### Source of record captured — closes the open question in CLIENT-GAPS 2.3

`customer_asks` promises to *"preserve accurate, compliance-reviewed source information
while improving structure and expanding thin pages."* That is an instruction to reuse the
client's existing approved copy, not to author fresh copy in its voice. The ledger has
carried "**the source has not been captured**" as an open item since the homepage stage.

It is captured now. `elitephysicianwealthplanning.com` (the legacy singular domain the
manifest marks reference-only) publishes a **42-page sitemap**, fetched in full to
`build/source-capture/` as raw HTML plus extracted text, with `_index.json` recording
every URL, byte count and character count.

That capture also settles the sitemap question: **the route map is derived, not invented.**
Every contracted destination in `section_manifest.functional_elements` already exists on
the source site at the exact contracted path — `/our-process`, `/who-we-serve`,
`/meet-michael-epps`, `/schedule` — and the five `who-we-serve` children match the five
approved `WHITE_COAT_PATHS` audiences one-for-one.

### Hard-rule conflicts found in the source copy — rulings needed, not fixes

Precedence is `hard_rules > client-supplied facts`, so in every row below the hard rule
wins unless the operator rules otherwise. None of these is a defect I introduced; all are
live on the client's own site today.

| # | Source site says | `hard_rules` says | Default action |
|---|---|---|---|
| A | `info@elitephysicianwealthplanning.com`, on all 42 pages | *"Use info@fiscalvisionfinancial.com … Do not reproduce the incorrect reference-site email."* | Use the manifest email. Rule is explicit about this exact trap |
| B | `10665 Stanhaven Pl, Suite 3132, White Plains, MD 20695` | *"Do not show a public street address until the White Plains versus Waldorf discrepancy is authoritatively resolved."* | Keep the address gated; no NAP block, no `LocalBusiness` JSON-LD |
| C | Michael billed as **"2026 5-Star Wealth Manager"** | *"may be identified only with the verified ChFC® and RICP® designations"* + no invented *awards* or *ratings* | Omit the award pending a compliance ruling. A third-party rating in a regulated vertical carries its own disclosure requirements |
| D | Team page names six people, five with title only and no bio | `customer_asks`: add bios *"when the customer supplies them"*; `hard_rules` ban invented *team biographies* | Carry names + titles verbatim. Write no bios |
| E | Three personal staff emails published on the legacy domain | The singular domain is reference-only | Do not republish staff emails on the new domain |

### Blockers confirmed against the source, not assumed

Grepped all 42 captured pages for `iframe`, `calendar.google`, `calendly`, `acuity`,
`hubspot`, form `action=` and the usual form backends: **zero hits.** So CLIENT-GAPS 1.3
(Google Calendar embed) and 1.5 (form destination) are genuinely unsupplied — the source
site does not have them either, and there is nothing to lift.

### One blocker the capture clears

**CLIENT-GAPS 1.8 (legal pages).** `/privacy-disclosures` on the source site is
client-published, compliance-reviewed text covering educational use, no advisory
relationship, tax/legal coordination boundaries, no guarantees, and email/text/phone
consent. That is exactly the copy the skill forbids an agency from drafting — and it does
not need drafting, because the client already publishes it. Reuse verbatim, subject to
rows A, B and E above.

### Decisions taken at the Stage-2 checkpoint (2026-09-28)

| Decision | Value | Who |
|---|---|---|
| Approved direction | **Direction A — The Consult Ledger** | **Operator.** Not inferred. The two `section_manifest.json` files are byte-identical and both palette contracts self-report `APPROVED`, so the repo contains no evidence either way; the approval record lives in the client conversation |
| Sitemap | **Full parity — all 42 source routes** | Operator |
| Missing client deliverables | **Build around them; hand back the gap ledger** | Operator |

Direction B is **retained in full** — `src/components/variant-b/`, `/decision-atlas`,
`public/design/b/**`, `public/images/design/b/**`. It is not deleted until the winner has
shipped, because a deletion is unrecoverable politics and keeping it costs nothing.

### What shipped

**29 routes**, all built from captured client copy. Not one line of page copy was
authored here.

| Family | Routes |
|---|---|
| Homepage | `/` — Direction A, promoted from `/consult-ledger` |
| Contracted destinations | `/our-process`, `/who-we-serve`, `/meet-michael-epps`, `/schedule` |
| Services | `/services` + 5 disciplines |
| Audiences | `/who-we-serve` + 5 profiles |
| Career stage | `/physicians` + 4 stages |
| About | `/about`, `/about/team` |
| Conversion | `/contact`, `/consultation`, `/physician-tax-retirement-guide` |
| Reference | `/resources`, `/insights`, `/privacy-disclosures` |

### New unapproved surfaces — flagged, per Step 6

The approved mockup is one scrolling page with no chrome and no interior pages.
Everything here is therefore new and was derived from Direction A's own language
rather than a template: `PageHero`, `PageSection`, `PageCta`, `ChildIndex`,
`Breadcrumbs`, `FormBand`, and the header's real nav. The header and footer
existed already and were repointed from on-page anchors to the contracted routes.

The interior grid is a two-column editorial split — label rail left, prose right,
the coordination line down the gutter — chosen because `hard_rules` ban "a
generic card grid, rounded-card collection, or centered text stack", and a
five-card row is the most recognisable generated-site tell there is.

### Deviations from the source site, logged

| Deviation | Class | Why |
|---|---|---|
| Company renamed to the plural "Elite Physicians Wealth Planning"; the product "Elite Physician Wealth Blueprint™" left singular | compliance | The manifest uses both deliberately — 8 plural for the company, 3 singular for the Blueprint |
| `[Pending]`, `[X business days — pending]` scrubbed | spec-text-as-ui | Build-stage markers rendering as visible body copy |
| Eight 404ing compliance links not reproduced | compliance | Advertising a Form ADV that does not resolve is worse than omitting it |
| `/who-we-serve`'s six profiles became the linked index instead of an unlinked list plus a second linked list | ai-tell | The first build said everything twice. The client's own enumeration now carries the links; page height fell 3845px → 2619px |
| Interior hero/CTA motif descends at x=1300, not x=214 | legibility | At x=214 the gold line and its node ran straight through the breadcrumb — caught by the contrast gate at **1.9:1** on `/services/wealth-management`, and visibly wrong in the screenshot |
| Both `strategy-call` components routed through `telHref()` | craft | They hardcoded `tel:` without the `+1`, so the site shipped two different phone-link formats |

### Verification

| Gate | Result |
|---|---|
| `next build` | pass — 35 static pages |
| `npm run lint` | pass, 0 problems |
| `npm run check:palette` | pass — 0 bare literals |
| `npm run verify` (30 routes × 3 viewports) | **90 checks, 0 problems**; review bridge present on every route |
| `npm run check:contrast` (30 routes × 2 viewports) | **1808 regions, 0 below AA** |
| Internal link crawl | **26/26 targets resolve**; no legacy-domain links remain |

`scripts/verify-pages.mjs`, `check-text-contrast.mjs` and `serve-verify.sh` were
**extended, not rewritten** — routes widened to the real set and the readiness
probe repointed from `/consult-ledger` (now a redirect) to `/`.

One false alarm worth recording: the first `verify` run reported five broken
images on `/`. All five returned HTTP 200 with real bytes when fetched directly —
it was Next's image optimizer still working on a cold cache, not a defect. The
run was repeated warm and came back clean. Confirm a failing check before
believing it.
