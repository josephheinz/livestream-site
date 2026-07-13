"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Banner } from "@/components/site/banner";
import { TickerTape, tickerItemsFor } from "@/components/site/ticker-tape";
import { ConnectionStatus } from "@/components/site/connection-status";
import { Footer } from "@/components/site/footer";
import { Player } from "@/components/watch/player";
import { StreamHeading } from "@/components/watch/stream-heading";
import { ChatPanel } from "@/components/watch/chat-panel";
import { usePresence } from "@/lib/presence";

// Off-air fallback when no stream is live or scheduled (research D3).
const CHANNEL_NAME = "Joseph Heinz";

export default function WatchPage() {
  const live = useQuery(api.streams.getLive);
  const upcoming = useQuery(api.streams.listUpcoming);
  const streamId = live?._id;
  const viewers = useQuery(api.presence.count, streamId ? { streamId } : "skip") ?? 0;
  usePresence(streamId);

  const isLive = live != null;
  const boundStream = live ?? upcoming?.[0] ?? null;
  const title = boundStream?.title ?? CHANNEL_NAME;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Banner live={isLive} viewers={viewers} />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <Player live={isLive} />
          <StreamHeading title={title} live={isLive} />
        </div>
        {/* ponytail: chat stays read-only signed-out until US2 (T022) wires it to
            chat.list / chat.send; no placeholder content is rendered here. */}
        <ChatPanel
          mode="signedout"
          messages={[]}
          ban={{ reason: "", expires: "" }}
          live={isLive}
          viewers={viewers}
        />
      </main>
      <ConnectionStatus />
      <TickerTape items={tickerItemsFor(live, upcoming)} />
      <Footer />
    </div>
  );
}
