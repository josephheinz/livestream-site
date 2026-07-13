"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

// Mono utility toggle that lives on the dark bar (banner + design-system header).
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, cycle } = useTheme();
  return (
    <button
      type="button"
      onClick={cycle}
      title="Cycle theme"
      className={cn(
        "cursor-pointer border-2 border-[#57524a] px-[9px] py-1.5 font-mono text-[11px] text-bar-muted transition-transform hover:-translate-x-px hover:-translate-y-px",
        className
      )}
    >
      THEME:{mode.toUpperCase()}
    </button>
  );
}
