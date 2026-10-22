"use client";

import { usePathname } from "next/navigation";

/** Renders its children everywhere except under the given path prefixes. */
export function PathGate({ hideOn, children }: { hideOn: string[]; children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  return hideOn.some((p) => path === p || path.startsWith(`${p}/`)) ? null : <>{children}</>;
}
