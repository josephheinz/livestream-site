/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { api } from "../_generated/api";
import schema from "../schema";

export const modules = import.meta.glob("../**/*.ts");

export function setup() {
  return convexTest(schema, modules);
}

/** A signed-in regular viewer accessor, with their users row created. */
export async function asUser(
  t: TestConvex<typeof schema>,
  subject = "user_viewer",
  name = "Viewer",
) {
  const accessor = t.withIdentity({ subject, name });
  await accessor.mutation(api.users.ensure, {});
  return accessor;
}

/** A signed-in admin accessor, with their users row created and role set. */
export async function asAdmin(t: TestConvex<typeof schema>) {
  const accessor = t.withIdentity({ subject: "user_admin", name: "Admin" });
  await accessor.mutation(api.users.ensure, {});
  await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", "user_admin"))
      .unique();
    await ctx.db.patch(user!._id, { role: "admin" });
  });
  return accessor;
}
