"use client";

import { StatusIndicator } from "@/components/ui/status-indicator";
import { MiniMessageText } from "@/components/ui/minimessage-text";

// Large heading for the bound stream (research D3): title comes from the live
// stream, else the next upcoming, else the channel name (resolved by the caller).
export function StreamHeading({ title, live }: { title: string; live: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[clamp(28px,5vw,52px)] leading-none uppercase">
        <MiniMessageText text={title} />
      </h1>
      <StatusIndicator kind={live ? "onair" : "offair"} />
    </div>
  );
}
