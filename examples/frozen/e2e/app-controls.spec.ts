import {
  expectToolcraftOrientationAxisDrag,
  expectToolcraftOrientationAxisSnap,
  expectToolcraftOrientationCanvasMissPan,
  expectToolcraftOrientationModelDrag,
  expectToolcraftOrientationUndoReset,
} from "./browser-orientation-gizmo-evidence-helpers";
import {
  createToolcraftBrowserProofSession,
  readToolcraftBrowserObservation,
} from "./browser-proof-session";
import { expectToolcraftConditionalControlVisibility } from "./browser-conditional-output-evidence-helpers";
import {
  expectToolcraftMediaLifecycle,
} from "./browser-state-evidence-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import {
  createFrozenScratchPng,
  dragFrozenSlider,
  frozenCanvasSelector,
  frozenOutputSelector,
  openFrozen,
  readFrozenOutputSignature,
  setFrozenColor,
  toggleFrozenSwitch,
  uploadFrozenObj,
} from "./frozen-test-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expect, test } from "./toolcraft-product-test";

test.setTimeout(60_000);

async function createFrozenSession(page: Parameters<typeof openFrozen>[0]) {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  await uploadFrozenObj(page);
  return session;
}

async function readFrozenPixelSignature(
  page: Parameters<typeof openFrozen>[0],
): Promise<string> {
  const signature = await readFrozenOutputSignature(page);
  return signature.slice(signature.lastIndexOf(":") + 1);
}

async function proveSlider(
  page: Parameters<typeof openFrozen>[0],
  target: string,
): Promise<void> {
  const session = await createFrozenSession(page);
  if (target !== "effect.progress") {
    const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
    const progressSlider = progress.locator('input[type="range"]');
    await progressSlider.fill("48");
    await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
      "data-frozen-progress",
      "0.48",
    );
  }
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (control, currentPage) =>
      dragFrozenSlider(control, currentPage),
    ),
    { requirementId: target, selector: frozenOutputSelector, timeoutMs: 15_000 },
  );
}

async function proveColor(
  page: Parameters<typeof openFrozen>[0],
  target: string,
  label: string,
  color: string,
): Promise<void> {
  const session = await createFrozenSession(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (control) => setFrozenColor(control, label, color)),
    { requirementId: target, selector: frozenOutputSelector, timeoutMs: 15_000 },
  );
}

test("browser: source scratch texture drives retained triplanar relief", async ({
  page,
}) => {
  const session = await createFrozenSession(page);
  await page
    .getByRole("button", { name: "Remove Black Painted Wall Texture.jpg" })
    .click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-scratch-status",
    "procedural",
  );
  const lifecycle = session.observe((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>(
      '[data-slot="frozen-webgl-canvas"]',
    );
    const label = canvas?.dataset.scratchLabel;
    return {
      itemIds: label ? [label] : [],
      outputSignature: `${canvas?.dataset.scratchStatus ?? "missing"}:${label ?? "none"}`,
    };
  });
  const upload = session.controlAction("source.scratchTexture", async (control) => {
    await control.locator('input[type="file"]').setInputFiles({
      buffer: await createFrozenScratchPng(page),
      mimeType: "image/png",
      name: "scratch-map.png",
    });
    await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
      "data-scratch-status",
      "ready",
      { timeout: 15_000 },
    );
  });
  await expectToolcraftMediaLifecycle(
    lifecycle,
    upload,
    { itemIds: ["scratch-map.png"], outputSignature: "ready:scratch-map.png" },
    { requirementId: "source.scratchTexture", timeoutMs: 15_000 },
  );
  await page.getByRole("button", { name: "Remove scratch-map.png" }).click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-scratch-status",
    "procedural",
  );
  await page.getByRole("button", { name: "Reset Surface Relief section" }).click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-scratch-label",
    "Black Painted Wall Texture.jpg",
    { timeout: 15_000 },
  );
  const scratchControl = await getToolcraftControlFieldByTarget(
    page,
    "source.scratchTexture",
  );
  await scratchControl.locator('input[type="file"]').setInputFiles({
    buffer: await createFrozenScratchPng(page),
    mimeType: "image/png",
    name: "scratch-map.png",
  });
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-scratch-status",
    "ready",
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-status",
    "ready",
    { timeout: 30_000 },
  );
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-label",
    "Night King optimized 28k.zip",
  );
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-scratch-label",
    "Black Painted Wall Texture.jpg",
  );
});

test(
  "browser: orientation gizmo and direct model orbit share canvas ownership",
  async ({ page }) => {
    const session = await createFrozenSession(page);
    const meltControl = await getToolcraftControlFieldByTarget(page, "melt.enabled");
    if (
      (await meltControl.getByRole("switch").getAttribute("aria-checked")) ===
      "true"
    ) {
      await toggleFrozenSwitch(meltControl);
    }
    const observation = session.observe((root) => {
      const output = root.querySelector<HTMLElement>(
        '[data-slot="frozen-product-output"]',
      );
      const canvas = root.querySelector<HTMLCanvasElement>(
        '[data-slot="frozen-webgl-canvas"]',
      );
      const pose = JSON.parse(output?.dataset.orientation ?? "{}") as {
        position: [number, number, number];
        up: [number, number, number];
      };
      return {
        outputSignature: canvas?.dataset.frozenRendered ?? "missing",
        pose,
        poseTarget: "scene.orientation",
        viewportOffsetX: Number(output?.dataset.viewportOffsetX ?? 0),
        viewportOffsetY: Number(output?.dataset.viewportOffsetY ?? 0),
      };
    });
    const options = {
      requirementId: "scene.orientation",
      target: "scene.orientation",
      timeoutMs: 15_000,
    } as const;
    const gizmo = page.getByTestId("toolcraft-orientation-gizmo");
    const gizmoBounds = await gizmo.boundingBox();
    expect(gizmoBounds).not.toBeNull();

    await expectToolcraftOrientationAxisDrag(
      observation,
      session.action(async (currentPage) => {
        const x = gizmoBounds!.x + gizmoBounds!.width * 0.82;
        const y = gizmoBounds!.y + gizmoBounds!.height * 0.5;
        await currentPage.mouse.move(x, y);
        await currentPage.mouse.down();
        await currentPage.mouse.move(x - 18, y + 12, { steps: 5 });
        await currentPage.mouse.up();
      }),
      options,
    );

    await page.getByRole("button", { name: "Reset Thaw Front section" }).click();
    await expectToolcraftOrientationAxisSnap(
      observation,
      session.action(async () => {
        await gizmo.click({
          position: {
            x: gizmoBounds!.width * 0.82,
            y: gizmoBounds!.height * 0.5,
          },
        });
      }),
      "+x",
      options,
    );

    await page.getByRole("button", { name: "Reset Thaw Front section" }).click();
    const baseline = await readToolcraftBrowserObservation(observation);
    const canvas = page.locator(frozenCanvasSelector);
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();
    const changed = await expectToolcraftOrientationModelDrag(
      observation,
      session.action(async (currentPage) => {
        const x = canvasBounds!.x + canvasBounds!.width * 0.5;
        const y = canvasBounds!.y + canvasBounds!.height * 0.5;
        await currentPage.mouse.move(x, y);
        await currentPage.mouse.down();
        await currentPage.mouse.move(x + 54, y + 24, { steps: 7 });
        await currentPage.mouse.up();
      }),
      options,
    );
    await expectToolcraftOrientationUndoReset(
      observation,
      session.action(async (currentPage) => {
        await currentPage.getByRole("button", { name: "Undo" }).click();
      }),
      session.action(async (currentPage) => {
        await currentPage.getByRole("button", { name: "Redo" }).click();
      }),
      session.action(async (currentPage) => {
        await currentPage
          .getByRole("button", { name: "Reset Thaw Front section" })
          .click();
      }),
      baseline,
      changed,
      options,
    );
    await expectToolcraftOrientationCanvasMissPan(
      observation,
      session.action(async (currentPage) => {
        const viewportBounds = await currentPage
          .getByRole("application", { name: "Canvas viewport" })
          .boundingBox();
        expect(viewportBounds).not.toBeNull();
        const x = Math.max(canvasBounds!.x, viewportBounds!.x) + 18;
        const y = Math.max(canvasBounds!.y, viewportBounds!.y) + 18;
        await currentPage.mouse.move(x, y);
        await currentPage.mouse.down();
        await currentPage.mouse.move(x + 60, y + 38, { steps: 6 });
        await currentPage.mouse.up();
      }),
      options,
    );
  },
);

test("browser: effect.progress changes frozen product output", async ({ page }) => {
  await proveSlider(page, "effect.progress");
});

test("browser: effect.transition changes frozen product output", async ({ page }) => {
  await proveSlider(page, "effect.transition");
});

test("browser: effect.noiseScale changes frozen product output", async ({ page }) => {
  await proveSlider(page, "effect.noiseScale");
});

test("browser: effect.turbulence changes frozen product output", async ({ page }) => {
  await proveSlider(page, "effect.turbulence");
});

test("browser: ice.shellThickness changes frozen product output", async ({ page }) => {
  await proveSlider(page, "ice.shellThickness");
});

test("browser: ice.crystalDensity changes frozen product output", async ({ page }) => {
  const session = await createFrozenSession(page);
  const output = page.locator(frozenCanvasSelector);
  const productOutput = page.locator(frozenOutputSelector);
  await expect
    .poll(async () => Number(await output.getAttribute("data-crystal-count")))
    .toBeGreaterThan(4_000);
  const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
  await progress.locator('input[type="range"]').fill("0");
  const density = await getToolcraftControlFieldByTarget(page, "ice.crystalDensity");
  await density.locator('input[type="range"]').fill("0");
  await expect(output).toHaveAttribute("data-crystal-count", "0");
  const frozenWithoutCrystals = await readFrozenPixelSignature(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("ice.crystalDensity", async (control) => {
      await control.locator('input[type="range"]').fill("100");
    }),
    {
      requirementId: "ice.crystalDensity",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
  await expect
    .poll(async () => Number(await output.getAttribute("data-crystal-count")))
    .toBeGreaterThan(10_000);
  await expect
    .poll(() => readFrozenPixelSignature(page))
    .not.toBe(frozenWithoutCrystals);
  await page.screenshot({ path: "/tmp/frozen-full-coverage.png" });

  await progress.locator('input[type="range"]').fill("100");
  await expect(productOutput).toHaveAttribute("data-frozen-progress", "1");
  const fullyThawedWithCrystals = await readFrozenPixelSignature(page);
  await density.locator('input[type="range"]').fill("0");
  await expect(output).toHaveAttribute("data-crystal-count", "0");
  await expect
    .poll(() => readFrozenPixelSignature(page))
    .toBe(fullyThawedWithCrystals);
  await page.screenshot({ path: "/tmp/frozen-mask-cleared.png" });
});

test("browser: ice.icicleDensity changes frozen product output", async ({ page }) => {
  const session = await createFrozenSession(page);
  const output = page.locator(frozenCanvasSelector);
  const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
  await progress.locator('input[type="range"]').fill("48");
  const density = await getToolcraftControlFieldByTarget(page, "ice.icicleDensity");
  await density.locator('input[type="range"]').fill("0");
  await expect(output).toHaveAttribute("data-icicle-count", "0");
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("ice.icicleDensity", async (control) => {
      await control.locator('input[type="range"]').fill("100");
    }),
    {
      requirementId: "ice.icicleDensity",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
  await expect
    .poll(async () => Number(await output.getAttribute("data-icicle-count")))
    .toBeGreaterThan(100);
  await progress.locator('input[type="range"]').fill("100");
  await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
    "data-frozen-progress",
    "1",
  );
  const fullyThawedWithIcicles = await readFrozenPixelSignature(page);
  await density.locator('input[type="range"]').fill("0");
  await expect(output).toHaveAttribute("data-icicle-count", "0");
  await expect
    .poll(() => readFrozenPixelSignature(page))
    .toBe(fullyThawedWithIcicles);
});

test("browser: ice.icicleLength changes frozen product output", async ({ page }) => {
  await proveSlider(page, "ice.icicleLength");
});

test("browser: ice.color changes frozen product output", async ({ page }) => {
  await proveColor(page, "ice.color", "Tint", "#2455FF");
});

test("browser: ice.transmission changes frozen product output", async ({ page }) => {
  await proveSlider(page, "ice.transmission");
});

test("browser: ice.roughness changes frozen product output", async ({ page }) => {
  await proveSlider(page, "ice.roughness");
});

const additionalFrozenSliderTargets = [
  "ice.crystalSize",
  "ice.crystalElongation",
  "ice.crystalVariation",
  "ice.icicleRadius",
  "ice.icicleVariation",
  "ice.ior",
  "ice.roughnessVariation",
  "ice.materialMaskCoverage",
  "ice.materialMaskScale",
  "ice.materialMaskSoftness",
  "ice.materialMaskDistortion",
  "ice.materialMaskSeed",
  "scratch.scale",
  "scratch.rotation",
  "scratch.contrast",
  "scratch.displacement",
  "scratch.bump",
  "scratch.roughness",
  "lighting.environmentIntensity",
  "lighting.environmentRotation",
  "lighting.exposure",
] as const;

for (const target of additionalFrozenSliderTargets) {
  test(`browser: ${target} changes frozen product output`, async ({ page }) => {
    await proveSlider(page, target);
  });
}

test("browser: ice.icicleUnderside changes frozen product output", async ({
  page,
}) => {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  const selectSourceMode = (label: "3D" | "Image") =>
    session.controlAction("source.mode", async (sourceModeControl) => {
      const item = sourceModeControl
        .locator('[data-slot="toggle-group-item"]')
        .filter({ hasText: label });
      if ((await item.getAttribute("aria-pressed")) !== "true") await item.click();
    });
  await expectToolcraftConditionalControlVisibility(
    session,
    selectSourceMode("Image"),
    selectSourceMode("3D"),
    {
      requirementId: "ice.icicleUnderside",
      target: "ice.icicleUnderside",
      timeoutMs: 15_000,
    },
  );
  const control = await getToolcraftControlFieldByTarget(page, "source.model");
  const variedUndersideObj = [
    "v -1 0 -1",
    "v 1 0 -1",
    "v 0 0 1",
    "v -1 -1 -1",
    "v 1 -1 -1",
    "v 0 3 1",
    "f 1 2 3",
    "f 4 5 6",
  ].join("\n");
  await control.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(variedUndersideObj),
    mimeType: "text/plain",
    name: "varied-underside.obj",
  });
  const canvas = page.locator(frozenCanvasSelector);
  await expect(canvas).toHaveAttribute("data-model-status", "ready", {
    timeout: 15_000,
  });
  const progress = await getToolcraftControlFieldByTarget(page, "effect.progress");
  await progress.locator('input[type="range"]').fill("48");
  const density = await getToolcraftControlFieldByTarget(page, "ice.icicleDensity");
  await density.locator('input[type="range"]').fill("100");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-icicle-count")))
    .toBeGreaterThan(100);
  const lowThresholdCount = Number(await canvas.getAttribute("data-icicle-count"));
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("ice.icicleUnderside", (currentControl, currentPage) =>
      dragFrozenSlider(currentControl, currentPage, 0.9),
    ),
    {
      requirementId: "ice.icicleUnderside",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-icicle-count")))
    .toBeLessThan(lowThresholdCount);
});
