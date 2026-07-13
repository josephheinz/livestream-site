"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Banner } from "@/components/site/banner";
import { TickerTape, tickerItemsFor } from "@/components/site/ticker-tape";
import { ConnectionStatus } from "@/components/site/connection-status";
import { DashboardBody } from "@/components/dashboard/dashboard-body";

// Admin-gated console (FR-002): non-admins and signed-out visitors are
// redirected to the homepage with no admin data rendered (US3-6).
export default function DashboardPage() {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const live = useQuery(api.streams.getLive);
  const upcoming = useQuery(api.streams.listUpcoming);
  const settings = useQuery(api.settings.get);
  const isAdmin = me?.role === "admin";

  // `me` is undefined while loading; only redirect once it has resolved.
  useEffect(() => {
    if (me !== undefined && !isAdmin) {
      router.replace("/");
    }
  }, [me, isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Banner live={live != null} />
      <main className="flex-1">
        <DashboardBody />
      </main>
      <ConnectionStatus />
      <TickerTape items={tickerItemsFor(live, upcoming, settings?.tickerItems)} />
    </div>
  );
}
