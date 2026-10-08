import type { Metadata } from "next";
import { PageShell } from "@/components/pages/page-shell";
import { TeamRoster } from "@/components/pages/team-roster";
import { getPage, metaTitle } from "@/lib/pages";

const ROUTE = "/about/team";

const PAGE = getPage(ROUTE);

export const metadata: Metadata = {
  title: metaTitle(PAGE),
  description: PAGE.description,
  alternates: { canonical: ROUTE },
};

/**
 * The legacy capture listed seven names with one-line titles; the client's
 * 2026-10-08 delivery replaced them with bios and headshots. The h3 stubs are
 * dropped by the revision in client-content.json and the roster renders the
 * people instead, after the band that explains how the team works.
 */
export default function Page(): React.JSX.Element {
  return (
    <PageShell
      page={getPage(ROUTE)}
      trail={[{ href: "/", label: "Home" }, { href: "/about", label: "About" }, { href: "/about/team", label: "Meet the team" }]}
    >
      <TeamRoster />
    </PageShell>
  );
}
