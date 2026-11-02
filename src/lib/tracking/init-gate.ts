const IGNORE_SELECTOR = "[data-mega-ignore]";

/**
 * The first pointerdown, keydown or scroll starts the lazy PostHog init, except
 * a gesture on a [data-mega-ignore] region (the consent banner): a visitor
 * about to decline must not start loading analytics. Targets without
 * closest() (document scroll, window) count.
 */
export function interactionStartsInit(target: object | null): boolean {
  if (target === null || !("closest" in target) || typeof target.closest !== "function") return true;
  return !target.closest(IGNORE_SELECTOR);
}
