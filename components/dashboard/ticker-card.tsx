"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TitledCard } from "@/components/ui/titled-card";

// Admin editor for the ticker-tape lines (one per row), persisted via
// settings.setTickerItems; live status stays derived.
export function TickerCard() {
  const settings = useQuery(api.settings.get);
  const save = useMutation(api.settings.setTickerItems);
  const [draft, setDraft] = React.useState<string | null>(null);
  const value = draft ?? (settings?.tickerItems ?? []).join("\n");

  const commit = () => {
    if (draft !== null) {
      void save({ tickerItems: draft.split("\n") });
    }
    setDraft(null);
  };

  return (
    <TitledCard title="Ticker Tape" contentClassName="p-4">
      <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
        Lines (one per row)
      </label>
      <textarea
        aria-label="Ticker lines"
        rows={4}
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={"MERCH DROP FRIDAY\nSUBSCRIBE FOR GO-LIVE PING"}
        className="w-full resize-y border border-border bg-input px-2.5 py-2 font-mono text-[13px] text-foreground outline-none"
      />
      <p className="mt-2 font-mono text-[12px] text-muted-foreground">
        Scrolls in the bottom tape on every page. On-air status is added automatically.
      </p>
    </TitledCard>
  );
}
