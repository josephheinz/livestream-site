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

function formatThousands(n: number): string {
  return n.toLocaleString("en-US");
}

// Title for a stream the admin creates on the fly when nothing is scheduled (D8).
const DEFAULT_TITLE = "LIVE NOW";

// Live console body: stats mapped per research D7, go-live control driving the
// real lifecycle via streams.goLive/end (create fallback) per research D8.
export function DashboardBody() {
  const live = useQuery(api.streams.getLive);
  const upcoming = useQuery(api.streams.listUpcoming);
  const bans = useQuery(api.bans.list);
  const streamId = live?._id;
  const viewers = useQuery(api.presence.count, streamId ? { streamId } : "skip") ?? 0;

  const goLive = useMutation(api.streams.goLive);
  const endStream = useMutation(api.streams.end);
  const createStream = useMutation(api.streams.create);

  const isLive = live != null;

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
    const next = upcoming?.[0];
    const target =
      next?._id ?? (await createStream({ title: DEFAULT_TITLE, scheduledStart: Date.now() }));
    await goLive({ streamId: target });
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
          {isLive ? "GO OFF AIR" : "GO LIVE"}
        </button>
      </div>

      <StatRow stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2">
        <AnnouncementCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <AudienceEffectsCard />
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:items-start">
        <StreamTitleCard />
        <TickerCard />
      </div>

      <ExternalConnections />

      <BannedUsers />
    </div>
  );
}
