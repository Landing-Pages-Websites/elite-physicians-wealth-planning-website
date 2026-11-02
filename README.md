# elite-physicians-wealth-planning

## Homepage directions

Two approved directions for the client to choose between:

| Route | Direction |
|---|---|
| `/` | Review chooser |
| `/variant-a` | **The Consult Ledger** — deep navy and ivory, Cormorant display, one continuous gold coordination route |
| `/variant-b` | **The Decision Atlas** — bright clinical surfaces, Inter declarations, navy rails and calibration ticks |

Both close on a `#form` strategy-call section sharing one implementation
(`src/components/shared/strategy-call-form.tsx`), styled per direction via a
`tone` prop so the two cannot drift apart.

## Environment

`NEXT_PUBLIC_LEAD_ENDPOINT` — POST target for the strategy-call form.

While it is unset the form still validates, then hands the request off to the
practice's inbox via `mailto:` and says so. It never reports a success that did
not happen. Set the variable in Vercel to capture leads directly; on success the
form pushes `{ event: 'form_submission' }` to `window.dataLayer`.


## Analytics tracking

PostHog lazy-initializes (after paint and idle, or on first interaction)
through the same-origin `/ingest` proxy into the shared MEGA Websites project,
with session recording on (all inputs masked; `data-mega-private` blocks an
element entirely, as on the booking calendar) plus heatmaps, dead clicks,
exceptions and web vitals. The project key and host are public constants in
`src/lib/tracking/destination.ts`, so `NEXT_PUBLIC_POSTHOG_KEY` and
`NEXT_PUBLIC_POSTHOG_HOST` are no longer read; the only per-site value is
`NEXT_PUBLIC_MEGA_SITE_ID`. Tracking runs only on a production deploy
(`NEXT_PUBLIC_VERCEL_ENV=production`); `NEXT_PUBLIC_MEGA_TRACKING_PREVIEW=1`
allows it elsewhere for local checks and `NEXT_PUBLIC_MEGA_TRACKING_DISABLED=1`
turns it off everywhere. Consent is `us-default` (`src/lib/consent.ts`): the
consent bar's Decline stops GA4 and PostHog, and events are queued or sent only
while analytics consent is allowed; GA4 dataLayer writes go through
`pushDataLayer`/`trackEvent` in `src/lib/track.ts`. Query strings are stripped
from every URL except campaign parameters. Event and property names live in
`src/lib/tracking/contract.ts`. Mark sections with `data-mega-section`, primary
calls to action with `data-mega-cta`, anything showing a visitor's text or file
names with `data-mega-private`, and regions that must never produce click
events (the consent banner) with `data-mega-ignore`.
