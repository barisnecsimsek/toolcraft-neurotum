import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import { dragCanvasHandle } from "./canvas-handle-helpers";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceWorkloadFixture,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  dragToolcraftSliderToValue,
  expectToolcraftCanvasViewportStable,
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftPerformanceBudget,
  getToolcraftFieldByLabel,
  getToolcraftPerformanceScenarioBudget,
  getToolcraftPerformanceStressValue,
  measureToolcraftInteraction,
  waitForToolcraftAnimationFrames,
  zoomToolcraftCanvasViewport,
  type ToolcraftStressFixtureAppliers,
} from "./performance-helpers";
import { getToolcraftProductObservableSnapshot } from "./product-observable-helpers";

const liquidGlassBrowserBudgetOverrides: Record<
  string,
  Partial<ReturnType<typeof getToolcraftPerformanceScenarioBudget>>
> = {
  "background-color": { maxFrameGapMs: 280, maxInteractionMs: 1000 },
  "button-image-media-import": { maxFrameGapMs: 180, maxInteractionMs: 1800 },
  "button-image-position": { maxFrameGapMs: 180, maxInteractionMs: 1200 },
  "button-image-scale": { maxFrameGapMs: 180, maxInteractionMs: 1400 },
  "canvas-aspect-ratio": { maxFrameGapMs: 260 },
  "canvas-height": { maxFrameGapMs: 450 },
  "canvas-render-scale": { maxFrameGapMs: 280, maxInteractionMs: 1800 },
  "canvas-width": { maxFrameGapMs: 600 },
  "glass-brightness": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "glass-bend": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-bend-width": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-curvature": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-depth": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-frost": { maxFrameGapMs: 180, maxInteractionMs: 2600 },
  "glass-glow": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-glow-spread": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-height": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-dispersion": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "glass-fisheye": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "glass-murkiness": { maxFrameGapMs: 180, maxInteractionMs: 1500 },
  "glass-opacity": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "glass-radius": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-shape": { maxFrameGapMs: 160 },
  "glass-sheen": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-sheen-angle": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-sheen-width": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-splay": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "glass-center": { maxFrameGapMs: 160 },
  "glass-strength": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "glass-specular": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "glass-width": { maxFrameGapMs: 160, maxInteractionMs: 2600 },
  "image-format": { maxFrameGapMs: 180 },
  "image-resolution": { maxFrameGapMs: 160 },
  "include-background": { maxFrameGapMs: 180 },
  "shadow-blur": { maxFrameGapMs: 160, maxInteractionMs: 1900 },
  "shadow-color": { maxFrameGapMs: 160 },
  "shadow-enabled": { maxFrameGapMs: 160 },
  "shadow-offset": { maxFrameGapMs: 160 },
  "source-saturation": { maxFrameGapMs: 160, maxInteractionMs: 1500 },
  "text-align-x": { maxFrameGapMs: 160 },
  "text-align-y": { maxFrameGapMs: 160 },
  "text-blend-mode": { maxFrameGapMs: 160 },
  "text-content": { maxFrameGapMs: 160 },
  "text-drag-target": { maxFrameGapMs: 160 },
  "text-enabled": { maxFrameGapMs: 160 },
  "text-offset": { maxFrameGapMs: 160 },
  "text-style": { maxFrameGapMs: 160 },
  "texture-blend-mode": { maxFrameGapMs: 160 },
  "texture-mode": { maxFrameGapMs: 180 },
  "texture-opacity": { maxFrameGapMs: 220, maxInteractionMs: 1100 },
  "texture-preset": { maxFrameGapMs: 160 },
  "viewport-zoom-stress": { maxFrameGapMs: 160 },
};

function expectToolcraftScenarioPerformanceBudget(
  result: Parameters<typeof expectToolcraftPerformanceBudget>[0],
  config: typeof appPerformance,
  scenarioId: string,
): void {
  expectToolcraftPerformanceBudget(result, {
    ...getToolcraftPerformanceScenarioBudget(config, scenarioId),
    ...liquidGlassBrowserBudgetOverrides[scenarioId],
  });
}

async function openLiquidGlass(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  await waitForToolcraftAnimationFrames(page, 4);
}

const renderScaleWorkloadAppliers: ToolcraftStressFixtureAppliers = {
  renderScale: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Resolution scale", Number(value));
  },
};

const combinedStressAppliers: ToolcraftStressFixtureAppliers = {
  frost: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Frost", Number(value));
  },
  height: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Height", Number(value));
  },
  renderScale: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Resolution scale", Number(value));
  },
  width: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Width", Number(value));
  },
};

const exportStressAppliers: ToolcraftStressFixtureAppliers = {
  frost: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Frost", Number(value));
  },
  resolution: async (value, { page }) => {
    await chooseSelectValue(page, "Resolution", String(value));
  },
  width: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Width", Number(value));
  },
};

const zoomStressAppliers: ToolcraftStressFixtureAppliers = {
  frost: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Frost", Number(value));
  },
  renderScale: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Resolution scale", Number(value));
  },
  width: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Width", Number(value));
  },
};

const textStyleStressAppliers: ToolcraftStressFixtureAppliers = {
  fontSize: async (value, { page }) => {
    const styleField = await getToolcraftFieldByLabel(page, "Style");

    await styleField.getByLabel("Font size").fill(String(value));
    await styleField.getByLabel("Font size").press("Enter");
    await waitForToolcraftAnimationFrames(page, 5);
  },
  textCase: async (value, { page }) => {
    const styleField = await getToolcraftFieldByLabel(page, "Style");
    const optionName = String(value) === "uppercase" ? "Uppercase" : "Original";

    await chooseFontPickerOption(page, styleField, "font-picker-text-case-field", optionName);
  },
};

const buttonImageWorkloadAppliers: ToolcraftStressFixtureAppliers = {
  buttonImageMedia: async (value, { page, scenarioId }) => {
    const dimensions = value as { height: number; width: number };
    const filePath = join(
      tmpdir(),
      `toolcraft-${scenarioId}-${dimensions.width}x${dimensions.height}.svg`,
    );

    writeFileSync(filePath, createMediaFixtureSvg(dimensions));
    await getButtonImageSection(page).locator('input[type="file"]').first().setInputFiles(filePath);
    await expect(page.getByRole("img", { name: /toolcraft-button-image|perf-media|toolcraft-/ })).toBeVisible();
    await waitForToolcraftAnimationFrames(page, 12);
  },
  renderScale: async (value, { page }) => {
    await dragToolcraftSliderToValue(page, "Resolution scale", Number(value));
  },
};

function optionLabel(value: string): string {
  const labels: Record<string, string> = {
    "1:1": "1:1",
    "2k": "2K",
    "4k": "4K",
    "8k": "8K",
    bands: "Bands",
    circle: "Circle",
    etched: "Etched",
    grain: "Grain",
    image: "Image",
    jpg: "JPG",
    multiply: "Multiply",
    off: "Off",
    overlay: "Overlay",
    preset: "Preset",
    right: "Right",
    screen: "Screen",
    square: "Square",
    bottom: "Bottom",
    middle: "Center",
    text: "Text",
  };

  return labels[value] ?? value;
}

async function chooseFontPickerOption(
  page: Page,
  styleField: Locator,
  fieldSlot: string,
  optionName: string,
): Promise<void> {
  const trigger = styleField
    .locator(`[data-slot="${fieldSlot}"] [data-slot="select-trigger"]`)
    .first();

  await expect(trigger).toBeVisible();
  await trigger.click();
  const option = page
    .locator('[data-slot="select-item"]:visible')
    .filter({ hasText: optionName })
    .first();
  await expect(option).toBeVisible();
  await option.click();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function chooseSelectValue(page: Page, label: string, value: string): Promise<void> {
  const labelText = optionLabel(value);

  if (label === "Drag") {
    await selectGlassTextDragTarget(page, labelText === "Text" ? "Text" : "Glass");
    return;
  }

  const field = await getToolcraftFieldByLabel(page, label);
  const selectTrigger = field.locator('[data-slot="select-trigger"]').first();

  if ((await selectTrigger.count()) > 0 && (await selectTrigger.isVisible())) {
    await selectTrigger.click();
    const option = page.locator('[role="option"]:visible').filter({ hasText: labelText }).first();
    await expect(option).toBeVisible();
    await option.click();
  } else {
    const option = field.getByRole("button", { exact: true, name: labelText }).first();
    await expect(option).toBeVisible();
    await option.click();
  }
}

function getSectionByResetLabel(page: Page, resetLabel: string): Locator {
  return page.locator("section").filter({ has: page.getByLabel(resetLabel) }).first();
}

function getSourceSection(page: Page): Locator {
  return getSectionByResetLabel(page, "Reset Source section");
}

function getGlassTextSection(page: Page): Locator {
  return getSectionByResetLabel(page, "Reset Glass Text section");
}

function getGlassTextureSection(page: Page): Locator {
  return getSectionByResetLabel(page, "Reset Glass Texture section");
}

function getButtonImageSection(page: Page): Locator {
  return getSectionByResetLabel(page, "Reset Button Image section");
}

function getSectionSwitch(section: Locator, label: string): Locator {
  return section
    .locator('[data-slot="field"]')
    .filter({ hasText: label })
    .first()
    .getByRole("switch");
}

async function setGlassTextEnabled(page: Page, enabled: boolean): Promise<void> {
  const includeSwitch = getSectionSwitch(getGlassTextSection(page), "Include");
  await expect(includeSwitch).toBeVisible();
  const checked = (await includeSwitch.getAttribute("aria-checked")) === "true";

  if (checked !== enabled) {
    await includeSwitch.click();
    await waitForToolcraftAnimationFrames(page, 5);
  }
}

async function chooseSectionTriggerOption(
  page: Page,
  section: Locator,
  triggerText: RegExp,
  optionName: string,
): Promise<void> {
  const trigger = section.locator('[data-slot="select-trigger"]').filter({ hasText: triggerText }).first();

  await expect(trigger).toBeVisible();
  await trigger.click();
  const option = page.locator('[role="option"]:visible').filter({ hasText: optionName }).first();
  await expect(option).toBeVisible();
  await option.click();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function selectGlassTextDragTarget(page: Page, optionName: "Glass" | "Text"): Promise<void> {
  await chooseSectionTriggerOption(page, getGlassTextSection(page), /Glass|Text/, optionName);
}

async function fillToolcraftTextField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const input = field.getByRole("textbox").first();
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press("Enter");
}

async function chooseTriggerOption(
  page: Page,
  triggerLabel: string,
  optionName: string,
): Promise<void> {
  await page.getByLabel(triggerLabel).click();
  const option = page.locator('[role="option"]:visible').filter({ hasText: optionName }).first();
  await expect(option).toBeVisible();
  await option.click();
}

async function writeMediaFixture(
  testInfo: TestInfo,
  dimensions: { height: number; width: number },
): Promise<string> {
  const path = testInfo.outputPath(`perf-media-${dimensions.width}x${dimensions.height}.svg`);
  writeFileSync(path, createMediaFixtureSvg(dimensions));

  return path;
}

function createMediaFixtureSvg(dimensions: { height: number; width: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
      <rect width="100%" height="100%" fill="#020617"/>
      <rect width="${dimensions.width * 0.5}" height="100%" fill="#f97316"/>
      <rect x="${dimensions.width * 0.5}" width="${dimensions.width * 0.5}" height="100%" fill="#06b6d4"/>
      <rect y="${dimensions.height * 0.72}" width="100%" height="${dimensions.height * 0.16}" fill="#f8fafc" opacity="0.86"/>
    </svg>`;
}

async function exportPng(page: Page): Promise<void> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/liquid-glass\.(png|jpg)$/);
}

test("browser perf: stress preview render stays within liquid glass budget", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "stress-preview-render",
    combinedStressAppliers,
  );

  const result = await measureToolcraftInteraction(page, async () => {
    await waitForToolcraftAnimationFrames(page, 8);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "stress-preview-render");
});

test("browser perf: canvas-aspect-ratio workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "canvas-aspect-ratio", renderScaleWorkloadAppliers);
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "canvas-aspect-ratio");

  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Aspect ratio", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-aspect-ratio");
});

test("browser perf: canvas-width workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "canvas-width", renderScaleWorkloadAppliers);
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "canvas-width");

  const result = await measureToolcraftInteraction(page, async () => {
    await fillToolcraftTextField(page, "Canvas width", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-width");
});

test("browser perf: canvas-height workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "canvas-height", renderScaleWorkloadAppliers);
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "canvas-height");

  const result = await measureToolcraftInteraction(page, async () => {
    await fillToolcraftTextField(page, "Canvas height", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-height");
});

test("browser perf: canvas-render-scale workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "canvas-render-scale", renderScaleWorkloadAppliers);
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 420,
    maxInteractionMs: 1800,
  });
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Resolution scale", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Resolution scale", appPerformance, "canvas-render-scale");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "canvas-render-scale");
});

test("browser perf: texture-mode workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "texture-mode", renderScaleWorkloadAppliers);
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "texture-mode");

  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Texture", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "texture-mode");
});

test("browser perf: texture-preset workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "texture-preset", renderScaleWorkloadAppliers);
  await chooseSelectValue(page, "Texture", "preset");
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "texture-preset");

  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Pattern", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "texture-preset");
});

test("browser perf: glass-shape workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-shape", renderScaleWorkloadAppliers);
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "glass-shape");

  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Shape", stressValue);
  }, { settleFrames: 0 });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-shape");
});

test("browser perf: glass-width workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-width", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Width", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Width", appPerformance, "glass-width");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-width");
});

test("browser perf: glass-height workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-height", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Height", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Height", appPerformance, "glass-height");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-height");
});

test("browser perf: glass-radius workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-radius", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Radius", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Radius", appPerformance, "glass-radius");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-radius");
});

test("browser perf: glass-depth workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-depth", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Depth", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Depth", appPerformance, "glass-depth");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-depth");
});

test("browser perf: glass-curvature workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-curvature", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Curvature", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Curvature", appPerformance, "glass-curvature");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-curvature");
});

test("browser perf: glass-splay workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-splay", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Splay", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Splay", appPerformance, "glass-splay");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-splay");
});

test("browser perf: glass-bend workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-bend", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Bend", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Bend", appPerformance, "glass-bend");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-bend");
});

test("browser perf: glass-bend-width workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-bend-width", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Edge Width", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Edge Width", appPerformance, "glass-bend-width");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-bend-width");
});

test("browser perf: glass-frost workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-frost", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Frost", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Frost", appPerformance, "glass-frost");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-frost");
});

test("browser perf: glass-sheen workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-sheen", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Sheen", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Sheen", appPerformance, "glass-sheen");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-sheen");
});

test("browser perf: glass-sheen-width workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-sheen-width", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Thickness", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Thickness", appPerformance, "glass-sheen-width");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-sheen-width");
});

test("browser perf: glass-sheen-angle workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-sheen-angle", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Angle", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Angle", appPerformance, "glass-sheen-angle");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-sheen-angle");
});

test("browser perf: glass-glow workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-glow", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Glow", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Glow", appPerformance, "glass-glow");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-glow");
});

test("browser perf: glass-glow-spread workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glass-glow-spread", renderScaleWorkloadAppliers);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Spread", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Spread", appPerformance, "glass-glow-spread");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-glow-spread");
});

test("browser perf: shadow-blur workload stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "shadow-blur",
    renderScaleWorkloadAppliers,
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Blur", 0.2);
    await dragToolcraftSliderToPerformanceStressValue(page, "Blur", appPerformance, "shadow-blur");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "shadow-blur");
});

test("browser perf: image-resolution workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "image-resolution", renderScaleWorkloadAppliers);
  const stressValue = getToolcraftPerformanceStressValue<string>(appPerformance, "image-resolution");

  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Resolution", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-resolution");
});

test("browser perf: runtime-settings-transfer change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const downloadPromise = page.waitForEvent("download");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export Settings" }).click();
    await downloadPromise;
  });
  await expect(page.getByRole("button", { name: "Import Settings" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "runtime-settings-transfer");
});

test("browser perf: source-saturation drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Saturation", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "source-saturation");
});

test("browser perf: glass-center change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    const pad = page.getByRole("button", { name: "Center X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({ position: { x: (box?.width ?? 1) * 0.7, y: 24 } });
  });
  const snapshot = await getToolcraftProductObservableSnapshot(page);
  expect(snapshot).toContain("canvas");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-center");
});

test("browser perf: glass-center canvas drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await expect(
    page.locator('[data-liquid-glass-drag-zone][data-testid="liquid-glass-drag-zone"]'),
  ).toBeVisible();
  await expect(page.locator('[data-toolcraft-canvas-handle]')).toHaveCount(0);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "glass-center-canvas-drag",
    renderScaleWorkloadAppliers,
  );
  await waitForToolcraftAnimationFrames(page, 30);
  const stressValue = getToolcraftPerformanceStressValue<{ x: number; y: number }>(
    appPerformance,
    "glass-center-canvas-drag",
  );

  const result = await measureToolcraftInteraction(page, async () => {
    await dragCanvasHandle(page, "liquid-glass-drag-zone", stressValue);
  }, { settleFrames: 8 });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-center-canvas-drag");
});

test("browser perf: text-offset canvas drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  await chooseSelectValue(page, "Drag", "text");
  await expect(
    page.locator('[data-liquid-glass-drag-zone][data-liquid-glass-text-drag="true"]'),
  ).toBeVisible();
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "text-offset-canvas-drag",
    renderScaleWorkloadAppliers,
  );
  const stressValue = getToolcraftPerformanceStressValue<{ x: number; y: number }>(
    appPerformance,
    "text-offset-canvas-drag",
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await dragCanvasHandle(page, "liquid-glass-drag-zone", stressValue);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-offset-canvas-drag");
});

test("browser perf: glass-opacity drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Opacity", 0.35);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-opacity");
});

test("browser perf: shadow-enabled change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const shadowSection = page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Glass Shadow section") })
    .first();
  const includeSwitch = shadowSection
    .locator('[data-slot="field"]')
    .filter({ hasText: "Include" })
    .first()
    .getByRole("switch");
  const result = await measureToolcraftInteraction(page, async () => {
    await includeSwitch.click();
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "shadow-enabled");
});

test("browser perf: shadow-offset change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const shadowSection = page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Glass Shadow section") })
    .first();
  const result = await measureToolcraftInteraction(page, async () => {
    const pad = shadowSection.getByRole("button", { name: "Offset X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({ position: { x: (box?.width ?? 1) * 0.76, y: (box?.height ?? 1) * 0.28 } });
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "shadow-offset");
});

test("browser perf: shadow-color change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const shadowSection = page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Glass Shadow section") })
    .first();
  const result = await measureToolcraftInteraction(page, async () => {
    await shadowSection.getByLabel("Color hex").fill("#1E293B");
    await shadowSection.getByLabel("Color hex").press("Enter");
    await shadowSection.getByLabel("Color opacity").fill("76");
    await shadowSection.getByLabel("Color opacity").press("Enter");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "shadow-color");
});

test("browser perf: texture-blend-mode change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await chooseSelectValue(page, "Texture", "preset");
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSectionTriggerOption(
      page,
      getGlassTextureSection(page),
      /Multiply|Normal|Overlay|Screen|Soft Light/,
      "Multiply",
    );
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "texture-blend-mode");
});

test("browser perf: texture-opacity drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await chooseSelectValue(page, "Texture", "preset");
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Texture Opacity", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "texture-opacity");
});

test("browser perf: button-image-position change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "button-image-position",
    buttonImageWorkloadAppliers,
  );
  const stressValue = getToolcraftPerformanceStressValue<{ x: number; y: number }>(
    appPerformance,
    "button-image-position",
  );
  const buttonImageSection = getButtonImageSection(page);

  const result = await measureToolcraftInteraction(page, async () => {
    const pad = buttonImageSection.getByRole("button", { name: "Position X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({
      position: {
        x: ((stressValue.x + 1) / 2) * (box?.width ?? 1),
        y: ((stressValue.y + 1) / 2) * (box?.height ?? 1),
      },
    });
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "button-image-position");
});

test("browser perf: button-image-blend-mode change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "button-image-blend-mode",
    buttonImageWorkloadAppliers,
  );
  const stressValue = getToolcraftPerformanceStressValue<string>(
    appPerformance,
    "button-image-blend-mode",
  );

  const result = await measureToolcraftInteraction(page, async () => {
    await getButtonImageSection(page)
      .getByRole("combobox", { name: /Multiply|Normal|Overlay|Screen|Soft Light/ })
      .first()
      .click();
    const option = page
      .locator('[role="option"]:visible')
      .filter({ hasText: optionLabel(stressValue) })
      .first();
    await expect(option).toBeVisible();
    await option.click();
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "button-image-blend-mode");
});

test("browser perf: button-image-scale drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "button-image-scale",
    buttonImageWorkloadAppliers,
  );
  await dragToolcraftSliderByLabel(page, "Scale", 0.2);

  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Scale",
      appPerformance,
      "button-image-scale",
    );
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "button-image-scale");
});

test("browser perf: text-content change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);

  const result = await measureToolcraftInteraction(page, async () => {
    await fillToolcraftTextField(page, "Text", "LIQUID TYPE");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-content");
});

test("browser perf: text-style workload change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "text-style",
    renderScaleWorkloadAppliers,
  );

  const result = await measureToolcraftInteraction(page, async () => {
    await applyToolcraftPerformanceStressFixture(
      page,
      appPerformance,
      "text-style",
      textStyleStressAppliers,
    );
    await page.getByLabel("Font size").fill("116");
    await page.getByLabel("Font size").press("Enter");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-style");
});

test("browser perf: text-enabled change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const glassTextSection = page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Glass Text section") })
    .first();
  const includeSwitch = glassTextSection
    .locator('[data-slot="field"]')
    .filter({ hasText: "Include" })
    .first()
    .getByRole("switch");
  const result = await measureToolcraftInteraction(page, async () => {
    await includeSwitch.click();
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-enabled");
});

test("browser perf: text-drag-target change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Drag", "text");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-drag-target");
});

test("browser perf: text-blend-mode change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Text Blend", "overlay");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-blend-mode");
});

test("browser perf: text-align-x change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Horizontal", "right");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-align-x");
});

test("browser perf: text-align-y change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Vertical", "bottom");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-align-y");
});

test("browser perf: text-offset change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);
  const glassTextSection = getGlassTextSection(page);
  const result = await measureToolcraftInteraction(page, async () => {
    const pad = glassTextSection.getByRole("button", { name: "Offset X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({ position: { x: (box?.width ?? 1) * 0.76, y: (box?.height ?? 1) * 0.28 } });
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "text-offset");
});

test("browser perf: glass-strength drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Strength", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-strength");
});

test("browser perf: glass-fisheye drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Fisheye", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-fisheye");
});

test("browser perf: glass-dispersion drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Aberration", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-dispersion");
});

test("browser perf: glass-brightness drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Brightness", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-brightness");
});

test("browser perf: glass-murkiness drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Murkiness", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-murkiness");
});

test("browser perf: glass-specular drag stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Specular", 0.85);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glass-specular");
});

test("browser perf: include-background change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("switch").first().click();
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "include-background");
});

test("browser perf: background-color change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("Background hex").fill("#1D4ED8");
    await page.getByLabel("Background hex").press("Enter");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-color");
});

test("browser perf: image-format change stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await chooseSelectValue(page, "Format", "jpg");
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-format");
});

test("browser perf: source image media import stays responsive", async ({ page }, testInfo) => {
  await openLiquidGlass(page);
  const sourceSection = getSourceSection(page);

  await expect(sourceSection.getByRole("button", { name: "Replace image file" })).toBeVisible();
  await expect(
    sourceSection.getByRole("img", {
      name: "flow-gradient-shader (1).png",
    }),
  ).toBeVisible();
  const mediaFixture = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "source-media-import",
  );
  const filePath = await writeMediaFixture(testInfo, mediaFixture);

  const result = await measureToolcraftInteraction(page, async () => {
    await sourceSection.locator('input[type="file"]').first().setInputFiles(filePath);
  });
  await expect(page.getByRole("img", { name: /perf-media-/ })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "source-media-import");
});

test("browser perf: button image media import stays responsive", async ({ page }, testInfo) => {
  await openLiquidGlass(page);
  const buttonImageSection = getButtonImageSection(page);

  await expect(buttonImageSection.locator('input[type="file"]')).toHaveCount(1);
  const mediaFixture = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "button-image-media-import",
  );
  const filePath = await writeMediaFixture(testInfo, mediaFixture);

  const result = await measureToolcraftInteraction(page, async () => {
    await buttonImageSection.locator('input[type="file"]').first().setInputFiles(filePath);
  });
  await expect(page.getByRole("img", { name: /perf-media-/ })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "button-image-media-import");
});

test("browser perf: texture image media import stays responsive", async ({ page }, testInfo) => {
  await openLiquidGlass(page);
  await chooseSelectValue(page, "Texture", "image");
  const textureSection = getGlassTextureSection(page);

  await expect(textureSection.getByRole("button", { name: "Replace image file" })).toBeVisible();
  await expect(textureSection.getByRole("img", { name: "texture.jpg" })).toBeVisible();
  const mediaFixture = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "texture-media-import",
  );
  const filePath = await writeMediaFixture(testInfo, mediaFixture);

  const result = await measureToolcraftInteraction(page, async () => {
    await textureSection.locator('input[type="file"]').first().setInputFiles(filePath);
  });
  await expect(page.getByRole("img", { name: /perf-media-/ })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "texture-media-import");
});

test("browser perf: image export stays within liquid glass budget", async ({ page }) => {
  await openLiquidGlass(page);
  await expect(page.locator("text=Export PNG")).toBeVisible();
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "image-export",
    exportStressAppliers,
  );

  const result = await measureToolcraftInteraction(page, async () => {
    await exportPng(page);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-export");
});

test("browser perf: liquid glass viewport stays stable", async ({ page }) => {
  await openLiquidGlass(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await page
      .locator("[data-liquid-glass-renderer]")
      .click({ force: true, position: { x: 12, y: 12 } });
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-stability");
});

test("browser perf: liquid glass zoom stress stays responsive", async ({ page }) => {
  await openLiquidGlass(page);
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "viewport-zoom-stress",
    zoomStressAppliers,
  );

  const result = await measureToolcraftInteraction(page, async () => {
    await zoomToolcraftCanvasViewport(page, 2);
  });
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-zoom-stress");
});
