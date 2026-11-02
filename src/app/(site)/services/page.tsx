import type { Metadata } from "next";
import { bodySections, getPage, metaTitle } from "@/lib/pages";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/services";
const SITE = "https://elitephysicianswealthplanning.com";

const PAGE = getPage(ROUTE);

const SERVICE_IDS: Record<string, string> = {
  "Tax Strategy": "tax-strategy",
  "Retirement Strategy": "retirement-strategy",
  "Wealth Management": "wealth-management",
  "Practice & Business Planning": "practice-business-planning",
  "Legacy Planning": "legacy-planning",
};

const SERVICES = bodySections(PAGE).filter(
  (section) => section.href && section.heading,
);

function serviceId(name: string): string {
  const id = SERVICE_IDS[name];
  if (id) return `${SITE}${ROUTE}#${id}`;
  return `${SITE}${ROUTE}#${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

const SERVICES_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${SITE}${ROUTE}`,
      url: `${SITE}${ROUTE}`,
      name: "Services for Physicians | Elite Physicians Wealth Planning",
      description: PAGE.lede ?? PAGE.description,
      breadcrumb: { "@id": `${SITE}${ROUTE}#breadcrumb` },
      mainEntity: {
        "@type": "ItemList",
        "@id": `${SITE}${ROUTE}#planning-disciplines`,
        name: "Six planning disciplines",
        numberOfItems: SERVICES.length,
        itemListElement: SERVICES.map((section, index) => {
          const name = section.heading as string;
          return {
            "@type": "ListItem",
            position: index + 1,
            name,
            item: { "@id": serviceId(name) },
          };
        }),
      },
    },
    ...SERVICES.map((section) => {
      const name = section.heading as string;
      return {
        "@type": "Service",
        "@id": serviceId(name),
        name,
        description: section.paras[0],
        provider: {
          "@id": `${SITE}/#organization`,
        },
      };
    }),
  ],
} as const;

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICES_LD) }}
      />
      <FamilyIndexPage
        route={ROUTE}
        label="Services"
        eyebrow="Six planning disciplines"
      />
    </>
  );
}
