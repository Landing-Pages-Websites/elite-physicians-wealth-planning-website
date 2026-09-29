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
NO_CTA = {"/privacy-disclosures"}


def text(fragment):
    fragment = re.sub(r"(?is)<(script|style|svg)[^>]*>.*?</\1>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"(?s)<[^>]+>", "", fragment))).strip()


def clean(value):
    """The four substitutions hard_rules force, plus build-stage markers."""
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
    value = re.sub(r"\s*\[(X business days\s*—\s*pending|Pending)\]\s*", " ", value)
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
            blocks.append({"t": tag, "text": text(inner), "href": enclosing.group(1) if enclosing else None})
        elif m.group(4):
            kind = "eyebrow" if "eyebrow" in (m.group(5) or "") else "p"
            blocks.append({"t": kind, "text": text(m.group(6)), "href": None})
        else:
            items = [text(li.group(1)) for li in re.finditer(r"(?is)<li\b[^>]*>(.*?)</li>", m.group(8))]
            blocks.append({"t": "list", "items": [i for i in items if i]})
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
        "title": (title.group(1) if title else "").split("|")[0].strip(),
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
            section = {
                "eyebrow": clean(s["eyebrow"]), "heading": clean(s["heading"]),
                "level": s["level"], "href": href,
                "paras": [clean(p) for p in s["paras"] if clean(p)],
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
            "description": clean(parsed["description"]),
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
