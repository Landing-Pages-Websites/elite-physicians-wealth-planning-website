// Dependency-free preview sink. site-starter ships NO proxy or middleware file
// (customer sites have their own, and Next 16 refuses both). A site that is
// enrolled in preview calls this first in its own file, one line:
//
//   Next 16, proxy.ts:        export function proxy(request: NextRequest) {
//   Next 15, middleware.ts:   export function middleware(request: NextRequest) {
//                               const sunk = megaPreviewSink(request);
//                               if (sunk) return sunk;
//                               ...the site's own logic...
//                             }
//
// with `import { megaPreviewSink } from "<path>/mega-preview/preview_sink.mjs"`,
// and a matcher that includes every path except `/_next/` (a narrower matcher
// leaves the unmatched paths unsunk). The proxy or middleware file is a
// protected path. Without the wiring, preview does NOT sink (see report I3).

import { isMegaPreviewMode, MEGA_PREVIEW_SINK_HEADER } from "./preview_mode.mjs";

export const MEGA_PREVIEW_SINK_BODY = '{"ok":true,"preview":true}';
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const NEXT_STATIC_PREFIX = "/_next/";
// The exact dev-overlay endpoints Next 16.2 serves: see
// node_modules/next/dist/server/dev/middleware-turbopack.js (lines ~270, 293, 319)
// and middleware-webpack.js. Any other /__nextjs* path is an ordinary request.
const NEXT_DEV_ENDPOINTS = new Set([
  "/__nextjs_original-stack-frames",
  "/__nextjs_original-stack-frame",
  "/__nextjs_launch-editor",
  "/__nextjs_source-map",
]);

const isIngest = (pathname) => pathname === "/ingest" || pathname.startsWith("/ingest/");

/**
 * The path as a router would see it: percent-decoded, repeated slashes
 * collapsed, lowercased. A path that cannot be decoded is returned as null,
 * which the caller treats as uncertain and sinks.
 */
function normalizedPath(rawPathname) {
  try {
    return decodeURIComponent(rawPathname).replace(/\/+/gu, "/").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Exemption for Next's own asset and dev endpoints, judged on the RAW,
 * case-sensitive path the router sees: `/_NEXT/x` or `/%5Fnext/x` are not
 * Next internals and must be sunk. Any percent escape or dot segment in a
 * `/_next/` path is uncertain, so it is not exempt.
 */
function isNextInternal(rawPathname) {
  if (NEXT_DEV_ENDPOINTS.has(rawPathname)) return true;
  if (!rawPathname.startsWith(NEXT_STATIC_PREFIX)) return false;
  return !rawPathname.includes("%") && !rawPathname.split("/").includes("..");
}

const sinkResponse = () =>
  new Response(MEGA_PREVIEW_SINK_BODY, {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store", [MEGA_PREVIEW_SINK_HEADER]: "1" },
  });

/**
 * In preview mode, answer every state-changing request and every analytics
 * request here, before any route code runs: a lead, booking or form never
 * reaches a real destination, whatever its path (P9-D30, derived from the
 * method, never from a list of lead routes). Anything uncertain is sunk.
 * Inert (one env read, returns null) when preview mode is off.
 */
export function megaPreviewSink(request, env = process.env) {
  if (!isMegaPreviewMode(env)) return null;
  const rawPathname = new URL(request.url).pathname;
  if (isNextInternal(rawPathname)) return null;
  const pathname = normalizedPath(rawPathname);
  if (pathname === null) return sinkResponse();
  if (SAFE_METHODS.has(String(request.method).toUpperCase()) && !isIngest(pathname)) return null;
  return sinkResponse();
}
