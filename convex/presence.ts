import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

const FRESH_WINDOW_MS = 60_000;

export const count = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const cutoff = Date.now() - FRESH_WINDOW_MS;
    // ponytail: count-on-read is O(viewers) per subscriber; swap for
    // @convex-dev/presence or a sharded counter past ~1k concurrent (research D4)
    const fresh = await ctx.db
      .query("presenceSessions")
      .withIndex("by_stream_and_lastSeen", (q) =>
        q.eq("streamId", streamId).gt("lastSeen", cutoff),
      )
      .collect();
    return fresh.length;
  },
});

export const heartbeat = mutation({
  args: { streamId: v.id("streams"), sessionId: v.string() },
  handler: async (ctx, { streamId, sessionId }) => {
    const user = await getCurrentUser(ctx); // anonymous viewers count too
    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) =>
        q.eq("streamId", streamId).eq("sessionId", sessionId),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
        userId: user?._id,
      });
    } else {
      await ctx.db.insert("presenceSessions", {
        streamId,
        sessionId,
        userId: user?._id,
        lastSeen: Date.now(),
      });
    }
    return null;
  },
});

export const leave = mutation({
  args: { streamId: v.id("streams"), sessionId: v.string() },
  handler: async (ctx, { streamId, sessionId }) => {
    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) =>
        q.eq("streamId", streamId).eq("sessionId", sessionId),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
