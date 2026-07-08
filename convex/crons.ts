import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const PRESENCE_STALE_MS = 5 * 60_000;
const REACTION_MAX_AGE_MS = 60 * 60_000;
const REACTION_PURGE_BATCH = 4_000;

export const purgeStalePresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENCE_STALE_MS;
    const stale = await ctx.db
      .query("presenceSessions")
      .withIndex("by_lastSeen", (q) => q.lt("lastSeen", cutoff))
      .collect();
    for (const session of stale) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});

export const purgeOldReactions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - REACTION_MAX_AGE_MS;
    // default order is ascending _creationTime → oldest first
    const batch = await ctx.db.query("reactions").take(REACTION_PURGE_BATCH);
    let deleted = 0;
    for (const reaction of batch) {
      if (reaction._creationTime < cutoff) {
        await ctx.db.delete(reaction._id);
        deleted++;
      }
    }
    if (deleted === REACTION_PURGE_BATCH) {
      // more old rows than one transaction should touch — continue in a follow-up
      await ctx.scheduler.runAfter(0, internal.crons.purgeOldReactions, {});
    }
    return null;
  },
});

const crons = cronJobs();
crons.interval(
  "purge stale presence sessions",
  { minutes: 5 },
  internal.crons.purgeStalePresence,
  {},
);
crons.interval(
  "purge old reactions",
  { hours: 1 },
  internal.crons.purgeOldReactions,
  {},
);
export default crons;
