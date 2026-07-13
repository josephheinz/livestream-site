/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

async function seedLiveStream(
  admin: Awaited<ReturnType<typeof asAdmin>>,
): Promise<Id<"streams">> {
  const streamId = await admin.mutation(api.streams.create, {
    title: "Live show",
    scheduledStart: Date.now(),
  });
  await admin.mutation(api.streams.goLive, { streamId });
  return streamId;
}

test("send requires auth but works regardless of stream status", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  // Chat is always open: a scheduled (off-air) stream accepts messages too.
  const scheduledId = await admin.mutation(api.streams.create, {
    title: "Not yet",
    scheduledStart: Date.now() + 1_000_000,
  });
  await viewer.mutation(api.chat.send, { streamId: scheduledId, body: "early!" });
  expect(await t.query(api.chat.list, { streamId: scheduledId })).toHaveLength(1);

  const liveId = await seedLiveStream(admin);
  await expect(
    t.mutation(api.chat.send, { streamId: liveId, body: "anon" }),
  ).rejects.toThrow();

  await viewer.mutation(api.chat.send, { streamId: liveId, body: "hello" });
  const messages = await t.query(api.chat.list, { streamId: liveId });
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({ body: "hello", authorName: "Viewer" });
});

test("2s rate limit rejects a rapid second message", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);

  await viewer.mutation(api.chat.send, { streamId, body: "first" });
  await expect(
    viewer.mutation(api.chat.send, { streamId, body: "second" }),
  ).rejects.toThrow();
});

test("remove is admin-only and hides the message from list", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);

  await viewer.mutation(api.chat.send, { streamId, body: "rude thing" });
  const [message] = await t.query(api.chat.list, { streamId });

  await expect(
    viewer.mutation(api.chat.remove, { messageId: message._id }),
  ).rejects.toThrow();

  await admin.mutation(api.chat.remove, { messageId: message._id });
  expect(await t.query(api.chat.list, { streamId })).toHaveLength(0);
});

test("body validation: empty and >500 chars rejected", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);

  await expect(
    viewer.mutation(api.chat.send, { streamId, body: "" }),
  ).rejects.toThrow();
  await expect(
    viewer.mutation(api.chat.send, { streamId, body: "   " }),
  ).rejects.toThrow();
  await expect(
    viewer.mutation(api.chat.send, { streamId, body: "x".repeat(501) }),
  ).rejects.toThrow();
});

async function viewerId(t: ReturnType<typeof setup>): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", "user_viewer"))
      .unique();
    return user!._id;
  });
}

test("a banned user's send is rejected with the ban error; unbanning restores it", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);
  const id = await viewerId(t);

  await admin.mutation(api.bans.ban, { userId: id, reason: "spam" });
  await expect(
    viewer.mutation(api.chat.send, { streamId, body: "hello" }),
  ).rejects.toThrow("You are banned from chat");

  await admin.mutation(api.bans.unban, { userId: id });
  await viewer.mutation(api.chat.send, { streamId, body: "hello" });
  expect(await t.query(api.chat.list, { streamId })).toHaveLength(1);
});

test("an expired ban does not block sending", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);
  const id = await viewerId(t);

  await admin.mutation(api.bans.ban, {
    userId: id,
    reason: "temporary",
    expiresAt: Date.now() - 1_000,
  });
  await viewer.mutation(api.chat.send, { streamId, body: "still allowed" });
  expect(await t.query(api.chat.list, { streamId })).toHaveLength(1);
});

test("deleted author lists with the 'Deleted user' fallback (research D11)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t, "user_gone", "Ghost");
  const streamId = await seedLiveStream(admin);

  await viewer.mutation(api.chat.send, { streamId, body: "still here" });
  await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", "user_gone"))
      .unique();
    await ctx.db.delete(user!._id);
  });

  const [message] = await t.query(api.chat.list, { streamId });
  expect(message.body).toBe("still here");
  expect(message.authorName).toBe("Deleted user");
});
