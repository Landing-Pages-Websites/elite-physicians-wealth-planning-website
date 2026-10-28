import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://elitephysicianswealthplanning.com"),
  title: {
    default: "Elite Physicians Wealth Planning",
    template: "%s | Elite Physicians Wealth Planning",
  },
  description:
    "Elite Physicians Wealth Planning helps physicians and medical professionals coordinate tax planning, retirement planning, wealth management, practice planning, and legacy planning into one clear financial strategy.",
  /**
   * Next derives og:title, og:description and og:url per route from each page's
   * own title, description and canonical. No og:image is asserted: the real
   * logo is an unsupplied client asset (build/CLIENT-GAPS.md 1.2) and inventing
   * a share image would invent an identity. `summary` rather than
   * `summary_large_image` for the same reason — the large card needs an image.
   */
  openGraph: {
    type: "website",
    siteName: "Elite Physicians Wealth Planning",
    locale: "en_US",
    url: "/",
  },
  twitter: { card: "summary" },
};

/**
 * Structured data, restricted to facts an artifact states.
 *
 * No `address` — `hard_rules` forbid a public street address "until the White
 * Plains versus Waldorf discrepancy is authoritatively resolved", which rules
 * out LocalBusiness entirely rather than just hiding a line. No
 * `aggregateRating`, no `award`, no `hasCredential` beyond the two designations
 * the rules verify: Michael "may be identified only with the verified ChFC® and
 * RICP® designations", and the source site's "2026 5-Star Wealth Manager"
 * billing is exactly the sort of third-party rating that is not ours to assert.
 * Email is the manifest's, never the reference site's.
 */
const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Elite Physicians Wealth Planning",
  url: "https://elitephysicianswealthplanning.com",
  email: "info@fiscalvisionfinancial.com",
  telephone: "+1-301-259-1636",
  parentOrganization: { "@type": "Organization", name: "Fiscal Vision Financial" },
  areaServed: "US",
  description:
    "Financial planning for physicians and medical practice owners, coordinating tax, retirement, wealth, practice, and legacy decisions into one strategy.",
  founder: {
    "@type": "Person",
    name: "Michael A. Epps",
    jobTitle: "Founder & Chief Wealth Strategist",
    hasCredential: [
      { "@type": "EducationalOccupationalCredential", name: "ChFC®" },
      { "@type": "EducationalOccupationalCredential", name: "RICP®" },
    ],
  },
} as const;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/CormorantGaramond-500-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Inter-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: 'window.MEGA_TAG_CONFIG={siteKey:"t651hug14c8gq3du"};window.API_ENDPOINT="https://optimizer.gomega.ai";window.TRACKING_API_ENDPOINT="https://events-api.gomega.ai";' }} />
        {/* itemProp prevents React 19 from hoisting the async script ahead of its bootstrap. */}
        <script src="https://cdn.gomega.ai/scripts/optimizer.min.js" async itemProp="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
        />
        <script
          src="https://app.gomega.ai/review-bridge/latest/review-bridge.js"
          crossOrigin="anonymous"
          defer
        ></script>
      </head>
      <body>{children}<GoogleAnalytics /><PostHogProvider /></body>
    </html>
  );
}
