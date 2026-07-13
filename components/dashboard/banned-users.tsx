"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const cols = "grid grid-cols-[1.4fr_2fr_1.2fr_0.8fr]";

function formatExpiry(expiresAt?: number): string {
  if (expiresAt === undefined) return "PERMANENT";
  return new Date(expiresAt).toLocaleDateString("en-US");
}

// Wired to bans.list / bans.ban / bans.unban (FR-015). Bans identify the target
// by its users-row id; reason is required, expiry optional (contract).
export function BannedUsers() {
  const bans = useQuery(api.bans.list) ?? [];
  const ban = useMutation(api.bans.ban);
  const unban = useMutation(api.bans.unban);

  const [userId, setUserId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [expires, setExpires] = React.useState("");

  const add = () => {
    const uid = userId.trim();
    const r = reason.trim();
    if (!uid || !r) return; // reason (and target) required
    const expiresAt = expires ? new Date(expires).getTime() : undefined;
    void ban({ userId: uid as Id<"users">, reason: r, expiresAt });
    setUserId("");
    setReason("");
    setExpires("");
  };

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
        <div key={b._id} className={`${cols} items-center border-b border-border`}>
          <div className="px-3.5 py-2.5 font-mono text-[13px]">{b.userName}</div>
          <div className="px-3.5 py-2.5 text-[13px]">{b.reason}</div>
          <div className="px-3.5 py-2.5 font-mono text-[12px] text-muted-foreground">
            {formatExpiry(b.expiresAt)}
          </div>
          <div className="px-3.5 py-2">
            <button
              type="button"
              aria-label={`Unban ${b.userName}`}
              onClick={() => void unban({ userId: b.userId })}
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

      <div className="flex flex-wrap gap-2 border-t border-border p-3.5">
        <input
          aria-label="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="user id"
          className="min-w-[120px] flex-1 border border-border bg-input px-2.5 py-2 font-mono text-[13px] text-foreground outline-none"
        />
        <input
          aria-label="Ban reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="reason"
          className="min-w-[120px] flex-[2] border border-border bg-input px-2.5 py-2 font-sans text-[13px] text-foreground outline-none"
        />
        <input
          aria-label="Ban expiry"
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          className="border border-border bg-input px-2.5 py-2 font-mono text-[13px] text-foreground outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="cursor-pointer border border-border bg-primary px-4 py-2 font-sans text-[12px] font-bold text-primary-foreground uppercase shadow-[2px_2px_0_var(--shadow-color)] transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          Ban
        </button>
      </div>
    </div>
  );
}
