const MIN_VISIBLE_RATIO = 0.5;
const MIN_VIEWPORT_FILL = 0.5;

/**
 * A section counts as seen when half of it is visible, or when it fills half
 * the viewport. The second rule covers sections taller than twice the
 * viewport, whose visible ratio can never reach one half.
 */
export function sectionVisible(entry: {
  intersectionRatio: number;
  intersectionHeight: number;
  rootHeight: number;
}): boolean {
  if (entry.intersectionRatio >= MIN_VISIBLE_RATIO) return true;
  return entry.rootHeight > 0 && entry.intersectionHeight / entry.rootHeight >= MIN_VIEWPORT_FILL;
}
