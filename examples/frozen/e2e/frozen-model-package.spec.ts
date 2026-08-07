import { zipSync } from "fflate";

import { expectToolcraftConditionalControlVisibility } from "./browser-conditional-output-evidence-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";
import { expectToolcraftMediaLifecycle } from "./browser-state-evidence-helpers";
import { createFrozenStlBuffer } from "./frozen-model-performance-fixtures";
import {
  frozenCanvasSelector,
  openFrozen,
  uploadFrozenObj,
} from "./frozen-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test.setTimeout(60_000);

function createTexturedObjPackage(): Buffer {
  const encoder = new TextEncoder();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=",
    "base64",
  );
  return Buffer.from(
    zipSync({
      "model/model.mtl": encoder.encode(
        ["newmtl skin", "Kd 1 1 1", "map_Kd ../textures/albedo.png"].join("\n"),
      ),
      "model/model.obj": encoder.encode(
        [
          "mtllib model.mtl",
          "v 0 1 0",
          "v -1 -1 1",
          "v 1 -1 1",
          "v 0 -1 -1",
          "vt 0.5 1",
          "vt 0 0",
          "vt 1 0",
          "usemtl skin",
          "f 1/1 2/2 3/3",
          "f 1/1 3/3 4/2",
          "f 1/1 4/2 2/3",
          "f 2/2 4/1 3/3",
        ].join("\n"),
      ),
      "textures/albedo.png": png,
    }),
  );
}

async function selectModelSource(
  control: import("@playwright/test").Locator,
): Promise<void> {
  const item = control
    .locator('[data-slot="toggle-group-item"]')
    .filter({ hasText: "3D" });
  if ((await item.getAttribute("aria-pressed")) !== "true") await item.click();
}

test("browser: source model upload clear and reset drive the WebGL scene", async ({
  page,
}) => {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  await expectToolcraftConditionalControlVisibility(
    session,
    session.controlAction("source.mode", async (control) => {
      await control
        .locator('[data-slot="toggle-group-item"]')
        .filter({ hasText: "Image" })
        .click();
    }),
    session.controlAction("source.mode", selectModelSource),
    { requirementId: "source.model", target: "source.model", timeoutMs: 15_000 },
  );
  await page
    .getByRole("button", { name: "Remove Night King optimized 28k.zip" })
    .click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-status",
    "empty",
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
        canvas?.dataset.triangleCount ?? "0",
        canvas?.dataset.modelTextureCount ?? "0",
      ].join(":"),
    };
  });
  const upload = session.controlAction("source.model", async (control) => {
    await control.locator('input[type="file"]').setInputFiles({
      buffer: createTexturedObjPackage(),
      mimeType: "application/zip",
      name: "textured-model.zip",
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
    { itemIds: ["textured-model.zip"], outputSignature: "ready:4:1" },
    { requirementId: "source.model", timeoutMs: 15_000 },
  );

  await page.getByRole("button", { name: "Remove textured-model.zip" }).click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-status",
    "empty",
  );
  await page.getByRole("button", { name: "Reset Source section" }).click();
  await expect(page.locator(frozenCanvasSelector)).toHaveAttribute(
    "data-model-label",
    "Night King optimized 28k.zip",
    { timeout: 30_000 },
  );
  await uploadFrozenObj(page);
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
});

test("browser: source model accepts 8550 triangles below the 30000 limit", async ({
  page,
}) => {
  await openFrozen(page);
  const budget = await getToolcraftControlFieldByTarget(
    page,
    "source.modelTriangleBudget",
  );
  await budget.locator('input[type="range"]').fill("30000");
  const control = await getToolcraftControlFieldByTarget(page, "source.model");
  await control.locator('input[type="file"]').setInputFiles({
    buffer: createFrozenStlBuffer(8_550),
    mimeType: "model/stl",
    name: "night-king-scale.stl",
  });

  const canvas = page.locator(frozenCanvasSelector);
  await expect(canvas).toHaveAttribute("data-model-status", "ready", {
    timeout: 30_000,
  });
  await expect(canvas).toHaveAttribute("data-triangle-count", "8550");
  await expect(canvas).toHaveAttribute("data-model-label", "night-king-scale.stl");
});

test("browser: source.modelTriangleBudget changes frozen product output", async ({
  page,
}) => {
  await openFrozen(page);
  const modelControl = await getToolcraftControlFieldByTarget(page, "source.model");
  await modelControl.locator('input[type="file"]').setInputFiles({
    buffer: createFrozenStlBuffer(8_550),
    mimeType: "model/stl",
    name: "mesh-budget.stl",
  });
  const canvas = page.locator(frozenCanvasSelector);
  await expect(canvas).toHaveAttribute("data-model-status", "ready", {
    timeout: 30_000,
  });
  await expect(canvas).toHaveAttribute(
    "data-model-original-triangle-count",
    "8550",
  );
  expect(Number(await canvas.getAttribute("data-model-render-triangle-count"))).toBeLessThan(
    8_550,
  );

  const beforeSourceId = await canvas.getAttribute("data-model-source-id");
  const budget = await getToolcraftControlFieldByTarget(
    page,
    "source.modelTriangleBudget",
  );
  await budget.locator('input[type="range"]').fill("30000");
  await expect
    .poll(() => canvas.getAttribute("data-model-source-id"), { timeout: 30_000 })
    .not.toBe(beforeSourceId);
  await expect(canvas).toHaveAttribute("data-model-render-triangle-count", "8550");
});
