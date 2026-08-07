import { readFileSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

import {
  dragToolcraftSliderToValue,
  expectToolcraftDiscreteSliderDragSmoothness,
  getToolcraftFieldByLabel,
  waitForToolcraftAnimationFrames,
} from "./performance-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";
import { createRadianceHdr } from "./hdr-fixture";
import {
  dragCanvasHandle,
  expectCanvasHandlesUseToolcraftVisualLanguage,
  expectExportExcludesCanvasHandles,
  expectNoForbiddenCanvasUi,
  getCanvasHandle,
} from "./canvas-handle-helpers";
import {
  DEFAULT_LIQUID_METAL_ORBIT_POSE,
  projectLiquidMetalOrbitAxes,
  type LiquidMetalOrbitPose,
} from "../src/app/liquid-metal-orbit";

test.describe.configure({ timeout: 90000 });

type VideoMetadata = {
  durationSeconds: number;
  videoHeight: number;
  videoWidth: number;
};

const cubeObj = [
  "o liquid_metal_cube",
  "v -1 -1 -1",
  "v 1 -1 -1",
  "v 1 1 -1",
  "v -1 1 -1",
  "v -1 -1 1",
  "v 1 -1 1",
  "v 1 1 1",
  "v -1 1 1",
  "f 1 2 3 4",
  "f 5 8 7 6",
  "f 1 5 6 2",
  "f 2 6 7 3",
  "f 3 7 8 4",
  "f 5 1 4 8",
].join("\n");

function createCylinderObj(segments = 32): string {
  const lines = ["o liquid_metal_sticker_cylinder"];

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const x = Math.cos(angle);
    const z = Math.sin(angle);

    lines.push(`v ${x.toFixed(6)} -1.35 ${z.toFixed(6)}`);
    lines.push(`v ${x.toFixed(6)} 1.35 ${z.toFixed(6)}`);
  }

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    const bottom = index * 2 + 1;
    const top = bottom + 1;
    const nextBottom = next * 2 + 1;
    const nextTop = nextBottom + 1;

    lines.push(`f ${bottom} ${nextBottom} ${nextTop} ${top}`);
  }

  return lines.join("\n");
}

const foldedStickerRidgeObj = [
  "o liquid_metal_sticker_folded_ridge",
  "v -0.00001 -1 -0.00001",
  "v -0.00001 1 -0.00001",
  "v -0.35 -1 -0.55",
  "v -0.35 1 -0.55",
  "v 0.00001 -1 -0.00001",
  "v 0.00001 1 -0.00001",
  "v 0.546 -1 -0.55",
  "v 0.546 1 -0.55",
  "f 3 1 2 4",
  "f 1 5 6 2",
  "f 5 7 8 6",
].join("\n");

async function createStickerFiles(
  page: Page,
  definitions: readonly { color: string; name: string; symbol: string }[],
): Promise<Array<{ buffer: Buffer; mimeType: string; name: string }>> {
  const encoded = await page.evaluate((items) => {
    return items.map((item, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = index % 2 === 0 ? 640 : 480;
      canvas.height = index % 2 === 0 ? 420 : 640;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Could not create PNG sticker fixture.");

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = item.color;
      context.beginPath();
      context.roundRect(
        28,
        28,
        canvas.width - 56,
        canvas.height - 56,
        Math.min(canvas.width, canvas.height) * 0.2,
      );
      context.fill();
      context.lineWidth = 22;
      context.strokeStyle = "#FFFFFF";
      context.stroke();
      context.fillStyle = "#111111";
      context.font = `900 ${Math.round(Math.min(canvas.width, canvas.height) * 0.44)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(item.symbol, canvas.width * 0.5, canvas.height * 0.54);
      return canvas.toDataURL("image/png").split(",")[1] ?? "";
    });
  }, definitions);

  return encoded.map((value, index) => ({
    buffer: Buffer.from(value, "base64"),
    mimeType: "image/png",
    name: definitions[index]!.name,
  }));
}

async function createScratchMaskFile(
  page: Page,
  name = "scratch-mask.png",
  width = 1024,
  height = 1024,
): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  const encoded = await page.evaluate(
    ({ maskHeight, maskWidth }) => {
      const canvas = document.createElement("canvas");
      canvas.width = maskWidth;
      canvas.height = maskHeight;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Could not create scratch mask fixture.");

      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.lineCap = "round";

      for (let index = 0; index < 34; index += 1) {
        const startX = ((index * 83) % canvas.width) - canvas.width * 0.18;
        const startY = ((index * 151) % canvas.height) - canvas.height * 0.08;
        context.beginPath();
        context.moveTo(startX, startY);
        context.bezierCurveTo(
          startX + canvas.width * 0.1,
          startY + canvas.height * 0.025,
          startX + canvas.width * 0.24,
          startY - canvas.height * 0.04,
          startX + canvas.width * (0.42 + (index % 4) * 0.045),
          startY + canvas.height * (0.04 + (index % 3) * 0.025),
        );
        context.strokeStyle = index % 4 === 0 ? "#686868" : "#050505";
        context.lineWidth = Math.max(
          3,
          canvas.width * (0.004 + (index % 3) * 0.002),
        );
        context.stroke();
      }

      context.fillStyle = "#202020";
      context.fillRect(
        canvas.width * 0.73,
        canvas.height * 0.12,
        canvas.width * 0.06,
        canvas.height * 0.015,
      );
      return canvas.toDataURL("image/png").split(",")[1] ?? "";
    },
    { maskHeight: height, maskWidth: width },
  );

  return {
    buffer: Buffer.from(encoded, "base64"),
    mimeType: "image/png",
    name,
  };
}

async function openLiquidMetalApp(
  page: Page,
  options: { defaultScene?: boolean } = {},
): Promise<void> {
  await page.goto(
    options.defaultScene ? "/" : "/?toolcraft-test-fixture=empty-media",
  );
  await expect(
    page.locator('[data-slot="toolcraft-runtime-app"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("application", { name: "Canvas viewport" }),
  ).toBeVisible();
  await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();
  await expect(page.locator("[data-liquid-metal-canvas]")).toBeVisible();
}

const defaultStickerFileNames = [
  "12_yellow_smile_star.png",
  "04_click_club.png",
  "37_pizza.png",
  "08_fast_mode.png",
  "19_keep_it_moving.png",
  "06_wow.png",
  "33_play_loud.png",
  "14_go.png",
  "50_blue_flower.png",
  "15_stick_it.png",
] as const;

async function uploadObjModel(
  page: Page,
  fileName = "liquid-metal-cube.obj",
): Promise<void> {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      buffer: Buffer.from(cubeObj),
      mimeType: "text/plain",
      name: fileName,
    });
  await expect(page.getByText(fileName)).toBeVisible();
  await expect
    .poll(
      () =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-model"),
      {
        message: "Uploaded OBJ should become the active Liquid Metal model.",
        timeout: 15000,
      },
    )
    .toBe(fileName);
  await expect
    .poll(
      () =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-rendered"),
      {
        message: "Paper and Three.js should render the uploaded model.",
        timeout: 15000,
      },
    )
    .not.toBeNull();
  await waitForToolcraftAnimationFrames(page, 6);
}

async function readCanvasScreenshotStats(page: Page): Promise<{
  luminanceRange: number;
  uniqueColors: number;
}> {
  const screenshot = await page
    .locator("[data-liquid-metal-canvas]")
    .screenshot();

  return page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (character) =>
      character.charCodeAt(0),
    );
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: "image/png" }),
    );
    const sample = document.createElement("canvas");
    sample.width = 128;
    sample.height = 128;
    const context = sample.getContext("2d", { willReadFrequently: true });

    if (!context)
      throw new Error("Could not inspect Liquid Metal preview pixels.");

    context.drawImage(bitmap, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const uniqueColors = new Set<string>();
    let minLuminance = 255;
    let maxLuminance = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const luminance = Math.round((red + green + blue) / 3);

      uniqueColors.add(`${red},${green},${blue}`);
      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);
    }

    bitmap.close();

    return {
      luminanceRange: maxLuminance - minLuminance,
      uniqueColors: uniqueColors.size,
    };
  }, screenshot.toString("base64"));
}

async function compareScreenshotPixels(
  page: Page,
  first: Buffer,
  second: Buffer,
  options: { maxXRatio?: number } = {},
): Promise<{
  changedRatio: number;
  maxDifference: number;
  meanDifference: number;
}> {
  return page.evaluate(
    async ({ firstEncoded, maxXRatio, secondEncoded }) => {
      const decode = async (encoded: string): Promise<ImageBitmap> => {
        const bytes = Uint8Array.from(atob(encoded), (character) =>
          character.charCodeAt(0),
        );
        return createImageBitmap(new Blob([bytes], { type: "image/png" }));
      };
      const [firstBitmap, secondBitmap] = await Promise.all([
        decode(firstEncoded),
        decode(secondEncoded),
      ]);
      const sample = document.createElement("canvas");
      sample.width = 256;
      sample.height = 144;
      const context = sample.getContext("2d", { willReadFrequently: true });

      if (!context)
        throw new Error("Could not compare Liquid Metal loop pixels.");

      context.drawImage(firstBitmap, 0, 0, sample.width, sample.height);
      const firstPixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      context.clearRect(0, 0, sample.width, sample.height);
      context.drawImage(secondBitmap, 0, 0, sample.width, sample.height);
      const secondPixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      let changedPixels = 0;
      let maxDifference = 0;
      let totalDifference = 0;
      const measuredWidth = Math.max(
        1,
        Math.min(sample.width, Math.round(sample.width * maxXRatio)),
      );

      for (let y = 0; y < sample.height; y += 1) {
        for (let x = 0; x < measuredWidth; x += 1) {
          const index = (y * sample.width + x) * 4;
          const difference =
            Math.abs((firstPixels[index] ?? 0) - (secondPixels[index] ?? 0)) +
            Math.abs(
              (firstPixels[index + 1] ?? 0) - (secondPixels[index + 1] ?? 0),
            ) +
            Math.abs(
              (firstPixels[index + 2] ?? 0) - (secondPixels[index + 2] ?? 0),
            );

          if (difference > 0) changedPixels += 1;
          maxDifference = Math.max(maxDifference, difference);
          totalDifference += difference;
        }
      }

      firstBitmap.close();
      secondBitmap.close();

      const pixelCount = measuredWidth * sample.height;
      return {
        changedRatio: changedPixels / pixelCount,
        maxDifference,
        meanDifference: totalDifference / pixelCount,
      };
    },
    {
      firstEncoded: first.toString("base64"),
      maxXRatio: options.maxXRatio ?? 1,
      secondEncoded: second.toString("base64"),
    },
  );
}

async function readScreenshotColorAt(
  page: Page,
  screenshot: Buffer,
  normalizedX: number,
  normalizedY: number,
): Promise<{
  blue: number;
  green: number;
  red: number;
  sourceDistance: number;
}> {
  return page.evaluate(
    async ({ encoded, x, y }) => {
      const bytes = Uint8Array.from(atob(encoded), (character) =>
        character.charCodeAt(0),
      );
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const sample = document.createElement("canvas");
      sample.width = bitmap.width;
      sample.height = bitmap.height;
      const context = sample.getContext("2d", { willReadFrequently: true });

      if (!context) throw new Error("Could not sample sticker source color.");

      context.drawImage(bitmap, 0, 0);
      const centerX = Math.round((sample.width - 1) * x);
      const centerY = Math.round((sample.height - 1) * y);
      const radius = 3;
      const pixels = context.getImageData(
        centerX - radius,
        centerY - radius,
        radius * 2 + 1,
        radius * 2 + 1,
      ).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      const pixelCount = pixels.length / 4;

      for (let index = 0; index < pixels.length; index += 4) {
        red += pixels[index] ?? 0;
        green += pixels[index + 1] ?? 0;
        blue += pixels[index + 2] ?? 0;
      }

      bitmap.close();
      red /= pixelCount;
      green /= pixelCount;
      blue /= pixelCount;

      return {
        blue,
        green,
        red,
        sourceDistance: Math.hypot(red - 255, green - 74, blue - 101),
      };
    },
    {
      encoded: screenshot.toString("base64"),
      x: normalizedX,
      y: normalizedY,
    },
  );
}

async function readFoldedStickerPixelDistribution(
  page: Page,
  before: Buffer,
  after: Buffer,
): Promise<{ center: number; left: number; right: number }> {
  return page.evaluate(
    async ({ afterEncoded, beforeEncoded }) => {
      const decode = async (encoded: string): Promise<ImageBitmap> => {
        const bytes = Uint8Array.from(atob(encoded), (character) =>
          character.charCodeAt(0),
        );

        return createImageBitmap(new Blob([bytes], { type: "image/png" }));
      };
      const [beforeBitmap, afterBitmap] = await Promise.all([
        decode(beforeEncoded),
        decode(afterEncoded),
      ]);
      const sample = document.createElement("canvas");
      sample.width = afterBitmap.width;
      sample.height = afterBitmap.height;
      const context = sample.getContext("2d", { willReadFrequently: true });

      if (!context) throw new Error("Could not inspect folded sticker pixels.");

      context.drawImage(beforeBitmap, 0, 0);
      const beforePixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      context.clearRect(0, 0, sample.width, sample.height);
      context.drawImage(afterBitmap, 0, 0);
      const afterPixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      const centerX = sample.width * 0.5;
      const centerBand = Math.max(3, Math.round(sample.width * 0.015));
      let center = 0;
      let left = 0;
      let right = 0;

      for (let y = 0; y < sample.height; y += 1) {
        for (let x = 0; x < sample.width; x += 1) {
          const index = (y * sample.width + x) * 4;
          const red = afterPixels[index] ?? 0;
          const green = afterPixels[index + 1] ?? 0;
          const blue = afterPixels[index + 2] ?? 0;
          const difference =
            Math.abs(red - (beforePixels[index] ?? 0)) +
            Math.abs(green - (beforePixels[index + 1] ?? 0)) +
            Math.abs(blue - (beforePixels[index + 2] ?? 0));

          if (difference < 90 || red < 205 || green < 150 || blue > 135) {
            continue;
          }

          if (x < centerX) left += 1;
          else right += 1;
          if (Math.abs(x - centerX) <= centerBand) center += 1;
        }
      }

      beforeBitmap.close();
      afterBitmap.close();
      return { center, left, right };
    },
    {
      afterEncoded: after.toString("base64"),
      beforeEncoded: before.toString("base64"),
    },
  );
}

async function readForegroundBounds(
  page: Page,
  screenshot: Buffer,
  backgroundScreenshot: Buffer,
): Promise<{ area: number; height: number; width: number }> {
  return page.evaluate(
    async ({ backgroundEncoded, encoded }) => {
      const decode = async (value: string): Promise<ImageBitmap> => {
        const bytes = Uint8Array.from(atob(value), (character) =>
          character.charCodeAt(0),
        );
        return createImageBitmap(new Blob([bytes], { type: "image/png" }));
      };
      const [bitmap, backgroundBitmap] = await Promise.all([
        decode(encoded),
        decode(backgroundEncoded),
      ]);
      const sample = document.createElement("canvas");
      sample.width = 256;
      sample.height = 144;
      const context = sample.getContext("2d", { willReadFrequently: true });

      if (!context) throw new Error("Could not inspect model bounds.");

      context.drawImage(backgroundBitmap, 0, 0, sample.width, sample.height);
      const backgroundPixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      context.clearRect(0, 0, sample.width, sample.height);
      context.drawImage(bitmap, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(
        0,
        0,
        sample.width,
        sample.height,
      ).data;
      let area = 0;
      let minX = sample.width;
      let maxX = -1;
      let minY = sample.height;
      let maxY = -1;

      for (let y = 0; y < sample.height; y += 1) {
        for (let x = 0; x < sample.width; x += 1) {
          const index = (y * sample.width + x) * 4;
          const difference =
            Math.abs((pixels[index] ?? 0) - (backgroundPixels[index] ?? 0)) +
            Math.abs(
              (pixels[index + 1] ?? 0) - (backgroundPixels[index + 1] ?? 0),
            ) +
            Math.abs(
              (pixels[index + 2] ?? 0) - (backgroundPixels[index + 2] ?? 0),
            );

          if (difference <= 18) continue;
          area += 1;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }

      bitmap.close();
      backgroundBitmap.close();

      return {
        area,
        height: maxY >= minY ? maxY - minY + 1 : 0,
        width: maxX >= minX ? maxX - minX + 1 : 0,
      };
    },
    {
      backgroundEncoded: backgroundScreenshot.toString("base64"),
      encoded: screenshot.toString("base64"),
    },
  );
}

async function pausePlayback(page: Page): Promise<void> {
  const pause = page.getByRole("button", { name: "Pause playback" });
  if (await pause.isVisible().catch(() => false)) {
    await pause.click();
    await expect(
      page.getByRole("button", { name: "Play playback" }),
    ).toBeVisible();
  }
}

async function fillToolcraftTextField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const input = field.locator("input").first();
  await input.fill(value);
  await input.press("Enter");
  await input.blur();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function fillToolcraftHexField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const input = page.getByLabel(label).first();
  await input.fill(value);
  await input.press("Enter");
  await input.blur();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function clickToolcraftSwitch(page: Page, label: string): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  await field.locator('[data-slot="switch"]').first().click();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function selectToolcraftOption(
  page: Page,
  options: { currentText?: RegExp | string; label: string; optionName: string },
): Promise<void> {
  const trigger =
    options.currentText === undefined
      ? (await getToolcraftFieldByLabel(page, options.label))
          .locator('[data-slot="select-trigger"]')
          .first()
      : page
          .locator('[data-slot="select-trigger"]')
          .filter({ hasText: options.currentText })
          .first();

  await expect(trigger).toBeVisible();
  await trigger.click();
  await page
    .locator('[data-slot="select-item"]:visible')
    .filter({ hasText: new RegExp(`^${options.optionName}$`) })
    .first()
    .click({ force: true });
  await waitForToolcraftAnimationFrames(page, 3);
}

async function selectVideoResolution(
  page: Page,
  optionName: "4K" | "Current",
): Promise<void> {
  const trigger = page.locator('[data-slot="select-trigger"]').last();

  await expect(trigger).toBeVisible();
  await trigger.click();
  await page
    .locator('[data-slot="select-item"]:visible')
    .filter({ hasText: new RegExp(`^${optionName}$`) })
    .click();
  await expect(trigger).toContainText(optionName);
  await waitForToolcraftAnimationFrames(page, 3);
}

async function dragVectorPad(page: Page): Promise<void> {
  const pad = page.getByRole("button", { name: "Offset X/Y pad" });
  await pad.scrollIntoViewIfNeeded();
  await expect(pad).toBeVisible();
  await page.getByRole("button", { name: "Edit Offset value" }).click();
  const editor = page.getByRole("textbox", { name: "Offset value" });
  await editor.fill("0.56, -0.52");
  await editor.press("Enter");
}

async function dragModelWithLeftButton(page: Page): Promise<void> {
  const canvas = page.locator("[data-liquid-metal-canvas]");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Liquid Metal canvas is not measurable.");
  }

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.28);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.18, {
    steps: 14,
  });
  await page.mouse.up();
  await waitForToolcraftAnimationFrames(page, 4);
}

async function dragModelWithMiddleButton(page: Page): Promise<void> {
  const canvas = page.locator("[data-liquid-metal-canvas]");
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Liquid Metal canvas is not measurable.");
  }

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.28);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.18, {
    steps: 14,
  });
  await page.mouse.up({ button: "middle" });
  await waitForToolcraftAnimationFrames(page, 4);
}

async function dragEmptyCanvasWithLeftButton(page: Page): Promise<void> {
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const box = await viewport.boundingBox();
  if (!box) {
    throw new Error("Toolcraft canvas viewport is not measurable.");
  }

  const startX = box.x + 12;
  const startY = box.y + 12;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 72, startY + 48, { steps: 10 });
  await page.mouse.up();
  await waitForToolcraftAnimationFrames(page, 4);
}

async function editTimelineDuration(
  page: Page,
  duration: string,
): Promise<void> {
  await page.getByRole("button", { name: "Edit timeline duration" }).click();
  const editor = page.getByRole("textbox", { name: "timeline duration" });
  await editor.fill(duration);
  await editor.press("Enter");
  await waitForToolcraftAnimationFrames(page, 3);
}

async function decodeDownloadedImage(
  page: Page,
  filePath: string,
  mimeType: string,
): Promise<{ alpha: number; height: number; width: number }> {
  const encoded = readFileSync(filePath).toString("base64");
  return page.evaluate(
    async ({ encoded: base64, mime }) => {
      const bytes = Uint8Array.from(atob(base64), (character) =>
        character.charCodeAt(0),
      );
      const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
      const sample = document.createElement("canvas");
      sample.width = bitmap.width;
      sample.height = bitmap.height;
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Could not inspect exported image pixels.");
      context.drawImage(bitmap, 0, 0);
      const alpha = context.getImageData(0, 0, 1, 1).data[3] ?? 0;
      const result = { alpha, height: bitmap.height, width: bitmap.width };
      bitmap.close();
      return result;
    },
    { encoded, mime: mimeType },
  );
}

async function readExportedVideoDurationAndSize(
  page: Page,
  filePath: string,
  mimeType: string,
): Promise<VideoMetadata> {
  const encoded = readFileSync(filePath).toString("base64");

  return page.evaluate(
    ({ encoded: base64, mime }) =>
      new Promise<VideoMetadata>((resolve, reject) => {
        const bytes = Uint8Array.from(atob(base64), (character) =>
          character.charCodeAt(0),
        );
        const blob = new Blob([bytes], { type: mime });
        const video = document.createElement("video");
        const url = URL.createObjectURL(blob);

        video.muted = true;
        video.preload = "metadata";
        video.addEventListener(
          "loadedmetadata",
          () => {
            const durationSeconds = video.duration;
            const videoHeight = video.videoHeight;
            const videoWidth = video.videoWidth;
            URL.revokeObjectURL(url);
            resolve({ durationSeconds, videoHeight, videoWidth });
          },
          { once: true },
        );
        video.addEventListener(
          "error",
          () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not load exported video metadata."));
          },
          { once: true },
        );
        video.src = url;
      }),
    { encoded, mime: mimeType },
  );
}

test("browser: authored Liquid Metal scene is preloaded and resettable", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await openLiquidMetalApp(page, { defaultScene: true });
  const output = page.locator("[data-toolcraft-product-output]");

  await expect
    .poll(() => output.getAttribute("data-liquid-metal-model"), {
      timeout: 15000,
    })
    .toBe("A.obj");
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-scratch"))
    .toContain("Noise Scratches Black Background.jpg");
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("10");
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-scratch-applied"))
    .toContain("Noise Scratches Black Background.jpg");
  await expect
    .poll(
      () => output.getAttribute("data-liquid-metal-sticker-rendered-count"),
      { timeout: 30000 },
    )
    .toBe("10");
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-scales"), {
      message: "Every authored default decal should resolve at scale 0.82.",
      timeout: 30000,
    })
    .toBe(Array.from({ length: 10 }, () => "0.82").join(","));
  await expect(page.getByText("A.obj", { exact: true })).toBeVisible();
  await expect(
    page.getByAltText("Noise Scratches Black Background.jpg"),
  ).toBeVisible();
  for (const fileName of defaultStickerFileNames) {
    await expect(page.getByAltText(fileName)).toBeVisible();
  }

  await expect(output).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(DEFAULT_LIQUID_METAL_ORBIT_POSE),
  );
  const includeBackground = (
    await getToolcraftFieldByLabel(page, "Include")
  ).getByRole("switch");
  await expect(includeBackground).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Background hex").last()).toHaveValue(
    "#AFAFC5",
  );

  await expect(page.getByLabel("Background hex", { exact: true })).toHaveValue(
    "#AAAAAC",
  );
  for (const [label, value] of [
    ["Repetition", "2"],
    ["Softness", "0.1"],
    ["Speed", "1"],
    ["Rotation", "0"],
  ] as const) {
    await expect(
      page.getByRole("slider", { exact: true, name: label }),
    ).toHaveAttribute("aria-valuenow", value);
  }

  await pausePlayback(page);
  await waitForToolcraftAnimationFrames(page, 6);
  const stats = await readCanvasScreenshotStats(page);

  expect(stats.uniqueColors).toBeGreaterThan(100);
  expect(stats.luminanceRange).toBeGreaterThan(100);

  await expectToolcraftProductObservableToChange(page, () =>
    page.getByRole("button", { name: "Remove A.obj" }).click(),
  );
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-model"))
    .toBe("");
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-model"), {
      timeout: 15000,
    })
    .toBe("A.obj");
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("10");

  await page.getByRole("button", { exact: true, name: "Remove image" }).click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-scratch"))
    .toBe("none");
  await page
    .getByRole("button", { name: "Reset Scratch Mask section" })
    .click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-scratch"))
    .toContain("Noise Scratches Black Background.jpg");

  await page
    .getByRole("button", {
      exact: true,
      name: "Remove 15_stick_it.png",
    })
    .click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("9");
  await page.getByRole("button", { name: "Reset Stickers section" }).click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("10");

  await selectToolcraftOption(page, {
    currentText: /4K/,
    label: "Resolution",
    optionName: "2K",
  });
  const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(downloadPath).toBeTruthy();
  await expect(
    decodeDownloadedImage(page, downloadPath!, "image/png"),
  ).resolves.toMatchObject({ height: 1152, width: 2048 });
});

test("browser: Paper controls and presets change Liquid Metal 3D output", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await uploadObjModel(page);
  await pausePlayback(page);

  // Reference parity: every visible value maps to the official Paper Liquid Metal baseline.
  const referenceBaseline = await getToolcraftProductObservableSnapshot(page);
  expect(referenceBaseline).toContain("canvas");
  for (const preset of ["Noir", "Backdrop", "Stripes", "Default"]) {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("button", { name: preset, exact: true }).click();
      await waitForToolcraftAnimationFrames(page, 4);
    });
  }

  await expectToolcraftProductObservableToChange(page, async () => {
    await fillToolcraftHexField(page, "Background hex", "#24242A");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await fillToolcraftHexField(page, "Tint hex", "#8FCBFF");
  });

  for (const [label, value] of [
    ["Repetition", 4.2],
    ["Softness", 0.32],
    ["Red shift", -0.2],
    ["Blue shift", 0.66],
    ["Distortion", 0.28],
    ["Contour", 0.72],
    ["Angle", 140],
    ["Speed", 1.7],
    ["Scale", 1.25],
    ["Rotation", 90],
  ] as const) {
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, label, value);
      await waitForToolcraftAnimationFrames(page, 3);
    });
  }

  const vectorParts = ["vector.x", "vector.y"];
  expect(vectorParts).toEqual(["vector.x", "vector.y"]);
  await expectToolcraftProductObservableToChange(page, () =>
    dragVectorPad(page),
  );
  await expectToolcraftProductObservableToChange(page, () =>
    selectToolcraftOption(page, {
      currentText: "Contain",
      label: "Fit",
      optionName: "Cover",
    }),
  );
});

test("browser: environment presets controls and HDRI update Liquid Metal reflections", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await uploadObjModel(page, "environment-model.obj");
  await pausePlayback(page);

  const output = page.locator("[data-toolcraft-product-output]");
  const canvas = page.locator("[data-liquid-metal-canvas]");
  const studioPixels = await canvas.screenshot();
  let previousPresetPixels = studioPixels;
  let warmPixels = studioPixels;

  for (const [optionName, sourceKey] of [
    ["Softbox", "softbox"],
    ["Product", "product"],
    ["Rim", "rim"],
    ["Chrome", "chrome"],
    ["Neutral", "neutral"],
    ["Warm", "warm"],
  ] as const) {
    await selectToolcraftOption(page, { label: "Source", optionName });
    await expect
      .poll(() => output.getAttribute("data-liquid-metal-environment-applied"))
      .toBe(`preset:${sourceKey}`);
    await waitForToolcraftAnimationFrames(page, 8);
    const presetPixels = await canvas.screenshot();
    expect(presetPixels.equals(previousPresetPixels)).toBe(false);
    previousPresetPixels = presetPixels;

    if (sourceKey === "warm") {
      warmPixels = presetPixels;
    }
  }

  await expect(page.getByRole("button", { name: "Browse file" })).toHaveCount(
    0,
  );
  await selectToolcraftOption(page, {
    label: "Source",
    optionName: "Custom HDRI",
  });
  await expect(page.getByRole("button", { name: "Browse file" })).toBeVisible();
  const hdriInput = page.locator('input[type="file"]').last();

  await hdriInput.setInputFiles({
    buffer: createRadianceHdr(),
    mimeType: "image/vnd.radiance",
    name: "sunset.hdr",
  });
  await expect(page.getByText("sunset.hdr")).toBeVisible();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-environment-applied"))
    .toContain("custom:");
  await waitForToolcraftAnimationFrames(page, 10);
  await expect(output).not.toHaveAttribute(
    "data-liquid-metal-environment-error",
  );
  const hdriPixels = await canvas.screenshot();
  expect(hdriPixels.equals(warmPixels)).toBe(false);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Intensity", 0.35);
    await waitForToolcraftAnimationFrames(page, 4);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Environment rotation", 180);
    await waitForToolcraftAnimationFrames(page, 4);
  });

  await selectToolcraftOption(page, {
    currentText: /4K/,
    label: "Resolution",
    optionName: "2K",
  });
  const pngDownloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Export PNG" }).click();
  await pngDownloadPromise;

  await page.getByRole("button", { name: "Remove sunset.hdr" }).click();
  await expect(page.getByText("sunset.hdr")).toHaveCount(0);
  await expect(output).toHaveAttribute(
    "data-liquid-metal-environment",
    "preset:studio:custom-fallback",
  );

  await hdriInput.setInputFiles({
    buffer: createRadianceHdr(),
    mimeType: "image/vnd.radiance",
    name: "reset-environment.hdr",
  });
  await page.getByRole("button", { name: "Reset Environment section" }).click();
  await expect(page.getByText("reset-environment.hdr")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Browse file" })).toHaveCount(
    0,
  );
  await expect(output).toHaveAttribute(
    "data-liquid-metal-environment",
    "preset:studio",
  );

  await selectToolcraftOption(page, {
    label: "Source",
    optionName: "Custom HDRI",
  });
  await page.locator('input[type="file"]').last().setInputFiles({
    buffer: createRadianceHdr(),
    mimeType: "image/vnd.radiance",
    name: "global-reset-environment.hdr",
  });
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect(page.getByText("global-reset-environment.hdr")).toHaveCount(0);
  await expect(page.getByText("environment-model.obj")).toHaveCount(0);
});

test("browser: model upload clear and reset update Liquid Metal 3D output", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "480");
  await fillToolcraftTextField(page, "Canvas height", "270");
  await page
    .getByRole("slider", { exact: true, name: "Resolution scale" })
    .press("Home");
  const referenceParity =
    "Paper image-mask lifecycle replaced by the user-approved 3D model lifecycle";
  expect(referenceParity).toContain("3D model");

  await uploadObjModel(page, "clear-me.obj");
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Remove clear-me.obj" }).click();
    await expect(page.getByText("clear-me.obj")).toHaveCount(0);
  });

  await uploadObjModel(page, "section-reset.obj");
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Reset Model section" }).click();
    await expect(page.getByText("section-reset.obj")).toHaveCount(0);
  });

  await uploadObjModel(page, "global-reset.obj");
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Reset controls" }).click();
    await expect(page.getByText("global-reset.obj")).toHaveCount(0);
  });
});

test("browser: model scale changes object bounds without changing shader phase", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await dragToolcraftSliderToValue(page, "Resolution scale", 1);
  const canvas = page.locator("[data-liquid-metal-canvas]");
  await uploadObjModel(page, "model-scale.obj");
  await pausePlayback(page);
  await page.getByRole("button", { name: "Remove model-scale.obj" }).click();
  await waitForToolcraftAnimationFrames(page, 4);
  const emptyCanvas = await canvas.screenshot();
  await uploadObjModel(page, "model-scale.obj");

  const output = page.locator("[data-toolcraft-product-output]");

  await dragToolcraftSliderToValue(page, "Model scale", 0.25);
  await waitForToolcraftAnimationFrames(page, 4);
  const pausedFrame = await output.getAttribute(
    "data-liquid-metal-surface-frame",
  );
  const smallBounds = await readForegroundBounds(
    page,
    await canvas.screenshot(),
    emptyCanvas,
  );

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Model scale", 0.7);
    await waitForToolcraftAnimationFrames(page, 4);
  });
  const largeBounds = await readForegroundBounds(
    page,
    await canvas.screenshot(),
    emptyCanvas,
  );

  expect(
    Number(
      await page
        .getByRole("slider", { name: "Model scale" })
        .getAttribute("aria-valuenow"),
    ),
  ).toBeCloseTo(0.7, 1);
  expect(await output.getAttribute("data-liquid-metal-surface-frame")).toBe(
    pausedFrame,
  );
  expect(largeBounds.width).toBeGreaterThan(smallBounds.width + 20);
});

test("browser: scratch mask adds triplanar normal depth to Liquid Metal", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await dragToolcraftSliderToValue(page, "Resolution scale", 1);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      buffer: Buffer.from(cubeObj),
      mimeType: "text/plain",
      name: "scratch-depth-cube.obj",
    });
  const output = page.locator("[data-toolcraft-product-output]");
  const canvas = page.locator("[data-liquid-metal-canvas]");
  const compareScratchPixels = (first: Buffer, second: Buffer) =>
    compareScreenshotPixels(page, first, second, { maxXRatio: 0.62 });

  await expect
    .poll(() => output.getAttribute("data-liquid-metal-model"), {
      timeout: 15000,
    })
    .toBe("scratch-depth-cube.obj");
  await pausePlayback(page);
  await waitForToolcraftAnimationFrames(page, 12);
  const pausedFrame = await output.getAttribute(
    "data-liquid-metal-surface-frame",
  );
  const barePixels = await canvas.screenshot();
  const scratchMask = await createScratchMaskFile(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await page.locator('input[type="file"]').nth(1).setInputFiles(scratchMask);
    await expect
      .poll(() => output.getAttribute("data-liquid-metal-scratch"))
      .toContain("scratch-mask.png");
    await waitForToolcraftAnimationFrames(page, 8);
  });
  await expect(page.getByAltText("scratch-mask.png")).toBeVisible();
  const defaultDepthPixels = await canvas.screenshot();
  expect(
    (await compareScratchPixels(barePixels, defaultDepthPixels)).changedRatio,
  ).toBeGreaterThan(0.003);

  await dragToolcraftSliderToValue(page, "Depth", 0);
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-scratch-depth"))
    .toBe("0");
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-surface-frame"))
    .toBe(pausedFrame);
  await waitForToolcraftAnimationFrames(page, 8);
  const zeroDepthPixels = await canvas.screenshot();
  const neutralDifference = await compareScratchPixels(
    barePixels,
    zeroDepthPixels,
  );
  expect(neutralDifference.meanDifference).toBeLessThan(1);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Depth", 1.5);
    await waitForToolcraftAnimationFrames(page, 5);
  });
  const deepPixels = await canvas.screenshot();
  expect(
    (await compareScratchPixels(zeroDepthPixels, deepPixels)).changedRatio,
  ).toBeGreaterThan(0.006);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderToValue(page, "Scratch scale", 18);
    await waitForToolcraftAnimationFrames(page, 5);
  });
  const scaledPixels = await canvas.screenshot();
  expect(
    (await compareScratchPixels(deepPixels, scaledPixels)).changedRatio,
  ).toBeGreaterThan(0.004);

  await expectToolcraftProductObservableToChange(page, async () => {
    await clickToolcraftSwitch(page, "Invert");
    await waitForToolcraftAnimationFrames(page, 5);
  });
  const invertedPixels = await canvas.screenshot();
  expect(
    (await compareScratchPixels(scaledPixels, invertedPixels)).changedRatio,
  ).toBeGreaterThan(0.003);

  await page.getByRole("button", { name: "90° Right" }).click();
  await page.getByRole("button", { name: "Flip horizontal" }).click();
  await page.getByRole("button", { name: "Flip vertical" }).click();
  await waitForToolcraftAnimationFrames(page, 6);
  const transformedPixels = await canvas.screenshot();
  expect(
    (await compareScratchPixels(invertedPixels, transformedPixels))
      .changedRatio,
  ).toBeGreaterThan(0.003);

  await dragModelWithLeftButton(page);
  await waitForToolcraftAnimationFrames(page, 6);
  const orbitedPixels = await canvas.screenshot();
  expect(
    (await compareScratchPixels(transformedPixels, orbitedPixels)).changedRatio,
  ).toBeGreaterThan(0.01);

  await selectToolcraftOption(page, {
    currentText: /4K/,
    label: "Resolution",
    optionName: "2K",
  });
  const pngDownload = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Export PNG" }).click();
  await pngDownload;

  await selectToolcraftOption(page, {
    currentText: /MP4/,
    label: "Format",
    optionName: "WebM",
  });
  await clickToolcraftSwitch(page, "Timeline");
  await editTimelineDuration(page, "1");
  const videoDownload = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Export Video" }).click();
  await videoDownload;

  await expectToolcraftProductObservableToChange(page, async () => {
    await page
      .getByRole("button", { exact: true, name: "Remove image" })
      .click();
    await expect
      .poll(() => output.getAttribute("data-liquid-metal-scratch"))
      .toBe("none");
    await waitForToolcraftAnimationFrames(page, 5);
  });
  await expect(page.getByAltText("scratch-mask.png")).toHaveCount(0);

  await page.locator('input[type="file"]').nth(1).setInputFiles(scratchMask);
  await expect(page.getByAltText("scratch-mask.png")).toBeVisible();
  await page
    .getByRole("button", { name: "Reset Scratch Mask section" })
    .click();
  await expect(page.getByAltText("scratch-mask.png")).toHaveCount(0);

  await page.locator('input[type="file"]').nth(1).setInputFiles(scratchMask);
  await expect(page.getByAltText("scratch-mask.png")).toBeVisible();
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect(page.getByAltText("scratch-mask.png")).toHaveCount(0);
  await expect(page.getByText("scratch-depth-cube.obj")).toHaveCount(0);
});

test("browser: PNG stickers conform stack and drag across the lit 3D model", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await dragToolcraftSliderToValue(page, "Resolution scale", 1);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      buffer: Buffer.from(createCylinderObj()),
      mimeType: "text/plain",
      name: "curved-sticker-cylinder.obj",
    });
  const output = page.locator("[data-toolcraft-product-output]");
  const canvas = page.locator("[data-liquid-metal-canvas]");

  await expect
    .poll(() => output.getAttribute("data-liquid-metal-model"), {
      timeout: 15000,
    })
    .toBe("curved-sticker-cylinder.obj");
  await pausePlayback(page);
  await waitForToolcraftAnimationFrames(page, 6);
  const bareModel = await canvas.screenshot();
  const stickerFiles = await createStickerFiles(page, [
    { color: "#25E6D4", name: "cyan-sticker.png", symbol: "A" },
    { color: "#FF4A65", name: "red-sticker.png", symbol: "" },
  ]);

  await page.locator('input[type="file"]').nth(2).setInputFiles(stickerFiles);
  await expect(page.getByAltText("cyan-sticker.png")).toBeVisible();
  await expect(page.getByAltText("red-sticker.png")).toBeVisible();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("2");
  await waitForToolcraftAnimationFrames(page, 8);
  const stackedPixels = await canvas.screenshot();
  const importDifference = await compareScreenshotPixels(
    page,
    bareModel,
    stackedPixels,
  );
  const sourceColor = await readScreenshotColorAt(
    page,
    stackedPixels,
    0.5,
    0.5,
  );

  expect(importDifference.changedRatio).toBeGreaterThan(0.004);
  expect(sourceColor.red).toBeGreaterThan(225);
  expect(
    sourceColor.red - Math.max(sourceColor.green, sourceColor.blue),
  ).toBeGreaterThan(85);
  expect(sourceColor.sourceDistance).toBeLessThan(65);

  const previewTiles = page.locator('[data-slot="file-upload-preview-item"]');
  await expect(previewTiles).toHaveCount(2);
  const orderBefore = await previewTiles.evaluateAll((tiles) =>
    tiles.map((tile) => tile.getAttribute("data-file-upload-preview-key")),
  );
  await previewTiles.nth(0).focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(80);
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      previewTiles.evaluateAll((tiles) =>
        tiles.map((tile) => tile.getAttribute("data-file-upload-preview-key")),
      ),
    )
    .not.toEqual(orderBefore);
  await waitForToolcraftAnimationFrames(page, 6);
  const reorderedPixels = await canvas.screenshot();
  expect(
    (await compareScreenshotPixels(page, stackedPixels, reorderedPixels))
      .changedRatio,
  ).toBeGreaterThan(0.002);

  const redStickerTile = previewTiles.filter({
    has: page.getByAltText("red-sticker.png"),
  });
  await previewTiles.nth(0).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await waitForToolcraftAnimationFrames(page, 5);
  const restoredOrderPixels = await canvas.screenshot();
  const canvasBounds = await canvas.boundingBox();
  if (!canvasBounds) throw new Error("Sticker canvas has no bounds.");
  const centerX = canvasBounds.x + canvasBounds.width * 0.5;
  const centerY = canvasBounds.y + canvasBounds.height * 0.5;
  const redX = centerX + canvasBounds.width * 0.12;
  const cyanX = centerX - canvasBounds.width * 0.12;

  await page.mouse.click(centerX, centerY);
  await dragToolcraftSliderToValue(page, "Sticker scale", 0.25);
  await dragToolcraftSliderToValue(page, "Sticker rotation", 40);
  const redScaleValue = await page
    .getByRole("slider", { name: "Sticker scale" })
    .getAttribute("aria-valuenow");
  const redRotationValue = await page
    .getByRole("slider", { name: "Sticker rotation" })
    .getAttribute("aria-valuenow");
  await waitForToolcraftAnimationFrames(page, 6);
  const redTransformedPixels = await canvas.screenshot();
  expect(
    (
      await compareScreenshotPixels(
        page,
        restoredOrderPixels,
        redTransformedPixels,
      )
    ).changedRatio,
  ).toBeGreaterThan(0.001);

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(redX, centerY, { steps: 14 });
  await page.mouse.up();
  await page.mouse.click(centerX, centerY);
  await expect(
    page.getByRole("slider", { name: "Sticker scale" }),
  ).toHaveAttribute("aria-valuenow", "0.82");
  await expect(
    page.getByRole("slider", { name: "Sticker rotation" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await dragToolcraftSliderToValue(page, "Sticker scale", 1.1);
  await dragToolcraftSliderToValue(page, "Sticker rotation", -40);

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(cyanX, centerY, { steps: 14 });
  await page.mouse.up();
  await page.mouse.click(redX, centerY);
  await expect(
    page.getByRole("slider", { name: "Sticker scale" }),
  ).toHaveAttribute("aria-valuenow", redScaleValue ?? "");
  await expect(
    page.getByRole("slider", { name: "Sticker rotation" }),
  ).toHaveAttribute("aria-valuenow", redRotationValue ?? "");

  await redStickerTile.click();
  await page.getByRole("button", { name: "90° Right" }).click();
  await page.getByRole("button", { name: "Flip horizontal" }).click();
  await waitForToolcraftAnimationFrames(page, 6);
  const transformedPixels = await canvas.screenshot();
  expect(
    (await compareScreenshotPixels(page, reorderedPixels, transformedPixels))
      .changedRatio,
  ).toBeGreaterThan(0.001);

  const startX = redX;
  const startY = centerY;

  await expectToolcraftProductObservableToChange(page, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + canvasBounds.width * 0.13, startY - 18, {
      steps: 14,
    });
    await page.mouse.up();
    await waitForToolcraftAnimationFrames(page, 5);
  });
  await expect(output).not.toHaveAttribute(
    "data-liquid-metal-sticker-selected",
    "",
  );
  await expect(
    page.getByRole("slider", { name: "Sticker scale" }),
  ).toHaveAttribute("aria-valuenow", redScaleValue ?? "");
  await expect(
    page.getByRole("slider", { name: "Sticker rotation" }),
  ).toHaveAttribute("aria-valuenow", redRotationValue ?? "");
  const movedPixels = await canvas.screenshot();
  expect(
    (await compareScreenshotPixels(page, transformedPixels, movedPixels))
      .changedRatio,
  ).toBeGreaterThan(0.002);

  await dragModelWithLeftButton(page);
  await waitForToolcraftAnimationFrames(page, 5);
  const orbitedPixels = await canvas.screenshot();
  expect(
    (await compareScreenshotPixels(page, movedPixels, orbitedPixels))
      .changedRatio,
  ).toBeGreaterThan(0.01);

  await selectToolcraftOption(page, { label: "Source", optionName: "Warm" });
  await waitForToolcraftAnimationFrames(page, 8);
  const warmPixels = await canvas.screenshot();
  expect(
    (await compareScreenshotPixels(page, orbitedPixels, warmPixels))
      .changedRatio,
  ).toBeGreaterThan(0.01);

  const frameBeforePlayback = await output.getAttribute(
    "data-liquid-metal-surface-frame",
  );
  await page.getByRole("button", { name: "Play playback" }).click();
  await waitForToolcraftAnimationFrames(page, 20);
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-surface-frame"))
    .not.toBe(frameBeforePlayback);
  await pausePlayback(page);

  await selectToolcraftOption(page, {
    currentText: /4K/,
    label: "Resolution",
    optionName: "2K",
  });
  const pngDownload = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Export PNG" }).click();
  await pngDownload;

  await selectToolcraftOption(page, {
    currentText: /MP4/,
    label: "Format",
    optionName: "WebM",
  });
  await clickToolcraftSwitch(page, "Timeline");
  await editTimelineDuration(page, "1");
  const videoDownload = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Export Video" }).click();
  await videoDownload;

  await page
    .getByRole("button", { exact: true, name: "Remove red-sticker.png" })
    .click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("1");
  await page.getByRole("button", { name: "Reset Stickers section" }).click();
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("0");
  await expect(page.getByAltText("cyan-sticker.png")).toHaveCount(0);

  const finalSticker = await createStickerFiles(page, [
    { color: "#FFD43B", name: "global-reset-sticker.png", symbol: "C" },
  ]);
  await page.locator('input[type="file"]').nth(2).setInputFiles(finalSticker);
  await expect
    .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
    .toBe("1");
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect(page.getByAltText("global-reset-sticker.png")).toHaveCount(0);
  await expect(page.getByText("curved-sticker-cylinder.obj")).toHaveCount(0);
});

test("browser: PNG sticker wraps continuously across a connected hard edge", async ({
  page,
}, testInfo) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await dragToolcraftSliderToValue(page, "Resolution scale", 1);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      buffer: Buffer.from(foldedStickerRidgeObj),
      mimeType: "text/plain",
      name: "folded-sticker-ridge.obj",
    });
  const output = page.locator("[data-toolcraft-product-output]");
  const canvas = page.locator("[data-liquid-metal-canvas]");

  await expect
    .poll(() => output.getAttribute("data-liquid-metal-model"), {
      timeout: 15000,
    })
    .toBe("folded-sticker-ridge.obj");
  await pausePlayback(page);
  await waitForToolcraftAnimationFrames(page, 6);
  const bareModel = await canvas.screenshot();
  const [stickerFile] = await createStickerFiles(page, [
    { color: "#FFD43B", name: "folded-edge-sticker.png", symbol: "R" },
  ]);

  await expectToolcraftProductObservableToChange(page, async () => {
    await page.locator('input[type="file"]').nth(2).setInputFiles(stickerFile!);
    await expect
      .poll(() => output.getAttribute("data-liquid-metal-sticker-count"))
      .toBe("1");
  });
  await waitForToolcraftAnimationFrames(page, 8);
  const wrappedPixels = await canvas.screenshot();

  await testInfo.attach("folded-edge-sticker", {
    body: wrappedPixels,
    contentType: "image/png",
  });
  const changed = await compareScreenshotPixels(page, bareModel, wrappedPixels);
  const distribution = await readFoldedStickerPixelDistribution(
    page,
    bareModel,
    wrappedPixels,
  );

  expect(changed.changedRatio).toBeGreaterThan(0.002);
  expect(distribution.left).toBeGreaterThan(30);
  expect(distribution.right).toBeGreaterThan(30);
  expect(distribution.center).toBeGreaterThan(8);

  await dragModelWithLeftButton(page);
  await waitForToolcraftAnimationFrames(page, 5);
  const orbitedPixels = await canvas.screenshot();

  expect(
    (await compareScreenshotPixels(page, wrappedPixels, orbitedPixels))
      .changedRatio,
  ).toBeGreaterThan(0.01);
});

test("browser: immediate model upload renders Paper shader pixels", async ({
  page,
}) => {
  const webglErrors: string[] = [];

  page.on("console", (message) => {
    if (message.text().includes("GL_INVALID")) webglErrors.push(message.text());
  });

  await openLiquidMetalApp(page);
  await uploadObjModel(page, "immediate-upload.obj");
  const pixels = await readCanvasScreenshotStats(page);
  await pausePlayback(page);
  const output = page.locator("[data-toolcraft-product-output]");
  const canvas = page.locator("[data-liquid-metal-canvas]");
  const frameBeforeOrbit = await output.getAttribute(
    "data-liquid-metal-surface-frame",
  );
  const pixelsBeforeOrbit = await canvas.screenshot();

  await dragModelWithLeftButton(page);

  const frameAfterOrbit = await output.getAttribute(
    "data-liquid-metal-surface-frame",
  );
  const pixelsAfterOrbit = await canvas.screenshot();

  await page.getByRole("button", { name: "Noir", exact: true }).click();
  await waitForToolcraftAnimationFrames(page, 4);
  const noirPixels = await canvas.screenshot();

  expect(webglErrors).toEqual([]);
  expect(pixels.uniqueColors).toBeGreaterThan(50);
  expect(pixels.luminanceRange).toBeGreaterThan(40);
  expect(frameAfterOrbit).toBe(frameBeforeOrbit);
  expect(pixelsAfterOrbit.equals(pixelsBeforeOrbit)).toBe(false);
  expect(noirPixels.equals(pixelsAfterOrbit)).toBe(false);
});

test("browser: timeline duration edit verifies seamless forward loop pixels", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "960");
  await fillToolcraftTextField(page, "Canvas height", "540");
  await uploadObjModel(page, "seamless-loop.obj");
  await clickToolcraftSwitch(page, "Timeline");
  await pausePlayback(page);

  const output = page.locator("[data-toolcraft-product-output]");
  const canvas = page.locator("[data-liquid-metal-canvas]");
  const scrubber = page
    .getByRole("slider", { name: "Playback position" })
    .first();

  await scrubber.press("Home");
  await waitForToolcraftAnimationFrames(page, 4);
  const firstFrame = await canvas.screenshot();
  await expect(output).toHaveAttribute("data-liquid-metal-loop-progress", "0");

  await scrubber.press("End");
  await waitForToolcraftAnimationFrames(page, 4);
  const wrappedFrame = await canvas.screenshot();
  await expect(output).toHaveAttribute("data-liquid-metal-loop-progress", "0");
  const defaultSeam = await compareScreenshotPixels(
    page,
    firstFrame,
    wrappedFrame,
  );
  expect(defaultSeam.changedRatio).toBeLessThan(0.001);
  expect(defaultSeam.maxDifference).toBeLessThanOrEqual(3);
  expect(defaultSeam.meanDifference).toBeLessThan(0.01);

  await editTimelineDuration(page, "1.25");
  await scrubber.press("Home");
  await waitForToolcraftAnimationFrames(page, 4);
  const editedFirstFrame = await canvas.screenshot();
  await scrubber.press("End");
  await waitForToolcraftAnimationFrames(page, 4);
  const editedWrappedFrame = await canvas.screenshot();

  const editedSeam = await compareScreenshotPixels(
    page,
    editedFirstFrame,
    editedWrappedFrame,
  );
  expect(editedSeam.changedRatio).toBeLessThan(0.001);
  expect(editedSeam.maxDifference).toBeLessThanOrEqual(3);
  expect(editedSeam.meanDifference).toBeLessThan(0.01);
  await expect(output).toHaveAttribute("data-liquid-metal-loop-progress", "0");
});

test("browser: model hover orbit and empty canvas pan follow ASCII interaction", async ({
  page,
}) => {
  await openLiquidMetalApp(page);
  await uploadObjModel(page);
  await pausePlayback(page);
  const output = page.locator("[data-toolcraft-product-output]");
  const canvasWorld = page.locator("[data-toolcraft-canvas-world]");
  const beforeOrbit = await output.getAttribute("data-view-orbit");
  const worldBeforeOrbit = await canvasWorld.getAttribute("style");

  await expectToolcraftProductObservableToChange(page, () =>
    dragModelWithLeftButton(page),
  );
  const afterOrbit = await output.getAttribute("data-view-orbit");
  expect(afterOrbit).not.toBe(beforeOrbit);
  await expect(canvasWorld).toHaveAttribute("style", worldBeforeOrbit ?? "");

  const beforeMiddle = await output.getAttribute("data-view-orbit");
  const worldBeforeMiddle = await canvasWorld.getAttribute("style");
  await dragModelWithMiddleButton(page);
  await expect(output).toHaveAttribute("data-view-orbit", beforeMiddle ?? "");
  await expect(canvasWorld).toHaveAttribute("style", worldBeforeMiddle ?? "");

  await dragToolcraftSliderToValue(page, "Model scale", 0.25);
  await waitForToolcraftAnimationFrames(page, 4);
  const beforePan = await output.getAttribute("data-view-orbit");
  const worldBeforePan = await canvasWorld.getAttribute("style");
  await dragEmptyCanvasWithLeftButton(page);
  await expect(output).toHaveAttribute("data-view-orbit", beforePan ?? "");
  await expect(canvasWorld).not.toHaveAttribute("style", worldBeforePan ?? "");
});

test("browser: canvas timeline toolbar and orbit control Liquid Metal 3D output", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await openLiquidMetalApp(page);
  await fillToolcraftTextField(page, "Canvas width", "640");
  await fillToolcraftTextField(page, "Canvas height", "360");
  const resolutionScale = await getToolcraftFieldByLabel(
    page,
    "Resolution scale",
  );
  await expect(
    resolutionScale.locator('[data-slot="slider"][data-variant="discrete"]'),
  ).toBeVisible();
  await expect(
    resolutionScale.locator('[data-slot="slider-marker"]').first(),
  ).toBeVisible();
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    expectMarkers: true,
    maxFrameGapMs: 1200,
    maxInteractionMs: 20000,
  });
  await uploadObjModel(page);
  await pausePlayback(page);

  // Paper sourceOfTruth parity remains visible while Toolcraft owns canvas and transport.
  const baseline = await getToolcraftProductObservableSnapshot(page);
  expect(baseline).toContain("canvas");

  const canvas = page.locator("[data-liquid-metal-canvas]");
  const output = page.locator("[data-toolcraft-product-output]");
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const gizmo = getCanvasHandle(page, "liquid-metal-orientation-gizmo");
  const gizmoBacking = page.getByTestId(
    "liquid-metal-orientation-gizmo-backing",
  );

  await expect(gizmo).toBeVisible();
  await expect(gizmoBacking).toBeVisible();
  await expect(gizmo).toHaveAttribute("width", "140");
  await expect(gizmo).toHaveAttribute("height", "140");
  const [viewportBox, gizmoBox, backingBox] = await Promise.all([
    viewport.boundingBox(),
    gizmo.boundingBox(),
    gizmoBacking.boundingBox(),
  ]);

  expect(viewportBox).not.toBeNull();
  expect(gizmoBox).not.toBeNull();
  expect(backingBox).not.toBeNull();
  if (!viewportBox || !gizmoBox || !backingBox) return;

  expect(gizmoBox.width).toBeCloseTo(70, 1);
  expect(gizmoBox.height).toBeCloseTo(70, 1);
  expect(gizmoBox.x - viewportBox.x).toBeCloseTo(16, 1);
  expect(
    viewportBox.y + viewportBox.height - (gizmoBox.y + gizmoBox.height),
  ).toBeCloseTo(16, 1);
  expect(backingBox).toEqual(gizmoBox);
  const stableBackingColor = await gizmoBacking.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );

  expect(["rgb(0, 0, 0)", "rgb(236, 236, 239)"]).toContain(stableBackingColor);
  await expect(gizmo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const exactPixels = await gizmo.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) return null;
    const context = element.getContext("2d");
    if (!context) return null;

    return {
      center: Array.from(context.getImageData(70, 70, 1, 1).data),
      outside: Array.from(context.getImageData(0, 0, 1, 1).data),
    };
  });

  expect(exactPixels?.outside[3]).toBe(0);
  expect(exactPixels?.center[2]).toBeGreaterThan(exactPixels?.center[0] ?? 255);

  const sphereBoundaryAlphas: number[] = [];
  const initialPose = JSON.parse(
    (await output.getAttribute("data-view-orbit")) ?? "{}",
  ) as LiquidMetalOrbitPose;
  const positiveZProjection = projectLiquidMetalOrbitAxes(
    initialPose,
    35,
    24.5,
  ).find((projection) => projection.axis === "+z");

  expect(positiveZProjection).toBeDefined();
  if (!positiveZProjection) return;

  await page.mouse.move(
    gizmoBox.x + positiveZProjection.x,
    gizmoBox.y + positiveZProjection.y,
  );
  await expect(gizmo).toHaveAttribute("data-hovered-axis", "+z");
  await page.mouse.down();
  for (let frame = 0; frame < 12; frame += 1) {
    await page.mouse.move(
      gizmoBox.x + 35,
      gizmoBox.y + 35 + (frame % 2 === 0 ? 31 : 32),
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    sphereBoundaryAlphas.push(
      await gizmo.evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement)) return 0;

        return (
          element.getContext("2d")?.getImageData(70, 119, 1, 1).data[3] ?? 0
        );
      }),
    );
  }
  await page.mouse.up();

  expect(new Set(sphereBoundaryAlphas).size).toBe(1);
  expect(sphereBoundaryAlphas[0]).toBeGreaterThan(200);
  await page.getByRole("button", { name: "Reset Model Size section" }).click();
  await expect(output).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(DEFAULT_LIQUID_METAL_ORBIT_POSE),
  );
  const resetPose = JSON.parse(
    (await output.getAttribute("data-view-orbit")) ?? "{}",
  ) as LiquidMetalOrbitPose;
  const positiveXProjection = projectLiquidMetalOrbitAxes(
    resetPose,
    35,
    24.5,
  ).find((projection) => projection.axis === "+x");

  expect(positiveXProjection).toBeDefined();
  if (!positiveXProjection) return;

  await page.mouse.move(
    gizmoBox.x + positiveXProjection.x,
    gizmoBox.y + positiveXProjection.y,
  );
  await expect(gizmo).toHaveAttribute("data-hovered-axis", "+x");
  await expectToolcraftProductObservableToChange(page, async () => {
    await gizmo.click({
      position: { x: positiveXProjection.x, y: positiveXProjection.y },
    });
    await page.waitForTimeout(700);
  });
  const snappedPose = JSON.parse(
    (await output.getAttribute("data-view-orbit")) ?? "{}",
  ) as LiquidMetalOrbitPose;

  expect(snappedPose.position[0]).toBeGreaterThan(4.5);
  expect(Math.abs(snappedPose.position[1])).toBeLessThan(0.001);
  expect(Math.abs(snappedPose.position[2])).toBeLessThan(0.001);

  await expectToolcraftProductObservableToChange(page, () =>
    dragCanvasHandle(page, "liquid-metal-orientation-gizmo", {
      x: 18,
      y: 18,
    }),
  );
  const draggedPose = JSON.parse(
    (await output.getAttribute("data-view-orbit")) ?? "{}",
  ) as LiquidMetalOrbitPose;
  const draggedProjection = projectLiquidMetalOrbitAxes(
    draggedPose,
    35,
    24.5,
  ).find((projection) => projection.axis === "+x");
  const pointerClampScale = 24.5 / Math.hypot(18, 18);

  expect(draggedProjection?.x).toBeCloseTo(35 + 18 * pointerClampScale, 1);
  expect(draggedProjection?.y).toBeCloseTo(35 + 18 * pointerClampScale, 1);
  await page.waitForTimeout(700);
  await expect(output).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(draggedPose),
  );
  await expect(gizmoBacking).toHaveCSS("background-color", stableBackingColor);

  const beforeCanvasSize = await canvas.evaluate((element) => ({
    height: (element as HTMLCanvasElement).height,
    width: (element as HTMLCanvasElement).width,
  }));
  await (async () => {
    await selectToolcraftOption(page, {
      label: "Aspect ratio",
      optionName: "1:1",
    });
    await fillToolcraftTextField(page, "Canvas width", "480");
    await fillToolcraftTextField(page, "Canvas height", "480");
  })();
  await expect
    .poll(() =>
      canvas.evaluate((element) => ({
        height: (element as HTMLCanvasElement).height,
        width: (element as HTMLCanvasElement).width,
      })),
    )
    .not.toEqual(beforeCanvasSize);

  await clickToolcraftSwitch(page, "Timeline");
  await expect(
    page.getByRole("button", { name: "Disable loop" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Disable loop" }).click();
  await expect(page.getByRole("button", { name: "Enable loop" })).toBeVisible();
  await page.getByRole("button", { name: "Enable loop" }).click();
  await expect(
    page.getByRole("button", { name: "Disable loop" }),
  ).toBeVisible();

  const pause = page.getByRole("button", { name: "Pause playback" });
  if (await pause.isVisible().catch(() => false)) await pause.click();
  await expect(
    page.getByRole("button", { name: "Play playback" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect(
    page.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(
    page.getByRole("button", { name: "Play playback" }),
  ).toBeVisible();

  await expectToolcraftProductObservableToChange(page, async () => {
    const scrubber = page
      .getByRole("slider", { name: "Playback position" })
      .first();
    await scrubber.press("End");
    await waitForToolcraftAnimationFrames(page, 4);
  });
  await editTimelineDuration(page, "1.25");

  const canvasWorld = page.locator("[data-toolcraft-canvas-world]");
  const beforeModelOrbit = await output.getAttribute("data-view-orbit");
  const worldBeforeModelOrbit = await canvasWorld.getAttribute("style");
  await expectToolcraftProductObservableToChange(page, () =>
    dragModelWithLeftButton(page),
  );
  const afterModelOrbit = await output.getAttribute("data-view-orbit");
  expect(afterModelOrbit).not.toBe(beforeModelOrbit);
  await expect(canvasWorld).toHaveAttribute(
    "style",
    worldBeforeModelOrbit ?? "",
  );

  const undo = page.getByRole("button", { name: "Undo" });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(output).toHaveAttribute(
    "data-view-orbit",
    beforeModelOrbit ?? "",
  );
  const redo = page.getByRole("button", { name: "Redo" });
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(output).toHaveAttribute(
    "data-view-orbit",
    afterModelOrbit ?? "",
  );

  const fixedBeforeZoom = await gizmo.boundingBox();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Center canvas" }).click();
  const fixedAfterZoom = await gizmo.boundingBox();
  expect(fixedAfterZoom?.x).toBeCloseTo(fixedBeforeZoom?.x ?? 0, 1);
  expect(fixedAfterZoom?.y).toBeCloseTo(fixedBeforeZoom?.y ?? 0, 1);

  await page.getByRole("button", { name: "Reset Model Size section" }).click();
  await expect(output).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(DEFAULT_LIQUID_METAL_ORBIT_POSE),
  );

  const theme = page.getByRole("button", { name: /theme/i }).first();
  if (await theme.isVisible().catch(() => false)) {
    await theme.click();
    await expect(gizmoBacking).not.toHaveCSS(
      "background-color",
      stableBackingColor,
    );
  }

  const settingsDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Settings" }).click();
  const settingsDownload = await settingsDownloadPromise;
  const settingsPath = await settingsDownload.path();
  expect(settingsPath).toBeTruthy();
  const settingsChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import Settings" }).click();
  const settingsChooser = await settingsChooserPromise;
  await settingsChooser.setFiles(settingsPath!);
});

test("browser: Liquid Metal 3D exports image video and background outputs", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openLiquidMetalApp(page);
  await uploadObjModel(page);
  await pausePlayback(page);
  await expectNoForbiddenCanvasUi(page);
  await expectCanvasHandlesUseToolcraftVisualLanguage(page);
  await expectToolcraftProductObservableToChange(page, () =>
    dragCanvasHandle(page, "liquid-metal-orientation-gizmo", {
      start: { x: 59.5, y: 35 },
      x: 18,
      y: 18,
    }),
  );
  const exportOrbitPose = await page
    .locator("[data-toolcraft-product-output]")
    .getAttribute("data-view-orbit");
  expect(exportOrbitPose).not.toBe(
    JSON.stringify(DEFAULT_LIQUID_METAL_ORBIT_POSE),
  );
  await selectToolcraftOption(page, {
    label: "Source",
    optionName: "Warm",
  });

  const includeBackground = (
    await getToolcraftFieldByLabel(page, "Include")
  ).getByRole("switch");
  await expect(includeBackground).toHaveAttribute("aria-checked", "true");
  await expectToolcraftProductObservableToChange(page, () =>
    clickToolcraftSwitch(page, "Include"),
  );
  await expect(includeBackground).toHaveAttribute("aria-checked", "false");
  await selectToolcraftOption(page, {
    currentText: /4K/,
    label: "Resolution",
    optionName: "2K",
  });

  const pngDownloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await expectExportExcludesCanvasHandles(page, () =>
    page.getByRole("button", { name: "Export PNG" }).click(),
  );
  const pngDownload = await pngDownloadPromise;
  const pngPath = await pngDownload.path();
  expect(pngPath).toBeTruthy();
  const png = await decodeDownloadedImage(page, pngPath!, "image/png");
  expect(png).toMatchObject({ alpha: 0, height: 1152, width: 2048 });

  await expectToolcraftProductObservableToChange(page, () =>
    page.getByRole("button", { name: "Reset Model Size section" }).click(),
  );
  await expect(page.locator("[data-toolcraft-product-output]")).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(DEFAULT_LIQUID_METAL_ORBIT_POSE),
  );
  await dragToolcraftSliderToValue(page, "Model scale", 1.25);

  await expectToolcraftProductObservableToChange(page, () =>
    clickToolcraftSwitch(page, "Include"),
  );
  await expect(includeBackground).toHaveAttribute("aria-checked", "true");
  const sceneBackgroundHex = page.getByLabel("Background hex").last();
  await sceneBackgroundHex.fill("#101820");
  await sceneBackgroundHex.press("Enter");
  await sceneBackgroundHex.blur();
  await selectToolcraftOption(page, {
    currentText: /PNG/,
    label: "Format",
    optionName: "JPG",
  });
  await selectToolcraftOption(page, {
    currentText: /2K/,
    label: "Resolution",
    optionName: "8K",
  });
  await selectToolcraftOption(page, {
    currentText: /8K/,
    label: "Resolution",
    optionName: "2K",
  });
  await selectToolcraftOption(page, {
    currentText: /MP4/,
    label: "Format",
    optionName: "WebM",
  });
  await selectVideoResolution(page, "4K");
  await selectVideoResolution(page, "Current");

  await clickToolcraftSwitch(page, "Timeline");
  const timelineDurationSeconds = 1;
  await editTimelineDuration(page, String(timelineDurationSeconds));
  const videoDownloadPromise = page.waitForEvent("download", {
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Export Video" }).click();
  const videoDownload = await videoDownloadPromise;
  const videoPath = await videoDownload.path();
  expect(videoPath).toBeTruthy();
  expect(readFileSync(videoPath!).byteLength).toBeGreaterThan(1024);
  expect(videoDownload.suggestedFilename()).toMatch(/\.(?:mp4|webm)$/);
  const currentMimeType = videoDownload.suggestedFilename().endsWith(".mp4")
    ? "video/mp4"
    : "video/webm";
  const currentVideoMetadata = await readExportedVideoDurationAndSize(
    page,
    videoPath!,
    currentMimeType,
  );
  expect(currentVideoMetadata.videoWidth).toBe(1920);
  expect(currentVideoMetadata.videoHeight).toBe(1080);
  expect(currentVideoMetadata.durationSeconds).toBeGreaterThan(0);
  if (Number.isFinite(currentVideoMetadata.durationSeconds)) {
    expect(currentVideoMetadata.durationSeconds).toBeLessThan(
      timelineDurationSeconds + 1,
    );
  }

  await selectVideoResolution(page, "4K");
  const video4kDownloadPromise = page.waitForEvent("download", {
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Export Video" }).click();
  const video4kDownload = await video4kDownloadPromise;
  const video4kPath = await video4kDownload.path();
  expect(video4kPath).toBeTruthy();
  const video4kMimeType = video4kDownload.suggestedFilename().endsWith(".mp4")
    ? "video/mp4"
    : "video/webm";
  const video4kMetadata = await readExportedVideoDurationAndSize(
    page,
    video4kPath!,
    video4kMimeType,
  );
  expect(video4kMetadata.videoWidth).toBe(3840);
  expect(video4kMetadata.videoHeight).toBe(2160);

  const videoMeta = await page.evaluate(() => {
    const value = window.__toolcraftLastVideoExport;
    return value
      ? {
          durationSeconds: value.durationSeconds,
          height: value.height,
          type: value.type,
          width: value.width,
        }
      : null;
  });
  expect(videoMeta).toMatchObject({
    durationSeconds: timelineDurationSeconds,
    height: 2160,
    width: 3840,
  });
  expect(videoMeta?.type).toMatch(/^video\//);
});
