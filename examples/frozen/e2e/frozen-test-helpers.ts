import type { Locator, Page } from "@playwright/test";

import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expect } from "./toolcraft-product-test";

export const frozenOutputSelector = '[data-slot="frozen-product-output"]';
export const frozenCanvasSelector = '[data-slot="frozen-webgl-canvas"]';

export type FrozenDownloadArtifact = Readonly<{
  base64: string;
  byteLength: number;
  fileName: string;
}>;

export type FrozenImageInspection = Readonly<{
  backgroundAlpha: number;
  byteLength: number;
  contentHash: string;
  height: number;
  mediaType: string;
  width: number;
}>;

const tetrahedronObj = [
  "v 0 1 0",
  "v -1 -1 1",
  "v 1 -1 1",
  "v 0 -1 -1",
  "f 1 2 3",
  "f 1 3 4",
  "f 1 4 2",
  "f 2 4 3",
].join("\n");

function frozenUvSphereObj(segments = 24, rings = 12): string {
  const lines = ["v 0 1 0"];
  const ringIndex = (ring: number, segment: number) =>
    2 + (ring - 1) * segments + (segment % segments);
  for (let ring = 1; ring < rings; ring += 1) {
    const phi = (Math.PI * ring) / rings;
    const radius = Math.sin(phi);
    const y = Math.cos(phi);
    for (let segment = 0; segment < segments; segment += 1) {
      const theta = (Math.PI * 2 * segment) / segments;
      lines.push(
        `v ${radius * Math.cos(theta)} ${y} ${radius * Math.sin(theta)}`,
      );
    }
  }
  const bottom = 2 + (rings - 1) * segments;
  lines.push("v 0 -1 0");
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    lines.push(`f 1 ${ringIndex(1, next)} ${ringIndex(1, segment)}`);
    for (let ring = 1; ring < rings - 1; ring += 1) {
      const current = ringIndex(ring, segment);
      const currentNext = ringIndex(ring, next);
      const below = ringIndex(ring + 1, segment);
      const belowNext = ringIndex(ring + 1, next);
      lines.push(`f ${current} ${currentNext} ${below}`);
      lines.push(`f ${currentNext} ${belowNext} ${below}`);
    }
    lines.push(
      `f ${bottom} ${ringIndex(rings - 1, segment)} ${ringIndex(rings - 1, next)}`,
    );
  }
  return lines.join("\n");
}

export async function openFrozen(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  const canvas = page.locator(frozenCanvasSelector);
  await expect(canvas).toHaveAttribute(
    "data-model-status",
    "ready",
    { timeout: 30_000 },
  );
  await expect(canvas).toHaveAttribute(
    "data-model-label",
    "Night King optimized 28k.zip",
  );
  await expect(canvas).toHaveAttribute(
    "data-scratch-status",
    "ready",
    { timeout: 15_000 },
  );
  await expect(canvas).toHaveAttribute(
    "data-scratch-label",
    "Black Painted Wall Texture.jpg",
  );
}

export async function uploadFrozenObj(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "source.model");
  const input = control.locator('input[type="file"]');
  await expect(input).toHaveCount(1);
  await input.setInputFiles({
    buffer: Buffer.from(tetrahedronObj),
    mimeType: "text/plain",
    name: "asymmetric-tetrahedron.obj",
  });
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-status",
    "ready",
    { timeout: 15_000 },
  );
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-triangle-count",
    "4",
  );
}

export async function uploadFrozenSphereObj(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "source.model");
  await control.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(frozenUvSphereObj()),
    mimeType: "text/plain",
    name: "smooth-ice-sphere.obj",
  });
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-status",
    "ready",
    { timeout: 15_000 },
  );
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-triangle-count",
    "528",
  );
}

export async function createFrozenScratchPng(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const texture = document.createElement("canvas");
    texture.width = 8;
    texture.height = 8;
    const context = texture.getContext("2d");
    if (!context) throw new Error("Could not create the scratch fixture.");
    const gradient = context.createLinearGradient(0, 0, 8, 8);
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(0.45, "#FFFFFF");
    gradient.addColorStop(0.55, "#000000");
    gradient.addColorStop(1, "#FFFFFF");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 8, 8);
    return texture.toDataURL("image/png").split(",")[1];
  });
  return Buffer.from(base64, "base64");
}

export async function createFrozenSourcePng(
  page: Page,
  width = 160,
  height = 80,
): Promise<Buffer> {
  const base64 = await page.evaluate(
    ({ fixtureHeight, fixtureWidth }) => {
      const image = document.createElement("canvas");
      image.width = fixtureWidth;
      image.height = fixtureHeight;
      const context = image.getContext("2d");
      if (!context) throw new Error("Could not create the source image fixture.");
      context.fillStyle = "#F43B30";
      context.fillRect(0, 0, fixtureWidth / 2, fixtureHeight);
      context.fillStyle = "#146CFF";
      context.fillRect(fixtureWidth / 2, 0, fixtureWidth / 2, fixtureHeight);
      context.fillStyle = "#F9ED38";
      context.fillRect(0, 0, fixtureWidth * 0.22, fixtureHeight * 0.28);
      context.fillStyle = "#121820";
      context.fillRect(
        fixtureWidth * 0.72,
        fixtureHeight * 0.66,
        fixtureWidth * 0.28,
        fixtureHeight * 0.34,
      );
      return image.toDataURL("image/png").split(",")[1];
    },
    { fixtureHeight: height, fixtureWidth: width },
  );
  return Buffer.from(base64, "base64");
}

export async function selectFrozenSourceMode(
  page: Page,
  label: "3D" | "Image",
): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "source.mode");
  const item = control
    .locator('[data-slot="toggle-group-item"]')
    .filter({ hasText: label });
  await expect(item).toHaveCount(1);
  if ((await item.getAttribute("aria-pressed")) !== "true") {
    await item.click();
  }
  await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
    "data-source-mode",
    label === "Image" ? "image" : "model",
  );
}

export async function uploadFrozenSourceImage(page: Page): Promise<void> {
  await selectFrozenSourceMode(page, "Image");
  const control = await getToolcraftControlFieldByTarget(page, "source.image");
  await control.locator('input[type="file"]').setInputFiles({
    buffer: await createFrozenSourcePng(page),
    mimeType: "image/png",
    name: "asymmetric-source.png",
  });
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-status",
    "ready",
    { timeout: 15_000 },
  );
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-kind",
    "image",
  );
}

export async function dragFrozenSlider(
  control: Locator,
  page: Page,
  ratio = 0.78,
): Promise<void> {
  const slider = control.locator('[data-slot="slider"]');
  await expect(slider).toHaveCount(1);
  await slider.scrollIntoViewIfNeeded();
  const bounds = await slider.boundingBox();
  expect(bounds).not.toBeNull();
  const canvas = page.locator(frozenCanvasSelector);
  const before = await canvas.getAttribute("data-frozen-rendered");
  const startX = bounds!.x + Math.max(2, bounds!.width * 0.22);
  const targetX = bounds!.x + Math.max(2, bounds!.width * ratio);
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(targetX, y, { steps: 7 });
  await expect
    .poll(() => canvas.getAttribute("data-frozen-rendered"), {
      message: "Frozen output must update while the slider pointer is still down.",
    })
    .not.toBe(before);
  await page.mouse.up();
}

export async function setFrozenColor(
  control: Locator,
  label: string,
  hex: string,
): Promise<void> {
  const input = control.getByRole("textbox", { name: `${label} hex` });
  await expect(input).toHaveCount(1);
  await input.fill(hex);
  await input.press("Enter");
}

export async function toggleFrozenSwitch(control: Locator): Promise<void> {
  const toggle = control.getByRole("switch");
  await expect(toggle).toHaveCount(1);
  await toggle.click();
}

export async function selectFrozenOption(
  control: Locator,
  page: Page,
  optionName: string,
): Promise<void> {
  const trigger = control.getByRole("combobox");
  await expect(trigger).toHaveCount(1);
  await trigger.click();
  const option = page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: optionName });
  await expect(option).toHaveCount(1);
  await option.click();
}

export async function downloadFrozenImage(
  page: Page,
): Promise<FrozenDownloadArtifact> {
  const control = await getToolcraftControlFieldByTarget(page, "actions.output");
  const button = control.getByRole("button", { name: "Export PNG" });
  await expect(button).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const stickyActions = page.locator(
    '[data-slot="toolcraft-panel-sticky-actions"]',
  );
  await expect(stickyActions).toHaveAttribute("data-sticky-footer-active", "true");
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  await expect(stickyActions).not.toHaveAttribute(
    "data-sticky-footer-active",
    "true",
  );
  return {
    base64: bytes.toString("base64"),
    byteLength: bytes.byteLength,
    fileName: download.suggestedFilename(),
  };
}

export async function inspectFrozenImage(
  page: Page,
  artifact: FrozenDownloadArtifact,
): Promise<FrozenImageInspection> {
  const decoded = await page.evaluate(async ({ base64, fileName }) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const mediaType = fileName.toLowerCase().endsWith(".jpg")
      ? "image/jpeg"
      : "image/png";
    const blob = new Blob([bytes], { type: mediaType });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const sample = document.createElement("canvas");
      sample.width = 64;
      sample.height = 64;
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Could not inspect exported image pixels.");
      context.drawImage(image, 0, 0, 64, 64);
      const pixels = context.getImageData(0, 0, 64, 64).data;
      let hash = 2166136261;
      for (const value of pixels) {
        hash ^= value;
        hash = Math.imul(hash, 16777619);
      }
      return {
        backgroundAlpha: pixels[3] ?? 0,
        contentHash: (hash >>> 0).toString(16),
        height: image.naturalHeight,
        mediaType,
        width: image.naturalWidth,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }, artifact);
  return { ...decoded, byteLength: artifact.byteLength };
}

export async function readFrozenOutputSignature(page: Page): Promise<string> {
  return page.locator(frozenCanvasSelector).evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 48;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return "no-context";
    context.drawImage(element, 0, 0, 48, 48);
    const pixels = context.getImageData(0, 0, 48, 48).data;
    let hash = 2166136261;
    for (const value of pixels) {
      hash ^= value;
      hash = Math.imul(hash, 16777619);
    }
    return `${element.dataset.frozenRendered}:${(hash >>> 0).toString(16)}`;
  });
}

export async function readFrozenTopCornerCoverage(page: Page): Promise<number> {
  return page.locator(frozenCanvasSelector).evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 160;
    sample.height = 90;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return 0;
    context.drawImage(element, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const background = [pixels[0], pixels[1], pixels[2]];
    const isForeground = (x: number, y: number) => {
      const index = (y * sample.width + x) * 4;
      return (
        Math.abs(pixels[index] - background[0]) +
          Math.abs(pixels[index + 1] - background[1]) +
          Math.abs(pixels[index + 2] - background[2]) >
        90
      );
    };
    let minX = sample.width;
    let minY = sample.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sample.height; y += 1) {
      for (let x = 0; x < sample.width; x += 1) {
        if (!isForeground(x, y)) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX <= minX || maxY <= minY) return 0;
    const cornerWidth = Math.max(2, Math.floor((maxX - minX + 1) * 0.12));
    const cornerHeight = Math.max(2, Math.floor((maxY - minY + 1) * 0.18));
    let foreground = 0;
    let samples = 0;
    for (let y = minY; y < minY + cornerHeight; y += 1) {
      for (let offset = 0; offset < cornerWidth; offset += 1) {
        foreground += Number(isForeground(minX + offset, y));
        foreground += Number(isForeground(maxX - offset, y));
        samples += 2;
      }
    }
    return foreground / samples;
  });
}
