import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/** Session-time upsert from the Clerk identity — gap-filler for missed webhooks (research D3). */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Must be signed in");
    }
    return await upsertByExternalId(ctx, {
      externalId: identity.subject,
      name: identity.name ?? "Anonymous",
      imageUrl: identity.pictureUrl,
      email: identity.email,
    });
  },
});

/** Clerk webhook: user.created / user.updated (convex/http.ts). */
export const upsertFromClerk = internalMutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertByExternalId(ctx, args);
  },
});

/** Clerk webhook: user.deleted — deletes the users row only; chat messages remain (research D11). */
export const deleteFromClerk = internalMutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (user !== null) {
      await ctx.db.delete(user._id);
    }
    return null;
  },
});

type UserAttributes = {
  externalId: string;
  name: string;
  imageUrl?: string;
  email?: string;
};

async function upsertByExternalId(ctx: MutationCtx, attrs: UserAttributes) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", attrs.externalId))
    .unique();
  if (existing !== null) {
    // patch never touches `role` — admin grants survive profile updates
    await ctx.db.patch(existing._id, attrs);
    return existing._id;
  }
  return await ctx.db.insert("users", attrs);
}
