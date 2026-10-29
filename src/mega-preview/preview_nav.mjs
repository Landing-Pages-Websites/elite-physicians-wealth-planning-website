// Dependency-free preview emitter. Inside the MEGA site editor's preview
// iframe, a customer's link click is a client-side navigation the editor
// cannot see; this script tells the parent which page the site is on. It also
// tells the parent when the frame has come alive and painted, so the editor's
// draft overlay can wait for a real first paint instead of a timer. It also
// adds one style rule that hides cookie consent banners in the preview.
//
// Messages posted to the parent (each shape is fixed by megaseo-web
// preview_frame_policy.ts; do not add fields):
//
//   { type: "preview.hello" }      once per document, as soon as this script
//                                  runs in the head, during parse.
//   { type: "preview.painted" }    once per document, after DOMContentLoaded
//                                  (at once if already past it) and then two
//                                  nested requestAnimationFrame callbacks.
//   { type: "preview.navigated", path }
//                                  on each client-side URL change (pathname +
//                                  search), never on load.
//
// Wiring (a site that is enrolled in preview does this once, in its root
// layout, which is a server component):
//
//   import { megaPreviewNavScript } from "@/mega-preview/preview_nav.mjs";
//   const navScript = megaPreviewNavScript();
//   ...inside <head>:
//   {navScript ? <script dangerouslySetInnerHTML={{ __html: navScript }} /> : null}
//
// Never use next/script or a client component: the string must be in the
// first HTML so it runs before the app router hydrates. Outside preview mode
// (MEGA_PREVIEW_MODE exactly "1") megaPreviewNavScript returns null and the
// production HTML contains no trace of this file. The folder is protected
// from bot edits by megaseo-web's foundation policy.

import { isMegaPreviewMode } from "./preview_mode.mjs";

// The editor origins allowed to frame a preview: the serviceproxy
// FRAME_ANCESTORS default. If they change, three places move together: the
// serviceproxy defaultAncestor, megaseo-web REVIEW_PARENT_ORIGINS, and this.
export const MEGA_EDITOR_ORIGINS = Object.freeze(["https://app.gomega.ai", "https://admin.gomega.ai"]);

// Hidden in preview only (this script exists only in preview mode). Consent banners cover the
// page being edited, and a fresh browser (each preview origin, every Browserbase screenshot)
// shows them every time. The attribute is the declared contract for new sites; the accessible
// name is shared by every enrolled site's banner today. A banner that matches neither simply
// shows, as before. Live HTML never carries this rule.
export const MEGA_PREVIEW_HIDE_CSS = '[data-mega-preview-hide], [aria-label="Cookie consent" i] { display: none !important; }';

// ES5 IIFE: posts hello and painted once per document, and reports pathname +
// search (never the hash, never on load) on navigation. Every message goes to
// each editor origin separately, never to "*".
export const MEGA_PREVIEW_NAV_SCRIPT = `(function () {
  try {
    var style = document.createElement("style");
    style.setAttribute("data-mega-preview-style", "");
    style.appendChild(document.createTextNode(${JSON.stringify(MEGA_PREVIEW_HIDE_CSS)}));
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {}
  if (window.parent === window) return;
  var origins = ${JSON.stringify(MEGA_EDITOR_ORIGINS)};
  var last = location.pathname + location.search;
  function post(message) {
    for (var i = 0; i < origins.length; i++) {
      try {
        window.parent.postMessage(message, origins[i]);
      } catch (e) {}
    }
  }
  function report() {
    var current = location.pathname + location.search;
    if (current === last) return;
    last = current;
    post({ type: "preview.navigated", path: last });
  }
  function wrap(name) {
    var original = history[name];
    history[name] = function () {
      var result = original.apply(this, arguments);
      report();
      return result;
    };
  }
  function afterTwoFrames() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        post({ type: "preview.painted" });
      });
    });
  }
  post({ type: "preview.hello" });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", afterTwoFrames);
  } else {
    afterTwoFrames();
  }
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", report);
})();`;

export function megaPreviewNavScript(env = process.env) {
  return isMegaPreviewMode(env) ? MEGA_PREVIEW_NAV_SCRIPT : null;
}
