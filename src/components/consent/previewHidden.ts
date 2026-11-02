/**
 * The MEGA site editor preview sets NEXT_PUBLIC_MEGA_PREVIEW_MODE=1 and never runs live; there
 * the banner only covers the page being edited. The default must stay the literal
 * `process.env.NEXT_PUBLIC_MEGA_PREVIEW_MODE`, which is what Next inlines into client code.
 * next.config.ts derives that value from the server-side MEGA_PREVIEW_MODE,
 * so a stray client-only value can never hide the live banner.
 */
export function consentHiddenInPreview(
  previewMode: string | undefined = process.env.NEXT_PUBLIC_MEGA_PREVIEW_MODE,
): boolean {
  return previewMode === "1";
}
