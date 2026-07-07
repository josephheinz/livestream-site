/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

const ORIGIN_RECORDING_URL =
  "http://nms.internal:8000/recordings/SECRET_KEY/2026-07-07.m3u8";

async function seedVod(
  admin: Awaited<ReturnType<typeof asAdmin>>,
  withRecording = true,
): Promise<Id<"streams">> {
  const streamId = await admin.mutation(api.streams.create, {
    title: "Archived show",
    scheduledStart: Date.now(),
  });
  await admin.mutation(api.streams.goLive, { streamId });
  await admin.mutation(api.streams.end, { streamId });
  if (withRecording) {
    await admin.mutation(api.streams.attachRecording, {
      streamId,
      recordingUrl: ORIGIN_RECORDING_URL,
    });
  }
  return streamId;
}

test("create requires auth and an archived public source", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const vodId = await seedVod(admin);

  await expect(
    t.mutation(api.clips.create, { streamId: vodId, start: 0, end: 10 }),
  ).rejects.toThrow();

  const noRecordingId = await seedVod(admin, false);
  await expect(
    viewer.mutation(api.clips.create, { streamId: noRecordingId, start: 0, end: 10 }),
  ).rejects.toThrow();

  await admin.mutation(api.streams.setVisibility, {
    streamId: vodId,
    visibility: "private",
  });
  await expect(
    viewer.mutation(api.clips.create, { streamId: vodId, start: 0, end: 10 }),
  ).rejects.toThrow();

  await admin.mutation(api.streams.setVisibility, {
    streamId: vodId,
    visibility: "public",
  });
  const clipId = await viewer.mutation(api.clips.create, {
    streamId: vodId,
    start: 5,
    end: 20,
    title: "nice moment",
  });
  expect(await viewer.query(api.clips.get, { clipId })).toMatchObject({
    start: 5,
    end: 20,
    title: "nice moment",
  });
});

test("create rejects bad bounds and long titles", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const vodId = await seedVod(admin);

  await expect(
    viewer.mutation(api.clips.create, { streamId: vodId, start: 0, end: 15.5 }),
  ).rejects.toThrow(); // >15s
  await expect(
    viewer.mutation(api.clips.create, { streamId: vodId, start: 10, end: 5 }),
  ).rejects.toThrow(); // inverted
  await expect(
    viewer.mutation(api.clips.create, { streamId: vodId, start: 5, end: 5 }),
  ).rejects.toThrow(); // empty
  await expect(
    viewer.mutation(api.clips.create, {
      streamId: vodId,
      start: 0,
      end: 10,
      title: "x".repeat(101),
    }),
  ).rejects.toThrow(); // title too long
});

test("clips of private VODs hidden from non-admins, restored on re-publicize", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const vodId = await seedVod(admin);
  const clipId = await viewer.mutation(api.clips.create, {
    streamId: vodId,
    start: 0,
    end: 10,
  });

  await admin.mutation(api.streams.setVisibility, {
    streamId: vodId,
    visibility: "private",
  });
  expect(await viewer.query(api.clips.list, { streamId: vodId })).toEqual([]);
  expect(await viewer.query(api.clips.get, { clipId })).toBeNull();
  expect(await t.query(api.clips.get, { clipId })).toBeNull();
  expect(await admin.query(api.clips.list, { streamId: vodId })).toHaveLength(1);
  expect(await admin.query(api.clips.get, { clipId })).not.toBeNull();

  await admin.mutation(api.streams.setVisibility, {
    streamId: vodId,
    visibility: "public",
  });
  expect(await viewer.query(api.clips.list, { streamId: vodId })).toHaveLength(1);
  expect(await t.query(api.clips.get, { clipId })).not.toBeNull();
});

test("clip payloads carry proxy paths, never origin URLs (SC-009)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const vodId = await seedVod(admin);
  const clipId = await viewer.mutation(api.clips.create, {
    streamId: vodId,
    start: 0,
    end: 10,
  });

  const anonClip = await t.query(api.clips.get, { clipId });
  expect(anonClip!.sourceUrl).toBe(`/stream/vod/${vodId}.m3u8`);
  expect(JSON.stringify(anonClip)).not.toContain("nms.internal");
  const [listed] = await t.query(api.clips.list, { streamId: vodId });
  expect(JSON.stringify(listed)).not.toContain("SECRET_KEY");

  const adminClip = await admin.query(api.clips.get, { clipId });
  expect(adminClip!.sourceUrl).toBe(ORIGIN_RECORDING_URL);
});

test("remove allowed for creator and admin only", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const creator = await asUser(t, "user_creator", "Creator");
  const other = await asUser(t, "user_other", "Other");
  const vodId = await seedVod(admin);

  const clipA = await creator.mutation(api.clips.create, {
    streamId: vodId,
    start: 0,
    end: 10,
  });
  const clipB = await creator.mutation(api.clips.create, {
    streamId: vodId,
    start: 20,
    end: 30,
  });

  await expect(
    other.mutation(api.clips.remove, { clipId: clipA }),
  ).rejects.toThrow();

  await creator.mutation(api.clips.remove, { clipId: clipA });
  await admin.mutation(api.clips.remove, { clipId: clipB });
  expect(await t.query(api.clips.list, { streamId: vodId })).toEqual([]);
});

test("mine returns the caller's clips, newest first", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const creator = await asUser(t, "user_creator", "Creator");
  const other = await asUser(t, "user_other", "Other");
  const vodId = await seedVod(admin);

  await creator.mutation(api.clips.create, { streamId: vodId, start: 0, end: 5, title: "first" });
  await creator.mutation(api.clips.create, { streamId: vodId, start: 10, end: 15, title: "second" });
  await other.mutation(api.clips.create, { streamId: vodId, start: 20, end: 25, title: "not mine" });

  const mine = await creator.query(api.clips.mine, {});
  expect(mine.map((c) => c.title)).toEqual(["second", "first"]);

  await expect(t.query(api.clips.mine, {})).rejects.toThrow();
});
