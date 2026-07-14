"use client";

import * as React from "react";
import { TitledCard } from "@/components/ui/titled-card";
import { useStreamTitle } from "@/components/stream-title";

// Admin-only title editor persisted via streams.update. A local draft holds the
// in-progress edit and commits on blur/Enter; when idle it follows the persisted
// value so a concurrent edit converges (last write wins).
export function StreamTitleCard() {
  const { title, canEdit, save } = useStreamTitle();
  const [draft, setDraft] = React.useState<string | null>(null);
  const value = draft ?? title;

  const commit = () => {
    if (draft !== null && draft !== title) {
      save(draft);
    }
    setDraft(null);
  };

  return (
    <TitledCard title="Stream Title" contentClassName="p-4">
      <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
        Displayed title
      </label>
      <input
        aria-label="Stream title"
        value={value}
        readOnly={!canEdit}
        onChange={(e) => canEdit && setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-full border border-border bg-input px-2.5 py-2 font-display text-[18px] text-foreground uppercase outline-none"
      />
      <p className="mt-2 font-mono text-[12px] text-muted-foreground">
        Shown as the heading on the Watch screen.
      </p>
    </TitledCard>
  );
}
