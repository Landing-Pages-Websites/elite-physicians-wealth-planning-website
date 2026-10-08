import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/site/icons";
import { TEAM, type TeamMember } from "@/lib/team";

/**
 * /about/team, with the people the client actually sent: their headshots,
 * titles and the opening of each bio, every row linking to the full page.
 *
 * Hairline rows rather than a grid of cards — the same contents-page treatment
 * as the family indexes, because `hard_rules` bans "a generic card grid,
 * rounded-card collection". Two columns from lg so eight people read as one
 * firm rather than a long scroll of single rows.
 */
export function TeamRoster(): React.JSX.Element {
  return (
    <section aria-labelledby="team-roster" className="bg-white">
      <div className="va-shell py-12 lg:py-16">
        <h2
          id="team-roster"
          className="font-body text-[11px] font-semibold tracking-[0.24em] text-gold-text uppercase"
        >
          Meet the team
        </h2>
        <ul className="va-stagger mt-7 grid border-b border-ink/12 lg:grid-cols-2 lg:gap-x-14">
          {TEAM.map((member) => (
            <li key={member.slug} className="border-t border-ink/12">
              <MemberRow member={member} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MemberRow({ member }: { member: TeamMember }): React.JSX.Element {
  return (
    <Link
      href={member.href}
      className="va-row group flex h-full items-start gap-5 py-6 pl-2 hover:bg-ivory focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none sm:gap-7"
    >
      <Headshot member={member} />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-display-s leading-[1.2] font-medium text-ink transition-colors duration-200 group-hover:text-gold-text">
          {member.name}
        </span>
        <span className="mt-1.5 block font-body text-[11px] leading-[1.5] font-semibold tracking-[0.08em] text-gold-text uppercase sm:tracking-[0.16em]">
          {member.role}
        </span>
        <span className="mt-3 line-clamp-4 max-w-[52ch] font-body text-body-s leading-[1.6] text-charcoal">
          {member.summary}
        </span>
      </span>
      <ArrowRightIcon
        aria-hidden="true"
        className="mt-2 h-4 w-4 shrink-0 text-gold transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  );
}

/** The supplied headshot. No photograph, no slot: a placeholder would stand in for a person. */
function Headshot({ member }: { member: TeamMember }): React.JSX.Element | null {
  const src = member.thumb ?? member.photo;
  if (!src) return null;
  return (
    <span className="relative aspect-4/5 w-20 shrink-0 overflow-hidden rounded-sm ring-1 ring-ink/10 sm:w-28">
      <Image
        src={src}
        alt={`${member.name}, ${member.role}`}
        fill
        sizes="(min-width: 640px) 112px, 80px"
        className="object-cover object-top"
      />
    </span>
  );
}
