import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const RECENT_WINDOW_MS = 30_000;
const MAX_EMOJI_CHARS = 16;
const CUSTOM_PREFIX = "custom:";
// Any unicode emoji, no allowlist (research D6); this only keeps arbitrary
// text out of the reaction stream.
const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

export const recent = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    return await ctx.db
      .query("reactions")
      .withIndex("by_stream", (q) =>
        q.eq("streamId", streamId).gt("_creationTime", cutoff),
      )
      .take(500);
  },
});

export const send = mutation({
  args: { streamId: v.id("streams"), kind: v.string() },
  handler: async (ctx, { streamId, kind }) => {
    const user = await requireUser(ctx);
    const stream = await ctx.db.get(streamId);
    if (stream === null || stream.status !== "live") {
      throw new Error("Reactions are only open while the stream is live");
    }
    if (kind.startsWith(CUSTOM_PREFIX)) {
      const emojiId = ctx.db.normalizeId(
        "customEmojis",
        kind.slice(CUSTOM_PREFIX.length),
      );
      const emoji = emojiId === null ? null : await ctx.db.get(emojiId);
      if (emoji === null || !emoji.active) {
        throw new Error("Unknown or inactive custom emoji");
      }
    } else if (
      kind.length === 0 ||
      kind.length > MAX_EMOJI_CHARS ||
      !EMOJI_PATTERN.test(kind)
    ) {
      throw new Error("Reaction must be a single emoji");
    }
    await ctx.db.insert("reactions", { streamId, userId: user._id, kind });
    return null;
  },
});
