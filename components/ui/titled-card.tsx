import * as React from "react";
import { cn } from "@/lib/utils";

// Dark-bar-header card — the workhorse panel. 2px border, 4px hard shadow.
// Pass contentClassName="p-0" for full-bleed bodies (tables, grids).
export function TitledCard({
  title,
  children,
  className,
  contentClassName,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn("border-2 border-border bg-card text-card-foreground shadow-brutal", className)}>
      <div className="bg-bar px-[14px] py-[9px] font-display text-[13px] uppercase text-bar-ink">
        {title}
      </div>
      <div className={cn("px-4 py-[14px] text-sm leading-relaxed", contentClassName)}>{children}</div>
    </div>
  );
}
