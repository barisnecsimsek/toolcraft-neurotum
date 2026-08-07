import { expect, type Page } from "@playwright/test";

import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { selectFrozenSourceModeForPerformance } from "./frozen-image-performance-path-adapters";

const canvasSelector = '[data-slot="frozen-webgl-canvas"]';
const outputSelector = '[data-slot="frozen-product-output"]';

export async function applyFrozenModelTriangleBudget(
  page: Page,
  value: number,
): Promise<void> {
  const restoreImageMode =
    (await page.locator(outputSelector).getAttribute("data-source-mode")) === "image";
  if (restoreImageMode) await selectFrozenSourceModeForPerformance(page, "3D");
  const control = await getToolcraftControlFieldByTarget(
    page,
    "source.modelTriangleBudget",
  );
  const edit = control.getByRole("button", { name: "Edit Mesh budget value" });
  await edit.scrollIntoViewIfNeeded();
  await edit.click();
  const editor = control.getByRole("textbox", { name: "Mesh budget value" });
  await editor.fill(String(value));
  await editor.press("Enter");
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-model-triangle-budget",
    String(value),
  );
  if (restoreImageMode) await selectFrozenSourceModeForPerformance(page, "Image");
}

export async function observeFrozenModelTriangleBudget(page: Page): Promise<number> {
  return Number(
    await page.locator(canvasSelector).getAttribute("data-model-triangle-budget"),
  );
}

export async function dragFrozenModelTriangleBudget(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(
    page,
    "source.modelTriangleBudget",
  );
  const slider = control.locator('[data-slot="slider"]');
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (!box) throw new Error("Mesh budget slider is not measurable.");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.82, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 6 });
  await page.mouse.up();
}
