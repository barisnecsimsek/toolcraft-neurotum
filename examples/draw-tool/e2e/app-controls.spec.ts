import { expect, test, type Page } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceWorkloadFixture,
  dragToolcraftCanvasViewport,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  expectToolcraftCanvasViewportStable,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  getToolcraftPerformanceWorkloadValue,
  measureToolcraftAnimationFrames,
  measureToolcraftInteraction,
  waitForToolcraftAnimationFrames,
  zoomToolcraftCanvasViewport,
} from "./performance-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";

type CapturedBlobInfo = {
  height: number;
  size: number;
  type: string;
  width: number;
};

async function openApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.addStyleTag({
    content:
      "[data-slot='toolcraft-runtime-app'] *, [data-slot='toolcraft-runtime-app'] *::before, [data-slot='toolcraft-runtime-app'] *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; scroll-behavior: auto !important; }",
  });
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  await waitForToolcraftAnimationFrames(page, 8);
}

function exactText(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

async function getField(page: Page, label: string, index = 0) {
  const field = page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(exactText(label)) })
    .nth(index);

  await expect(field, `Field "${label}" should be visible`).toBeVisible();
  return field;
}

async function commitTextField(page: Page, label: string, value: string): Promise<void> {
  const field = await getField(page, label);
  const input = field.locator("input").first();

  await input.fill(value);
  await input.press("Enter");
}

async function expectCanvasBackingSize(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.locator("[data-suminagashi-canvas]").evaluate((canvas) => ({
          height: (canvas as HTMLCanvasElement).height,
          width: (canvas as HTMLCanvasElement).width,
        })),
      { timeout: 5000 },
    )
    .toEqual({ height, width });
}

async function chooseSelect(page: Page, label: string, option: string, index = 0): Promise<void> {
  const field = await getField(page, label, index);

  await field.locator('[data-slot="select-trigger"]').first().click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: exactText(option) }).last().click();
}

async function clickSwitch(page: Page, label: string): Promise<void> {
  const field = await getField(page, label);
  const switchControl = field.locator('[role="switch"]').first();

  await expect(switchControl, `Switch "${label}" should be visible`).toBeVisible();
  await switchControl.click();
}

async function setBackgroundColor(page: Page, hex: string): Promise<void> {
  const input = page.locator('input[aria-label$=" hex"]').last();

  await expect(input, "Background hex input should be visible").toBeVisible();
  await input.fill(hex);
  await input.press("Enter");
}

async function drawStroke(page: Page): Promise<void> {
  const canvas = page.locator("[data-suminagashi-canvas]");
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Suminagashi canvas was not measurable.");
  }

  const startX = box.x + box.width * 0.42;
  const startY = box.y + box.height * 0.52;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + box.width * 0.08, startY - box.height * 0.05, {
    steps: 12,
  });
  await page.mouse.up();
  await waitForToolcraftAnimationFrames(page, 8);
}

async function drawFastStroke(page: Page): Promise<void> {
  const canvas = page.locator("[data-suminagashi-canvas]");
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Suminagashi canvas was not measurable.");
  }

  const startX = box.x + box.width * 0.24;
  const startY = box.y + box.height * 0.52;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + box.width * 0.48, startY - box.height * 0.04, {
    steps: 2,
  });
  await page.mouse.up();
  await waitForToolcraftAnimationFrames(page, 10);
}

async function countDarkSamplesAlongFastStroke(page: Page): Promise<number> {
  return page.locator("[data-suminagashi-canvas]").evaluate((sourceCanvas) => {
    const canvas = sourceCanvas as HTMLCanvasElement;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not create sampling canvas.");
    }

    context.drawImage(canvas, 0, 0);
    const samples = 25;
    let darkSamples = 0;

    for (let index = 0; index < samples; index += 1) {
      const t = index / (samples - 1);
      const x = Math.round(canvas.width * (0.24 + 0.48 * t));
      const y = Math.round(canvas.height * (0.52 - 0.04 * t));
      const [red, green, blue] = context.getImageData(x, y, 1, 1).data;
      const distanceFromPaper = Math.abs(red - 239) + Math.abs(green - 234) + Math.abs(blue - 224);

      if (distanceFromPaper > 32) {
        darkSamples += 1;
      }
    }

    return darkSamples;
  });
}

async function countDarkCanvasSamples(page: Page): Promise<number> {
  return page.locator("[data-suminagashi-canvas]").evaluate((sourceCanvas) => {
    const canvas = sourceCanvas as HTMLCanvasElement;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not create sampling canvas.");
    }

    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let darkSamples = 0;

    for (let y = 0; y < canvas.height; y += 24) {
      for (let x = 0; x < canvas.width; x += 24) {
        const offset = (y * canvas.width + x) * 4;
        const red = data[offset] ?? 239;
        const green = data[offset + 1] ?? 234;
        const blue = data[offset + 2] ?? 224;
        const distanceFromPaper =
          Math.abs(red - 239) + Math.abs(green - 234) + Math.abs(blue - 224);

        if (distanceFromPaper > 32) {
          darkSamples += 1;
        }
      }
    }

    return darkSamples;
  });
}

async function samplePaintedInkAverage(page: Page): Promise<{
  blue: number;
  count: number;
  green: number;
  red: number;
}> {
  return page.locator("[data-suminagashi-canvas]").evaluate((sourceCanvas) => {
    const canvas = sourceCanvas as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 160;
    sample.height = 90;
    const context = sample.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not create sampling canvas.");
    }

    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const data = context.getImageData(0, 0, sample.width, sample.height).data;
    let blue = 0;
    let count = 0;
    let green = 0;
    let red = 0;

    for (let y = 0; y < sample.height; y += 1) {
      for (let x = 0; x < sample.width; x += 1) {
        const offset = (y * sample.width + x) * 4;
        const nextRed = data[offset] ?? 239;
        const nextGreen = data[offset + 1] ?? 234;
        const nextBlue = data[offset + 2] ?? 224;
        const distanceFromPaper =
          Math.abs(nextRed - 239) + Math.abs(nextGreen - 234) + Math.abs(nextBlue - 224);

        if (distanceFromPaper > 25) {
          red += nextRed;
          green += nextGreen;
          blue += nextBlue;
          count += 1;
        }
      }
    }

    return {
      blue: Math.round(blue / Math.max(1, count)),
      count,
      green: Math.round(green / Math.max(1, count)),
      red: Math.round(red / Math.max(1, count)),
    };
  });
}

async function sumDarknessAlongFastStroke(page: Page): Promise<number> {
  return page.locator("[data-suminagashi-canvas]").evaluate((sourceCanvas) => {
    const canvas = sourceCanvas as HTMLCanvasElement;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not create sampling canvas.");
    }

    context.drawImage(canvas, 0, 0);
    let darkness = 0;

    for (let index = 0; index < 25; index += 1) {
      const t = index / 24;
      const x = Math.round(canvas.width * (0.24 + 0.48 * t));
      const y = Math.round(canvas.height * (0.52 - 0.04 * t));
      const [red, green, blue] = context.getImageData(x, y, 1, 1).data;

      darkness += Math.abs(red - 239) + Math.abs(green - 234) + Math.abs(blue - 224);
    }

    return darkness;
  });
}

async function sampleCanvasPixels(page: Page): Promise<number[]> {
  return page.locator("[data-suminagashi-canvas]").evaluate((sourceCanvas) => {
    const canvas = sourceCanvas as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 160;
    sample.height = 90;
    const context = sample.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not create sampling canvas.");
    }

    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    return Array.from(context.getImageData(0, 0, sample.width, sample.height).data);
  });
}

function averageRgbDiff(before: readonly number[], after: readonly number[]): number {
  let total = 0;
  const pixels = Math.max(1, Math.floor(Math.min(before.length, after.length) / 4));

  for (let index = 0; index < pixels * 4; index += 4) {
    total += Math.abs((before[index] ?? 0) - (after[index] ?? 0));
    total += Math.abs((before[index + 1] ?? 0) - (after[index + 1] ?? 0));
    total += Math.abs((before[index + 2] ?? 0) - (after[index + 2] ?? 0));
  }

  return total / pixels;
}

function rgbStandardDeviation(pixels: readonly number[]): number {
  const count = Math.max(1, Math.floor(pixels.length / 4));
  let total = 0;
  let totalSquared = 0;

  for (let index = 0; index < count * 4; index += 4) {
    const value =
      ((pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0)) /
      3;

    total += value;
    totalSquared += value * value;
  }

  const mean = total / count;
  const variance = Math.max(0, totalSquared / count - mean * mean);

  return Math.sqrt(variance);
}

async function enableStrongPaperTexture(page: Page): Promise<void> {
  await clickSwitch(page, "Texture");
  await dragToolcraftSliderByLabel(page, "Grain", 1);
  await dragToolcraftSliderByLabel(page, "Fiber", 1);
  await dragToolcraftSliderByLabel(page, "Mottle", 1);
  await waitForToolcraftAnimationFrames(page, 4);
}

async function measurePostReleaseSettleMotion(page: Page, settleRatio: number): Promise<number> {
  await dragToolcraftSliderByLabel(page, "Wetness", 1);
  await dragToolcraftSliderByLabel(page, "Settle", settleRatio);
  await beginHeldStroke(page);
  await waitForToolcraftAnimationFrames(page, 8);
  await page.mouse.up();
  await waitForToolcraftAnimationFrames(page, 10);
  const before = await sampleCanvasPixels(page);
  await waitForToolcraftAnimationFrames(page, 34);
  const after = await sampleCanvasPixels(page);

  return averageRgbDiff(before, after);
}

async function measurePostReleaseTaperMotion(page: Page, taperRatio: number): Promise<number> {
  await dragToolcraftSliderByLabel(page, "Wetness", 1);
  await dragToolcraftSliderByLabel(page, "Settle", 0);
  await dragToolcraftSliderByLabel(page, "Taper", taperRatio);
  await dragToolcraftSliderByLabel(page, "Flow", 1);
  await beginHeldStroke(page);
  await waitForToolcraftAnimationFrames(page, 8);
  await page.mouse.up();
  await waitForToolcraftAnimationFrames(page, 28);
  const before = await sampleCanvasPixels(page);
  await waitForToolcraftAnimationFrames(page, 34);
  const after = await sampleCanvasPixels(page);

  return averageRgbDiff(before, after);
}

async function beginHeldStroke(page: Page): Promise<void> {
  const canvas = page.locator("[data-suminagashi-canvas]");
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Suminagashi canvas was not measurable.");
  }

  const startX = box.x + box.width * 0.34;
  const startY = box.y + box.height * 0.54;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + box.width * 0.24, startY - box.height * 0.08, {
    steps: 10,
  });
  await waitForToolcraftAnimationFrames(page, 6);
}

async function hoverDrawingSurface(page: Page): Promise<void> {
  const canvas = page.locator("[data-suminagashi-canvas]");
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error("Suminagashi canvas was not measurable.");
  }

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await waitForToolcraftAnimationFrames(page, 8);
}

async function installBlobCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as Window & {
      __suminagashiCapturedBlobs?: Blob[];
      __suminagashiOriginalCreateObjectURL?: typeof URL.createObjectURL;
    };

    win.__suminagashiCapturedBlobs = [];

    if (!win.__suminagashiOriginalCreateObjectURL) {
      win.__suminagashiOriginalCreateObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (object: Blob | MediaSource) => {
        if (object instanceof Blob) {
          win.__suminagashiCapturedBlobs?.push(object);
        }

        return win.__suminagashiOriginalCreateObjectURL!(object);
      };
    }
  });
}

async function readLatestImageBlob(page: Page): Promise<CapturedBlobInfo> {
  return page.evaluate(async () => {
    const win = window as Window & { __suminagashiCapturedBlobs?: Blob[] };
    const blob = win.__suminagashiCapturedBlobs?.at(-1);

    if (!blob) {
      throw new Error("No captured image blob.");
    }

    const image = await createImageBitmap(blob);
    const info = {
      height: image.height,
      size: blob.size,
      type: blob.type,
      width: image.width,
    };

    image.close();
    return info;
  });
}

async function waitForCapturedBlob(page: Page, count: number): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const win = window as Window & { __suminagashiCapturedBlobs?: Blob[] };
          return win.__suminagashiCapturedBlobs?.length ?? 0;
        }),
      { timeout: 10000 },
    )
    .toBeGreaterThanOrEqual(count);
}

test("browser: canvas sizing controls drive the WebGL output size", async ({ page }) => {
  await openApp(page);

  const initial = await page.locator("[data-suminagashi-canvas]").evaluate((canvas) => ({
    height: (canvas as HTMLCanvasElement).height,
    width: (canvas as HTMLCanvasElement).width,
  }));

  expect(initial.width).toBe(3840);
  expect(initial.height).toBe(2160);

  await commitTextField(page, "Canvas width", "1600");
  await commitTextField(page, "Canvas height", "900");
  await expectCanvasBackingSize(page, 3200, 1800);
});

test("browser: resolution scale controls WebGL backing pixels", async ({ page }) => {
  await openApp(page);
  const field = await getField(page, "Resolution scale");

  await expect(field.locator('[data-slot="slider"][data-variant="discrete"]')).toBeVisible();
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Resolution scale", 0.5);
    await waitForToolcraftAnimationFrames(page, 14);
  });
});

test("browser: ink palette family and shade affect drawn ink", async ({ page }) => {
  await openApp(page);
  const paletteFamilyPart = "palette.family";
  const paletteShadePart = "palette.shade";
  const referencePaletteParity = "reference control-mapping parity";

  expect([paletteFamilyPart, paletteShadePart]).toEqual(["palette.family", "palette.shade"]);
  expect(referencePaletteParity).toContain("reference");

  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByLabel("Primary family Blue").click({ force: true });
    await page.getByLabel("Primary shade 900").click({ force: true });
    await drawStroke(page);
  });

  const paintedInk = await samplePaintedInkAverage(page);
  expect(paintedInk.count).toBeGreaterThan(0);
  expect(paintedInk.blue).toBeGreaterThan(paintedInk.red);
  expect(paintedInk.blue).toBeGreaterThan(paintedInk.green);
});

test("browser: brush size changes stroke thickness", async ({ page }) => {
  await openApp(page);
  await dragToolcraftSliderByLabel(page, "Size", 0);
  await drawFastStroke(page);
  const smallBrushCoverage = await countDarkCanvasSamples(page);

  await page.reload();
  await openApp(page);
  await dragToolcraftSliderByLabel(page, "Size", 1);
  await drawFastStroke(page);

  expect(await countDarkCanvasSamples(page)).toBeGreaterThan(smallBrushCoverage * 1.4);
});

test("browser: brush load changes pigment density", async ({ page }) => {
  await openApp(page);
  await dragToolcraftSliderByLabel(page, "Load", 0);
  await drawFastStroke(page);
  const lightLoadDarkness = await sumDarknessAlongFastStroke(page);

  await page.reload();
  await openApp(page);
  await dragToolcraftSliderByLabel(page, "Load", 1);
  await drawFastStroke(page);

  expect(await sumDarknessAlongFastStroke(page)).toBeGreaterThan(lightLoadDarkness * 1.2);
});

test("browser: brush wetness changes immediate spread", async ({ page }) => {
  await openApp(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Wetness", 1);
    await beginHeldStroke(page);
    await waitForToolcraftAnimationFrames(page, 18);
    await page.mouse.up();
  });
});

test("browser: brush settle changes post-release stop timing", async ({ page }) => {
  await openApp(page);
  const blankSnapshot = await getToolcraftProductObservableSnapshot(page);
  const shortSettleMotion = await measurePostReleaseSettleMotion(page, 0);

  await page.reload();
  await openApp(page);
  const longSettleMotion = await measurePostReleaseSettleMotion(page, 1);

  expect(await getToolcraftProductObservableSnapshot(page)).not.toBe(blankSnapshot);
  expect(longSettleMotion).toBeGreaterThan(shortSettleMotion + 0.3);
});

test("browser: brush taper smooths post-release flow stop", async ({ page }) => {
  await openApp(page);
  const sharpStopMotion = await measurePostReleaseTaperMotion(page, 0);

  await page.reload();
  await openApp(page);
  const smoothStopMotion = await measurePostReleaseTaperMotion(page, 1);

  expect(smoothStopMotion).toBeGreaterThan(0.3);
  expect(smoothStopMotion).toBeGreaterThan(sharpStopMotion + 0.3);
});

test("browser: brush flow changes water movement strength", async ({ page }) => {
  await openApp(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Flow", 1);
    await drawFastStroke(page);
  });
});

test("browser: fast strokes render as a continuous brush path", async ({ page }) => {
  await openApp(page);

  await drawFastStroke(page);

  expect(await countDarkSamplesAlongFastStroke(page)).toBeGreaterThanOrEqual(18);
});

test("browser: auto flow toggles autonomous reference drops", async ({ page }) => {
  await openApp(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await clickSwitch(page, "Auto");
    await page.waitForTimeout(5200);
  });

  await clickSwitch(page, "Auto");
});

test("browser: clear action fades ink to blank", async ({ page }) => {
  await openApp(page);
  await drawStroke(page);
  const paintedSamples = await countDarkCanvasSamples(page);

  expect(paintedSamples).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Clear" }).click();
  await waitForToolcraftAnimationFrames(page, 16);

  expect(await countDarkCanvasSamples(page)).toBeLessThanOrEqual(1);
});

test("browser: background include controls preview and png alpha", async ({ page }) => {
  await openApp(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await clickSwitch(page, "Include");
    await waitForToolcraftAnimationFrames(page, 4);
  });
});

test("browser: background color changes flat paper color", async ({ page }) => {
  await openApp(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await setBackgroundColor(page, "#e8dcc7");
    await waitForToolcraftAnimationFrames(page, 4);
  });
});

test("browser: paper texture controls paper surface", async ({ page }) => {
  await openApp(page);
  const flatPixels = await sampleCanvasPixels(page);
  const flatVariation = rgbStandardDeviation(flatPixels);

  await expectToolcraftProductObservableToChange(page, async () => {
    await enableStrongPaperTexture(page);
  });

  const texturedPixels = await sampleCanvasPixels(page);

  expect(averageRgbDiff(flatPixels, texturedPixels)).toBeGreaterThan(0.4);
  expect(rgbStandardDeviation(texturedPixels)).toBeGreaterThan(flatVariation + 0.4);
});

test("browser: image format controls exported image type", async ({ page }) => {
  await openApp(page);
  await installBlobCapture(page);
  await chooseSelect(page, "Format", "JPG", 0);
  await page.getByRole("button", { name: "Export PNG" }).click();
  await waitForCapturedBlob(page, 1);

  const image = await readLatestImageBlob(page);
  expect(image.type).toBe("image/jpeg");
  expect(image.width).toBeGreaterThan(0);
  expect(image.height).toBeGreaterThan(0);
});

test("browser: image resolution controls exported image dimensions", async ({ page }) => {
  await openApp(page);
  await installBlobCapture(page);

  await chooseSelect(page, "Resolution", "2K", 0);
  await page.getByRole("button", { name: "Export PNG" }).click();
  await waitForCapturedBlob(page, 1);
  const image2k = await readLatestImageBlob(page);

  await chooseSelect(page, "Resolution", "4K", 0);
  await page.getByRole("button", { name: "Export PNG" }).click();
  await waitForCapturedBlob(page, 2);
  const image4k = await readLatestImageBlob(page);

  expect(image2k.width).toBe(2048);
  expect(image4k.width).toBe(4096);
  expect(image4k.height).toBeGreaterThan(image2k.height);
  // export.image.resolution proves image resolution controls actual decoded pixels.
});

test("browser: exports still image output", async ({ page }) => {
  await openApp(page);
  await installBlobCapture(page);
  const referenceExportParity = "reference export-copy parity";
  expect(referenceExportParity).toContain("reference");
  await expect(page.getByRole("button", { name: "Export Video" })).toHaveCount(0);
  await expect(page.getByText("Video Export")).toHaveCount(0);

  await chooseSelect(page, "Resolution", "2K", 0);
  await page.getByRole("button", { name: "Export PNG" }).click();
  await waitForCapturedBlob(page, 1);
  const image = await readLatestImageBlob(page);
  expect(image.width).toBe(2048);
  expect(image.size).toBeGreaterThan(0);
});

test("browser: renderer loop preserves reference state and cadence", async ({ page }) => {
  await openApp(page);
  await drawStroke(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await waitForToolcraftAnimationFrames(page, 30);
  });
});

test("browser: renderer spreads ink before pointer release", async ({ page }) => {
  await openApp(page);
  await dragToolcraftSliderByLabel(page, "Wetness", 1);
  await beginHeldStroke(page);

  try {
    const before = await getToolcraftProductObservableSnapshot(page);

    await waitForToolcraftAnimationFrames(page, 28);

    expect(await getToolcraftProductObservableSnapshot(page)).not.toBe(before);
  } finally {
    await page.mouse.up();
  }
});

test("browser: renderer state persists dye and velocity between frames", async ({ page }) => {
  await openApp(page);
  await drawStroke(page);
  const referenceStateLifetime = "reference renderer-state lifetime parity";
  expect(referenceStateLifetime).toContain("reference");

  await expectToolcraftProductObservableToChange(page, async () => {
    await waitForToolcraftAnimationFrames(page, 30);
  });
});

test("browser: renderer time progress advances painted simulation", async ({ page }) => {
  await openApp(page);
  await drawStroke(page);
  const before = await getToolcraftProductObservableSnapshot(page);

  await waitForToolcraftAnimationFrames(page, 40);

  expect(await getToolcraftProductObservableSnapshot(page)).not.toBe(before);
});

test("browser: settings persist after browser reload", async ({ page }) => {
  await openApp(page);
  await setBackgroundColor(page, "#e8dcc7");
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();

  await expect(page.locator('input[aria-label$=" hex"]').last()).toHaveValue(/e8dcc7/i);
});

test("browser: settings transfer is explicitly session-only", async ({ page }) => {
  await openApp(page);

  await expect(page.getByRole("button", { name: "Export Settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Import Settings" })).toHaveCount(0);
});

test("browser perf: animation frames stay responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "animation-frame", {
    autoFlow: async (value) => {
      if (value === true) {
        await clickSwitch(page, "Auto");
      }
    },
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });
  await drawStroke(page);
  await page.waitForTimeout(1200);
  await hoverDrawingSurface(page);

  const result = await measureToolcraftAnimationFrames(page, 120);

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "animation-frame");
});

test("browser perf: preview render stays under budget", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "preview-render", {
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 10);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "preview-render");
});

test("browser perf: render scale drag stays responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceWorkloadValue(appPerformance, "render-scale-drag");
  await dragToolcraftSliderByLabel(page, "Resolution scale", 1);
  await dragToolcraftSliderToPerformanceStressValue(
    page,
    "Resolution scale",
    appPerformance,
    "render-scale-drag",
  );
  await waitForToolcraftAnimationFrames(page, 14);

  const result = await measureToolcraftInteraction(page, async () => {
    await page.evaluate(() => undefined);
  }, { settleFrames: 0 });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "render-scale-drag");
});

test("browser perf: canvas aspect ratio changes stay responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceWorkloadValue(appPerformance, "canvas-aspect-ratio-change");
  getToolcraftPerformanceStressValue(appPerformance, "canvas-aspect-ratio-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelect(page, "Aspect ratio", "4:3");
    await expectCanvasBackingSize(page, 2880, 2160);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-aspect-ratio-change");
});

test("browser perf: canvas width changes stay responsive", async ({ page }) => {
  await openApp(page);
  const value = getToolcraftPerformanceStressValue<{ width: number }>(
    appPerformance,
    "canvas-width-change",
  ).width;

  const result = await measureToolcraftInteraction(page, async () => {
    await commitTextField(page, "Canvas width", String(value));
    await expectCanvasBackingSize(page, value * 2, 2160);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-width-change");
});

test("browser perf: canvas height changes stay responsive", async ({ page }) => {
  await openApp(page);
  const value = getToolcraftPerformanceStressValue<{ height: number }>(
    appPerformance,
    "canvas-height-change",
  ).height;

  const result = await measureToolcraftInteraction(page, async () => {
    await commitTextField(page, "Canvas height", String(value));
    await expectCanvasBackingSize(page, 3840, value * 2);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-height-change");
});

test("browser perf: palette changes stay responsive", async ({ page }) => {
  await openApp(page);
  const value = getToolcraftPerformanceStressValue<{ family: string; shade: string }>(
    appPerformance,
    "ink-palette-change",
  );
  await page.getByLabel(`Primary family ${value.family}`).click({ force: true });
  await page.getByLabel(`Primary shade ${value.shade}`).click({ force: true });

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "ink-palette-change");
});

test("browser perf: brush size changes stay responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "brush-size-change", {
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });
  await drawStroke(page);
  getToolcraftPerformanceStressValue(appPerformance, "brush-size-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "brush-size-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brush-size-change");
});

test("browser perf: brush load changes stay responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "brush-load-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Load", appPerformance, "brush-load-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brush-load-change");
});

test("browser perf: brush wetness changes stay responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "brush-wetness-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Wetness",
      appPerformance,
      "brush-wetness-change",
    );
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brush-wetness-change");
});

test("browser perf: brush settle changes stay responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "brush-settle-change", {
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });
  getToolcraftPerformanceStressValue(appPerformance, "brush-settle-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Settle",
      appPerformance,
      "brush-settle-change",
    );
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brush-settle-change");
});

test("browser perf: brush taper changes stay responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "brush-taper-change", {
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });
  getToolcraftPerformanceStressValue(appPerformance, "brush-taper-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Taper",
      appPerformance,
      "brush-taper-change",
    );
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brush-taper-change");
});

test("browser perf: brush flow changes stay responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "brush-flow-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Flow", appPerformance, "brush-flow-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "brush-flow-change");
});

test("browser perf: auto flow toggle stays responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "auto-flow-toggle");
  await clickSwitch(page, "Auto");

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "auto-flow-toggle");
});

test("browser perf: clear action stays responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "clear-action");
  await drawStroke(page);
  await page.getByRole("button", { name: "Clear" }).click();

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "clear-action");
});

test("browser perf: paper texture toggle stays responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "paper-texture-toggle");

  const result = await measureToolcraftInteraction(page, async () => {
    await clickSwitch(page, "Texture");
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "paper-texture-toggle");
});

test("browser perf: paper grain changes stay responsive", async ({ page }) => {
  await openApp(page);
  await clickSwitch(page, "Texture");
  getToolcraftPerformanceStressValue(appPerformance, "paper-grain-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Grain", appPerformance, "paper-grain-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "paper-grain-change");
});

test("browser perf: paper scale changes stay responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "paper-scale-change", {
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });
  await clickSwitch(page, "Texture");
  getToolcraftPerformanceStressValue(appPerformance, "paper-scale-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Scale", appPerformance, "paper-scale-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "paper-scale-change");
});

test("browser perf: paper fiber changes stay responsive", async ({ page }) => {
  await openApp(page);
  await clickSwitch(page, "Texture");
  getToolcraftPerformanceStressValue(appPerformance, "paper-fiber-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Fiber", appPerformance, "paper-fiber-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "paper-fiber-change");
});

test("browser perf: paper mottle changes stay responsive", async ({ page }) => {
  await openApp(page);
  await clickSwitch(page, "Texture");
  getToolcraftPerformanceStressValue(appPerformance, "paper-mottle-change");

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Mottle", appPerformance, "paper-mottle-change");
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "paper-mottle-change");
});

test("browser perf: background include toggle stays responsive", async ({ page }) => {
  await openApp(page);
  getToolcraftPerformanceStressValue(appPerformance, "background-include-toggle");
  await clickSwitch(page, "Include");

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-include-toggle");
});

test("browser perf: background color changes stay responsive", async ({ page }) => {
  await openApp(page);
  const value = getToolcraftPerformanceStressValue<string>(appPerformance, "background-color-change");
  await setBackgroundColor(page, value);

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-color-change");
});

test("browser perf: image format changes stay responsive", async ({ page }) => {
  await openApp(page);
  const value = getToolcraftPerformanceStressValue<string>(appPerformance, "image-format-change");
  await chooseSelect(page, "Format", value === "jpg" ? "JPG" : "PNG", 0);

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-format-change");
});

test("browser perf: image resolution changes stay responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "image-resolution-change",
    {
      renderScale: async (value) =>
        dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
    },
  );
  const value = getToolcraftPerformanceStressValue<string>(appPerformance, "image-resolution-change");
  await chooseSelect(page, "Resolution", value.toUpperCase(), 0);

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await page.getByRole("button", { name: "Export PNG" }).click({ trial: true });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-resolution-change");
});

test("browser perf: export image stays under budget", async ({ page }) => {
  await openApp(page);
  await installBlobCapture(page);
  getToolcraftPerformanceStressValue(appPerformance, "export-image");

  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export PNG" }).click();
    await waitForCapturedBlob(page, 1);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    { exportMs: result.durationMs, ...result },
    appPerformance,
    "export-image",
  );
});

test("browser perf: animation viewport drag remains stable", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "animation-viewport-drag",
    {
      autoFlow: async (value) => {
        if (value === true) {
          await clickSwitch(page, "Auto");
        }
      },
      renderScale: async (value) =>
        dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
    },
  );
  await drawStroke(page);
  await dragToolcraftCanvasViewport(page);

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "animation-viewport-drag");
});

test("browser perf: viewport zoom stress stays responsive", async ({ page }) => {
  await openApp(page);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "viewport-zoom-stress", {
    autoFlow: async (value) => {
      if (value === true) {
        await clickSwitch(page, "Auto");
      }
    },
    renderScale: async (value) => dragToolcraftSliderByLabel(page, "Resolution scale", Number(value) - 1),
  });
  await drawStroke(page);
  await zoomToolcraftCanvasViewport(page, 1);

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 3);
  });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-zoom-stress");
});

test("browser perf: viewport stays stable", async ({ page }) => {
  await openApp(page);

  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await page.evaluate(() => undefined);
  }, { settleFrames: 0 });

  await expect(page.locator("[data-suminagashi-canvas]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-stability");
});
