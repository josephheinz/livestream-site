"use client";

import { PulseSquare } from "@/components/motion/motion-primitives";
import { StatCard } from "@/components/ui/stat-card";

export type DashboardStats = {
  status: "ON AIR" | "OFF AIR";
  watchingNow: string;
  connectionsLive: string;
  activeBans: number;
};

export function StatRow({ stats }: { stats: DashboardStats }) {
  const live = stats.status === "ON AIR";
  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
      <StatCard
        label="Status"
        barColor="primary"
        value={
          <>
            {live && <PulseSquare size={13} />}
            <span>{stats.status}</span>
          </>
        }
      />
      <StatCard label="Watching now" barColor="green" value={stats.watchingNow} />
      <StatCard label="Connections live" barColor="yellow" value={stats.connectionsLive} />
      <StatCard label="Active bans" barColor="muted" value={stats.activeBans} />
    </div>
  );
}
