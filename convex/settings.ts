import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const MAX_ANNOUNCEMENT_LENGTH = 280;

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
