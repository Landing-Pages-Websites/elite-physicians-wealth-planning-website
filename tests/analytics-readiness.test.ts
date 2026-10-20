import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { scheduleAnalyticsReady } from "../src/lib/analytics-readiness";

function browser() {
  let now = 0;
  let sequence = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const frames = new Map<number, FrameRequestCallback>();
  const idle = new Map<number, IdleRequestCallback>();
  const events = new Map<string, EventListener>();
  let resolveFonts!: () => void;
  const ready = new Promise<void>((resolve) => { resolveFonts = resolve; });
  const fake = {
    setTimeout(callback: () => void, delay: number) {
      timers.set(++sequence, { at: now + delay, callback }); return sequence;
    },
    clearTimeout: (id: number) => { timers.delete(id); },
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
    requestIdleCallback: (callback: IdleRequestCallback) => { idle.set(++sequence, callback); return sequence; },
    cancelIdleCallback: (id: number) => { idle.delete(id); },
    addEventListener: (name: string, callback: EventListener) => { events.set(name, callback); },
    removeEventListener: (name: string) => { events.delete(name); },
  };
  Object.assign(globalThis, { window: fake, document: { fonts: { ready } } });
  return { fake, timers, frames, idle, events, resolveFonts,
    advance(ms: number) { now += ms; for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); } },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(now)); },
    interact(isTrusted: boolean, name = "pointerdown") { events.get(name)?.({ isTrusted } as Event); },
  };
}

afterEach(() => { Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); });

function browserWithoutIdleCallbacks() {
  const env = browser();
  Reflect.deleteProperty(env.fake, "requestIdleCallback");
  Reflect.deleteProperty(env.fake, "cancelIdleCallback");
  return env;
}

function assertCleanedUp(env: ReturnType<typeof browser>): void {
  assert.equal(env.events.size + env.frames.size + env.idle.size + env.timers.size, 0);
}

test("fonts, two paint frames, then idle; all work is cleaned up", async () => {
  const env = browser(); let calls = 0;
  scheduleAnalyticsReady(() => { calls++; });
  env.resolveFonts(); await Promise.resolve();
  env.frame(); assert.equal(env.idle.size, 0);
  env.frame(); assert.equal(calls, 0);
  [...env.idle.values()][0]({ didTimeout: false, timeRemaining: () => 10 });
  env.advance(2500); assert.equal(calls, 1);
  assert.equal(env.events.size + env.frames.size + env.idle.size + env.timers.size, 0);
});

test("unresolved fonts cannot postpone startup beyond 2500ms", () => {
  const env = browser(); let calls = 0;
  scheduleAnalyticsReady(() => { calls++; });
  env.advance(2499); assert.equal(calls, 0);
  env.advance(1); assert.equal(calls, 1);
});

test("only trusted pointer or keyboard interaction bypasses the gate", () => {
  for (const name of ["pointerdown", "keydown"]) {
    const env = browser(); let calls = 0;
    scheduleAnalyticsReady(() => { calls++; });
    env.interact(false, name); assert.equal(calls, 0);
    env.interact(true, name); env.advance(2500); assert.equal(calls, 1);
  }
});

test("unmount/decline cancels timers, frames, idle and pending font continuation", async () => {
  for (const stage of ["fonts", "frame", "idle"]) {
    const env = browser(); let calls = 0;
    const cancel = scheduleAnalyticsReady(() => { calls++; });
    if (stage !== "fonts") { env.resolveFonts(); await Promise.resolve(); }
    if (stage === "idle") { env.frame(); env.frame(); }
    cancel(); env.resolveFonts(); await Promise.resolve(); env.advance(2500); env.frame();
    assert.equal(calls, 0);
    assert.equal(env.events.size + env.frames.size + env.idle.size + env.timers.size, 0);
  }
});

test("browsers without idle callbacks still start after paint", async () => {
  const env = browserWithoutIdleCallbacks(); let calls = 0;
  const cancel = scheduleAnalyticsReady(() => { calls++; });
  env.resolveFonts(); await Promise.resolve(); env.frame(); env.frame();
  assert.equal(calls, 0);
  assert.doesNotThrow(() => env.advance(0));
  assertCleanedUp(env);
  assert.doesNotThrow(cancel);
  env.advance(2500); env.frame(); env.interact(true);
  assert.equal(calls, 1);
  assertCleanedUp(env);
});

test("without idle APIs, the deadline cleans up unresolved fonts, frames and fallback timers", async () => {
  for (const stage of ["fonts", "frame", "timer"]) {
    const env = browserWithoutIdleCallbacks(); let calls = 0;
    const cancel = scheduleAnalyticsReady(() => { calls++; });
    if (stage !== "fonts") { env.resolveFonts(); await Promise.resolve(); }
    if (stage === "timer") { env.frame(); env.frame(); }
    assert.doesNotThrow(() => env.advance(2500));
    assert.equal(calls, 1);
    assertCleanedUp(env);
    assert.doesNotThrow(cancel);
    env.resolveFonts(); await Promise.resolve(); env.frame(); env.frame(); env.advance(2500);
    assert.equal(calls, 1);
    assertCleanedUp(env);
  }
});

test("without idle APIs, stopping cancels every fallback stage and later drains do nothing", async () => {
  for (const stage of ["fonts", "frame", "timer"]) {
    const env = browserWithoutIdleCallbacks(); let calls = 0;
    const cancel = scheduleAnalyticsReady(() => { calls++; });
    if (stage !== "fonts") { env.resolveFonts(); await Promise.resolve(); }
    if (stage === "timer") { env.frame(); env.frame(); }
    assert.doesNotThrow(cancel);
    assertCleanedUp(env);
    env.resolveFonts(); await Promise.resolve(); env.frame(); env.frame(); env.advance(2500);
    assert.doesNotThrow(cancel);
    assert.equal(calls, 0);
    assertCleanedUp(env);
  }
});

test("pending idle work tolerates unavailable cancellation on readiness, deadline and stop", async () => {
  for (const release of ["idle", "deadline", "stop"]) {
    const env = browser(); let calls = 0;
    const cancel = scheduleAnalyticsReady(() => { calls++; });
    env.resolveFonts(); await Promise.resolve(); env.frame(); env.frame();
    Reflect.deleteProperty(env.fake, "cancelIdleCallback");
    const drainIdle = () => {
      const callbacks = [...env.idle.values()]; env.idle.clear();
      callbacks.forEach((callback) => callback({ didTimeout: false, timeRemaining: () => 10 }));
    };
    const run = release === "idle" ? drainIdle : release === "deadline" ? () => env.advance(2500) : cancel;
    assert.doesNotThrow(run);
    assert.doesNotThrow(drainIdle);
    assert.doesNotThrow(cancel);
    env.advance(2500); env.frame(); env.interact(true);
    assert.equal(calls, release === "stop" ? 0 : 1);
    assertCleanedUp(env);
  }
});
