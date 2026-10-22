import chainLogos from "../../data/chain-logos.json";
import issuerLogos from "../../data/issuer-logos.json";
import platformLogos from "../../data/platform-logos.json";

/**
 * A self-hosted mark on a light plate, with a monogram fallback so a missing file
 * never leaves a gap. Several marks are dark on transparency, so the plate keeps
 * them legible in dark mode. Always decorative: the name sits beside it.
 */
export function Logo({
  src,
  name,
  size = 28,
  round = false,
}: {
  src: string | undefined;
  name: string;
  size?: number;
  round?: boolean;
}) {
  const shape = round ? "rounded-full" : size <= 20 ? "rounded-md" : "rounded-lg";
  if (!src) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        className={`inline-flex shrink-0 items-center justify-center border bg-bg-subtle font-semibold text-fg-subtle ${shape}`}
      >
        {name.slice(0, 2)}
      </span>
    );
  }
  return (
    <span
      style={{ width: size, height: size, padding: size >= 24 ? 3 : 2 }}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-black/10 bg-white ${shape}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local, pre-sized */}
      <img src={src} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" className="size-full object-contain" />
    </span>
  );
}

const fromManifest = (manifest: Record<string, string>, dir: string, id: string) =>
  manifest[id] ? `/logos/${dir}${manifest[id]}` : undefined;

export function PlatformLogo({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  return <Logo src={fromManifest(platformLogos, "platforms/", id)} name={name} size={size} />;
}

export function IssuerLogo({ id, name, size = 28 }: { id: string; name: string; size?: number }) {
  return <Logo src={fromManifest(issuerLogos, "issuers/", id)} name={name} size={size} />;
}

export function ChainLogo({ chain, size = 16 }: { chain: string; size?: number }) {
  return <Logo src={fromManifest(chainLogos, "chains/", chain)} name={chain} size={size} round />;
}
