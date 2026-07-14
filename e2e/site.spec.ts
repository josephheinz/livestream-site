import { test, expect } from "@playwright/test";

// Smoke-level E2E for the public surface. The backend (Convex) may have no live
// stream, so assertions target the always-present shell, not stream data.

test("home page renders the watch shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Joseph Heinz/);
  // Brand appears in the banner regardless of live/off-air state.
  await expect(page.getByRole("link", { name: /Joseph Heinz/ })).toBeVisible();
  // Live/off-air pill is always mounted.
  await expect(page.getByTestId("banner-live")).toBeVisible();
  // Player region: either the live video or the off-air card is shown.
  await expect(
    page.getByTestId("player-video").or(page.getByText("OFF AIR").first()),
  ).toBeVisible();
});

test("dashboard redirects anonymous visitors home", async ({ page }) => {
  await page.goto("/dashboard");
  // Client-side guard replaces the route with "/" once auth resolves.
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await expect(page.getByTestId("banner-live")).toBeVisible();
});

test("sign-in page renders the Clerk form", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
});

test("sign-up page renders the Clerk form", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
});

test("design-system page loads", async ({ page }) => {
  const res = await page.goto("/design-system");
  expect(res?.ok()).toBeTruthy();
});
