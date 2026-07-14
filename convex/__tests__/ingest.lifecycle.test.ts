/// <reference types="vite/client" />
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

const GRACE_MS = 30_000;
const HLS_BASE = "http://media.internal:8000";

beforeEach(() => {
  vi.stubEnv("MEDIA_SERVER_HLS_BASE", HLS_BASE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function createStream(t: ReturnType<typeof setup>) {
  const admin = await asAdmin(t);
  const streamId = await admin.mutation(api.streams.create, {
    title: "Test stream",
    scheduledStart: Date.now(),
  });
  const stream = await t.run(async (ctx) => ctx.db.get(streamId));
  return { admin, streamId, stream: stream! };
}

async function readStream(t: ReturnType<typeof setup>, streamId: Id<"streams">) {
  return (await t.run(async (ctx) => ctx.db.get(streamId)))!;
}

test("create generates and stores a non-empty ingest key", async () => {
  const t = setup();
  const { stream } = await createStream(t);

  expect(stream.ingestKey).toEqual(expect.any(String));
  expect(stream.ingestKey).not.toHaveLength(0);
});

test("beginPublish arms a keyed scheduled stream and bumps its epoch", async () => {
  const t = setup();
  const { streamId, stream } = await createStream(t);

  await expect(
    t.mutation(internal.streams.beginPublish, { streamKey: stream.ingestKey! }),
  ).resolves.toEqual({ ok: true });

  const armed = await readStream(t, streamId);
  expect(armed).toMatchObject({
    status: "scheduled",
    publishEpoch: 1,
  });
  expect(armed).toHaveProperty("ingestActive", true);
  expect(armed).not.toHaveProperty("liveUrl");
  expect(armed).not.toHaveProperty("actualStart");
});

test("goLive after arming derives the live URL", async () => {
  const t = setup();
  const { admin, streamId, stream } = await createStream(t);
  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });

  await admin.mutation(api.streams.goLive, { streamId });

  const live = await readStream(t, streamId);
  expect(live).toMatchObject({
    status: "live",
    liveUrl: `${HLS_BASE}/live/${stream.ingestKey}/index.m3u8`,
    publishEpoch: 2,
  });
  expect(live.actualStart).toEqual(expect.any(Number));
});

test("goLive rejects without an active ingest", async () => {
  const t = setup();
  const { admin, streamId } = await createStream(t);

  await expect(
    admin.mutation(api.streams.goLive, { streamId }),
  ).rejects.toThrow("No active ingest");
});

test("endPublish disarms and finalizes a live stream after the grace period", async () => {
  vi.useFakeTimers();
  const t = setup();
  const { admin, streamId, stream } = await createStream(t);
  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });
  await admin.mutation(api.streams.goLive, { streamId });

  await t.mutation(internal.streams.endPublish, {
    streamKey: stream.ingestKey!,
  });
  expect(await readStream(t, streamId)).toHaveProperty("ingestActive", false);
  vi.advanceTimersByTime(GRACE_MS - 1);
  await t.finishInProgressScheduledFunctions();
  expect((await readStream(t, streamId)).status).toBe("live");

  vi.advanceTimersByTime(1);
  await t.finishInProgressScheduledFunctions();
  const ended = await readStream(t, streamId);
  expect(ended.status).toBe("ended");
  expect(ended.actualEnd).toEqual(expect.any(Number));
});

test("a reconnect bumps the epoch so a pending publish-end finalizer is a no-op", async () => {
  vi.useFakeTimers();
  const t = setup();
  const { admin, streamId, stream } = await createStream(t);
  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });
  await admin.mutation(api.streams.goLive, { streamId });
  await t.mutation(internal.streams.endPublish, {
    streamKey: stream.ingestKey!,
  });

  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });
  expect(await readStream(t, streamId)).toMatchObject({
    status: "live",
    publishEpoch: 3,
  });
  expect(await readStream(t, streamId)).toHaveProperty("ingestActive", true);

  vi.advanceTimersByTime(GRACE_MS);
  await t.finishInProgressScheduledFunctions();
  expect(await readStream(t, streamId)).toMatchObject({
    status: "live",
    publishEpoch: 3,
  });
});

test("manual end bumps the publish epoch", async () => {
  const t = setup();
  const { admin, streamId, stream } = await createStream(t);

  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });
  await admin.mutation(api.streams.goLive, { streamId });
  await admin.mutation(api.streams.end, { streamId });
  expect(await readStream(t, streamId)).toMatchObject({
    status: "ended",
    publishEpoch: 3,
  });
});

test("attachRecording succeeds after publish-end finalization", async () => {
  vi.useFakeTimers();
  const t = setup();
  const { admin, streamId, stream } = await createStream(t);
  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });
  await admin.mutation(api.streams.goLive, { streamId });
  await t.mutation(internal.streams.endPublish, {
    streamKey: stream.ingestKey!,
  });
  vi.advanceTimersByTime(GRACE_MS);
  await t.finishInProgressScheduledFunctions();

  await expect(
    admin.mutation(api.streams.attachRecording, {
      streamId,
      recordingUrl: "http://media.internal/recordings/test.m3u8",
    }),
  ).resolves.toBeNull();
  expect((await readStream(t, streamId)).recordingUrl).toBe(
    "http://media.internal/recordings/test.m3u8",
  );
});

test("revealIngestKey returns the key to admins and rejects non-admins", async () => {
  const t = setup();
  const viewer = await asUser(t);
  const { admin, streamId, stream } = await createStream(t);

  await expect(
    admin.query(api.streams.revealIngestKey, { streamId }),
  ).resolves.toBe(stream.ingestKey);
  await expect(
    viewer.query(api.streams.revealIngestKey, { streamId }),
  ).rejects.toThrow("Admin only");
});

test("getLive, current, and get hide ingest metadata from non-admins but retain it for admins", async () => {
  const t = setup();
  const viewer = await asUser(t);
  const { admin, streamId, stream } = await createStream(t);
  await t.mutation(internal.streams.beginPublish, {
    streamKey: stream.ingestKey!,
  });
  await admin.mutation(api.streams.goLive, { streamId });

  for (const value of [
    await t.query(api.streams.getLive, {}),
    await t.query(api.streams.current, {}),
    await t.query(api.streams.get, { streamId }),
    await viewer.query(api.streams.getLive, {}),
    await viewer.query(api.streams.current, {}),
    await viewer.query(api.streams.get, { streamId }),
  ]) {
    expect(value).not.toHaveProperty("ingestKey");
    expect(value).not.toHaveProperty("publishEpoch");
    expect(value).not.toHaveProperty("ingestActive");
  }

  for (const value of [
    await admin.query(api.streams.getLive, {}),
    await admin.query(api.streams.current, {}),
    await admin.query(api.streams.get, { streamId }),
  ]) {
    expect(value).toHaveProperty("ingestKey", stream.ingestKey);
    expect(value).toHaveProperty("publishEpoch", 2);
    expect(value).toHaveProperty("ingestActive", true);
  }
});
