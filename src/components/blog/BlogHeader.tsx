import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

interface BlogHeaderProps {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  children?: ReactNode;
}

export default function BlogHeader({
  title, description, backHref, backLabel, children,
}: BlogHeaderProps): ReactElement {
  return (
    <section data-dark-band className="bg-ink pt-[calc(var(--header-h)+1px)]">
      <div className="va-shell py-10 lg:py-16">
        <div className="max-w-3xl">
          <Link href={backHref} className="inline-flex min-h-11 items-center font-body text-body-s text-mist underline decoration-gold/60 underline-offset-4 transition-colors duration-200 hover:text-gold">
            {backLabel}
          </Link>
          <h1 className="mt-5 font-display text-display-l leading-[1.1] font-medium tracking-[-0.015em] text-ivory-bright [overflow-wrap:anywhere]">
            {title}
          </h1>
          {description ? <p className="mt-6 max-w-[58ch] font-body text-body-l leading-[1.65] text-mist">{description}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
