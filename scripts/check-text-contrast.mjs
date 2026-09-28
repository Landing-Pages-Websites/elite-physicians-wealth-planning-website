/**
 * Text-over-background contrast gate.
 *
 * The other checks (overflow, broken images, h1 count, palette tokens) are all
 * blind to the failure that actually made copy unreadable here: a paragraph
 * rendered on top of a photograph. Several bands use a photo behind live text
 * with a CSS scrim over it, so the effective background behind a line is not
 * any declared colour — it has to be measured from rendered pixels.
 *
 * Measuring it naively does not work: antialiased glyph edges span every value
 * between the text colour and the background, so filtering them by colour
 * distance leaves a halo that scores as a dark background behind light text.
 * Instead this renders a BACKGROUND PLATE — the same page with every glyph made
 * transparent — so each region's background is captured exactly, with no text
 * in it at all. The scorer then crops each text box out of the plate.
 *
 * Run: npm run check:contrast   (needs the server on BASE)
 */
import puppeteer from "puppeteer-core";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROMIUM =
  process.env.CHROMIUM_PATH ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const BASE = process.env.BASE ?? "http://localhost:3100";
// Both directions. B was never covered until it was brought up to the same
// standard, so its failures were invisible.
// Default is every shipping route; /consult-ledger is gone (it redirects to /).
const DEFAULT_ROUTES = "/,/about,/about/team,/consultation,/contact,/insights,/meet-michael-epps,/our-process,/physician-tax-retirement-guide,/physicians,/physicians/established,/physicians/practice-owners,/physicians/residents-fellows,/physicians/retirement,/privacy-disclosures,/resources,/schedule,/services,/services/legacy-estate-planning,/services/practice-owner-planning,/services/retirement-planning,/services/tax-planning,/services/wealth-management,/who-we-serve,/who-we-serve/crnas-nps-pas,/who-we-serve/dentists-dental-specialists,/who-we-serve/healthcare-executives,/who-we-serve/physicians-specialists,/who-we-serve/surgeons,/decision-atlas";
const ROUTES = (process.env.ROUTES ?? DEFAULT_ROUTES).split(",");
const OUT = "/tmp/contrast";
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const samples = [];

for (const route of ROUTES)
  for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });
  await page.goto(BASE + route, { waitUntil: "networkidle0", timeout: 60000 });
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      transition: none !important;
      animation-timeline: none !important;
    }
    .va-reveal { opacity: 1 !important; transform: none !important; }`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 1200));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  });

  // `route` must be passed in: page.evaluate runs in the browser, which cannot
  // see Node scope.
  const targets = await page.evaluate((route) => {
    // Tailwind v4 emits oklab() for opacity modifiers, which no string parser
    // reads reliably. Paint the colour on a 1x1 canvas and read the pixel back
    // so the browser resolves it and we get real RGBA.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const toRgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const out = [];
    let i = 0;
    const all = [...document.querySelectorAll("main p, main h1, main h2, main h3, main li, main span, main a")];
    for (let d = 0; d < all.length; d++) {
      const el = all[d];
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ");
      if (own.length < 12) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 8) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.opacity === "0") continue;
      const section = el.closest("section[id]");
      out.push({
        idx: i++,
        domIndex: d,
        section: section ? section.id : "?",
        route,
        text: own.slice(0, 44),
        color: toRgba(cs.color),
        fontSize: Math.round(parseFloat(cs.fontSize)),
        fontWeight: cs.fontWeight,
        box: {
          x: Math.round(r.x + window.scrollX),
          y: Math.round(r.y + window.scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
      });
    }
    return out;
  }, route);

  // Make every glyph transparent so what remains is pure background.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      text-shadow: none !important;
      caret-color: transparent !important;
    }`,
  });

  // NOT a fullPage screenshot. fullPage makes Chrome expand the viewport to the
  // document height, so every band sized with 100svh / 100vh reflows and the
  // whole page shifts — measurements taken at the real viewport then land on
  // the wrong pixels. Each region is captured in a true viewport instead, with
  // its box re-measured at that scroll position.
  for (const t of targets) {
    const rect = await page.evaluate((sel) => {
      const el = document.querySelectorAll(
        "main p, main h1, main h2, main h3, main li, main span, main a"
      )[sel];
      if (!el) return null;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      // Puppeteer's clip is PAGE-relative, not viewport-relative.
      return {
        x: Math.round(r.x + window.scrollX),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        vw: window.innerWidth,
      };
    }, t.domIndex);
    if (!rect || rect.w < 8 || rect.h < 4) continue;
    const x = Math.max(0, rect.x), y = Math.max(0, rect.y);
    const w = Math.min(rect.w, rect.vw - x), h = rect.h;
    if (w < 8 || h < 4) continue;
    const slug = route === "/" ? "home" : route.replace(/\W+/g, "");
    const file = `${OUT}/${slug}-${vp.name}-${t.idx}.png`;
    try {
      await page.screenshot({ path: file, clip: { x, y, width: w, height: h } });
      samples.push({ ...t, viewport: vp.name, file, box: { x: 0, y: 0, w, h } });
    } catch {
      /* not capturable at this viewport */
    }
  }
  await page.close();
}

await browser.close();
writeFileSync("/tmp/text-contrast.json", JSON.stringify(samples, null, 1));
console.log(`captured ${samples.length} text regions across ${ROUTES.length} routes x ${VIEWPORTS.length} viewports`);
