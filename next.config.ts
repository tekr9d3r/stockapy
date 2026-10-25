import type { NextConfig } from "next";

/**
 * Content-Security-Policy. Pages are static (ISR), so per-request script nonces
 * are not available: inline scripts are allowed (the theme script, JSON-LD and
 * Next's own bootstrap). Everything else is locked to this origin: no outside
 * scripts, frames, plugins or form targets. Vercel Analytics loads its script
 * from /_vercel on this origin in production, and from va.vercel-scripts.com in
 * development. Fonts and logos are self-hosted.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://va.vercel-scripts.com",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // Older browsers' version of frame-ancestors: never render inside a frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // The home directory above this project is itself a git repo with a lockfile.
  // Pin the tracing root so Next does not walk up into it.
  outputFileTracingRoot: __dirname,
  // data/*.yaml and data/snapshots/*.json are read at build and revalidate time.
  outputFileTracingIncludes: { "/**": ["./data/**"] },
  // Don't advertise the framework.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
