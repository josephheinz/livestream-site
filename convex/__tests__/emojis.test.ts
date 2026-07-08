/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { asAdmin, asUser, setup } from "./test.helpers";

async function storedImage(t: ReturnType<typeof setup>) {
  return await t.run(async (ctx) => ctx.storage.store(new Blob(["png-bytes"])));
}

test("create and deactivate are admin-only", async () => {
  const t = setup();
  const admin = await asAdmin(t);
  const viewer = await asUser(t);
  const storageId = await storedImage(t);

  await expect(
    viewer.mutation(api.emojis.create, { name: "nope", storageId }),
  ).rejects.toThrow();
  await expect(t.mutation(api.emojis.generateUploadUrl, {})).rejects.toThrow();

  const emojiId = await admin.mutation(api.emojis.create, {
    name: "partyparrot",
    storageId,
  });
  await expect(
    viewer.mutation(api.emojis.deactivate, { emojiId }),
  ).rejects.toThrow();
  await admin.mutation(api.emojis.deactivate, { emojiId });
});

test("list returns only active emojis with resolved image URLs", async () => {
  const t = setup();
  const admin = await asAdmin(t);

  const activeId = await admin.mutation(api.emojis.create, {
    name: "active",
    storageId: await storedImage(t),
  });
  const inactiveId = await admin.mutation(api.emojis.create, {
    name: "inactive",
    storageId: await storedImage(t),
  });
  await admin.mutation(api.emojis.deactivate, { emojiId: inactiveId });

  const emojis = await t.query(api.emojis.list, {});
  expect(emojis).toHaveLength(1);
  expect(emojis[0]).toMatchObject({ _id: activeId, name: "active" });
  expect(emojis[0].imageUrl).toBeTypeOf("string");
});
