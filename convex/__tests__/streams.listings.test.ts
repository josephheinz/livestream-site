/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

const ORIGIN_RECORDING_URL =
  "http://nms.internal:8000/recordings/SECRET_KEY/2026-07-07.m3u8";

async function armAndGoLive(
  admin: Awaited<ReturnType<typeof asAdmin>>,
  streamId: Id<"streams">,
): Promise<void> {
  await admin.mutation(internal.streams.beginPublish, {
    streamKey: (await admin.query(api.streams.get, { streamId }))!.ingestKey!,
  });
  await admin.mutation(api.streams.goLive, { streamId });
}

async function seedEnded(
  admin: Awaited<ReturnType<typeof asAdmin>>,
  title: string,
  scheduledStart: number,
  recordingUrl?: string,
): Promise<Id<"streams">> {
  const streamId = await admin.mutation(api.streams.create, {
    title,
    scheduledStart,
  });
  await armAndGoLive(admin, streamId);
  await admin.mutation(api.streams.end, { streamId });
  if (recordingUrl !== undefined) {
    await admin.mutation(api.streams.attachRecording, { streamId, recordingUrl });
  }
  return streamId;
}

test("listUpcoming: only scheduled streams, soonest first", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const now = Date.now();

  await admin.mutation(api.streams.create, {
    title: "later",
    scheduledStart: now + 2_000_000,
  });
  await admin.mutation(api.streams.create, {
    title: "sooner",
    scheduledStart: now + 1_000_000,
  });
  await seedEnded(admin, "over", now - 5_000_000, ORIGIN_RECORDING_URL);
  const liveId = await admin.mutation(api.streams.create, {
    title: "already live",
    scheduledStart: now,
  });
  await armAndGoLive(admin, liveId);
  const canceledId = await admin.mutation(api.streams.create, {
    title: "called off",
    scheduledStart: now + 3_000_000,
  });
  await admin.mutation(api.streams.cancel, { streamId: canceledId });

  const upcoming = await t.query(api.streams.listUpcoming, {});
  expect(upcoming.map((s) => s.title)).toEqual(["sooner", "later"]);
});

test("listArchive: only ended-with-recording, newest first", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const now = Date.now();

  await seedEnded(admin, "old", now - 3_000_000, ORIGIN_RECORDING_URL);
  await seedEnded(admin, "new", now - 1_000_000, ORIGIN_RECORDING_URL);
  await seedEnded(admin, "no recording", now - 2_000_000);

  const archive = await t.query(api.streams.listArchive, {});
  expect(archive.map((s) => s.title)).toEqual(["new", "old"]);
});

test("private VODs hidden from non-admins in listArchive and get", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const now = Date.now();

  const publicId = await seedEnded(admin, "public", now - 2_000_000, ORIGIN_RECORDING_URL);
  const privateId = await seedEnded(admin, "secret", now - 1_000_000, ORIGIN_RECORDING_URL);
  await admin.mutation(api.streams.setVisibility, {
    streamId: privateId,
    visibility: "private",
  });

  for (const caller of [t, viewer]) {
    const archive = await caller.query(api.streams.listArchive, {});
    expect(archive.map((s) => s.title)).toEqual(["public"]);
    expect(await caller.query(api.streams.get, { streamId: privateId })).toBeNull();
    expect(await caller.query(api.streams.get, { streamId: publicId })).not.toBeNull();
  }

  const adminArchive = await admin.query(api.streams.listArchive, {});
  expect(adminArchive.map((s) => s.title)).toEqual(["secret", "public"]);
  expect(await admin.query(api.streams.get, { streamId: privateId })).not.toBeNull();
});

test("listArchive sanitizes URLs for non-admins (SC-009)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const streamId = await seedEnded(admin, "vod", Date.now(), ORIGIN_RECORDING_URL);

  const [vod] = await t.query(api.streams.listArchive, {});
  expect(vod.recordingUrl).toBe(`/stream/vod/${streamId}.m3u8`);
  expect(JSON.stringify(vod)).not.toContain("nms.internal");

  const [adminVod] = await admin.query(api.streams.listArchive, {});
  expect(adminVod.recordingUrl).toBe(ORIGIN_RECORDING_URL);
});

test("setVisibility and attachRecording are admin-only; attachRecording needs ended", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  const scheduledId = await admin.mutation(api.streams.create, {
    title: "still scheduled",
    scheduledStart: Date.now(),
  });
  await expect(
    admin.mutation(api.streams.attachRecording, {
      streamId: scheduledId,
      recordingUrl: ORIGIN_RECORDING_URL,
    }),
  ).rejects.toThrow();

  const endedId = await seedEnded(admin, "done", Date.now());
  await expect(
    viewer.mutation(api.streams.attachRecording, {
      streamId: endedId,
      recordingUrl: ORIGIN_RECORDING_URL,
    }),
  ).rejects.toThrow();
  await expect(
    viewer.mutation(api.streams.setVisibility, {
      streamId: endedId,
      visibility: "private",
    }),
  ).rejects.toThrow();

  await admin.mutation(api.streams.attachRecording, {
    streamId: endedId,
    recordingUrl: ORIGIN_RECORDING_URL,
  });
  await admin.mutation(api.streams.setVisibility, {
    streamId: endedId,
    visibility: "private",
  });
  const stream = await admin.query(api.streams.get, { streamId: endedId });
  expect(stream).toMatchObject({
    recordingUrl: ORIGIN_RECORDING_URL,
    visibility: "private",
  });
});

test("cancel only valid from scheduled", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  const liveId = await admin.mutation(api.streams.create, {
    title: "on air",
    scheduledStart: Date.now(),
  });
  await armAndGoLive(admin, liveId);
  await expect(
    admin.mutation(api.streams.cancel, { streamId: liveId }),
  ).rejects.toThrow();

  const scheduledId = await admin.mutation(api.streams.create, {
    title: "callable",
    scheduledStart: Date.now(),
  });
  await expect(
    viewer.mutation(api.streams.cancel, { streamId: scheduledId }),
  ).rejects.toThrow();
  await admin.mutation(api.streams.cancel, { streamId: scheduledId });
  expect(
    (await admin.query(api.streams.get, { streamId: scheduledId }))!.status,
  ).toBe("canceled");
});

test("update edits metadata without changing status", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const now = Date.now();

  const streamId = await admin.mutation(api.streams.create, {
    title: "before",
    scheduledStart: now,
  });
  await expect(
    viewer.mutation(api.streams.update, { streamId, title: "hax" }),
  ).rejects.toThrow();

  await admin.mutation(api.streams.update, {
    streamId,
    title: "after",
    description: "new details",
    scheduledStart: now + 500_000,
  });
  const stream = await admin.query(api.streams.get, { streamId });
  expect(stream).toMatchObject({
    title: "after",
    description: "new details",
    scheduledStart: now + 500_000,
    status: "scheduled",
  });
});

test("current: live wins, else soonest scheduled, else latest ended (no recording needed)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const now = Date.now();

  // Nothing at all → null.
  expect(await t.query(api.streams.current)).toBeNull();

  // Only an ended stream WITHOUT a recording → still bindable for chat.
  await seedEnded(admin, "old show", now - 5_000_000);
  expect((await t.query(api.streams.current))?.title).toBe("old show");

  // A scheduled stream outranks the ended one.
  await admin.mutation(api.streams.create, {
    title: "next up",
    scheduledStart: now + 1_000_000,
  });
  expect((await t.query(api.streams.current))?.title).toBe("next up");

  // Live outranks everything.
  const liveId = await admin.mutation(api.streams.create, {
    title: "on air",
    scheduledStart: now,
  });
  await armAndGoLive(admin, liveId);
  expect((await t.query(api.streams.current))?.title).toBe("on air");
});

test("current: sanitizes origin URLs for non-admins", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await seedEnded(admin, "with tape", Date.now() - 1_000_000, ORIGIN_RECORDING_URL);

  const current = await t.query(api.streams.current);
  expect(current?.recordingUrl).not.toContain("SECRET_KEY");
});
