/**
 * A tiny horizontal bar. With two segments it shows a split (interest vs
 * incentives); with one, a share of a maximum (LTV). Decorative: the numbers it
 * draws are always printed beside it or in its title.
 */
export function MiniBar({
  segments,
  max = 100,
  width = 56,
  title,
}: {
  segments: { value: number; className: string }[];
  max?: number;
  width?: number;
  title?: string;
}) {
  const total = Math.max(max, 0.0001);
  return (
    <span
      aria-hidden="true"
      title={title}
      style={{ width }}
      className="inline-flex h-1.5 overflow-hidden rounded-full bg-bg-subtle ring-1 ring-border"
    >
      {segments.map((s, i) =>
        s.value > 0 ? <span key={i} className={s.className} style={{ width: `${Math.min((s.value / total) * 100, 100)}%` }} /> : null,
      )}
    </span>
  );
}
