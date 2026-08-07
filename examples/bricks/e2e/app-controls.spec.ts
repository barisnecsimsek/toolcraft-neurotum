import { expect, test } from "@playwright/test";

test("browser: Brick Mosaic opens as a Toolcraft product app", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  await expect(page.getByText("Brick Grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
});
