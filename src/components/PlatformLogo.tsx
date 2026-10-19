import logos from "../../data/platform-logos.json";

const MANIFEST = logos as Record<string, string>;

/** Platform mark, with a monogram fallback so a missing file never leaves a gap. */
export function PlatformLogo({
  id,
  name,
  size = 28,
}: {
  id: string;
  name: string;
  size?: number;
}) {
  const file = MANIFEST[id];

  if (!file) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        className="inline-flex shrink-0 items-center justify-center rounded-lg border bg-bg-subtle font-semibold text-fg-subtle"
      >
        {name.slice(0, 2)}
      </span>
    );
  }

  // Several of these are dark marks on transparency, so they need a light plate
  // to stay legible in dark mode. Aave's ghost disappears entirely without one.
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white p-[3px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local, pre-sized */}
      <img
        src={`/logos/platforms/${file}`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="size-full object-contain"
      />
    </span>
  );
}
