/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { asAdmin, asUser, setup } from "./test.helpers";

const ORIGIN_LIVE_URL = "http://nms.internal:8000/live/SECRET_KEY/index.m3u8";

function createArgs(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test stream",
    scheduledStart: Date.now(),
    liveUrl: ORIGIN_LIVE_URL,
    ...overrides,
  };
}

test("create → goLive → end transitions", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  const streamId = await admin.mutation(api.streams.create, createArgs());
  let stream = await admin.query(api.streams.get, { streamId });
  expect(stream).toMatchObject({ status: "scheduled", visibility: "public" });
  expect(stream!.actualStart).toBeUndefined();

  await admin.mutation(api.streams.goLive, { streamId });
  stream = await admin.query(api.streams.get, { streamId });
  expect(stream!.status).toBe("live");
  expect(stream!.actualStart).toBeTypeOf("number");

  await admin.mutation(api.streams.end, { streamId });
  stream = await admin.query(api.streams.get, { streamId });
  expect(stream!.status).toBe("ended");
  expect(stream!.actualEnd).toBeTypeOf("number");
});

test("goLive rejects when another stream is live", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  const a = await admin.mutation(api.streams.create, createArgs({ title: "A" }));
  const b = await admin.mutation(api.streams.create, createArgs({ title: "B" }));

  await admin.mutation(api.streams.goLive, { streamId: a });
  await expect(
    admin.mutation(api.streams.goLive, { streamId: b }),
  ).rejects.toThrow();

  await admin.mutation(api.streams.end, { streamId: a });
  await admin.mutation(api.streams.goLive, { streamId: b });
  const live = await admin.query(api.streams.getLive, {});
  expect(live!.title).toBe("B");
});

test("create/goLive/end reject for non-admins", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const streamId = await admin.mutation(api.streams.create, createArgs());

  await expect(
    viewer.mutation(api.streams.create, createArgs()),
  ).rejects.toThrow();
  await expect(
    viewer.mutation(api.streams.goLive, { streamId }),
  ).rejects.toThrow();
  await expect(t.mutation(api.streams.create, createArgs())).rejects.toThrow();

  await admin.mutation(api.streams.goLive, { streamId });
  await expect(
    viewer.mutation(api.streams.end, { streamId }),
  ).rejects.toThrow();
});

test("invalid transitions throw", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  const scheduled = await admin.mutation(api.streams.create, createArgs());
  await expect(
    admin.mutation(api.streams.end, { streamId: scheduled }),
  ).rejects.toThrow();

  const done = await admin.mutation(api.streams.create, createArgs());
  await admin.mutation(api.streams.goLive, { streamId: done });
  await admin.mutation(api.streams.end, { streamId: done });
  await expect(
    admin.mutation(api.streams.goLive, { streamId: done }),
  ).rejects.toThrow();
});

test("sanitization (SC-009): non-admins get proxy paths, admins get origin URLs", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  const streamId = await admin.mutation(api.streams.create, createArgs());
  await admin.mutation(api.streams.goLive, { streamId });

  // anonymous + signed-in viewer: proxy path only, zero origin leakage
  for (const caller of [t, viewer]) {
    for (const stream of [
      await caller.query(api.streams.getLive, {}),
      await caller.query(api.streams.get, { streamId }),
    ]) {
      expect(stream!.liveUrl).toBe("/stream/live.m3u8");
      expect(JSON.stringify(stream)).not.toContain("nms.internal");
      expect(JSON.stringify(stream)).not.toContain("SECRET_KEY");
    }
  }

  // admin: origin URLs intact
  expect((await admin.query(api.streams.getLive, {}))!.liveUrl).toBe(
    ORIGIN_LIVE_URL,
  );
  expect((await admin.query(api.streams.get, { streamId }))!.liveUrl).toBe(
    ORIGIN_LIVE_URL,
  );
});
