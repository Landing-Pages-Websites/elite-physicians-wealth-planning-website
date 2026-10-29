import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { MEGA_PREVIEW_CSP } from "../src/mega-preview/preview_config.mjs";
import { MEGA_PREVIEW_NAV_SCRIPT, megaPreviewNavScript } from "../src/mega-preview/preview_nav.mjs";

const root = path.resolve(import.meta.dirname, "..");
const ALIAS_ROOT = "src";

// Node's ESM resolver is stricter than Next's bundler in four ways this test
// must not hold against a site: "next/server" wants "next/server.js", a relative
// import may omit its extension (and import a directory's index), "@/..." is a
// tsconfig alias, and a JSON import needs an attribute. The hook below applies
// exactly those rules and nothing else, so a module that really is missing
// still fails.
const RESOLVE_HOOK = `
const ALIAS_URL = ${JSON.stringify(pathToFileURL(path.join(root, ALIAS_ROOT) + path.sep).href)};
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];
const RETRYABLE = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"]);
const withAttributes = (resolved) => resolved.url.endsWith(".json") ? { ...resolved, importAttributes: { type: "json" } } : resolved;
export async function resolve(specifier, context, next) {
  const request = specifier === "next/server" ? "next/server.js" : specifier.startsWith("@/") ? new URL(specifier.slice(2), ALIAS_URL).href : specifier;
  try {
    return withAttributes(await next(request, context));
  } catch (error) {
    const local = request.startsWith(".") || request.startsWith("file:");
    if (!local || !RETRYABLE.has(error?.code)) throw error;
    for (const candidate of [...EXTENSIONS.map((e) => request + e), ...EXTENSIONS.map((e) => request + "/index" + e)]) {
      try { return withAttributes(await next(candidate, context)); } catch {}
    }
    throw error;
  }
}`;
const HOOK_URL = "data:text/javascript," + encodeURIComponent(RESOLVE_HOOK);
register(HOOK_URL);
const { NextRequest } = await import("next/server.js");
const { config, middleware: proxy } = await import("../src/middleware.ts");

async function withEnv(value, run) {
  const previous = process.env.MEGA_PREVIEW_MODE;
  if (value === undefined) delete process.env.MEGA_PREVIEW_MODE;
  else process.env.MEGA_PREVIEW_MODE = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.MEGA_PREVIEW_MODE;
    else process.env.MEGA_PREVIEW_MODE = previous;
  }
}

const req = (method, pathname, headers = {}) =>
  new NextRequest(`https://saved-x.megabuild.ai${pathname}`, { method, headers });

// NextResponse.next() marks a pass-through with this header; the sink never sets it.
const passedThrough = (response) => response.headers.get("x-middleware-next") === "1";
const sunk = (response) => response.headers.get("x-mega-preview-sink") === "1";

describe("preview wiring through the real src/middleware.ts", () => {
  const sunkRows = [
    ["POST", "/api/lead"], ["POST", "/API/LEAD"], ["POST", "//api/lead"], ["POST", "/%61pi/lead"],
    ["PROPFIND", "/"], ["POST", "/"], ["GET", "/ingest/static/array.js"], ["GET", "/%69ngest/x"],
    ["POST", "/_NEXT/x"], ["PUT", "/api/lead"],
  ];
  for (const [method, pathname] of sunkRows) {
    it(`sinks ${method} ${pathname} in preview mode and passes it through otherwise`, async () => {
      const response = await withEnv("1", () => proxy(req(method, pathname)));
      assert.ok(sunk(response));
      assert.equal(await response.text(), '{"ok":true,"preview":true}');
      const off = await withEnv(undefined, () => proxy(req(method, pathname)));
      assert.ok(passedThrough(off) && !sunk(off));
    });
  }

  it("sinks a server action POST / carrying Next-Action", async () => {
    const response = await withEnv("1", () => proxy(req("POST", "/", { "next-action": "abc" })));
    assert.ok(sunk(response));
  });

  it("passes Next static assets and plain GETs through in preview mode", async () => {
    for (const [method, pathname] of [["GET", "/_next/static/x.js"], ["GET", "/"], ["GET", "/api/mega-preview/identity"]]) {
      const response = await withEnv("1", () => proxy(req(method, pathname)));
      assert.ok(passedThrough(response) && !sunk(response), `${method} ${pathname}`);
    }
  });

  it("does not treat MEGA_PREVIEW_MODE values other than exactly 1 as preview", async () => {
    for (const value of ["0", "true", "", " 1", "1 "]) {
      const response = await withEnv(value, () => proxy(req("POST", "/api/lead")));
      assert.ok(passedThrough(response) && !sunk(response), JSON.stringify(value));
    }
  });

  it("matches every path except /_next/", () => {
    assert.deepEqual(config.matcher, ["/((?!_next/).*)"]);
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    assert.ok(matcher.test("/api/lead") && matcher.test("/") && matcher.test("/ingest/x"));
    assert.ok(!matcher.test("/_next/static/x.js"));
  });
});

describe("next.config.ts wiring", () => {
  // A fresh process per env value: next.config.ts reads process.env at import.
  const loadConfigHeaderValues = (preview) => {
    const env = { ...process.env };
    delete env.MEGA_PREVIEW_MODE;
    if (preview) env.MEGA_PREVIEW_MODE = "1";
    // Next compiles a config as CommonJS-compatible code, so __dirname and __filename exist there.
    const globals = `globalThis.__dirname = ${JSON.stringify(root)}; globalThis.__filename = ${JSON.stringify(path.join(root, "next.config.ts"))};`;
    const script = `${globals} const m=await import("./next.config.ts"); const c=m.default.default??m.default; const h=c.headers?await c.headers():[]; console.log(JSON.stringify(h.flatMap(r=>r.headers.map(x=>x.value))))`;
    const preload = "data:text/javascript," + encodeURIComponent(`import { register } from "node:module"; register(${JSON.stringify(HOOK_URL)});`);
    const out = execFileSync(process.execPath, ["--experimental-strip-types", "--import", preload, "--input-type=module", "-e", script], { cwd: root, env, encoding: "utf8" });
    return JSON.parse(out.trim().split("\n").pop() ?? "[]");
  };

  it("carries the preview CSP in preview mode and not otherwise (the site defines its own headers)", () => {
    assert.ok(loadConfigHeaderValues(true).includes(MEGA_PREVIEW_CSP));
    assert.ok(!loadConfigHeaderValues(false).includes(MEGA_PREVIEW_CSP));
  });
});

describe("root layout wiring of the navigation emitter", () => {
  // layout.tsx imports next/font/google, which Node cannot load, so the layout is
  // checked statically and the function it calls is checked at runtime.
  const layout = readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");

  it("imports the kit function and calls it once", () => {
    assert.match(layout, /import \{ megaPreviewNavScript \} from "@\/mega-preview\/preview_nav\.mjs";/);
    assert.equal(layout.match(/megaPreviewNavScript\(\)/g)?.length, 1);
  });

  it("renders the script inline, first, inside <head>, with no next/script", () => {
    const nav = "{navScript ? <script dangerouslySetInnerHTML={{ __html: navScript }} /> : null}";
    assert.equal(layout.split(nav).length, 2, "the script is rendered exactly once");
    // A comment or string earlier in the file may also say "<head>", so the check is that the script follows one.
    assert.ok(new RegExp(`<head>\\s*${nav.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(layout));
    assert.ok(!layout.includes('from "next/script"'));
  });

  it("emits the script only when MEGA_PREVIEW_MODE is exactly 1", () => {
    assert.equal(megaPreviewNavScript({ MEGA_PREVIEW_MODE: "1" }), MEGA_PREVIEW_NAV_SCRIPT);
    for (const value of [undefined, "0", "true", "", " 1", "1 "]) {
      assert.equal(megaPreviewNavScript({ MEGA_PREVIEW_MODE: value }), null, JSON.stringify(value));
    }
  });
});
