import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

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
