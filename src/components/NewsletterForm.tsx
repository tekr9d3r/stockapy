"use client";

import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/**
 * Email signup for the weekly newsletter. Posts to /api/subscribe; without
 * JavaScript the same form still works as a plain POST.
 */
export function NewsletterForm({ source, tone = "default" }: { source: string; tone?: "default" | "inverse" }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      setState(body.ok ? { kind: "done" } : { kind: "error", message: body.error ?? "Please try again." });
    } catch {
      setState({ kind: "error", message: "Couldn't reach the server. Please try again." });
    }
  }

  const muted = tone === "inverse" ? "text-white/75" : "text-fg-subtle";

  if (state.kind === "done") {
    return (
      <div role="status" className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${tone === "inverse" ? "border-white/25 bg-white/10 text-white" : "bg-bg-raised"}`}>
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-positive" aria-hidden="true" />
        <span>
          <strong>Almost there — check your inbox.</strong> Click the link in the email to confirm, and
          the first issue lands this week.
        </span>
      </div>
    );
  }

  return (
    <form action="/api/subscribe" method="post" onSubmit={onSubmit} className="@container w-full">
      <div className="flex flex-col gap-2 @sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Email address</span>
          <Mail size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 w-full rounded-lg border border-border-strong bg-bg-raised pr-3 pl-9 text-[15px] text-fg outline-none placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        {/* Honeypot: hidden from people, irresistible to bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <input type="hidden" name="source" value={source} />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className={`h-11 shrink-0 rounded-lg px-5 text-[15px] font-semibold transition disabled:opacity-60 ${
            tone === "inverse" ? "bg-white text-[#0e1320] hover:bg-white/90" : "bg-accent text-accent-fg hover:opacity-90"
          }`}
        >
          {state.kind === "sending" ? "Subscribing…" : "Get the weekly picks"}
        </button>
      </div>
      {state.kind === "error" && (
        <p role="alert" className={`mt-2 text-sm ${tone === "inverse" ? "text-white" : "text-warn"}`}>
          {state.message}
        </p>
      )}
      <p className={`mt-2 text-xs ${muted}`}>
        One email a week. Unsubscribe anytime. Sent with Brevo (EU) ·{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
      </p>
    </form>
  );
}
