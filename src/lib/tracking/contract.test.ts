import assert from "node:assert/strict";
import test from "node:test";
import { classifyClick, ctaFor, labelFor, pageTypeFor, placementFrom, superProperties, TRACKING_CONTRACT_VERSION, trackingEnabled } from "./contract.ts";

const base = { pageHost: "acme.com", ctaLabel: null, text: "", placement: "inline" as const };

test("contact links classify by scheme and host", () => {
  const cases: [string, string][] = [
    ["tel:+15551234567", "call"], ["sms:5551234567", "text"], ["mailto:a@b.co", "email"],
    ["https://maps.google.com/?q=acme", "directions"], ["https://www.google.com/maps/place/x", "directions"],
    ["https://goo.gl/maps/abc", "directions"], ["https://maps.app.goo.gl/abc", "directions"],
    ["https://calendly.com/acme/30min", "booking"],
  ];
  for (const [href, channel] of cases) {
    const r = classifyClick({ ...base, href });
    assert.equal(r?.event, "contact_click", href);
    assert.equal(r?.properties.channel, channel, href);
  }
});

test("a tel link inside a CTA counts once, as contact_click", () => {
  const r = classifyClick({ ...base, href: "tel:5551234567", ctaLabel: "Call now" });
  assert.equal(r?.event, "contact_click");
  assert.equal(r?.properties.label, "Call now");
});

test("downloads beat outbound, and same-site hosts are not outbound", () => {
  assert.equal(classifyClick({ ...base, href: "/files/menu.PDF" })?.event, "file_download");
  assert.equal(classifyClick({ ...base, href: "https://cdn.other.com/a.pdf?x=1" })?.event, "file_download");
  assert.equal(classifyClick({ ...base, href: "https://www.acme.com/about" }), null);
  assert.equal(classifyClick({ ...base, pageHost: "www.acme.com", href: "https://acme.com/" }), null);
  assert.equal(classifyClick({ ...base, href: "/contact" }), null);
  assert.equal(classifyClick({ ...base, href: "#top" }), null);
  const out = classifyClick({ ...base, href: "https://yelp.com/biz/acme" });
  assert.equal(out?.event, "outbound_click");
  assert.equal(out?.properties.host, "yelp.com");
});

test("a CTA without a contact or download link is cta_click", () => {
  const r = classifyClick({ ...base, href: "/quote", ctaLabel: "Get a quote", placement: "section" });
  assert.deepEqual(r, { event: "cta_click", properties: { label: "Get a quote", destination: "/quote", placement: "section" } });
});

test("garbage hrefs never throw", () => {
  for (const href of ["javascript:void(0)", "http://", "::::", "", null]) {
    assert.doesNotThrow(() => classifyClick({ ...base, href }));
  }
  assert.equal(classifyClick({ ...base, href: "javascript:void(0)" }), null);
});

test("placement is the nearest landmark", () => {
  assert.equal(placementFrom(["a", "li", "nav", "header", "body"]), "nav");
  assert.equal(placementFrom(["a", "div", "footer", "body"]), "footer");
  assert.equal(placementFrom(["a", "section", "main"]), "section");
  assert.equal(placementFrom(["a", "p", "main"]), "inline");
});

test("labels prefer the attribute, then id, heading, text", () => {
  assert.deepEqual(labelFor({ label: "reviews", id: "x", heading: "H", text: "t" }), { label: "reviews", source: "attribute" });
  assert.deepEqual(labelFor({ label: null, id: "pricing", heading: "H", text: null }), { label: "pricing", source: "fallback" });
  assert.deepEqual(labelFor({ label: "  ", id: null, heading: "  Our Work ", text: null }), { label: "Our Work", source: "fallback" });
  assert.equal(labelFor({ label: null, id: null, heading: null, text: "   " }), null);
  assert.equal(labelFor({ label: null, id: null, heading: null, text: "x".repeat(300) })?.label.length, 80);
});

test("tracking runs only in production or with the explicit preview flag, and disabled always wins", () => {
  const cases: [{ disabled?: string; vercelEnv?: string; preview?: string }, boolean][] = [
    [{ vercelEnv: "production" }, true],
    [{ vercelEnv: "production", disabled: "1" }, false],
    [{ vercelEnv: "production", disabled: "0" }, true],
    [{ vercelEnv: "production", disabled: "" }, true],
    [{ vercelEnv: "preview" }, false],
    [{ vercelEnv: "development" }, false],
    [{ vercelEnv: "Production" }, false],
    [{}, false],
    [{ vercelEnv: "", preview: "" }, false],
    [{ preview: "1" }, true],
    [{ preview: "1", vercelEnv: "preview" }, true],
    [{ preview: "1", disabled: "1" }, false],
    [{ preview: "true" }, false],
    [{ preview: "0", vercelEnv: "development" }, false],
  ];
  for (const [env, expected] of cases) assert.equal(trackingEnabled(env), expected, JSON.stringify(env));
});

test("page type comes from the path", () => {
  const cases: [string, string][] = [
    ["/", "home"], ["", "home"], ["/contact", "contact"], ["/contact-us", "contact"], ["/contact/", "contact"],
    ["/blog", "blog"], ["/blog/a-post", "blog"], ["/services", "service"], ["/services/roofing", "service"], ["/service/x", "service"],
    ["/locations/austin", "location"], ["/location", "location"], ["/areas/north", "location"],
    ["/about", "other"], ["/privacy-policy", "other"], ["/blogger", "blog"],
  ];
  for (const [path, type] of cases) assert.equal(pageTypeFor(path), type, path);
});

test("the CTA rule: [data-mega-cta] scope, or a non-toggle button, never inside an ignored region", () => {
  const base = { ctaAttr: null, insideCta: false, isButton: false, toggle: false, ignored: false, text: "Go" };
  assert.equal(ctaFor(base), null);
  assert.deepEqual(ctaFor({ ...base, isButton: true }), { label: "Go", source: "fallback" });
  assert.equal(ctaFor({ ...base, isButton: true, toggle: true }), null);
  assert.equal(ctaFor({ ...base, isButton: true, ignored: true }), null);
  assert.equal(ctaFor({ ...base, insideCta: true, ignored: true, ctaAttr: "x" }), null);
  assert.deepEqual(ctaFor({ ...base, insideCta: true, ctaAttr: "Get a quote" }), { label: "Get a quote", source: "attribute" });
  assert.deepEqual(ctaFor({ ...base, insideCta: true, ctaAttr: "   " }), { label: "Go", source: "fallback" });
  assert.deepEqual(ctaFor({ ...base, insideCta: true, ctaAttr: "" }), { label: "Go", source: "fallback" });
  assert.equal(ctaFor({ ...base, insideCta: true, ctaAttr: "", text: " " }), null);
  assert.deepEqual(ctaFor({ ...base, insideCta: true, isButton: true, toggle: true, ctaAttr: "Menu" }), { label: "Menu", source: "attribute" });
});

test("super properties omit a missing or malformed site id", () => {
  const ok = superProperties({ siteId: "0942a126-2a70-4148-ba92-2cb1024183c7", release: "abc123", vercelEnv: "production", pageType: "home" });
  assert.equal(ok.mega_site_id, "0942a126-2a70-4148-ba92-2cb1024183c7");
  assert.equal(ok.mega_tracking_version, String(TRACKING_CONTRACT_VERSION));
  assert.equal(ok.mega_env, "production");
  for (const siteId of [undefined, "", "undefined", "not-a-uuid"]) {
    assert.equal("mega_site_id" in superProperties({ siteId }), false, String(siteId));
  }
  assert.equal(superProperties({}).mega_env, "development");
  assert.equal(superProperties({ siteId: "  0942A126-2a70-4148-ba92-2cb1024183c7\n" }).mega_site_id, "0942a126-2a70-4148-ba92-2cb1024183c7");
});
