# Client gaps — Elite Physicians Wealth Planning

Everything the build cannot supply for itself. This is a deliverable: each item is a
blocker held open on purpose rather than filled with plausible content. Nothing below has
been invented, substituted, or worked around.

---

## 1. Blockers — the site cannot launch without these

### 1.1 Portrait provenance — highest priority
`public/images/design/shared/hero-founder.png` renders as **Michael A. Epps** in the hero
and again in the planner section, with alt text asserting he is the named person.

The approved reference frames `public/design/a/refs/01-one-plan.png` and
`07-accountable-planner.png` show a **neutral placeholder card** reading "REAL MICHAEL A.
EPPS PORTRAIT — BUILD-TIME CLIENT ASSET; NEUTRAL PLACEHOLDER IN FRAME". `extraction_plan.json`
states repeatedly that no Epps likeness may be generated or extracted. `hard_rules`: *"Michael
A. Epps and all named staff are never generated."*

At full resolution the image's background contains a **framed diploma and an award plaque** —
credential theater, which `hard_rules` ban outright regardless of who the subject is.

Confirmed at render scale on the built page (1536×864): the desk in frame carries a
**nameplate reading "PLANNING / PROTECTING / PROVIDING / PEACE OF MIND"**. That tagline
appears nowhere in the build — not in `brand`, not in `content.ts`, not in any manifest.
It is invented brand copy baked into a raster image: uneditable, invisible to screen
readers and to search, and sitting beside a named individual's likeness.

Three ways out; the choice is yours, and the image is untouched until you make it:
- **(a)** Confirm it is a genuine client photo and send provenance — the diploma and plaque
  still need addressing.
- **(b)** Send the real photograph and we swap it.
- **(c)** Revert to the approved neutral placeholder. This *increases* fidelity to the
  approved artifact, but ships a visible "portrait pending" state.

### 1.2 Real logo
`hard_rules`: the existing logo is a fixed asset, never redesigned, and *"the outdated
Fiscal Vision logo"* must not become the final identity without explicit approval. No logo
file exists in the repo. The header and footer currently set the wordmark as **type**.
Blocks favicon, apple-icon, `themeColor` and OG images — all currently absent.

### 1.3 Google Calendar scheduling embed
`customer_asks`: *"Include direct Google Calendar scheduling using the supplied embed."*
Not supplied. "Schedule a strategy call" currently points at the legacy singular domain
via `LINKS.schedule`. `/schedule` cannot be built honestly without it.

### 1.4 Guide file + approved delivery workflow
`hard_rules`: the tax-planning guide *"remains gated and contingent on the customer
supplying the final guide and approved delivery workflow; never show it as immediately
downloadable."* Neither supplied. No agency-owned email pipeline has been stood up to
paper over this — doing so would invent the very workflow the rule reserves to you.

### 1.5 Form submit destination
`NEXT_PUBLIC_LEAD_ENDPOINT` is unset. The form validates and falls back to `mailto:`, and
says so rather than reporting a success that did not happen. Name the CRM or endpoint.

### 1.6 Analytics / GTM container
The mandatory `window.dataLayer.push({ event: 'form_submission' })` fires into no
container. Supply the GTM or GA4 ID.

### 1.7 Street address
`hard_rules`: no public address *"until the White Plains versus Waldorf discrepancy is
authoritatively resolved."* Unresolved, so the footer carries no NAP block and
`LocalBusiness` JSON-LD has not been emitted.

### 1.8 Legal pages
`/privacy`, `/terms`, `/disclosures` are **not drafted**. This is a regulated
financial-services site; the ship-gate agents check craft, not regulatory exposure.
Supply client- or compliance-reviewed text, or instruct us to launch without the routes.
They are deliberately unlinked from the footer — linking to routes that 404 is worse.

---

## 2. Decisions needed

### 2.1 Error colour is off-contract
`palette_contract.json` defines no error/validation state. The strategy-call form needs
one and uses `#9a2c2c`, now declared as `--color-danger` and flagged in `globals.css`.
It is **not** a brand colour. Confirm it, or supply one.

### 2.2 The two removed section mastheads
"The Consult Ledger" tabs are gone from `03-separate-rooms` and `04-blueprint-rounds`
(see the ledger). Those sections now open on their orientation line like every other
section. If you want a real label in that slot, supply the wording — we will not invent
practice branding.

### 2.3 Compliance-reviewed source copy
`customer_asks` promises to *"preserve accurate, compliance-reviewed source information
while improving structure and expanding thin pages."* That is an instruction to reuse the
existing approved copy, not to write fresh copy in its voice. **The source has not been
captured**, and no interior copy has been written. Confirm the legacy site
(`elitephysicianwealthplanning.com`) is the source of record before interior pages begin.

### 2.4 Review scaffolding
The `app.gomega.ai/review-bridge` script and `public/review-routes.json` are still live in
the build. Keep them for post-launch review, or strip them? Related: `public/design/**` is
the only copy of the approved design in the repo and is currently **publicly served**.
Moving it out of `public/` (keeping it in git) is recommended — confirm.

### 2.5 Cormorant Garamond 700
`typography_contract.json` declares display weights 400/500/600/**700**; `public/fonts/`
ships 400/500/600 only, so any 700 display weight is being synthesised by the browser.
Supply the file or amend the contract.

---

## 3. Quarantined

`public/images/design/shared/services-pillars-team.png` — 1.9 MB, referenced by nothing in
`src/`, but still deployed and publicly fetchable. It shows a suited figure surrounded by
fabricated white-coated "staff" in front of a wall-mounted chart: three `hard_rules`
violations in one file (fabricated staff, market-chart imagery, an unnamed principal
presented as the planner).

**Not yet moved** — quarantining it is a `public/` change and is bundled into decision 2.4
above so you rule on the whole scaffolding question at once.

---

## 4. Asset defects found at render scale

### 4.1 Surgeons photograph — malformed hands
`public/images/design/a/06-white-coat-paths/surgeons-operating-room.jpg`. Inspected at 4x:
the gloved hands show fused/tapering digits with no resolvable count, a detached thumb
shape, and an instrument terminating in nothing. `hard_rules` require rejecting
"uncanny faces, impossible anatomy, or fake clinical detail". Needs a re-crop above the
hands or a replacement image.

### 4.2 The same portrait twice
`hero-founder.png` renders in the hero and again in the planner section — same asset, same
crop, same ivory ring-1 card, on one page. Independent of the provenance question in 1.1:
when the real photograph arrives, supply or authorise two different crops (tight for the
hero, environmental for the planner section).

### 4.3 The hero plate is a broken render
`public/images/design/a/01-one-plan/hero-office-reconstructed.jpg` measures a mean
luminance of **0.0127**, with 1.1% of its pixels above near-black. Brightened 6x it
resolves into a hard-edged rectangular patch of horizontal smear bands across the
right-centre and heavy vertical banding down the left. It is not an underexposed
photograph — it is damaged, and no scrim or exposure adjustment recovers it.

Two of Direction A's other plates are in the same state:

| Asset | Mean luminance | Above near-black |
|---|---|---|
| `a/01-one-plan/hero-office-reconstructed.jpg` | 0.0127 | 1.1% |
| `a/08-next-decision/office-background-reconstructed.jpg` | 0.0098 | **0.0%** |
| `a/02-career-signal/office-background-reconstructed.jpg` | 0.0283 | 4.8% |

None is requested by the CSS any more. Until usable plates are supplied, those
bands run on designed grounds. ~~**A replacement hero photograph is a client deliverable**~~ **RESOLVED** —
`hero-consultation-office.jpg` was generated to `build/IMAGE-BRIEF.md` and wired in.
The original
deliverable note read — a low-key physician consultation-office scene, per the
`extraction_plan` recipe, with no composite seam.

---

## 9. Evidence the page cannot manufacture (raised by the design audit, 2026-09-04)

An independent design critic ran against Direction B and reached a verdict of
FAIL on one dimension that no amount of layout work can move: **specificity,
scored 2/10**. Its test is the swap test — replace "physician" with "attorney"
and change four photographs, and the page is unchanged. That is correct, and it
is a content gap, not a design gap.

What is missing, and why the build will not invent it:

| Missing | Why it matters | Why we cannot write it |
|---|---|---|
| How Michael is paid — flat planning fee, AUM %, commission, or a mix | The first question a physician asks an advisor. Its absence is the largest trust gap on an advisory page | A compensation model is a regulated disclosure. Guessing it is a compliance exposure, not a copy shortcut |
| Any engagement minimum, and what the first meeting costs | Same | Same |
| Fiduciary status, BD/RIA affiliation, CRD number | The page carries ChFC® and RICP® marks with no registration line beneath them | Verifiable registration facts, client-supplied only |
| Client count, years in practice, AUM, or one attributed outcome | The whole page currently carries zero numbers apart from a phone number and office hours | `hard_rules`: never invent stats, case studies or testimonials |
| Physician-specific decisions by career stage (PSLF vs refinancing, W-2 attending vs 1099 locums, 403(b)/457(b)/cash-balance ordering, backdoor Roth, practice buy-in economics, malpractice-driven asset protection) | This is what would make the audience descriptions non-interchangeable | Specific tax and retirement mechanics stated as advice. Reserved to the client and their compliance review |

The audit's other high-ranked finding — that four to five image slots render as
empty placeholders — was **checked and dismissed**. The auditing screenshot tool
captures without scrolling, and Next/Image lazy-loads below the fold, so every
below-fold photograph captured blank. Measured live at 390, 768, 1024, 1100,
1240 and 1440: nine images, zero broken, at every width.

Its finding on the hero photograph **was** correct and has been actioned; see §10.

## 10. Direction B hero plate — replaced

`b/01-one-plan/medical-office-scene.jpg` is retained for provenance and is no
longer rendered. Inspected at 4x it carries:

- a second hand with no thumb and no wrist, dissolving into the desk
- a pen nib forked into three tines, not touching the paper it is marking
- hard-edged rectangular composite patches across the right of frame
- a source resolution of 642x420 being stretched into a 621x652 slot

It was also arguing the wrong case: a wealth-planning hero whose subject is an
MRI reads as a radiology practice.

Replaced by `planning-conversation.jpg` (1600x2400), generated to the same brief
discipline as the Direction A plates and accepted on the same probes: no legible
text anywhere, no diagnostic imagery, complete undamaged faces, anatomically
coherent hands with wrists and cuffs, no composite seam at 2.2x brightness.

---

# Stage 2 — full-site build (2026-09-28)

The interior site is built from the client's own published copy, captured from
`elitephysicianwealthplanning.com` and held in `build/source-capture/`. What
follows is everything that capture could **not** resolve. Nothing below has been
filled with plausible substitute content.

## 11. Routes held back — 13 of the source site's 42

### 11.1 The twelve `/insights/*` articles — unwritten at source
Every one of the twelve article URLs on the live site is a stub. Each renders
`Published: [Pending]` and `Reviewer: [Pending]` in its own markup, and **all
twelve share one identical body paragraph**: *"This article will walk through the
framework, the questions it prompts, and how a physician might work through it
with their CPA, attorney, TPA, insurance professional, or financial planner."*

They are not shipped, for three reasons that compound:
- Twelve near-duplicate thin pages on a brand-new domain is the doorway pattern
  that cost a previous build most of its index.
- `[Pending]` is a build-stage marker rendering as visible body copy — the same
  defect class this build already removed elsewhere.
- Writing them here would mean authoring regulated financial content whose own
  source marks the review as outstanding. That is not an agency call.

`/insights` **does** ship, as a contents page: the twelve titles and their real
summaries are the client's, so they are presented as "in preparation" and nothing
links to a route that would 404. Supply the copy, or a reviewer, and each article
becomes a route with no further design work.

### 11.2 `/checkup` — an assessment with no result
The source page is a seven-question self-assessment ("Question 1 of 7 · Cash
Flow"). Only question one exists in the served HTML; the rest and the scoring are
client-side and were not recoverable. The repo's own floor is explicit that
anything styled as a control must produce a complete useful outcome — *"never
ship decorative radios, filters, quizzes, calculators, or forms that accept input
and then do nothing."* Supply the seven questions and what the result should say,
and note that "identifies discussion areas" is a compliance-sensitive phrasing.

## 12. Compliance documents the source site advertises but does not have

The live footer links eight documents. **All eight return 404 today**, verified
individually:

| Advertised | Status |
|---|---|
| Terms of Use | 404 |
| Accessibility Statement | 404 |
| Cookie Notice | 404 |
| Form CRS | 404 |
| Form ADV | 404 |
| BrokerCheck / IAPD | 404 |
| Insurance & Licensing | 404 |
| Disclosures | 404 |

They are **not** reproduced in this build. Advertising a Form ADV or a BrokerCheck
link that does not resolve is worse on a regulated site than not listing it, and
drafting those documents is not an agency call. Only `/privacy-disclosures` is
linked, because the client actually publishes that text.

## 13. Claims removed from the source copy, pending a ruling

| # | What the source says | Why it is not carried |
|---|---|---|
| 13.1 | Michael billed as **"2026 5-Star Wealth Manager"** | `hard_rules`: he "may be identified only with the verified ChFC® and RICP® designations", and inventing *awards* or *ratings* is banned. This one is not invented — it is on the client's own site — but a third-party rating in this vertical carries its own disclosure requirements. Confirm the award, its selection criteria and the required disclosure, or it stays off |
| 13.2 | `info@elitephysicianwealthplanning.com` on all 42 pages | `hard_rules` name the reference-site email as incorrect and mandate `info@fiscalvisionfinancial.com` |
| 13.3 | `10665 Stanhaven Pl, Suite 3132, White Plains, MD 20695` | Still gated. The White Plains versus Waldorf discrepancy is unresolved, so no address appears anywhere and `LocalBusiness` JSON-LD is not emitted |
| 13.4 | Three personal staff email addresses | On the legacy domain, which is reference-only. Not republished |

## 14. Team bios — six of seven people
`/about/team` names **seven** people: Michael A. Epps, Lisa Alexander, Michael
Epps Jr., Joshua Epps, La-Deidra Blake, Aliaya Epps and Gabriela Gomez-Sanchez.
Only Michael has a bio. (An earlier revision of this register said six and
omitted Gabriela — corrected on audit.)

`customer_asks` says to add bios *"when the customer supplies them"* and
`hard_rules` ban invented team biographies, so names and titles ship verbatim and
nothing else. No bio text was invented for anyone — that was swept and is clean.
Send bios and they drop straight in.

## 15. Still open from the homepage stage
1.1 portrait provenance · 1.2 real logo (still blocks favicon, app icons,
`themeColor` and OG images) · 1.3 Google Calendar embed · 1.4 guide file and
delivery workflow · 1.5 form endpoint (`NEXT_PUBLIC_LEAD_ENDPOINT`) · 1.6
analytics container.

On 1.3 and 1.5, one thing is now settled rather than assumed: **the source site
does not have them either.** All 42 captured pages were grepped for an `iframe`,
`calendar.google`, `calendly`, `acuity`, `hubspot` and a form `action` — zero
hits. There is nothing to lift, so both are genuine client deliverables.

## 16. Production cutover — not executed
`next.config.ts` redirects the source site's old paths to their new homes, but a
redirect only fires for traffic that reaches **this** app. Moving
`elitephysicianwealthplanning.com` (singular) to
`elitephysicianswealthplanning.com` (plural) is a **DNS cutover**, not a config
edit. Flagged for the operator; not executed here.

---

# Kickoff brief reconciliation (2026-09-30)

The kickoff brief and meeting notes arrived after the build. They close one
contracted blocker outright, reclassify several, and add one instruction that
applies to work already shipped.

## CLOSED

**1.3 Google Calendar embed — SUPPLIED AND WIRED.** `customer_asks` contracts
this ("Include direct Google Calendar scheduling using the supplied embed") and
every CTA on the site routes at `/schedule`. That page now books directly
through the client's own appointment schedule, with the request form kept below
it as a second route for anyone the widget fails or does not suit. The schedule
id lives in one place (`src/components/pages/calendar-embed.tsx`) so a reissued
link is a one-line change.

**Contact email.** `info@fiscalvisionfinancial.com` confirmed as correct and
already applied site-wide; the reference site's address is confirmed incorrect.

**AI imagery.** Explicitly permitted ("AI Imagery Allowed: Yes"), which sanctions
the generated photography already in the build and the remaining routes.

## RECLASSIFIED — outstanding, but NOT completion blockers

Peter's direction of 2026-08-29 is explicit that the build proceeds without
these. Aliaya was asked on 8/27 (thread 1a04448785c19586, no reply as of 8/29)
and the Drive folder was re-verified empty. They are tracked on customer-follow-up
child `879d7a8b-cbbe-47bf-a6d8-2087a129cdc6` and swap in on arrival:

- Team bios for everyone, plus the new employee's photo and bio (§14 above)
- The final tax-planning guide file (§15, gate is built and waiting)
- Original images, documents and wording sources
- A logo file. Direction is now given — **gold, blue and white, clean and
  refined** — and Peter can generate concepts. Until a file exists this still
  blocks favicon, app icons, `themeColor` and `og:image`.

## STILL GENUINELY BLOCKING

- **Form endpoint.** `NEXT_PUBLIC_LEAD_ENDPOINT` unset; verified on the live
  deployment that submitting produces zero POSTs and falls back to mailto.
- **Analytics container.** No GTM/GA4 on the live page, so the mandatory
  `dataLayer.push({ event: 'form_submission' })` fires into nothing.
- **Portrait provenance** (§1.1). Unchanged.

## NEW INSTRUCTION THAT APPLIES TO SHIPPED WORK

*"Improve website imagery to reflect a more professional and refined look,
reducing overly AI-generated appearance."*

Taken seriously and applied to our own output, not just the reference site's.
Every hero photograph was re-inspected at the size it now ships — ~46% of a
1440 fold, far larger than the card crops they were first judged at. Verdict by
asset rather than in the aggregate:

| Asset | At hero scale |
|---|---|
| physicians-specialists-consultation | Holds. Asymmetric face, real skin texture, credible room. |
| dental-office-planning | Holds. Clinician from behind, no hands, real equipment. |
| surgeons-operating-room | Holds. |
| healthcare-executive-hallway | Holds. |
| **practice-owner-meeting** | **Failed and was regenerated.** The pen barrel passed through the fingers and the grip did not close. |

The cause was our own brief: it made a pen grip the focal point, which the
imagery rules name as a known failure ("never make a complex grip the focal
point — pointing, pinching a page and gripping a board edge all fail often").
The replacement designs the risk out — hands clasped, nothing held — and was
checked at 3x before shipping: eight fingers interlaced correctly, two thumbs,
no fusion. Lesson recorded: an image that passes at card size has not been
tested for a hero.

## CONTEXT WORTH KEEPING

- **The current site is removed after launch.** `build/source-capture/` is then
  the only surviving record of the copy this build preserves. Do not delete it.
- **Positioning:** financial planning for physicians, Fiscal Vision Financial as
  parent, **Elite Physicians Planning** as the DBA.
- **Domain:** GoDaddy access confirmed and previously provided to Benji. The
  plural domain is correct and intentional. It currently serves a GoDaddy-built
  site; the cutover remains a DNS action, not a config change.
- **Still asked for and not yet done:** rebuild the service infographics to
  emphasise holistic planning and coordinated internal resources, and expand the
  thin physician/surgeon/dentist pages further for ads and presentations.
