/** How one submit attempt ended. Every attempt ends in exactly one of these. */
export type AttemptOutcome =
  | { kind: "confirmed"; ignored: boolean }
  | { kind: "failed"; reason: "captcha" | "server"; error: unknown };

export interface LeadAttempt {
  /** The submission's captcha token; may throw or come back empty. */
  mintToken: () => Promise<string | null | undefined>;
  /** What to send without a token: "" where a fallback carries the proof, null where the server would reject it. */
  missingToken: () => string | null;
  /** Posts the lead; resolves to the server's answer or throws (network, non-JSON, rejection). */
  send: (captchaToken: string) => Promise<{ ok?: boolean; ignored?: boolean } | undefined>;
  /** Applies the outcome to the form's UI and tracking signal. Called exactly once. */
  settle: (outcome: AttemptOutcome) => void;
  /** Runs after a confirmed, non-ignored success (analytics, the thank-you redirect). */
  afterConfirmed: () => void;
}

async function tokenFor(attempt: LeadAttempt): Promise<string | null> {
  const minted = await attempt.mintToken();
  return typeof minted === "string" && minted.length > 0 ? minted : attempt.missingToken();
}

async function confirm(attempt: LeadAttempt): Promise<AttemptOutcome> {
  let token: string | null;
  try {
    token = await tokenFor(attempt);
  } catch (error) {
    return { kind: "failed", reason: "captcha", error };
  }
  if (token === null) {
    return { kind: "failed", reason: "captcha", error: new Error("Could not obtain a captcha token") };
  }
  try {
    const res = await attempt.send(token);
    // A 2xx with a body that isn't {ok:true} is still a dropped lead.
    if (res?.ok !== true) throw new Error("Submission not confirmed by server.");
    return { kind: "confirmed", ignored: res.ignored === true };
  } catch (error) {
    return { kind: "failed", reason: "server", error };
  }
}

/**
 * One lead submit attempt. Every path out of it ends in exactly one of
 * success or failure, for both the form's UI state and its tracking signal: a
 * throw anywhere up to the server's answer is a failure, and once the server
 * confirmed, nothing after it (analytics, router.push) can turn the attempt
 * into a failure, which would show an error for a lead that was delivered.
 */
export async function runLeadAttempt(attempt: LeadAttempt): Promise<AttemptOutcome> {
  const outcome = await confirm(attempt);
  attempt.settle(outcome);
  if (outcome.kind === "confirmed" && !outcome.ignored) {
    try {
      attempt.afterConfirmed();
    } catch (error) {
      console.error("Lead delivered; follow-up after confirmation failed:", error);
    }
  }
  return outcome;
}
