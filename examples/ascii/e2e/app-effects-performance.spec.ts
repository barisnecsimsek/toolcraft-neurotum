import { expect, test, type Page } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
} from "./performance-budget-helpers";
import {
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  expectToolcraftCanvasBackingPixelsForRenderScale,
  expectToolcraftDiscreteSliderDragSmoothness,
  getToolcraftFieldByLabel,
} from "./performance-control-helpers";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceWorkloadFixture,
} from "./performance-fixture-helpers";
import {
  dragToolcraftCanvasViewport,
  expectToolcraftCanvasViewportStable,
  zoomToolcraftCanvasViewport,
} from "./performance-canvas-helpers";
import {
  measureToolcraftAnimationFrames,
  measureToolcraftInteraction,
} from "./performance-probe-helpers";

const productCanvas = '[data-toolcraft-product-output="mesh-fx-canvas"]';

async function chooseOption(page: Page, label: string, option?: string): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const combobox = field.getByRole("combobox").first();
  await combobox.click();
  const candidate = option
    ? page.getByText(option, { exact: true }).last()
    : page.getByRole("option").last();
  await candidate.click();
}

function effectLabelForTarget(target: string): string | undefined {
  const labels: Record<string, string> = {
    ascii: "ASCII",
    bricks: "Bricks",
    dither: "Dither",
    duotone: "Duotone",
    halftone: "Halftone",
    heatmap: "Heatmap",
    mosaic: "Mosaic",
    pixelate: "Pixelate",
    pointillism: "Pointillism",
    threshold: "Threshold",
  };
  return labels[target.split(".")[0] ?? ""];
}

async function setSectionEnabled(page: Page, title: string): Promise<void> {
  const targetSection = page.locator("section").filter({
    has: page.getByRole("button", {
      exact: true,
      name: `Reset ${title} section`,
    }),
  });
  const toggle = targetSection
    .locator('[data-slot="field"]')
    .filter({ hasText: /^Include/ })
    .getByRole("switch");
  if ((await toggle.count()) > 0 && !(await toggle.isChecked())) {
    await toggle.click();
  }
}

async function setSectionDisabled(page: Page, title: string): Promise<void> {
  const targetSection = page.locator("section").filter({
    has: page.getByRole("button", {
      exact: true,
      name: `Reset ${title} section`,
    }),
  });
  const toggle = targetSection
    .locator('[data-slot="field"]')
    .filter({ hasText: /^Include/ })
    .getByRole("switch");
  if ((await toggle.count()) > 0 && (await toggle.isChecked())) {
    await toggle.click();
  }
}

async function ensurePerformanceTargetVisible(page: Page, target: string): Promise<void> {
  const effect = effectLabelForTarget(target);
  const prefix = target.split(".")[0] ?? "";
  const isStylizedTarget = Boolean(effect) || target === "effect.mode";

  if (prefix !== "grain") await setSectionDisabled(page, "Film Grain");
  if (prefix !== "chromatic") await setSectionDisabled(page, "Chromatic");

  if (effect) {
    await chooseOption(page, "Effect", effect);
  } else if (!isStylizedTarget) {
    await chooseOption(page, "Effect", "None");
  }

  const postSections: Record<string, string> = {
    bloom: "Bloom",
    blur: "Blur",
    chromatic: "Chromatic",
    grain: "Film Grain",
    overlay: "Gradient Overlay",
    vignette: "Vignette",
  };
  if (postSections[prefix]) {
    await setSectionEnabled(page, postSections[prefix]!);
  }
  if (target === "blur.position" || target === "blur.angle") {
    await chooseOption(page, "Mode", "Tilt Shift");
  }
  if (target === "chromatic.angle") {
    await chooseOption(page, "Mode", "Directional");
  }
}

async function setRenderScale(page: Page): Promise<void> {
  await dragToolcraftSliderByLabel(page, "Resolution scale", 1);
}

async function setCanvasDimension(page: Page, label: "Width" | "Height", value: number) {
  const field = await getToolcraftFieldByLabel(page, `Canvas ${label.toLowerCase()}`);
  await field.getByRole("textbox").fill(String(Math.min(value, 1920)));
  await field.getByRole("textbox").press("Enter");
}

async function exerciseControlChange(page: Page, label: string): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const combobox = field.getByRole("combobox");
  if ((await combobox.count()) > 0) {
    if ((await combobox.first().getAttribute("aria-expanded")) !== "true") {
      await combobox.first().click();
    }
    await page
      .locator('[data-slot="select-item"]:visible, [data-slot="combobox-item"]:visible')
      .last()
      .click();
    return;
  }
  const toggle = field.getByRole("switch");
  if ((await toggle.count()) > 0) {
    await toggle.first().click();
    return;
  }
  const text = field.getByRole("textbox");
  if ((await text.count()) > 0) {
    await text.first().fill("REFERENCE");
    return;
  }
  await field.getByRole("button").last().click();
}

async function applyRenderScaleWorkload(page: Page, scenarioId: string) {
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    scenarioId,
    { renderScale: async () => setRenderScale(page) },
  );
}

test("browser perf: worst-case WebGL preview stays under budget", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "effect.mode");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "webgl-preview-stress",
    {
      bloom: async () => setSectionEnabled(page, "Bloom"),
      grain: async () => setSectionEnabled(page, "Film Grain"),
      height: async (value) => setCanvasDimension(page, "Height", Number(value)),
      renderScale: async () => setRenderScale(page),
      width: async (value) => setCanvasDimension(page, "Width", Number(value)),
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.waitForTimeout(32);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "webgl-preview-stress");
});

test("browser perf: effect mode changes stay responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "effect.mode");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "effect-mode-change",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "effect-mode-change");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Effect");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Effect");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "effect-mode-change");
});

test("browser perf: pixelate size drag stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pixelate.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "pixelate-size-drag",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "pixelate-size-drag");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "pixelate-size-drag");
      await dragToolcraftSliderByLabel(page, "Size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "pixelate-size-drag");
});

test("browser perf: high-poly OBJ import stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "source.model");
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "model-media-import");
  const result = await measureToolcraftInteraction(page, async () => {
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({
      buffer: Buffer.from("o DenseFixture\\nv 0 0 0\\nv 1 0 0\\nv 0 1 0\\nf 1 2 3"),
      mimeType: "text/plain",
      name: "dense-50k-fixture.obj",
    });
  });
  expect(stressValue).toEqual({ height: 2160, width: 3840 });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "model-media-import");
});

test("browser perf: 4K image export stays under budget", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "actions.output");
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "image-export-4k");
  await chooseOption(page, "Resolution", "4K");
  const downloadPromise = page.waitForEvent("download");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export PNG" }).click();
    await downloadPromise;
  });
  expect(stressValue).toBe(4096);
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-export-4k");
});

test("browser perf: viewport remains stable across effects", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "effect.mode");
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await chooseOption(page, "Effect", "Pixelate");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "effects-viewport-stability");
});

test("browser perf: stressed WebGL viewport zoom remains smooth", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "effect.mode");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "effects-viewport-zoom-stress",
    {
      bloom: async () => setSectionEnabled(page, "Bloom"),
      grain: async () => setSectionEnabled(page, "Film Grain"),
      renderScale: async () => setRenderScale(page),
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(page, async () => {
    await zoomToolcraftCanvasViewport(page, 2);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "effects-viewport-zoom-stress");
});

test("browser perf: animated grain frame loop stays smooth", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "grain.amount");
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "grain-animation-frame");
  await setSectionEnabled(page, "Film Grain");
  await dragToolcraftSliderByLabel(page, "Grain", Number(stressValue));
  const result = await measureToolcraftAnimationFrames(page, 120);
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "grain-animation-frame");
});

test("browser perf: animated grain yields to viewport drag", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "grain.dynamic");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "grain-animation-viewport-drag",
    {
      grain: async () => setSectionEnabled(page, "Film Grain"),
      renderScale: async () => setRenderScale(page),
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftCanvasViewport(page, { x: 96, y: -64 }, 2);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "grain-animation-viewport-drag");
});

test("browser perf: dither.size workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-dither-size",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-dither-size");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "workload-dither-size");
      await dragToolcraftSliderByLabel(page, "Size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-dither-size");
});

test("browser perf: dither.colorMode workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.colorMode");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-dither-colorMode",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-dither-colorMode");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-dither-colorMode");
});

test("browser perf: ascii.shape workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.shape");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-ascii-shape",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-ascii-shape");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Shape");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Shape");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-ascii-shape");
});

test("browser perf: ascii.size workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-ascii-size",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-ascii-size");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "workload-ascii-size");
      await dragToolcraftSliderByLabel(page, "Size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-ascii-size");
});

test("browser perf: halftone.size workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-halftone-size",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-halftone-size");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "workload-halftone-size");
      await dragToolcraftSliderByLabel(page, "Size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-halftone-size");
});

test("browser perf: mosaic.size workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-mosaic-size",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-mosaic-size");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "workload-mosaic-size");
      await dragToolcraftSliderByLabel(page, "Size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-mosaic-size");
});

test("browser perf: bricks.size workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-bricks-size",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-bricks-size");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "workload-bricks-size");
      await dragToolcraftSliderByLabel(page, "Size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-bricks-size");
});

test("browser perf: pointillism.size workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.size");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-pointillism-size",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-pointillism-size");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Dot size", appPerformance, "workload-pointillism-size");
      await dragToolcraftSliderByLabel(page, "Dot size", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-pointillism-size");
});

test("browser perf: threshold.colorMode workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.colorMode");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-threshold-colorMode",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-threshold-colorMode");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-threshold-colorMode");
});

test("browser perf: bloom.radius workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.radius");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-bloom-radius",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-bloom-radius");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderToPerformanceStressValue(page, "Radius", appPerformance, "workload-bloom-radius");
      await dragToolcraftSliderByLabel(page, "Radius", 0.95);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-bloom-radius");
});

test("browser perf: export.image.resolution workload stays responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "export.image.resolution");
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "workload-export-image-resolution",
    { renderScale: async () => setRenderScale(page) },
  );
  const stressValue = getToolcraftPerformanceStressValue(appPerformance, "workload-export-image-resolution");
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Resolution");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Resolution");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "workload-export-image-resolution");
});

test("browser perf: effect.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "effect.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Variation");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Variation");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-effect-actions");
});

test("browser perf: pixelate.colorMode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pixelate.colorMode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pixelate-colorMode");
});

test("browser perf: pixelate.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pixelate.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pixelate-colors-preset");
});

test("browser perf: pixelate.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pixelate.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pixelate-colors-ink");
});

test("browser perf: pixelate.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pixelate.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pixelate-colors-paper");
});

test("browser perf: pixelate.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pixelate.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pixelate-colors-actions");
});

test("browser perf: dither.pattern remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.pattern");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Pattern");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Pattern");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-pattern");
});

test("browser perf: dither.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-colors-preset");
});

test("browser perf: dither.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-colors-ink");
});

test("browser perf: dither.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-colors-paper");
});

test("browser perf: dither.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-colors-actions");
});

test("browser perf: ascii.characters remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.characters");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Characters");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Characters");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-characters");
});

test("browser perf: ascii.brightness remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.brightness");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Brightness", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-brightness");
});

test("browser perf: ascii.spacing remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.spacing");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Spacing", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-spacing");
});

test("browser perf: ascii.invert remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.invert");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Invert");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Invert");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-invert");
});

test("browser perf: ascii.colorMode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.colorMode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-colorMode");
});

test("browser perf: ascii.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-colors-preset");
});

test("browser perf: ascii.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-colors-ink");
});

test("browser perf: ascii.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-colors-paper");
});

test("browser perf: ascii.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "ascii.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-ascii-colors-actions");
});

test("browser perf: halftone.type remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.type");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Type");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Type");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-type");
});

test("browser perf: halftone.shape remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.shape");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Shape");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Shape");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-shape");
});

test("browser perf: halftone.angle remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.angle");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Angle", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-angle");
});

test("browser perf: halftone.spacing remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.spacing");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Spacing", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-spacing");
});

test("browser perf: halftone.invert remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.invert");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Invert");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Invert");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-invert");
});

test("browser perf: halftone.colorMode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.colorMode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-colorMode");
});

test("browser perf: halftone.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-colors-preset");
});

test("browser perf: halftone.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-colors-ink");
});

test("browser perf: halftone.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-colors-paper");
});

test("browser perf: halftone.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "halftone.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-halftone-colors-actions");
});

test("browser perf: mosaic.edges remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.edges");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Edges", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-edges");
});

test("browser perf: mosaic.jitter remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.jitter");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Jitter", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-jitter");
});

test("browser perf: mosaic.edgeColor remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.edgeColor");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Edge color");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Edge color");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-edgeColor");
});

test("browser perf: mosaic.colorMode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.colorMode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-colorMode");
});

test("browser perf: mosaic.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-colors-preset");
});

test("browser perf: mosaic.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-colors-ink");
});

test("browser perf: mosaic.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-colors-paper");
});

test("browser perf: mosaic.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "mosaic.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-mosaic-colors-actions");
});

test("browser perf: bricks.stud remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.stud");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Stud", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-stud");
});

test("browser perf: bricks.bevel remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.bevel");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Bevel", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-bevel");
});

test("browser perf: bricks.grout remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.grout");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Grout", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-grout");
});

test("browser perf: bricks.light remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.light");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Light", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-light");
});

test("browser perf: bricks.colorMode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.colorMode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-colorMode");
});

test("browser perf: bricks.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-colors-preset");
});

test("browser perf: bricks.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-colors-ink");
});

test("browser perf: bricks.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-colors-paper");
});

test("browser perf: bricks.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bricks.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bricks-colors-actions");
});

test("browser perf: pointillism.shape remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.shape");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Shape");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Shape");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-shape");
});

test("browser perf: pointillism.jitter remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.jitter");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Jitter", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-jitter");
});

test("browser perf: pointillism.spacing remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.spacing");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Spacing", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-spacing");
});

test("browser perf: pointillism.colorMode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.colorMode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Color mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Color mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-colorMode");
});

test("browser perf: pointillism.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-colors-preset");
});

test("browser perf: pointillism.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-colors-ink");
});

test("browser perf: pointillism.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-colors-paper");
});

test("browser perf: pointillism.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "pointillism.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-pointillism-colors-actions");
});

test("browser perf: heatmap.palette remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "heatmap.palette");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Palette");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Palette");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-heatmap-palette");
});

test("browser perf: heatmap.brightness remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "heatmap.brightness");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Brightness", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-heatmap-brightness");
});

test("browser perf: heatmap.contrast remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "heatmap.contrast");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Contrast", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-heatmap-contrast");
});

test("browser perf: heatmap.invert remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "heatmap.invert");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Invert");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Invert");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-heatmap-invert");
});

test("browser perf: heatmap.colorMix remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "heatmap.colorMix");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Color mix", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-heatmap-colorMix");
});

test("browser perf: heatmap.steps remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "heatmap.steps");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Steps", 0.85);
    },
  );
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Steps");
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-heatmap-steps");
});

test("browser perf: threshold.value remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.value");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Threshold", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-value");
});

test("browser perf: threshold.smoothing remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.smoothing");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Smoothing", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-smoothing");
});

test("browser perf: threshold.invert remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.invert");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Invert");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Invert");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-invert");
});

test("browser perf: threshold.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-colors-preset");
});

test("browser perf: threshold.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-colors-ink");
});

test("browser perf: threshold.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-colors-paper");
});

test("browser perf: threshold.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "threshold.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-threshold-colors-actions");
});

test("browser perf: duotone.colors.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "duotone.colors.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Preset");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-duotone-colors-preset");
});

test("browser perf: duotone.colors.ink remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "duotone.colors.ink");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Ink");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Ink");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-duotone-colors-ink");
});

test("browser perf: duotone.colors.paper remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "duotone.colors.paper");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Paper");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Paper");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-duotone-colors-paper");
});

test("browser perf: duotone.colors.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "duotone.colors.actions");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Custom colors");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Custom colors");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-duotone-colors-actions");
});

test("browser perf: adjustments.toneMapping remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.toneMapping");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Tone mapping");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Tone mapping");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-toneMapping");
});

test("browser perf: adjustments.exposure remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.exposure");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Exposure", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-exposure");
});

test("browser perf: adjustments.brightness remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.brightness");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Brightness", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-brightness");
});

test("browser perf: adjustments.contrast remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.contrast");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Contrast", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-contrast");
});

test("browser perf: adjustments.saturation remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.saturation");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Saturation", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-saturation");
});

test("browser perf: adjustments.hue remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.hue");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Hue", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-hue");
});

test("browser perf: adjustments.temperature remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.temperature");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Temperature", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-temperature");
});

test("browser perf: adjustments.tint remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "adjustments.tint");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Tint", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-adjustments-tint");
});

test("browser perf: blur.enabled remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.enabled");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-enabled");
});

test("browser perf: blur.mode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.mode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-mode");
});

test("browser perf: blur.easing remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.easing");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Easing");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Easing");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-easing");
});

test("browser perf: blur.focusPoint remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.focusPoint");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Focus point");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Focus point");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-focusPoint");
});

test("browser perf: blur.position remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.position");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Position", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-position");
});

test("browser perf: blur.angle remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.angle");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Angle", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-angle");
});

test("browser perf: blur.focusRange remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.focusRange");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Focus range", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-focusRange");
});

test("browser perf: blur.aperture remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.aperture");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Aperture", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-aperture");
});

test("browser perf: blur.maxBlur remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "blur.maxBlur");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Max blur", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-blur-maxBlur");
});

test("browser perf: chromatic.enabled remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "chromatic.enabled");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-chromatic-enabled");
});

test("browser perf: chromatic.mode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "chromatic.mode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-chromatic-mode");
});

test("browser perf: chromatic.amount remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "chromatic.amount");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Amount", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-chromatic-amount");
});

test("browser perf: chromatic.angle remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "chromatic.angle");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Angle", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-chromatic-angle");
});

test("browser perf: grain.enabled remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "grain.enabled");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-grain-enabled");
});

test("browser perf: grain.mode remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "grain.mode");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Mode");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Mode");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-grain-mode");
});

test("browser perf: grain.amount remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "grain.amount");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Grain", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-grain-amount");
});

test("browser perf: bloom.enabled remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.enabled");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bloom-enabled");
});

test("browser perf: bloom.strength remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.strength");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Strength", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bloom-strength");
});

test("browser perf: bloom.mix remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.mix");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Mix", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bloom-mix");
});

test("browser perf: bloom.threshold remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.threshold");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Threshold", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bloom-threshold");
});

test("browser perf: bloom.softness remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.softness");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Softness", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bloom-softness");
});

test("browser perf: bloom.blend remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "bloom.blend");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Blend");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Blend");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-bloom-blend");
});

test("browser perf: vignette.enabled remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "vignette.enabled");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-vignette-enabled");
});

test("browser perf: vignette.amount remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "vignette.amount");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Amount", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-vignette-amount");
});

test("browser perf: vignette.softness remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "vignette.softness");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Softness", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-vignette-softness");
});

test("browser perf: overlay.enabled remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.enabled");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-enabled");
});

test("browser perf: overlay.preset remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.preset");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await exerciseControlChange(page, "Preset");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-preset");
});

test("browser perf: overlay.start remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.start");
  const result = await measureToolcraftInteraction(page, async () => {
    await exerciseControlChange(page, "Start");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-start");
});

test("browser perf: overlay.end remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.end");
  const result = await measureToolcraftInteraction(page, async () => {
    await exerciseControlChange(page, "End");
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-end");
});

test("browser perf: overlay.actions remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.actions");
  const result = await measureToolcraftInteraction(page, async () => {
    await (await getToolcraftFieldByLabel(page, "Colors")).getByRole("button", { name: "Swap" }).click();
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-actions");
});

test("browser perf: overlay.angle remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.angle");
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Angle", 0.85);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-angle");
});

test("browser perf: overlay.opacity remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "overlay.opacity");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Opacity", 0.85);
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-overlay-opacity");
});

test("browser perf: export.includeBackground remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "export.includeBackground");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Include");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Include");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-export-includeBackground");
});

test("browser perf: scene.background remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "scene.background");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Background");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Background");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-scene-background");
});

test("browser perf: export.image.format remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "export.image.format");
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const field = await getToolcraftFieldByLabel(page, "Format");
      const trigger = field.getByRole("combobox").or(field.getByRole("switch")).or(field.getByRole("button")).first();
      await trigger.click();
      await exerciseControlChange(page, "Format");
    },
  );
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-export-image-format");
});

test("browser perf: view.orbit remains responsive", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("application", { name: "Canvas viewport" }).click({ position: { x: 2, y: 2 } });
  await expect(page.locator('[data-model-source="default"]')).toBeVisible();
  const canvas = page.locator(productCanvas);
  const canvasBounds = await canvas.boundingBox();
  if (!canvasBounds) throw new Error("Product canvas is not measurable.");

  await page.mouse.move(canvasBounds.x + canvasBounds.width * 0.48, canvasBounds.y + canvasBounds.height * 0.48);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(canvasBounds.x + canvasBounds.width * 0.52, canvasBounds.y + canvasBounds.height * 0.52, {
    steps: 2,
  });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(100);

  await page.getByRole("button", { name: "Reset 3D model section" }).click();
  const gizmo = page.locator('[data-toolcraft-canvas-handle="orientation-gizmo"]');
  await expect(gizmo).toBeVisible();
  const gizmoBounds = await gizmo.boundingBox();
  if (!gizmoBounds) throw new Error("Orientation gizmo is not measurable.");

  await page.mouse.move(gizmoBounds.x + 59.5, gizmoBounds.y + 35);
  await page.mouse.down({ button: "left" });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(700);

  const result = await measureToolcraftInteraction(page, async () => {
    const startX = gizmoBounds.x + gizmoBounds.width / 2;
    const startY = gizmoBounds.y + gizmoBounds.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(startX + 18, startY + 18, {
      steps: 4,
    });
    await page.mouse.up({ button: "left" });
  });
  const freelyOrbitedPose = JSON.parse(
    (await canvas.getAttribute("data-view-orbit")) ?? "{}",
  ) as { position?: number[] };
  expect(Math.abs(freelyOrbitedPose.position?.[1] ?? 0)).toBeGreaterThan(0.1);
  expect(Math.abs(freelyOrbitedPose.position?.[2] ?? 0)).toBeGreaterThan(0.1);
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-view-orbit");
});

test("browser perf: dither.levels remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.levels");
  await chooseOption(page, "Color mode", "Grayscale");
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Levels", 0.72);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-levels");
});

test("browser perf: dither.brightness remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.brightness");
  await chooseOption(page, "Color mode", "Source");
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Brightness", 0.72);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-brightness");
});

test("browser perf: dither.contrast remains responsive", async ({ page }) => {
  await page.goto("/");
  await ensurePerformanceTargetVisible(page, "dither.contrast");
  await chooseOption(page, "Color mode", "Source");
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Contrast", 0.72);
  });
  await expect(page.locator(productCanvas)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "responsive-dither-contrast");
});
