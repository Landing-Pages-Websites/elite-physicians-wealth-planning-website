/**
 * How long a submission waits for a reCAPTCHA token. An abandoned image
 * challenge never resolves, and past this point the proof-of-work fallback
 * carries the lead instead (see lib/captcha/leadVerification.ts).
 */
export const RECAPTCHA_TOKEN_WAIT_MS = 10_000;

export type ExecuteOutcome =
  | { token: string }
  | { token: null; reason: "execute_timeout" | "execute_failed" };

const failed: ExecuteOutcome = { token: null, reason: "execute_failed" };

/**
 * Run one execute() under the submission's only token deadline.
 *
 * Returns the outcome instead of reporting it, and clears its timer however
 * execute() settles. Both are load-bearing. The inline race this replaced
 * left its timer running after a successful execute and reported from inside
 * it, so 30s after every lead that sent, the visitor was also counted as one
 * who could not get a token: on one site 7 of 8 `execute_timeout` events
 * landed 20 to 24 seconds after a lead that arrived. A second, outer wait in
 * CaptchaWidget then gave up first, leaving that report to fire for a lead the
 * fallback had already delivered. One deadline, one report.
 */
export function executeWithDeadline(
  execute: () => Promise<string>,
  timeoutMs: number = RECAPTCHA_TOKEN_WAIT_MS,
): Promise<ExecuteOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<ExecuteOutcome>((resolve) => {
    timer = setTimeout(
      () => resolve({ token: null, reason: "execute_timeout" }),
      timeoutMs,
    );
  });
  // Promise.resolve().then also turns a synchronous throw into a rejection.
  const executed = Promise.resolve()
    .then(execute)
    .then(
      (token): ExecuteOutcome => (token ? { token } : failed),
      (): ExecuteOutcome => failed,
    );
  return Promise.race([executed, deadline]).finally(() => clearTimeout(timer));
}
