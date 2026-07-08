// Static placeholder content for the design-system + shell screens.
// Nothing here is fetched or persisted — see data-model.md. Values mirror the
// prototype (Livestream Site v2.dc.html) so the shells read realistically.

export type Stream = {
  channelName: string;
  streamTitle: string;
  live: boolean;
  viewers: number;
  quality: string;
  channel: string;
  day: number;
  nextSlot: string;
};

export type ChatMessage = { id: string; user: string; color: string; text: string };

export type BanNotice = { reason: string; expires: string };

export type ExternalConnection = { id: string; platform: string; on: boolean; keyMasked: string };

export type BannedUser = { id: string; user: string; reason: string; expires: string };

export type TickerItem = { text: string; tone?: "primary" | "green" };

/** 1,204 — never a live drift in the static shell. */
export function formatThousands(n: number): string {
  return n.toLocaleString("en-US");
}

/** Keys are write-only; only ever rendered as dots (FR-018). */
export const MASKED_KEY = "•".repeat(10);

export const stream: Stream = {
  channelName: "NIGHTCHANNEL",
  streamTitle: "CHANNEL 01 — MAIN FEED",
  live: false,
  viewers: 1204,
  quality: "1080p",
  channel: "01",
  day: 115,
  nextSlot: "21:00 ET",
};

export const chatMessages: ChatMessage[] = [
  { id: "m1", user: "orb_watcher", color: "#4f8a68", text: "first" },
  { id: "m2", user: "nite_ops", color: "#b05b52", text: "quiet in here" },
  { id: "m3", user: "tapehead", color: "#4f8a68", text: "the set looks different today" },
  { id: "m4", user: "dial_tone", color: "#4a7ba6", text: "who else is up" },
  { id: "m5", user: "ch02lurker", color: "#4a7ba6", text: "turn it up" },
  { id: "m6", user: "VHSghost", color: "#a5824a", text: "welcome back everyone" },
];

export const banNotice: BanNotice = {
  reason: "Repeated off-topic flooding during broadcast.",
  expires: "2026-07-11, 00:00 ET",
};

export const externalConnections: ExternalConnection[] = [
  { id: "yt", platform: "YouTube", on: true, keyMasked: MASKED_KEY },
  { id: "tw", platform: "Twitch", on: false, keyMasked: MASKED_KEY },
];

export const bannedUsers: BannedUser[] = [
  { id: "b1", user: "floodbot_44", reason: "Spam / flooding chat", expires: "PERMANENT" },
  { id: "b2", user: "grief_er", reason: "Harassment of viewers", expires: "2026-07-14" },
  { id: "b3", user: "copypasta9", reason: "Repeated off-topic spam", expires: "2026-07-09" },
];

export const tickerItems: TickerItem[] = [
  { text: "▶ NEXT BROADCAST 21:00 ET" },
  { text: "● CH 01 MAIN FEED", tone: "primary" },
  { text: "MERCH DROP FRIDAY" },
  { text: "DAY 115" },
  { text: "SUBSCRIBE FOR GO-LIVE PING", tone: "green" },
  { text: "DON'T FEED THE ORBS" },
];
