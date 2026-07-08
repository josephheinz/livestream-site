"use client";

import * as React from "react";
import { stream } from "@/lib/mock-data";

const KEY = "nightchannel-stream-title";

// The Watch heading is editable from the dashboard. There's no backend in this
// feature, so the two routes share the value through localStorage: the editor
// writes it, and the heading reads it on mount (and on cross-tab changes).
export function useStreamTitle(): [string, (title: string) => void] {
  const [title, setTitle] = React.useState(stream.streamTitle);

  React.useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setTitle(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setTitle(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = React.useCallback((t: string) => {
    setTitle(t);
    localStorage.setItem(KEY, t);
  }, []);

  return [title, update];
}
