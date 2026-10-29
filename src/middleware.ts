import { NextResponse, type NextRequest } from "next/server";

import { megaPreviewSink } from "./mega-preview/preview_sink.mjs";

// Inert unless MEGA_PREVIEW_MODE is exactly "1": the sink returns null and the
// request continues untouched.
export function middleware(request: NextRequest): Response {
  const sunk = megaPreviewSink(request);
  if (sunk) return sunk;
  return NextResponse.next();
}

// Every path except Next's own /_next/ assets; a narrower matcher would leave
// the unmatched paths unsunk (see src/mega-preview/preview_sink.mjs).
export const config = {
  matcher: ["/((?!_next/).*)"],
};
