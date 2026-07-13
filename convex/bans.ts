import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const LIST_LIMIT = 200;

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const rows = await ctx.db.query("bans").take(LIST_LIMIT);
    const active = rows.filter(
      (ban) => ban.expiresAt === undefined || ban.expiresAt > now,
    );
    return await Promise.all(
      active.map(async (ban) => {
        const user = await ctx.db.get(ban.userId);
        return {
          _id: ban._id,
          userId: ban.userId,
          // author row may be gone after a Clerk user.deleted (parity with chat.list)
          userName: user?.name ?? "Deleted user",
          reason: ban.reason,
          expiresAt: ban.expiresAt,
        };
      }),
    );
  },
});

export const ban = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { userId, reason, expiresAt }) => {
    const admin = await requireAdmin(ctx);
    if (reason.trim().length === 0) {
      throw new Error("Ban reason is required");
    }
    const target = await ctx.db.get(userId);
    if (target === null) {
      throw new Error("User not found");
    }
    const existing = await ctx.db
      .query("bans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Update in place — no stacking (contract convex-functions.md).
    if (existing !== null) {
      await ctx.db.patch(existing._id, { reason, expiresAt, createdBy: admin._id });
      return existing._id;
    }
    return await ctx.db.insert("bans", {
      userId,
      reason,
      expiresAt,
      createdBy: admin._id,
    });
  },
});

export const unban = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("bans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
