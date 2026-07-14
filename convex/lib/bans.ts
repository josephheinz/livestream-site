import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Active = a ban row exists and it has not expired (research D2). Expiry is
 * checked at enforce time, so no cron is needed to sweep stale rows.
 */
export async function isBanned(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const ban = await ctx.db
    .query("bans")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (ban === null) {
    return false;
  }
  return ban.expiresAt === undefined || ban.expiresAt > Date.now();
}
