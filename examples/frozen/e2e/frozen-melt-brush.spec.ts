import { expectToolcraftConditionalControlVisibility } from "./browser-conditional-output-evidence-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import {
  createToolcraftBrowserProofSession,
  type ToolcraftBrowserProofSession,
} from "./browser-proof-session";
import {
  frozenCanvasSelector,
  frozenOutputSelector,
  openFrozen,
  toggleFrozenSwitch,
  uploadFrozenObj,
} from "./frozen-test-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding } from "./performance-control-layout-helpers";
import { expect, test, type Page } from "./toolcraft-product-test";

test.setTimeout(120_000);

async function setRange(page: Page, target: string, value: number): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, target);
  await control.locator('input[type="range"]').fill(String(value));
}

async function enableMelt(page: Page): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(page, "melt.enabled");
  const toggle = control.getByRole("switch");
  if ((await toggle.getAttribute("aria-checked")) !== "true") {
    await toggleFrozenSwitch(control);
  }
  await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
    "data-melt-enabled",
    "true",
  );
}

async function createMeltSession(
  page: Page,
): Promise<ToolcraftBrowserProofSession> {
  await openFrozen(page);
  const session = await createToolcraftBrowserProofSession(page);
  await uploadFrozenObj(page);
  await enableMelt(page);
  await setRange(page, "melt.refreeze", 0);
  return session;
}

async function proveMeltControlVisibility(
  page: Page,
  session: ToolcraftBrowserProofSession,
  target: string,
): Promise<void> {
  await expectToolcraftConditionalControlVisibility(
    session,
    session.controlAction("melt.enabled", (control) =>
      toggleFrozenSwitch(control),
    ),
    session.controlAction("melt.enabled", (control) =>
      toggleFrozenSwitch(control),
    ),
    { requirementId: target, target, timeoutMs: 15_000 },
  );
}

async function selectRefreezeMode(
  page: Page,
  label: "Drawing" | "Release",
): Promise<void> {
  const control = await getToolcraftControlFieldByTarget(
    page,
    "melt.refreezeMode",
  );
  const item = control
    .locator('[data-slot="toggle-group-item"]')
    .filter({ hasText: label });
  await expect(item).toHaveCount(1);
  if ((await item.getAttribute("aria-pressed")) !== "true") {
    await item.click();
  }
  await expect(page.locator(frozenOutputSelector)).toHaveAttribute(
    "data-melt-refreeze-mode",
    label === "Drawing" ? "during-stroke" : "after-release",
  );
}

async function getCanvasPoint(
  page: Page,
  xRatio = 0.5,
  yRatio = 0.5,
): Promise<{ x: number; y: number }> {
  const bounds = await page.locator(frozenCanvasSelector).boundingBox();
  expect(bounds).not.toBeNull();
  return {
    x: bounds!.x + bounds!.width * xRatio,
    y: bounds!.y + bounds!.height * yRatio,
  };
}

async function paintStroke(
  page: Page,
  fromRatio = 0.47,
  toRatio = 0.57,
): Promise<void> {
  const from = await getCanvasPoint(page, fromRatio, 0.5);
  const to = await getCanvasPoint(page, toRatio, 0.53);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        Number(
          await page
            .locator(frozenCanvasSelector)
            .getAttribute("data-melt-maximum"),
        ),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0.2);
}

async function expectMeltCursorCenteredAtPointer(
  page: Page,
  point: Readonly<{ x: number; y: number }>,
): Promise<number> {
  await page.mouse.move(point.x, point.y);
  const cursor = page.locator('[data-slot="frozen-melt-brush-cursor"]');
  await expect(cursor).toHaveAttribute("data-visible", "true");
  const bounds = await cursor.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.x + bounds!.width / 2 - point.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(bounds!.y + bounds!.height / 2 - point.y)).toBeLessThanOrEqual(2);
  return bounds!.width;
}

async function isMeltCursorVisibleAtPointer(
  page: Page,
  point: Readonly<{ x: number; y: number }>,
): Promise<boolean> {
  await page.mouse.move(point.x, point.y);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  return (
    (await page
      .locator('[data-slot="frozen-melt-brush-cursor"]')
      .getAttribute("data-visible")) === "true"
  );
}

async function findRightMeltContactBoundary(
  page: Page,
): Promise<Readonly<{ x: number; y: number }>> {
  const center = await getCanvasPoint(page);
  const far = await getCanvasPoint(page, 0.95, 0.5);
  expect(await isMeltCursorVisibleAtPointer(page, center)).toBe(true);
  expect(await isMeltCursorVisibleAtPointer(page, far)).toBe(false);
  let visibleX = center.x;
  let hiddenX = far.x;
  for (let iteration = 0; iteration < 9; iteration += 1) {
    const candidateX = (visibleX + hiddenX) / 2;
    if (
      await isMeltCursorVisibleAtPointer(page, { x: candidateX, y: center.y })
    ) {
      visibleX = candidateX;
    } else {
      hiddenX = candidateX;
    }
  }
  return { x: visibleX, y: center.y };
}

test("browser: Melt brush locks model orbit and reveals settings", async ({
  page,
}) => {
  await openFrozen(page);
  await uploadFrozenObj(page);
  const meltControl = await getToolcraftControlFieldByTarget(
    page,
    "melt.enabled",
  );
  if (
    (await meltControl.getByRole("switch").getAttribute("aria-checked")) ===
    "true"
  ) {
    await toggleFrozenSwitch(meltControl);
  }
  const session = await createToolcraftBrowserProofSession(page);
  const output = page.locator(frozenOutputSelector);
  const orientation = await output.getAttribute("data-orientation");
  const point = await getCanvasPoint(page);

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.enabled", async (control, currentPage) => {
      await toggleFrozenSwitch(control);
      await currentPage.mouse.move(point.x, point.y);
    }),
    { requirementId: "melt.enabled", selector: frozenOutputSelector, timeoutMs: 20_000 },
  );
  await expect(
    getToolcraftControlFieldByTarget(page, "melt.heat"),
  ).resolves.toBeDefined();
  await expect(page.getByTestId("toolcraft-orientation-gizmo")).toHaveCount(0);

  await page.keyboard.press("KeyM");
  await expect(output).toHaveAttribute("data-melt-enabled", "false");
  await expect(page.getByTestId("toolcraft-orientation-gizmo")).toHaveCount(1);
  await expect(
    page.locator('[data-toolcraft-control-target="melt.heat"]'),
  ).toHaveCount(0);

  await page.keyboard.press("KeyM");
  await expect(output).toHaveAttribute("data-melt-enabled", "true");
  await expect(page.getByTestId("toolcraft-orientation-gizmo")).toHaveCount(0);
  const heatControl = await getToolcraftControlFieldByTarget(page, "melt.heat");
  await heatControl.locator('input[type="range"]').focus();
  await page.keyboard.press("KeyM");
  await expect(output).toHaveAttribute("data-melt-enabled", "true");

  await paintStroke(page);
  expect(await output.getAttribute("data-orientation")).toBe(orientation);
});

test("browser: Heat changes melt strength", async ({ page }) => {
  const session = await createMeltSession(page);
  await proveMeltControlVisibility(page, session, "melt.heat");
  await setRange(page, "melt.heat", 18);
  await paintStroke(page, 0.49, 0.51);
  const lowMaximum = Number(
    await page.locator(frozenCanvasSelector).getAttribute("data-melt-maximum"),
  );
  await page.getByRole("button", { name: "Refreeze", exact: true }).click();

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.heat", async (control, currentPage) => {
      await control.locator('input[type="range"]').fill("100");
      await paintStroke(currentPage, 0.49, 0.51);
    }),
    { requirementId: "melt.heat", selector: frozenOutputSelector, timeoutMs: 20_000 },
  );
  const highMaximum = Number(
    await page.locator(frozenCanvasSelector).getAttribute("data-melt-maximum"),
  );
  expect(highMaximum).toBeGreaterThan(lowMaximum);
});

test("browser: Radius changes melt footprint", async ({ page }) => {
  const session = await createMeltSession(page);
  await proveMeltControlVisibility(page, session, "melt.radius");
  await setRange(page, "melt.radius", 8);
  const point = await getCanvasPoint(page);
  const cursor = page.locator('[data-slot="frozen-melt-brush-cursor"]');
  const smallWidth = await expectMeltCursorCenteredAtPointer(page, point);

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.radius", async (control) => {
      await control.locator('input[type="range"]').fill("80");
      await page.mouse.move(point.x + 1, point.y);
      await paintStroke(page, 0.49, 0.54);
    }),
    { requirementId: "melt.radius", selector: frozenOutputSelector, timeoutMs: 20_000 },
  );
  expect((await cursor.boundingBox())?.width ?? 0).toBeGreaterThan(smallWidth * 2);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expectMeltCursorCenteredAtPointer(page, await getCanvasPoint(page));
});

test("browser: Structure changes melt edge breakup", async ({ page }) => {
  const session = await createMeltSession(page);
  await proveMeltControlVisibility(page, session, "melt.structure");
  await paintStroke(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.structure", async (control) => {
      await control.locator('input[type="range"]').fill("0");
    }),
    {
      requirementId: "melt.structure",
      selector: frozenOutputSelector,
      timeoutMs: 20_000,
    },
  );
});

test("browser: Refreeze cools painted heat over time", async ({ page }) => {
  const session = await createMeltSession(page);
  await proveMeltControlVisibility(page, session, "melt.refreeze");
  await paintStroke(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.refreeze", async (control) => {
      await control.locator('input[type="range"]').fill("100");
      await expect
        .poll(
          async () =>
            Number(
              await page
                .locator(frozenCanvasSelector)
                .getAttribute("data-melt-maximum"),
            ),
          { timeout: 30_000 },
        )
        .toBeLessThan(0.01);
    }),
    {
      requirementId: "melt.refreeze",
      selector: frozenOutputSelector,
      timeoutMs: 35_000,
    },
  );
});

test("browser: Refreeze mode controls cooling start time", async ({ page }) => {
  const session = await createMeltSession(page);
  await proveMeltControlVisibility(page, session, "melt.refreezeMode");
  await expectToolcraftSegmentedControlCellsPreservePadding(
    page,
    "Refreeze mode",
    { requirementId: "melt.refreezeMode", target: "melt.refreezeMode" },
  );
  await setRange(page, "melt.refreeze", 100);
  await selectRefreezeMode(page, "Release");

  const canvas = page.locator(frozenCanvasSelector);
  const point = await getCanvasPoint(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-melt-maximum")),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.25);
  const heldReleaseMaximum = Number(
    await canvas.getAttribute("data-melt-maximum"),
  );
  await page.waitForTimeout(600);
  expect(Number(await canvas.getAttribute("data-melt-maximum"))).toBeCloseTo(
    heldReleaseMaximum,
    3,
  );
  await page.mouse.up();
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-melt-maximum")),
      { timeout: 10_000 },
    )
    .toBeLessThan(heldReleaseMaximum * 0.55);

  await page.getByRole("button", { name: "Refreeze", exact: true }).click();
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.refreezeMode", async () => {
      await selectRefreezeMode(page, "Drawing");
    }),
    {
      requirementId: "melt.refreezeMode",
      selector: frozenOutputSelector,
      timeoutMs: 20_000,
    },
  );
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-melt-maximum")),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.25);
  const heldDrawingMaximum = Number(
    await canvas.getAttribute("data-melt-maximum"),
  );
  await expect
    .poll(
      async () => Number(await canvas.getAttribute("data-melt-maximum")),
      { timeout: 10_000 },
    )
    .toBeLessThan(heldDrawingMaximum * 0.55);
  await page.mouse.up();
});

test("browser: Refreeze action clears painted melt", async ({ page }) => {
  const session = await createMeltSession(page);
  await proveMeltControlVisibility(page, session, "melt.action");
  await paintStroke(page);
  const canvas = page.locator(frozenCanvasSelector);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.action", async (control) => {
      await control.getByRole("button", { name: "Refreeze", exact: true }).click();
    }),
    { requirementId: "melt.action", selector: frozenOutputSelector, timeoutMs: 20_000 },
  );
  expect(Number(await canvas.getAttribute("data-melt-maximum"))).toBe(0);
});

test("browser: geometry drag paints a continuous thermal reveal", async ({
  page,
}) => {
  const session = await createMeltSession(page);
  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.enabled", async () => paintStroke(page, 0.49, 0.6)),
    { requirementId: "melt.paint", selector: frozenOutputSelector, timeoutMs: 25_000 },
  );
  const canvas = page.locator(frozenCanvasSelector);
  const beforeMiss = Number(await canvas.getAttribute("data-melt-maximum"));
  const miss = await getCanvasPoint(page, 0.12, 0.15);
  await page.mouse.move(miss.x, miss.y);
  await page.mouse.down();
  await page.mouse.move(miss.x + 50, miss.y + 30, { steps: 4 });
  await page.mouse.up();
  expect(Number(await canvas.getAttribute("data-melt-maximum"))).toBe(beforeMiss);
});

test("browser: brush fringe melts the intersecting object edge", async ({
  page,
}) => {
  const session = await createMeltSession(page);
  await setRange(page, "melt.radius", 1);
  const minimumBoundary = await findRightMeltContactBoundary(page);
  const fringePoint = {
    x: minimumBoundary.x + 18,
    y: minimumBoundary.y,
  };
  expect(await isMeltCursorVisibleAtPointer(page, fringePoint)).toBe(false);

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction("melt.enabled", async () => {
      await setRange(page, "melt.radius", 100);
      expect(await isMeltCursorVisibleAtPointer(page, fringePoint)).toBe(true);
      await expectMeltCursorCenteredAtPointer(page, fringePoint);
      await page.mouse.down();
      await page.mouse.up();
    }),
    {
      requirementId: "melt.edge-overlap",
      selector: frozenOutputSelector,
      timeoutMs: 25_000,
    },
  );
  const canvas = page.locator(frozenCanvasSelector);
  expect(Number(await canvas.getAttribute("data-melt-maximum"))).toBeGreaterThan(
    0.05,
  );
  const beforeMiss = Number(await canvas.getAttribute("data-melt-maximum"));
  const farMiss = await getCanvasPoint(page, 0.96, 0.12);
  expect(await isMeltCursorVisibleAtPointer(page, farMiss)).toBe(false);
  await page.mouse.down();
  await page.mouse.up();
  expect(Number(await canvas.getAttribute("data-melt-maximum"))).toBe(beforeMiss);
});
