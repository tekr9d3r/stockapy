import { CategoryBadgeIcon } from "./CategoryIcon";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

/**
 * Top of a category page: icon and colour, the H1, a short answer-first
 * paragraph (the one an answer engine should lift), and visual stat tiles.
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
      <div className="flex items-center gap-3">
        <CategoryBadgeIcon category={category} size={44} />
        <p className={`text-xs font-semibold tracking-widest uppercase ${c.cls.text}`}>{c.hint}</p>
      </div>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <div className="mt-3 max-w-3xl text-[16px] leading-relaxed text-fg-muted">{children}</div>
      {logos && <div className="mt-4">{logos}</div>}
      {tiles && <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles}</dl>}
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
    <div className="rounded-xl border bg-bg-raised p-4 shadow-card">
      <dt className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">{label}</dt>
      <dd className={`tabular-nums mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px] ${tone === "warn" ? "text-warn" : accent}`}>
        {value}
      </dd>
      {note && <p className="mt-1 text-xs leading-snug text-fg-subtle">{note}</p>}
    </div>
  );
}

/** A row of overlapping logos with a caption, e.g. the platforms behind a number. */
export function LogoStack({ children, caption }: { children: React.ReactNode; caption: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex -space-x-1.5 [&>*]:ring-2 [&>*]:ring-bg">{children}</div>
      <span className="text-xs text-fg-subtle">{caption}</span>
    </div>
  );
}
