import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("customEmojis")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200);
    return await Promise.all(
      active.map(async (emoji) => ({
        _id: emoji._id,
        name: emoji.name,
        imageUrl: await ctx.storage.getUrl(emoji.storageId),
      })),
    );
  },
});

// Upload flow (research D10): generateUploadUrl → client POSTs the file → create
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: { name: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("customEmojis", { ...args, active: true });
  },
});

export const deactivate = mutation({
  args: { emojiId: v.id("customEmojis") },
  handler: async (ctx, { emojiId }) => {
    await requireAdmin(ctx);
    const emoji = await ctx.db.get(emojiId);
    if (emoji === null) {
      throw new Error("Emoji not found");
    }
    await ctx.db.patch(emojiId, { active: false });
    return null;
  },
});
