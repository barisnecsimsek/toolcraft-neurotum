import { expect, type Page } from "@playwright/test";

import type { ToolcraftPerformancePath } from "@/toolcraft/runtime";

import { appPerformancePaths } from "../src/app/app-performance";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import type { ToolcraftCompiledFixtureApplications } from "./performance-compiled-fixture-runtime";
import type { ToolcraftPerformancePathAdapter } from "./performance-path-adapter-contract";

const canvasSelector = '[data-slot="frozen-webgl-canvas"]';
const outputSelector = '[data-slot="frozen-product-output"]';
const fixtureByPage = new WeakMap<Page, string>();
const uploadSequenceByPage = new WeakMap<Page, number>();

type FixtureApplicationsFactory = (
  page: Page,
  dimensions: readonly string[],
) => ToolcraftCompiledFixtureApplications;

function requirePath(
  interaction: ToolcraftPerformancePath["interaction"],
  target: string,
): ToolcraftPerformancePath {
  const path = appPerformancePaths.find(
    (candidate) =>
      candidate.interaction === interaction && candidate.targets.includes(target),
  );
  if (!path) throw new Error(`Missing Frozen ${interaction} performance path.`);
  return path;
}

const imageMediaPath = requirePath("media-import", "source.image");
const imageSliderPath = requirePath("control-drag", "source.imageThickness");

function sourceImageEdge(appliedValue: string): number {
  if (appliedValue === "small-source-image") return 128;
  if (appliedValue === "maximum-source-image") return 2_048;
  throw new Error(`Unknown Frozen source image fixture ${appliedValue}.`);
}

async function openFrozen(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-model-status",
    "empty",
  );
}

export async function selectFrozenSourceModeForPerformance(
  page: Page,
  label: "3D" | "Image",
): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "source.mode");
  const item = control
    .locator('[data-slot="toggle-group-item"]')
    .filter({ hasText: label });
  if ((await item.getAttribute("aria-pressed")) !== "true") await item.click();
  await expect(page.locator(outputSelector)).toHaveAttribute(
    "data-source-mode",
    label === "Image" ? "image" : "model",
  );
}

async function createSourceImageBuffer(page: Page, edge: number): Promise<Buffer> {
  const base64 = await page.evaluate((size) => {
    const image = document.createElement("canvas");
    image.width = size;
    image.height = size;
    const context = image.getContext("2d");
    if (!context) throw new Error("Could not create performance source image.");
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#FF3C30");
    gradient.addColorStop(0.5, "#18B66B");
    gradient.addColorStop(1, "#176BFF");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    context.fillStyle = "#FFE83D";
    context.fillRect(0, 0, Math.max(1, size / 4), Math.max(1, size / 4));
    return image.toDataURL("image/png").split(",")[1];
  }, edge);
  return Buffer.from(base64, "base64");
}

export async function applyFrozenSourceImageFixture(
  page: Page,
  appliedValue: string,
): Promise<void> {
  const edge = sourceImageEdge(appliedValue);
  fixtureByPage.set(page, appliedValue);
  const sequence = (uploadSequenceByPage.get(page) ?? 0) + 1;
  uploadSequenceByPage.set(page, sequence);
  await selectFrozenSourceModeForPerformance(page, "Image");
  const canvas = page.locator(canvasSelector);
  const previousSourceId = await canvas.getAttribute("data-model-source-id");
  const control = await getToolcraftControlFieldByTarget(page, "source.image");
  await control.locator('input[type="file"]').setInputFiles({
    buffer: await createSourceImageBuffer(page, edge),
    mimeType: "image/png",
    name: `${appliedValue}-${sequence}.png`,
  });
  await expect
    .poll(() => canvas.getAttribute("data-model-source-id"), { timeout: 90_000 })
    .not.toBe(previousSourceId);
  await expect(canvas).toHaveAttribute("data-model-kind", "image", {
    timeout: 90_000,
  });
}

export async function observeFrozenSourceImageFixture(
  page: Page,
): Promise<string> {
  const label =
    (await page.locator(canvasSelector).getAttribute("data-image-source-label")) ?? "";
  return label.includes("maximum-source-image")
    ? "maximum-source-image"
    : "small-source-image";
}

async function reapplySourceImage(page: Page): Promise<void> {
  const fixture = fixtureByPage.get(page);
  if (!fixture) {
    throw new Error("Frozen performance source image fixture was not applied.");
  }
  await applyFrozenSourceImageFixture(page, fixture);
}

async function dragImageThickness(page: Page): Promise<void> {
  await selectFrozenSourceModeForPerformance(page, "Image");
  const control = await getToolcraftControlFieldByTarget(
    page,
    "source.imageThickness",
  );
  const slider = control.locator('[data-slot="slider"]');
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (!box) throw new Error("Image Thickness slider is not measurable.");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.28, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.78, y, { steps: 8 });
  await page.mouse.up();
}

async function prepareImageGeometryPath(page: Page): Promise<void> {
  await openFrozen(page);
  await applyFrozenSourceImageFixture(page, "small-source-image");
  await selectFrozenSourceModeForPerformance(page, "3D");
}

export function createFrozenImagePerformancePathAdapters(
  fixtureApplications: FixtureApplicationsFactory,
): readonly ToolcraftPerformancePathAdapter[] {
  return [
    {
      action: async ({ page }) => reapplySourceImage(page),
      fixtureApplications: (page) =>
        fixtureApplications(page, imageMediaPath.workloadDimensions),
      observeOutcome: ({ page }) =>
        page.locator(canvasSelector).getAttribute("data-model-source-id"),
      pathId: imageMediaPath.id,
      prepare: openFrozen,
    },
    {
      action: async ({ page }) => dragImageThickness(page),
      fixtureApplications: (page) =>
        fixtureApplications(page, imageSliderPath.workloadDimensions),
      observeOutcome: ({ page }) =>
        page.locator(canvasSelector).getAttribute("data-image-depth"),
      pathId: imageSliderPath.id,
      prepare: prepareImageGeometryPath,
    },
  ];
}
