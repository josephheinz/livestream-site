import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

// Placeholder title for the bootstrap row on this single-channel site; the
// admin renames it from the dashboard.
const BOOTSTRAP_TITLE = "MAIN FEED";

/**
 * The stream the site treats as "now": live if any, else the next scheduled,
 * else the most recent ended one. Null only when no stream has ever existed.
 */
export async function resolveCurrent(ctx: QueryCtx): Promise<Doc<"streams"> | null> {
  const live = await ctx.db
    .query("streams")
    .withIndex("by_status", (q) => q.eq("status", "live"))
    .unique();
  if (live !== null) {
    return live;
  }
  const next = await ctx.db
    .query("streams")
    .withIndex("by_status", (q) => q.eq("status", "scheduled"))
    .order("asc")
    .first();
  if (next !== null) {
    return next;
  }
  return await ctx.db
    .query("streams")
    .withIndex("by_status", (q) => q.eq("status", "ended"))
    .order("desc")
    .first();
}

/**
 * Like resolveCurrent, but bootstraps the channel's single stream row when
 * none exists yet, so chat and presence always have a home.
 */
export async function ensureCurrent(ctx: MutationCtx): Promise<Doc<"streams">> {
  const current = await resolveCurrent(ctx);
  if (current !== null) {
    return current;
  }
  const id = await ctx.db.insert("streams", {
    title: BOOTSTRAP_TITLE,
    scheduledStart: Date.now(),
    status: "scheduled",
    visibility: "public",
  });
  return (await ctx.db.get(id))!;
}
