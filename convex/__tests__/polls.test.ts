import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import { asAdmin, asUser, setup } from "./test.helpers";

async function createPoll(t: ReturnType<typeof setup>) {
  const admin = await asAdmin(t);
  const pollId = await admin.mutation(api.polls.create, {
    question: "Best snack?",
    options: ["chips", "candy", "fruit"],
    durationMinutes: 5,
  });
  const streamId = await t.run(async (ctx) => {
    const poll = await ctx.db.get(pollId);
    return poll!.streamId;
  });
  return { admin, pollId, streamId };
}

describe("polls.create", () => {
  it("rejects non-admins", async () => {
    const t = setup();
    const user = await asUser(t);
    await expect(
      user.mutation(api.polls.create, {
        question: "q?",
        options: ["a", "b"],
        durationMinutes: 5,
      }),
    ).rejects.toThrow("Admin only");
  });

  it("rejects fewer than two options and empty options", async () => {
    const t = setup();
    const admin = await asAdmin(t);
    await expect(
      admin.mutation(api.polls.create, {
        question: "q?",
        options: ["only one"],
        durationMinutes: 5,
      }),
    ).rejects.toThrow("at least two options");
    await expect(
      admin.mutation(api.polls.create, {
        question: "q?",
        options: ["a", "  "],
        durationMinutes: 5,
      }),
    ).rejects.toThrow("Options cannot be empty");
  });

  it("creates a poll visible via polls.active with zeroed counts", async () => {
    const t = setup();
    const { streamId } = await createPoll(t);
    const poll = await t.query(api.polls.active, { streamId });
    expect(poll).toMatchObject({
      question: "Best snack?",
      options: ["chips", "candy", "fruit"],
      counts: [0, 0, 0],
      myVote: null,
    });
    expect(poll!.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe("polls.vote", () => {
  it("rejects anonymous voters", async () => {
    const t = setup();
    const { pollId } = await createPoll(t);
    await expect(
      t.mutation(api.polls.vote, { pollId, optionIndex: 0 }),
    ).rejects.toThrow("Must be signed in");
  });

  it("records one vote per user and bumps the count", async () => {
    const t = setup();
    const { pollId, streamId } = await createPoll(t);
    const user = await asUser(t);
    await user.mutation(api.polls.vote, { pollId, optionIndex: 1 });
    const poll = await user.query(api.polls.active, { streamId });
    expect(poll).toMatchObject({ counts: [0, 1, 0], myVote: 1 });
    await expect(
      user.mutation(api.polls.vote, { pollId, optionIndex: 2 }),
    ).rejects.toThrow("Already voted");
  });

  it("rejects out-of-range options", async () => {
    const t = setup();
    const { pollId } = await createPoll(t);
    const user = await asUser(t);
    await expect(
      user.mutation(api.polls.vote, { pollId, optionIndex: 3 }),
    ).rejects.toThrow("Invalid option");
  });

  it("rejects votes on an expired poll", async () => {
    const t = setup();
    const { pollId } = await createPoll(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(pollId, { expiresAt: Date.now() - 1 });
    });
    const user = await asUser(t);
    await expect(
      user.mutation(api.polls.vote, { pollId, optionIndex: 0 }),
    ).rejects.toThrow("Poll has ended");
  });

  it("rejects banned users", async () => {
    const t = setup();
    const { admin, pollId } = await createPoll(t);
    const user = await asUser(t);
    const userId = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", "user_viewer"))
        .unique();
      return row!._id;
    });
    await admin.mutation(api.bans.ban, { userId, reason: "spam" });
    await expect(
      user.mutation(api.polls.vote, { pollId, optionIndex: 0 }),
    ).rejects.toThrow("banned");
  });
});

describe("polls.active", () => {
  it("returns null once the poll has expired", async () => {
    const t = setup();
    const { pollId, streamId } = await createPoll(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(pollId, { expiresAt: Date.now() - 1 });
    });
    expect(await t.query(api.polls.active, { streamId })).toBeNull();
  });

  it("a newer poll supersedes the previous one", async () => {
    const t = setup();
    const { admin, streamId } = await createPoll(t);
    await admin.mutation(api.polls.create, {
      question: "Second poll?",
      options: ["yes", "no"],
      durationMinutes: 5,
    });
    const poll = await t.query(api.polls.active, { streamId });
    expect(poll?.question).toBe("Second poll?");
  });
});
