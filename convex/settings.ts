import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/auth";

const MAX_ANNOUNCEMENT_LENGTH = 280;
const audienceEffect = v.union(v.literal("confetti"), v.literal("imageRain"));

// ponytail: single settings row; add a key column if settings ever multiply.
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("settings").first();
  },
});

export const setTickerItems = mutation({
  args: { tickerItems: v.array(v.string()) },
  handler: async (ctx, { tickerItems }) => {
    await requireAdmin(ctx);
    const items = tickerItems.map((t) => t.trim()).filter((t) => t.length > 0);
    const existing = await ctx.db.query("settings").first();
    if (existing !== null) {
      await ctx.db.patch(existing._id, { tickerItems: items });
    } else {
      await ctx.db.insert("settings", { tickerItems: items });
    }
    return null;
  },
});

export const sendAnnouncement = mutation({
  args: { message: v.string() },
  handler: async (ctx, { message }) => {
    await requireAdmin(ctx);
    const trimmed = message.trim();
    if (trimmed.length === 0) throw new Error("Message is required");
    if (trimmed.length > MAX_ANNOUNCEMENT_LENGTH) {
      throw new Error(`Message must be ${MAX_ANNOUNCEMENT_LENGTH} characters or fewer`);
    }

    const existing = await ctx.db.query("settings").first();
    const announcement = { message: trimmed, sentAt: Date.now() };
    if (existing !== null) {
      await ctx.db.patch(existing._id, { announcement });
    } else {
      await ctx.db.insert("settings", { tickerItems: [], announcement });
    }
    return null;
  },
});

export const triggerAudienceEffect = mutation({
  args: { kind: audienceEffect },
  handler: async (ctx, { kind }) => {
    await requireAdmin(ctx);
    const effectId = await ctx.db.insert("audienceEffects", { kind, sentAt: Date.now() });
    await ctx.scheduler.runAfter(10_000, internal.settings.removeAudienceEffect, { effectId });
    return null;
  },
});

export const listAudienceEffects = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("audienceEffects").order("desc").take(100);
  },
});

export const removeAudienceEffect = internalMutation({
  args: { effectId: v.id("audienceEffects") },
  handler: async (ctx, { effectId }) => {
    await ctx.db.delete(effectId);
    return null;
  },
});
