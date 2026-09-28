import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Verification builds MUST NOT share a build directory with `next dev`.
   * They did, and running `next build` while the dev server was live replaced
   * .next with production output underneath it — dev then loaded production
   * server bundles and threw "a[d] is not a function" on every request.
   * Verification sets NEXT_DIST_DIR=.next-verify so the two can never collide.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
    ];
  },
};

export default nextConfig;
