"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InputGroup } from "@/components/ui/input-group";
import { useAuthModal } from "@/components/site/auth-modal";

type ChatMessage = { _id: string; body: string; authorName: string };

// Names carry no backend color; derive a stable one so usernames stay varied
// (mirrors the 002 palette).
const NAME_COLORS = ["#4f8a68", "#b05b52", "#4a7ba6", "#a5824a"];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

const TOKEN = /(:[a-zA-Z0-9_+-]+:)/g;
// Custom emojis embed as :name: tokens (research D6): known active ones render
// as inline images, unknown/deactivated ones fall back to literal text.
function renderBody(body: string, emojiUrls: Map<string, string>): React.ReactNode {
  return body.split(TOKEN).map((part, i) => {
    const match = /^:([a-zA-Z0-9_+-]+):$/.exec(part);
    const url = match ? emojiUrls.get(match[1]) : undefined;
    if (match && url !== undefined) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic Convex-storage emoji URL
        <img
          key={i}
          src={url}
          alt={match[1]}
          className="inline-block h-[18px] w-[18px] align-text-bottom"
        />
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function formatThousands(n: number): string {
  return n.toLocaleString("en-US");
}

// Chat column: real history + live tail, Clerk-driven modes, custom-emoji
// picker, and ban feedback surfaced from the send error (research D5/D6).
export function ChatPanel({
  streamId,
  live,
  viewers,
}: {
  streamId?: Id<"streams">;
  live: boolean;
  viewers: number;
}) {
  const { open } = useAuthModal();
  const { isSignedIn } = useAuth();
  const messages = (useQuery(api.chat.list, streamId ? { streamId } : "skip") ??
    []) as ChatMessage[];
  const emojis = useQuery(api.emojis.list) ?? [];
  const send = useMutation(api.chat.send);

  const [draft, setDraft] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [banned, setBanned] = React.useState(false);
  const [authExpired, setAuthExpired] = React.useState(false);

  // Bounded (≤200 active emojis); cheap to rebuild each render.
  const emojiUrls = new Map<string, string>();
  for (const emoji of emojis) {
    if (emoji.imageUrl !== null) {
      emojiUrls.set(emoji.name, emoji.imageUrl);
    }
  }

  const signedIn = Boolean(isSignedIn) && !authExpired && !banned;

  const handleSend = async (value: string) => {
    const body = value.trim();
    if (body.length === 0 || streamId === undefined) {
      return;
    }
    try {
      await send({ streamId, body });
      setDraft("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // Exact ban string is the contract signal to show the banned notice (D5).
      if (message.includes("You are banned from chat")) {
        setBanned(true);
      } else if (message.includes("Must be signed in")) {
        // Mid-session auth expiry: revert to the signed-out prompt (spec edge case).
        setAuthExpired(true);
      }
    }
  };

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
            <p className="text-sm leading-relaxed">
              You cannot participate in chat. Contact a moderator if you believe this is in error.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3.5 py-3">
          {messages.map((m) => (
            <div key={m._id} className="mb-[9px] text-sm leading-tight break-words">
              <span className="font-sans text-[13px] font-bold" style={{ color: colorFor(m.authorName) }}>
                {m.authorName}
              </span>
              <span className="text-muted-foreground">:</span> {renderBody(m.body, emojiUrls)}
            </div>
          ))}
        </div>
      )}

      {signedIn && (
        <div className="flex-none">
          {pickerOpen && emojis.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border bg-card p-2">
              {emojis.map((emoji) =>
                emoji.imageUrl !== null ? (
                  <button
                    key={emoji._id}
                    type="button"
                    aria-label={emoji.name}
                    onClick={() => {
                      setDraft((d) => `${d}:${emoji.name}:`);
                      setPickerOpen(false);
                    }}
                    className="flex h-7 w-7 items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Convex-storage emoji URL */}
                    <img src={emoji.imageUrl} alt={emoji.name} className="h-5 w-5" />
                  </button>
                ) : null,
              )}
            </div>
          )}
          <div className="flex items-stretch gap-px border-t border-border bg-border">
            <button
              type="button"
              aria-label="Emoji picker"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center bg-card px-3 text-lg text-foreground"
            >
              ☺
            </button>
            <div className="min-w-0 flex-1">
              <InputGroup
                placeholder="Say something..."
                buttonLabel="Send"
                value={draft}
                onChange={setDraft}
                onSubmit={handleSend}
              />
            </div>
          </div>
        </div>
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
