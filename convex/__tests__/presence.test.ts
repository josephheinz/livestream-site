/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, setup } from "./test.helpers";

async function seedStream(
  admin: Awaited<ReturnType<typeof asAdmin>>,
): Promise<Id<"streams">> {
  const streamId = await admin.mutation(api.streams.create, {
    title: "Live show",
    scheduledStart: Date.now(),
  });
  await admin.mutation(api.streams.goLive, { streamId });
  return streamId;
}

test("heartbeat upserts by (streamId, sessionId)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(admin);

  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "s1" });
  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "s1" });
  expect(await t.query(api.presence.count, { streamId })).toBe(1);

  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "s2" });
  expect(await t.query(api.presence.count, { streamId })).toBe(2);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("presenceSessions").collect(),
  );
  expect(rows).toHaveLength(2);
});

test("count includes only sessions seen within 60s (research D4)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(admin);

  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "fresh" });
  await t.run(async (ctx) => {
    await ctx.db.insert("presenceSessions", {
      streamId,
      sessionId: "stale",
      lastSeen: Date.now() - 120_000,
    });
  });

  expect(await t.query(api.presence.count, { streamId })).toBe(1);

  // a heartbeat revives the stale session
  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "stale" });
  expect(await t.query(api.presence.count, { streamId })).toBe(2);
});

test("purgeStalePresence cron deletes sessions stale >5 min", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(admin);

  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "fresh" });
  await t.run(async (ctx) => {
    await ctx.db.insert("presenceSessions", {
      streamId,
      sessionId: "ancient",
      lastSeen: Date.now() - 10 * 60_000,
    });
  });

  await t.mutation(internal.crons.purgeStalePresence, {});
  const rows = await t.run(async (ctx) =>
    ctx.db.query("presenceSessions").collect(),
  );
  expect(rows.map((r) => r.sessionId)).toEqual(["fresh"]);
});

test("leave deletes the session", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(admin);

  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "s1" });
  await t.mutation(api.presence.leave, { streamId, sessionId: "s1" });
  expect(await t.query(api.presence.count, { streamId })).toBe(0);
  const rows = await t.run(async (ctx) =>
    ctx.db.query("presenceSessions").collect(),
  );
  expect(rows).toHaveLength(0);
});
