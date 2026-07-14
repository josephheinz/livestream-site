/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { asAdmin, setup } from "./test.helpers";

const INGEST_SECRET = "test-ingest-secret";
process.env.INGEST_WEBHOOK_SECRET = INGEST_SECRET;
process.env.MEDIA_SERVER_HLS_BASE = "http://media.test";

function postIngest(
  t: ReturnType<typeof setup>,
  path: "/ingest/publish" | "/ingest/unpublish",
  body: object,
  secret: string | null = INGEST_SECRET,
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== null) {
    headers["x-ingest-secret"] = secret;
  }
  return t.fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function seedStream(
  t: ReturnType<typeof setup>,
  admin: Awaited<ReturnType<typeof asAdmin>>,
  title: string,
) {
  const streamId = await admin.mutation(api.streams.create, {
    title,
    scheduledStart: Date.now(),
  });
  const streamKey = await t.run(async (ctx) =>
    (await ctx.db.get(streamId))!.ingestKey,
  );
  return { streamId, streamKey: streamKey! };
}

test("publish rejects a missing or bad ingest secret", async () => {
  const t = setup();

  for (const secret of [null, "wrong-secret"]) {
    const response = await postIngest(
      t,
      "/ingest/publish",
      { streamKey: "unknown" },
      secret,
    );
    expect(response.status).toBe(403);
  }
});

test("publish rejects a missing streamKey", async () => {
  const response = await postIngest(setup(), "/ingest/publish", {});
  expect(response.status).toBe(400);
});

test("publish rejects an unknown streamKey", async () => {
  const response = await postIngest(setup(), "/ingest/publish", {
    streamKey: "unknown",
  });
  expect(response.status).toBe(403);
});

test("publish rejects ended and canceled streams", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const ended = await seedStream(t, admin, "Ended");
  await postIngest(t, "/ingest/publish", { streamKey: ended.streamKey });
  await admin.mutation(api.streams.goLive, { streamId: ended.streamId });
  await admin.mutation(api.streams.end, { streamId: ended.streamId });
  const canceled = await seedStream(t, admin, "Canceled");
  await admin.mutation(api.streams.cancel, { streamId: canceled.streamId });

  for (const streamKey of [ended.streamKey, canceled.streamKey]) {
    const response = await postIngest(t, "/ingest/publish", { streamKey });
    expect(response.status).toBe(403);
  }
});

test("publish rejects when a different stream is already live", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const live = await seedStream(t, admin, "Live");
  const target = await seedStream(t, admin, "Target");
  await postIngest(t, "/ingest/publish", { streamKey: live.streamKey });
  await admin.mutation(api.streams.goLive, { streamId: live.streamId });

  const response = await postIngest(t, "/ingest/publish", {
    streamKey: target.streamKey,
  });
  expect(response.status).toBe(403);
});

test("publish returns 200 and arms the scheduled stream", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const stream = await seedStream(t, admin, "Scheduled");

  const response = await postIngest(t, "/ingest/publish", {
    streamKey: stream.streamKey,
  });
  expect(response.status).toBe(200);
  const armed = await t.run(async (ctx) => ctx.db.get(stream.streamId));
  expect(armed).toHaveProperty("status", "scheduled");
  expect(armed).toHaveProperty("ingestActive", true);
});

test("re-publishing the same stream returns 200 and bumps publishEpoch", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const stream = await seedStream(t, admin, "Reconnect");

  const first = await postIngest(t, "/ingest/publish", {
    streamKey: stream.streamKey,
  });
  const firstEpoch = await t.run(async (ctx) =>
    (await ctx.db.get(stream.streamId))!.publishEpoch,
  );
  const second = await postIngest(t, "/ingest/publish", {
    streamKey: stream.streamKey,
  });
  const secondEpoch = await t.run(async (ctx) =>
    (await ctx.db.get(stream.streamId))!.publishEpoch,
  );

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(secondEpoch).toBe(firstEpoch! + 1);
});

test("unpublish rejects a missing or bad ingest secret", async () => {
  const t = setup();

  for (const secret of [null, "wrong-secret"]) {
    const response = await postIngest(
      t,
      "/ingest/unpublish",
      { streamKey: "unknown" },
      secret,
    );
    expect(response.status).toBe(403);
  }
});

test("unpublish returns 200 for an unknown streamKey", async () => {
  const response = await postIngest(setup(), "/ingest/unpublish", {
    streamKey: "unknown",
  });
  expect(response.status).toBe(200);
});
