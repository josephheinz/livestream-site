import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAdmin, requireUser } from "./lib/auth";
import { ensureCurrent } from "./lib/currentStream";
import { isBanned } from "./lib/bans";

const MAX_QUESTION_CHARS = 200;
const MAX_OPTION_CHARS = 100;

export const create = mutation({
  // Attaches to the current stream (bootstrapped if none), same as chat.send.
  // Creating a new poll supersedes any earlier one: `active` only ever returns
  // the latest.
  args: {
    question: v.string(),
    options: v.array(v.string()),
    durationMinutes: v.number(),
  },
  handler: async (ctx, { question, options, durationMinutes }) => {
    await requireAdmin(ctx);
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0) {
      throw new Error("Question is empty");
    }
    if (trimmedQuestion.length > MAX_QUESTION_CHARS) {
      throw new Error(`Question exceeds ${MAX_QUESTION_CHARS} characters`);
    }
    const trimmedOptions = options.map((o) => o.trim());
    if (trimmedOptions.length < 2) {
      throw new Error("A poll needs at least two options");
    }
    if (trimmedOptions.some((o) => o.length === 0)) {
      throw new Error("Options cannot be empty");
    }
    if (trimmedOptions.some((o) => o.length > MAX_OPTION_CHARS)) {
      throw new Error(`Options exceed ${MAX_OPTION_CHARS} characters`);
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new Error("Duration must be positive");
    }
    const stream = await ensureCurrent(ctx);
    return await ctx.db.insert("polls", {
      streamId: stream._id,
      question: trimmedQuestion,
      options: trimmedOptions,
      counts: trimmedOptions.map(() => 0),
      expiresAt: Date.now() + durationMinutes * 60_000,
    });
  },
});

// The poll pinned above chat: the stream's latest poll while it hasn't
// expired, with the viewer's own vote (null when anonymous or not voted).
// Expiry won't re-fire this query on its own; the client hides it on a timer.
export const active = query({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const poll = await ctx.db
      .query("polls")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .order("desc")
      .first();
    if (poll === null || poll.expiresAt <= Date.now()) {
      return null;
    }
    const viewer = await getCurrentUser(ctx);
    let myVote: number | null = null;
    if (viewer !== null) {
      const existing = await ctx.db
        .query("pollVotes")
        .withIndex("by_poll_and_user", (q) =>
          q.eq("pollId", poll._id).eq("userId", viewer._id),
        )
        .unique();
      myVote = existing?.optionIndex ?? null;
    }
    return {
      _id: poll._id,
      question: poll.question,
      options: poll.options,
      counts: poll.counts,
      expiresAt: poll.expiresAt,
      myVote,
    };
  },
});

export const vote = mutation({
  args: { pollId: v.id("polls"), optionIndex: v.number() },
  handler: async (ctx, { pollId, optionIndex }) => {
    const user = await requireUser(ctx);
    if (await isBanned(ctx, user._id)) {
      throw new Error("You are banned from chat");
    }
    const poll = await ctx.db.get(pollId);
    if (poll === null) {
      throw new Error("Poll not found");
    }
    if (poll.expiresAt <= Date.now()) {
      throw new Error("Poll has ended");
    }
    if (
      !Number.isInteger(optionIndex) ||
      optionIndex < 0 ||
      optionIndex >= poll.options.length
    ) {
      throw new Error("Invalid option");
    }
    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll_and_user", (q) =>
        q.eq("pollId", pollId).eq("userId", user._id),
      )
      .unique();
    if (existing !== null) {
      throw new Error("Already voted");
    }
    await ctx.db.insert("pollVotes", { pollId, userId: user._id, optionIndex });
    // ponytail: every vote patches the poll doc — OCC contention ceiling at
    // very high vote rates; shard counters if that ever matters.
    const counts = [...poll.counts];
    counts[optionIndex] += 1;
    await ctx.db.patch(pollId, { counts });
    return null;
  },
});
