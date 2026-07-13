/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { asAdmin, asUser, setup } from "./test.helpers";

test("get returns null before anything is saved", async () => {
  const t = setup();
  expect(await t.query(api.settings.get)).toBeNull();
});

test("setTickerItems is admin-only", async () => {
  const t = setup();
  await asAdmin(t);
  const viewer = await asUser(t);

  await expect(
    t.mutation(api.settings.setTickerItems, { tickerItems: ["hello"] }),
  ).rejects.toThrow(); // anonymous
  await expect(
    viewer.mutation(api.settings.setTickerItems, { tickerItems: ["hello"] }),
  ).rejects.toThrow("Admin only");
});

test("setTickerItems persists and get is public", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  await admin.mutation(api.settings.setTickerItems, {
    tickerItems: ["MERCH DROP FRIDAY", "DAY 115"],
  });
  // Anonymous readers see the items (the ticker renders for everyone).
  const settings = await t.query(api.settings.get);
  expect(settings?.tickerItems).toEqual(["MERCH DROP FRIDAY", "DAY 115"]);
});

test("setTickerItems overwrites in place and drops blank lines", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  await admin.mutation(api.settings.setTickerItems, { tickerItems: ["one"] });
  await admin.mutation(api.settings.setTickerItems, {
    tickerItems: ["  two  ", "", "   "],
  });

  const settings = await t.query(api.settings.get);
  expect(settings?.tickerItems).toEqual(["two"]);
  // Still a single settings row.
  const count = await t.run(async (ctx) => (await ctx.db.query("settings").collect()).length);
  expect(count).toBe(1);
});

test("sendAnnouncement is admin-only and publishes trimmed text", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  await expect(
    viewer.mutation(api.settings.sendAnnouncement, { message: "Nope" }),
  ).rejects.toThrow("Admin only");

  await admin.mutation(api.settings.sendAnnouncement, { message: "  Stream starts now!  " });
  expect((await t.query(api.settings.get))?.announcement?.message).toBe("Stream starts now!");
});

test("sendAnnouncement rejects empty and oversized messages", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  await expect(
    admin.mutation(api.settings.sendAnnouncement, { message: "   " }),
  ).rejects.toThrow("Message is required");
  await expect(
    admin.mutation(api.settings.sendAnnouncement, { message: "x".repeat(281) }),
  ).rejects.toThrow("280 characters or fewer");
});

test("triggerAudienceEffect is admin-only and queues every effect", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);

  await expect(
    viewer.mutation(api.settings.triggerAudienceEffect, { kind: "confetti" }),
  ).rejects.toThrow("Admin only");

  await admin.mutation(api.settings.triggerAudienceEffect, { kind: "confetti" });
  await admin.mutation(api.settings.triggerAudienceEffect, { kind: "imageRain" });
  expect((await t.query(api.settings.listAudienceEffects)).map((effect) => effect.kind)).toEqual([
    "imageRain",
    "confetti",
  ]);
});
