import type { NextConfig } from "next";
import { configuredVerificationRoute } from "./src/lib/captcha/provider";
import { withMegaPreview } from "./src/mega-preview/preview_config.mjs";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_CAPTCHA_ROUTE: configuredVerificationRoute().kind },
  /**
   * Verification builds MUST NOT share a build directory with `next dev`.
   * They did, and running `next build` while the dev server was live replaced
   * .next with production output underneath it — dev then loaded production
   * server bundles and threw "a[d] is not a function" on every request.
   * Verification sets NEXT_DIST_DIR=.next-verify so the two can never collide.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      // The guide is a gated lead magnet: the landing page should rank, the
      // PDF behind its form should not.
      { source: "/guides/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  async redirects() {
    return [
      // Review URLs already shared with the client. Direction A is now the
      // homepage, so /variant-a and /consult-ledger both land on the root;
      // Direction B keeps its route until Direction A has actually shipped.
      { source: "/variant-a", destination: "/", permanent: true },
      { source: "/consult-ledger", destination: "/", permanent: true },
      { source: "/variant-b", destination: "/decision-atlas", permanent: true },
      // Source-site paths that changed shape in this build. They are live on
      // the legacy domain today and will be linked from elsewhere.
      { source: "/tax-planning-for-physicians", destination: "/services/tax-planning", permanent: true },
      { source: "/retirement-planning-for-physicians", destination: "/services/retirement-planning", permanent: true },
      { source: "/wealth-management-for-physicians", destination: "/services/wealth-management", permanent: true },
      { source: "/practice-owner-planning", destination: "/services/practice-owner-planning", permanent: true },
      { source: "/legacy-estate-planning", destination: "/services/legacy-estate-planning", permanent: true },
      { source: "/physicians-specialists", destination: "/who-we-serve/physicians-specialists", permanent: true },
      { source: "/financial-planning-for-surgeons", destination: "/who-we-serve/surgeons", permanent: true },
      { source: "/financial-planning-for-dentists", destination: "/who-we-serve/dentists-dental-specialists", permanent: true },
      { source: "/financial-planning-for-crnas-nps-pas", destination: "/who-we-serve/crnas-nps-pas", permanent: true },
      { source: "/financial-planning-for-healthcare-executives", destination: "/who-we-serve/healthcare-executives", permanent: true },
      // Preserve the outgoing public article URLs on the migrated blog.
      { source: "/insights/beneficiaries-trusts-ownership-checklist", destination: "/blog/beneficiaries-trusts-ownership-checklist", permanent: true },
      { source: "/insights/cash-balance-defined-benefit-decision-guide", destination: "/blog/cash-balance-defined-benefit-decision-guide", permanent: true },
      { source: "/insights/charitable-giving-strategies", destination: "/blog/charitable-giving-strategies", permanent: true },
      { source: "/insights/coordinating-cpa-attorney-tpa-advisor", destination: "/blog/coordinating-cpa-attorney-tpa-advisor", permanent: true },
      { source: "/insights/disability-insurance-review-overlooked", destination: "/blog/disability-insurance-review-overlooked", permanent: true },
      { source: "/insights/first-five-years-financial-moves", destination: "/blog/first-five-years-financial-moves", permanent: true },
      { source: "/insights/five-years-from-retirement-checklist", destination: "/blog/five-years-from-retirement-checklist", permanent: true },
      { source: "/insights/long-term-care-survivor-planning", destination: "/blog/long-term-care-survivor-planning", permanent: true },
      { source: "/insights/physician-financial-checkup-seven-areas", destination: "/blog/physician-financial-checkup-seven-areas", permanent: true },
      { source: "/insights/preparing-for-practice-sale", destination: "/blog/preparing-for-practice-sale", permanent: true },
      { source: "/insights/roth-conversion-timing", destination: "/blog/roth-conversion-timing", permanent: true },
      { source: "/insights/w2-1099-practice-income-questions", destination: "/blog/w2-1099-practice-income-questions", permanent: true },
      // The assessment is held pending client
      // copy (build/CLIENT-GAPS.md 11.1, 11.2) and are intended to ship at
      // these same URLs. 307, not 301 — a permanent redirect would be cached
      // against the route we mean to restore.
      { source: "/checkup", destination: "/resources", permanent: false },
    ];
  },
};

export default withMegaPreview(nextConfig);
