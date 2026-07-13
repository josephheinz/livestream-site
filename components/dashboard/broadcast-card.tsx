"use client";

import { PulseSquare } from "@/components/motion/motion-primitives";
import { TitledCard } from "@/components/ui/titled-card";

function formatThousands(n: number): string {
  return n.toLocaleString("en-US");
}

export function BroadcastCard({
  live,
  viewers,
  onToggle,
}: {
  live: boolean;
  viewers: number;
  onToggle: () => void;
}) {
  return (
    <TitledCard title="Broadcast" contentClassName="flex flex-wrap items-center gap-3.5 p-4">
      <div className="flex items-center gap-2.5 font-mono text-[14px] font-bold">
        {live ? (
          <>
            <PulseSquare size={12} />
            <span>ON AIR — {formatThousands(viewers)} watching</span>
          </>
        ) : (
          <>
            <span aria-hidden className="inline-block h-3 w-3 bg-muted-foreground" />
            <span>OFF AIR</span>
          </>
        )}
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onToggle}
        className="cursor-pointer border-2 border-border bg-foreground px-[18px] py-[9px] font-sans text-[12px] font-bold text-background uppercase shadow-[2px_2px_0_var(--shadow-color)] transition-transform hover:-translate-x-px hover:-translate-y-px"
      >
        {live ? "GO OFF AIR" : "GO LIVE"}
      </button>
    </TitledCard>
  );
}
