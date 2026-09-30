/**
 * The client's Google Calendar appointment schedule.
 *
 * `customer_asks` contracts this outright — "Include direct Google Calendar
 * scheduling using the supplied embed" — and every CTA on the site routes here.
 * Until the embed was supplied at kickoff the page took a request and said so
 * rather than pretending to hold a slot; it books directly now.
 *
 * The schedule ID is the client's own, supplied in the kickoff brief. It is a
 * public booking URL, not a secret, and it is kept in one place so a reissued
 * link is a one-line change rather than a hunt.
 *
 * Presentation notes that are not cosmetic:
 * — Google renders the widget on white with its own type. It gets an explicit
 *   white plate rather than sitting on the navy band, because a transparent
 *   iframe over a dark ground renders the widget's own dark text on dark.
 * — `title` is required: an untitled iframe is an unlabelled frame to a screen
 *   reader, and this one is the page's primary action.
 * — It is NOT lazy-loaded. On /schedule this is the reason the visitor came,
 *   and deferring the one thing the page is for to save a request on a page
 *   that already loads in under 200ms is the wrong trade.
 */
const SCHEDULE_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1XzgTC3NXfS_7N29pKDedRFdvkkgbtV7Iefh3-YdDxs32o0YQF9tY7Njc4yluUru3kYgM9OhCl?gv=true";

export function CalendarEmbed({
  heading,
  note,
}: {
  heading: string;
  note: string;
}): React.JSX.Element {
  return (
    <section data-dark-band id="book" className="bg-ink">
      <div className="va-shell py-14 lg:py-20">
        <h2 className="va-reveal max-w-[22ch] font-display text-display-m leading-[1.1] font-medium tracking-[-0.01em] text-ivory-bright">
          {heading}
        </h2>
        <p className="mt-5 max-w-[56ch] font-body text-body-m leading-[1.65] text-mist/75">
          {note}
        </p>

        <div className="va-reveal mt-9 overflow-hidden rounded-sm bg-white">
          <iframe
            src={SCHEDULE_URL}
            title="Book a strategy call with Elite Physicians Wealth Planning"
            className="block h-[640px] w-full border-0 sm:h-[600px]"
          />
        </div>

        {/* A booking widget is a third party that can fail to load, be blocked
            by an extension, or simply not suit someone. The form below is the
            same request by another route, and it is named so the visitor knows
            it is there rather than assuming the page is broken. */}
        <p className="mt-6 max-w-[56ch] font-body text-body-s leading-[1.6] text-mist/60">
          If the calendar does not load, or you would rather not book a slot yet,
          the form below reaches the same inbox.
        </p>
      </div>
    </section>
  );
}
