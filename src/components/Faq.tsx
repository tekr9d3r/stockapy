/**
 * Questions and answers, collapsed by default. The answers stay in the HTML, so
 * crawlers and answer engines read them (and FAQPage JSON-LD backs them), but a
 * visitor only sees the questions until they open one.
 */
export function Faq({ entries, title = "Common questions" }: { entries: { question: string; answer: string }[]; title?: string }) {
  return (
    <section aria-labelledby="faq" className="mt-12 max-w-3xl">
      <h2 id="faq" className="mb-3 text-3xl tracking-tight">{title}</h2>
      <div className="divide-y border-y">
        {entries.map((q) => (
          <details key={q.question} className="group py-3.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {q.question}
              <span aria-hidden="true" className="text-lg leading-none text-fg-subtle transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{q.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
