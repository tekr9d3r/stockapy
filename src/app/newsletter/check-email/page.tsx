import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Check your inbox",
  robots: { index: false, follow: true },
};

export default function CheckEmailPage() {
  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <MailCheck size={44} aria-hidden="true" className="mx-auto text-accent" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Check your inbox</h1>
      <p className="mt-3 text-fg-muted">
        We&rsquo;ve sent you a confirmation email. Click the link inside to start getting the weekly
        picks. If it isn&rsquo;t there in a few minutes, check your spam folder.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
        Back to the overview
      </Link>
    </section>
  );
}
