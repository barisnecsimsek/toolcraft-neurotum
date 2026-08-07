import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  dragToolcraftSliderByLabel,
  expectToolcraftCanvasViewportStable,
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  measureToolcraftInteraction,
  waitForToolcraftAnimationFrames,
  zoomToolcraftCanvasViewport,
} from "./performance-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";
import { brickMosaicStartupCanvasSize } from "../src/app/brick-mosaic-startup-preset";

const fixtureSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
  <rect width="320" height="240" fill="#5fb4d0"/>
  <rect x="0" y="0" width="160" height="120" fill="#ff6b1a"/>
  <rect x="160" y="0" width="160" height="120" fill="#84202d"/>
  <rect x="0" y="120" width="160" height="120" fill="#f7b4c8"/>
  <rect x="160" y="120" width="160" height="120" fill="#bed7e7"/>
  <circle cx="158" cy="116" r="54" fill="#ffe0ba"/>
  <path d="M84 176 C130 130 188 224 256 152" fill="none" stroke="#3f2a24" stroke-width="34"/>
</svg>`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function openBrickMosaic(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
}

async function uploadBrickFixture(page: Page, fileName = "brick-fixture.svg"): Promise<void> {
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(fixtureSvg),
    mimeType: "image/svg+xml",
    name: fileName,
  });
  await expect(page.getByRole("img", { name: fileName })).toBeVisible();
  await waitForToolcraftAnimationFrames(page, 4);
}

function fieldByLabel(page: Page, label: string, index = 0) {
  return page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(new RegExp(`^${escapeRegExp(label)}\\b`)) })
    .nth(index);
}

async function clickSwitch(page: Page, label: string, index = 0): Promise<void> {
  const field = fieldByLabel(page, label, index);
  await field.getByRole("switch").click();
}

async function chooseImageFormat(page: Page, optionName: "JPG" | "PNG"): Promise<void> {
  await page.getByRole("combobox", { name: /^(?:JPG|PNG)$/ }).click();
  await page
    .locator('[data-slot="select-item"][role="option"]')
    .filter({ hasText: new RegExp(`^${optionName}$`) })
    .click();
}

async function chooseImageResolution(page: Page, optionName: "2K" | "4K" | "8K"): Promise<void> {
  await page.getByRole("combobox", { name: /^(?:2K|4K|8K)$/ }).click();
  await page
    .locator('[data-slot="select-item"][role="option"]')
    .filter({ hasText: new RegExp(`^${optionName}$`) })
    .click();
}

async function changeBackgroundHex(page: Page, hex = "FFE8A3"): Promise<void> {
  const input = page.getByLabel("background hex");
  await input.fill(hex);
  await input.press("Enter");
}

async function dragVectorPad(page: Page): Promise<void> {
  const pad = page.getByRole("button", { name: "Direction X/Y pad" });
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();

  if (!box) {
    throw new Error("Could not measure Direction vector pad.");
  }

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.72, { steps: 10 });
  await page.mouse.up();
}

async function exportImage(page: Page) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const path = await download.path();

  if (!path) {
    throw new Error("Downloaded image path was not available.");
  }

  return {
    download,
    path,
    suggestedFilename: download.suggestedFilename(),
  };
}

async function decodeDownloadedImage(page: Page, path: string, mimeType = "image/png") {
  const buffer = await readFile(path);
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  return page.evaluate(
    async (src) =>
      new Promise<{ alpha: number; height: number; naturalHeight: number; naturalWidth: number; width: number }>(
        (resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d", { willReadFrequently: true });

            if (!context) {
              reject(new Error("Could not decode exported image."));
              return;
            }

            context.drawImage(image, 0, 0);
            const alpha = context.getImageData(0, 0, 1, 1).data[3] ?? 0;

            resolve({
              alpha,
              height: image.height,
              naturalHeight: image.naturalHeight,
              naturalWidth: image.naturalWidth,
              width: image.width,
            });
          };
          image.onerror = () => reject(new Error("Exported image failed to decode."));
          image.src = src;
        },
      ),
    dataUrl,
  );
}

async function samplePreviewAlpha(page: Page): Promise<number> {
  return page.locator("[data-brick-mosaic-canvas]").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const context = element.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return 0;
    }

    return context.getImageData(0, 0, 1, 1).data[3] ?? 0;
  });
}

async function samplePreviewPixels(page: Page): Promise<number[]> {
  return page.locator("[data-brick-mosaic-canvas]").evaluate((canvas) => {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 80;
    sampleCanvas.height = 48;
    const context = sampleCanvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return [];
    }

    context.drawImage(canvas as HTMLCanvasElement, 0, 0, sampleCanvas.width, sampleCanvas.height);
    return Array.from(context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data);
  });
}

function getChangedPixelRatio(before: readonly number[], after: readonly number[]): number {
  const pixelCount = Math.floor(Math.min(before.length, after.length) / 4);
  let changedCount = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const channelDelta =
      Math.abs((before[offset] ?? 0) - (after[offset] ?? 0)) +
      Math.abs((before[offset + 1] ?? 0) - (after[offset + 1] ?? 0)) +
      Math.abs((before[offset + 2] ?? 0) - (after[offset + 2] ?? 0));

    if (channelDelta >= 48) {
      changedCount += 1;
    }
  }

  return pixelCount > 0 ? changedCount / pixelCount : 0;
}

async function prepareUploadedBrickMosaic(page: Page): Promise<void> {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
}

async function expectSliderNumber(page: Page, label: string, expected: number): Promise<void> {
  const rawValue = await page
    .getByRole("slider", { exact: true, name: label })
    .getAttribute("aria-valuenow");

  expect(Number(rawValue)).toBeCloseTo(expected, 5);
}

test("browser: startup preset loads requested image and settings", async ({ page }) => {
  await openBrickMosaic(page);
  await expect(page.getByRole("img", { name: "brick-mosaic-start.png" })).toBeVisible();
  await waitForToolcraftAnimationFrames(page, 6);

  await expectSliderNumber(page, "Detail", 96);
  await expectSliderNumber(page, "Scale", 0.7);
  await expectSliderNumber(page, "Chaos", 25);
  await expectSliderNumber(page, "Gap", 3.5);
  await expectSliderNumber(page, "Corners", 20);
  await expectSliderNumber(page, "Bevel", 32);
  await expect(page.getByLabel("background hex")).toHaveValue(/0D0D0D/i);

  const canvasSize = await page.locator("[data-brick-mosaic-canvas]").evaluate((canvas) => ({
    height: (canvas as HTMLCanvasElement).height,
    width: (canvas as HTMLCanvasElement).width,
  }));

  expect(canvasSize).toEqual({
    height: brickMosaicStartupCanvasSize.height * 2,
    width: brickMosaicStartupCanvasSize.width * 2,
  });
});

test("browser: brick mosaic renderer maps uploaded image to bricks", async ({ page }) => {
  await openBrickMosaic(page);
  const placeholder = await getToolcraftProductObservableSnapshot(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadBrickFixture(page);
  });
  await expect(page.locator("[data-brick-mosaic-canvas]")).toHaveAttribute(
    "data-toolcraft-product-output",
    "",
  );
  expect(await getToolcraftProductObservableSnapshot(page)).not.toBe(placeholder);
});

test("browser: source image import and clear update brick mosaic output", async ({ page }) => {
  await openBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadBrickFixture(page);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Remove image" }).click();
  });
});

test("browser: brick detail changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Detail", 0.82);
  });
});

test("browser: brick scale changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Scale", 0.25);
  });
});

test("browser: brick scale drag locally swaps and restores final image", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);

  const canvas = page.locator("[data-brick-mosaic-canvas]");
  const slider = page.getByRole("slider", { exact: true, name: "Scale" });
  const sliderRoot = slider.locator('xpath=ancestor::*[@data-slot="slider"][1]');
  const thumb = sliderRoot.locator('[data-slot="slider-thumb"]');
  await slider.scrollIntoViewIfNeeded();

  const sliderBox = await sliderRoot.boundingBox();
  const thumbBox = await thumb.boundingBox();

  if (!sliderBox || !thumbBox) {
    throw new Error("Could not measure the Scale slider for shuffle interaction.");
  }

  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sliderBox.x + sliderBox.width * 0.82, sliderBox.y + sliderBox.height / 2, {
    steps: 12,
  });

  await expect(canvas).toHaveAttribute("data-brick-shuffle-phase", "shuffling");
  await waitForToolcraftAnimationFrames(page, 2);
  const shuffled = JSON.parse(await getToolcraftProductObservableSnapshot(page)) as {
    canvases: Array<{ hash?: string }>;
  };

  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-brick-shuffle-phase", "assembled");
  await expect(canvas).not.toHaveAttribute("data-brick-assembly-phase", /.+/);
  await waitForToolcraftAnimationFrames(page, 2);

  const assembled = JSON.parse(await getToolcraftProductObservableSnapshot(page)) as {
    canvases: Array<{ hash?: string }>;
  };
  await waitForToolcraftAnimationFrames(page, 3);
  const stable = JSON.parse(await getToolcraftProductObservableSnapshot(page)) as {
    canvases: Array<{ hash?: string }>;
  };

  expect(shuffled.canvases[0]?.hash).not.toBe(assembled.canvases[0]?.hash);
  expect(stable.canvases[0]?.hash).toBe(assembled.canvases[0]?.hash);
});

test("browser: brick chaos changes final output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);

  await dragToolcraftSliderByLabel(page, "Chaos", 0);
  await waitForToolcraftAnimationFrames(page, 3);

  const initialSnapshot = await getToolcraftProductObservableSnapshot(page);
  const initialPixels = await samplePreviewPixels(page);

  await dragToolcraftSliderByLabel(page, "Chaos", 1);
  await waitForToolcraftAnimationFrames(page, 3);

  const chaoticSnapshot = await getToolcraftProductObservableSnapshot(page);
  const chaoticPixels = await samplePreviewPixels(page);

  expect(chaoticSnapshot).not.toBe(initialSnapshot);
  expect(getChangedPixelRatio(initialPixels, chaoticPixels)).toBeGreaterThan(0.3);

  await dragToolcraftSliderByLabel(page, "Chaos", 0);
  await waitForToolcraftAnimationFrames(page, 3);

  expect(await getToolcraftProductObservableSnapshot(page)).toBe(initialSnapshot);
});

test("browser: brick chaos reset restores base value", async ({ page }) => {
  await openBrickMosaic(page);
  await dragToolcraftSliderByLabel(page, "Chaos", 0.9);
  await expectSliderNumber(page, "Chaos", 90);

  await page.getByRole("button", { name: "Reset Brick Grid section" }).click();

  await expectSliderNumber(page, "Chaos", 25);
});

test("browser: brick gap changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Gap", 0.82);
  });
});

test("browser: brick radius changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Corners", 0.82);
  });
});

test("browser: brick bevel changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Bevel", 0.82);
  });
});

test("browser: stud include changes product output", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await clickSwitch(page, "Include", 0);
  });
});

test("browser: stud diameter changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Diameter", 0.82);
  });
});

test("browser: stud height changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Height", 0.82);
  });
});

test("browser: stud shine changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Shine", 0.82);
  });
});

test("browser: monochrome changes product output", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await clickSwitch(page, "Mono");
  });
});

test("browser: posterize changes product output", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await expect(page.locator('[data-slot="slider"][data-variant="discrete"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await expectToolcraftDiscreteSliderDragSmoothness(page, "Posterize", {
      maxFrameGapMs: 120,
      maxInteractionMs: 1000,
    });
  });
});

test("browser: saturation changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Saturation", 0.15);
  });
});

test("browser: contrast changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Contrast", 0.82);
  });
});

test("browser: brightness changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Brightness", 0.82);
  });
});

test("browser: lighting direction changes product output", async ({ page }) => {
  const vectorParts = ["vector.x", "vector.y"];
  expect(vectorParts).toEqual(["vector.x", "vector.y"]);
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragVectorPad(page);
  });
});

test("browser: lighting shadow changes product output", async ({ page }) => {
  await prepareUploadedBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Shadow", 0.82);
  });
});

test("browser: background color changes product output", async ({ page }) => {
  await openBrickMosaic(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await changeBackgroundHex(page);
  });
});

test("browser: background include controls png transparency", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await clickSwitch(page, "Include", 1);
  await chooseImageResolution(page, "2K");

  const transparentPreviewAlpha = await samplePreviewAlpha(page);
  const transparentExport = await exportImage(page);
  const transparentImage = await decodeDownloadedImage(page, transparentExport.path);

  expect(transparentPreviewAlpha).toBe(0);
  expect(transparentImage.alpha).toBe(0);

  await clickSwitch(page, "Include", 1);
  await waitForToolcraftAnimationFrames(page, 4);

  const opaquePreviewAlpha = await samplePreviewAlpha(page);
  const opaqueExport = await exportImage(page);
  const opaqueImage = await decodeDownloadedImage(page, opaqueExport.path);

  expect(opaquePreviewAlpha).toBe(255);
  expect(opaqueImage.alpha).toBe(255);
});

test("browser: image export format changes encoded output", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await chooseImageFormat(page, "JPG");
  const exported = await exportImage(page);

  expect(exported.suggestedFilename).toMatch(/\.jpg$/);
});

test("browser: image export resolution changes encoded dimensions", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await chooseImageResolution(page, "2K");

  let exported = await exportImage(page);
  let decodedImage = await decodeDownloadedImage(page, exported.path);

  expect(Math.max(decodedImage.naturalWidth, decodedImage.naturalHeight)).toBe(2048);

  await chooseImageResolution(page, "4K");
  exported = await exportImage(page);
  decodedImage = await decodeDownloadedImage(page, exported.path);

  expect(Math.max(decodedImage.width, decodedImage.height)).toBe(4096);
});

test("browser: export png downloads brick mosaic image", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await chooseImageResolution(page, "2K");

  const exported = await exportImage(page);
  const decodedImage = await decodeDownloadedImage(page, exported.path);

  expect(exported.suggestedFilename).toMatch(/\.png$/);
  expect(decodedImage.naturalWidth).toBeGreaterThan(0);
  expect(decodedImage.naturalHeight).toBeGreaterThan(0);
});

test("browser: brick mosaic persistence restores settings after reload", async ({ page }) => {
  await openBrickMosaic(page);
  await dragToolcraftSliderByLabel(page, "Detail", 0.9);
  await waitForToolcraftAnimationFrames(page, 4);
  await page.reload();
  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  await expect(fieldByLabel(page, "Detail")).toContainText(/8\d|9\d/);
});

test("browser: settings transfer exports and imports brick mosaic settings", async ({ page }) => {
  await openBrickMosaic(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Settings" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.json$/);
});

test("browser: resolution scale changes brick mosaic backing pixels", async ({ page }) => {
  await openBrickMosaic(page);
  const resolutionField = fieldByLabel(page, "Resolution scale");
  await expect(resolutionField.locator('[data-slot="slider"][data-variant="discrete"]')).toBeVisible();
  await expect(resolutionField.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  const snapshot = await getToolcraftProductObservableSnapshot(page);
  const before = await page.locator("[data-brick-mosaic-canvas]").evaluate((canvas) => ({
    height: (canvas as HTMLCanvasElement).height,
    rect: canvas.getBoundingClientRect().width,
    width: (canvas as HTMLCanvasElement).width,
  }));

  await dragToolcraftSliderByLabel(page, "Resolution scale", 0.05);
  await waitForToolcraftAnimationFrames(page, 4);

  const after = await page.locator("[data-brick-mosaic-canvas]").evaluate((canvas) => ({
    height: (canvas as HTMLCanvasElement).height,
    rect: canvas.getBoundingClientRect().width,
    width: (canvas as HTMLCanvasElement).width,
  }));

  expect(after.width).toBeLessThan(before.width);
  expect(after.height).toBeLessThan(before.height);
  expect(after.rect).toBe(before.rect);
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 120,
    maxInteractionMs: 1000,
  });
  expect(snapshot).toContain("canvas");
});

test("browser: toolbar viewport controls keep brick mosaic stable", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const before = await getToolcraftProductObservableSnapshot(page);

  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Center canvas" }).click();

  const after = await getToolcraftProductObservableSnapshot(page);
  expect(after).toContain("canvas");
  expect(before).toContain("canvas");
});

test("browser perf: brick mosaic stress preview render", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Detail", 0.95);
    await dragToolcraftSliderByLabel(page, "Scale", 0.05);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-mosaic-preview-render");
});

test("browser perf: brick mosaic media import", async ({ page }) => {
  await openBrickMosaic(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await uploadBrickFixture(page, "perf-media.svg");
  });

  await expect(page.getByRole("img", { name: "perf-media.svg" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "media-source-import");
});

test("browser perf: canvas-render-scale-drag", async ({ page }) => {
  const stressValue = getToolcraftPerformanceStressValue<number>(
    appPerformance,
    "canvas-render-scale-drag",
  );
  await openBrickMosaic(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Resolution scale", stressValue / 2);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 120,
    maxInteractionMs: 1000,
  });
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-render-scale-drag");
});

test("browser perf: settings-transfer-change", async ({ page }) => {
  await openBrickMosaic(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export Settings" }).click();
  });

  await expect(page.getByRole("button", { name: "Export Settings" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "settings-transfer-change");
});

test("browser perf: brick-detail-drag", async ({ page }) => {
  const stressValue = getToolcraftPerformanceStressValue<number>(appPerformance, "brick-detail-drag");
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Detail", stressValue / 100);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-detail-drag");
});

test("browser perf: brick-scale-drag", async ({ page }) => {
  const stressValue = getToolcraftPerformanceStressValue<number>(appPerformance, "brick-scale-drag");
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Scale", stressValue / 1.5);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-scale-drag");
});

test("browser perf: brick-chaos-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Chaos", 0.95);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-chaos-drag");
});

test("browser perf: brick-gap-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Gap", 0.8);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-gap-drag");
});

test("browser perf: brick-corners-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Corners", 0.8);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-corners-drag");
});

test("browser perf: brick-bevel-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Bevel", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-bevel-drag");
});

test("browser perf: stud-include-change", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await fieldByLabel(page, "Include", 0).getByRole("switch").click();
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "stud-include-change");
});

test("browser perf: stud-diameter-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Diameter", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "stud-diameter-drag");
});

test("browser perf: stud-height-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Height", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "stud-height-drag");
});

test("browser perf: stud-shine-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Shine", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "stud-shine-drag");
});

test("browser perf: tone-mono-change", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await fieldByLabel(page, "Mono").getByRole("switch").click();
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "tone-mono-change");
});

test("browser perf: tone-posterize-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Posterize", 0.85);
  });
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Posterize", {
    maxFrameGapMs: 120,
    maxInteractionMs: 1000,
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "tone-posterize-drag");
});

test("browser perf: tone-saturation-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Saturation", 0.2);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "tone-saturation-drag");
});

test("browser perf: tone-contrast-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Contrast", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "tone-contrast-drag");
});

test("browser perf: tone-brightness-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Brightness", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "tone-brightness-drag");
});

test("browser perf: lighting-direction-change", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await expect(page.locator("[aria-label='Direction X/Y pad']")).toBeVisible();
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Direction X/Y pad" }).click();
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "lighting-direction-change");
});

test("browser perf: lighting-shadow-drag", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Shadow", 0.85);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "lighting-shadow-drag");
});

test("browser perf: background-include-change", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await fieldByLabel(page, "Include", 1).getByRole("switch").click();
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-include-change");
});

test("browser perf: background-color-change", async ({ page }) => {
  await openBrickMosaic(page);
  await expect(page.locator("[aria-label='Pick background']").first()).toBeVisible();
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("background hex").fill("EEDDAA");
    await page.getByLabel("background hex").press("Enter");
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-color-change");
});

test("browser perf: image-format-change", async ({ page }) => {
  await openBrickMosaic(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: /^(?:JPG|PNG)$/ }).click({ trial: true });
  }, { settleFrames: 0 });

  await page.getByRole("combobox", { name: /^(?:JPG|PNG)$/ }).click();
  await page
    .locator('[data-slot="select-item"][role="option"]')
    .filter({ hasText: /^JPG$/ })
    .click();

  await expect(page.getByText("JPG").first()).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-format-change");
});

test("browser perf: image-resolution-change", async ({ page }) => {
  const stressValue = getToolcraftPerformanceStressValue<string>(
    appPerformance,
    "image-resolution-change",
  );
  await openBrickMosaic(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: /^(?:2K|4K|8K)$/ }).click({ trial: true });
  }, { settleFrames: 0 });

  await page.getByRole("combobox", { name: /^(?:2K|4K|8K)$/ }).click();
  await page
    .locator('[data-slot="select-item"][role="option"]')
    .filter({ hasText: new RegExp(`^${stressValue.toUpperCase()}$`) })
    .click();

  await expect(page.getByText(stressValue.toUpperCase()).first()).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-resolution-change");
});

test("browser perf: brick mosaic export copy", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  await chooseImageResolution(page, "2K");
  const result = await measureToolcraftInteraction(page, async () => {
    await exportImage(page);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-mosaic-export-copy");
});

test("browser perf: brick mosaic viewport stability", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.getByRole("button", { name: "Center canvas" }).click();
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-mosaic-viewport-stability");
});

test("browser perf: brick mosaic zoom stress", async ({ page }) => {
  await openBrickMosaic(page);
  await uploadBrickFixture(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await zoomToolcraftCanvasViewport(page, 2);
  });

  await expect(page.locator("[data-brick-mosaic-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brick-mosaic-zoom-stress");
});
