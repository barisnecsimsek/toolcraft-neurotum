import { expectToolcraftConditionalControlVisibility } from "./browser-conditional-output-evidence-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";
import {
  createFrozenSourcePng,
  dragFrozenSlider,
  frozenCanvasSelector,
  frozenOutputSelector,
  openFrozen,
  readFrozenOutputSignature,
  readFrozenTopCornerCoverage,
  selectFrozenSourceMode,
  uploadFrozenObj,
  uploadFrozenSourceImage,
} from "./frozen-test-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding } from "./performance-control-layout-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect, test } from "./toolcraft-product-test";

test.setTimeout(60_000);

async function readFrozenPixelSignature(
  page: Parameters<typeof openFrozen>[0],
): Promise<string> {
  const signature = await readFrozenOutputSignature(page);
  return signature.slice(signature.lastIndexOf(":") + 1);
}

async function readFrozenImageFaceSignature(
  page: Parameters<typeof openFrozen>[0],
): Promise<Readonly<{
  hash: string;
  left: readonly [number, number, number];
  right: readonly [number, number, number];
}>> {
  return page.locator(frozenCanvasSelector).evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 24;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return "no-context";
    context.drawImage(
      element,
      element.width * 0.4,
      element.height * 0.45,
      element.width * 0.2,
      element.height * 0.1,
      0,
      0,
      sample.width,
      sample.height,
    );
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 2166136261;
    for (const value of pixels) {
      hash ^= value;
      hash = Math.imul(hash, 16777619);
    }
    const readColor = (xRatio: number): [number, number, number] => {
      const x = Math.floor(element.width * xRatio);
      const y = Math.floor(element.height * 0.5);
      const region = document.createElement("canvas");
      region.width = 8;
      region.height = 8;
      const regionContext = region.getContext("2d", { willReadFrequently: true });
      if (!regionContext) return [0, 0, 0];
      regionContext.drawImage(element, x - 4, y - 4, 8, 8, 0, 0, 8, 8);
      const regionPixels = regionContext.getImageData(0, 0, 8, 8).data;
      const totals = [0, 0, 0];
      for (let index = 0; index < regionPixels.length; index += 4) {
        totals[0] += regionPixels[index];
        totals[1] += regionPixels[index + 1];
        totals[2] += regionPixels[index + 2];
      }
      return totals.map((total) => Math.round(total / 64)) as [number, number, number];
    };
    return {
      hash: (hash >>> 0).toString(16),
      left: readColor(0.46),
      right: readColor(0.54),
    };
  });
}

async function readFrozenForegroundLuminance(
  page: Parameters<typeof openFrozen>[0],
): Promise<Readonly<{ height: number; luminance: number; width: number }>> {
  return page.locator(frozenCanvasSelector).evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 96;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Could not sample the frozen WebGL canvas.");
    }
    context.drawImage(element, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let luminance = 0;
    let foregroundPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 16) continue;
      luminance +=
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      foregroundPixels += 1;
    }
    if (foregroundPixels === 0) {
      throw new Error("The frozen canvas has no visible foreground pixels.");
    }
    return {
      height: element.height,
      luminance: luminance / foregroundPixels,
      width: element.width,
    };
  });
}

async function fillFrozenSliderAndWait(
  page: Parameters<typeof openFrozen>[0],
  target: string,
  value: string,
): Promise<void> {
  const canvas = page.locator(frozenCanvasSelector);
  const before = await canvas.getAttribute("data-frozen-rendered");
  const control = await getToolcraftControlFieldByTarget(page, target);
  await control.locator('input[type="range"]').fill(value);
  await expect
    .poll(() => canvas.getAttribute("data-frozen-rendered"), { timeout: 15_000 })
    .not.toBe(before);
}

async function clickFrozenSourceMode(
  control: import("@playwright/test").Locator,
  label: "3D" | "Image",
): Promise<void> {
  const item = control
    .locator('[data-slot="toggle-group-item"]')
    .filter({ hasText: label });
  await expect(item).toHaveCount(1);
  if ((await item.getAttribute("aria-pressed")) !== "true") {
    await item.click();
  }
}

async function proveImageSlider(
  page: Parameters<typeof openFrozen>[0],
  target:
    | "source.imageBevel"
    | "source.imageCornerRadius"
    | "source.imageThickness",
): Promise<void> {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  await uploadFrozenSourceImage(page);
  const hide = session.controlAction("source.mode", (control) =>
    clickFrozenSourceMode(control, "3D"),
  );
  const show = session.controlAction("source.mode", (control) =>
    clickFrozenSourceMode(control, "Image"),
  );
  await expectToolcraftConditionalControlVisibility(session, hide, show, {
    requirementId: target,
    target,
    timeoutMs: 15_000,
  });
  const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
  await progress.locator('input[type="range"]').fill("100");
  await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
    "data-frozen-progress",
    "1",
  );
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (control, currentPage) =>
      dragFrozenSlider(control, currentPage, 0.86),
    ),
    { requirementId: target, selector: frozenOutputSelector, timeoutMs: 15_000 },
  );
}

test("browser: source mode switches between 3D and image geometry", async ({
  page,
}) => {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Type", {
    requirementId: "source.mode",
    target: "source.mode",
  });
  await uploadFrozenObj(page);
  await selectFrozenSourceMode(page, "Image");
  const imageControl = await getToolcraftControlFieldByTarget(page, "source.image");
  await imageControl.locator('input[type="file"]').setInputFiles({
    buffer: await createFrozenSourcePng(page),
    mimeType: "image/png",
    name: "asymmetric-source.png",
  });
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-kind",
    "image",
    { timeout: 15_000 },
  );
  await selectFrozenSourceMode(page, "3D");
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-kind",
    "model",
  );
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("source.mode", (control) =>
      clickFrozenSourceMode(control, "Image"),
    ),
    {
      requirementId: "source.mode",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-kind",
    "image",
  );
});

test(
  "browser: source image upload transforms clear and reset drive volumetric geometry",
  async ({ page }) => {
    await openFrozen(page);
    const session = await createToolcraftBrowserProofSession(page);
    await selectFrozenSourceMode(page, "Image");
    await expectToolcraftConditionalControlVisibility(
      session,
      session.controlAction("source.mode", (control) =>
        clickFrozenSourceMode(control, "3D"),
      ),
      session.controlAction("source.mode", (control) =>
        clickFrozenSourceMode(control, "Image"),
      ),
      {
        requirementId: "source.image",
        target: "source.image",
        timeoutMs: 15_000,
      },
    );
    const lifecycle = session.observe((root) => {
      const canvas = root.querySelector<HTMLCanvasElement>(
        '[data-slot="frozen-webgl-canvas"]',
      );
      const label = canvas?.dataset.modelLabel;
      return {
        itemIds: label ? [label] : [],
        outputSignature: [
          canvas?.dataset.modelStatus ?? "missing",
          canvas?.dataset.modelKind ?? "none",
          canvas?.dataset.imageAspect ?? "none",
        ].join(":"),
      };
    });
    const upload = session.controlAction("source.image", async (control) => {
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
    });
    await expectToolcraftMediaLifecycle(
      lifecycle,
      upload,
      {
        itemIds: ["asymmetric-source.png"],
        outputSignature: "ready:image:2",
      },
      { requirementId: "source.image", timeoutMs: 15_000 },
    );

    const beforeRotate = await readFrozenPixelSignature(page);
    await page.getByRole("button", { name: "90° Right", exact: true }).click();
    await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
      "data-image-aspect",
      "0.5",
      { timeout: 15_000 },
    );
    expect(await readFrozenPixelSignature(page)).not.toBe(beforeRotate);
    const beforeFlip = await readFrozenPixelSignature(page);
    await page.getByRole("button", { name: "Flip horizontal", exact: true }).click();
    await expect
      .poll(() => readFrozenPixelSignature(page), { timeout: 15_000 })
      .not.toBe(beforeFlip);

    await page.getByRole("button", { name: "Remove image", exact: true }).click();
    await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
      "data-model-status",
      "empty",
    );
    await uploadFrozenSourceImage(page);
    await page.getByRole("button", { name: "Reset controls" }).click();
    await selectFrozenSourceMode(page, "Image");
    await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
      "data-model-status",
      "empty",
    );
  },
);

test("browser: image source icicles bend toward gravity", async ({ page }) => {
  await openFrozen(page);
  await uploadFrozenSourceImage(page);
  const canvas = page.locator(frozenCanvasSelector);
  await expect(canvas).toHaveAttribute("data-icicle-direction", "gravity-bent", {
    timeout: 15_000,
  });

  const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
  await progress.locator('input[type="range"]').fill("48");
  const density = await getToolcraftControlFieldByTarget(page, "ice.icicleDensity");
  await density.locator('input[type="range"]').fill("100");
  const length = await getToolcraftControlFieldByTarget(page, "ice.icicleLength");
  await length.locator('input[type="range"]').fill("0");
  const withoutIcicles = await readFrozenPixelSignature(page);
  await length.locator('input[type="range"]').fill("46");
  await expect
    .poll(() => readFrozenPixelSignature(page), { timeout: 15_000 })
    .not.toBe(withoutIcicles);
  await expect
    .poll(() => canvas.getAttribute("data-icicle-hanging-count"))
    .not.toBe("0");
  await expect
    .poll(() => canvas.getAttribute("data-icicle-wall-count"))
    .not.toBe("0");
  await expect(canvas).toHaveAttribute("data-icicle-horizontal-count", "0");

  await selectFrozenSourceMode(page, "3D");
  await uploadFrozenObj(page);
  await expect(canvas).toHaveAttribute("data-icicle-direction", "gravity", {
    timeout: 15_000,
  });
});

test(
  "browser: image card preserves source colors independently from scene lighting",
  async ({ page }) => {
    await openFrozen(page);
    await uploadFrozenSourceImage(page);
    await fillFrozenSliderAndWait(page, "effect.progress", "100");
    await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
      "data-frozen-progress",
      "1",
    );

    await fillFrozenSliderAndWait(page, "lighting.environmentIntensity", "0");
    await fillFrozenSliderAndWait(page, "lighting.exposure", "25");
    const lowLightSource = await readFrozenImageFaceSignature(page);

    await fillFrozenSliderAndWait(page, "lighting.environmentIntensity", "300");
    await fillFrozenSliderAndWait(page, "lighting.exposure", "200");
    const highLightSource = await readFrozenImageFaceSignature(page);
    expect(highLightSource).toEqual(lowLightSource);
    expect(highLightSource.left).toEqual([244, 59, 48]);
    expect(highLightSource.right).toEqual([20, 108, 255]);
  },
);

test("browser: Model exposure changes source brightness", async ({ page }) => {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  await expectToolcraftConditionalControlVisibility(
    session,
    session.controlAction("source.mode", (control) =>
      clickFrozenSourceMode(control, "Image"),
    ),
    session.controlAction("source.mode", (control) =>
      clickFrozenSourceMode(control, "3D"),
    ),
    {
      requirementId: "source.modelExposure",
      target: "source.modelExposure",
      timeoutMs: 15_000,
    },
  );
  await fillFrozenSliderAndWait(page, "effect.progress", "0");
  await fillFrozenSliderAndWait(page, "source.modelExposure", "-3");
  const frozenDark = await readFrozenPixelSignature(page);
  await fillFrozenSliderAndWait(page, "source.modelExposure", "3");
  const frozenBright = await readFrozenPixelSignature(page);
  expect(frozenBright).toBe(frozenDark);

  await fillFrozenSliderAndWait(page, "effect.progress", "100");
  await fillFrozenSliderAndWait(page, "source.modelExposure", "-3");
  const dark = await readFrozenForegroundLuminance(page);

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("source.modelExposure", async (control) => {
      await control.locator('input[type="range"]').fill("3");
    }),
    {
      requirementId: "source.modelExposure",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
  const bright = await readFrozenForegroundLuminance(page);
  expect(bright.luminance).toBeGreaterThan(dark.luminance * 1.2);
  expect({ height: bright.height, width: bright.width }).toEqual({
    height: dark.height,
    width: dark.width,
  });
});

test("browser: source.imageThickness changes frozen product output", async ({
  page,
}) => {
  await proveImageSlider(page, "source.imageThickness");
});

test(
  "browser: source.imageCornerRadius changes frozen product output",
  async ({ page }) => {
    await openFrozen(page);
    const session = await createToolcraftBrowserProofSession(page);
    await uploadFrozenSourceImage(page);
    await expectToolcraftConditionalControlVisibility(
      session,
      session.controlAction("source.mode", (control) =>
        clickFrozenSourceMode(control, "3D"),
      ),
      session.controlAction("source.mode", (control) =>
        clickFrozenSourceMode(control, "Image"),
      ),
      {
        requirementId: "source.imageCornerRadius",
        target: "source.imageCornerRadius",
        timeoutMs: 15_000,
      },
    );
    await fillFrozenSliderAndWait(page, "effect.progress", "100");
    await fillFrozenSliderAndWait(page, "source.imageBevel", "0");
    await fillFrozenSliderAndWait(page, "source.imageCornerRadius", "0");
    const squareCoverage = await readFrozenTopCornerCoverage(page);

    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(
        "source.imageCornerRadius",
        (control, currentPage) => dragFrozenSlider(control, currentPage, 0.98),
      ),
      {
        requirementId: "source.imageCornerRadius",
        selector: frozenOutputSelector,
        timeoutMs: 15_000,
      },
    );
    const cornerControl = await getToolcraftControlFieldByTarget(
      page,
      "source.imageCornerRadius",
    );
    await cornerControl.locator('input[type="range"]').fill("100");
    await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
      "data-image-corner-roundness",
      "1",
    );
    const roundedCoverage = await readFrozenTopCornerCoverage(page);
    expect(squareCoverage).toBeGreaterThan(0.65);
    expect(roundedCoverage).toBeLessThan(0.25);
  },
);

test("browser: source.imageBevel changes frozen product output", async ({ page }) => {
  await proveImageSlider(page, "source.imageBevel");
});
