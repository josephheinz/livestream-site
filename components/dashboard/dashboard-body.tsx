"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatRow } from "./stat-row";
import { StreamTitleCard } from "./stream-title-card";
import { TickerCard } from "./ticker-card";
import { ExternalConnections } from "./external-connections";
import { BannedUsers } from "./banned-users";
import { AnnouncementCard } from "./announcement-card";
import { AudienceEffectsCard } from "./audience-effects-card";
import { PollCard } from "./poll-card";
import { IngestCard } from "./ingest-card";

function formatThousands(n: number): string {
  return n.toLocaleString("en-US");
}

// Live console body: stats mapped per research D7, go-live control driving the
// real lifecycle via streams.goLive/end per research D8.
export function DashboardBody() {
  const live = useQuery(api.streams.getLive);
  const upcoming = useQuery(api.streams.listUpcoming);
  const bans = useQuery(api.bans.list);
  const streamId = live?._id;
  const viewers = useQuery(api.presence.count, streamId ? { streamId } : "skip") ?? 0;

  const goLive = useMutation(api.streams.goLive);
  const endStream = useMutation(api.streams.end);

  const isLive = live != null;
  const ingestStream = live ?? upcoming?.[0];
  const canGoLive = ingestStream?.ingestActive === true;

  const stats = {
    status: (isLive ? "ON AIR" : "OFF AIR") as "ON AIR" | "OFF AIR",
    watchingNow: isLive ? formatThousands(viewers) : "—",
    // Backend tracks no restream targets — honest empty (research D7).
    connectionsLive: "0/0",
    activeBans: bans?.length ?? 0,
  };

  const toggle = async () => {
    if (isLive && live) {
      await endStream({ streamId: live._id });
      return;
    }
    if (ingestStream) await goLive({ streamId: ingestStream._id });
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
          disabled={!isLive && !canGoLive}
          className="cursor-pointer border-2 border-border bg-primary px-[22px] py-[11px] font-display text-[14px] text-primary-foreground uppercase shadow-brutal transition-transform hover:-translate-x-px hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          {isLive ? "GO OFF AIR" : canGoLive ? "GO LIVE" : "NO SIGNAL"}
        </button>
      </div>

      <StatRow stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2">
        <AnnouncementCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <AudienceEffectsCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <PollCard />
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:items-start">
        <StreamTitleCard />
        <TickerCard />
      </div>

      <IngestCard
        key={ingestStream?._id ?? "no-stream"}
        streamId={ingestStream?._id}
        isLive={ingestStream?.status === "live"}
        ingestActive={ingestStream?.ingestActive === true}
      />

      <ExternalConnections />

      <BannedUsers />
    </div>
  );
}
