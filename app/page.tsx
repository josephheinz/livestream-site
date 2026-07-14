"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Banner } from "@/components/site/banner";
import { TickerTape, tickerItemsFor } from "@/components/site/ticker-tape";
import { ConnectionStatus } from "@/components/site/connection-status";
import { Player } from "@/components/watch/player";
import { StreamHeading } from "@/components/watch/stream-heading";
import { ChatPanel } from "@/components/watch/chat-panel";
import { usePresence } from "@/lib/presence";

// Off-air fallback when no stream is live or scheduled (research D3).
const CHANNEL_NAME = "Joseph Heinz";

export default function WatchPage() {
  const live = useQuery(api.streams.getLive);
  const settings = useQuery(api.settings.get);
  // Chat and presence always bind to the current stream (live, next, or most
  // recent) so they work off-air too; the backend resolves it server-side.
  const boundStream = useQuery(api.streams.current) ?? null;
  const streamId = boundStream?._id;
  const viewers = useQuery(api.presence.count, {}) ?? 0;
  usePresence();

  const isLive = live != null;
  const title = boundStream?.title ?? CHANNEL_NAME;

  return (
    // lg locks to the viewport so the chat column is height-bounded and
    // scrolls internally; below lg the page itself scrolls.
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh">
      <Banner live={isLive} viewers={viewers} />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <Player live={isLive} />
          <StreamHeading title={title} live={isLive} />
        </div>
        <ChatPanel streamId={streamId} viewers={viewers} />
      </main>
      <ConnectionStatus />
      <TickerTape items={tickerItemsFor(live, settings?.tickerItems)} />
    </div>
  );
}
