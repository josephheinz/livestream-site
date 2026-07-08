"use client";

import * as React from "react";
import { TitledCard } from "@/components/ui/titled-card";
import { externalConnections, MASKED_KEY, type ExternalConnection } from "@/lib/mock-data";

export function ExternalConnections() {
  const [conns, setConns] = React.useState<ExternalConnection[]>(externalConnections);
  const [platform, setPlatform] = React.useState("");
  const [key, setKey] = React.useState("");

  const add = () => {
    const p = platform.trim();
    if (!p || !key.trim()) return;
    // Mask on add and discard the raw key immediately (FR-018).
    setConns((c) => [...c, { id: `c${c.length}-${p}`, platform: p, on: true, keyMasked: MASKED_KEY }]);
    setPlatform("");
    setKey("");
  };

  return (
    <TitledCard title="External Connections" contentClassName="flex flex-col gap-2.5 p-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Restream the feed to other platforms. Keys are <b>write-only</b> — stored values are never
        displayed back.
      </p>

      {conns.map((c) => (
        <div key={c.id} className="flex items-center gap-2.5 border border-border bg-background px-3 py-[9px]">
          <span
            aria-hidden
            className="inline-block h-[11px] w-[11px]"
            style={{ background: c.on ? "var(--green)" : "var(--muted-foreground)" }}
          />
          <span className="min-w-[74px] text-sm font-bold">{c.platform}</span>
          <span className="flex-1 overflow-hidden font-mono text-[12px] tracking-[.14em] text-ellipsis whitespace-nowrap text-muted-foreground">
            {c.keyMasked}
          </span>
          <button
            type="button"
            onClick={() =>
              setConns((cs) => cs.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)))
            }
            className="cursor-pointer border border-border bg-card px-[11px] py-1 font-mono text-[11px] font-bold transition-transform hover:-translate-x-px hover:-translate-y-px"
          >
            {c.on ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            aria-label={`Remove ${c.platform}`}
            onClick={() => setConns((cs) => cs.filter((x) => x.id !== c.id))}
            className="flex h-[26px] w-[26px] items-center justify-center border border-border text-[14px] text-muted-foreground transition-colors hover:text-primary"
          >
            ×
          </button>
        </div>
      ))}

      {conns.length === 0 && (
        <div className="border border-dashed border-border p-3.5 text-center text-[13px] text-muted-foreground">
          No external connections yet.
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <input
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="platform (e.g. Twitch)"
          className="min-w-[120px] flex-1 border border-border bg-input px-2.5 py-2 font-sans text-[13px] text-foreground outline-none"
        />
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type="password"
          placeholder="stream key"
          className="min-w-[120px] flex-1 border border-border bg-input px-2.5 py-2 font-mono text-[13px] text-foreground outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="cursor-pointer border border-border bg-primary px-4 py-2 font-sans text-[12px] font-bold text-primary-foreground uppercase shadow-[2px_2px_0_var(--shadow-color)] transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          Add
        </button>
      </div>
    </TitledCard>
  );
}
