import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import {
  frozenCanvasSelector,
  frozenOutputSelector,
  openFrozen,
  toggleFrozenSwitch,
} from "./frozen-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test.setTimeout(60_000);

test("browser: supplied Night King scene is the clean-start default", async ({
  page,
}) => {
  await openFrozen(page);
  const output = page.locator(frozenOutputSelector);
  const canvas = page.locator(frozenCanvasSelector);

  await expect(output).toHaveAttribute("data-frozen-progress", "0.2");
  await expect(output).toHaveAttribute("data-melt-enabled", "true");
  await expect(output).toHaveAttribute("data-include-background", "true");
  await expect(output).toHaveAttribute("data-scratch-offset-x", "-0.53");
  await expect(output).toHaveAttribute("data-scratch-offset-y", "-0.14");
  await expect(canvas).toHaveAttribute("data-model-source-triangle-count", "28564");
  await expect(canvas).toHaveAttribute("data-model-triangle-budget", "30000");
  await expect(canvas).toHaveAttribute("data-render-scale", "1");

  const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
  await progress.locator('input[type="range"]').fill("67");
  const melt = await getToolcraftControlFieldByTarget(page, "melt.enabled");
  await toggleFrozenSwitch(melt);
  await page.getByRole("button", { name: "Reset controls" }).click();

  await expect(output).toHaveAttribute("data-frozen-progress", "0.2");
  await expect(output).toHaveAttribute("data-melt-enabled", "true");
  await expect(canvas).toHaveAttribute(
    "data-model-label",
    "Night King optimized 28k.zip",
    { timeout: 30_000 },
  );
  await expect(canvas).toHaveAttribute(
    "data-scratch-label",
    "Black Painted Wall Texture.jpg",
  );
});
