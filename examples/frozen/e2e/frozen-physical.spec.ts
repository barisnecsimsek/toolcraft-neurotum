import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import {
  createFrozenScratchPng,
  frozenCanvasSelector,
  frozenOutputSelector,
  openFrozen,
  readFrozenOutputSignature,
  uploadFrozenObj,
  uploadFrozenSphereObj,
} from "./frozen-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test.setTimeout(60_000);

async function fillRange(page: Parameters<typeof openFrozen>[0], target: string, value: string) {
  const control = await getToolcraftControlFieldByTarget(page, target);
  const input = control.locator('input[type="range"]');
  await expect(input).toHaveCount(1);
  await input.fill(value);
}

test("browser: physical ice uses HDRI, object mask, scratch relief, exact icicles, and x2 backing", async ({
  page,
}) => {
  const rendererErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") rendererErrors.push(message.text());
  });
  await openFrozen(page);
  await uploadFrozenObj(page);
  const canvas = page.locator(frozenCanvasSelector);
  const output = page.locator(frozenOutputSelector);
  await expect(canvas).toHaveAttribute("data-hdri-status", "ready", {
    timeout: 15_000,
  });
  await expect(output).toHaveAttribute("data-mask-space", "object");
  await expect(canvas).toHaveAttribute("data-render-scale", "2");
  await expect(canvas).toHaveAttribute("data-material-mode", "pbr-transmission");
  await expect(canvas).toHaveAttribute(
    "data-transmission-resolution-scale",
    "1",
  );
  const backing = await canvas.evaluate((element) => {
    const current = element as HTMLCanvasElement;
    const bounds = current.getBoundingClientRect();
    return {
      cssHeight: bounds.height,
      cssWidth: bounds.width,
      height: current.height,
      width: current.width,
    };
  });
  expect(backing.width).toBeGreaterThanOrEqual(Math.floor(backing.cssWidth * 1.9));
  expect(backing.height).toBeGreaterThanOrEqual(Math.floor(backing.cssHeight * 1.9));

  await fillRange(page, "effect.progress", "46");
  await fillRange(page, "ice.transmission", "0");
  await expect(canvas).toHaveAttribute("data-physical-transmission", "0");
  const opaqueIce = await readFrozenOutputSignature(page);
  await fillRange(page, "ice.transmission", "90");
  await expect(canvas).toHaveAttribute("data-physical-transmission", "0.9");
  await expect.poll(() => readFrozenOutputSignature(page)).not.toBe(opaqueIce);
  const transmittedIce = await readFrozenOutputSignature(page);
  await fillRange(page, "lighting.environmentRotation", "-120");
  await expect.poll(() => readFrozenOutputSignature(page)).not.toBe(transmittedIce);
  await page.screenshot({ path: "/tmp/frozen-pbr-preview.png" });

  await fillRange(page, "ice.icicleUnderside", "0");
  await fillRange(page, "ice.icicleLength", "1");
  await fillRange(page, "ice.icicleRadius", "1");
  await fillRange(page, "ice.icicleDensity", "0");
  await expect(canvas).toHaveAttribute("data-icicle-count", "0");
  await fillRange(page, "ice.icicleDensity", "100");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-icicle-count")))
    .toBeGreaterThan(100);
  await fillRange(page, "ice.icicleLength", "0");
  await expect(canvas).toHaveAttribute("data-icicle-count", "0");
  await fillRange(page, "ice.icicleLength", "28");
  await fillRange(page, "ice.icicleRadius", "18");

  const scratchControl = await getToolcraftControlFieldByTarget(
    page,
    "source.scratchTexture",
  );
  await scratchControl.locator('input[type="file"]').setInputFiles({
    buffer: await createFrozenScratchPng(page),
    mimeType: "image/png",
    name: "scratch-map.png",
  });
  await expect(canvas).toHaveAttribute("data-scratch-status", "ready", {
    timeout: 15_000,
  });
  await expect(canvas).toHaveAttribute(
    "data-scratch-source-id",
    /scratch-map\.png/u,
  );
  const beforeRelief = await readFrozenOutputSignature(page);
  await fillRange(page, "scratch.displacement", "16");
  await fillRange(page, "scratch.rotation", "67");
  await expect
    .poll(() => readFrozenOutputSignature(page))
    .not.toBe(beforeRelief);

  await page.screenshot({ path: "/tmp/frozen-physical-preview.png" });
  expect(rendererErrors.filter((message) => /shader|webgl/iu.test(message))).toEqual([]);
});

test("browser: Voronoi mask blends transparent ice and current frost materials", async ({
  page,
}) => {
  const rendererErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") rendererErrors.push(message.text());
  });
  await openFrozen(page);
  await uploadFrozenSphereObj(page);
  const canvas = page.locator(frozenCanvasSelector);
  await fillRange(page, "effect.progress", "0");
  await fillRange(page, "ice.crystalDensity", "0");
  await fillRange(page, "ice.icicleDensity", "0");
  await fillRange(page, "ice.shellThickness", "8");

  await fillRange(page, "ice.materialMaskCoverage", "0");
  const clearIce = await readFrozenOutputSignature(page);
  await page.screenshot({ path: "/tmp/frozen-clear-ice.png" });

  await fillRange(page, "ice.materialMaskCoverage", "50");
  await expect.poll(() => readFrozenOutputSignature(page)).not.toBe(clearIce);
  const mixedIce = await readFrozenOutputSignature(page);
  await fillRange(page, "ice.materialMaskSeed", "83");
  await expect.poll(() => readFrozenOutputSignature(page)).not.toBe(mixedIce);
  const seededIce = await readFrozenOutputSignature(page);
  await page.screenshot({ path: "/tmp/frozen-voronoi-mix.png" });

  await fillRange(page, "ice.materialMaskCoverage", "100");
  await expect.poll(() => readFrozenOutputSignature(page)).not.toBe(seededIce);
  await page.screenshot({ path: "/tmp/frozen-current-frost.png" });
  expect(rendererErrors.filter((message) => /shader|webgl/iu.test(message))).toEqual([]);
  expect(await canvas.getAttribute("data-physical-transmission")).toBe("0.9");
});
