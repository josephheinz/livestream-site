import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, requireAdmin, requireUser } from "./lib/auth";
import { ensureCurrent } from "./lib/currentStream";
import { isBanned } from "./lib/bans";

const MAX_BODY_CHARS = 500;
const RATE_LIMIT_MS = 2_000;
const LIST_LIMIT = 50;

export const list = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    // Admins see soft-deleted messages (flagged) for moderation; everyone else
    // gets them hidden (research D8).
    const viewer = await getCurrentUser(ctx);
    const isAdmin = viewer?.role === "admin";
    const messages: Doc<"chatMessages">[] = [];
    const newestFirst = ctx.db
      .query("chatMessages")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .order("desc");
    for await (const message of newestFirst) {
      if (message.removed && !isAdmin) {
        continue;
      }
      messages.push(message);
      if (messages.length >= LIST_LIMIT) {
        break;
      }
    }
    messages.reverse(); // oldest → newest

    const authors = new Map<string, Doc<"users"> | null>();
    const result = [];
    for (const message of messages) {
      if (!authors.has(message.userId)) {
        authors.set(message.userId, await ctx.db.get(message.userId));
      }
      const author = authors.get(message.userId) ?? null;
      result.push({
        _id: message._id,
        _creationTime: message._creationTime,
        streamId: message.streamId,
        userId: message.userId,
        body: message.body,
        removed: message.removed, // always false for non-admins (filtered above)
        // author row may be gone after a Clerk user.deleted (research D11)
        authorName: author?.name ?? "Deleted user",
        authorImageUrl: author?.imageUrl,
      });
    }
    return result;
  },
});

// Powers the click-a-name popover: the user's profile plus their full chat
// history (across all streams), oldest → newest for day-grouped display.
export const userProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user === null) {
      return null;
    }
    // Admins see removed messages (flagged); everyone else gets them hidden.
    const viewer = await getCurrentUser(ctx);
    const isAdmin = viewer?.role === "admin";
    // Bounded to one user's messages via the existing index; collect + sort is
    // fine at this scale. ponytail: cap at 500 if a single user ever floods.
    const rows = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_and_stream", (q) => q.eq("userId", userId))
      .collect();
    const messages = rows
      .filter((m) => isAdmin || !m.removed)
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((m) => ({
        _id: m._id,
        body: m.body,
        createdAt: m._creationTime,
        removed: m.removed,
      }));
    return { name: user.name, createdAt: user._creationTime, messages };
  },
});

export const send = mutation({
  // streamId is optional: chat is always open, and when omitted the message
  // attaches to the current stream (bootstrapped if none exists yet).
  args: { streamId: v.optional(v.id("streams")), body: v.string() },
  handler: async (ctx, { streamId, body }) => {
    const user = await requireUser(ctx);
    if (await isBanned(ctx, user._id)) {
      throw new Error("You are banned from chat");
    }
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      throw new Error("Message is empty");
    }
    if (trimmed.length > MAX_BODY_CHARS) {
      throw new Error(`Message exceeds ${MAX_BODY_CHARS} characters`);
    }
    let stream;
    if (streamId !== undefined) {
      stream = await ctx.db.get(streamId);
      if (stream === null) {
        throw new Error("Stream not found");
      }
    } else {
      stream = await ensureCurrent(ctx);
    }
    // Rate limit (FR-014, research D5): one indexed read inside the transaction.
    const last = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_and_stream", (q) =>
        q.eq("userId", user._id).eq("streamId", stream._id),
      )
      .order("desc")
      .first();
    if (last !== null && Date.now() - last._creationTime < RATE_LIMIT_MS) {
      throw new Error("Slow down — one message every 2 seconds");
    }
    return await ctx.db.insert("chatMessages", {
      streamId: stream._id,
      userId: user._id,
      body: trimmed,
      removed: false,
    });
  },
});

// Pinned message shown in the banner above chat. Returns null when nothing is
// pinned or the pinned message was since removed (no cross-table sync needed).
export const pinned = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const stream = await ctx.db.get(streamId);
    if (stream?.pinnedMessageId === undefined) {
      return null;
    }
    const message = await ctx.db.get(stream.pinnedMessageId);
    if (message === null || message.removed) {
      return null;
    }
    const author = await ctx.db.get(message.userId);
    return {
      _id: message._id,
      body: message.body,
      authorName: author?.name ?? "Deleted user",
    };
  },
});

export const pin = mutation({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, { messageId }) => {
    await requireAdmin(ctx);
    const message = await ctx.db.get(messageId);
    if (message === null || message.removed) {
      throw new Error("Message not found");
    }
    await ctx.db.patch(message.streamId, { pinnedMessageId: messageId });
    return null;
  },
});

export const unpin = mutation({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(streamId, { pinnedMessageId: undefined });
    return null;
  },
});

export const remove = mutation({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, { messageId }) => {
    await requireAdmin(ctx);
    const message = await ctx.db.get(messageId);
    if (message === null) {
      throw new Error("Message not found");
    }
    await ctx.db.patch(messageId, { removed: true });
    return null;
  },
});
