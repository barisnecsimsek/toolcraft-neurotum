import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-conditional-output-evidence-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { createToolcraftBrowserProofSession } from "./browser-proof-session";
import {
  expectToolcraftCompoundControlPartOutcome,
  expectToolcraftPersistenceState,
} from "./browser-state-evidence-helpers";
import { expectExportExcludesCanvasHandles } from "./canvas-handle-helpers";
import {
  downloadFrozenImage,
  frozenOutputSelector,
  inspectFrozenImage,
  openFrozen,
  selectFrozenOption,
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

test("browser: scratch.invert changes frozen product output", async ({ page }) => {
  const session = await createFrozenSession(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("scratch.invert", (control) => toggleFrozenSwitch(control)),
    {
      requirementId: "scratch.invert",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
});

test("browser: scratch.offset changes frozen product output", async ({ page }) => {
  const session = await createFrozenSession(page);
  const offset = session.observe((root) => {
    const output = root.querySelector<HTMLElement>(
      '[data-slot="frozen-product-output"]',
    );
    return {
      x: Number(output?.dataset.scratchOffsetX ?? 0),
      y: Number(output?.dataset.scratchOffsetY ?? 0),
    };
  });
  const setOffset = async (
    control: Awaited<ReturnType<typeof getToolcraftControlFieldByTarget>>,
    value: string,
  ) => {
    const edit = control.getByRole("button", { name: "Edit Offset value" });
    await edit.scrollIntoViewIfNeeded();
    await edit.click();
    const editor = control.getByRole("textbox", { name: "Offset value" });
    await editor.fill(value);
    await editor.press("Enter");
  };
  await expectToolcraftCompoundControlPartOutcome(
    offset,
    session.controlAction("scratch.offset", (control) => setOffset(control, "0.5, 0")),
    { x: 0.5, y: 0 },
    { part: "vector.x", requirementId: "scratch.offset", timeoutMs: 15_000 },
  );
  await expectToolcraftCompoundControlPartOutcome(
    offset,
    session.controlAction("scratch.offset", (control) =>
      setOffset(control, "0.5, -0.5"),
    ),
    { x: 0.5, y: -0.5 },
    { part: "vector.y", requirementId: "scratch.offset", timeoutMs: 15_000 },
  );
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("scratch.offset", (control) =>
      setOffset(control, "-0.65, 0.7"),
    ),
    {
      requirementId: "scratch.offset",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
});

test(
  "browser: background inclusion controls preview and PNG transparency",
  async ({ page }) => {
    const session = await createFrozenSession(page);
    const preview = session.observe((root) => {
      const output = root.querySelector<HTMLElement>(
        '[data-slot="frozen-product-output"]',
      );
      return {
        backgroundVisible: output?.dataset.includeBackground === "true",
        outputSignature: output?.dataset.includeBackground ?? "missing",
      };
    });
    await expectToolcraftBackgroundOutputSemantics(
      preview,
      session.controlAction("export.includeBackground", (control) =>
        toggleFrozenSwitch(control),
      ),
      { backgroundVisible: false, outputSignature: "false" },
      session.controlAction("actions.output", () => downloadFrozenImage(page)),
      (artifact) => inspectFrozenImage(page, artifact),
      { requirementId: "export.includeBackground", timeoutMs: 15_000 },
    );
  },
);

test("browser: scene.background changes frozen product output", async ({ page }) => {
  const session = await createFrozenSession(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("scene.background", (control) =>
      setFrozenColor(control, "Background", "#AA2200"),
    ),
    {
      requirementId: "scene.background",
      selector: frozenOutputSelector,
      timeoutMs: 15_000,
    },
  );
});

test("browser: image export format selects PNG or JPG", async ({ page }) => {
  const session = await createFrozenSession(page);
  await expectToolcraftExportedArtifact(
    session.controlAction("export.image.format", async (control, currentPage) => {
      await selectFrozenOption(control, currentPage, "JPG");
      const jpg = await downloadFrozenImage(currentPage);
      await selectFrozenOption(control, currentPage, "PNG");
      const png = await downloadFrozenImage(currentPage);
      return [jpg, png] as const;
    }),
    async ([jpg, png]) => {
      const inspections = await Promise.all([
        inspectFrozenImage(page, jpg),
        inspectFrozenImage(page, png),
      ]);
      expect(inspections.map((inspection) => inspection.mediaType)).toEqual([
        "image/jpeg",
        "image/png",
      ]);
      return inspections;
    },
    { requirementId: "export.image.format" },
  );
});

test(
  "browser: image export resolution changes exported dimensions",
  async ({ page }) => {
    const session = await createFrozenSession(page);
    await expectToolcraftExportedArtifact(
      session.controlAction(
        "export.image.resolution",
        async (control, currentPage) => {
          await selectFrozenOption(control, currentPage, "2K");
          const twoK = await downloadFrozenImage(currentPage);
          await selectFrozenOption(control, currentPage, "4K");
          const fourK = await downloadFrozenImage(currentPage);
          await selectFrozenOption(control, currentPage, "8K");
          const eightK = await downloadFrozenImage(currentPage);
          return [twoK, fourK, eightK] as const;
        },
      ),
      async ([twoK, fourK, eightK]) => {
        const inspections = await Promise.all([
          inspectFrozenImage(page, twoK),
          inspectFrozenImage(page, fourK),
          inspectFrozenImage(page, eightK),
        ]);
        expect(inspections.map((inspection) => inspection.width)).toEqual([
          2048, 4096, 8192,
        ]);
        return inspections;
      },
      { requirementId: "export.image.resolution" },
    );
  },
);

test("browser: export PNG produces frozen product image bytes", async ({ page }) => {
  const session = await createFrozenSession(page);
  await expectToolcraftExportedArtifact(
    session.controlAction("actions.output", () => downloadFrozenImage(page)),
    async (artifact) => {
      const inspection = await inspectFrozenImage(page, artifact);
      expect(inspection.byteLength).toBeGreaterThan(1024);
      return inspection;
    },
    { requirementId: "actions.output" },
  );
});

test("export excludes orientation gizmo", async ({ page }) => {
  await createFrozenSession(page);
  const meltControl = await getToolcraftControlFieldByTarget(page, "melt.enabled");
  if (
    (await meltControl.getByRole("switch").getAttribute("aria-checked")) ===
    "true"
  ) {
    await toggleFrozenSwitch(meltControl);
  }
  await expectExportExcludesCanvasHandles(
    page,
    () => downloadFrozenImage(page),
    (artifact) => inspectFrozenImage(page, artifact),
    {
      requirementId: "scene.orientation#export-clean",
      target: "scene.orientation",
    },
  );
});

test("browser: frozen settings restore after browser reload", async ({ page }) => {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  const persisted = session.observe((root) => {
    const output = root.querySelector<HTMLElement>(
      '[data-slot="frozen-product-output"]',
    );
    return {
      iceColor: output?.dataset.iceColor ?? "missing",
      modelLabel:
        root.querySelector<HTMLCanvasElement>('[data-slot="frozen-webgl-canvas"]')
          ?.dataset.modelLabel ?? "missing",
      progress: output?.dataset.frozenProgress ?? "missing",
      scratchLabel:
        root.querySelector<HTMLCanvasElement>('[data-slot="frozen-webgl-canvas"]')
          ?.dataset.scratchLabel ?? "missing",
    };
  });
  const mutate = session.controlAction("effect.progress", async (control, currentPage) => {
    await control.locator('input[type="range"]').fill("67");
    const tint = await getToolcraftControlFieldByTarget(currentPage, "ice.color");
    await setFrozenColor(tint, "Tint", "#44AAFF");
    await uploadFrozenObj(currentPage);
  });
  await expectToolcraftPersistenceState(
    persisted,
    mutate,
    session.reload(),
    {
      iceColor: "#44AAFF",
      modelLabel: "asymmetric-tetrahedron.obj",
      progress: "0.67",
      scratchLabel: "Black Painted Wall Texture.jpg",
    },
    { requirementId: "persistence.reload", timeoutMs: 15_000 },
  );
});
