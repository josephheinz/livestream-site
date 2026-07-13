import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin, requireUser } from "./lib/auth";
import { isBanned } from "./lib/bans";

const MAX_BODY_CHARS = 500;
const RATE_LIMIT_MS = 2_000;
const LIST_LIMIT = 100;

export const list = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const messages: Doc<"chatMessages">[] = [];
    const newestFirst = ctx.db
      .query("chatMessages")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .order("desc");
    for await (const message of newestFirst) {
      if (message.removed) {
        continue; // soft-deleted by moderation (research D8)
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
        body: message.body,
        // author row may be gone after a Clerk user.deleted (research D11)
        authorName: author?.name ?? "Deleted user",
        authorImageUrl: author?.imageUrl,
      });
    }
    return result;
  },
});

export const send = mutation({
  args: { streamId: v.id("streams"), body: v.string() },
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
    const stream = await ctx.db.get(streamId);
    if (stream === null || stream.status !== "live") {
      throw new Error("Chat is only open while the stream is live");
    }
    // Rate limit (FR-014, research D5): one indexed read inside the transaction.
    const last = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_and_stream", (q) =>
        q.eq("userId", user._id).eq("streamId", streamId),
      )
      .order("desc")
      .first();
    if (last !== null && Date.now() - last._creationTime < RATE_LIMIT_MS) {
      throw new Error("Slow down — one message every 2 seconds");
    }
    return await ctx.db.insert("chatMessages", {
      streamId,
      userId: user._id,
      body: trimmed,
      removed: false,
    });
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
