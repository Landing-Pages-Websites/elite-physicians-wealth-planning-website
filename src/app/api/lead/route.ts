import { NextRequest, NextResponse } from "next/server";
import {
  HONEYPOT_FIELD_NAME,
  parseLeadFields,
  readCaptchaToken,
  resolveFormKey,
} from "@/lib/leadValidation";
import { siteConfig } from "@/lib/mega-config";
import {
  ProofClaimRefusedError,
  forwardLeadToKeystone,
} from "@/lib/forwardLead";
import { buildProofClaim } from "@/lib/captcha/proofClaim";
import {
  SPAM_CHECK_FALLBACK,
  verifyLeadSubmission,
} from "@/lib/captcha/leadVerification";
import {
  PREVIEW_TEST_ONLY_ERROR,
  previewRefusesLead,
} from "@/lib/captcha/previewLeadGate";
import { uploadCapabilityAuthorizes } from "@/lib/uploadCapability";
import type { LeadContext } from "@/lib/megaLeadContext";

export const runtime = "nodejs";

const UNVERIFIED_ERROR =
  "We couldn't verify this submission. Please try again or contact us directly.";
const SUBMIT_ERROR =
  "Something went wrong sending your request. Please check your connection and try again.";

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip")
  );
}

function asLeadContext(value: unknown): LeadContext | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.url !== "string") return null;
  if (typeof record.session_id !== "string") return null;
  if (typeof record.visitor_id !== "string") return null;
  return record as unknown as LeadContext;
}

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Issues the server timestamp a fallback proof-of-work is bound to. Our clock,
 * not the visitor's, so a wrong device clock cannot invalidate a real lead.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { issuedAt: String(Date.now()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return jsonError("Invalid request.", 400);
  }
  const payload = body as Record<string, unknown>;

  const honeypot =
    typeof payload[HONEYPOT_FIELD_NAME] === "string"
      ? payload[HONEYPOT_FIELD_NAME].trim()
      : "";
  if (honeypot.length > 0) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const parsed = parseLeadFields(payload);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  // A Preview deployment (the staging captcha bypass) takes test leads only, so
  // a junk token can never deliver a lead to the customer's live recipients.
  // Before verification: a refused lead must not spend a proof or reach Keystone.
  if (previewRefusesLead(payload, parsed.fields.email)) {
    return jsonError(PREVIEW_TEST_ONLY_ERROR, 403);
  }

  // Every submission presents its own solved challenge, exactly as before
  // attachments existed. Uploads are signed with a SECOND token obtained for
  // that purpose, so nothing here had to be relaxed to make them work. On a
  // reCAPTCHA deployment a submission reCAPTCHA cannot vouch for may pass on
  // the single-use proof-of-work fallback instead (see leadVerification.ts).
  const captchaToken = readCaptchaToken(payload);
  const verification = await verifyLeadSubmission(payload, clientIp(request));
  if (!verification.ok) {
    return jsonError(verification.error, 403);
  }

  // Declared keys are honoured only with a capability bound to THIS submission's
  // challenge. Without one the keys are dropped and the enquiry still sends: a
  // failed binding must cost the attachments, never the lead.
  const signedKeys = Array.isArray(payload.uploadSignedKeys)
    ? payload.uploadSignedKeys.filter(
        (key): key is string => typeof key === "string",
      )
    : [];
  const uploadKeys = uploadCapabilityAuthorizes(
    payload.uploadCapability,
    signedKeys,
    parsed.fields.uploadKeys,
    captchaToken,
  )
    ? parsed.fields.uploadKeys
    : [];
  if (parsed.fields.uploadKeys.length > 0 && uploadKeys.length === 0) {
    console.warn("Dropped upload keys this submission cannot claim");
  }

  const context = asLeadContext(payload.context);
  if (!context) {
    return jsonError("Invalid request.", 400);
  }

  try {
    // `spamCheck` is reserved from client input, so this label is always ours.
    const extra =
      verification.spamCheck === null
        ? parsed.fields.extra
        : { ...parsed.fields.extra, spamCheck: verification.spamCheck };
    // A fallback proof is claimed at Keystone, in the transaction that records
    // the lead, so no other serving instance can deliver the same proof. Without
    // a configured credential the fallback cannot be delivered: fail closed.
    const proofClaim =
      verification.spamCheck === SPAM_CHECK_FALLBACK
        ? buildProofClaim(payload)
        : undefined;
    if (verification.spamCheck === SPAM_CHECK_FALLBACK && !proofClaim) {
      console.error("Fallback proof cannot be claimed; lead not delivered");
      return jsonError(SUBMIT_ERROR, 502);
    }
    const result = await forwardLeadToKeystone(
      { ...parsed.fields, extra, uploadKeys },
      context,
      resolveFormKey(siteConfig.formKeys, payload),
      proofClaim,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProofClaimRefusedError) {
      // 400/401 here mean this site is misconfigured, not that the visitor erred.
      console.error("Fallback proof refused by Keystone", error.status);
      return jsonError(UNVERIFIED_ERROR, 403);
    }
    console.error("Keystone lead submit failed", error);
    return jsonError(SUBMIT_ERROR, 502);
  }
}
