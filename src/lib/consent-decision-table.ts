/**
 * How the two consent stores combine: one exhaustive decision table, read as
 * data by `consent-stores.ts`. Rows are localStorage, columns the consent
 * cookie. Every state of each store has exactly one cell, so no combination
 * can be decided by an unlisted branch.
 *
 * Rules the table follows:
 * - any decline anywhere: declined;
 * - an unrecognised value, several cookie values, or an unreadable store,
 *   with no readable decline: declined and ask. Unknown is never read as
 *   unset, and an accept is never trusted beside an unreadable store, which
 *   may hold a later decline;
 * - accepted only when at least one store holds an accept and the other is
 *   readable and holds an accept or nothing;
 * - unset only when both stores are readable and empty.
 *
 * `ask`: the banner asks again (the result is not a clean choice).
 * `durable`: a reload reads a decline whatever readability does next (both
 * stores readable, and every value present is "declined"); `declineIsDurable`
 * answers from it.
 *
 * Applied on top, in `consent.ts` (`deriveChoice`), for the first read and
 * every re-check alike:
 * - the page's own choice in memory wins over stores that have not changed
 *   since the page last read them;
 * - an accepted cell is not trusted if nothing on this page can be written,
 *   because no decline here could replace it: declined and ask;
 * - an unset cell while the page holds an accept (another tab's decline may
 *   only have deleted it): declined and ask; otherwise the page keeps its
 *   choice, and with no choice at all an unset cell with nothing writable
 *   reads declined and asks.
 */

export type StoreState = "absent" | "accepted" | "declined" | "unrecognised" | "unreadable";
export type CookieState = StoreState | "multiple";

export interface DecisionCell {
  result: "accepted" | "declined" | "unset";
  ask: boolean;
  durable: boolean;
  reason: string;
}

export const LOCAL_STATES: readonly StoreState[] = ["absent", "accepted", "declined", "unrecognised", "unreadable"];
export const COOKIE_STATES: readonly CookieState[] = [...LOCAL_STATES, "multiple"];

export const CONSENT_DECISION_TABLE: Readonly<Record<StoreState, Readonly<Record<CookieState, DecisionCell>>>> = {
  absent: {
    absent: { result: "unset", ask: true, durable: false, reason: "both stores readable and empty: no choice yet" },
    accepted: { result: "accepted", ask: false, durable: false, reason: "an accept, and the other store is readable and empty" },
    declined: { result: "declined", ask: false, durable: true, reason: "a decline, and nothing in the other store" },
    unrecognised: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    unreadable: { result: "declined", ask: true, durable: false, reason: "an unreadable store may hold a decline: unknown is never read as empty" },
    multiple: { result: "declined", ask: true, durable: false, reason: "several consent cookies: something else owns the name, so the value is unknown" },
  },
  accepted: {
    absent: { result: "accepted", ask: false, durable: false, reason: "an accept, and the other store is readable and empty" },
    accepted: { result: "accepted", ask: false, durable: false, reason: "both stores hold the accept" },
    declined: { result: "declined", ask: true, durable: false, reason: "the stores disagree: a decline anywhere wins, and the visitor is asked again" },
    unrecognised: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    unreadable: { result: "declined", ask: true, durable: false, reason: "an accept is never trusted while the other store is unreadable: it may hold a later decline" },
    multiple: { result: "declined", ask: true, durable: false, reason: "several consent cookies: something else owns the name, so the value is unknown" },
  },
  declined: {
    absent: { result: "declined", ask: false, durable: true, reason: "a decline, and nothing in the other store" },
    accepted: { result: "declined", ask: true, durable: false, reason: "the stores disagree: a decline anywhere wins, and the visitor is asked again" },
    declined: { result: "declined", ask: false, durable: true, reason: "both stores hold the decline" },
    unrecognised: { result: "declined", ask: true, durable: false, reason: "a decline beside an unrecognised value: the decline wins, ask again" },
    unreadable: { result: "declined", ask: false, durable: false, reason: "a readable decline wins whatever the unreadable store holds" },
    multiple: { result: "declined", ask: true, durable: false, reason: "a decline beside several cookie values: the decline wins, ask again" },
  },
  unrecognised: {
    absent: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    accepted: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    declined: { result: "declined", ask: true, durable: false, reason: "a decline beside an unrecognised value: the decline wins, ask again" },
    unrecognised: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    unreadable: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    multiple: { result: "declined", ask: true, durable: false, reason: "several consent cookies: something else owns the name, so the value is unknown" },
  },
  unreadable: {
    absent: { result: "declined", ask: true, durable: false, reason: "an unreadable store may hold a decline: unknown is never read as empty" },
    accepted: { result: "declined", ask: true, durable: false, reason: "an accept is never trusted while the other store is unreadable: it may hold a later decline" },
    declined: { result: "declined", ask: false, durable: false, reason: "a readable decline wins whatever the unreadable store holds" },
    unrecognised: { result: "declined", ask: true, durable: false, reason: "an unrecognised value is not a choice: fail closed and ask" },
    unreadable: { result: "declined", ask: true, durable: false, reason: "no store can be read: an earlier decline may be there" },
    multiple: { result: "declined", ask: true, durable: false, reason: "several consent cookies: something else owns the name, so the value is unknown" },
  },
};
