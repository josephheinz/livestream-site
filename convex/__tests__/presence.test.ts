/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

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

test("anonymous heartbeats do not count as viewers", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(admin);

  await t.mutation(api.presence.heartbeat, { streamId, sessionId: "s1" });
  expect(await t.query(api.presence.count, { streamId })).toBe(0);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("presenceSessions").collect(),
  );
  expect(rows).toHaveLength(0);
});

test("one signed-in user owns one current presence session", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await seedStream(admin);

  await viewer.mutation(api.presence.heartbeat, { streamId, sessionId: "s1" });
  await viewer.mutation(api.presence.heartbeat, { streamId, sessionId: "s2" });
  expect(await t.query(api.presence.count, { streamId })).toBe(1);

  const rows = await t.run(async (ctx) =>
    ctx.db.query("presenceSessions").collect(),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].sessionId).toBe("s2");

  await viewer.mutation(api.presence.leave, { streamId, sessionId: "s1" });
  expect(await t.query(api.presence.count, { streamId })).toBe(1);

  await viewer.mutation(api.presence.leave, { streamId, sessionId: "s2" });
  expect(await t.query(api.presence.count, { streamId })).toBe(0);
});

test("count includes only sessions seen within 60s (research D4)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const freshViewer = await asUser(t, "fresh_viewer");
  const staleViewer = await asUser(t, "stale_viewer");
  const streamId = await seedStream(admin);

  await freshViewer.mutation(api.presence.heartbeat, { streamId, sessionId: "fresh" });
  await staleViewer.mutation(api.presence.heartbeat, { streamId, sessionId: "stale" });
  await t.run(async (ctx) => {
    const stale = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) =>
        q.eq("streamId", streamId).eq("sessionId", "stale"),
      )
      .unique();
    await ctx.db.patch(stale!._id, { lastSeen: Date.now() - 120_000 });
  });

  expect(await t.query(api.presence.count, { streamId })).toBe(1);

  // a heartbeat revives the stale session
  await staleViewer.mutation(api.presence.heartbeat, { streamId, sessionId: "stale" });
  expect(await t.query(api.presence.count, { streamId })).toBe(2);
});

test("purgeStalePresence cron deletes sessions stale >5 min", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const freshViewer = await asUser(t, "fresh_viewer");
  const ancientViewer = await asUser(t, "ancient_viewer");
  const streamId = await seedStream(admin);

  await freshViewer.mutation(api.presence.heartbeat, { streamId, sessionId: "fresh" });
  await ancientViewer.mutation(api.presence.heartbeat, { streamId, sessionId: "ancient" });
  await t.run(async (ctx) => {
    const ancient = await ctx.db
      .query("presenceSessions")
      .withIndex("by_session", (q) =>
        q.eq("streamId", streamId).eq("sessionId", "ancient"),
      )
      .unique();
    await ctx.db.patch(ancient!._id, { lastSeen: Date.now() - 10 * 60_000 });
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
  const viewer = await asUser(t);
  const streamId = await seedStream(admin);

  await viewer.mutation(api.presence.heartbeat, { streamId, sessionId: "s1" });
  await viewer.mutation(api.presence.leave, { streamId, sessionId: "s1" });
  expect(await t.query(api.presence.count, { streamId })).toBe(0);
  const rows = await t.run(async (ctx) =>
    ctx.db.query("presenceSessions").collect(),
  );
  expect(rows).toHaveLength(0);
});

test("heartbeat and count work with no streamId, even before any stream exists", async () => {
  const t = setup();
  const viewer = await asUser(t);

  // Zero streams: count is an honest 0, heartbeat bootstraps the channel row.
  expect(await t.query(api.presence.count, {})).toBe(0);
  await viewer.mutation(api.presence.heartbeat, { sessionId: "tab1" });
  expect(await t.query(api.presence.count, {})).toBe(1);

  await viewer.mutation(api.presence.heartbeat, { sessionId: "tab2" });
  expect(await t.query(api.presence.count, {})).toBe(1);

  await viewer.mutation(api.presence.leave, { sessionId: "tab2" });
  expect(await t.query(api.presence.count, {})).toBe(0);

  // Only one bootstrap row was created.
  const streams = await t.run(async (ctx) => ctx.db.query("streams").collect());
  expect(streams).toHaveLength(1);
});
