"use client";

import * as React from "react";
import { Pin } from "lucide-react";
import { Popover, Tooltip } from "radix-ui";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InputGroup } from "@/components/ui/input-group";
import { useAuthModal } from "@/components/site/auth-modal";
import { PollBanner } from "@/components/watch/poll-banner";

type ChatMessage = {
  _id: Id<"chatMessages">;
  _creationTime: number;
  body: string;
  authorName: string;
  userId: Id<"users">;
  removed: boolean;
};

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

// Quick-pick unicode set so the picker always has content even before any
// custom emojis are uploaded.
const UNICODE_EMOJIS = ["😀", "😂", "🔥", "❤️", "👍", "👏", "😮", "😢", "🎉", "💀"];

const TOKEN = /(:[a-zA-Z0-9_+-]+:)/g;
// Custom emojis embed as :name: tokens (research D6): known active ones render
// as inline images, unknown/deactivated ones fall back to literal text.
function renderBody(body: string, emojiUrls: Map<string, string>): React.ReactNode {
  return body.split(TOKEN).map((part, i) => {
    const match = /^:([a-zA-Z0-9_+-]+):$/.exec(part);
    const url = match ? emojiUrls.get(match[1]) : undefined;
    if (match && url !== undefined) {
      return (
        <Tooltip.Provider key={i} delayDuration={150} disableHoverableContent>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Convex-storage emoji URL */}
              <img
                src={url}
                alt={match[1]}
                className="inline-block h-[18px] w-[18px] align-text-bottom"
              />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={4}
                collisionPadding={8}
                className="pointer-events-none z-50 border-2 border-border bg-bar px-2 py-1 font-mono text-[11px] text-bar-ink shadow-brutal-sm"
              >
                {part}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function formatThousands(n: number): string {
  return n.toLocaleString("en-US");
}

// "jun 14" — the day-separator label.
function dayLabel(ts: number): string {
  return new Date(ts)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toLowerCase();
}
// "13:01" — 24-hour message timestamp.
function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Popover shown when a username in chat is clicked: name, account-creation
// date, and the user's full message history grouped by day. The profile query
// only runs while open (skip otherwise) so idle names cost nothing.
function UserNamePopover({
  userId,
  name,
  color,
  isAdmin,
  emojiUrls,
}: {
  userId: Id<"users">;
  name: string;
  color: string;
  isAdmin: boolean;
  emojiUrls: Map<string, string>;
}) {
  const [open, setOpen] = React.useState(false);
  const profile = useQuery(api.chat.userProfile, open ? { userId } : "skip");
  const ban = useMutation(api.bans.ban);
  const [banReason, setBanReason] = React.useState("");
  const [banning, setBanning] = React.useState(false);
  const [banned, setBanned] = React.useState(false);
  const [banError, setBanError] = React.useState<string | null>(null);

  const confirmBan = async () => {
    try {
      await ban({ userId, reason: banReason.trim() });
      setBanned(true);
      setBanning(false);
    } catch (error) {
      setBanError(error instanceof Error ? error.message : "Could not ban");
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="cursor-pointer font-sans text-[13px] font-bold hover:underline"
          style={{ color }}
        >
          {name}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 w-72 border-2 border-border bg-card text-foreground shadow-brutal"
        >
          <div className="border-b-2 border-border bg-bar px-3 py-2 text-bar-ink">
            <div className="font-display text-[13px] uppercase" style={{ color }}>
              {name}
            </div>
            <div className="font-mono text-[11px] text-bar-muted">
              {profile
                ? `joined ${dayLabel(profile.createdAt)} ${new Date(profile.createdAt).getFullYear()}`
                : "loading…"}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto bg-background px-3 py-2">
            {profile === undefined && (
              <div className="text-[12px] text-muted-foreground">Loading…</div>
            )}
            {profile === null && (
              <div className="text-[12px] text-muted-foreground">User not found.</div>
            )}
            {profile && profile.messages.length === 0 && (
              <div className="text-[12px] text-muted-foreground">No messages yet.</div>
            )}
            {profile &&
              profile.messages.map((m, i) => {
                const prev = profile.messages[i - 1];
                const showDay =
                  prev === undefined || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                return (
                  <React.Fragment key={m._id}>
                    {showDay && (
                      <div
                        role="separator"
                        aria-label={dayLabel(m.createdAt)}
                        className="my-1.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase"
                      >
                        <span aria-hidden="true" className="h-px flex-1 bg-border" />
                        <span>{dayLabel(m.createdAt)}</span>
                        <span aria-hidden="true" className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <div
                      className={`mb-1 text-[12px] leading-tight break-words ${m.removed ? "opacity-50" : ""}`}
                    >
                      <span className="font-mono text-muted-foreground">
                        {timeLabel(m.createdAt)}
                      </span>{" "}
                      <span className="font-bold" style={{ color }}>
                        {name}
                      </span>
                      <span className="text-muted-foreground">:</span>{" "}
                      {m.removed ? (
                        <>
                          <span className="text-muted-foreground line-through">
                            {renderBody(m.body, emojiUrls)}
                          </span>
                          <span className="ml-1 font-mono text-[10px] text-primary uppercase">
                            [removed]
                          </span>
                        </>
                      ) : (
                        renderBody(m.body, emojiUrls)
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
          </div>
          {isAdmin && (
            <div className="border-t-2 border-border bg-card p-2">
              {banned ? (
                <div className="font-mono text-[11px] text-primary uppercase">
                  ✓ user banned
                </div>
              ) : banning ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    autoFocus
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Ban reason (required)"
                    className="border-2 border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-primary"
                  />
                  {banError !== null && (
                    <div className="text-[11px] text-primary">{banError}</div>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={banReason.trim().length === 0}
                      onClick={confirmBan}
                      className="cursor-pointer border-2 border-primary bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground uppercase disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Confirm ban
                    </button>
                    <button
                      type="button"
                      onClick={() => setBanning(false)}
                      className="cursor-pointer border-2 border-border px-2 py-1 text-[11px] font-bold uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setBanning(true)}
                  className="w-full cursor-pointer border-2 border-primary bg-card px-2 py-1 text-[11px] font-bold text-primary uppercase hover:bg-primary hover:text-primary-foreground"
                >
                  Ban user
                </button>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Chat column: real history + live tail, Clerk-driven modes, custom-emoji
// picker, and ban feedback surfaced from the send error (research D5/D6).
// Chat is always open; it binds to streams.current on the page.
export function ChatPanel({
  streamId,
  viewers,
}: {
  streamId?: Id<"streams">;
  viewers: number;
}) {
  const { open } = useAuthModal();
  const { isSignedIn } = useAuth();
  const messages = (useQuery(api.chat.list, streamId ? { streamId } : "skip") ??
    []) as ChatMessage[];
  const emojis = useQuery(api.emojis.list) ?? [];
  const me = useQuery(api.users.me);
  const isAdmin = me?.role === "admin";
  const send = useMutation(api.chat.send);
  const removeMessage = useMutation(api.chat.remove);
  const pinned = useQuery(api.chat.pinned, streamId ? { streamId } : "skip");
  const pinMessage = useMutation(api.chat.pin);
  const unpinMessage = useMutation(api.chat.unpin);

  const [draft, setDraft] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [banned, setBanned] = React.useState(false);
  const [authExpired, setAuthExpired] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  // Keep the scroll pinned to the newest message, but don't yank the user
  // back down while they're reading history (scrolled up past the threshold).
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stickToBottom = React.useRef(true);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el !== null && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

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
    if (body.length === 0) {
      return;
    }
    try {
      // No streamId → the backend attaches to (or bootstraps) the current
      // stream, so sending always works.
      await send(streamId !== undefined ? { streamId, body } : { body });
      setDraft("");
      setSendError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // Exact ban string is the contract signal to show the banned notice (D5).
      if (message.includes("You are banned from chat")) {
        setBanned(true);
      } else if (message.includes("Must be signed in")) {
        // Mid-session auth expiry: revert to the signed-out prompt (spec edge case).
        setAuthExpired(true);
      } else {
        // Anything else (rate limit, stream just ended, …) surfaces inline
        // instead of silently eating the message.
        setSendError(message.replace(/^.*Uncaught Error:\s*/, "") || "Could not send — try again");
      }
    }
  };

  return (
    <div className="flex max-h-[70dvh] min-h-[320px] flex-col border-2 border-border bg-card shadow-brutal lg:max-h-none lg:min-h-0">
      <div className="flex flex-none items-center justify-between bg-bar px-3.5 py-[9px] text-bar-ink">
        <span className="font-display text-[13px] uppercase">Live Chat</span>
        <span className="font-mono text-[11px] text-bar-muted">[{formatThousands(viewers)} ONLINE]</span>
      </div>

      {!banned && <PollBanner streamId={streamId} />}

      {pinned != null && !banned && (
        <div className="flex flex-none items-start gap-2 border-b-2 border-border bg-card px-3.5 py-2 text-sm leading-tight">
          <Pin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground" />
          <div className="min-w-0 flex-1 break-words">
            <span
              className="font-sans text-[13px] font-bold"
              style={{ color: colorFor(pinned.authorName) }}
            >
              {pinned.authorName}
            </span>
            <span className="text-muted-foreground">:</span>{" "}
            {renderBody(pinned.body, emojiUrls)}
          </div>
          {isAdmin && streamId !== undefined && (
            <button
              type="button"
              aria-label="Unpin message"
              onClick={() => unpinMessage({ streamId })}
              className="cursor-pointer font-mono text-[11px] text-muted-foreground hover:text-primary"
            >
              ✕
            </button>
          )}
        </div>
      )}

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
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
          className="min-h-0 flex-1 overflow-y-auto bg-background px-3.5 py-3"
        >
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDay =
              prev === undefined ||
              dayLabel(prev._creationTime) !== dayLabel(m._creationTime);
            return (
            <React.Fragment key={m._id}>
              {showDay && (
                <div
                  role="separator"
                  aria-label={dayLabel(m._creationTime)}
                  className="my-2 flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase"
                >
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  <span>{dayLabel(m._creationTime)}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>
              )}
            <div
              className={`mb-[9px] text-sm leading-tight break-words ${m.removed ? "opacity-50" : ""}`}
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                {timeLabel(m._creationTime)}
              </span>{" "}
              <UserNamePopover
                userId={m.userId}
                name={m.authorName}
                color={colorFor(m.authorName)}
                isAdmin={isAdmin}
                emojiUrls={emojiUrls}
              />
              <span className="text-muted-foreground">:</span>{" "}
              {m.removed ? (
                <span className="text-muted-foreground line-through">
                  {renderBody(m.body, emojiUrls)}
                </span>
              ) : (
                renderBody(m.body, emojiUrls)
              )}
              {m.removed && (
                <span className="ml-1 font-mono text-[10px] text-primary uppercase">
                  [removed]
                </span>
              )}
              {isAdmin && !m.removed && (
                <>
                  <button
                    type="button"
                    aria-label="Pin message"
                    onClick={() => pinMessage({ messageId: m._id })}
                    className="ml-1.5 cursor-pointer text-muted-foreground hover:text-primary"
                  >
                    <Pin className="inline h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove message"
                    onClick={() => removeMessage({ messageId: m._id })}
                    className="ml-1.5 cursor-pointer font-mono text-[11px] text-muted-foreground hover:text-primary"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
            </React.Fragment>
            );
          })}
        </div>
      )}

      {signedIn && (
        <div className="flex-none">
          {pickerOpen && (
            <div className="flex flex-wrap gap-1.5 border-t border-border bg-card p-2">
              {UNICODE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`emoji ${emoji}`}
                  onClick={() => {
                    setDraft((d) => `${d}${emoji}`);
                    setPickerOpen(false);
                  }}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center text-lg"
                >
                  {emoji}
                </button>
              ))}
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
                    className="flex h-7 w-7 cursor-pointer items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Convex-storage emoji URL */}
                    <img src={emoji.imageUrl} alt={emoji.name} className="h-5 w-5" />
                  </button>
                ) : null,
              )}
            </div>
          )}
          {sendError !== null && (
            <div className="border-t border-border bg-card px-3 py-1.5 text-[12px] text-primary">
              {sendError}
            </div>
          )}
          <div className="flex items-stretch gap-px border-t border-border bg-border">
            <button
              type="button"
              aria-label="Emoji picker"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex cursor-pointer items-center bg-card px-3 text-lg text-foreground"
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
