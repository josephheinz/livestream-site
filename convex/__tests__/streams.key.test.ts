/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import { asAdmin, asUser, setup } from "./test.helpers";

const OLD_KEY = "old_ingest_key_secret";

async function seedStream(
  t: ReturnType<typeof setup>,
  status: "scheduled" | "live" = "scheduled",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("streams", {
      title: "Key test stream",
      scheduledStart: Date.now(),
      status,
      visibility: "public",
      ingestKey: OLD_KEY,
      publishEpoch: 4,
    }),
  );
}

test("rotateIngestKey rejects non-admin callers", async () => {
  const t = setup();
  const viewer = await asUser(t);
  const streamId = await seedStream(t);

  await expect(
    viewer.mutation(api.streams.rotateIngestKey, { streamId }),
  ).rejects.toThrow("Admin only");
});

test("rotateIngestKey returns and stores a new key and bumps publishEpoch", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(t);

  const newKey = await admin.mutation(api.streams.rotateIngestKey, { streamId });
  const stored = await t.run(async (ctx) => ctx.db.get(streamId));

  expect(newKey).not.toBe(OLD_KEY);
  expect(stored!.ingestKey).toBe(newKey);
  expect(stored!.publishEpoch).toBe(5);
});

test("rotation revokes the old key and authorizes the new key", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedStream(t);
  const newKey = await admin.mutation(api.streams.rotateIngestKey, { streamId });
  const beforeOldAttempt = await t.run(async (ctx) => ctx.db.get(streamId));

  expect(
    await t.mutation(internal.streams.beginPublish, { streamKey: OLD_KEY }),
  ).toEqual({ ok: false });
  expect(await t.run(async (ctx) => ctx.db.get(streamId))).toEqual(
    beforeOldAttempt,
  );

  expect(
    await t.mutation(internal.streams.beginPublish, { streamKey: newKey }),
  ).toEqual({ ok: true });

  const armed = await t.run(async (ctx) => ctx.db.get(streamId));
  expect(armed).toMatchObject({
    status: "scheduled",
    ingestActive: true,
    publishEpoch: 6,
  });
  expect(armed!.actualStart).toBeUndefined();
  expect(armed!.liveUrl).toBeUndefined();
});

test("viewer-facing stream queries never leak ingestKey (SC-003)", async () => {
  const t = setup();
  const viewer = await asUser(t);
  const streamId = await seedStream(t, "live");

  for (const caller of [t, viewer]) {
    const results = [
      await caller.query(api.streams.getLive, {}),
      await caller.query(api.streams.current, {}),
      await caller.query(api.streams.get, { streamId }),
    ];

    for (const result of results) {
      expect(JSON.stringify(result)).not.toContain(OLD_KEY);
    }
  }
});
