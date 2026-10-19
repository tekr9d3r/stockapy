const TONES = {
  neutral: "bg-bg-subtle text-fg-muted border-border",
  accent: "bg-accent-subtle text-accent border-accent/20",
  warn: "bg-warn-subtle text-warn border-warn/20",
} as const;

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
