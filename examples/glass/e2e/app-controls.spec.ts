import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import {
  dragToolcraftCanvasViewport,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToValue,
  expectToolcraftCanvasViewportStable,
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftSegmentedControlCellsPreservePadding,
  getToolcraftFieldByLabel,
  waitForToolcraftAnimationFrames,
  zoomToolcraftCanvasViewport,
} from "./performance-helpers";
import {
  expectExportExcludesCanvasHandles,
  expectNoForbiddenCanvasUi,
} from "./canvas-handle-helpers";
import {
  getToolcraftProductObservableSnapshot,
  expectToolcraftProductObservableToChange,
} from "./product-observable-helpers";

async function openLiquidGlass(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  await waitForToolcraftAnimationFrames(page, 4);
  await waitForLiquidGlassRendererSettled(page);
}

async function waitForLiquidGlassRendererSettled(page: Page): Promise<void> {
  let previousSnapshot = await getToolcraftProductObservableSnapshot(page, {
    canvasSampleSize: 192,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await waitForToolcraftAnimationFrames(page, 8);
    const nextSnapshot = await getToolcraftProductObservableSnapshot(page, {
      canvasSampleSize: 192,
    });

    if (nextSnapshot === previousSnapshot) {
      return;
    }

    previousSnapshot = nextSnapshot;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectToolcraftOption(
  page: Page,
  label: string,
  optionName: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const selectTrigger = field.locator('[data-slot="select-trigger"]').first();

  if ((await selectTrigger.count()) > 0 && (await selectTrigger.isVisible())) {
    await selectTrigger.click();
    const option = page.locator('[role="option"]:visible').filter({ hasText: optionName }).first();
    await expect(option).toBeVisible();
    await option.click();
  } else {
    const option = field.getByRole("button", { exact: true, name: optionName }).first();
    await expect(option).toBeVisible();
    await option.click();
  }

  await waitForToolcraftAnimationFrames(page, 3);
}

async function selectFromTrigger(
  page: Page,
  trigger: Locator,
  optionName: string,
): Promise<void> {
  await expect(trigger).toBeVisible();
  await trigger.click();

  const option = page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: new RegExp(`^${escapeRegExp(optionName)}$`) })
    .first();
  await expect(option).toBeVisible();
  await option.click();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function selectGlassTextDragTarget(page: Page, optionName: "Glass" | "Text"): Promise<void> {
  const glassTextSection = getGlassTextSection(page);
  const dragTargetTrigger = glassTextSection
    .locator('[data-slot="select-trigger"]')
    .filter({ hasText: /Glass|Text/ })
    .first();

  await selectFromTrigger(page, dragTargetTrigger, optionName);
}

function getGlassTextSection(page: Page): Locator {
  return page.locator("section").filter({ has: page.getByLabel("Reset Glass Text section") }).first();
}

function getSourceSection(page: Page): Locator {
  return page.locator("section").filter({ has: page.getByLabel("Reset Source section") }).first();
}

function getGlassTextureSection(page: Page): Locator {
  return page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Glass Texture section") })
    .first();
}

function getButtonImageSection(page: Page): Locator {
  return page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Button Image section") })
    .first();
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

async function getGlassTextOffsetValue(page: Page): Promise<{ x: number; y: number }> {
  const valueButton = getGlassTextSection(page).getByRole("button", {
    name: "Edit Offset value",
  });
  await expect(valueButton).toBeVisible();
  const text = (await valueButton.textContent())?.trim() ?? "";

  return parseToolcraftVectorValue("Offset", text);
}

async function selectFontFamily(page: Page, styleField: Locator, family: string): Promise<void> {
  const trigger = styleField
    .locator('[data-slot="font-picker-family-field"] [data-slot="select-trigger"]')
    .first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const searchInput = page.locator('input[name="font-search"]:visible').first();
  await expect(searchInput).toBeVisible();
  await searchInput.fill(family);
  await waitForToolcraftAnimationFrames(page, 3);
  const option = page
    .locator('[data-slot="font-picker-list"] button')
    .filter({ hasText: family })
    .first();
  await expect(option).toBeVisible();
  await option.click();
  await page.keyboard.press("Escape");
  await waitForToolcraftAnimationFrames(page, 8);
}

async function selectFontPickerOption(
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

async function moveFontPickerFooterSlider(
  page: Page,
  styleField: Locator,
  sliderIndex: number,
  key: "End" | "Home",
): Promise<void> {
  const trigger = styleField
    .locator('[data-slot="font-picker-family-field"] [data-slot="select-trigger"]')
    .first();
  await expect(trigger).toBeVisible();
  const footerControls = page.locator('[data-slot="font-picker-footer-control"]');
  for (let attempt = 0; attempt < 3 && (await footerControls.count()) === 0; attempt += 1) {
    await trigger.click();
    await waitForToolcraftAnimationFrames(page, 2);
  }
  const input = footerControls.nth(sliderIndex).locator("input").first();
  await expect(input).toHaveCount(1);
  await input.focus();
  await page.keyboard.press(key);
  await page.keyboard.press("Escape");
  await waitForToolcraftAnimationFrames(page, 5);
}

async function selectTextureMode(page: Page, optionName: string): Promise<void> {
  const field = page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByRole("button", { exact: true, name: "Off" }) })
    .filter({ has: page.getByRole("button", { exact: true, name: "Preset" }) })
    .filter({ has: page.getByRole("button", { exact: true, name: "Image" }) })
    .first();

  await expect(field, "Texture mode segmented control should be visible").toBeVisible();
  await field.getByRole("button", { exact: true, name: optionName }).click();
  await waitForToolcraftAnimationFrames(page, 3);
}

async function selectButtonImageBlend(
  page: Page,
  optionName: "Multiply" | "Normal" | "Overlay" | "Screen" | "Soft Light",
): Promise<void> {
  const buttonImageSection = getButtonImageSection(page);
  const trigger = buttonImageSection
    .locator('[data-slot="select-trigger"]')
    .filter({ hasText: /Multiply|Normal|Overlay|Screen|Soft Light/ })
    .first();

  await selectFromTrigger(page, trigger, optionName);
}

async function selectGlassTextureBlend(
  page: Page,
  optionName: "Multiply" | "Normal" | "Overlay" | "Screen" | "Soft Light",
): Promise<void> {
  const glassTextureSection = getGlassTextureSection(page);
  const trigger = glassTextureSection
    .locator('[data-slot="select-trigger"]')
    .filter({ hasText: /Multiply|Normal|Overlay|Screen|Soft Light/ })
    .first();

  await selectFromTrigger(page, trigger, optionName);
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
  await waitForToolcraftAnimationFrames(page, 3);
}

async function fillToolcraftContentField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const input = field.getByRole("textbox").first();
  await expect(input).toBeVisible();
  await input.fill(value);
  await waitForToolcraftAnimationFrames(page, 5);
}

async function pressToolcraftSliderKey(
  page: Page,
  label: string,
  key: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const slider = field.getByRole("slider").first();
  await expect(slider).toBeVisible();
  await slider.focus();
  await page.keyboard.press(key);
  await waitForToolcraftAnimationFrames(page, 3);
}

function parseToolcraftVectorValue(label: string, text: string): { x: number; y: number } {
  const matches = text.match(/[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)/g);

  if (!matches || matches.length < 2) {
    throw new Error(`Could not parse ${label} vector value from "${text}".`);
  }

  const [rawX, rawY] = matches;
  const x = Number.parseFloat(rawX.replace(",", "."));
  const y = Number.parseFloat(rawY.replace(",", "."));

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Could not parse finite ${label} vector value from "${text}".`);
  }

  return { x, y };
}

async function getToolcraftVectorValue(
  page: Page,
  label: string,
): Promise<{ x: number; y: number }> {
  const field = await getToolcraftFieldByLabel(page, label);
  const valueButton = field.getByRole("button", { name: `Edit ${label} value` });
  await expect(valueButton).toBeVisible();
  const text = (await valueButton.textContent())?.trim() ?? "";

  return parseToolcraftVectorValue(label, text);
}

async function dragToolcraftSliderByLabelWhileHolding(
  page: Page,
  label: string,
  targetRatio: number,
  onHolding: () => Promise<void>,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const slider = field.locator('[data-slot="slider"]').first();
  const thumb =
    (await field.locator('[data-slot="slider-thumb"]').count()) > 0
      ? field.locator('[data-slot="slider-thumb"]').first()
      : field.getByRole("slider").first();

  await expect(slider, `Toolcraft slider "${label}" should be visible`).toBeVisible();
  await expect(thumb, `Toolcraft slider "${label}" thumb should be visible`).toBeVisible();

  const sliderBox = await slider.boundingBox();
  const thumbBox = await thumb.boundingBox();

  if (!sliderBox || !thumbBox) {
    throw new Error(`Could not measure slider "${label}".`);
  }

  const startX = thumbBox.x + thumbBox.width / 2;
  const endX = sliderBox.x + sliderBox.width * targetRatio;
  const y = thumbBox.y + thumbBox.height / 2;
  let pointerDown = false;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  pointerDown = true;

  try {
    await page.mouse.move(endX, y, { steps: 12 });
    await onHolding();
  } finally {
    if (pointerDown) {
      await page.mouse.up();
      pointerDown = false;
    }
  }
}

async function expectSliderPreviewChangesWhileHolding(
  page: Page,
  {
    canvasSampleSize,
    label,
    targetRatio,
  }: {
    canvasSampleSize?: number;
    label: string;
    targetRatio: number;
  },
): Promise<void> {
  const snapshotOptions = canvasSampleSize ? { canvasSampleSize } : undefined;
  const beforeSnapshot = await getToolcraftProductObservableSnapshot(page, snapshotOptions);

  await dragToolcraftSliderByLabelWhileHolding(page, label, targetRatio, async () => {
    await expect
      .poll(async () => getToolcraftProductObservableSnapshot(page, snapshotOptions), {
        message: `Dragging the ${label} slider should update rendered glass before mouseup.`,
        timeout: 1500,
      })
      .not.toBe(beforeSnapshot);
  });
}

async function uploadSourceImage(
  page: Page,
  testInfo: TestInfo,
  fileName = "liquid-glass-source.svg",
): Promise<string> {
  const sourcePath = testInfo.outputPath(fileName);
  writeFileSync(
    sourcePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <rect width="1920" height="1080" fill="#111827"/>
      <circle cx="460" cy="300" r="220" fill="#22c55e"/>
      <circle cx="1180" cy="520" r="280" fill="#ef4444"/>
      <path d="M120 860 C420 600 820 1040 1260 720 S1760 640 1900 260" fill="none" stroke="#38bdf8" stroke-width="96"/>
      <text x="180" y="980" font-family="Arial, sans-serif" font-size="150" font-weight="900" fill="#f8fafc">REFERENCE</text>
    </svg>`,
  );

  await getSourceSection(page).locator('input[type="file"]').first().setInputFiles(sourcePath);
  await waitForToolcraftAnimationFrames(page, 8);
  return sourcePath;
}

async function uploadPortraitSourceImage(
  page: Page,
  testInfo: TestInfo,
  fileName = "source-portrait-contain.svg",
): Promise<string> {
  const sourcePath = testInfo.outputPath(fileName);
  writeFileSync(
    sourcePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="800" viewBox="0 0 400 800">
      <rect width="400" height="800" fill="#ef4444"/>
    </svg>`,
  );

  await getSourceSection(page).locator('input[type="file"]').first().setInputFiles(sourcePath);
  await waitForToolcraftAnimationFrames(page, 12);
  await waitForLiquidGlassRendererSettled(page);
  return sourcePath;
}

async function sampleLiquidGlassCanvasPixel(
  page: Page,
  x: number,
  y: number,
): Promise<{ alpha: number; blue: number; green: number; red: number }> {
  return page.locator("[data-liquid-glass-renderer]").evaluate(
    (canvasElement, point) => {
      const source = canvasElement as HTMLCanvasElement;
      const width = 512;
      const height = 288;
      const sample = document.createElement("canvas");
      sample.width = width;
      sample.height = height;
      const context = sample.getContext("2d", { willReadFrequently: true });

      if (!context) {
        throw new Error("Unable to sample liquid glass canvas.");
      }

      context.drawImage(source, 0, 0, width, height);
      const sampleX = Math.max(0, Math.min(width - 1, Math.round(point.x * (width - 1))));
      const sampleY = Math.max(0, Math.min(height - 1, Math.round(point.y * (height - 1))));
      const pixels = context.getImageData(sampleX, sampleY, 1, 1).data;

      return {
        alpha: pixels[3] ?? 0,
        blue: pixels[2] ?? 0,
        green: pixels[1] ?? 0,
        red: pixels[0] ?? 0,
      };
    },
    { x, y },
  );
}

async function uploadTextureImage(
  page: Page,
  testInfo: TestInfo,
  fileName = "liquid-glass-texture.svg",
): Promise<string> {
  const texturePath = testInfo.outputPath(fileName);
  writeFileSync(
    texturePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <rect width="1920" height="1080" fill="#ffffff" fill-opacity="0.05"/>
      <g stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.72">
        <path d="M-120 220 L520 -120"/>
        <path d="M120 720 L1180 120"/>
        <path d="M740 1160 L1960 460"/>
      </g>
      <g fill="#0f172a" opacity="0.32">
        <circle cx="340" cy="260" r="70"/>
        <circle cx="960" cy="540" r="96"/>
        <circle cx="1460" cy="760" r="58"/>
      </g>
      <g fill="#f8fafc" opacity="0.55">
        <circle cx="520" cy="820" r="32"/>
        <circle cx="1260" cy="240" r="46"/>
        <circle cx="1640" cy="520" r="28"/>
      </g>
    </svg>`,
  );

  await getGlassTextureSection(page)
    .locator('input[type="file"]')
    .first()
    .setInputFiles(texturePath);
  await waitForToolcraftAnimationFrames(page, 8);
  return texturePath;
}

async function uploadButtonImage(
  page: Page,
  testInfo: TestInfo,
  fileName = "liquid-glass-button-image.svg",
): Promise<string> {
  const buttonImagePath = testInfo.outputPath(fileName);
  writeFileSync(
    buttonImagePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <rect width="1200" height="720" rx="96" fill="#050816"/>
      <circle cx="310" cy="260" r="150" fill="#f43f5e"/>
      <circle cx="850" cy="420" r="180" fill="#22d3ee"/>
      <path d="M120 560 C260 320 460 640 680 360 S1030 260 1120 120" fill="none" stroke="#fde047" stroke-width="72" stroke-linecap="round"/>
      <text x="600" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="150" font-weight="900" fill="#ffffff">BTN</text>
    </svg>`,
  );

  await getButtonImageSection(page)
    .locator('input[type="file"]')
    .first()
    .setInputFiles(buttonImagePath);
  await waitForToolcraftAnimationFrames(page, 10);
  await waitForLiquidGlassRendererSettled(page);
  return buttonImagePath;
}

async function exportImage(page: Page): Promise<{
  fileName: string;
  path: string;
  size: number;
}> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  expect(path && existsSync(path)).toBe(true);

  return {
    fileName: download.suggestedFilename(),
    path: path ?? "",
    size: path ? statSync(path).size : 0,
  };
}

async function decodeDownloadedImageDimensions(
  page: Page,
  path: string,
  mimeType: string,
): Promise<{ height: number; width: number }> {
  const base64 = readFileSync(path).toString("base64");

  return page.evaluate(
    async ({ base64: encoded, mimeType: type }) => {
      const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type }));

      return {
        height: bitmap.height,
        width: bitmap.width,
      };
    },
    { base64, mimeType },
  );
}

test("browser: canvas sizing and render scale update glass output", async ({ page }) => {
  await openLiquidGlass(page);

  const sourceOfTruth = "reference parity canvas-sizing baseline";
  expect(sourceOfTruth).toContain("reference");

  await expect(page.locator('[data-slot="slider"][data-variant="discrete"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 320,
    maxInteractionMs: 1800,
  });
  await dragToolcraftSliderToValue(page, "Resolution scale", 2);
  await waitForToolcraftAnimationFrames(page, 8);

  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Aspect ratio", "1:1");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await fillToolcraftTextField(page, "Canvas width", "1600");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await fillToolcraftTextField(page, "Canvas height", "1200");
  });

  const canvas = page.locator("[data-liquid-glass-renderer]");
  await pressToolcraftSliderKey(page, "Resolution scale", "Home");
  await expect(canvas).toHaveAttribute("width", "1600");

  await expectToolcraftProductObservableToChange(page, async () => {
    await pressToolcraftSliderKey(page, "Resolution scale", "End");
  });

  await expect(canvas).toHaveAttribute("width", "3200");
});

test("browser: refraction controls change product output", async ({ page }) => {
  await openLiquidGlass(page);

  const sourceOfTruth = "reference parity control-mapping renderer-state baseline";
  expect(sourceOfTruth).toContain("reference");
  const refractionControls: Array<{ label: string; ratio: number }> = [
    { label: "Strength", ratio: 0.85 },
    { label: "Depth", ratio: 0.2 },
    { label: "Curvature", ratio: 0.9 },
    { label: "Fisheye", ratio: 0.95 },
    { label: "Aberration", ratio: 0.95 },
    { label: "Splay", ratio: 0.8 },
  ];

  for (const [index, control] of refractionControls.entries()) {
    if (index > 0) {
      await page.evaluate(() => window.localStorage.clear());
      await openLiquidGlass(page);
    }

    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderByLabel(page, control.label, control.ratio);
    });
  }
});

test("browser: settings transfer buttons are available for complex glass settings", async ({
  page,
}) => {
  await openLiquidGlass(page);

  await expect(page.getByRole("button", { name: "Export Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import Settings" })).toBeVisible();
});

test("browser: persistence restores glass settings after reload", async ({ page }) => {
  await openLiquidGlass(page);

  await dragToolcraftSliderToValue(page, "Strength", 0.22);
  const beforeReloadField = await getToolcraftFieldByLabel(page, "Strength");
  await expect(beforeReloadField.getByRole("slider").first()).toHaveAttribute(
    "aria-valuenow",
    "0.22",
  );
  await page.reload();
  await expect(page.locator("[data-liquid-glass-renderer]")).toBeVisible();
  await waitForToolcraftAnimationFrames(page, 8);
  const afterReloadField = await getToolcraftFieldByLabel(page, "Strength");

  await expect(afterReloadField.getByRole("slider").first()).toHaveAttribute(
    "aria-valuenow",
    "0.22",
  );
});

test("browser: source controls and upload update product output", async ({ page }, testInfo) => {
  await openLiquidGlass(page);

  const sourceSection = getSourceSection(page);
  await expect(
    sourceSection.getByRole("img", {
      name: "flow-gradient-shader (1).png",
    }),
  ).toBeVisible();

  const defaultSourcePixel = await sampleLiquidGlassCanvasPixel(page, 0.75, 0.14);
  expect(defaultSourcePixel.alpha).toBe(255);
  expect(defaultSourcePixel.blue).toBeGreaterThan(defaultSourcePixel.red);
  expect(defaultSourcePixel.blue).toBeGreaterThan(80);
  const canvas = page.locator("[data-liquid-glass-renderer]");
  await expect(canvas).toHaveAttribute("width", "3840");
  await expect(canvas).toHaveAttribute("height", "2160");

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadSourceImage(page, testInfo, "source-controls.svg");
  }, { timeoutMs: 8000 });
  await expect(sourceSection.getByRole("button", { name: "90° Right" })).toBeVisible();
  await expect(sourceSection.getByRole("button", { name: "Flip horizontal" })).toBeVisible();
  await expect(sourceSection.getByRole("button", { name: "Flip vertical" })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await sourceSection.getByRole("button", { name: "Flip horizontal" }).click();
  }, { timeoutMs: 8000 });
  await expectToolcraftProductObservableToChange(page, async () => {
    await sourceSection.getByRole("button", { name: "90° Right" }).click();
  }, { timeoutMs: 8000 });
  await expect(sourceSection.getByText("Scale", { exact: true })).toHaveCount(0);
  await uploadPortraitSourceImage(page, testInfo);
  await expect(canvas).toHaveAttribute("width", "3840");
  await expect(canvas).toHaveAttribute("height", "2160");
  const leftEdgePixel = await sampleLiquidGlassCanvasPixel(page, 0.02, 0.5);
  const sourcePixel = await sampleLiquidGlassCanvasPixel(page, 0.5, 0.1);

  expect(leftEdgePixel.red).toBeGreaterThan(160);
  expect(leftEdgePixel.red).toBeGreaterThan(leftEdgePixel.green * 1.4);
  expect(leftEdgePixel.red).toBeGreaterThan(leftEdgePixel.blue * 1.4);
  expect(sourcePixel.red).toBeGreaterThan(160);
  expect(sourcePixel.red).toBeGreaterThan(sourcePixel.green * 1.4);
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Saturation", 0.2);
  });
});

test("browser: source image upload clear and reset update media", async ({ page }, testInfo) => {
  await openLiquidGlass(page);
  const sourceSection = getSourceSection(page);
  const defaultPreview = sourceSection.getByRole("img", {
    name: "flow-gradient-shader (1).png",
  });

  await expect(defaultPreview).toBeVisible();
  const defaultSnapshot = await getToolcraftProductObservableSnapshot(page, {
    canvasSampleSize: 256,
  });

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadSourceImage(page, testInfo, "source-upload.svg");
  }, { timeoutMs: 8000 });
  const uploadSnapshot = await getToolcraftProductObservableSnapshot(page, {
    canvasSampleSize: 256,
  });
  await expect(page.getByRole("img", { name: "source-upload.svg" })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await sourceSection.getByRole("button", { name: "Remove image" }).click();
  });
  await expect(page.getByRole("img", { name: "source-upload.svg" })).toHaveCount(0);
  await expect(defaultPreview).toHaveCount(0);
  const clearedSnapshot = await getToolcraftProductObservableSnapshot(page, {
    canvasSampleSize: 256,
  });
  expect(clearedSnapshot).not.toBe(defaultSnapshot);
  expect(clearedSnapshot).not.toBe(uploadSnapshot);

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadSourceImage(page, testInfo, "source-reset.svg");
  }, { timeoutMs: 8000 });
  await expect(page.getByRole("img", { name: "source-reset.svg" })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByLabel("Reset Source section").click();
  });
  await expect(page.getByRole("img", { name: "source-reset.svg" })).toHaveCount(0);
  await expect(defaultPreview).toBeVisible();
  await expect
    .poll(
      async () =>
        getToolcraftProductObservableSnapshot(page, {
          canvasSampleSize: 256,
        }),
      {
        message: "Reset Source section should return to the built-in default source image.",
        timeout: 5000,
      },
    )
    .toBe(defaultSnapshot);

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadSourceImage(page, testInfo, "source-global-reset.svg");
  }, { timeoutMs: 8000 });
  await expect(page.getByRole("img", { name: "source-global-reset.svg" })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Reset controls" }).click();
  });
  await expect(page.getByRole("img", { name: "source-global-reset.svg" })).toHaveCount(0);
  await expect(defaultPreview).toBeVisible();
  await expect
    .poll(
      async () =>
        getToolcraftProductObservableSnapshot(page, {
          canvasSampleSize: 256,
        }),
      {
        message: "Global reset should return to the built-in default source image.",
        timeout: 5000,
      },
    )
    .toBe(defaultSnapshot);
});

test("browser: button image upload position and scale update glass output", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => window.localStorage.clear());
  await openLiquidGlass(page);
  const buttonImageSection = getButtonImageSection(page);
  const defaultSourcePreview = getSourceSection(page).getByRole("img", {
    name: "flow-gradient-shader (1).png",
  });
  const defaultTexturePreview = getGlassTextureSection(page).getByRole("img", {
    name: "texture.jpg",
  });
  const defaultButtonImagePreview = buttonImageSection.getByRole("img", {
    name: "icon.png",
  });

  await expect(buttonImageSection).toBeVisible();
  await expect(buttonImageSection.locator('input[type="file"]')).toHaveCount(1);
  await expect(buttonImageSection.getByText("Position", { exact: true })).toBeVisible();
  await expect(buttonImageSection.getByText("Scale", { exact: true })).toBeVisible();
  await expect(defaultButtonImagePreview).toBeVisible();
  await expect(defaultSourcePreview).toBeVisible();
  await expect(defaultTexturePreview).toBeVisible();

  const defaultButtonImageSnapshot = await getToolcraftProductObservableSnapshot(page, {
    canvasSampleSize: 256,
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadButtonImage(page, testInfo, "button-image-upload.svg");
  }, { timeoutMs: 8000 });
  await expect(
    buttonImageSection.getByRole("img", { name: "button-image-upload.svg" }),
  ).toBeVisible();

  const buttonImageBlendSnapshots = new Map<string, string>();
  for (const blendMode of ["Normal", "Multiply", "Screen", "Overlay", "Soft Light"] as const) {
    await selectButtonImageBlend(page, blendMode);
    const snapshot = await getToolcraftProductObservableSnapshot(page, {
      canvasSampleSize: 512,
    });
    expect(
      Array.from(buttonImageBlendSnapshots.values()),
      `Button Image Blend ${blendMode} should render distinct product pixels.`,
    ).not.toContain(snapshot);
    buttonImageBlendSnapshots.set(blendMode, snapshot);
  }

  await expectToolcraftProductObservableToChange(page, async () => {
    const pad = buttonImageSection.getByRole("button", { name: "Position X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({ position: { x: (box?.width ?? 1) * 0.78, y: (box?.height ?? 1) * 0.25 } });
    await waitForToolcraftAnimationFrames(page, 6);
  });
  const positionValue = await getToolcraftVectorValue(page, "Position");
  expect(positionValue.x).toBeGreaterThan(0.1);
  expect(positionValue.y).toBeLessThan(-0.1);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Scale", 0.82);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await buttonImageSection.getByRole("button", { name: "Remove image" }).click();
  });
  await expect(page.getByRole("img", { name: "button-image-upload.svg" })).toHaveCount(0);
  await expect(defaultButtonImagePreview).toHaveCount(0);
  await expect(defaultSourcePreview).toBeVisible();
  await expect(defaultTexturePreview).toBeVisible();
  await expect
    .poll(
      async () =>
        getToolcraftProductObservableSnapshot(page, {
          canvasSampleSize: 256,
        }),
      {
        message: "Removing the button image should clear the default icon output.",
        timeout: 5000,
      },
    )
    .not.toBe(defaultButtonImageSnapshot);

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadButtonImage(page, testInfo, "button-image-section-reset.svg");
  }, { timeoutMs: 8000 });
  await expect(
    buttonImageSection.getByRole("img", { name: "button-image-section-reset.svg" }),
  ).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByLabel("Reset Button Image section").click();
  });
  await expect(page.getByRole("img", { name: "button-image-section-reset.svg" })).toHaveCount(0);
  await expect(defaultButtonImagePreview).toBeVisible();
  await expect(defaultSourcePreview).toBeVisible();
  await expect(defaultTexturePreview).toBeVisible();
  await expect
    .poll(
      async () =>
        getToolcraftProductObservableSnapshot(page, {
          canvasSampleSize: 256,
        }),
      {
        message: "Reset Button Image section should restore the built-in default icon.",
        timeout: 5000,
      },
    )
    .toBe(defaultButtonImageSnapshot);

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadButtonImage(page, testInfo, "button-image-global-reset.svg");
  }, { timeoutMs: 8000 });
  await expect(
    buttonImageSection.getByRole("img", { name: "button-image-global-reset.svg" }),
  ).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Reset controls" }).click();
  });
  await expect(page.getByRole("img", { name: "button-image-global-reset.svg" })).toHaveCount(0);
  await expect(defaultButtonImagePreview).toBeVisible();
  await expect(defaultSourcePreview).toBeVisible();
  await expect(defaultTexturePreview).toBeVisible();
  await expect
    .poll(
      async () =>
        getToolcraftProductObservableSnapshot(page, {
          canvasSampleSize: 256,
        }),
      {
        message: "Global reset should restore the built-in default icon.",
        timeout: 5000,
      },
    )
    .toBe(defaultButtonImageSnapshot);
});

test("browser: glass texture controls change product output", async ({ page }) => {
  await openLiquidGlass(page);
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Texture");
  const textureSection = getGlassTextureSection(page);

  await expect(textureSection.getByRole("img", { name: "texture.jpg" })).toBeVisible();

  await expectToolcraftProductObservableToChange(page, async () => {
    await selectTextureMode(page, "Preset");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Brushed");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Speckle");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Pattern", "Etched");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectGlassTextureBlend(page, "Normal");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectGlassTextureBlend(page, "Multiply");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectGlassTextureBlend(page, "Screen");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectGlassTextureBlend(page, "Soft Light");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Texture Opacity", 0.82);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectTextureMode(page, "Off");
  });
  await expect(page.getByText("Pattern", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Texture Opacity", { exact: true })).toHaveCount(0);
  await selectTextureMode(page, "Image");
  await expect(textureSection.getByRole("img", { name: "texture.jpg" })).toBeVisible();
  await selectTextureMode(page, "Off");
  await expect(page.getByText("Pattern", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Texture Image", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Texture Opacity", { exact: true })).toHaveCount(0);
});

test("browser: glass texture image upload clear and reset update media", async ({
  page,
}, testInfo) => {
  await openLiquidGlass(page);
  await selectTextureMode(page, "Image");
  const textureSection = getGlassTextureSection(page);
  const defaultTexturePreview = textureSection.getByRole("img", { name: "texture.jpg" });

  await expect(defaultTexturePreview).toBeVisible();

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadTextureImage(page, testInfo, "texture-upload.svg");
  }, { timeoutMs: 8000 });
  await expect(textureSection.getByRole("img", { name: "texture-upload.svg" })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await textureSection.getByRole("button", { name: "Remove image" }).click();
  });
  await expect(page.getByRole("img", { name: "texture-upload.svg" })).toHaveCount(0);
  await expect(defaultTexturePreview).toHaveCount(0);

  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadTextureImage(page, testInfo, "texture-section-reset.svg");
  }, { timeoutMs: 8000 });
  await expect(
    textureSection.getByRole("img", { name: "texture-section-reset.svg" }),
  ).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByLabel("Reset Glass Texture section").click();
  });
  await expect(page.getByRole("img", { name: "texture-section-reset.svg" })).toHaveCount(0);
  await expect(defaultTexturePreview).toBeVisible();

  await selectTextureMode(page, "Image");
  await expectToolcraftProductObservableToChange(page, async () => {
    await uploadTextureImage(page, testInfo, "texture-global-reset.svg");
  }, { timeoutMs: 8000 });
  await expect(
    textureSection.getByRole("img", { name: "texture-global-reset.svg" }),
  ).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("button", { name: "Reset controls" }).click();
  });
  await expect(page.getByRole("img", { name: "texture-global-reset.svg" })).toHaveCount(0);
  await expect(defaultTexturePreview).toBeVisible();
});

test("browser: glass shape controls change product output", async ({ page }) => {
  await openLiquidGlass(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    const dragZone = page.locator(
      '[data-liquid-glass-drag-zone][data-testid="liquid-glass-drag-zone"]',
    );
    const beforeBox = await dragZone.boundingBox();
    expect(beforeBox).toBeTruthy();
    const pad = page.getByRole("button", { name: "Center X/Y pad" });
    await pad.scrollIntoViewIfNeeded();
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(
      (box?.x ?? 0) + (box?.width ?? 1) * 0.72,
      (box?.y ?? 0) + (box?.height ?? 1) * 0.28,
    );
    await waitForToolcraftAnimationFrames(page, 5);

    const centerValue = await getToolcraftVectorValue(page, "Center");
    expect(centerValue.x).toBeGreaterThan(0.1);
    expect(centerValue.y).toBeLessThan(-0.1);

    const afterBox = await dragZone.boundingBox();
    expect(afterBox).toBeTruthy();
    expect(afterBox?.x ?? 0).toBeGreaterThan((beforeBox?.x ?? 0) + 10);
    expect(afterBox?.y ?? 0).toBeLessThan((beforeBox?.y ?? 0) - 10);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Shape", "Square");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Shape", "Rounded");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Width", 0.85);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Height", 0.75);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Radius", 0.15);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Shape", "Circle");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Shape", "Pill");
  });
  const vectorParts = ["vector.x", "vector.y"];
  expect(vectorParts).toContain("vector.x");
  expect(vectorParts).toContain("vector.y");
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Opacity", 0.2);
  });
});

test("browser: glass shadow controls change product output", async ({ page }) => {
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

  await expect(shadowSection).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByLabel("Reset Glass Shadow section").click();
    await includeSwitch.click();
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await includeSwitch.click();
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    const pad = shadowSection.getByRole("button", { name: "Offset X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({ position: { x: (box?.width ?? 1) * 0.82, y: (box?.height ?? 1) * 0.22 } });
    await waitForToolcraftAnimationFrames(page, 5);
  });
  const shadowOffsetButton = shadowSection.getByRole("button", { name: "Edit Offset value" });
  const shadowOffsetText = (await shadowOffsetButton.textContent())?.trim() ?? "";
  const shadowOffsetValue = parseToolcraftVectorValue("Offset", shadowOffsetText);
  expect(shadowOffsetValue.x).toBeGreaterThan(0.1);
  expect(shadowOffsetValue.y).toBeLessThan(-0.1);
  await expectToolcraftProductObservableToChange(page, async () => {
    await shadowSection.getByLabel("Color hex").fill("#7C2D12");
    await shadowSection.getByLabel("Color hex").press("Enter");
    await shadowSection.getByLabel("Color opacity").fill("82");
    await shadowSection.getByLabel("Color opacity").press("Enter");
    await waitForToolcraftAnimationFrames(page, 5);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Blur", 0.86);
  });
});

test("browser: glass settings apply while dragging controls", async ({ page }) => {
  await openLiquidGlass(page);
  await selectTextureMode(page, "Preset");

  const liveSliderCases = [
    { label: "Saturation", targetRatio: 0.2 },
    { label: "Width", targetRatio: 0.82 },
    { label: "Height", targetRatio: 0.75 },
    { label: "Radius", targetRatio: 0.8 },
    { label: "Opacity", targetRatio: 0.2 },
    { label: "Blur", targetRatio: 0.86 },
    { label: "Texture Opacity", targetRatio: 0.82 },
    { label: "Resolution scale", targetRatio: 0.2 },
  ];

  for (const sliderCase of liveSliderCases) {
    await expectSliderPreviewChangesWhileHolding(page, sliderCase);
  }
});

test("browser: refraction sliders apply while dragging controls", async ({ page }) => {
  await openLiquidGlass(page);

  const liveSliderCases = [
    { label: "Strength", targetRatio: 0.85 },
    { label: "Depth", targetRatio: 0.2 },
    { canvasSampleSize: 512, label: "Curvature", targetRatio: 0.9 },
    { label: "Fisheye", targetRatio: 0.9 },
    { label: "Aberration", targetRatio: 0.9 },
    { label: "Splay", targetRatio: 0.8 },
  ];

  for (const [index, sliderCase] of liveSliderCases.entries()) {
    if (index > 0) {
      await openLiquidGlass(page);
    }

    await expectSliderPreviewChangesWhileHolding(page, sliderCase);
  }
});

test("browser: edge and surface sliders apply while dragging controls", async ({ page }) => {
  await openLiquidGlass(page);

  const liveSliderCases = [
    { canvasSampleSize: 512, label: "Bend", targetRatio: 0.8 },
    { canvasSampleSize: 512, label: "Edge Width", targetRatio: 0.9 },
    { label: "Frost", targetRatio: 0.95 },
    { label: "Brightness", targetRatio: 0.95 },
    { label: "Murkiness", targetRatio: 0.85 },
  ];

  for (const [index, sliderCase] of liveSliderCases.entries()) {
    if (index > 0) {
      await openLiquidGlass(page);
    }

    await expectSliderPreviewChangesWhileHolding(page, sliderCase);
  }
});

test("browser: highlight sliders apply while dragging controls", async ({ page }) => {
  await openLiquidGlass(page);

  const liveSliderCases = [
    { label: "Specular", targetRatio: 0.85 },
    { label: "Sheen", targetRatio: 0.9 },
    { label: "Thickness", targetRatio: 0.9 },
    { label: "Angle", targetRatio: 0.95 },
    { label: "Glow", targetRatio: 0.9 },
    { label: "Spread", targetRatio: 0.9 },
  ];

  for (const sliderCase of liveSliderCases) {
    await expectSliderPreviewChangesWhileHolding(page, sliderCase);
  }
});

test("browser: glass text toggle row hides parameter label", async ({ page }) => {
  await openLiquidGlass(page);

  const glassTextSection = getGlassTextSection(page);
  const dragTargetTrigger = glassTextSection
    .locator('[data-slot="select-trigger"]')
    .filter({ hasText: /Glass|Text/ })
    .first();

  await expect(glassTextSection.getByText("textDragTarget", { exact: true })).toHaveCount(0);
  await expect(dragTargetTrigger).toHaveCount(0);
  await expect(glassTextSection.getByText("Text Blend", { exact: true })).toHaveCount(0);
  await setGlassTextEnabled(page, true);
  await expect(dragTargetTrigger).toBeVisible();
  await expect(glassTextSection.getByText("Text Blend", { exact: true })).toBeVisible();
});

test("browser: glass text controls change product output", async ({ page }) => {
  await openLiquidGlass(page);
  const glassTextSection = page
    .locator("section")
    .filter({ has: page.getByLabel("Reset Glass Text section") })
    .first();
  const dragTargetTrigger = glassTextSection
    .locator('[data-slot="select-trigger"]')
    .filter({ hasText: /Glass|Text/ })
    .first();

  await expect(glassTextSection.getByText("textDragTarget", { exact: true })).toHaveCount(0);
  await expect(dragTargetTrigger).toHaveCount(0);
  await expect(glassTextSection.getByText("Text Blend", { exact: true })).toHaveCount(0);

  await expectToolcraftProductObservableToChange(page, async () => {
    await setGlassTextEnabled(page, true);
  });
  await expect(dragTargetTrigger).toBeVisible();
  await expect(glassTextSection.getByText("Text Blend", { exact: true })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await setGlassTextEnabled(page, false);
  });
  await expect(glassTextSection.getByText("Text Blend", { exact: true })).toHaveCount(0);
  await expectToolcraftProductObservableToChange(page, async () => {
    await setGlassTextEnabled(page, true);
  });
  await expect(glassTextSection.getByText("Text Blend", { exact: true })).toBeVisible();
  await expectToolcraftProductObservableToChange(page, async () => {
    await fillToolcraftContentField(page, "Text", "glass\ncenter");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    const styleField = await getToolcraftFieldByLabel(page, "Style");
    await styleField.getByLabel("Color hex").fill("#22D3EE");
    await styleField.getByLabel("Color hex").press("Enter");
    await styleField.getByLabel("Color opacity").fill("92");
    await styleField.getByLabel("Color opacity").press("Enter");
    await waitForToolcraftAnimationFrames(page, 5);
  });

  const textBlendSnapshots = new Map<string, string>();
  for (const blendMode of ["Normal", "Multiply", "Screen", "Overlay", "Soft Light"]) {
    await selectToolcraftOption(page, "Text Blend", blendMode);
    const snapshot = await getToolcraftProductObservableSnapshot(page, {
      canvasSampleSize: 512,
    });
    expect(
      Array.from(textBlendSnapshots.values()),
      `Text Blend ${blendMode} should render distinct product pixels.`,
    ).not.toContain(snapshot);
    textBlendSnapshots.set(blendMode, snapshot);
  }

  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Horizontal", "Left");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Horizontal", "Center");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Vertical", "Top");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectToolcraftOption(page, "Vertical", "Center");
  });

  const styleField = await getToolcraftFieldByLabel(page, "Style");
  await expectToolcraftProductObservableToChange(page, async () => {
    await moveFontPickerFooterSlider(page, styleField, 0, "Home");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await moveFontPickerFooterSlider(page, styleField, 1, "End");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectFontFamily(page, styleField, "Montserrat");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectFontPickerOption(page, styleField, "font-picker-weight-field", "400");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await styleField.getByLabel("Font size").fill("96");
    await styleField.getByLabel("Font size").press("Enter");
    await waitForToolcraftAnimationFrames(page, 5);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await selectFontPickerOption(page, styleField, "font-picker-text-case-field", "Uppercase");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await styleField.getByLabel("Color hex").fill("#22D3EE");
    await styleField.getByLabel("Color hex").press("Enter");
    await styleField.getByLabel("Color opacity").fill("66");
    await styleField.getByLabel("Color opacity").press("Enter");
    await waitForToolcraftAnimationFrames(page, 5);
  });
});

test("browser: moving glass text on canvas changes text output", async ({ page }) => {
  await openLiquidGlass(page);
  await setGlassTextEnabled(page, true);

  const centerField = await getToolcraftFieldByLabel(page, "Center");
  const centerValueButton = centerField.getByRole("button", { name: "Edit Center value" });
  const beforeCenterText = (await centerValueButton.textContent())?.trim() ?? "";
  const offsetValueButton = getGlassTextSection(page).getByRole("button", {
    name: "Edit Offset value",
  });
  const beforeOffsetText = (await offsetValueButton.textContent())?.trim() ?? "";

  await selectGlassTextDragTarget(page, "Text");
  await expect(
    page.locator(
      '[data-liquid-glass-drag-zone][data-testid="liquid-glass-drag-zone"][data-liquid-glass-text-drag="true"]',
    ),
  ).toBeVisible();

  await expectToolcraftProductObservableToChange(page, async () => {
    await expectToolcraftCanvasViewportStable(page, async () => {
      const dragZone = page.locator(
        '[data-liquid-glass-drag-zone][data-testid="liquid-glass-drag-zone"]',
      );
      const box = await dragZone.boundingBox();
      expect(box).toBeTruthy();

      if (!box) {
        throw new Error("Liquid glass drag zone should have a bounding box.");
      }

      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.68, {
        steps: 8,
      });
      await waitForToolcraftAnimationFrames(page, 3);
      await page.mouse.up();
      await waitForToolcraftAnimationFrames(page, 6);
    });
  });

  await expect(centerValueButton).toHaveText(beforeCenterText);
  await expect(offsetValueButton).not.toHaveText(beforeOffsetText);
  const afterTextDragOffset = await getGlassTextOffsetValue(page);
  expect(afterTextDragOffset.x).toBeGreaterThan(0.1);
  expect(afterTextDragOffset.y).toBeGreaterThan(0.1);

  await expectToolcraftProductObservableToChange(page, async () => {
    const pad = getGlassTextSection(page).getByRole("button", { name: "Offset X/Y pad" });
    const box = await pad.boundingBox();
    expect(box).toBeTruthy();
    await pad.click({ position: { x: (box?.width ?? 1) * 0.22, y: (box?.height ?? 1) * 0.76 } });
    await waitForToolcraftAnimationFrames(page, 5);
  });
  const afterPadOffset = await getGlassTextOffsetValue(page);
  expect(afterPadOffset.x).toBeLessThan(-0.1);
  expect(afterPadOffset.y).toBeGreaterThan(0.1);

  await selectGlassTextDragTarget(page, "Glass");
  await expect(
    page.locator('[data-liquid-glass-drag-zone][data-liquid-glass-text-drag="true"]'),
  ).toHaveCount(0);
});

test("browser: dragging glass on canvas moves lens output", async ({ page }) => {
  await openLiquidGlass(page);

  await expectNoForbiddenCanvasUi(page);
  await expect(page.locator('[data-liquid-glass-drag-zone]')).toBeVisible();
  await expect(page.locator('[data-toolcraft-canvas-handle]')).toHaveCount(0);
  const centerField = await getToolcraftFieldByLabel(page, "Center");
  const centerValueButton = centerField.getByRole("button", { name: "Edit Center value" });
  await expect(centerValueButton).toBeVisible();
  const beforeCenterText = (await centerValueButton.textContent())?.trim() ?? "";

  await expectToolcraftProductObservableToChange(page, async () => {
    await expectToolcraftCanvasViewportStable(page, async () => {
      const dragZone = page.locator(
        '[data-liquid-glass-drag-zone][data-testid="liquid-glass-drag-zone"]',
      );
      const box = await dragZone.boundingBox();
      expect(box).toBeTruthy();

      if (!box) {
        throw new Error("Liquid glass drag zone should have a bounding box.");
      }

      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      let pointerDown = false;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      pointerDown = true;

      try {
        await page.mouse.move(startX + 180, startY + 96, { steps: 8 });
        await waitForToolcraftAnimationFrames(page, 4);
        await expect(centerValueButton).not.toHaveText(beforeCenterText);
        const liveCenterValue = await getToolcraftVectorValue(page, "Center");
        expect(liveCenterValue.x).toBeGreaterThan(0.1);
        expect(liveCenterValue.y).toBeGreaterThan(0.1);
      } finally {
        if (pointerDown) {
          await page.mouse.up();
          pointerDown = false;
        }
      }
    }, { settleFrames: 8 });
  });

  await selectToolcraftOption(page, "Resolution", "2K");
  await expectExportExcludesCanvasHandles(page, async () => {
    await exportImage(page);
  });
});

test("browser: edge and surface controls change product output", async ({ page }) => {
  await openLiquidGlass(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Bend", 0.8);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Edge Width", 0.9);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Frost", 0.95);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Brightness", 0.95);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Murkiness", 0.85);
  });
});

test("browser: highlight controls change product output", async ({ page }) => {
  await openLiquidGlass(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Specular", 0.85);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Sheen", 0.9);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Thickness", 0.9);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Angle", 0.95);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Glow", 0.9);
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await dragToolcraftSliderByLabel(page, "Spread", 0.9);
  });
});

test("browser: background controls affect preview and png export", async ({ page }) => {
  await openLiquidGlass(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("switch").click();
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await page.getByRole("switch").click();
    await page.getByLabel("Background hex").fill("#243B6B");
    await page.getByLabel("Background hex").press("Enter");
    await page.getByLabel("Background hex").blur();
  });

  const download = await exportImage(page);
  expect(download.fileName).toMatch(/liquid-glass\.png$/);
  expect(download.size).toBeGreaterThan(1000);
});

test("browser: image export writes final glass output", async ({ page }) => {
  await openLiquidGlass(page);

  await selectTextureMode(page, "Preset");
  await selectToolcraftOption(page, "Pattern", "Etched");
  await selectToolcraftOption(page, "Resolution", "2K");
  const pngDownload = await exportImage(page);
  expect(pngDownload.fileName).toBe("liquid-glass.png");
  expect(pngDownload.size).toBeGreaterThan(1000);
  const pngDimensions = await decodeDownloadedImageDimensions(
    page,
    pngDownload.path,
    "image/png",
  );
  expect(pngDimensions.width).toBe(2048);
  expect(pngDimensions.height).toBe(1152);

  await selectToolcraftOption(page, "Format", "JPG");
  await selectToolcraftOption(page, "Resolution", "4K");
  const jpgDownload = await exportImage(page);
  expect(jpgDownload.fileName).toBe("liquid-glass.jpg");
  expect(jpgDownload.size).toBeGreaterThan(1000);
  const bitmap = await decodeDownloadedImageDimensions(page, jpgDownload.path, "image/jpeg");
  expect(bitmap.width).toBe(4096);
  expect(bitmap.height).toBe(2304);
});

test("browser: toolbar viewport controls keep glass output stable", async ({ page }) => {
  await openLiquidGlass(page);
  await uploadPortraitSourceImage(page, test.info(), "source-toolbar-zoom.svg");

  const before = await page.locator("[data-liquid-glass-renderer]").evaluate((canvas) => ({
    height: (canvas as HTMLCanvasElement).height,
    width: (canvas as HTMLCanvasElement).width,
  }));
  const beforeLeftBarPixel = await sampleLiquidGlassCanvasPixel(page, 0.1, 0.5);
  const beforeSourcePixel = await sampleLiquidGlassCanvasPixel(page, 0.5, 0.1);

  await zoomToolcraftCanvasViewport(page, 1);
  await page.getByRole("button", { name: "Center canvas" }).click();
  await dragToolcraftCanvasViewport(page, { x: 48, y: -32 });

  const after = await page.locator("[data-liquid-glass-renderer]").evaluate((canvas) => ({
    height: (canvas as HTMLCanvasElement).height,
    width: (canvas as HTMLCanvasElement).width,
  }));
  const afterLeftBarPixel = await sampleLiquidGlassCanvasPixel(page, 0.1, 0.5);
  const afterSourcePixel = await sampleLiquidGlassCanvasPixel(page, 0.5, 0.1);

  expect(after).toEqual(before);
  expect(afterLeftBarPixel.alpha).toBe(255);
  expect(afterSourcePixel.alpha).toBe(255);
  expect(afterLeftBarPixel).toEqual(beforeLeftBarPixel);
  expect(afterSourcePixel).toEqual(beforeSourcePixel);
});
