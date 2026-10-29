import { readMegaPreviewIdentity } from "@/mega-preview/preview_identity.mjs";
import { isMegaPreviewMode } from "@/mega-preview/preview_mode.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Preview mode only: which commit this preview serves (Phase 9 rendered checks). */
export async function GET(): Promise<Response> {
  if (!isMegaPreviewMode()) return new Response(null, { status: 404 });
  return Response.json({ commitSha: await readMegaPreviewIdentity() }, { headers: { "cache-control": "no-store" } });
}
