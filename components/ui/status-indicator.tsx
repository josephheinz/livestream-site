"use client";

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type StatusKind = "live" | "onair" | "offair" | "connected";

const CFG: Record<
  StatusKind,
  { motion: "blink" | "pulse" | "none"; color: string; label: string; textClass: string }
> = {
  live: { motion: "blink", color: "var(--primary)", label: "LIVE", textClass: "text-primary" },
  onair: { motion: "pulse", color: "var(--primary)", label: "ON AIR", textClass: "" },
  offair: {
    motion: "none",
    color: "var(--muted-foreground)",
    label: "OFF AIR",
    textClass: "text-muted-foreground",
  },
  connected: { motion: "pulse", color: "var(--green)", label: "CONNECTED", textClass: "" },
};

// Square status indicator (never round). Live blinks, connections/on-air pulse,
// off-air is static. Motion is neutralized when the OS asks for reduced motion.
export function StatusIndicator({ kind, label }: { kind: StatusKind; label?: string }) {
  const reduced = useReducedMotion();
  const cfg = CFG[kind];
  const anim = reduced ? "none" : cfg.motion;
  return (
    <span
      data-kind={kind}
      className={cn(
        "inline-flex items-center gap-[9px] font-mono text-[13px] font-bold uppercase",
        cfg.textClass
      )}
    >
      <span
        data-testid="indicator-dot"
        data-anim={anim}
        aria-hidden
        className={cn(
          "inline-block",
          anim === "blink" && "animate-blink",
          anim === "pulse" && "animate-pulse-soft"
        )}
        style={{ width: 12, height: 12, background: cfg.color }}
      />
      <span>{label ?? cfg.label}</span>
    </span>
  );
}
