import assert from "node:assert/strict";
import test from "node:test";
import { sectionVisible } from "./sections.ts";

test("a section counts at half visible, or when it fills half the viewport", () => {
  const vh = 800;
  assert.equal(sectionVisible({ intersectionRatio: 0.5, intersectionHeight: 200, rootHeight: vh }), true);
  assert.equal(sectionVisible({ intersectionRatio: 0.49, intersectionHeight: 200, rootHeight: vh }), false);
  assert.equal(sectionVisible({ intersectionRatio: 0, intersectionHeight: 0, rootHeight: vh }), false);
  // 3x the viewport: the ratio tops out near 0.33 but it fills the screen
  assert.equal(sectionVisible({ intersectionRatio: vh / (3 * vh), intersectionHeight: vh, rootHeight: vh }), true);
  assert.equal(sectionVisible({ intersectionRatio: 0.2, intersectionHeight: 399, rootHeight: vh }), false);
  assert.equal(sectionVisible({ intersectionRatio: 0.2, intersectionHeight: 400, rootHeight: vh }), true);
  assert.equal(sectionVisible({ intersectionRatio: 0.1, intersectionHeight: 100, rootHeight: 0 }), false);
});
