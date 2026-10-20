import type { StrategyCallFields } from "./strategyCallValidation";

/** Preserve a configured legacy backend, after the protected pipeline confirms delivery. */
export async function forwardExistingLeadEndpoint(
  values: StrategyCallFields,
  extras: Record<string, string>,
  intent: string,
): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_LEAD_ENDPOINT?.trim();
  if (!endpoint) return;
  try {
    const target = new URL(endpoint, window.location.href);
    // An env pointing at our own handler must not double-submit the same lead.
    if (target.origin === window.location.origin && target.pathname === "/api/lead") return;
    const { firstName, lastName, email, phone, careerStage, notes } = values;
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...extras, fullName: `${firstName.trim()} ${lastName.trim()}`, email, phone, careerStage, notes, intent }),
    });
    if (!response.ok) console.warn("Existing lead endpoint refused the additive handoff", response.status);
  } catch {
    console.warn("Existing lead endpoint handoff failed; protected lead delivery already confirmed");
  }
}
