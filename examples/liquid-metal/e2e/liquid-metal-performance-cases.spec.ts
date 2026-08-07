import { expect, type Page, test } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  applyToolcraftPerformanceWorkloadFixture,
  applyToolcraftPerformanceStressFixture,
  dragToolcraftCanvasViewport,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  dragToolcraftSliderToValue,
  expectToolcraftCanvasBackingPixelsForRenderScale,
  expectToolcraftCanvasViewportStable,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftPerformanceStressValue,
  getToolcraftPerformanceWorkloadValue,
  getToolcraftFieldByLabel,
  measureToolcraftAnimationFrames,
  measureToolcraftInteraction,
  waitForToolcraftAnimationFrames,
  zoomToolcraftCanvasViewport,
} from "./performance-helpers";
import { createRadianceHdr } from "./hdr-fixture";
import { dragCanvasHandle } from "./canvas-handle-helpers";

test.describe.configure({ timeout: 120000 });
test.use({ trace: "off" });

const cubeObj = [
  "o liquid_metal_perf_cube",
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

async function setPerformanceCanvasSize(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  const widthInput = page
    .locator('[data-slot="field"]')
    .filter({ hasText: /^Canvas width/ })
    .locator("input")
    .first();
  const heightInput = page
    .locator('[data-slot="field"]')
    .filter({ hasText: /^Canvas height/ })
    .locator("input")
    .first();

  await widthInput.fill(String(width));
  await widthInput.press("Enter");
  await heightInput.fill(String(height));
  await heightInput.press("Enter");
}

async function openPerformanceApp(page: Page, upload = true): Promise<void> {
  await page.goto("/?toolcraft-test-fixture=empty-media");
  await expect(
    page.locator('[data-slot="toolcraft-runtime-app"]'),
  ).toBeVisible();
  await expect(page.locator('[data-liquid-metal-canvas=""]')).toBeVisible();
  await setPerformanceCanvasSize(page, 480, 270);
  await page.getByRole("slider", { name: "Resolution scale" }).press("Home");
  await waitForToolcraftAnimationFrames(page, 8);
  if (upload) await uploadPerformanceModel(page);
}

async function uploadPerformanceModel(page: Page): Promise<void> {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      buffer: Buffer.from(cubeObj),
      mimeType: "text/plain",
      name: "liquid-metal-performance.obj",
    });
  await expect
    .poll(() =>
      page
        .locator("[data-toolcraft-product-output]")
        .getAttribute("data-liquid-metal-model"),
    )
    .toBe("liquid-metal-performance.obj");
  await waitForToolcraftAnimationFrames(page, 6);
  await pausePerformancePlayback(page);
}

async function createPerformanceStickerFiles(
  page: Page,
  count: number,
  width = 1024,
  height = 1024,
): Promise<Array<{ buffer: Buffer; mimeType: string; name: string }>> {
  const encoded = await page.evaluate(
    ({ stickerCount, stickerHeight, stickerWidth }) => {
      return Array.from({ length: stickerCount }, (_, index) => {
        const canvas = document.createElement("canvas");
        canvas.width = stickerWidth;
        canvas.height = stickerHeight;
        const context = canvas.getContext("2d");

        if (!context) throw new Error("Could not create sticker fixture.");

        const hue = (index * 47) % 360;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = `hsl(${hue} 90% 54%)`;
        context.beginPath();
        context.roundRect(
          canvas.width * 0.1,
          canvas.height * 0.15,
          canvas.width * 0.8,
          canvas.height * 0.7,
          Math.min(canvas.width, canvas.height) * 0.14,
        );
        context.fill();
        context.lineWidth = Math.min(canvas.width, canvas.height) * 0.045;
        context.strokeStyle = "white";
        context.stroke();
        context.fillStyle = "black";
        context.font = `bold ${Math.round(Math.min(canvas.width, canvas.height) * 0.27)}px sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          String(index + 1),
          canvas.width * 0.5,
          canvas.height * 0.51,
        );
        return canvas.toDataURL("image/png").split(",")[1] ?? "";
      });
    },
    {
      stickerCount: count,
      stickerHeight: height,
      stickerWidth: width,
    },
  );

  return encoded.map((value, index) => ({
    buffer: Buffer.from(value, "base64"),
    mimeType: "image/png",
    name: `performance-sticker-${index + 1}.png`,
  }));
}

async function createPerformanceScratchMask(
  page: Page,
  width = 1920,
  height = 1080,
): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  const encoded = await page.evaluate(
    ({ maskHeight, maskWidth }) => {
      const canvas = document.createElement("canvas");
      canvas.width = maskWidth;
      canvas.height = maskHeight;
      const context = canvas.getContext("2d");

      if (!context)
        throw new Error("Could not create performance scratch mask.");

      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "black";
      context.lineCap = "round";
      for (let index = 0; index < 72; index += 1) {
        const y = (index / 72) * canvas.height;
        context.lineWidth = 3 + (index % 4) * 2;
        context.beginPath();
        context.moveTo(-canvas.width * 0.1, y);
        context.lineTo(
          canvas.width * (0.45 + (index % 5) * 0.08),
          y + canvas.height * 0.11,
        );
        context.stroke();
      }
      return canvas.toDataURL("image/png").split(",")[1] ?? "";
    },
    { maskHeight: height, maskWidth: width },
  );

  return {
    buffer: Buffer.from(encoded, "base64"),
    mimeType: "image/png",
    name: "performance-scratches.png",
  };
}

async function uploadPerformanceScratchMask(page: Page): Promise<void> {
  await page
    .locator('input[type="file"]')
    .nth(1)
    .setInputFiles(await createPerformanceScratchMask(page));
  await expect
    .poll(() =>
      page
        .locator("[data-toolcraft-product-output]")
        .getAttribute("data-liquid-metal-scratch"),
    )
    .toContain("performance-scratches.png");
  await waitForToolcraftAnimationFrames(page, 4);
}

async function uploadPerformanceStickers(
  page: Page,
  count: number,
): Promise<void> {
  const files = await createPerformanceStickerFiles(page, count);

  await page.locator('input[type="file"]').nth(2).setInputFiles(files);
  await expect
    .poll(() =>
      page
        .locator("[data-toolcraft-product-output]")
        .getAttribute("data-liquid-metal-sticker-count"),
    )
    .toBe(String(count));
  await waitForToolcraftAnimationFrames(page, 4);
}

async function setTimelineExtended(page: Page): Promise<void> {
  const timelineField = page
    .locator('[data-slot="field"]')
    .filter({ hasText: /^Timeline/ });
  const toggle = timelineField.locator('[data-slot="switch"]');
  if ((await toggle.getAttribute("aria-checked")) !== "true")
    await toggle.click();
}

async function pausePerformancePlayback(page: Page): Promise<void> {
  const pause = page.getByRole("button", { name: "Pause playback" });
  if (await pause.isVisible().catch(() => false)) await pause.click();
}

async function applyCombinedStress(
  page: Page,
  scenarioId:
    | "renderer-stress-preview"
    | "renderer-animation-frame"
    | "renderer-animation-viewport-drag"
    | "renderer-viewport-zoom-stress",
): Promise<void> {
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    scenarioId,
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 360, width: 640 });
        await setPerformanceCanvasSize(page, 640, 360);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
    },
  );
}

test("browser perf: media.model change stays responsive", async ({ page }) => {
  await openPerformanceApp(page, false);
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "media-model-change",
  );
  expect(stress).toEqual({ height: 2160, width: 3840 });
  await expect(page.locator('[aria-label="Browse file"]')).toBeVisible();
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
          buffer: Buffer.from(cubeObj),
          mimeType: "text/plain",
          name: "measured-model.obj",
        });
    },
    {
      endMarker: {
        attributeName: "data-liquid-metal-model",
        expectedValue: "measured-model.obj",
        selector: "[data-toolcraft-product-output]",
      },
    },
  );
  await expect(page.getByText("measured-model.obj")).toBeVisible();
  await expect
    .poll(
      () =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-rendered"),
      { timeout: 15_000 },
    )
    .toContain("measured-model.obj");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "media-model-change",
  );
});

test("browser perf: media.scratches change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "media-scratches-change",
  ) as { height: number; width: number };
  expect(stress).toEqual({ height: 1080, width: 1920 });
  const scratchMask = await createPerformanceScratchMask(
    page,
    stress.width,
    stress.height,
  );
  const result = await measureToolcraftInteraction(page, async () => {
    const chooserPromise = page.waitForEvent("filechooser");

    await page.locator('[aria-label="Browse image file"]').click();
    await (await chooserPromise).setFiles(scratchMask);
    await expect
      .poll(() =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-scratch"),
      )
      .toContain("performance-scratches.png");
  });
  await expect(page.getByAltText("performance-scratches.png")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "media-scratches-change",
  );
});

test("browser perf: media.stickers change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "media-stickers-change",
  ) as { count: number; height: number; width: number };
  expect(stress).toEqual({ count: 1, height: 1080, width: 1920 });
  await expect(page.locator('[aria-label="Browse image files"]')).toBeVisible();
  const files = await createPerformanceStickerFiles(
    page,
    stress.count,
    stress.width,
    stress.height,
  );
  const result = await measureToolcraftInteraction(
    page,
    async () => {
      const chooserPromise = page.waitForEvent("filechooser");

      await page.locator('[aria-label="Browse image files"]').click();
      await (await chooserPromise).setFiles(files);
    },
    {
      endMarker: {
        attributeName: "data-liquid-metal-sticker-count",
        expectedValue: String(stress.count),
        selector: "[data-toolcraft-product-output]",
      },
    },
  );
  await expect(page.getByAltText("performance-sticker-1.png")).toBeVisible();
  await expect
    .poll(
      () =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-sticker-rendered-count"),
      { timeout: 15000 },
    )
    .toBe(String(stress.count));
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "media-stickers-change",
  );
});

test("browser perf: model.scale live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  const workload = getToolcraftPerformanceWorkloadValue(
    appPerformance,
    "model-scale-drag",
  );
  expect(workload).toEqual({ height: 2160, width: 3840 });
  await uploadPerformanceModel(page);
  const stress = getToolcraftPerformanceStressValue<number>(
    appPerformance,
    "model-scale-drag",
  );
  expect(stress).toBe(3);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Model scale", 0.66);
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Model scale",
      appPerformance,
      "model-scale-drag",
    );
  });
  await expect(
    page.getByRole("slider", { name: "Model scale" }),
  ).toHaveAttribute("aria-valuenow", "3");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "model-scale-drag",
  );
});

test("browser perf: surface.scratchDepth live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await uploadPerformanceScratchMask(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Depth", 0.9),
  );
  await expect(page.getByRole("slider", { name: "Depth" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "surface-scratchDepth-drag",
  );
});

test("browser perf: surface.scratchScale live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "surface-scratchScale-drag",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 270, width: 480 });
        await setPerformanceCanvasSize(page, 480, 270);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
      scratchMedia: async (value) => {
        expect(value).toEqual({ height: 1080, width: 1920 });
        await uploadPerformanceScratchMask(page);
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "surface-scratchScale-drag",
  );

  expect(stress).toBe(20);
  await dragToolcraftSliderByLabel(page, "Scratch scale", 0.5);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderToPerformanceStressValue(
      page,
      "Scratch scale",
      appPerformance,
      "surface-scratchScale-drag",
    ),
  );
  await expect(
    page.getByRole("slider", { name: "Scratch scale" }),
  ).toHaveAttribute("aria-valuenow", "20");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "surface-scratchScale-drag",
  );
});

test("browser perf: stickers.scale live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceWorkloadFixture(
    page,
    appPerformance,
    "stickers-scale-drag",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 270, width: 480 });
        await setPerformanceCanvasSize(page, 480, 270);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
      stickerMedia: async (value) => {
        expect(value).toEqual({ count: 1, height: 1080, width: 1920 });
        await uploadPerformanceStickers(page, value.count);
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "stickers-scale-drag",
  );

  expect(stress).toBe(2);
  await dragToolcraftSliderByLabel(page, "Sticker scale", 0.5);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderToPerformanceStressValue(
      page,
      "Sticker scale",
      appPerformance,
      "stickers-scale-drag",
    ),
  );
  await expect(
    page.getByRole("slider", { name: "Sticker scale" }),
  ).toHaveAttribute("aria-valuenow", "2");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "stickers-scale-drag",
  );
});

test("browser perf: stickers.rotation live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await uploadPerformanceStickers(page, 1);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Sticker rotation", 0.8),
  );
  await expect(
    page.getByRole("slider", { name: "Sticker rotation" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "stickers-rotation-drag",
  );
});

test("browser perf: surface.scratchInvert change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await uploadPerformanceScratchMask(page);
  const invertField = page
    .locator('[data-slot="field"]')
    .filter({ hasText: /^Invert/ });
  await invertField.scrollIntoViewIfNeeded();
  const invert = invertField.getByRole("switch");
  const result = await measureToolcraftInteraction(page, () => invert.click());
  await expect(invert).toHaveAttribute("aria-checked", "true");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "surface-scratchInvert-change",
  );
});

test("browser perf: shader.preset change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Noir", exact: true }).click();
  });
  await expect(
    page.getByRole("button", { name: "Noir", exact: true }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-preset-change",
  );
});

test("browser perf: shader.colorBack change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("Background hex").first().fill("#222228");
    await page.getByLabel("Background hex").first().press("Enter");
  });
  await expect(page.getByLabel("Background hex").first()).toHaveValue(
    "#222228",
  );
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-colorBack-change",
  );
});

test("browser perf: shader.colorTint change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("Tint hex").fill("#88CCFF");
    await page.getByLabel("Tint hex").press("Enter");
  });
  await expect(page.getByLabel("Tint hex")).toHaveValue("#88CCFF");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-colorTint-change",
  );
});

test("browser perf: shader.offset change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Edit Offset value" }).click();
    await page
      .getByRole("textbox", { name: "Offset value" })
      .fill("0.56, -0.52");
    await page.getByRole("textbox", { name: "Offset value" }).press("Enter");
  });
  await expect(
    page.getByRole("button", { name: "Offset X/Y pad" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-offset-change",
  );
});

test("browser perf: shader.fit change stays responsive", async ({ page }) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: "Contain" }).click();
    await page
      .locator('[data-slot="select-item"]:visible')
      .filter({ hasText: /^Cover$/ })
      .click({ force: true });
  });
  await expect(
    page.locator('[data-slot="select-trigger"]').filter({ hasText: "Cover" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-fit-change",
  );
});

test("browser perf: lighting.environmentPreset change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: "Studio" }).click();
    await page
      .locator('[data-slot="select-item"]:visible')
      .filter({ hasText: /^Chrome$/ })
      .click({ force: true });
    await expect
      .poll(() =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-environment-applied"),
      )
      .toBe("preset:chrome");
  });
  expect(
    await page
      .locator("[data-toolcraft-product-output]")
      .getAttribute("data-liquid-metal-environment-applied"),
  ).toBe("preset:chrome");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "lighting-environmentPreset-change",
  );
});

test("browser perf: media.environment change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await page.getByRole("combobox", { name: "Studio" }).click();
  await page
    .locator('[data-slot="select-item"]:visible')
    .filter({ hasText: /^Custom HDRI$/ })
    .click({ force: true });
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "media-environment-change",
  );
  expect(stress).toEqual({ height: 1024, width: 2048 });
  const environmentFile = {
    buffer: createRadianceHdr(stress.width, stress.height),
    mimeType: "image/vnd.radiance",
    name: "measured-environment.hdr",
  };
  const result = await measureToolcraftInteraction(page, async () => {
    const chooserPromise = page.waitForEvent("filechooser");

    await page.locator('[aria-label="Browse file"]').click();
    await (await chooserPromise).setFiles(environmentFile);
    await expect
      .poll(
        () =>
          page
            .locator("[data-toolcraft-product-output]")
            .getAttribute("data-liquid-metal-environment-applied"),
        { timeout: 15000 },
      )
      .toContain("custom:");
  });
  await expect(page.getByText("measured-environment.hdr")).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "media-environment-change",
  );
});

test("browser perf: export.includeBackground change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const includeField = await getToolcraftFieldByLabel(page, "Include");
  const includeSwitch = includeField.getByRole("switch");
  const beforeChecked = await includeSwitch.getAttribute("aria-checked");
  const result = await measureToolcraftInteraction(page, async () => {
    await includeSwitch.click();
  });
  await expect(includeSwitch).toHaveAttribute(
    "aria-checked",
    beforeChecked === "true" ? "false" : "true",
  );
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-includeBackground-change",
  );
});

test("browser perf: appearance.background change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByLabel("Background hex").last().fill("#101820");
    await page.getByLabel("Background hex").last().press("Enter");
  });
  await expect(page.getByLabel("Background hex").last()).toHaveValue("#101820");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "appearance-background-change",
  );
});

test("browser perf: export.image.format change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: "PNG" }).click();
    await page
      .locator('[data-slot="select-item"]:visible')
      .filter({ hasText: /^JPG$/ })
      .click({ force: true });
  });
  await expect(
    page.locator('[data-slot="select-trigger"]').filter({ hasText: "JPG" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-image-format-change",
  );
});

test("browser perf: export.video.format change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: "MP4" }).click();
    await page
      .locator('[data-slot="select-item"]:visible')
      .filter({ hasText: /^WebM$/ })
      .click({ force: true });
  });
  await expect(
    page.locator('[data-slot="select-trigger"]').filter({ hasText: "WebM" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-video-format-change",
  );
});

test("browser perf: shader.repetition live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Repetition", 0.82),
  );
  await expect(page.getByRole("slider", { name: "Repetition" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-repetition-drag",
  );
});

test("browser perf: shader.softness live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Softness", 0.78),
  );
  await expect(page.getByRole("slider", { name: "Softness" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-softness-drag",
  );
});

test("browser perf: shader.shiftRed live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Red shift", 0.26),
  );
  await expect(page.getByRole("slider", { name: "Red shift" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-shiftRed-drag",
  );
});

test("browser perf: shader.shiftBlue live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Blue shift", 0.84),
  );
  await expect(page.getByRole("slider", { name: "Blue shift" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-shiftBlue-drag",
  );
});

test("browser perf: shader.distortion live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await setPerformanceCanvasSize(page, 480, 270);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Distortion", 0.64),
  );
  await expect(page.getByRole("slider", { name: "Distortion" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-distortion-drag",
  );
});

test("browser perf: shader.contour live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Contour", 0.7),
  );
  await expect(page.getByRole("slider", { name: "Contour" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-contour-drag",
  );
});

test("browser perf: shader.angle live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Angle", 0.75),
  );
  await expect(page.getByRole("slider", { name: "Angle" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-angle-drag",
  );
});

test("browser perf: shader.speed live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Speed", 0.76),
  );
  await expect(page.getByRole("slider", { name: "Speed" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-speed-drag",
  );
});

test("browser perf: shader.scale live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  const workload = getToolcraftPerformanceWorkloadValue(
    appPerformance,
    "shader-scale-drag",
  );
  expect(workload).toEqual({ height: 2160, width: 3840 });
  await uploadPerformanceModel(page);
  const stress = getToolcraftPerformanceStressValue<number>(
    appPerformance,
    "shader-scale-drag",
  );
  expect(stress).toBe(4);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Scale", 0.92);
    await dragToolcraftSliderToPerformanceStressValue(
      page,
      "Scale",
      appPerformance,
      "shader-scale-drag",
    );
  });
  await expect(
    page.getByRole("slider", { name: "Scale", exact: true }),
  ).toHaveAttribute("aria-valuenow", "4");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-scale-drag",
  );
});

test("browser perf: shader.rotation live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Rotation", 0.74),
  );
  await expect(
    page.getByRole("slider", { exact: true, name: "Rotation" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "shader-rotation-drag",
  );
});

test("browser perf: lighting.environmentIntensity live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Intensity", 0.8),
  );
  await expect(page.getByRole("slider", { name: "Intensity" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "lighting-environmentIntensity-drag",
  );
});

test("browser perf: lighting.environmentRotation live drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, () =>
    dragToolcraftSliderByLabel(page, "Environment rotation", 0.75),
  );
  await expect(
    page.getByRole("slider", { name: "Environment rotation" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "lighting-environmentRotation-drag",
  );
});

test("browser perf: export.image.resolution maximum change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  const workload = getToolcraftPerformanceWorkloadValue(
    appPerformance,
    "export-image-resolution-change",
  );
  expect(workload).toEqual({ height: 2160, width: 3840 });
  await uploadPerformanceModel(page);
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "export-image-resolution-change",
  );
  expect(stress).toBe("8k");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: "4K" }).first().click();
    await page
      .locator('[data-slot="select-item"]:visible')
      .filter({ hasText: /^8K$/ })
      .click({ force: true });
  });
  await expect(
    page.locator('[data-slot="select-trigger"]').filter({ hasText: "8K" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-image-resolution-change",
  );
});

test("browser perf: export.video.resolution maximum change stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  const workload = getToolcraftPerformanceWorkloadValue(
    appPerformance,
    "export-video-resolution-change",
  );
  expect(workload).toEqual({ height: 2160, width: 3840 });
  await uploadPerformanceModel(page);
  const stress = getToolcraftPerformanceStressValue(
    appPerformance,
    "export-video-resolution-change",
  );
  expect(stress).toBe("4k");
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("combobox", { name: "Current" }).click();
    await page
      .locator('[data-slot="select-item"]:visible')
      .filter({ hasText: /^4K$/ })
      .click({ force: true });
  });
  await expect(
    page
      .locator('[data-slot="select-trigger"]')
      .filter({ hasText: "4K" })
      .last(),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-video-resolution-change",
  );
});

test("browser perf: surface sticker drag stays responsive", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "sticker-surface-drag",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 270, width: 480 });
        await setPerformanceCanvasSize(page, 480, 270);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
      stickers: async (value) => {
        expect(value).toBe(1);
        await uploadPerformanceStickers(page, Number(value));
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  const canvas = page.locator('[data-liquid-metal-canvas=""]');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Sticker canvas has no bounds.");
  const startX = bounds.x + bounds.width * 0.5;
  const startY = bounds.y + bounds.height * 0.5;
  const result = await measureToolcraftInteraction(page, () =>
    dragCanvasHandle(page, canvas, {
      start: { x: startX - bounds.x, y: startY - bounds.y },
      steps: 4,
      x: bounds.width * 0.12,
      y: 0,
    }),
  );
  await expect(
    page.locator("[data-toolcraft-product-output]"),
  ).not.toHaveAttribute("data-liquid-metal-sticker-selected", "");
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "sticker-surface-drag",
  );
});

test("browser perf: view.orbit remains responsive", async ({ page }) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "responsive-view-orbit",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 270, width: 480 });
        await setPerformanceCanvasSize(page, 480, 270);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  await pausePerformancePlayback(page);
  const output = page.locator("[data-toolcraft-product-output]");
  const gizmo = page.locator(
    '[data-toolcraft-canvas-handle="liquid-metal-orientation-gizmo"]',
  );
  const beforePose = await output.getAttribute("data-view-orbit");
  const gizmoResult = await measureToolcraftInteraction(page, () =>
    dragCanvasHandle(page, gizmo, {
      start: { x: 59.5, y: 35 },
      x: 18,
      y: 18,
    }),
  );

  await expect(output).not.toHaveAttribute("data-view-orbit", beforePose ?? "");
  expectToolcraftScenarioPerformanceBudget(
    gizmoResult,
    appPerformance,
    "responsive-view-orbit",
  );
  const canvas = page.locator('[data-liquid-metal-canvas=""]');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Model-surface orbit canvas has no bounds.");
  const canvasWorld = page.locator("[data-toolcraft-canvas-world]");
  const beforeModelPose = await output.getAttribute("data-view-orbit");
  const beforeWorld = await canvasWorld.getAttribute("style");
  const startX = bounds.x + bounds.width * 0.5;
  const startY = bounds.y + bounds.height * 0.28;
  const modelResult = await measureToolcraftInteraction(page, async () => {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(
      startX + bounds.width * 0.12,
      startY - bounds.height * 0.1,
      { steps: 6 },
    );
    await page.mouse.up();
  });

  await expect(output).not.toHaveAttribute(
    "data-view-orbit",
    beforeModelPose ?? "",
  );
  await expect(canvasWorld).toHaveAttribute("style", beforeWorld ?? "");
  expectToolcraftScenarioPerformanceBudget(
    modelResult,
    appPerformance,
    "responsive-view-orbit",
  );
});

test("browser perf: Liquid Metal 3D stress preview renders under budget", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "renderer-stress-preview",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 360, width: 640 });
        await setPerformanceCanvasSize(page, 640, 360);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  const result = await measureToolcraftInteraction(page, () =>
    waitForToolcraftAnimationFrames(page, 8),
  );
  await expect(page.locator('[data-liquid-metal-canvas=""]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "renderer-stress-preview",
  );
});

test("browser perf: Liquid Metal 3D animation frames stay smooth", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await setPerformanceCanvasSize(page, 320, 180);
  await uploadPerformanceModel(page);
  const canvas = page.locator('[data-liquid-metal-canvas=""]');

  await expect(canvas).toHaveJSProperty("width", 320);
  await expect(canvas).toHaveJSProperty("height", 180);
  await page.getByRole("button", { name: "Play playback" }).click();
  const result = await measureToolcraftAnimationFrames(page, 120, {
    productFrames: {
      attributeName: "data-liquid-metal-surface-frame",
      frameCount: 40,
      selector: '[data-toolcraft-product-output=""]',
      timeoutMs: 15_000,
    },
  });
  expect(result.productFrameCount).toBe(40);
  await expect(page.locator('[data-liquid-metal-canvas=""]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "renderer-animation-frame",
  );
});

test("browser perf: animated canvas drag coalesces Liquid Metal work", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "renderer-animation-viewport-drag",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 180, width: 320 });
        await setPerformanceCanvasSize(page, 320, 180);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  await expect(page.locator('[aria-label="Canvas viewport"]')).toBeVisible();
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect(
    page.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  const result = await measureToolcraftInteraction(
    page,
    () => dragToolcraftCanvasViewport(page),
    { settleFrames: 0 },
  );
  await expect(
    page.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  const frameAfterDrag = await page
    .locator("[data-toolcraft-product-output]")
    .getAttribute("data-liquid-metal-surface-frame");
  await expect
    .poll(
      () =>
        page
          .locator("[data-toolcraft-product-output]")
          .getAttribute("data-liquid-metal-surface-frame"),
      {
        message:
          "Liquid Metal product frames should resume after viewport coalescing without changing playback state.",
        timeout: 2000,
      },
    )
    .not.toBe(frameAfterDrag);
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "renderer-animation-viewport-drag",
  );
});

test("browser perf: viewport zoom keeps Liquid Metal backing stable", async ({
  page,
}) => {
  await openPerformanceApp(page, false);
  await applyToolcraftPerformanceStressFixture(
    page,
    appPerformance,
    "renderer-viewport-zoom-stress",
    {
      canvas: async (value) => {
        expect(value).toEqual({ height: 270, width: 480 });
        await setPerformanceCanvasSize(page, 480, 270);
      },
      modelMedia: async (value) => {
        expect(value).toEqual({ height: 2160, width: 3840 });
        await uploadPerformanceModel(page);
      },
      renderScale: async (value) => {
        expect(value).toBe(2);
        await dragToolcraftSliderToValue(
          page,
          "Resolution scale",
          Number(value),
        );
      },
    },
  );
  await expectToolcraftCanvasBackingPixelsForRenderScale(
    page,
    '[data-liquid-metal-canvas=""]',
    2,
  );
  await page.getByRole("button", { name: "Play playback" }).click();
  const result = await measureToolcraftInteraction(page, () =>
    zoomToolcraftCanvasViewport(page, 1),
  );
  await expect(page.locator('[data-liquid-metal-canvas=""]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "renderer-viewport-zoom-stress",
  );
});

test("browser perf: Liquid Metal viewport stays stable", async ({ page }) => {
  await openPerformanceApp(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await dragToolcraftSliderByLabel(page, "Distortion", 0.6);
    await waitForToolcraftAnimationFrames(page, 3);
  });
  await expect(page.locator('[data-liquid-metal-canvas=""]')).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "renderer-viewport-stability",
  );
});

test("browser perf: timeline playback keeps Liquid Metal responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await pausePerformancePlayback(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.getByRole("button", { name: "Play playback" }).click();
    await waitForToolcraftAnimationFrames(page, 20);
  });
  await expect(
    page.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "timeline-playback",
  );
});

test("browser perf: timeline scrub keeps Liquid Metal responsive", async ({
  page,
}) => {
  await openPerformanceApp(page);
  await setTimelineExtended(page);
  await pausePerformancePlayback(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await page
      .getByRole("slider", { name: "Playback position" })
      .first()
      .press("End");
  });
  await expect(
    page.getByRole("slider", { name: "Playback position" }).first(),
  ).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "timeline-scrub",
  );
});

test("browser perf: Liquid Metal export starts and completes under budget", async ({
  page,
}) => {
  await openPerformanceApp(page);
  const result = await measureToolcraftInteraction(page, async () => {
    const download = page.waitForEvent("download", { timeout: 30000 });
    await page.getByRole("button", { name: "Export PNG" }).click();
    await download;
  });
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(
    result,
    appPerformance,
    "export-copy",
  );
});

void applyCombinedStress;
