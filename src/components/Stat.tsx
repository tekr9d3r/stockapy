export function StatStrip({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
      {children}
    </dl>
  );
}

export function Stat({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="bg-bg-raised px-4 py-3">
      <dt className="text-[11px] text-fg-muted">{label}</dt>
      <dd
        className={`tnum mt-1 text-xl font-semibold ${tone === "warn" ? "text-warn" : "text-fg"}`}
      >
        {value}
      </dd>
      {note && <p className="mt-0.5 text-xs text-fg-subtle">{note}</p>}
    </div>
  );
}
