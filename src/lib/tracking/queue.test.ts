import assert from "node:assert/strict";
import test from "node:test";
import { enqueueOrCapture, flushQueue, grantConsent, QUEUE_LIMIT, resetQueueForTests, revokeConsent } from "./queue.ts";

type Call = { event: string; properties: Record<string, unknown>; options?: Record<string, unknown> };
const recorder = (): { calls: Call[]; capture: (e: string, p: Record<string, unknown>, o?: Record<string, unknown>) => void } => {
  const calls: Call[] = [];
  return { calls, capture: (event, properties, options) => { calls.push(options === undefined ? { event, properties } : { event, properties, options }); } };
};
const where = { url: "https://acme.com/contact", pathname: "/contact" };

test("events before init are queued and flushed once, in order", () => {
  resetQueueForTests();
  enqueueOrCapture("contact_click", { channel: "call" }, undefined, where);
  enqueueOrCapture("cta_click", {}, undefined, where);
  const r = recorder();
  assert.equal(flushQueue(r.capture), 2);
  assert.deepEqual(r.calls.map((c) => c.event), ["contact_click", "cta_click"]);
  assert.equal(flushQueue(() => assert.fail("flushed twice")), 0);
});

test("queued events carry when and where they happened, as an option and as properties", () => {
  resetQueueForTests();
  const before = Date.now();
  enqueueOrCapture("cta_click", { label: "Go" }, undefined, where);
  const r = recorder();
  flushQueue(r.capture);
  const [call] = r.calls;
  assert.ok(call.options?.timestamp instanceof Date);
  assert.ok((call.options.timestamp as Date).getTime() >= before);
  assert.equal("timestamp" in call.properties, false);
  assert.deepEqual(call.properties, { label: "Go", $current_url: where.url, $pathname: where.pathname });
});

test("a queued event keeps the capture options it was given, plus its timestamp", () => {
  resetQueueForTests();
  enqueueOrCapture("form_abandoned", {}, { send_instantly: true, transport: "sendBeacon" }, where);
  const r = recorder();
  flushQueue(r.capture);
  assert.equal(r.calls[0].options?.send_instantly, true);
  assert.equal(r.calls[0].options?.transport, "sendBeacon");
  assert.ok(r.calls[0].options?.timestamp instanceof Date);
});

test("live events pass no options and are never altered", () => {
  resetQueueForTests();
  const r = recorder();
  flushQueue(r.capture);
  const props = { a: "1" };
  enqueueOrCapture("form_started", props, undefined, where);
  assert.deepEqual(r.calls, [{ event: "form_started", properties: { a: "1" } }]);
  assert.equal(r.calls[0].properties, props);
});

test("the queue is capped and keeps the earliest events", () => {
  resetQueueForTests();
  for (let i = 0; i < QUEUE_LIMIT + 25; i++) enqueueOrCapture("e" + i, {}, undefined, where);
  const r = recorder();
  assert.equal(flushQueue(r.capture), QUEUE_LIMIT);
  assert.equal(r.calls[0].event, "e0");
});

test("a decline clears the queue and nothing more is kept", () => {
  resetQueueForTests();
  enqueueOrCapture("a", {}, undefined, where);
  revokeConsent();
  enqueueOrCapture("b", {}, undefined, where);
  const r = recorder();
  assert.equal(flushQueue(r.capture), 0);
  assert.deepEqual(r.calls, []);
});

test("declined then accepted keeps only the events after the accept", () => {
  resetQueueForTests();
  revokeConsent();
  enqueueOrCapture("before", {}, undefined, where);
  grantConsent();
  enqueueOrCapture("after", {}, undefined, where);
  const r = recorder();
  flushQueue(r.capture);
  assert.deepEqual(r.calls.map((c) => c.event), ["after"]);
});

test("accepted then declined after init stops live capture too", () => {
  resetQueueForTests();
  const r = recorder();
  flushQueue(r.capture);
  enqueueOrCapture("live", {}, undefined, where);
  revokeConsent();
  enqueueOrCapture("after-decline", {}, undefined, where);
  assert.deepEqual(r.calls.map((c) => c.event), ["live"]);
});
