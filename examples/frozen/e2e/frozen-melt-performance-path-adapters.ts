import { expect, type Page } from "@playwright/test";

import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";

const canvasSelector = '[data-slot="frozen-webgl-canvas"]';
const outputSelector = '[data-slot="frozen-product-output"]';

async function editMeltSlider(
  page: Page,
  target: string,
  label: string,
  value: number,
): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, target);
  const edit = control.getByRole("button", { name: `Edit ${label} value` });
  await edit.scrollIntoViewIfNeeded();
  await edit.click();
  const editor = control.getByRole("textbox", { name: `${label} value` });
  await editor.fill(String(value));
  await editor.press("Enter");
}

export async function prepareFrozenMeltPerformance(
  page: Page,
  refreeze: number,
): Promise<void> {
  await page.goto("/");
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-model-status",
    "empty",
  );
  const control = await getToolcraftControlFieldByTarget(page, "melt.enabled");
  const toggle = control.getByRole("switch");
  if ((await toggle.getAttribute("aria-checked")) !== "true") {
    await toggle.click();
  }
  await expect(page.locator(outputSelector)).toHaveAttribute(
    "data-melt-enabled",
    "true",
  );
  await editMeltSlider(page, "melt.refreeze", "Refreeze", refreeze);
}

export async function dragFrozenMeltBrush(page: Page): Promise<void> {
  const canvas = page.locator(canvasSelector);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Frozen melt canvas is not measurable.");
  await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.53, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-melt-maximum")),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0.1);
}
