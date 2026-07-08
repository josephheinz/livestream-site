"use client";

import * as React from "react";

type Mode = "auto" | "light" | "dark";
type Resolved = "light" | "dark";

const STORAGE_KEY = "nightchannel-theme";
const ORDER: Mode[] = ["auto", "light", "dark"];

type ThemeContextValue = { mode: Mode; resolved: Resolved; cycle: () => void };
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(mode: Mode): Resolved {
  if (mode === "auto") return prefersDark() ? "dark" : "light";
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<Mode>("auto");
  const [resolved, setResolved] = React.useState<Resolved>("light");

  // Pick up the persisted mode after mount (the inline ThemeScript already set
  // the class pre-hydration, so this only syncs React state).
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
    if (saved && ORDER.includes(saved)) setMode(saved);
  }, []);

  // Apply the resolved palette; in auto, follow the OS with a live listener.
  React.useEffect(() => {
    const update = () => {
      const r = resolve(mode);
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    update();
    if (mode !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [mode]);

  const cycle = React.useCallback(() => {
    setMode((m) => {
      const next = ORDER[(ORDER.indexOf(m) + 1) % ORDER.length];
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ mode, resolved, cycle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
