"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Banner } from "@/components/site/banner";
import { TickerTape, tickerItemsFor } from "@/components/site/ticker-tape";
import { ConnectionStatus } from "@/components/site/connection-status";
import { Footer } from "@/components/site/footer";
import { DashboardBody } from "@/components/dashboard/dashboard-body";

// Admin-gated console (FR-002): non-admins and signed-out visitors get an
// access-denied state with no admin data rendered (US3-6).
export default function DashboardPage() {
  const me = useQuery(api.users.me);
  const live = useQuery(api.streams.getLive);
  const upcoming = useQuery(api.streams.listUpcoming);
  const isAdmin = me?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Banner live={live != null} />
      <main className="flex-1">
        {isAdmin ? (
          <DashboardBody />
        ) : (
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-5">
            <div className="border-2 border-border bg-card p-8 text-center shadow-brutal">
              <div className="font-display text-[28px] uppercase">Access Denied</div>
              <p className="mt-2 font-mono text-[12px] tracking-[.08em] text-muted-foreground">
                RESTRICTED — ADMIN CREDENTIALS REQUIRED
              </p>
            </div>
          </div>
        )}
      </main>
      <ConnectionStatus />
      <TickerTape items={tickerItemsFor(live, upcoming)} />
      <Footer />
    </div>
  );
}
