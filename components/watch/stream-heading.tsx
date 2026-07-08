"use client";

import { StatusIndicator } from "@/components/ui/status-indicator";
import { useStreamTitle } from "@/components/stream-title";

// Large editable title in place of the old stream-info panel.
export function StreamHeading({ live }: { live: boolean }) {
  const [title] = useStreamTitle();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[clamp(28px,5vw,52px)] leading-none uppercase">{title}</h1>
      <StatusIndicator kind={live ? "onair" : "offair"} />
    </div>
  );
}
