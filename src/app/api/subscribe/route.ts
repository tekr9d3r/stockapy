import { NextResponse } from "next/server";
import { SITE_URL } from "@/config";

/**
 * Newsletter signup through Brevo's double opt-in: Brevo emails a confirmation
 * link and only adds the contact to the list once it is clicked, which is what
 * GDPR expects of an EU site.
 *
 * Needs three environment variables (see .env.example). The email address is
 * never logged.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BREVO = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Result = { ok: true } | { ok: false; error: string };

async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return (await req.json().catch(() => ({}))) as Record<string, string>;
  const form = await req.formData().catch(() => null);
  return form ? Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) : {};
}

async function subscribe(body: Record<string, string>): Promise<{ status: number; result: Result }> {
  const email = String(body.email ?? "").trim().toLowerCase();
  // A bot that fills every field fills the hidden one too. Pretend it worked.
  if (body.website) return { status: 200, result: { ok: true } };
  if (!EMAIL.test(email) || email.length > 254) {
    return { status: 400, result: { ok: false, error: "That doesn't look like an email address." } };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const templateId = Number(process.env.BREVO_DOI_TEMPLATE_ID);
  if (!apiKey || !listId || !templateId) {
    return { status: 503, result: { ok: false, error: "Signups aren't switched on yet. Please try again soon." } };
  }

  const res = await fetch(BREVO, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email,
      includeListIds: [listId],
      templateId,
      redirectionUrl: `${SITE_URL}/newsletter/confirmed`,
    }),
  }).catch(() => null);

  if (res && (res.status === 201 || res.status === 204)) return { status: 200, result: { ok: true } };
  // Brevo answers an address it already has with a 400; to the visitor that is
  // the same outcome, and saying otherwise would reveal who is subscribed.
  if (res && res.status === 400) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    if (/already|exist|duplicate/i.test(err.message ?? "")) return { status: 200, result: { ok: true } };
  }
  console.error(`[subscribe] Brevo responded ${res?.status ?? "no response"}`);
  return { status: 502, result: { ok: false, error: "Something went wrong on our side. Please try again." } };
}

export async function POST(req: Request) {
  const body = await readBody(req);
  const { status, result } = await subscribe(body);
  // A plain form post (no JavaScript) gets a page, not JSON.
  if (!(req.headers.get("accept") ?? "").includes("application/json")) {
    const to = result.ok ? "/newsletter/check-email" : `/newsletter?error=${encodeURIComponent(result.error)}`;
    return NextResponse.redirect(new URL(to, req.url), 303);
  }
  return NextResponse.json(result, { status });
}
