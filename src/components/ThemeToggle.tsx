"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Mode, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

/** Cycles System → Light → Dark. The choice is a per-browser convenience only. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {
      // Storage blocked: stay on the system theme.
    }
  }, []);

  const apply = (next: Mode) => {
    setMode(next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Not persisted; it still applies for this page view.
    }
  };

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => apply(NEXT[mode])}
      title={`${LABEL[mode]} — click for ${LABEL[NEXT[mode]].toLowerCase()}`}
      aria-label={`${LABEL[mode]}. Switch to ${LABEL[NEXT[mode]].toLowerCase()}`}
      className="inline-flex size-9 items-center justify-center rounded-md border bg-bg-raised text-fg-muted hover:text-fg"
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

/** Runs before paint so a saved theme never flashes the other one. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
