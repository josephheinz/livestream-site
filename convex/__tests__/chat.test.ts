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

test("send requires auth and a live stream", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  const scheduledId = await admin.mutation(api.streams.create, {
    title: "Not yet",
    scheduledStart: Date.now() + 1_000_000,
  });
  await expect(
    viewer.mutation(api.chat.send, { streamId: scheduledId, body: "early!" }),
  ).rejects.toThrow();

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
