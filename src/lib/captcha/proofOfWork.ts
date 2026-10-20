/**
 * First-party proof-of-work: the lead fallback when reCAPTCHA cannot vouch for
 * a visitor.
 *
 * reCAPTCHA is served by Google, so ad blockers, privacy browsers, VPNs and
 * corporate networks can block it, and Google can return a verdict our checks
 * reject (BROWSER_ERROR, a low score). Any of those used to discard the lead.
 * This check runs entirely on our own origin, so nothing between the visitor
 * and the site can block it, and a real browser solves it in about a second.
 *
 * The puzzle is bound to every field the browser sends that reaches the
 * customer, so a solved puzzle cannot be replayed with any of them changed:
 * every distinct lead costs its own solve.
 *
 * It is also bound to a server-issued timestamp and expires LEAD_POW_MAX_AGE_MS
 * later, which bounds replay of an identical captured request. Single use inside
 * that window is enforced where every serving instance meets: Keystone claims
 * the proof in the transaction that records the lead. Changing the timestamp
 * changes the preimage, so refreshing a replay means solving again.
 *
 * Shared verbatim by the browser and the server so both derive the SAME
 * preimage from the SAME fields. Framework-free and Web Crypto only, so it runs
 * in the browser, on Vercel's Node runtime and under `node --test`.
 */

/** Leading zero bits a solution's SHA-256 must have. ~65k hashes on average. */
export const LEAD_POW_DIFFICULTY_BITS = 16;

/**
 * How long a proof stays valid after the server issued its timestamp. Keystone
 * accepts a claim up to 180s after issue (90s here, plus up to two 25s forward
 * attempts, plus margin), so this MUST stay at or below 90s. A real visitor
 * submits within seconds: the timestamp is fetched at submit time.
 */
export const LEAD_POW_MAX_AGE_MS = 90_000;

/** Tolerance for clock drift between server instances, never a validity extension. */
const MAX_FUTURE_SKEW_MS = 5_000;
const ISSUED_AT_PATTERN = /^\d{13}$/;

const POW_DOMAIN = "lead-pow-v1";
const SOLVE_BATCH_SIZE = 512;
const ENCODER = new TextEncoder();
const MAX_NONCE = 2 ** 32;
const NONCE_PATTERN = /^\d{1,10}$/;

/**
 * The only fields a proof does NOT cover: the verification it travels with.
 * Everything else the browser sends is bound, including fields that are not
 * lead data but decide where the lead goes or who it is credited to (a form
 * key, attribution context). Listing what is excluded rather than what is
 * included makes a field added later bound by default, so a captured request
 * can never be replayed with any of it changed.
 */
const UNBOUND_FIELDS: ReadonlySet<string> = new Set([
  "captchaToken",
  "turnstileToken",
  "captchaAction",
  "powNonce",
]);

/**
 * A field's bound form: its JSON, for every value. Type-preserving on purpose:
 * binding strings raw and everything else as JSON would make the string "null"
 * and the value null (or "true"/true, "0"/0) bind identically, so a captured
 * proof could be replayed with a field's type swapped and the server would
 * then coerce and forward a different value.
 */
function bindable(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * The bound fields as sorted [name, JSON value] pairs. Read from the raw values
 * the browser serialised, never from sanitised copies: JSON round-trips strings
 * and plain values exactly, whereas a trimmed value re-derived on one side
 * would let the two disagree and reject a real visitor. Sorted so the binding does
 * not depend on the order a client writes its keys.
 */
function boundValues(fields: Readonly<Record<string, unknown>>): string[][] {
  return Object.keys(fields)
    .filter((name) => !UNBOUND_FIELDS.has(name) && fields[name] !== undefined)
    .sort()
    .map((name) => [name, bindable(fields[name])]);
}

/**
 * Everything in the preimage before the nonce, so a solve serialises the fields
 * once rather than once per attempt. A nonce is digits only, so appending it
 * and the closing `"]` is byte-identical to `JSON.stringify([...values, nonce])`.
 */
function preimagePrefix(fields: Readonly<Record<string, unknown>>): string {
  return JSON.stringify([POW_DOMAIN, ...boundValues(fields), ""]).slice(0, -2);
}

function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

async function hashBits(prefix: string, nonce: string): Promise<number> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    ENCODER.encode(`${prefix}${nonce}"]`),
  );
  return leadingZeroBits(new Uint8Array(digest));
}

/** A macrotask break, so the page can paint and take input between batches. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Whether `fields.powIssuedAt` is a server timestamp still inside the window. */
function isFresh(issuedAt: unknown, now: number): boolean {
  if (typeof issuedAt !== "string" || !ISSUED_AT_PATTERN.test(issuedAt))
    return false;
  const age = now - Number(issuedAt);
  return age >= -MAX_FUTURE_SKEW_MS && age <= LEAD_POW_MAX_AGE_MS;
}

export interface LeadProofOptions {
  readonly difficultyBits?: number;
  readonly now?: number;
}

/**
 * Whether `nonce` solves the puzzle for these fields, including a fresh
 * `powIssuedAt`. Anything not of the expected shape is rejected before hashing.
 */
export async function verifyLeadProofOfWork(
  fields: Readonly<Record<string, unknown>>,
  nonce: unknown,
  {
    difficultyBits = LEAD_POW_DIFFICULTY_BITS,
    now = Date.now(),
  }: LeadProofOptions = {},
): Promise<boolean> {
  if (typeof nonce !== "string" || !NONCE_PATTERN.test(nonce)) return false;
  if (!isFresh(fields.powIssuedAt, now)) return false;
  return (await hashBits(preimagePrefix(fields), nonce)) >= difficultyBits;
}

/**
 * Find a nonce for these fields. Hashes in batches so the browser's async
 * digest overhead is amortised, and yields between batches so the page stays
 * responsive while it works.
 */
export async function solveLeadProofOfWork(
  fields: Readonly<Record<string, unknown>>,
  difficultyBits: number = LEAD_POW_DIFFICULTY_BITS,
): Promise<string> {
  const prefix = preimagePrefix(fields);
  for (let start = 0; start < MAX_NONCE; start += SOLVE_BATCH_SIZE) {
    const nonces = Array.from({ length: SOLVE_BATCH_SIZE }, (_, i) =>
      String(start + i),
    );
    const bits = await Promise.all(
      nonces.map((nonce) => hashBits(prefix, nonce)),
    );
    const found = bits.findIndex((value) => value >= difficultyBits);
    if (found !== -1) return nonces[found];
    await yieldToBrowser();
  }
  throw new Error("No proof-of-work solution found.");
}
