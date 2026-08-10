import { expect, test, type Page } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceWorkloadFixture,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  expectToolcraftCanvasBackingPixelsForRenderScale,
  expectToolcraftCanvasViewportStable,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  measureToolcraftInteraction,
  zoomToolcraftCanvasViewport,
  type ToolcraftStressFixtureApplyContext,
} from "./performance-helpers";









const outputSelector = '[data-toolcraft-product-output="particle-grid"]';
test.describe.configure({ timeout: 90_000 });

async function rasterFixture(page: Page, width: number, height: number): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ({ fixtureHeight, fixtureWidth }) => {
      const canvas = document.createElement("canvas");
      canvas.width = fixtureWidth;
      canvas.height = fixtureHeight;
      const context = canvas.getContext("2d")!;
      const gradient = context.createLinearGradient(0, 0, fixtureWidth, fixtureHeight);
      gradient.addColorStop(0, "#111111");
      gradient.addColorStop(0.35, "#df3030");
      gradient.addColorStop(0.65, "#30bf68");
      gradient.addColorStop(1, "#eeeeee");
      context.fillStyle = gradient;
      context.fillRect(0, 0, fixtureWidth, fixtureHeight);
      return canvas.toDataURL("image/jpeg", 0.82);
    },
    { fixtureHeight: height, fixtureWidth: width },
  );
  return Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
}

async function uploadSizedSource(page: Page, width = 640, height = 360): Promise<void> {
  const buffer = await rasterFixture(page, width, height);
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer,
    mimeType: "image/jpeg",
    name: `perf-${width}x${height}.jpg`,
  });
  await expect(page.locator(outputSelector)).toHaveAttribute("data-source-ready", "true");
}

async function setResolutionScale(
  value: unknown,
  { page }: ToolcraftStressFixtureApplyContext,
): Promise<void> {
  const slider = page.getByRole("slider", { name: "Resolution scale" });
  await page.getByRole("button", { name: "Edit Resolution scale value" }).click();
  const editor = page.getByRole("textbox", { name: "Resolution scale value" });
  await editor.fill(String(value));
  await editor.press("Enter");
  await expect(slider).toHaveAttribute("aria-valuenow", String(value));
}

async function setSourceMedia(
  value: unknown,
  { page }: ToolcraftStressFixtureApplyContext,
): Promise<void> {
  const dimensions = value as { height: number; width: number };
  await uploadSizedSource(page, dimensions.width, dimensions.height);
}

async function setSlider(
  label: string,
  value: unknown,
  { page }: ToolcraftStressFixtureApplyContext,
): Promise<void> {
  await page.getByRole("button", { name: `Edit ${label} value` }).click();
  const editor = page.getByRole("textbox", { name: `${label} value` });
  await editor.fill(String(value));
  await editor.press("Enter");
  await expect(page.getByRole("slider", { name: label, exact: true })).toHaveAttribute(
    "aria-valuenow",
    String(value),
  );
}

async function setImageResolution(
  value: unknown,
  { page }: ToolcraftStressFixtureApplyContext,
): Promise<void> {
  const field = page.locator('[data-slot="field"]').filter({ hasText: /^Resolution/ });
  await field.getByRole("combobox").click();
  await page.getByText(String(value).toUpperCase(), { exact: true }).click();
}

async function chooseSelect(page: Page, label: string, option: string): Promise<void> {
  const field = page.locator('[data-slot="field"]').filter({
    has: page.getByText(label, { exact: true }),
  });
  await field.getByRole("combobox").click();
  await page.getByText(option, { exact: true }).click();
}

async function setColor(page: Page, label: string, color: string): Promise<void> {
  const input = page.getByLabel(`${label} hex`, { exact: true });
  await input.fill(color);
  await input.press("Tab");
}

test("browser perf: 1080p source import stays under budget", async ({ page }) => {
  await page.goto("/");
  const fixture = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "media-import",
  );
  const buffer = await rasterFixture(page, fixture.width, fixture.height);
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer,
    mimeType: "image/jpeg",
    name: "perf-import.jpg",
  });
  await expect(page.locator(outputSelector)).toHaveAttribute("data-source-ready", "true");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.locator('input[type="file"]').first().setInputFiles({
      buffer,
      mimeType: "image/jpeg",
      name: "perf-import.jpg",
    });
  });
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "media-import");
});

test("browser perf: source.image change stays responsive", async ({ page }) => {
  await page.goto("/");
  await uploadSizedSource(page, 1280, 720);
  const fixture = getToolcraftPerformanceStressValue<{ height: number; width: number }>(
    appPerformance,
    "source-image-change",
  );
  const result = await measureToolcraftInteraction(page, async () => {
    await uploadSizedSource(page, fixture.width, fixture.height);
  });
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "source-image-change");
});

const sliderPerformanceCases = [
  ["browser perf: particle.columns drag stays responsive", "particle-columns-drag", "Columns", true],
  ["browser perf: particle.rows drag stays responsive", "particle-rows-drag", "Rows", true],
  ["browser perf: particle.maxColumnWidth drag stays responsive", "particle-maxColumnWidth-drag", "Max width", true],
  ["browser perf: particle.columnGap drag stays responsive", "particle-columnGap-drag", "Column gap", true],
  ["browser perf: particle.rowGap drag stays responsive", "particle-rowGap-drag", "Row gap", true],
  ["browser perf: particle.width drag stays responsive", "particle-width-drag", "Width", true],
  ["browser perf: particle.minWidth drag stays responsive", "particle-minWidth-drag", "Minimum width", true],
  ["browser perf: particle.shrinkThreshold drag stays responsive", "particle-shrinkThreshold-drag", "Shrink threshold", true],
  ["browser perf: particle.maxShrink drag stays responsive", "particle-maxShrink-drag", "Maximum shrink", true],
  ["browser perf: particle.softness drag stays responsive", "particle-softness-drag", "Softness", true],
  ["browser perf: particle.dotChance drag stays responsive", "particle-dotChance-drag", "Chance", true],
  ["browser perf: particle.dotDensity drag stays responsive", "particle-dotDensity-drag", "Density", true],
  ["browser perf: particle.dotSize drag stays responsive", "particle-dotSize-drag", "Dot size", true],
] as const;

for (const [testName, scenarioId, label, workload] of sliderPerformanceCases) {
  test(testName, async ({ page }) => {
    await page.goto("/");
    if (workload) {
      await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, scenarioId, {
        renderScale: setResolutionScale,
        sourceMedia: setSourceMedia,
      });
      await expectToolcraftCanvasBackingPixelsForRenderScale(page, outputSelector, 2);
      getToolcraftPerformanceStressValue(appPerformance, scenarioId);
      await dragToolcraftSliderByLabel(page, label, 0.75);
      await dragToolcraftSliderToPerformanceStressValue(
        page,
        label,
        appPerformance,
        scenarioId,
      );
      const result = await measureToolcraftInteraction(page, async () => {
        await page.getByRole("slider", { name: label, exact: true }).press("ArrowLeft");
      });
      expectToolcraftScenarioPerformanceBudget(result, appPerformance, scenarioId);
      return;
    }

    await uploadSizedSource(page);
    const result = await measureToolcraftInteraction(page, async () => {
      await dragToolcraftSliderByLabel(page, label, 0.72);
    });
    expectToolcraftScenarioPerformanceBudget(result, appPerformance, scenarioId);
  });
}

const changePerformanceCases = [
  ["browser perf: particle.colorMode change stays responsive", "particle-colorMode-change", "colorMode"],
  ["browser perf: particle.tintColor change stays responsive", "particle-tintColor-change", "tintColor"],
  ["browser perf: particle.groupMode change stays responsive", "particle-groupMode-change", "groupMode"],
  ["browser perf: particle.groupColor1 change stays responsive", "particle-groupColor1-change", "groupColor1"],
  ["browser perf: particle.groupColor2 change stays responsive", "particle-groupColor2-change", "groupColor2"],
  ["browser perf: particle.groupColor3 change stays responsive", "particle-groupColor3-change", "groupColor3"],
  ["browser perf: particle.groupColor4 change stays responsive", "particle-groupColor4-change", "groupColor4"],
  ["browser perf: particle.dotPatternBackground change stays responsive", "particle-dotPatternBackground-change", "dotBackground"],
  ["browser perf: export.includeBackground change stays responsive", "export-includeBackground-change", "include"],
  ["browser perf: appearance.background change stays responsive", "appearance-background-change", "background"],
  ["browser perf: export.image.format change stays responsive", "export-image-format-change", "format"],
] as const;

for (const [testName, scenarioId, action] of changePerformanceCases) {
  test(testName, async ({ page }) => {
    await page.goto("/");
    if (action !== "format") {
      await uploadSizedSource(page);
    }
    if (action === "tintColor") {
      await chooseSelect(page, "Color mode", "Tint");
    }
    if (action.startsWith("groupColor")) {
      await chooseSelect(page, "Color grouping", "Brightness");
    }

    const result = await measureToolcraftInteraction(page, async () => {
      if (action === "colorMode") await chooseSelect(page, "Color mode", "Tint");
      else if (action === "tintColor") await setColor(page, "Tint", "#ff00ff");
      else if (action === "groupMode") await chooseSelect(page, "Color grouping", "Brightness");
      else if (action === "groupColor1") await setColor(page, "Group 1 / Reds", "#ff55aa");
      else if (action === "groupColor2") await setColor(page, "Group 2 / Oranges", "#55ffff");
      else if (action === "groupColor3") await setColor(page, "Group 3 / Greens", "#ffff55");
      else if (action === "groupColor4") await setColor(page, "Group 4 / Blues", "#aa55ff");
      else if (action === "dotBackground") await setColor(page, "Pattern background", "#ff00ff");
      else if (action === "include") {
        await page.locator('[data-slot="field"]').filter({ hasText: "Include" }).getByRole("switch").click();
      } else if (action === "background") await setColor(page, "background", "#ffcc00");
      else await chooseSelect(page, "Format", "JPG");
    });
    expectToolcraftScenarioPerformanceBudget(result, appPerformance, scenarioId);
  });
}

test("browser perf: export.image.resolution change stays responsive", async ({ page }) => {
  await page.goto("/");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "export-image-resolution-change",
    { imageResolution: setImageResolution, sourceMedia: setSourceMedia },
  );
  const field = page.locator('[data-slot="field"]').filter({ hasText: /^Resolution/ });
  await field.getByRole("combobox").click();
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("option", { name: "2K", exact: true }).click();
  });
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-image-resolution-change",
  );
});

test("browser perf: 4K Particle Grid export stays under budget", async ({ page }) => {
  await page.goto("/");
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "export-copy", {
    imageResolution: setImageResolution,
    sourceMedia: setSourceMedia,
  });
  const downloadPromise = page.waitForEvent("download");
  const measured = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Export PNG" }).click();
    await downloadPromise;
  });
  expectToolcraftScenarioPerformanceBudget(
    { ...measured, exportMs: measured.durationMs },
    appPerformance,
    "export-copy",
  );
});

const worstCaseAppliers = {
  columns: (value: unknown, context: ToolcraftStressFixtureApplyContext) =>
    setSlider("Columns", value, context),
  renderScale: setResolutionScale,
  rows: (value: unknown, context: ToolcraftStressFixtureApplyContext) =>
    setSlider("Rows", value, context),
  sourceMedia: setSourceMedia,
};

test("browser perf: Particle Grid preview stays under budget", async ({ page }) => {
  await page.goto("/");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "preview-render",
    worstCaseAppliers,
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, outputSelector, 2);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("slider", { name: "Columns", exact: true }).press("ArrowLeft");
  });
  expectToolcraftScenarioPerformanceBudget(
    { ...result, previewMs: result.durationMs },
    appPerformance,
    "preview-render",
  );
});

test("browser perf: Particle Grid zoom stress preserves viewport", async ({ page }) => {
  await page.goto("/");
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "viewport-zoom-stress",
    worstCaseAppliers,
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, outputSelector, 2);
  const result = await measureToolcraftInteraction(page, async () => {
    await zoomToolcraftCanvasViewport(page, 2);
  });
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "viewport-zoom-stress",
  );
});

test("browser perf: Particle Grid viewport stays stable", async ({ page }) => {
  await page.goto("/");
  await uploadSizedSource(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await dragToolcraftSliderByLabel(page, "Columns", 0.65);
  });
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-stability");
});
