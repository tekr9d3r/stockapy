import Link from "next/link";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

/**
 * Top of a category page: the H1, a short
 * answer-first paragraph (the one an answer engine should lift), the
 * traditional-finance equivalent for newcomers, and the stat tiles.
 */
export function CategoryHeader({
  category,
  title,
  children,
  tiles,
  logos,
}: {
  category: CategoryKey;
  title: string;
  children: React.ReactNode;
  tiles?: React.ReactNode;
  logos?: React.ReactNode;
}) {
  const c = CATEGORIES[category];
  return (
    <section className="mb-8">
      <h1 className="max-w-3xl text-4xl tracking-tight sm:text-5xl">{title}</h1>
      <div className="mt-3 max-w-3xl text-[17px] leading-relaxed text-fg-muted">{children}</div>
      <p className="mt-3 max-w-3xl border-l-2 border-fg pl-3 text-sm leading-relaxed text-fg">
        {c.tradfi}{" "}
        <Link href={`/hub/${c.lesson}`} className="text-accent underline underline-offset-2">
          How it works
        </Link>
        <span className="text-fg-subtle"> · New to this? </span>
        <Link href={`/hub/${CATEGORIES.hub.lesson}`} className="text-accent underline underline-offset-2">
          Start here
        </Link>
      </p>
      {logos && <div className="mt-4">{logos}</div>}
      {tiles && <dl className="mt-7 grid grid-cols-2 border-t lg:grid-cols-4">{tiles}</dl>}
    </section>
  );
}

/** One big-number tile. The value is plain text, so it is in the HTML as-is. */
export function Tile({
  label,
  value,
  note,
  category,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
  category?: CategoryKey;
  tone?: "default" | "warn";
}) {
  const accent = category ? CATEGORIES[category].cls.text : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="border-b py-4 pr-4 lg:border-r lg:pl-4 lg:first:pl-0 lg:last:border-r-0">
      <dt className="kicker">{label}</dt>
      <dd className={`tabular-nums mt-1.5 font-[family-name:var(--font-display)] text-3xl ${tone === "warn" ? "text-warn" : accent}`}>
        {value}
      </dd>
      {note && <p className="mt-1 text-xs leading-snug text-fg-subtle">{note}</p>}
    </div>
  );
}

/** The coverage behind a page's numbers, as one plain line. Logos stay in the tables. */
export function LogoStack({ caption }: { children?: React.ReactNode; caption: React.ReactNode }) {
  return <p className="text-xs text-fg-subtle">{caption}</p>;
}
