import type { Metadata } from "next";
import { BRAND_NAME, SITE_URL } from "@/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${BRAND_NAME} collects, why, and how to get it deleted.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-[15px] leading-relaxed text-fg-muted">
      <h1 className="text-3xl font-semibold tracking-tight text-fg">Privacy</h1>
      <p>
        {BRAND_NAME} ({SITE_URL.replace("https://", "")}) is an information site. You can use all of
        it without an account, and it sets no advertising or tracking cookies.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-fg">The newsletter</h2>
      <p>
        If you subscribe, we store your email address to send you the weekly newsletter, and nothing
        else. Your subscription only starts once you click the confirmation link we email you
        (double opt-in). The legal basis is your consent, which you can withdraw at any time.
      </p>
      <p>
        Emails are sent with Brevo (Sendinblue SAS, France), which stores the list on our behalf as a
        data processor, inside the EU. We do not sell or share your address with anyone else.
      </p>
      <p>
        Every email has an unsubscribe link. Unsubscribing stops all emails. To have your address
        deleted entirely, reply to any issue and ask.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-fg">Your rights</h2>
      <p>
        Under the GDPR you can ask what we hold about you, have it corrected or deleted, and complain
        to your national data protection authority.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-fg">The rest of the site</h2>
      <p>
        Your theme choice (light or dark) is kept in your own browser&rsquo;s storage and never sent
        to us. Our host may keep standard server logs, such as IP addresses, for security.
      </p>
    </article>
  );
}
