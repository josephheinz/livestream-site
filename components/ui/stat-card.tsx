import * as React from "react";
import { cn } from "@/lib/utils";

export type StatBarColor = "primary" | "green" | "yellow" | "muted";

const BAR: Record<StatBarColor, string> = {
  primary: "bg-primary",
  green: "bg-green",
  yellow: "bg-yellow",
  muted: "bg-muted-foreground",
};

// Stat card — mono label, Archivo Black value, colored underline bar.
export function StatCard({
  label,
  value,
  barColor,
  className,
}: {
  label: string;
  value: React.ReactNode;
  barColor: StatBarColor;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-card p-[15px] text-card-foreground shadow-brutal",
        className
      )}
    >
      <div className="font-mono text-[11px] tracking-[.12em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-[10px] font-display text-[26px] leading-none">
        {value}
      </div>
      <div
        data-testid="stat-bar"
        data-color={barColor}
        className={cn("mt-[13px] h-[7px] opacity-85", BAR[barColor])}
      />
    </div>
  );
}
