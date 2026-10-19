import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home directory above this project is itself a git repo with a lockfile.
  // Pin the tracing root so Next does not walk up into it.
  outputFileTracingRoot: __dirname,
  // data/*.yaml and data/snapshots/*.json are read at build and revalidate time.
  outputFileTracingIncludes: { "/**": ["./data/**"] },
};

export default nextConfig;
