import assert from "node:assert/strict";
import test from "node:test";
import { interactionStartsInit } from "./init-gate.ts";

const target = (ignored: boolean) => ({ closest: (selector: string) => (selector === "[data-mega-ignore]" && ignored ? {} : null) });

test("a gesture inside an ignored region never starts init, anything else does", () => {
  assert.equal(interactionStartsInit(target(true)), false);
  assert.equal(interactionStartsInit(target(false)), true);
  assert.equal(interactionStartsInit(null), true);
  assert.equal(interactionStartsInit({}), true);
});
