"use client";

import * as React from "react";
import { StatRow } from "./stat-row";
import { ExternalConnections } from "./external-connections";
import { BroadcastCard } from "./broadcast-card";
import { BannedUsers } from "./banned-users";
import { stream, formatThousands, externalConnections, bannedUsers } from "@/lib/mock-data";

// Client boundary owning the shared go-live state so the header control, the
// status/watching stats, and the broadcast card stay in sync. Connections and
// bans keep their own local state; their stat counts show the seeded snapshot.
export function DashboardBody({ initialLive }: { initialLive: boolean }) {
  const [live, setLive] = React.useState(initialLive);
  const toggle = () => setLive((v) => !v);
  const activeConns = externalConnections.filter((c) => c.on).length;

  const stats = {
    status: (live ? "ON AIR" : "OFF AIR") as "ON AIR" | "OFF AIR",
    watchingNow: live ? formatThousands(stream.viewers) : "—",
    connectionsLive: `${activeConns}/${externalConnections.length}`,
    activeBans: bannedUsers.length,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[18px] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-display text-[38px] leading-none uppercase">Dashboard</div>
          <div className="mt-2 font-mono text-[12px] tracking-[.08em] text-muted-foreground">
            RESTRICTED — BROADCAST CONTROLS
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="cursor-pointer border-2 border-border bg-primary px-[22px] py-[11px] font-display text-[14px] text-primary-foreground uppercase shadow-brutal transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          {live ? "GO OFF AIR" : "GO LIVE"}
        </button>
      </div>

      <StatRow stats={stats} />

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:items-start">
        <ExternalConnections />
        <BroadcastCard live={live} onToggle={toggle} />
      </div>

      <BannedUsers />
    </div>
  );
}
