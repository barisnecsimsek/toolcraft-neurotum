import { expect, type Page } from "@playwright/test";

import type { ToolcraftPerformancePath } from "@/toolcraft/runtime";

import { appPerformancePaths } from "../src/app/app-performance";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import {
  dragFrozenMeltBrush,
  prepareFrozenMeltPerformance,
} from "./frozen-melt-performance-path-adapters";
import {
  createFrozenStlBuffer,
  getFrozenSourceTriangleCount,
} from "./frozen-model-performance-fixtures";
import {
  applyFrozenModelTriangleBudget,
  dragFrozenModelTriangleBudget,
  observeFrozenModelTriangleBudget,
} from "./frozen-model-budget-performance-path-adapter";
import {
  applyFrozenSourceImageFixture,
  createFrozenImagePerformancePathAdapters,
  observeFrozenSourceImageFixture,
  selectFrozenSourceModeForPerformance,
} from "./frozen-image-performance-path-adapters";
import {
  applyFrozenExportWidth,
  frozenDownloadSize,
  observeFrozenExportWidth,
} from "./frozen-export-performance-fixtures";
import { dragFrozenSlider } from "./frozen-test-helpers";
import type { ToolcraftCompiledFixtureApplications } from "./performance-compiled-fixture-runtime";
import type { ToolcraftPerformancePathAdapter } from "./performance-path-adapter-contract";

const canvasSelector = '[data-slot="frozen-webgl-canvas"]';
const outputSelector = '[data-slot="frozen-product-output"]';
const worldSelector = "[data-toolcraft-canvas-world]";
const sourceFixtureByPage = new WeakMap<Page, string>();
const sourceUploadSequenceByPage = new WeakMap<Page, number>();
const scratchFixtureByPage = new WeakMap<Page, string>();
const scratchUploadSequenceByPage = new WeakMap<Page, number>();

function requirePath(
  interaction: ToolcraftPerformancePath["interaction"],
  target?: string,
): ToolcraftPerformancePath {
  const path = appPerformancePaths.find(
    (candidate) =>
      candidate.interaction === interaction &&
      (target === undefined || candidate.targets.includes(target)),
  );
  if (!path) throw new Error(`Missing Frozen ${interaction} performance path.`);
  return path;
}

const paths = {
  export: requirePath("export"),
  exportOption: requirePath("control-change", "export.image.format"),
  media: requirePath("media-import", "source.model"),
  modelBudget: requirePath("control-drag", "source.modelTriangleBudget"),
  melt: requirePath("mask-drag", "melt.temperatureField"),
  meltFrame: requirePath("animation-frame", "melt.temperatureField"),
  orbit: requirePath("viewport-drag", "scene.orientation"),
  pan: requirePath("viewport-drag", "canvas.viewport.offset"),
  previewChange: requirePath("control-change", "export.includeBackground"),
  slider: requirePath("control-drag", "effect.progress"),
  scratchMedia: requirePath("media-import", "source.scratchTexture"),
  zoom: requirePath("viewport-zoom"),
} as const;

function requireString(value: unknown, dimensionId: string): string {
  if (typeof value !== "string") {
    throw new Error(`${dimensionId} fixture must apply a string value.`);
  }
  return value;
}

function requireNumber(value: unknown, dimensionId: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${dimensionId} fixture must apply a finite number.`);
  }
  return value;
}

async function openFrozen(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-model-status",
    "ready",
    { timeout: 30_000 },
  );
}

async function prepareExportOption(page: Page): Promise<void> {
  await openFrozen(page);
  const control = await getToolcraftControlFieldByTarget(page, "export.image.format");
  await control.getByRole("combobox").scrollIntoViewIfNeeded();
}

async function applySource(page: Page, appliedValue: string): Promise<void> {
  const triangleCount = getFrozenSourceTriangleCount(appliedValue);
  sourceFixtureByPage.set(page, appliedValue);
  const uploadSequence = (sourceUploadSequenceByPage.get(page) ?? 0) + 1;
  sourceUploadSequenceByPage.set(page, uploadSequence);
  const canvas = page.locator(canvasSelector);
  const restoreImageMode =
    (await page.locator(outputSelector).getAttribute("data-source-mode")) === "image";
  if (restoreImageMode) {
    await selectFrozenSourceModeForPerformance(page, "3D");
  }
  const previousSourceId = await canvas.getAttribute("data-model-source-id");
  const control = await getToolcraftControlFieldByTarget(page, "source.model");
  await control.locator('input[type="file"]').setInputFiles({
    buffer: createFrozenStlBuffer(triangleCount),
    mimeType: "model/stl",
    name: `${appliedValue}-${uploadSequence}.stl`,
  });
  await expect
    .poll(() => canvas.getAttribute("data-model-source-id"), { timeout: 90_000 })
    .not.toBe(previousSourceId);
  await expect(canvas).toHaveAttribute(
    "data-triangle-count",
    String(triangleCount),
    { timeout: 90_000 },
  );
  await expect(canvas).toHaveAttribute(
    "data-model-status",
    "ready",
  );
  if (restoreImageMode) {
    await selectFrozenSourceModeForPerformance(page, "Image");
  }
}

async function observeSource(page: Page): Promise<string> {
  const count = Number(
    await page
      .locator(canvasSelector)
      .getAttribute("data-model-source-triangle-count"),
  );
  return count === getFrozenSourceTriangleCount("maximum-stl")
    ? "maximum-stl"
    : "small-stl";
}

function scratchEdge(appliedValue: string): number {
  if (appliedValue === "small-scratch") return 128;
  if (appliedValue === "maximum-scratch") return 2_048;
  throw new Error(`Unknown Frozen scratch fixture ${appliedValue}.`);
}

async function createScratchBuffer(page: Page, edge: number): Promise<Buffer> {
  const base64 = await page.evaluate((size) => {
    const texture = document.createElement("canvas");
    texture.width = size;
    texture.height = size;
    const context = texture.getContext("2d");
    if (!context) throw new Error("Could not create performance scratch fixture.");
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(0.48, "#FFFFFF");
    gradient.addColorStop(0.52, "#000000");
    gradient.addColorStop(1, "#FFFFFF");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return texture.toDataURL("image/png").split(",")[1];
  }, edge);
  return Buffer.from(base64, "base64");
}

async function applyScratch(page: Page, appliedValue: string): Promise<void> {
  const edge = scratchEdge(appliedValue);
  scratchFixtureByPage.set(page, appliedValue);
  const sequence = (scratchUploadSequenceByPage.get(page) ?? 0) + 1;
  scratchUploadSequenceByPage.set(page, sequence);
  const canvas = page.locator(canvasSelector);
  const previousSourceId = await canvas.getAttribute("data-scratch-source-id");
  const control = await getToolcraftControlFieldByTarget(
    page,
    "source.scratchTexture",
  );
  await control.locator('input[type="file"]').setInputFiles({
    buffer: await createScratchBuffer(page, edge),
    mimeType: "image/png",
    name: `${appliedValue}-${sequence}.png`,
  });
  await expect
    .poll(() => canvas.getAttribute("data-scratch-source-id"), { timeout: 90_000 })
    .not.toBe(previousSourceId);
  await expect(canvas).toHaveAttribute("data-scratch-status", "ready", {
    timeout: 90_000,
  });
}

async function observeScratch(page: Page): Promise<string> {
  const label =
    (await page.locator(canvasSelector).getAttribute("data-scratch-label")) ?? "";
  return label.includes("maximum-scratch") ? "maximum-scratch" : "small-scratch";
}

async function editSliderValue(
  page: Page,
  target: string,
  label: string,
  value: string,
): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, target);
  const edit = control.getByRole("button", { name: `Edit ${label} value` });
  await edit.scrollIntoViewIfNeeded();
  await edit.click();
  const editor = control.getByRole("textbox", { name: `${label} value` });
  await editor.fill(value);
  await editor.press("Enter");
}

async function applyDensity(
  page: Page,
  target: "ice.crystalDensity" | "ice.icicleDensity",
  value: number,
): Promise<void> {
  const crystals = target === "ice.crystalDensity";
  const label = crystals ? "Surface coverage" : "Icicle coverage";
  await editSliderValue(page, target, label, String(value));
  const control = await getToolcraftControlFieldByTarget(page, target);
  await expect(control.getByRole("slider")).toHaveAttribute(
    "aria-valuenow",
    String(value),
  );
}

async function observeDensity(
  page: Page,
  target: "ice.crystalDensity" | "ice.icicleDensity",
): Promise<number> {
  const control = await getToolcraftControlFieldByTarget(page, target);
  return Number(await control.getByRole("slider").getAttribute("aria-valuenow"));
}

async function applyRenderScale(page: Page, value: number): Promise<void> {
  await editSliderValue(page, "canvas.renderScale", "Resolution scale", String(value));
  await expect(page.locator(canvasSelector)).toHaveAttribute(
    "data-render-width",
    String(Math.round(1920 * value)),
  );
}

async function observeRenderScale(page: Page): Promise<number> {
  return Number(
    await page.locator(canvasSelector).getAttribute("data-render-scale"),
  );
}

function fixtureApplications(
  page: Page,
  dimensions: readonly string[],
): ToolcraftCompiledFixtureApplications {
  const applications: ToolcraftCompiledFixtureApplications = {
    "surface-crystal-coverage": {
      applyValue: (value) =>
        applyDensity(page, "ice.crystalDensity", requireNumber(value, "crystals")),
      observeValue: () => observeDensity(page, "ice.crystalDensity"),
    },
    "export-width-px": {
      applyValue: (value) =>
        applyFrozenExportWidth(page, requireString(value, "export")),
      observeValue: () => observeFrozenExportWidth(page),
    },
    "icicle-coverage": {
      applyValue: (value) =>
        applyDensity(page, "ice.icicleDensity", requireNumber(value, "icicles")),
      observeValue: () => observeDensity(page, "ice.icicleDensity"),
    },
    "model-render-triangles": {
      applyValue: (value) =>
        applyFrozenModelTriangleBudget(
          page,
          requireNumber(value, "model render triangles"),
        ),
      observeValue: () => observeFrozenModelTriangleBudget(page),
    },
    "physical-transmission": {
      applyValue: (value) =>
        editSliderValue(page, "ice.transmission", "Transmission", String(
          requireNumber(value, "physical transmission"),
        )),
      observeValue: async () => {
        const control = await getToolcraftControlFieldByTarget(page, "ice.transmission");
        return Number(
          await control.getByRole("slider").getAttribute("aria-valuenow"),
        );
      },
    },
    "preview-render-scale": {
      applyValue: (value) => applyRenderScale(page, requireNumber(value, "render scale")),
      observeValue: () => observeRenderScale(page),
    },
    "scratch-texture-pixels": {
      applyValue: (value) => applyScratch(page, requireString(value, "scratch")),
      observeValue: () => observeScratch(page),
    },
    "source-image-pixels": {
      applyValue: (value) =>
        applyFrozenSourceImageFixture(
          page,
          requireString(value, "source image"),
        ),
      observeValue: () => observeFrozenSourceImageFixture(page),
    },
    "source-triangles": {
      applyValue: (value) => applySource(page, requireString(value, "source")),
      observeValue: () => observeSource(page),
    },
  };
  return Object.fromEntries(
    dimensions.map((dimensionId) => [dimensionId, applications[dimensionId]!]),
  );
}

async function reapplySource(page: Page): Promise<void> {
  const source = sourceFixtureByPage.get(page);
  if (!source) throw new Error("Frozen performance source fixture was not applied.");
  await applySource(page, source);
}

async function reapplyScratch(page: Page): Promise<void> {
  const scratch = scratchFixtureByPage.get(page);
  if (!scratch) throw new Error("Frozen scratch fixture was not applied.");
  await applyScratch(page, scratch);
}

async function dragProgress(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "effect.progress");
  const currentValue = Number(await control.getByRole("slider").inputValue());
  await dragFrozenSlider(control, page, currentValue > 50 ? 0.28 : 0.76);
}

async function dragModel(page: Page): Promise<void> {
  const canvas = page.locator(canvasSelector);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Frozen canvas is not measurable.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 48, y + 22, { steps: 8 });
  await page.mouse.up();
}

async function panCanvas(page: Page): Promise<void> {
  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const world = page.locator(worldSelector);
  const before = await world.getAttribute("data-toolcraft-canvas-offset-x");
  const box = await viewport.boundingBox();
  if (!box) throw new Error("Canvas viewport is not measurable.");
  await page.mouse.move(box.x + 32, box.y + 32);
  await page.mouse.down();
  await page.mouse.move(box.x + 88, box.y + 68, { steps: 8 });
  await page.mouse.up();
  await expect(world).not.toHaveAttribute("data-toolcraft-canvas-offset-x", before ?? "0");
}

async function zoomCanvas(page: Page): Promise<void> {
  const world = page.locator(worldSelector);
  const before = await world.getAttribute("data-toolcraft-canvas-zoom");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(world).not.toHaveAttribute("data-toolcraft-canvas-zoom", before ?? "100");
}

async function togglePreviewBackground(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(
    page,
    "export.includeBackground",
  );
  await control.getByRole("switch").click();
}

async function toggleExportFormat(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "export.image.format");
  const trigger = control.getByRole("combobox");
  const next = (await trigger.getAttribute("title")) === "PNG" ? "JPG" : "PNG";
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: next }).click();
  await expect(trigger).toHaveAttribute("title", next);
}

const previewDimensions = paths.slider.workloadDimensions;

export const appPerformancePathAdapters = [
  {
    action: async ({ page }) => reapplySource(page),
    fixtureApplications: (page) => fixtureApplications(page, paths.media.workloadDimensions),
    observeOutcome: ({ page }) =>
      page.locator(canvasSelector).getAttribute("data-model-source-id"),
    pathId: paths.media.id,
    prepare: openFrozen,
  },
  ...createFrozenImagePerformancePathAdapters(fixtureApplications),
  {
    action: async ({ page }) => reapplyScratch(page),
    fixtureApplications: (page) =>
      fixtureApplications(page, paths.scratchMedia.workloadDimensions),
    observeOutcome: ({ page }) =>
      page.locator(canvasSelector).getAttribute("data-scratch-source-id"),
    pathId: paths.scratchMedia.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => dragProgress(page),
    fixtureApplications: (page) => fixtureApplications(page, previewDimensions),
    observeOutcome: ({ page }) =>
      page.locator(canvasSelector).getAttribute("data-frozen-rendered"),
    pathId: paths.slider.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => dragFrozenModelTriangleBudget(page),
    fixtureApplications: (page) =>
      fixtureApplications(page, paths.modelBudget.workloadDimensions),
    observeOutcome: ({ page }) =>
      page.locator(canvasSelector).getAttribute("data-model-source-id"),
    pathId: paths.modelBudget.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => dragFrozenMeltBrush(page),
    fixtureApplications: (page) =>
      fixtureApplications(page, paths.melt.workloadDimensions),
    observeOutcome: ({ page }) =>
      page.locator(canvasSelector).getAttribute("data-melt-revision"),
    pathId: paths.melt.id,
    prepare: (page) => prepareFrozenMeltPerformance(page, 0),
  },
  {
    action: async ({ page }) => dragFrozenMeltBrush(page),
    fixtureApplications: (page) =>
      fixtureApplications(page, paths.meltFrame.workloadDimensions),
    pathId: paths.meltFrame.id,
    prepare: (page) => prepareFrozenMeltPerformance(page, 100),
  },
  {
    action: async ({ page }) => dragModel(page),
    fixtureApplications: (page) => fixtureApplications(page, paths.orbit.workloadDimensions),
    pathId: paths.orbit.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => panCanvas(page),
    pathId: paths.pan.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => zoomCanvas(page),
    pathId: paths.zoom.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => togglePreviewBackground(page),
    fixtureApplications: (page) => fixtureApplications(page, paths.previewChange.workloadDimensions),
    observeOutcome: ({ page }) =>
      page.locator(outputSelector).getAttribute("data-include-background"),
    pathId: paths.previewChange.id,
    prepare: openFrozen,
  },
  {
    action: async ({ page }) => toggleExportFormat(page),
    observeOutcome: async ({ page }) => {
      const control = await getToolcraftControlFieldByTarget(page, "export.image.format");
      return control.getByRole("combobox").getAttribute("title");
    },
    pathId: paths.exportOption.id,
    prepare: prepareExportOption,
  },
  {
    fixtureApplications: (page) => fixtureApplications(page, paths.export.workloadDimensions),
    output: {
      kind: "download",
      label: "Export PNG",
      verify: async (download) => {
        expect(download.suggestedFilename()).toMatch(/\.png$/i);
        expect(await frozenDownloadSize(download)).toBeGreaterThan(1024);
      },
    },
    pathId: paths.export.id,
    prepare: openFrozen,
  },
] as const satisfies readonly ToolcraftPerformancePathAdapter[];
