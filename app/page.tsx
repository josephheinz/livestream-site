import { Banner } from "@/components/site/banner";
import { TickerTape } from "@/components/site/ticker-tape";
import { Footer } from "@/components/site/footer";
import { Player } from "@/components/watch/player";
import { StreamInfo } from "@/components/watch/stream-info";
import { ChatPanel, type ChatMode } from "@/components/watch/chat-panel";
import { stream, chatMessages, banNotice, tickerItems } from "@/lib/mock-data";

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
      <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <Player live={live} />
          <StreamInfo stream={{ ...stream, live }} />
        </div>
        <ChatPanel mode={chat} messages={chatMessages} ban={banNotice} live={live} viewers={stream.viewers} />
      </main>
      <TickerTape items={tickerItems} />
      <Footer />
    </div>
  );
}
