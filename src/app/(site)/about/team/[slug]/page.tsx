import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/pages/page-shell";
import { BRAND } from "@/lib/content";
import { getPage, hasPage, metaTitle } from "@/lib/pages";
import { teamMember, teamRoutes, type TeamMember } from "@/lib/team";

const SITE = "https://elitephysicianswealthplanning.com";

type Props = { params: Promise<{ slug: string }> };

/** Only the people the client sent bios for; any other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return teamRoutes().map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = `/about/team/${slug}`;
  const member = teamMember(slug);
  if (!member || !hasPage(route)) return {};
  const page = getPage(route);
  return {
    title: metaTitle(page),
    description: page.description,
    alternates: { canonical: route },
    // A page's openGraph replaces the layout's whole object, so restate the
    // site-wide fields rather than lose og:type, og:site_name and og:locale.
    openGraph: {
      type: "profile",
      siteName: BRAND.name,
      locale: "en_US",
      url: route,
      ...(member.photo ? { images: [member.photo] } : {}),
    },
  };
}

/** Restates only what the page shows: name, title, photograph, employer. */
function personLd(member: TeamMember): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.name,
    jobTitle: member.role,
    url: `${SITE}${member.href}`,
    ...(member.photo ? { image: `${SITE}${member.photo}` } : {}),
    worksFor: { "@type": "Organization", name: BRAND.name, url: SITE },
  };
}

export default async function Page({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;
  const route = `/about/team/${slug}`;
  const member = teamMember(slug);
  if (!member || !hasPage(route)) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd(member)) }}
      />
      <PageShell
        page={getPage(route)}
        image={
          member.photo
            ? { src: member.photo, alt: `${member.name}, ${member.role}`, position: "50% 20%", plate: true }
            : undefined
        }
        trail={[
          { href: "/", label: "Home" },
          { href: "/about", label: "About" },
          { href: "/about/team", label: "Meet the team" },
          { href: route, label: member.name },
        ]}
      />
    </>
  );
}
