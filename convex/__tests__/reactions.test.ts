/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

afterEach(() => {
  vi.useRealTimers();
});

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

async function seedCustomEmoji(
  t: ReturnType<typeof setup>,
  admin: Awaited<ReturnType<typeof asAdmin>>,
  name = "partyparrot",
): Promise<Id<"customEmojis">> {
  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob(["png-bytes"])),
  );
  return await admin.mutation(api.emojis.create, { name, storageId });
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
    viewer.mutation(api.reactions.send, { streamId: scheduledId, kind: "🎉" }),
  ).rejects.toThrow();

  const liveId = await seedLiveStream(admin);
  await expect(
    t.mutation(api.reactions.send, { streamId: liveId, kind: "🎉" }),
  ).rejects.toThrow();
});

test("unicode emoji kinds accepted; junk rejected", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);

  for (const kind of ["🎉", "👍🏽", "❤️"]) {
    await viewer.mutation(api.reactions.send, { streamId, kind });
  }
  const recent = await t.query(api.reactions.recent, { streamId });
  expect(recent.map((r) => r.kind).sort()).toEqual(["❤️", "🎉", "👍🏽"].sort());

  await expect(
    viewer.mutation(api.reactions.send, { streamId, kind: "not an emoji" }),
  ).rejects.toThrow();
  await expect(
    viewer.mutation(api.reactions.send, { streamId, kind: "🎉".repeat(10) }),
  ).rejects.toThrow();
});

test("custom kinds: active accepted, inactive/unknown rejected", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);
  const emojiId = await seedCustomEmoji(t, admin);

  await viewer.mutation(api.reactions.send, {
    streamId,
    kind: `custom:${emojiId}`,
  });

  await expect(
    viewer.mutation(api.reactions.send, { streamId, kind: "custom:garbage" }),
  ).rejects.toThrow();

  await admin.mutation(api.emojis.deactivate, { emojiId });
  await expect(
    viewer.mutation(api.reactions.send, {
      streamId,
      kind: `custom:${emojiId}`,
    }),
  ).rejects.toThrow();
});

test("purgeOldReactions cron deletes reactions older than 1h", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);

  await viewer.mutation(api.reactions.send, { streamId, kind: "🎉" });
  vi.setSystemTime(Date.now() + 2 * 60 * 60_000);
  await viewer.mutation(api.reactions.send, { streamId, kind: "🔥" });

  await t.mutation(internal.crons.purgeOldReactions, {});
  const rows = await t.run(async (ctx) => ctx.db.query("reactions").collect());
  expect(rows.map((r) => r.kind)).toEqual(["🔥"]);
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

test("a banned user's reaction send is rejected with the ban error; unbanning restores it", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);
  const id = await viewerId(t);

  await admin.mutation(api.bans.ban, { userId: id, reason: "spam" });
  await expect(
    viewer.mutation(api.reactions.send, { streamId, kind: "🎉" }),
  ).rejects.toThrow("You are banned from chat");

  await admin.mutation(api.bans.unban, { userId: id });
  await viewer.mutation(api.reactions.send, { streamId, kind: "🎉" });
  const recent = await t.query(api.reactions.recent, { streamId });
  expect(recent).toHaveLength(1);
});

test("recent returns only trailing-30s reactions", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedLiveStream(admin);

  await viewer.mutation(api.reactions.send, { streamId, kind: "🎉" });
  vi.setSystemTime(Date.now() + 60_000);
  await viewer.mutation(api.reactions.send, { streamId, kind: "🔥" });

  const recent = await t.query(api.reactions.recent, { streamId });
  expect(recent.map((r) => r.kind)).toEqual(["🔥"]);
});
