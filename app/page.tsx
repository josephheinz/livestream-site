import { Banner } from "@/components/site/banner";
import { TickerTape } from "@/components/site/ticker-tape";
import { Footer } from "@/components/site/footer";
import { Player } from "@/components/watch/player";
import { StreamHeading } from "@/components/watch/stream-heading";
import { ChatPanel, type ChatMode } from "@/components/watch/chat-panel";
import { chatMessages, banNotice, tickerItems, stream } from "@/lib/mock-data";

function parseChat(v: string | string[] | undefined): ChatMode {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "signedin" || s === "banned" ? s : "signedout";
}

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const live = (Array.isArray(sp.live) ? sp.live[0] : sp.live) === "1";
  const chat = parseChat(sp.chat);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Banner live={live} />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <Player live={live} />
          <StreamHeading live={live} />
        </div>
        <ChatPanel
          mode={chat}
          messages={chatMessages}
          ban={banNotice}
          live={live}
          viewers={stream.viewers}
        />
      </main>
      <TickerTape items={tickerItems} />
      <Footer />
    </div>
  );
}
