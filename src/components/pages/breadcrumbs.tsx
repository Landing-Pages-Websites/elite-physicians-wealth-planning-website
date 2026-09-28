import Link from "next/link";

/**
 * Forty-two source routes across four families need orientation, and the
 * approved frames have no pattern for it — so this is deliberately the
 * quietest thing on the page: one line, body scale, no chevron icons, the
 * current page carrying `aria-current` rather than a colour change alone.
 */
export function Breadcrumbs({
  trail,
}: {
  trail: readonly { href: string; label: string }[];
}): React.JSX.Element {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-[12px] text-mist/55">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-mist/80">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="underline-offset-4 transition-colors duration-200 hover:text-gold hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-mist/30">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
