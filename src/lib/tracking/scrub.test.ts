import assert from "node:assert/strict";
import test from "node:test";
import { maskNetworkRequest, scrubCapture, scrubUrl } from "./scrub.ts";

test("scrubUrl keeps only allowlisted campaign parameters and drops the fragment", () => {
  const cases: [string, string][] = [
    ["https://acme.com/contact?email=a@b.co", "https://acme.com/contact"],
    ["https://acme.com/contact?phone=5551234567&name=Jo", "https://acme.com/contact"],
    ["https://acme.com/?email=a@b.co&utm_source=x", "https://acme.com/?utm_source=x"],
    ["https://acme.com/?UTM_Medium=cpc&utm_term=t&utm_content=c&utm_campaign=k&utm_source=s", "https://acme.com/?utm_medium=cpc&utm_term=t&utm_content=c&utm_campaign=k&utm_source=s"],
    ["https://acme.com/?gclid=abc&gbraid=3&wbraid=4&fbclid=2&msclkid=1&utm_source=x", "https://acme.com/?utm_source=x"],
    ["https://acme.com/?Email=a@b.co&utm_source=x", "https://acme.com/?utm_source=x"],
    ["https://acme.com/a#email=a@b.co", "https://acme.com/a"],
    ["https://acme.com/a?x=1#frag", "https://acme.com/a"],
    ["/contact?email=a@b.co&utm_source=x#top", "/contact?utm_source=x"],
    ["/contact", "/contact"],
    ["//cdn.acme.com/a?email=x", "https://cdn.acme.com/a"],
  ];
  for (const [input, expected] of cases) assert.equal(scrubUrl(input), expected, input);
});

test("scrubUrl never throws and never returns a query on malformed input", () => {
  for (const input of ["http://", "::::", "", "http://[bad?email=a@b.co", "https://%zz?email=a@b.co", "mailto:a@b.co?subject=x"]) {
    let out = "";
    assert.doesNotThrow(() => { out = scrubUrl(input); }, input);
    assert.equal(out.includes("a@b.co"), false, input);
    assert.equal(out.includes("?email"), false, input);
  }
});

test("scrubCapture scrubs every URL-shaped property, nested person properties and heatmap keys", () => {
  const out = scrubCapture({
    uuid: "u", event: "$pageview",
    properties: {
      $current_url: "https://acme.com/contact?email=a@b.co&utm_source=x#f",
      $referrer: "https://google.com/search?q=jo+smith@x.co",
      $initial_referrer: "$direct",
      $initial_current_url: "https://acme.com/?phone=555",
      $pathname: "/contact",
      $prev_url_like: "https://acme.com/x?token=1",
      label: "Call us",
      destination: "/quote",
      $heatmap_data: { "https://acme.com/contact?email=a@b.co": [{ x: 1 }], "https://acme.com/contact?phone=1": [{ x: 2 }] },
    },
    $set: { $current_url: "https://acme.com/?email=a@b.co" },
    $set_once: { $initial_current_url: "https://acme.com/?email=a@b.co", $initial_referrer: "$direct" },
  });
  assert.ok(out);
  const p = out.properties;
  assert.equal(p.$current_url, "https://acme.com/contact?utm_source=x");
  assert.equal(p.$referrer, "https://google.com/search");
  assert.equal(p.$initial_referrer, "$direct");
  assert.equal(p.$initial_current_url, "https://acme.com/");
  assert.equal(p.$prev_url_like, "https://acme.com/x");
  assert.equal(p.label, "Call us");
  assert.equal(p.destination, "/quote");
  assert.deepEqual(p.$heatmap_data, { "https://acme.com/contact": [{ x: 1 }, { x: 2 }] });
  assert.equal(out.$set?.$current_url, "https://acme.com/");
  assert.equal(out.$set_once?.$initial_current_url, "https://acme.com/");
  assert.equal(out.$set_once?.$initial_referrer, "$direct");
  assert.equal(JSON.stringify(out).includes("a@b.co"), false);
});

test("scrubCapture scrubs recording snapshot hrefs and derives mega_page_type from the path", () => {
  const out = scrubCapture({
    uuid: "u", event: "$snapshot",
    properties: {
      $pathname: "/services/roofing",
      $snapshot_data: [{ type: 4, data: { href: "https://acme.com/contact?email=a@b.co", width: 1 } }, { type: 3, data: { source: 1 } }],
    },
  });
  assert.ok(out);
  assert.equal(JSON.stringify(out).includes("a@b.co"), false);
  assert.equal(out.properties.mega_page_type, "service");
  assert.deepEqual((out.properties.$snapshot_data as { data: { source?: number } }[])[1].data, { source: 1 });
});

test("scrubCapture passes null through and never throws on odd shapes", () => {
  assert.equal(scrubCapture(null), null);
  assert.doesNotThrow(() => scrubCapture({ uuid: "u", event: "e", properties: { $current_url: 5, $set: null } as never }));
});

test("scrubCapture recurses into nested objects and arrays, in web-vitals and exception shapes", () => {
  const out = scrubCapture({
    uuid: "u", event: "$web_vitals",
    properties: {
      $web_vitals_LCP_event: { $current_url: "https://x.com/?email=a@b.co&utm_source=x", name: "LCP", attribution: { url: "https://x.com/img.png?token=abc", element: "img" } },
      $exception_list: [{ type: "Error", value: "Failed to load https://x.com/a?email=a@b.co and retry", stacktrace: { frames: [{ filename: "https://x.com/_next/static/c.js?email=a@b.co", lineno: 1 }] } }],
      path: { href: "/contact?phone=5551234567#x" },
      note: "plain text stays",
    },
  });
  assert.ok(out);
  const text = JSON.stringify(out);
  assert.equal(text.includes("a@b.co"), false);
  assert.equal(text.includes("5551234567"), false);
  assert.equal(text.includes("token=abc"), false);
  const p = out.properties as Record<string, Record<string, unknown>>;
  assert.equal(p.$web_vitals_LCP_event.$current_url, "https://x.com/?utm_source=x");
  assert.equal(p.$web_vitals_LCP_event.name, "LCP");
  assert.equal(p.path.href, "/contact");
  assert.equal(out.properties.note, "plain text stays");
  assert.equal((out.properties.$exception_list as { value: string }[])[0].value, "Failed to load https://x.com/a and retry");
});

test("scrubCapture survives a structure nested deeper than the cap and keeps nothing past it", () => {
  let deep: Record<string, unknown> = { leaf: "https://x.com/?email=a@b.co" };
  for (let i = 0; i < 40; i++) deep = { child: deep };
  let out: ReturnType<typeof scrubCapture> = null;
  assert.doesNotThrow(() => { out = scrubCapture({ uuid: "u", event: "e", properties: { deep } }); });
  assert.equal(JSON.stringify(out).includes("a@b.co"), false);
  const cyclic: Record<string, unknown> = { href: "https://x.com/?email=a@b.co" };
  cyclic.self = cyclic;
  assert.doesNotThrow(() => scrubCapture({ uuid: "u", event: "e", properties: { cyclic } }));
});

test("maskNetworkRequest drops headers and bodies and scrubs the url", () => {
  const out = maskNetworkRequest({
    name: "https://api.acme.com/lead?email=a@b.co&utm_source=x",
    initiatorType: "fetch",
    requestHeaders: { authorization: "secret" },
    requestBody: "{\"email\":\"a@b.co\"}",
    responseHeaders: { "set-cookie": "x" },
    responseBody: "ok",
    status: 200,
  });
  assert.equal(out.name, "https://api.acme.com/lead?utm_source=x");
  assert.equal(out.initiatorType, "fetch");
  assert.equal(out.status, 200);
  for (const key of ["requestHeaders", "requestBody", "responseHeaders", "responseBody"]) {
    assert.equal(key in out, false, key);
  }
  assert.equal(JSON.stringify(out).includes("a@b.co"), false);
});

test("a value with toJSON is scrubbed through its toJSON result", () => {
  const entry = {
    name: "https://acme.com/api?email=a@b.co",
    toJSON() { return { name: this.name, kind: "resource" }; },
  };
  const out = scrubCapture({ uuid: "u", event: "e", properties: { entry, when: { toJSON: () => "2026-01-01T00:00:00.000Z" } } });
  assert.ok(out);
  assert.deepEqual(out.properties.entry, { name: "https://acme.com/api", kind: "resource" });
  assert.equal(out.properties.when, "2026-01-01T00:00:00.000Z");
  assert.equal(JSON.stringify(out).includes("a@b.co"), false);
  assert.doesNotThrow(() => scrubCapture({ uuid: "u", event: "e", properties: { bad: { toJSON() { throw new Error("x"); } } } }));
  assert.equal(scrubCapture({ uuid: "u", event: "e", properties: { when: new Date("2026-01-01T00:00:00Z") } })?.properties.when, "2026-01-01T00:00:00.000Z");
});

test("URL-named keys are anchored: security and during are left alone, url-ish keys are scrubbed", () => {
  const out = scrubCapture({
    uuid: "u", event: "e",
    properties: {
      security: "a?b#c", during: "x?y", curious: "p?q", hirefoo: "m?n",
      $current_url: "/a?email=a@b.co", referrer: "/r?token=1", page_url: "/p?phone=555", pageHref: "/h?x=1", $referrer: "$direct", some_uri: "/u?x=1", "attr__data-url": "/d?x=1", pageURL: "/pu?x=1", imageURL: "/iu?x=1", PAGE_URL: "/pu2?x=1", myHREF: "/mh?x=1", fooURI: "/fu?x=1",
    },
  });
  assert.ok(out);
  const p = out.properties;
  // Not URL keys: the text rule strips the tail but keeps the token as written; a URL key would make it "/a".
  assert.equal(p.security, "a");
  assert.equal(p.during, "x");
  assert.equal(p.curious, "p");
  assert.equal(p.hirefoo, "m");
  assert.equal(p.$current_url, "/a");
  assert.equal(p.referrer, "/r");
  assert.equal(p.page_url, "/p");
  assert.equal(p.pageHref, "/h");
  assert.equal(p.$referrer, "$direct");
  assert.equal(p.some_uri, "/u");
  assert.equal(p["attr__data-url"], "/d");
  assert.equal(p.pageURL, "/pu");
  assert.equal(p.imageURL, "/iu");
  assert.equal(p.PAGE_URL, "/pu2");
  assert.equal(p.myHREF, "/mh");
  assert.equal(p.fooURI, "/fu");
});
