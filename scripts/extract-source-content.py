"""
Regenerate src/lib/page-content.json from the captured source site.

The interior copy is the client's, captured from elitephysicianwealthplanning.com
into build/source-capture/. This script is the ONLY thing that turns that capture
into the shipped content, so the transformation is reproducible and reviewable
rather than a one-off that happened in a scratch directory.

Run:  python3 scripts/extract-source-content.py
"""
import html
import json
import os
import re

CAPTURE = "build/source-capture"
OUT = "src/lib/page-content.json"

# Source slug -> production route.
ROUTE = {
    "home": "/", "physicians": "/physicians",
    "physicians__residents-fellows": "/physicians/residents-fellows",
    "physicians__established": "/physicians/established",
    "physicians__practice-owners": "/physicians/practice-owners",
    "physicians__retirement": "/physicians/retirement",
    "services": "/services",
    "tax-planning-for-physicians": "/services/tax-planning",
    "retirement-planning-for-physicians": "/services/retirement-planning",
    "wealth-management-for-physicians": "/services/wealth-management",
    "practice-owner-planning": "/services/practice-owner-planning",
    "legacy-estate-planning": "/services/legacy-estate-planning",
    "our-process": "/our-process", "insights": "/insights",
    "about": "/about", "meet-michael-epps": "/meet-michael-epps",
    "about__team": "/about/team", "who-we-serve": "/who-we-serve",
    "physicians-specialists": "/who-we-serve/physicians-specialists",
    "financial-planning-for-surgeons": "/who-we-serve/surgeons",
    "financial-planning-for-dentists": "/who-we-serve/dentists-dental-specialists",
    "financial-planning-for-crnas-nps-pas": "/who-we-serve/crnas-nps-pas",
    "financial-planning-for-healthcare-executives": "/who-we-serve/healthcare-executives",
    "resources": "/resources",
    "physician-tax-retirement-guide": "/physician-tax-retirement-guide",
    "schedule": "/schedule", "contact": "/contact",
    "privacy-disclosures": "/privacy-disclosures",
    "consultation": "/consultation", "checkup": "/checkup",
}

# Source PATH -> production route, for rewriting in-content links. Built from
# ROUTE, since a source slug is its path with "/" written as "__".
SRC_PATH = {"/" + slug.replace("__", "/"): route for slug, route in ROUTE.items()}
SRC_PATH["/"] = "/"

# Routes deliberately not shipped — see build/CLIENT-GAPS.md sections 11-12.
BLOCKED = {"/checkup"} | {f"/insights/{s.split('__', 1)[1]}" for s in ROUTE if s.startswith("insights__")}
# Routes whose final section is real content, not a closing CTA. The guide's
# last section is the source's request FORM ("Request the guide"), and treating
# it as a CTA shipped that heading twice on one continuous navy slab.
NO_CTA = {"/privacy-disclosures", "/physician-tax-retirement-guide"}


def text(fragment):
    """
    Flatten a fragment to its text. Tags become a SPACE, not nothing — the source
    sets a step's folio and its label as two sibling elements, and joining with
    "" produced "01Discover". The punctuation pass undoes the space that
    introduces before a comma or a full stop.
    """
    fragment = re.sub(r"(?is)<(script|style|svg)[^>]*>.*?</\1>", " ", fragment)
    flat = html.unescape(re.sub(r"(?s)<[^>]+>", " ", fragment))
    flat = re.sub(r"\s+", " ", flat)
    flat = re.sub(r"\s+([,.;:!?%)\]])", r"\1", flat)
    flat = re.sub(r"([(\[])\s+", r"\1", flat)
    return flat.strip()


# The source prints each process step's folio as its own element. It is
# decoration; hard_rules allow functional numbers only in the blueprint section.
FOLIO = re.compile(r"^\s*0[1-9]\s*$")

# Whole-paragraph editorial notes the source leaves in square brackets.
BRACKET_NOTE = re.compile(r"^\s*\[[^\]]*\]\s*$")


BRAND_SUFFIX = re.compile(
    r"\s*[—–|-]\s*Elite Physicians? Wealth Planning(?:™)?\s*$", re.I
)


def title_of(raw):
    """
    The page's own name, without the brand.

    The source suffixes almost every <title> with the brand, and the root
    layout's metadata template appends it again — so 27 of 29 routes rendered
    "Tax Planning for Physicians — Elite Physicians Wealth Planning™ | Elite
    Physicians Wealth Planning". The template owns the brand; the page owns its
    name.
    """
    return BRAND_SUFFIX.sub("", raw.split("|")[0]).strip()


def trim_description(value, limit=158):
    """
    Meta descriptions are cut off around 160 characters, and six of these ran to
    176 — truncated mid-sentence in the SERP. Trim at the last sentence that
    fits, or the last whole word. Nothing is reworded and nothing is invented.
    """
    if len(value) <= limit:
        return value
    cut = value[:limit]
    stop = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
    if stop > limit * 0.6:
        return cut[: stop + 1].strip()
    return cut[: cut.rfind(" ")].rstrip(" ,;:—–-") + "…"


def clean(value):
    """The five substitutions hard_rules force, plus build-stage markers."""
    if not value:
        return value
    # The COMPANY is plural in the manifest; the Blueprint PRODUCT stays singular.
    value = value.replace("Elite Physician Wealth Blueprint", "\x00B\x00")
    value = value.replace("Elite Physician Wealth Planning", "Elite Physicians Wealth Planning")
    value = value.replace("\x00B\x00", "Elite Physician Wealth Blueprint")
    value = value.replace("info@elitephysicianwealthplanning.com", "info@fiscalvisionfinancial.com")
    value = re.sub(r"\s*10665 Stanhaven Pl,?\s*(Suite\s*\d+)?\s*", " ", value)
    value = re.sub(r"\s*White Plains, MD 20695\s*", " ", value)
    value = re.sub(r",?\s*2026 5-Star Wealth Manager", "", value)
    # A marker that is the OBJECT of a sentence cannot just be deleted: dropping
    # it from "We reply within [X business days — pending] to schedule." left
    # "We reply within to schedule." shipping as body copy. Rewrite the clause,
    # without inventing the turnaround the client has not supplied.
    value = re.sub(r"\bwithin\s*\[X business days\s*—\s*pending\]\s*", "", value)
    value = re.sub(r"\s*\[(X business days\s*—\s*pending|Pending)\]\s*", " ", value)
    # The client marks unreleased resources "[coming soon]", jammed against the
    # title with no space. The meaning is theirs and stays; the bracket is
    # build-marker typography and goes.
    value = re.sub(r"\s*\[\s*coming soon\s*\]", " — coming soon", value, flags=re.I)
    # hard_rules: the guide "remains gated … never show it as immediately
    # downloadable". The source's own h1 and meta open with "Download the".
    value = re.sub(r"\bDownload the (Physician Tax)", r"Request the \1", value)
    # The source stores some copy pre-escaped; React escapes it again, so a
    # stored "&amp;" reaches the SERP as a literal "&amp;".
    value = value.replace("&amp;", "&").replace("&#38;", "&")
    return re.sub(r"\s+", " ", value).strip()


def parse(path):
    raw = open(path).read()
    main = re.search(r"(?is)<main[^>]*>(.*)</main>", raw)
    if not main:
        return None
    body = main.group(1)
    title = re.search(r"(?is)<title>(.*?)</title>", raw)
    desc = re.search(r'(?is)<meta name="description" content="([^"]*)"', raw)

    # Blocks in document order. A heading may be wrapped in an anchor — the
    # source links whole cross-sell blocks that way, and dropping the anchor
    # cost the site 45 internal links before this was fixed.
    blocks = []
    for m in re.finditer(r"(?is)<(h1|h2|h3)\b([^>]*)>(.*?)</\1>|<(p)\b([^>]*)>(.*?)</\4>|<(ul|ol)\b[^>]*>(.*?)</\7>", body):
        if m.group(1):
            tag, attrs, inner, start = m.group(1).lower(), m.group(2), m.group(3), m.start()
            enclosing = re.search(r'(?is)<a\b[^>]*href="([^"]+)"[^>]*>(?:(?!</a>).)*$', body[:start])
            blocks.append({"t": tag, "text": text(inner), "href": enclosing.group(1) if enclosing else None, "_at": start})
        elif m.group(4):
            attrs = m.group(5) or ""
            label = "eyebrow" in attrs or ("uppercase" in attrs and "tracking" in attrs)
            kind = "eyebrow" if label else "p"
            blocks.append({"t": kind, "text": text(m.group(6)), "href": None, "_at": m.start()})
        else:
            items = [text(li.group(1)) for li in re.finditer(r"(?is)<li\b[^>]*>(.*?)</li>", m.group(8))]
            blocks.append({"t": "list", "items": [i for i in items if i], "_at": m.start()})
    for m in re.finditer(r'(?is)<div[^>]*class="[^"]*flex-wrap[^"]*"[^>]*>(.*?)</div>', body):
        chips = [text(c.group(1)) for c in re.finditer(r'(?is)<span[^>]*class="[^"]*border[^"]*"[^>]*>(.*?)</span>', m.group(1))]
        chips = [c for c in chips if c]
        if len(chips) >= 3:
            blocks.append({"t": "list", "items": chips, "_at": m.start()})
    blocks.sort(key=lambda b: b.get("_at", 0))
    blocks = [b for b in blocks if b.get("items") or b.get("text")]

    hero = {"eyebrow": None, "h1": None, "lede": None}
    i = 0
    while i < len(blocks) and hero["h1"] is None:
        b = blocks[i]
        if b["t"] == "eyebrow" and hero["eyebrow"] is None:
            hero["eyebrow"] = b["text"]
        elif b["t"] == "h1":
            hero["h1"] = b["text"]
        i += 1
    if i < len(blocks) and blocks[i]["t"] == "p":
        hero["lede"] = blocks[i]["text"]
        i += 1

    sections, cur = [], None
    def blank(level=2):
        return {"eyebrow": None, "heading": None, "level": level, "href": None, "paras": [], "items": []}
    for b in blocks[i:]:
        if b["t"] == "eyebrow":
            if cur:
                sections.append(cur)
            cur = blank()
            cur["eyebrow"] = b["text"]
        elif b["t"] in ("h2", "h3"):
            if cur and cur["heading"] is not None:
                sections.append(cur)
                cur = blank()
            elif cur is None:
                cur = blank()
            cur["heading"] = b["text"]
            cur["level"] = 3 if b["t"] == "h3" else 2
            cur["href"] = b["href"]
        elif b["t"] == "p":
            if cur is None:
                cur = blank()
            cur["paras"].append(b["text"])
        elif b["t"] == "list":
            if cur is None:
                cur = blank()
            cur["items"].extend(b["items"])
    if cur:
        sections.append(cur)
    return {
        "title": title_of(title.group(1) if title else ""),
        "description": desc.group(1) if desc else (hero["lede"] or ""),
        "hero": hero, "sections": sections,
    }


def main():
    index = json.load(open(f"{CAPTURE}/_index.json"))
    pages, dropped = {}, []
    for entry in index:
        slug = entry["slug"]
        route = ROUTE.get(slug)
        if route is None or route in BLOCKED:
            continue
        parsed = parse(f"{CAPTURE}/{slug}.html")
        if not parsed:
            continue
        sections = []
        for s in parsed["sections"]:
            href = s["href"]
            if href:
                target = SRC_PATH.get(href.split("#")[0].rstrip("/") or "/")
                href = target if target and target not in BLOCKED else None
                if href == route:
                    href = None  # never link a page to itself
            paras = [clean(p) for p in s["paras"]]
            # Bare folio numerals and whole-paragraph editorial notes are the
            # source's furniture, not its copy.
            paras = [p for p in paras if p and not FOLIO.match(p) and not BRACKET_NOTE.match(p)]
            eyebrow, heading = clean(s["eyebrow"]), clean(s["heading"])
            # The source sometimes sets a band's label and its heading to the
            # same sentence, which renders the words twice at two sizes.
            if eyebrow and heading and eyebrow.strip().lower() == heading.strip().lower():
                eyebrow = None
            section = {
                "eyebrow": eyebrow, "heading": heading,
                "level": s["level"], "href": href,
                "paras": paras,
                "items": [clean(x) for x in s["items"] if clean(x)],
            }
            if s["href"] and not href:
                dropped.append((route, s["heading"], s["href"]))
            if section["eyebrow"] or section["heading"] or section["paras"] or section["items"]:
                sections.append(section)
        if len(sections) > 1 and route not in NO_CTA:
            last = sections[-1]
            if not last["eyebrow"] and not last["items"] and last["heading"] and not last["href"]:
                last["isCta"] = True
        pages[route] = {
            "slug": route, "title": clean(parsed["title"]),
            "description": trim_description(clean(parsed["description"])),
            "eyebrow": clean(parsed["hero"]["eyebrow"]),
            "headline": clean(parsed["hero"]["h1"] or ""),
            "lede": clean(parsed["hero"]["lede"]),
            "sections": sections, "sourceUrl": entry["url"],
        }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(pages, open(OUT, "w"), indent=2, ensure_ascii=False)
    linked = sum(1 for p in pages.values() for s in p["sections"] if s.get("href"))
    h3s = sum(1 for p in pages.values() for s in p["sections"] if s.get("level") == 3)
    print(f"{len(pages)} routes -> {OUT}")
    print(f"  in-content links restored: {linked}")
    print(f"  h3 subsections preserved:  {h3s}")
    if dropped:
        print(f"  source links dropped (target not shipped or self): {len(dropped)}")


if __name__ == "__main__":
    main()
