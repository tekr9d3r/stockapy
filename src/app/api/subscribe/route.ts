import { NextResponse } from "next/server";
import { SIGNUP_ERRORS, type SignupError } from "@/lib/newsletter";
import { RateLimiter } from "@/lib/rate-limit";
import { SITE_URL } from "@/config";

/**
 * Newsletter signup through Brevo's double opt-in: Brevo emails a confirmation
 * link and only adds the contact to the list once it is clicked, which is what
 * GDPR expects of an EU site.
 *
 * Needs three environment variables (see .env.example). The email address is
 * never logged.
 *
 * Abuse limits: every accepted request makes Brevo send an email, so a script
 * could flood someone's inbox and burn our sending reputation. Requests are
 * capped in size, per IP and per address (best-effort, in memory; the robust
 * layer is a Vercel Firewall rate-limit rule on this path).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BREVO = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** A real signup is well under 1 KB. */
const MAX_BODY_BYTES = 4_096;

/** 5 attempts per IP per 10 minutes. */
const perIp = new RateLimiter(5, 10 * 60_000);
/** One confirmation email per address per 30 minutes; repeats are answered as success. */
const perEmail = new RateLimiter(1, 30 * 60_000);

type Result = { ok: true } | { ok: false; code: SignupError };

const STATUS: Record<SignupError, number> = { invalid: 400, rate: 429, unavailable: 503, failed: 502 };

async function readBody(req: Request): Promise<Record<string, string> | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return null;
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
  // The no-JavaScript form posts application/x-www-form-urlencoded.
  return Object.fromEntries(new URLSearchParams(text));
}

function clientIp(req: Request): string {
  // Set by Vercel's edge; the first entry is the original client.
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function subscribe(req: Request): Promise<Result> {
  if (!perIp.allow(clientIp(req))) return { ok: false, code: "rate" };

  const body = await readBody(req);
  if (!body) return { ok: false, code: "invalid" };
  const email = String(body.email ?? "").trim().toLowerCase();
  // A bot that fills every field fills the hidden one too. Pretend it worked.
  if (body.website) return { ok: true };
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, code: "invalid" };

  // The same address again within the cooldown: no second email, but the same
  // answer, so the endpoint never reveals whether an address was just used.
  if (!perEmail.allow(email)) return { ok: true };

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const templateId = Number(process.env.BREVO_DOI_TEMPLATE_ID);
  if (!apiKey || !listId || !templateId) return { ok: false, code: "unavailable" };

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

  if (res && (res.status === 201 || res.status === 204)) return { ok: true };
  // Brevo answers an address it already has with a 400; to the visitor that is
  // the same outcome, and saying otherwise would reveal who is subscribed.
  // Brevo's error body names the cause (missing permission, bad template, IP not
  // authorised). Log its code and message; it never contains the address itself.
  const err = res ? ((await res.json().catch(() => ({}))) as { code?: string; message?: string }) : {};
  if (res && res.status === 400 && /already|exist|duplicate/i.test(err.message ?? "")) return { ok: true };
  console.error(
    `[subscribe] Brevo responded ${res?.status ?? "no response"}: ${err.code ?? "?"} — ${(err.message ?? "").replace(email, "<email>")}`,
  );
  return { ok: false, code: "failed" };
}

export async function POST(req: Request) {
  const result = await subscribe(req);
  // A plain form post (no JavaScript) gets a page, not JSON. The redirect
  // carries a code; the page shows our own wording for it.
  if (!(req.headers.get("accept") ?? "").includes("application/json")) {
    const to = result.ok ? "/newsletter/check-email" : `/newsletter?error=${result.code}`;
    return NextResponse.redirect(new URL(to, SITE_URL), 303);
  }
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: SIGNUP_ERRORS[result.code] }, { status: STATUS[result.code] });
}
