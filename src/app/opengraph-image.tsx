import { ImageResponse } from "next/og";
import { getRows, marketStats } from "@/lib/data/rows";
import { formatApy } from "@/lib/format";
import { BRAND_NAME, BRAND_TAGLINE } from "@/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;

export default async function Image() {
  const stats = marketStats(getRows());
  const organic =
    stats.organicShare === null ? "—" : `${(stats.organicShare * 100).toFixed(1)}%`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0d12",
          color: "#f0f2f5",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#5b8dff", fontWeight: 600 }}>{BRAND_NAME}</div>
          <div style={{ fontSize: 62, fontWeight: 700, marginTop: 18, lineHeight: 1.1 }}>
            {BRAND_TAGLINE}
          </div>
        </div>

        <div style={{ display: "flex", gap: 56 }}>
          <Metric label="Opportunities" value={String(stats.opportunityCount)} />
          <Metric label="Median earn APY" value={formatApy(stats.medianApy)} accent />
          <Metric label="Yield that is real interest" value={organic} accent />
        </div>
      </div>
    ),
    size,
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 20, color: "#98a2b3" }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: 700, color: accent ? "#fdb022" : "#f0f2f5" }}>
        {value}
      </div>
    </div>
  );
}
