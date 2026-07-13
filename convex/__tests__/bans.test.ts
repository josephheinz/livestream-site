/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asAdmin, asUser, setup } from "./test.helpers";

async function userIdOf(
  t: ReturnType<typeof setup>,
  externalId: string,
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    return user!._id;
  });
}

test("list/ban/unban are admin-only", async () => {
  const t = setup();
  await asAdmin(t);
  const viewer = await asUser(t);
  const viewerId = await userIdOf(t, "user_viewer");

  await expect(t.query(api.bans.list)).rejects.toThrow("Admin only");
  await expect(viewer.query(api.bans.list)).rejects.toThrow("Admin only");
  await expect(
    viewer.mutation(api.bans.ban, { userId: viewerId, reason: "nope" }),
  ).rejects.toThrow("Admin only");
  await expect(
    viewer.mutation(api.bans.unban, { userId: viewerId }),
  ).rejects.toThrow("Admin only");
});

test("ban rejects an empty reason", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await asUser(t);
  const viewerId = await userIdOf(t, "user_viewer");

  await expect(
    admin.mutation(api.bans.ban, { userId: viewerId, reason: "" }),
  ).rejects.toThrow();
  await expect(
    admin.mutation(api.bans.ban, { userId: viewerId, reason: "   " }),
  ).rejects.toThrow();
  expect(await admin.query(api.bans.list)).toHaveLength(0);
});

test("ban rejects an unknown user", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await asUser(t, "user_gone", "Ghost");
  const goneId = await userIdOf(t, "user_gone");
  await t.run(async (ctx) => ctx.db.delete(goneId));

  await expect(
    admin.mutation(api.bans.ban, { userId: goneId, reason: "spam" }),
  ).rejects.toThrow("User not found");
});

test("re-banning updates the existing ban in place (no stacking)", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await asUser(t);
  const viewerId = await userIdOf(t, "user_viewer");

  await admin.mutation(api.bans.ban, { userId: viewerId, reason: "first" });
  await admin.mutation(api.bans.ban, { userId: viewerId, reason: "second" });

  const bans = await admin.query(api.bans.list);
  expect(bans).toHaveLength(1);
  expect(bans[0]).toMatchObject({ userId: viewerId, reason: "second" });
});

test("a ban whose expiresAt is in the past is inactive", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await asUser(t);
  const viewerId = await userIdOf(t, "user_viewer");

  await admin.mutation(api.bans.ban, {
    userId: viewerId,
    reason: "temporary",
    expiresAt: Date.now() - 1_000,
  });
  expect(await admin.query(api.bans.list)).toHaveLength(0);
});

test("list joins the banned user's display name", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await asUser(t, "user_target", "Target Person");
  const targetId = await userIdOf(t, "user_target");

  await admin.mutation(api.bans.ban, { userId: targetId, reason: "spam" });
  const bans = await admin.query(api.bans.list);
  expect(bans).toHaveLength(1);
  expect(bans[0]).toMatchObject({
    userId: targetId,
    userName: "Target Person",
    reason: "spam",
  });
  expect(bans[0].expiresAt).toBeUndefined();
});

test("unban removes an active ban and is a no-op when none exists", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  await asUser(t);
  const viewerId = await userIdOf(t, "user_viewer");

  await admin.mutation(api.bans.unban, { userId: viewerId }); // no-op, no throw

  await admin.mutation(api.bans.ban, { userId: viewerId, reason: "spam" });
  expect(await admin.query(api.bans.list)).toHaveLength(1);

  await admin.mutation(api.bans.unban, { userId: viewerId });
  expect(await admin.query(api.bans.list)).toHaveLength(0);
});
