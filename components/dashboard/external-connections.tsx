"use client";

import { TitledCard } from "@/components/ui/titled-card";

// The backend tracks no restream targets, so this card shows an honest empty
// state rather than the spec-002 demo rows (research D7, SC-005). The visual
// shell (title, description, dashed empty state) is preserved from spec 002.
export function ExternalConnections() {
  return (
    <TitledCard title="External Connections" contentClassName="flex flex-col gap-2.5 p-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Restream the feed to other platforms. Keys are <b>write-only</b> — stored values are never
        displayed back.
      </p>
      <div className="border border-dashed border-border p-3.5 text-center text-[13px] text-muted-foreground">
        No external connections yet.
      </div>
    </TitledCard>
  );
}
