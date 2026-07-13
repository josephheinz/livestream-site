import { Banner } from "@/components/site/banner";
import { TickerTape } from "@/components/site/ticker-tape";
import { Footer } from "@/components/site/footer";
import { DashboardBody } from "@/components/dashboard/dashboard-body";
import { tickerItems } from "@/lib/mock-data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const live = (Array.isArray(sp.live) ? sp.live[0] : sp.live) === "1";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Banner live={live} />
      <main className="flex-1">
        <DashboardBody initialLive={live} />
      </main>
      <TickerTape items={tickerItems} />
      <Footer />
    </div>
  );
}
