import { formatApy, formatLtv, formatUsd } from "@/lib/format";

type Cell = string | number | null | undefined;

/** One table cell: pipes and newlines would break the table, null reads as "—". */
export function mdCell(value: Cell): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function mdTable(headers: string[], rows: Cell[][]): string {
  const head = `| ${headers.map(mdCell).join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(mdCell).join(" | ")} |`);
  return [head, rule, ...body].join("\n");
}

export const mdPct = (v: number | null | undefined) => (v === null || v === undefined ? null : formatApy(v));
export const mdUsd = (v: number | null | undefined) => (v === null || v === undefined ? null : formatUsd(v));
export const mdLtv = (v: number | null | undefined) => (v === null || v === undefined ? null : formatLtv(v));
/** A link cell. */
export const mdLink = (label: string, url: string | null | undefined) => (url ? `[${label.replace(/[[\]]/g, "")}](${url})` : label);
