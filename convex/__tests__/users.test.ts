/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { requireAdmin } from "../lib/auth";

const modules = import.meta.glob("../**/*.ts");

test("ensure creates then updates a user", async () => {
  const t = convexTest(schema, modules);

  const asAda = t.withIdentity({ subject: "user_ada", name: "Ada" });
  await asAda.mutation(api.users.ensure, {});
  expect(await asAda.query(api.users.me, {})).toMatchObject({
    externalId: "user_ada",
    name: "Ada",
  });

  const asAdaRenamed = t.withIdentity({
    subject: "user_ada",
    name: "Ada Lovelace",
  });
  await asAdaRenamed.mutation(api.users.ensure, {});
  expect(await asAdaRenamed.query(api.users.me, {})).toMatchObject({
    externalId: "user_ada",
    name: "Ada Lovelace",
  });

  const allUsers = await t.run(async (ctx) => ctx.db.query("users").collect());
  expect(allUsers).toHaveLength(1);
});

test("me returns null anonymously", async () => {
  const t = convexTest(schema, modules);
  expect(await t.query(api.users.me, {})).toBeNull();
});

test("requireAdmin rejects non-admins", async () => {
  const t = convexTest(schema, modules);
  const asBob = t.withIdentity({ subject: "user_bob", name: "Bob" });
  await asBob.mutation(api.users.ensure, {});
  await expect(asBob.run(async (ctx) => requireAdmin(ctx))).rejects.toThrow(
    "Admin only",
  );
});
