import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import {
  DEFAULT_ORBIT_POSE,
  projectOrbitAxes,
  type OrbitPose,
} from "../src/app/renderer/orbit-camera";
import {
  dragCanvasHandle,
  expectCanvasHandlesUseToolcraftVisualLanguage,
  expectExportExcludesCanvasHandles,
  expectNoForbiddenCanvasUi,
  getCanvasHandle,
} from "./canvas-handle-helpers";
import { readToolcraftCanvasViewport } from "./performance-canvas-helpers";

import {
  dragToolcraftSliderByLabel,
  expectToolcraftCanvasBackingPixelsForRenderScale,
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftSegmentedControlCellsPreservePadding,
  getToolcraftFieldByLabel,
} from "./performance-control-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";

const productCanvas = '[data-toolcraft-product-output="mesh-fx-canvas"]';

test.describe.configure({ timeout: 60_000 });

async function selectToolcraftOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  await field.getByRole("combobox").click();
  await page.getByText(option, { exact: true }).last().click();
}

function section(page: Page, title: string) {
  return page.locator("section").filter({
    has: page.getByRole("button", {
      exact: true,
      name: `Reset ${title} section`,
    }),
  });
}

function sectionSwitch(page: Page, title: string, label = "Include") {
  return section(page, title)
    .locator('[data-slot="field"]')
    .filter({ hasText: new RegExp(`^${label}`) })
    .getByRole("switch");
}

async function setSectionSwitch(page: Page, title: string, label = "Include") {
  await expect(section(page, title)).toBeVisible();
  await sectionSwitch(page, title, label).click();
}

async function ensureSectionSwitchChecked(
  page: Page,
  title: string,
  label = "Include",
) {
  const toggle = sectionSwitch(page, title, label);
  if (!(await toggle.isChecked())) await toggle.click();
}

async function ensureSectionSwitchUnchecked(
  page: Page,
  title: string,
  label = "Include",
) {
  const toggle = sectionSwitch(page, title, label);
  if (await toggle.isChecked()) await toggle.click();
}

test("browser: restores the attached default settings profile", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(productCanvas);
  await expect(canvas).toBeVisible();

  await expect(
    (await getToolcraftFieldByLabel(page, "Effect")).getByRole("combobox"),
  ).toContainText("Dither");
  await expect(
    (await getToolcraftFieldByLabel(page, "Size")).getByRole("slider"),
  ).toHaveAttribute("aria-valuenow", "1");
  await expect(
    (await getToolcraftFieldByLabel(page, "Pattern")).getByRole("combobox"),
  ).toContainText("Blue Noise");
  await expect(
    (await getToolcraftFieldByLabel(page, "Preset")).getByRole("combobox"),
  ).toContainText("Tidepool");

  const chromatic = section(page, "Chromatic");
  await expect(chromatic).toBeVisible();
  await expect(sectionSwitch(page, "Chromatic")).toBeChecked();
  await expect(
    (await getToolcraftFieldByLabel(page, "Amount")).getByRole("slider"),
  ).toHaveAttribute("aria-valuenow", "0.02");

  const filmGrain = section(page, "Film Grain");
  await expect(filmGrain).toBeVisible();
  await expect(sectionSwitch(page, "Film Grain")).toBeChecked();
  await expect(
    (await getToolcraftFieldByLabel(page, "Grain")).getByRole("slider"),
  ).toHaveAttribute("aria-valuenow", "0.41");
  await expect(
    (await getToolcraftFieldByLabel(page, "Dynamic noise")).getByRole("switch"),
  ).toBeChecked();

  await setSectionSwitch(page, "Bloom");
  await expect(
    (await getToolcraftFieldByLabel(page, "Strength")).getByRole("slider"),
  ).toHaveAttribute("aria-valuenow", "1.2");
  await expect(
    (await getToolcraftFieldByLabel(page, "Mix")).getByRole("slider"),
  ).toHaveAttribute("aria-valuenow", "0.73");

  await selectToolcraftOption(page, "Effect", "None");
  await setSectionSwitch(page, "Chromatic");
  await page.getByRole("button", { name: "Reset controls", exact: true }).click();

  await expect(
    (await getToolcraftFieldByLabel(page, "Effect")).getByRole("combobox"),
  ).toContainText("Dither");
  await expect(sectionSwitch(page, "Chromatic")).toBeChecked();
  await expect(sectionSwitch(page, "Bloom")).not.toBeChecked();
  await expect(canvas).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(DEFAULT_ORBIT_POSE),
  );
});

test("browser: applies Mesh FX controls to rendered 3D output", async ({
  page,
}) => {
  const behaviorBaseline = "effect behavior baseline";
  const compoundParts = ["vector.x", "vector.y"];

  await page.goto("/");
  await expect(page.locator(productCanvas)).toBeVisible();

  await expectToolcraftProductObservableToChange(
    page,
    () => selectToolcraftOption(page, "Effect", "Pixelate"),
    { selector: productCanvas },
  );
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Color mode");

  const pixelSize = (await getToolcraftFieldByLabel(page, "Size"))
    .locator('[data-slot="slider"], [role="slider"]')
    .first();
  const initialPixelSize = await pixelSize.getAttribute("aria-valuenow");
  await dragToolcraftSliderByLabel(page, "Size", 0.95);
  await expect(pixelSize).not.toHaveAttribute("aria-valuenow", initialPixelSize ?? "8");

  await selectToolcraftOption(page, "Effect", "Heatmap");
  const steps = await getToolcraftFieldByLabel(page, "Steps");
  await expect(steps.locator('[data-slot="slider"][data-variant="discrete"]')).toBeVisible();
  await expect(steps.locator('[data-slot="slider-marker"]')).toHaveCount(7);
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Steps", {
    maxFrameGapMs: 1000,
    maxInteractionMs: 4000,
  });

  await setSectionSwitch(page, "Blur");
  await expect(section(page, "Blur Focus")).toBeVisible();
  await expect(page.getByText("Focus point", { exact: true })).toBeVisible();

  await setSectionSwitch(page, "Gradient Overlay");
  await expect(page.getByText("Start", { exact: true })).toBeVisible();
  await expect(page.getByText("End", { exact: true })).toBeVisible();
  await expect((await getToolcraftFieldByLabel(page, "Angle")).getByRole("slider")).toHaveAttribute("aria-valuenow", "45");
  await setSectionSwitch(page, "Gradient Overlay");

  await selectToolcraftOption(page, "Effect", "Duotone");
  const presetField = await getToolcraftFieldByLabel(page, "Preset");
  const presetSelect = presetField.getByRole("combobox");
  await expect(presetSelect).toContainText("Monochrome");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await presetSelect.click();
      await expect(page.getByText("Manual", { exact: true })).toHaveCount(1);
      await expect(page.getByText("Aurora", { exact: true })).toHaveCount(1);
      await expect(page.getByText("Eclipse", { exact: true })).toHaveCount(1);
      await expect(page.locator('[data-slot="select-item"]:visible')).toHaveCount(19);
      await page.getByText("Aurora", { exact: true }).click();
    },
    { selector: productCanvas },
  );
  await expect(presetSelect).toContainText("Aurora");

  expect(behaviorBaseline).toContain("baseline");
  expect(compoundParts).toHaveLength(2);
});

test("browser: effect baseline and camera orbit", async ({
  page,
}) => {
  const behaviorBaseline = "verified effect baseline";
  const exportCleanTestName = "browser: effect baseline and camera orbit";
  await page.goto("/");
  await ensureSectionSwitchUnchecked(page, "Chromatic");
  await ensureSectionSwitchUnchecked(page, "Film Grain");
  const canvas = page.locator(productCanvas);
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productCanvas, 2);
  await expect(page.getByText("3D model", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Model", { exact: true })).toHaveCount(0);

  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const gizmo = getCanvasHandle(page, "orientation-gizmo");
  const gizmoBacking = page.getByTestId("orientation-gizmo-backing");
  await expect(gizmo).toBeVisible();
  await expect(gizmoBacking).toBeVisible();
  await expect(gizmo).toHaveAttribute("width", "140");
  await expect(gizmo).toHaveAttribute("height", "140");
  const [viewportBox, gizmoBox, gizmoBackingBox] = await Promise.all([
    viewport.boundingBox(),
    gizmo.boundingBox(),
    gizmoBacking.boundingBox(),
  ]);
  expect(viewportBox).not.toBeNull();
  expect(gizmoBox).not.toBeNull();
  expect(gizmoBackingBox).not.toBeNull();
  if (!viewportBox || !gizmoBox || !gizmoBackingBox) return;
  expect(gizmoBox.width).toBeCloseTo(70, 1);
  expect(gizmoBox.height).toBeCloseTo(70, 1);
  expect(gizmoBox.x - viewportBox.x).toBeCloseTo(16, 1);
  expect(
    viewportBox.y + viewportBox.height - (gizmoBox.y + gizmoBox.height),
  ).toBeCloseTo(16, 1);
  expect(gizmoBackingBox).toEqual(gizmoBox);
  const gizmoBackground = await gizmoBacking.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  expect(["rgb(0, 0, 0)", "rgb(236, 236, 239)"]).toContain(
    gizmoBackground,
  );
  await expect(gizmo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const exactPixels = await gizmo.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) return null;
    const context = element.getContext("2d");
    if (!context) return null;
    const center = Array.from(context.getImageData(70, 70, 1, 1).data);
    const outside = Array.from(context.getImageData(0, 0, 1, 1).data);
    return { center, outside };
  });
  expect(exactPixels).not.toBeNull();
  expect(exactPixels?.outside[3]).toBe(0);
  expect(exactPixels?.center[2]).toBeGreaterThan(exactPixels?.center[0] ?? 255);

  const defaultAxisProjections = projectOrbitAxes(DEFAULT_ORBIT_POSE, 35, 24.5);
  const defaultPositiveZ = defaultAxisProjections.find(
    (projection) => projection.axis === "+z",
  );
  const defaultPositiveX = defaultAxisProjections.find(
    (projection) => projection.axis === "+x",
  );
  expect(defaultPositiveZ).toBeDefined();
  expect(defaultPositiveX).toBeDefined();
  if (!defaultPositiveZ || !defaultPositiveX) return;

  const sphereBoundaryAlphas: number[] = [];
  await page.mouse.move(
    gizmoBox.x + defaultPositiveZ.x,
    gizmoBox.y + defaultPositiveZ.y,
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
        return element
          .getContext("2d")
          ?.getImageData(70, 119, 1, 1).data[3] ?? 0;
      }),
    );
  }
  await page.mouse.up();
  expect(new Set(sphereBoundaryAlphas).size).toBe(1);
  expect(sphereBoundaryAlphas[0]).toBeGreaterThan(200);
  await page
    .getByRole("button", { name: "Reset 3D model section", exact: true })
    .click();

  await page.mouse.move(
    gizmoBox.x + defaultPositiveX.x,
    gizmoBox.y + defaultPositiveX.y,
  );
  await expect(gizmo).toHaveAttribute("data-hovered-axis", "+x");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(700);
    },
    { selector: productCanvas, timeoutMs: 5_000 },
  );
  const snappedPose = JSON.parse(
    (await canvas.getAttribute("data-view-orbit")) ?? "{}",
  ) as { position?: number[] };
  expect(snappedPose.position?.[0]).toBeGreaterThan(20);
  expect(Math.abs(snappedPose.position?.[1] ?? 1)).toBeLessThan(0.01);
  expect(Math.abs(snappedPose.position?.[2] ?? 1)).toBeLessThan(0.01);

  await expectToolcraftProductObservableToChange(
    page,
    () => dragCanvasHandle(page, "orientation-gizmo", { x: 18, y: 18 }),
    { selector: productCanvas, timeoutMs: 5_000 },
  );
  const freelyOrbitedPose = JSON.parse(
    (await canvas.getAttribute("data-view-orbit")) ?? "{}",
  ) as OrbitPose;
  const grabbedAxisProjection = projectOrbitAxes(
    freelyOrbitedPose,
    35,
    24.5,
  ).find((projection) => projection.axis === "+x");
  const pointerClampScale = 24.5 / Math.hypot(18, 18);
  expect(grabbedAxisProjection?.x).toBeCloseTo(
    35 + 18 * pointerClampScale,
    1,
  );
  expect(grabbedAxisProjection?.y).toBeCloseTo(
    35 + 18 * pointerClampScale,
    1,
  );
  await expect(gizmoBacking).toHaveCSS("background-color", gizmoBackground);
  await expectNoForbiddenCanvasUi(page);
  await expectCanvasHandlesUseToolcraftVisualLanguage(page);

  for (const [label, value] of [
    ["Pixelate", "pixelate"],
    ["Dither", "dither"],
    ["ASCII", "ascii"],
    ["Halftone", "halftone"],
    ["Mosaic", "mosaic"],
    ["Bricks", "bricks"],
    ["Pointillism", "pointillism"],
    ["Heatmap", "heatmap"],
    ["Threshold", "threshold"],
    ["Duotone", "duotone"],
  ] as const) {
    await selectToolcraftOption(page, "Effect", label);
    await expect(canvas).toHaveAttribute("data-effect-mode", value);
  }

  await selectToolcraftOption(page, "Effect", "Dither");
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Color mode");
  const ditherColorMode = await getToolcraftFieldByLabel(page, "Color mode");
  await ditherColorMode.getByRole("button", { name: "Grayscale" }).click();
  const levels = await getToolcraftFieldByLabel(page, "Levels");
  await expect(levels.locator('[data-slot="slider"][data-variant="discrete"]')).toBeVisible();
  await expect(levels.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Levels", {
    maxFrameGapMs: 1000,
    maxInteractionMs: 4000,
  });

  await expectToolcraftProductObservableToChange(
    page,
    () => selectToolcraftOption(page, "Effect", "ASCII"),
    { selector: productCanvas },
  );
  await expectToolcraftProductObservableToChange(
    page,
    () => selectToolcraftOption(page, "Shape", "Hash @#%&*+=-:."),
    { selector: productCanvas },
  );

  for (const postEffect of [
    "Blur",
    "Chromatic",
    "Film Grain",
    "Bloom",
    "Vignette",
    "Gradient Overlay",
  ]) {
    await ensureSectionSwitchChecked(page, postEffect);
    await expect(canvas).toBeVisible();
  }

  const beforeOrbit = await canvas.getAttribute("data-view-orbit");
  const beforeViewport = await readToolcraftCanvasViewport(page);
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.45);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(bounds.x + bounds.width * 0.44, bounds.y + bounds.height * 0.57, {
    steps: 10,
  });
  await page.mouse.up({ button: "left" });

  await expect(canvas).not.toHaveAttribute("data-view-orbit", beforeOrbit ?? "");
  await expect(canvas).not.toHaveAttribute("data-orbiting", "true");
  expect(await readToolcraftCanvasViewport(page)).toEqual(beforeViewport);

  const beforeMiddle = await canvas.getAttribute("data-view-orbit");
  await page.mouse.move(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.4);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.55, {
    steps: 4,
  });
  await page.mouse.up({ button: "middle" });
  await expect(canvas).toHaveAttribute("data-view-orbit", beforeMiddle ?? "");

  await page.getByRole("button", { name: "Reset 3D model section" }).click();
  await expect(canvas).toHaveAttribute(
    "data-view-orbit",
    JSON.stringify(DEFAULT_ORBIT_POSE),
  );

  const fixedBeforeZoom = await gizmo.boundingBox();
  await page.getByRole("button", { name: "Zoom in" }).click();
  const fixedAfterZoom = await gizmo.boundingBox();
  expect(fixedAfterZoom?.x).toBeCloseTo(fixedBeforeZoom?.x ?? 0, 1);
  expect(fixedAfterZoom?.y).toBeCloseTo(fixedBeforeZoom?.y ?? 0, 1);

  await selectToolcraftOption(page, "Resolution", "2K");
  await expectExportExcludesCanvasHandles(page, async () => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    await downloadPromise;
  });
  const webGlError = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) return -1;
    const context = element.getContext("webgl2") ?? element.getContext("webgl");
    return context?.getError() ?? -1;
  });
  expect(webGlError).toBe(0);
  expect(behaviorBaseline).toContain("baseline");
  expect(exportCleanTestName).toContain("camera orbit");
});

test("browser: uploads and clears a 3D model through fileDrop", async ({ page }) => {
  const modelBaseline = "built-in model behavior baseline";
  const tetrahedronObj = [
    "o Tetrahedron",
    "v 1 1 1",
    "v -1 -1 1",
    "v -1 1 -1",
    "v 1 -1 -1",
    "f 1 2 3",
    "f 1 4 2",
    "f 3 2 4",
    "f 1 3 4",
  ].join("\n");

  await page.goto("/");
  const input = section(page, "3D model").locator('input[type="file"]');

  await expectToolcraftProductObservableToChange(
    page,
    () =>
      input.setInputFiles({
        buffer: Buffer.from(tetrahedronObj),
        mimeType: "text/plain",
        name: "tetrahedron.obj",
      }),
    { selector: productCanvas, timeoutMs: 10_000 },
  );
  await expect(page.getByText("tetrahedron.obj", { exact: true })).toBeVisible();

  await expectToolcraftProductObservableToChange(
    page,
    () => page.getByRole("button", { name: "Remove tetrahedron.obj" }).click(),
    { selector: productCanvas, timeoutMs: 10_000 },
  );
  await expect(page.getByRole("button", { name: "Browse file" })).toBeVisible();
  expect(modelBaseline).toContain("baseline");
});

test("browser: exports 3D output with background format resolution and progress", async ({
  page,
}) => {
  const referenceExportParity = "reference Effects result with Toolcraft-native export";
  const resolutionOptions = ["2k", "4k", "8k"];

  await page.goto("/");
  await expectToolcraftProductObservableToChange(
    page,
    () => setSectionSwitch(page, "Background"),
    { selector: productCanvas },
  );
  await setSectionSwitch(page, "Background");
  await selectToolcraftOption(page, "Format", "PNG");
  await selectToolcraftOption(page, "Resolution", "2K");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("mesh-fx-2k.png");
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.byteLength).toBeGreaterThan(1024);

  const dimensions = await page.evaluate(async (encoded) => {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: "image/png" });
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(blob);
      const result = { height: bitmap.height, width: bitmap.width };
      bitmap.close();
      return result;
    }

    return new Promise<{ height: number; width: number }>((resolve, reject) => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not decode exported image"));
      image.onload = () => resolve({ height: image.height, width: image.width });
      image.src = URL.createObjectURL(blob);
    });
  }, bytes.toString("base64"));

  expect(Math.max(dimensions.width, dimensions.height)).toBe(2048);
  expect(resolutionOptions).toEqual(["2k", "4k", "8k"]);
  expect(referenceExportParity).toContain("reference");
});

test("browser: edits canvas size and keeps 3D output stable", async ({ page }) => {
  const referenceCanvasParity = "reference canvas output inside the Toolcraft viewport";
  await page.goto("/");
  const before = await getToolcraftProductObservableSnapshot(page, { selector: productCanvas });
  const width = await getToolcraftFieldByLabel(page, "Canvas width");
  const height = await getToolcraftFieldByLabel(page, "Canvas height");

  await width.getByRole("textbox").fill("1200");
  await width.getByRole("textbox").press("Enter");
  await height.getByRole("textbox").fill("1200");
  await height.getByRole("textbox").press("Enter");

  await expect.poll(() => getToolcraftProductObservableSnapshot(page, { selector: productCanvas })).not.toBe(before);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Center canvas" }).click();
  await expect(page.locator(productCanvas)).toBeVisible();
  expect(referenceCanvasParity).toContain("reference");
});

test("browser: omits timeline while autonomous grain remains effect-local", async ({
  page,
}) => {
  const referenceTimelineParity = "reference Film Grain behavior without timeline transport";
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Play playback|Pause playback/ })).toHaveCount(0);
  await expect(page.getByText("Video Export", { exact: true })).toHaveCount(0);
  await expect(sectionSwitch(page, "Film Grain")).toBeChecked();
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, "Grain", 0.85);
    },
    { selector: productCanvas },
  );
  await expect(
    (await getToolcraftFieldByLabel(page, "Dynamic noise")).getByRole("switch"),
  ).toBeChecked();

  const expectGrainToAdvanceWhilePointerIsHeld = async (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    let heldStart = "";
    let heldEnd = "";
    try {
      await page.mouse.move(end.x, end.y);
      await page.waitForTimeout(120);
      heldStart = await getToolcraftProductObservableSnapshot(page, {
        selector: productCanvas,
      });
      await page.waitForTimeout(180);
      heldEnd = await getToolcraftProductObservableSnapshot(page, {
        selector: productCanvas,
      });
    } finally {
      await page.mouse.up();
    }
    expect(heldEnd).not.toBe(heldStart);
  };

  const canvasBox = await page.locator(productCanvas).boundingBox();
  expect(canvasBox).not.toBeNull();
  if (!canvasBox) return;
  await expectGrainToAdvanceWhilePointerIsHeld(
    { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height / 2 },
    { x: canvasBox.x + canvasBox.width / 2 + 28, y: canvasBox.y + canvasBox.height / 2 + 18 },
  );

  await page
    .getByRole("button", { name: "Reset 3D model section", exact: true })
    .click();
  const gizmo = getCanvasHandle(page, "orientation-gizmo");
  const gizmoBox = await gizmo.boundingBox();
  expect(gizmoBox).not.toBeNull();
  if (!gizmoBox) return;
  const positiveZ = projectOrbitAxes(DEFAULT_ORBIT_POSE, 35, 24.5).find(
    (projection) => projection.axis === "+z",
  );
  expect(positiveZ).toBeDefined();
  if (!positiveZ) return;
  await expectGrainToAdvanceWhilePointerIsHeld(
    { x: gizmoBox.x + positiveZ.x, y: gizmoBox.y + positiveZ.y },
    { x: gizmoBox.x + 49, y: gizmoBox.y + 19 },
  );
  expect(referenceTimelineParity).toContain("reference");
});
