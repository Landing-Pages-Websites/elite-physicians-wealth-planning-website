#!/usr/bin/env python3
"""
Build src/lib/client-content.json from the client's Drive delivery of 2026-10-08.

page-content.json is the LEGACY capture (extract-source-content.py, from the old
singular-domain site). This file holds what the client sent directly: team bios,
the two practice pages Roderick Johnson's handoff specifies, the Risk Protection
service from the compliance-approved blueprint, and its per-service disclosure
notes. pages.ts merges the two, so re-running the legacy capture can never wipe it.

Nothing here is written by us. Every sentence is fetched from the client's text
by `line()` / `items_after()`, which fail loudly if the source line is missing
(the first match at or after `start` wins), so the copy cannot drift from the
documents in build/client-drive-2026-10-08/.

Edits to client text, all deliberate:
  - BRAND and EXPERIENCE below; " | " inside prose becomes ", ".
  - /services: "five planning pillars" -> "six", once Risk Protection exists.
  - The wealth-management disclosure note keeps its first clause only; the rest
    is an instruction ("final copy must include the firm's approved advisory
    and risk disclosures"), tracked as a client gap rather than published.
  - Table cells set in capitals ("THE PRACTICE / Finance It") are set in
    sentence case as subsection headings.
  - typeset(): straight apostrophes become curly and a spaced hyphen becomes
    an en dash. Glyphs only; no word changes.
Labels we wrote (navigation, not claims): page titles, the hub and Risk
Protection eyebrows, "What decisions are included", "For practice owners",
"What's inside the 2026 edition", and the "Profile" / "Overview" eyebrows on
intro bands the documents leave untitled.

Run from the repo root:  python3 scripts/build-client-content.py
"""
import json
import re
from pathlib import Path

SRC = Path("build/client-drive-2026-10-08/text")
CAPTURED = Path("src/lib/page-content.json")
OUT = Path("src/lib/client-content.json")

# 1. The site's brand is the plural "Elite Physicians Wealth Planning" (the
#    same rule pages.ts documents for the legacy capture). The blueprint's
#    "Elite Physicians Planning" is the same firm under a working name.
BRAND = [
    (re.compile(r"Elite Physician Wealth Planning"), "Elite Physicians Wealth Planning"),
    (re.compile(r"Elite Physicians Planning"), "Elite Physicians Wealth Planning"),
]
# 2. Roderick's long bio says "more than four decades"; both landing-page
#    documents say "more than three decades". The site must not contradict
#    itself, and "three" is the claim that stays true under either reading.
#    Logged in build/CLIENT-GAPS.md for the client to confirm.
EXPERIENCE = ("more than four decades", "more than three decades")

PILLAR_ANCHOR = "Wealth Management"
# A no-break space keeps his name on one line under text-balance.
MEET_RODERICK = "Meet Roderick\u00a0Johnson"  # Risk Protection follows it, blueprint order.
GUIDE_PDF = "/guides/physician-tax-retirement-planning-guide-2026.pdf"
FINANCING = "/physicians/commercial-lending-sba-financing"
INSURANCE = "/physicians/business-insurance-risk-management"
RISK = "/services/risk-protection"


def norm(raw):
    text = re.sub(r"\s+", " ", raw.replace(" ", " ")).strip()
    for rx, rep in BRAND:
        text = rx.sub(rep, text)
    # Titles are set as "Manager | Client Experience" inside running prose.
    return text.replace(" | ", ", ")


class Doc:
    """One client document, as normalised lines, with strict lookups."""

    def __init__(self, name):
        # split("\n"), not splitlines(): the docx exports use U+2028 inside
        # one paragraph (Roderick's closing tagline), and splitlines() breaks on it.
        raw = (SRC / name).read_text(encoding="utf-8").split("\n")
        self.lines = [norm(line) for line in raw if line.strip()]

    def index(self, prefix, start=0):
        hits = [i for i, l in enumerate(self.lines) if i >= start and l.startswith(prefix)]
        if not hits:
            raise SystemExit(f"missing source line: {prefix!r}")
        return hits[0]

    def line(self, prefix, start=0):
        return self.lines[self.index(prefix, start)]

    def items_after(self, prefix, start=0):
        """The bullet run directly under the line that starts with `prefix`."""
        i = self.index(prefix, start) + 1
        out = []
        while i < len(self.lines) and self.lines[i].startswith("•"):
            out.append(self.lines[i].lstrip("• ").strip())
            i += 1
        if not out:
            raise SystemExit(f"no bullets under: {prefix!r}")
        return out

    def run(self, first, last):
        """Every line from `first` through `last`, inclusive."""
        a = self.index(first)
        return self.lines[a : self.index(last, a) + 1]


def section(heading=None, paras=(), items=(), after=(), level=2, **extra):
    out = {
        "eyebrow": extra.pop("eyebrow", None),
        "heading": heading,
        "level": level,
        "href": extra.pop("href", None),
        "pending": False,
        "paras": list(paras),
        "items": list(items),
    }
    if after:
        out["after"] = list(after)
    out.update(extra)
    return out


def page(slug, title, description, eyebrow, headline, lede, sections, source, **extra):
    return {
        "slug": slug,
        "title": title,
        "description": description,
        "eyebrow": eyebrow,
        "headline": headline,
        "lede": lede,
        "sections": sections,
        "sourceUrl": source,
        **extra,
    }


def trim(value, limit=155):
    if len(value) <= limit:
        return value
    return value[: value.rfind(" ", 0, limit - 1)].rstrip(",;:") + "…"


# ---------------------------------------------------------------- team bios

def parse_bio(lines):
    """Generic bio parser: bullets are items, short unpunctuated lines headings."""
    sections, cur = [], section()
    for l in lines:
        if l.startswith("•"):
            if cur.get("after"):
                sections.append(cur)
                cur = section()
            cur["items"].append(l.lstrip("• ").strip())
        elif len(l) <= 80 and not re.search(r"[.:?!\"”’)]$", l):
            sections.append(cur)
            cur = section(l)
        elif cur["items"]:
            cur.setdefault("after", []).append(l)
        else:
            cur["paras"].append(l)
    sections.append(cur)
    return [s for s in sections if s["heading"] or s["paras"] or s["items"]]


CTA = section(
    "Start with a strategy conversation.",
    ["A confidential introductory call to discuss your goals, current planning concerns, and next steps."],
    isCta=True,
)

GENERIC_BIOS = [
    # slug, file, header lines to skip, name, role, has photo
    ("la-deidra-blake", "La-Deidra_Blake_Leadership_Profile.txt", 3, "La-Deidra Blake", "Vice President, Operations Manager", True),
    ("lisa-hamilton", "Lisa_Hamilton_Financial_Professional_Profile.txt", 3, "Lisa Hamilton", "Financial Professional, Certified Financial Education Instructor (CFEI)", False),
    ("michael-epps-jr", "Michael_Epps_Jr_bio_transcribed.txt", 3, "Michael Epps Jr.", "Licensed Insurance Professional", True),
    ("aliaya-epps", "Aliaya_Epps_Elite_Physician_Wealth_Planning_Bio.txt", 5, "Aliaya Epps", "Customer Service Manager, Client Experience & Operations", True),
    ("gabriella-gomez-sanchez", "Gabriella_Gomez_Sanchez_Professional_Profile.txt", 3, "Gabriella Gomez Sanchez", "Manager's Assistant, Client Support Manager", True),
    ("joshua-epps", "Joshua_Epps_Business_Operations_Intern.txt", 3, "Joshua Epps", "Business Operations Intern", True),
]


def bio_page(slug, name, role, sections, source, summary):
    return page(
        f"/about/team/{slug}", f"{name}, {role.split(',')[0]}", trim(summary),
        "Our Team", name, role, sections + [CTA], source,
    )


def generic_bios():
    pages, roster = {}, []
    for slug, file, skip, name, role, photo in GENERIC_BIOS:
        lines = Doc(file).lines[skip:]
        # Aliaya's document closes with a "Short Website Bio" written for cards.
        short = None
        if "Short Website Bio" in lines:
            cut = lines.index("Short Website Bio")
            short, lines = " ".join(lines[cut + 1 :]), lines[:cut]
        sections = parse_bio(lines)
        if sections[0]["heading"] is None:
            sections[0]["eyebrow"] = "Profile"
        summary = short or sections[0]["paras"][0]
        pages[f"/about/team/{slug}"] = bio_page(slug, name, role, sections, f"client-drive-2026-10-08/{file}", summary)
        roster.append(member(slug, name, role, summary, photo))
    return pages, roster


# Two of the supplied photographs are seated office shots with a small head;
# these hand-cropped head-and-shoulders versions keep the roster's scale even.
THUMBS = {"michael-a-epps", "michael-epps-jr"}


def member(slug, name, role, summary, photo, href=None):
    return {
        "slug": slug,
        "name": name,
        "role": role,
        "summary": summary,
        "href": href or f"/about/team/{slug}",
        "photo": f"/images/team/{slug}.jpg" if photo else None,
        "thumb": f"/images/team/thumbs/{slug}.jpg" if slug in THUMBS else None,
    }


def pairs(doc, first, last):
    """A two-column table flattened by the converter: label, value, label, value."""
    cells = doc.run(first, last)
    return [f"{cells[i]}: {cells[i + 1]}" for i in range(0, len(cells), 2)]


def roderick():
    d = Doc("Roderick_Johnson_Elite_Physician_Wealth_Planning_Bio.txt")
    opening = d.line("Roderick Johnson brings").replace(*EXPERIENCE)
    sections = [
        section("Executive Profile", [opening, d.line("As Managing Director of"), d.line("Roderick works with physicians")]),
        section(
            "Commercial Lending & Practice Financing",
            [d.line("Through the Commercial Lending and SBA")],
            pairs(d, "SBA & Conventional Finance", "Business acquisition and succession-related financing"),
            [d.line("Roderick's prior professional experience")],
        ),
        section(
            "Business Insurance & Risk Management",
            [d.line("Roderick also brings insurance"), d.line("His role is to help business owners")],
            d.run("Commercial general liability", "Key-person life insurance"),
        ),
        section(
            "A Specialized Focus on Physicians and Medical Practices",
            [d.line("Within Elite Physicians Wealth Planning, Roderick"), d.line("Elite Physicians Wealth Planning is designed"), d.line("Example: A physician considering")],
        ),
        section(
            "An Integrated Advisory Approach",
            [d.line("Roderick works collaboratively")],
            pairs(d, "Personal Wealth", "Key-person protection, buy-sell planning"),
        ),
        # The RLJ Financial Consultants paragraph is omitted on the client's own
        # instruction (landing-page handoff, "Roderick profile module" and
        # "Final Publishing Review"): no RLJ reference until the relationship
        # language is confirmed.
        section("Leadership & Business Experience", [d.line("His professional background includes")]),
        section(
            "Helping Physicians See the Entire Financial Picture",
            [d.line("Roderick's role fits the central mission")],
            d.run("Is my practice appropriately capitalized?", "How do I convert the value"),
            [d.line("Through his role at Elite Physicians Wealth Planning, Roderick")],
        ),
        section(
            "The Elite Physicians Wealth Planning Difference",
            [d.line("The objective is not to create another"), d.line("Build the Practice. Finance the Practice.")],
        ),
    ]
    role = "Managing Director, Commercial Lending & Business Risk Solutions"
    handoff = Doc("Elite_Physician_Wealth_Planning_Landing_Pages_Web_Developer_Handoff.txt")
    summary = handoff.line("Roderick Johnson serves as Managing Director")
    pg = bio_page("roderick-johnson", "Roderick Johnson", role, sections, "client-drive-2026-10-08/Roderick_Johnson_Elite_Physician_Wealth_Planning_Bio.txt", summary)
    pg["description"] = trim(d.line("Commercial banking, SBA financing"))
    return pg, member("roderick-johnson", "Roderick Johnson", role, summary, True)


# ------------------------------------------------------ practice landing pages

def split_terms(line, terms):
    """The converter merges a table column into one line; recover its cells."""
    if " ".join(terms) != line:
        raise SystemExit(f"terms do not cover source line exactly: {line!r}")
    return list(terms)


def financing():
    d = Doc("Physician_Financing.txt")
    sub = lambda heading, paras, items=(), after=(): section(heading, paras, items, after, level=3)
    solutions = [
        sub("Practice Acquisition Financing", [d.line("Whether you are purchasing your first practice"), d.line("Financing may include funds for:")], d.items_after("Financing may include funds for:")),
        sub("SBA 7(a) Financing", [d.line("SBA 7(a) financing may provide"), d.line("Potential uses include:")], d.items_after("Potential uses include:"), [d.line("Eligibility, loan structure")]),
        sub("SBA 504 Financing", [d.line("For physicians considering the purchase"), d.line("Potential uses may include:")], d.items_after("Potential uses may include:")),
        sub("Commercial Real Estate Financing", [d.line("Should you continue leasing"), d.line("For many physicians, this is both"), d.line("We help evaluate financing for:")], d.items_after("We help evaluate financing for:"), [d.line("The analysis can also be coordinated")]),
        sub("Equipment Financing", [d.line("Modern medical practices can require"), d.line("Financing solutions may be available for:")], d.items_after("Financing solutions may be available for:"), [d.line("The objective is to determine whether")]),
        sub("Lines of Credit & Working Capital", [d.line("Even profitable practices"), d.line("Working-capital financing may help address:")], d.items_after("Working-capital financing may help address:")),
        sub("Partner Buy-In and Buyout Financing", [d.line("Medical practices frequently experience"), d.line("We can help physicians evaluate financing related to:")], d.items_after("We can help physicians evaluate financing related to:"), [d.line("These transactions should also be coordinated")]),
        sub("Debt Refinancing", [d.line("Existing debt may no longer"), d.line("Depending on the circumstances, refinancing")], d.items_after("Depending on the circumstances, refinancing"), [d.line("Refinancing should be evaluated carefully")]),
        sub("Business Expansion Financing", [d.line("When the time comes to grow")], d.items_after("When the time comes to grow"), [d.line("We help evaluate the financing need before")]),
    ]
    process = [
        sub("1. Understand the Objective", [d.line("What are you trying to accomplish?"), d.line("Acquire a practice? Purchase a building?")]),
        sub("2. Evaluate the Financial Picture", [d.line("We review relevant business information")], d.items_after("We review relevant business information")),
        sub("3. Evaluate Financing Alternatives", [d.line("We help identify commercial and SBA")]),
        sub("4. Prepare for the Lending Process", [d.line("A well-organized financing request"), d.line("Depending on the financing, lenders may request")], d.items_after("Depending on the financing, lenders may request")),
        sub("5. Coordinate the Transaction", [d.line("Where appropriate, we coordinate with")], d.items_after("Where appropriate, we coordinate with")),
        sub("6. Integrate the Financing Into the Financial Plan", [d.line("Closing the loan is not the end"), d.line("We evaluate how the financing affects:")], d.items_after("We evaluate how the financing affects:")),
    ]
    practice = d.line("Commercial Lending SBA Financing Real Estate")
    physician = d.line("Financial Planning Investment Management Tax Strategy")
    sections = [
        section(None, [d.line("Elite Physicians Wealth Planning helps physicians and medical practice owners evaluate and obtain"), d.line("Our approach goes beyond"), d.line("We help you evaluate how financing affects")], eyebrow="Overview"),
        section(
            "Financing Designed Around the Physician and the Practice",
            [d.line("Physicians frequently have financial circumstances"), d.line("A medical practice may have significant revenue")],
            d.items_after("A medical practice may have significant revenue"),
            [d.line("For that reason, we believe"), d.line("At Elite Physicians Wealth Planning, we combine")],
        ),
        section("Commercial Financing Solutions", [d.line("Our commercial lending capabilities")]),
        *solutions,
        section(
            MEET_RODERICK,
            [d.line("Roderick Johnson brings more than three decades"), d.line("His professional background includes experience"), d.line("Roderick has also served"), d.line("At Elite Physicians Wealth Planning, Roderick focuses"), d.line("He works alongside the broader")],
            d.items_after("He works alongside the broader"),
            eyebrow="Managing Director — Commercial Lending & Business Risk Solutions",
            href="/about/team/roderick-johnson",
            linkLabel="Read Roderick's full bio",
            profile="roderick-johnson",
        ),
        section("Our Physician Financing Process"),
        *process,
        section("Your Practice and Personal Wealth Are Connected.", [d.line("A financing decision affecting your medical practice"), d.line("That is why Elite Physicians Wealth Planning takes")], eyebrow="More Than a Loan"),
        section("The practice: finance it", [], split_terms(practice, ["Commercial Lending", "SBA Financing", "Real Estate", "Working Capital", "Equipment", "Acquisitions"]), level=3),
        section("The physician: build wealth from it", [], split_terms(physician, ["Financial Planning", "Investment Management", "Tax Strategy", "Retirement Planning", "Estate Planning", "Legacy Planning"]), level=3),
        section(d.line("Let’s Discuss Your Financing Needs"), [d.line("Whether you are preparing to acquire your first practice")], isCta=True),
    ]
    return page(
        FINANCING,
        "Physician Practice Financing & SBA Loans",
        trim(d.line("Commercial lending and SBA financing solutions for physicians")),
        "Commercial Lending & SBA Financing",
        d.line("Capital for Your Practice. Strategy for Your Future."),
        d.line("Building a successful medical practice requires"),
        sections,
        "client-drive-2026-10-08/Physician_Financing.txt",
        disclosure=[d.line("Fiscal Vision Financial is not representing itself")],
        form={
            "primary": d.line("Schedule a Physician Business Financing Consultation"),
            "submit": "Request a financing consultation",
            "intent": "Physician business financing consultation",
            "fields": FINANCING_FIELDS,
        },
    )


def lp2():
    d = Doc("Elite_Physician_Wealth_Planning_Landing_Pages_Web_Developer_Handoff.txt")
    start = d.index("Landing Page 2")
    L = lambda prefix: d.line(prefix, start)
    cover = lambda heading: section(heading, [d.lines[d.index(heading, start) + 1]], level=3)
    coverages = [
        "Commercial General Liability", "Professional Liability", "Commercial Property",
        "Business Interruption / Business Income", "Cyber Liability & Data Breach",
        "Employment Practices Liability - EPLI", "Workers' Compensation", "Commercial Auto",
        "Business Owner Policy - BOP", "Commercial Umbrella / Excess Liability",
        "Key Person Life Insurance", "Buy-Sell & Business Continuity Funding",
    ]
    review_steps = [
        "1. Understand the Practice", "2. Identify Major Exposures", "3. Review Current Coverage",
        "4. Prioritize the Risks", "5. Coordinate Coverage", "6. Connect Risk Management to the Financial Plan",
    ]
    q_start = d.index("Common Physician Practice Risk Questions", start)
    practice = L("General Liability Property Cyber EPLI")
    physician = L("Key Person Coverage Buy-Sell Funding")
    sections = [
        section(None, [L("Elite Physicians Wealth Planning helps physicians evaluate business insurance")], eyebrow="Overview"),
        section("Your Practice May Be One of Your Most Valuable Assets", [L("The medical practice may provide current income")]),
        section("Business Insurance Solutions for Medical Practices"),
        *[cover(h) for h in coverages],
        section("Why Physicians Need an Integrated Risk Review", [L("A medical practice may have several policies"), L("A physician practice risk review should consider")]),
        section(
            MEET_RODERICK,
            [L("Roderick Johnson brings extensive experience"), L("His role is particularly important for physician owners")],
            eyebrow="Managing Director — Commercial Lending & Business Risk Solutions",
            href="/about/team/roderick-johnson",
            linkLabel="Read Roderick's full bio",
            profile="roderick-johnson",
        ),
        section("The Physician Practice Risk Review"),
        *[cover(h) for h in review_steps],
        section("Common Physician Practice Risk Questions", [], d.lines[q_start + 1 : d.index("The Integrated Elite Physician Approach", start)]),
        section("The Integrated Elite Physician Approach"),
        section("Protect the practice", [], split_terms(practice, ["General Liability", "Property", "Cyber", "EPLI", "Workers' Compensation", "Business Interruption", "Commercial Auto"]), level=3),
        section("Protect the physician", [], split_terms(physician, ["Key Person Coverage", "Buy-Sell Funding", "Disability Planning", "Retirement Planning", "Wealth Management", "Estate Planning", "Succession Planning"]), level=3),
        section(L("How well protected is your practice today?"), [L("Request a structured review of your current business risks")], isCta=True),
    ]
    return page(
        INSURANCE,
        "Business Insurance for Physicians",
        trim(L("Business insurance and risk-management solutions for physicians")),
        "Business Insurance & Risk Management",
        L("Protect the Practice You've Worked So Hard to Build."),
        L("Your medical practice represents years"),
        sections,
        "client-drive-2026-10-08/Elite_Physician_Wealth_Planning_Landing_Pages_Web_Developer_Handoff.txt",
        disclosure=[L("Insurance products and availability vary by state")],
        form={
            "primary": L("PRIMARY BUTTON: Request a Physician Practice Risk Review").split(": ", 1)[1],
            "submit": "Request a practice risk review",
            "intent": "Physician practice risk review",
            "fields": INSURANCE_FIELDS,
        },
    )


CONTACT_METHOD = {"name": "preferredContact", "label": "Preferred contact method", "options": ["Email", "Phone"]}
PHONE = {"name": "phone", "label": "Phone", "type": "tel"}
SPECIALTY = {"name": "medicalSpecialty", "label": "Medical specialty"}
PRACTICE = {"name": "practiceName", "label": "Practice name"}

# Field lists are the handoff's "Recommended ... Lead Form", minus the three the
# shared form already asks (name, email, additional comments). All optional.
FINANCING_FIELDS = [
    PHONE, SPECIALTY, PRACTICE,
    {"name": "yearsInPractice", "label": "Years in practice"},
    {"name": "financingNeed", "label": "What are you looking to finance?", "options": [
        "Practice acquisition", "SBA 7(a) financing", "SBA 504 financing", "Commercial real estate",
        "Equipment", "Line of credit or working capital", "Partner buy-in or buyout",
        "Debt refinancing", "Business expansion", "Other"]},
    {"name": "financingAmount", "label": "Approximate financing amount"},
    {"name": "practiceRevenue", "label": "Annual practice revenue range"},
    {"name": "desiredTiming", "label": "Desired timing"},
    CONTACT_METHOD,
]
INSURANCE_FIELDS = [
    PHONE, SPECIALTY, PRACTICE,
    {"name": "locationCount", "label": "Number of locations"},
    {"name": "employeeCount", "label": "Approximate number of employees"},
    {"name": "officeTenure", "label": "Own or lease office space?", "options": ["Own", "Lease"]},
    {"name": "renewalMonth", "label": "Current business insurance renewal month", "options": [
        "January", "February", "March", "April", "May", "June", "July", "August",
        "September", "October", "November", "December", "Not sure"]},
    {"name": "primaryConcern", "label": "Primary concern", "options": [
        "Property", "Liability", "Cyber", "Workers comp", "EPLI", "Business interruption", "Key person", "Other"]},
    {"name": "policyReview", "label": "Would you like us to review existing policies?", "options": ["Yes", "No"]},
    CONTACT_METHOD,
]


# --------------------------------------------- hub, risk protection, revisions

def hub(handoff, roderick_summary):
    start = handoff.index("Suggested Homepage Cross-Promotion")
    lede = handoff.line("Physicians frequently operate in two financial worlds")
    card = lambda prefix: handoff.line(prefix, start).split(" - ", 1)[1]
    sections = [
        section("Commercial Lending & SBA Financing", [card("Commercial Lending & SBA Financing - ")], href=FINANCING),
        section("Business Insurance & Risk Management", [card("Business Insurance & Risk Management - ")], href=INSURANCE),
        # One sentence, so the person's row keeps the shape of the two service rows.
        section(MEET_RODERICK, [roderick_summary.split(". ")[0] + "."], href="/about/team/roderick-johnson"),
        CTA,
    ]
    return page(
        "/practice-solutions", "Practice Financing & Business Insurance for Physicians",
        trim(lede), "Practice Solutions",
        handoff.line("Your Practice. Your Wealth. One Coordinated Strategy."), lede,
        sections, "client-drive-2026-10-08/Elite_Physician_Wealth_Planning_Landing_Pages_Web_Developer_Handoff.txt",
    )


def pillar_sections(captured):
    """The legacy capture's own five pillar blurbs, keyed by heading."""
    found = {}
    for pg in captured.values():
        for s in pg["sections"]:
            if s["level"] == 3 and s["href"] and s["href"].startswith("/services/"):
                found.setdefault(s["heading"], s)
    return found


def risk_protection(blueprint, handoff, captured, insurance_card):
    b = Doc(blueprint)
    start = b.index("Risk Protection", b.index("5. Service Page Specifications"))
    pillars = pillar_sections(captured)
    order = ["Tax Strategy", "Retirement Strategy", "Wealth Management", "Practice & Business Planning", "Legacy Planning"]
    insurance_disclosure = handoff.line("Insurance products and availability vary by state")
    sections = [
        section("What decisions are included", [], b.items_after("Core topics:", start)),
        section(None, eyebrow="For practice owners"),
        section("Business Insurance & Risk Management", [insurance_card], level=3, href=INSURANCE),
        section("Each pillar connects to the others"),
        *[pillars[h] for h in order],
        section("Ready to coordinate this into one strategy?", [b.line("Body: Start with a private conversation").split(": ", 1)[1]], isCta=True),
    ]
    return page(
        RISK, "Risk Protection for Physicians",
        b.line("Page headline: Protect income, family", start).split(": ", 1)[1],
        "Risk Protection",
        b.line("Page headline: Protect income, family", start).split(": ", 1)[1],
        b.line("• Risk Protection — ").split(" — ", 1)[1],
        sections, "client-drive-2026-10-08/Elite_Physicians_Planning_Website_Blueprint.txt",
        # The blueprint's own Risk Protection note is an instruction ("must be
        # described using approved carrier and licensing disclosures"), not
        # copy. The client's insurance compliance language is the copy it asks for.
        disclosure=[insurance_disclosure],
    )


def revisions(blueprint, captured, risk_pillar, cross_promo, guide):
    b = Doc(blueprint)
    notes = [l.split(": ", 1)[1] for l in b.lines if l.startswith("Disclosure note:")]
    tax, retirement, wealth, _risk, estate, practice = notes
    out = {route: {"insert": [{"after": PILLAR_ANCHOR, "sections": [risk_pillar]}]}
           for route, pg in captured.items()
           if route != "/" and any(s["level"] == 3 and s["heading"] == PILLAR_ANCHOR for s in pg["sections"])}
    # /services/wealth-management omits itself from its own pillar list.
    out["/services/wealth-management"] = {"insert": [{"after": "Retirement Strategy", "sections": [risk_pillar]}]}
    for route, note in [
        ("/services/tax-planning", tax), ("/services/retirement-planning", retirement),
        ("/services/wealth-management", wealth.split(";")[0] + "."),
        ("/services/legacy-estate-planning", estate), ("/services/practice-owner-planning", practice),
    ]:
        out.setdefault(route, {})["disclosure"] = [note]
    services_lede = captured["/services"]["lede"].replace("five planning pillars", "six planning pillars")
    out["/services"] = {
        "lede": services_lede,
        # The captured description lists the five pillars by name; the revised
        # lede states six without a list that would now be incomplete.
        "description": services_lede,
        "insert": [{"after": PILLAR_ANCHOR, "sections": [dict(risk_pillar, level=2)]}],
    }
    out["/services/practice-owner-planning"].setdefault("insert", []).append({"before": "Each pillar connects to the others", "sections": cross_promo})
    out["/physicians/practice-owners"]["insert"].append({"before": "How the plan connects", "sections": cross_promo})
    out["/about/team"] = {"dropLevel3": True}
    out["/physician-tax-retirement-guide"] = {"insert": [{"after": "Who it is for", "sections": [guide]}]}
    out["/resources"] = {"links": {"The Physician Tax & Retirement Planning Guide": {"href": "/physician-tax-retirement-guide", "label": "Get the guide"}}}
    return out


def guide_section():
    g = Doc("guide.txt")
    contents = g.run("1. Executive Summary for Physicians", "15. Checklists, Data Request, and Source Notes")
    return section(
        "What's inside the 2026 edition",
        # pdftotext wraps this sentence across two lines; rejoin the first sentence only.
        [g.line("This guide is based on federal tax") + " " + g.line("as of July 7, 2026.").split(". ")[0] + "."],
        [re.sub(r"^\d+\. ", "", c) for c in contents],
    )


def founder_line(captured):
    """Michael's roster line from the legacy capture, fetched by its words."""
    for s in captured["/about/team"]["sections"]:
        for para in s["paras"]:
            if para.startswith("Leads the firm's overall planning philosophy"):
                return para
    raise SystemExit("missing founder line in /about/team capture")


# Revision anchors ("after"/"before") are typeset too: a changed anchor fails
# the build in pages.ts, and none of the captured headings carry either glyph.
UNTYPESET = {"slug", "href", "sourceUrl", "photo", "thumb"}


def typeset(value, key=None):
    """Curly apostrophes and spaced en dashes, on prose only — never on paths or anchors."""
    if isinstance(value, dict):
        return {k: typeset(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [typeset(v, key) for v in value]
    if not isinstance(value, str) or key in UNTYPESET:
        return value
    value = re.sub(r"(?<=\w)'(?=\w)", "’", value)
    value = re.sub(r"(?<=s)'(?=\s|$)", "’", value)
    return value.replace(" - ", " – ")


def main():
    captured = json.loads(CAPTURED.read_text(encoding="utf-8"))
    handoff = Doc("Elite_Physician_Wealth_Planning_Landing_Pages_Web_Developer_Handoff.txt")
    blueprint = "Elite_Physicians_Planning_Website_Blueprint.txt"
    card = lambda prefix: handoff.line(prefix, handoff.index("Suggested Homepage Cross-Promotion")).split(" - ", 1)[1]
    financing_card, insurance_card = card("Commercial Lending & SBA Financing - "), card("Business Insurance & Risk Management - ")

    rod_page, rod = roderick()
    bios, roster = generic_bios()
    founder = member("michael-a-epps", "Michael A. Epps", "Founder & Chief Wealth Strategist, ChFC®, RICP®",
                     founder_line(captured), True, href="/meet-michael-epps")
    team = [founder, rod] + roster  # seniority order, per each document's own title

    risk_line = Doc(blueprint).line("• Risk Protection — ").split(" — ", 1)[1]
    risk_pillar = section("Risk Protection", [risk_line], level=3, href=RISK)
    cross_promo = [
        section(handoff.line("Your Practice. Your Wealth. One Coordinated Strategy.")),
        section("Commercial Lending & SBA Financing", [financing_card], level=3, href=FINANCING),
        section("Business Insurance & Risk Management", [insurance_card], level=3, href=INSURANCE),
    ]
    pages = {
        **bios,
        rod_page["slug"]: rod_page,
        FINANCING: financing(),
        INSURANCE: lp2(),
        "/practice-solutions": hub(handoff, rod["summary"]),
        RISK: risk_protection(blueprint, handoff, captured, insurance_card),
    }
    content = {
        "_provenance": "Generated by scripts/build-client-content.py from build/client-drive-2026-10-08/. Do not edit by hand.",
        "team": team,
        "pages": pages,
        "revisions": revisions(blueprint, captured, risk_pillar, cross_promo, guide_section()),
    }
    OUT.write_text(json.dumps(typeset(content), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{OUT}: {len(team)} team members, {len(pages)} pages, {len(content['revisions'])} revisions")


if __name__ == "__main__":
    main()
