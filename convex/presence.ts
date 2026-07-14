import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { ensureCurrent, resolveCurrent } from "./lib/currentStream";

const FRESH_WINDOW_MS = 60_000;

// streamId is optional everywhere: presence follows the current stream so the
// online count works 100% of the time, on or off air.

export const count = query({
  args: { streamId: v.optional(v.id("streams")) },
  handler: async (ctx, { streamId }) => {
    const id = streamId ?? (await resolveCurrent(ctx))?._id;
    if (id === undefined) {
      return 0;
    }
    const cutoff = Date.now() - FRESH_WINDOW_MS;
    // ponytail: count-on-read is O(viewers) per subscriber; swap for
    // @convex-dev/presence or a sharded counter past ~1k concurrent (research D4)
    const fresh = await ctx.db
      .query("presenceSessions")
      .withIndex("by_stream_and_lastSeen", (q) =>
        q.eq("streamId", id).gt("lastSeen", cutoff),
      )
      .collect();
    const users = new Set(fresh.map(({ userId }) => userId));
    users.delete(undefined);
    return users.size;
  },
});

export const heartbeat = mutation({
  args: { streamId: v.optional(v.id("streams")), sessionId: v.string() },
  handler: async (ctx, { streamId, sessionId }) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }
    const id = streamId ?? (await ensureCurrent(ctx))._id;
    const sessions = await ctx.db
      .query("presenceSessions")
      .withIndex("by_streamId_and_userId", (q) =>
        q.eq("streamId", id).eq("userId", user._id),
      )
      .collect();
    const [session, ...duplicates] = sessions;
    for (const duplicate of duplicates) {
      await ctx.db.delete(duplicate._id);
    }
    if (session !== undefined) {
      await ctx.db.patch(session._id, {
        lastSeen: Date.now(),
        sessionId,
      });
    } else {
      await ctx.db.insert("presenceSessions", {
        streamId: id,
        sessionId,
        userId: user._id,
        lastSeen: Date.now(),
      });
    }
    return null;
  },
});

export const leave = mutation({
  args: { streamId: v.optional(v.id("streams")), sessionId: v.string() },
  handler: async (ctx, { streamId, sessionId }) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }
    const id = streamId ?? (await resolveCurrent(ctx))?._id;
    if (id === undefined) {
      return null;
    }
    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) =>
        q.eq("streamId", id).eq("sessionId", sessionId),
      )
      .unique();
    if (existing?.userId === user._id) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
