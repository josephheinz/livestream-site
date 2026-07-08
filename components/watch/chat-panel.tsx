"use client";

import type { ChatMessage, BanNotice } from "@/lib/mock-data";
import { formatThousands } from "@/lib/mock-data";
import { InputGroup } from "@/components/ui/input-group";
import { useAuthModal } from "@/components/site/auth-modal";

export type ChatMode = "signedin" | "signedout" | "banned";

// Chat column with three viewable states. Composer is inert (static shell).
export function ChatPanel({
  mode,
  messages,
  ban,
  live,
  viewers,
}: {
  mode: ChatMode;
  messages: ChatMessage[];
  ban: BanNotice;
  live: boolean;
  viewers: number;
}) {
  const { open } = useAuthModal();
  const banned = mode === "banned";
  const signedIn = mode === "signedin";

  return (
    <div className="flex min-h-[320px] flex-col border-2 border-border bg-card shadow-brutal lg:min-h-0">
      <div className="flex flex-none items-center justify-between bg-bar px-3.5 py-[9px] text-bar-ink">
        <span className="font-display text-[13px] uppercase">Live Chat</span>
        {live && (
          <span className="font-mono text-[11px] text-bar-muted">[{formatThousands(viewers)} ONLINE]</span>
        )}
      </div>

      {banned ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center p-4">
          <div className="border-2 border-primary bg-card p-4 shadow-brutal-sm">
            <div className="mb-2 font-display text-[13px] text-primary uppercase">
              ⚠ You are banned from chat
            </div>
            <p className="mb-2 text-sm leading-relaxed">
              <b>Reason:</b> {ban.reason}
            </p>
            <p className="text-sm leading-relaxed">
              <b>Expires:</b> {ban.expires}. Contact a moderator if you believe this is in error.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3.5 py-3">
          {messages.map((m) => (
            <div key={m.id} className="mb-[9px] text-sm leading-tight break-words">
              <span className="font-sans text-[13px] font-bold" style={{ color: m.color }}>
                {m.user}
              </span>
              <span className="text-muted-foreground">:</span> {m.text}
            </div>
          ))}
        </div>
      )}

      {signedIn && (
        <InputGroup className="flex-none" placeholder="Say something..." buttonLabel="Send" />
      )}
      {!signedIn && !banned && (
        <div className="flex-none border-t border-border bg-card p-3 text-center text-sm">
          <button type="button" onClick={open} className="cursor-pointer font-bold text-primary underline">
            Sign in to chat
          </button>
        </div>
      )}
    </div>
  );
}
