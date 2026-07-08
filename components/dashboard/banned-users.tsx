"use client";

import * as React from "react";
import { bannedUsers, type BannedUser } from "@/lib/mock-data";

const cols = "grid grid-cols-[1.4fr_2fr_1.2fr_0.8fr]";

export function BannedUsers() {
  const [bans, setBans] = React.useState<BannedUser[]>(bannedUsers);
  return (
    <div className="border-2 border-border bg-card shadow-brutal">
      <div className="bg-bar px-3.5 py-[9px] font-display text-[13px] text-bar-ink uppercase">
        Banned Users
      </div>
      <div className={`${cols} border-b border-border font-mono text-[11px] tracking-[.08em] text-muted-foreground uppercase`}>
        <div className="px-3.5 py-2">User</div>
        <div className="px-3.5 py-2">Reason</div>
        <div className="px-3.5 py-2">Expires</div>
        <div className="px-3.5 py-2" />
      </div>
      {bans.map((b) => (
        <div key={b.id} className={`${cols} items-center border-b border-border`}>
          <div className="px-3.5 py-2.5 font-mono text-[13px]">{b.user}</div>
          <div className="px-3.5 py-2.5 text-[13px]">{b.reason}</div>
          <div className="px-3.5 py-2.5 font-mono text-[12px] text-muted-foreground">{b.expires}</div>
          <div className="px-3.5 py-2">
            <button
              type="button"
              aria-label={`Unban ${b.user}`}
              onClick={() => setBans((xs) => xs.filter((x) => x.id !== b.id))}
              className="cursor-pointer border border-border bg-card px-3 py-[5px] text-[11px] font-bold uppercase shadow-[2px_2px_0_var(--shadow-color)] transition-transform hover:-translate-x-px hover:-translate-y-px"
            >
              Unban
            </button>
          </div>
        </div>
      ))}
      {bans.length === 0 && (
        <div className="p-5 text-center text-sm text-muted-foreground">No active bans.</div>
      )}
    </div>
  );
}
