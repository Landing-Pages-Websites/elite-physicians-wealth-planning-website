import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://elitephysicianswealthplanning.com"),
  title: {
    default: "Elite Physicians Wealth Planning",
    template: "%s | Elite Physicians Wealth Planning",
  },
  description:
    "Elite Physicians Wealth Planning helps physicians and medical professionals coordinate tax planning, retirement planning, wealth management, practice planning, and legacy planning into one clear financial strategy.",
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
  telephone: "+1-301-242-3929",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
        />
        <script
          src="https://app.gomega.ai/review-bridge/v7/review-bridge.js"
          integrity="sha384-VTUzMpjogRuXFNsE1df8N2HoJyWhNcCkGaUa7aulmDjCmXVoQ4UpQB1xMTrOp3MJ"
          crossOrigin="anonymous"
          defer
        ></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
