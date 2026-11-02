import assert from "node:assert/strict";
import test from "node:test";
import { runLeadAttempt, type AttemptOutcome, type LeadAttempt } from "./lead-attempt.ts";

const boom = (message: string) => (): never => {
  throw new Error(message);
};

interface Run {
  outcome: AttemptOutcome;
  settled: AttemptOutcome["kind"][];
  sentWith: string[];
  followUps: number;
}

async function run(overrides: Partial<LeadAttempt>): Promise<Run> {
  const settled: AttemptOutcome["kind"][] = [];
  const sentWith: string[] = [];
  let followUps = 0;
  const attempt: LeadAttempt = {
    mintToken: async () => "token",
    missingToken: () => null,
    send: async (token) => {
      sentWith.push(token);
      return { ok: true };
    },
    settle: (outcome) => settled.push(outcome.kind),
    afterConfirmed: () => {
      followUps += 1;
    },
    ...overrides,
  };
  const outcome = await runLeadAttempt(attempt);
  return { outcome, settled, sentWith, followUps };
}

const nonJson = async (): Promise<never> => {
  // What response.json() does with an HTML error page.
  return JSON.parse("<!doctype html><title>502</title>") as never;
};

const cases: [name: string, overrides: Partial<LeadAttempt>, expected: { kind: AttemptOutcome["kind"]; reason?: string; sent: boolean; followUps: number }][] = [
  ["confirmed success settles once as confirmed, then follows up", {}, { kind: "confirmed", sent: true, followUps: 1 }],
  ["getToken throwing fails as captcha and never sends", { mintToken: async () => boom("widget gone")() }, { kind: "failed", reason: "captcha", sent: false, followUps: 0 }],
  ["getToken rejecting synchronously fails as captcha", { mintToken: boom("sync throw") }, { kind: "failed", reason: "captcha", sent: false, followUps: 0 }],
  ["no token where the route needs one fails as captcha", { mintToken: async () => null }, { kind: "failed", reason: "captcha", sent: false, followUps: 0 }],
  ["empty token where the route needs one fails as captcha", { mintToken: async () => "" }, { kind: "failed", reason: "captcha", sent: false, followUps: 0 }],
  ["no token under reCAPTCHA sends with the fallback", { mintToken: async () => undefined, missingToken: () => "" }, { kind: "confirmed", sent: true, followUps: 1 }],
  ["fetch throwing fails as server", { send: async () => boom("network down")() }, { kind: "failed", reason: "server", sent: false, followUps: 0 }],
  ["a non-JSON response fails as server", { send: nonJson }, { kind: "failed", reason: "server", sent: false, followUps: 0 }],
  ["a body that is not ok:true fails as server", { send: async () => ({ ok: false }) }, { kind: "failed", reason: "server", sent: false, followUps: 0 }],
  ["an empty body fails as server", { send: async () => undefined }, { kind: "failed", reason: "server", sent: false, followUps: 0 }],
  ["router.push throwing after success stays confirmed", { afterConfirmed: boom("router gone") }, { kind: "confirmed", sent: true, followUps: 0 }],
  ["a honeypot-ignored submit is confirmed with no follow-up", { send: async () => ({ ok: true, ignored: true }) }, { kind: "confirmed", sent: false, followUps: 0 }],
  ["missingToken throwing fails as captcha", { mintToken: async () => null, missingToken: boom("route lookup") }, { kind: "failed", reason: "captcha", sent: false, followUps: 0 }],
];

for (const [name, overrides, expected] of cases) {
  test(`lead attempt: ${name}`, async () => {
    const r = await run(overrides);
    assert.equal(r.outcome.kind, expected.kind, name);
    assert.deepEqual(r.settled, [expected.kind], `${name}: settles exactly once`);
    if (expected.reason) assert.equal(r.outcome.kind === "failed" && r.outcome.reason, expected.reason, name);
    if (overrides.send === undefined) assert.equal(r.sentWith.length > 0, expected.sent, name);
    assert.equal(r.followUps, expected.followUps, name);
  });
}

test("lead attempt: a settle that throws cannot turn a failure into a second outcome", async () => {
  let calls = 0;
  await assert.rejects(
    runLeadAttempt({
      mintToken: async () => null,
      missingToken: () => null,
      send: async () => ({ ok: true }),
      settle: () => {
        calls += 1;
        throw new Error("setState after unmount");
      },
      afterConfirmed: () => {},
    }),
  );
  assert.equal(calls, 1);
});

test("lead attempt: the token sent is the one minted", async () => {
  const r = await run({ mintToken: async () => "minted-123" });
  assert.deepEqual(r.sentWith, ["minted-123"]);
});
