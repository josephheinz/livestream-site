"use client";

import { TitledCard } from "@/components/ui/titled-card";
import { useStreamTitle } from "@/components/stream-title";

export function StreamTitleCard() {
  const [title, setTitle] = useStreamTitle();
  return (
    <TitledCard title="Stream Title" contentClassName="p-4">
      <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
        Displayed title
      </label>
      <input
        aria-label="Stream title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border bg-input px-2.5 py-2 font-display text-[18px] text-foreground uppercase outline-none"
      />
      <p className="mt-2 font-mono text-[12px] text-muted-foreground">
        Shown as the heading on the Watch screen.
      </p>
    </TitledCard>
  );
}
