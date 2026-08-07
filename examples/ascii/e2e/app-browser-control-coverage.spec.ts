import { expect, test } from "@playwright/test";

import {
  getCanvasHandleEntries,
  getCompoundPartControls,
  getDiscreteSliderControls,
  getSegmentedControls,
  requiresProductObservableProof,
} from "./browser-acceptance-selectors";
import {
  escapeRegExp,
  findNamedBrowserTestSource,
  hasProductObservableHelper,
  readFallbackBrowserTestSources,
} from "./browser-test-source-helpers";
import { expectToolcraftSegmentedControlCellsPreservePadding } from "./performance-helpers";
import {
  getRequiredToolcraftControlPartCoverage,
  appAcceptance,
} from "../src/app/app-acceptance";

test("browser acceptance matrix points at real fallback Playwright tests", () => {
  const browserTestSources = readFallbackBrowserTestSources();

  for (const entry of appAcceptance) {
    if (!entry.browser) {
      continue;
    }

    expect(
      Boolean(findNamedBrowserTestSource(browserTestSources, entry.browserTestName)),
      `${entry.id} must be backed by a fallback Playwright test named "${entry.browserTestName}".`,
    ).toBe(true);
  }
});

test("browser product-output rows use the shared product observable helper", () => {
  const browserTestSources = readFallbackBrowserTestSources();

  for (const entry of appAcceptance) {
    if (!entry.browser || !requiresProductObservableProof(entry)) {
      continue;
    }

    const browserTestSource = findNamedBrowserTestSource(
      browserTestSources,
      entry.browserTestName,
    );

    expect(
      browserTestSource,
      `${entry.id} must be backed by browser test "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!browserTestSource) {
      continue;
    }

    expect(
      hasProductObservableHelper(browserTestSource),
      `${entry.id} must use expectToolcraftProductObservableToChange or getToolcraftProductObservableSnapshot so the test proves real product output changed.`,
    ).toBe(true);
  }
});

test("browser canvas handle entries use handle helpers and no forbidden canvas UI check", () => {
  const handleEntries = getCanvasHandleEntries();
  if (handleEntries.length === 0) {
    return;
  }

  const browserTestSources = readFallbackBrowserTestSources();

  for (const entry of handleEntries) {
    const browserTestSource = findNamedBrowserTestSource(
      browserTestSources,
      entry.browserTestName,
    );

    expect(
      browserTestSource,
      `${entry.id} must be backed by a fallback Playwright test named "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!browserTestSource) {
      continue;
    }

    expect(
      browserTestSource,
      `${entry.id} must drag its declared canvas handle "${entry.canvasHandle?.testId}".`,
    ).toMatch(
      new RegExp(
        `dragCanvasHandle\\s*\\([\\s\\S]*?(["'\`])${escapeRegExp(
          entry.canvasHandle?.testId ?? "",
        )}\\1`,
      ),
    );

    expect(
      browserTestSource,
      `${entry.id} must verify canvas contains no forbidden app UI.`,
    ).toMatch(/expectNoForbiddenCanvasUi\s*\(/);

    expect(
      browserTestSource,
      `${entry.id} must verify canvas handles stay in the Toolcraft visual language.`,
    ).toMatch(/expectCanvasHandlesUseToolcraftVisualLanguage\s*\(/);

    expect(
      browserTestSource,
      `${entry.id} must verify the handle is excluded from export or copied output.`,
    ).toContain(entry.canvasHandle?.exportCleanTestName ?? "");

    expect(
      browserTestSource,
      `${entry.id} must use expectExportExcludesCanvasHandles for export-clean coverage.`,
    ).toMatch(/expectExportExcludesCanvasHandles\s*\(/);
  }
});

test("browser discrete slider entries verify Toolcraft variant and markers", () => {
  const discreteControls = getDiscreteSliderControls();
  if (discreteControls.length === 0) {
    return;
  }

  const browserTestSources = readFallbackBrowserTestSources();

  for (const { control, shouldRenderMarkers } of discreteControls) {
    const entry = appAcceptance.find(
      (acceptanceEntry) =>
        acceptanceEntry.kind === "control" && acceptanceEntry.target === control.target,
    );

    expect(
      entry,
      `${control.target} must have acceptance coverage before its discrete slider browser test can be checked.`,
    ).toBeDefined();

    if (!entry) {
      continue;
    }

    const browserTestSource = findNamedBrowserTestSource(
      browserTestSources,
      entry.browserTestName,
    );

    expect(
      browserTestSource,
      `${control.target} must be backed by browser test "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!browserTestSource) {
      continue;
    }

    expect(
      browserTestSource,
      `${control.target} discrete browser test must assert the Toolcraft discrete variant.`,
    ).toMatch(/data-variant/);

    expect(
      browserTestSource,
      `${control.target} discrete browser test must assert the expected discrete variant value.`,
    ).toMatch(/discrete/);

    if (shouldRenderMarkers) {
      expect(
        browserTestSource,
        `${control.target} discrete browser test must assert hover markers render.`,
      ).toMatch(/slider-marker/);
    } else {
      expect(
        browserTestSource,
        `${control.target} half-width over-budget discrete browser test must assert markers are intentionally hidden.`,
      ).toMatch(/expectMarkers\s*:\s*false|toHaveCount\s*\(\s*0\s*\)/);
    }

    expect(
      browserTestSource,
      `${control.target} discrete browser test must verify smooth drag with the Toolcraft helper.`,
    ).toMatch(/expectToolcraftDiscreteSliderDragSmoothness\s*\(/);
  }
});

test("browser segmented entries verify cell padding and no label collisions", () => {
  const segmentedControls = getSegmentedControls();
  if (segmentedControls.length === 0) {
    return;
  }

  const browserTestSources = readFallbackBrowserTestSources();

  for (const control of segmentedControls) {
    const entry = appAcceptance.find(
      (acceptanceEntry) =>
        acceptanceEntry.kind === "control" && acceptanceEntry.target === control.target,
    );

    expect(
      entry,
      `${control.target} must have acceptance coverage before its segmented browser test can be checked.`,
    ).toBeDefined();

    if (!entry) {
      continue;
    }

    const browserTestSource = findNamedBrowserTestSource(
      browserTestSources,
      entry.browserTestName,
    );

    expect(
      browserTestSource,
      `${control.target} must be backed by browser test "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!browserTestSource) {
      continue;
    }

    expect(
      browserTestSource,
      `${control.target} segmented browser test must verify cell padding and label collisions.`,
    ).toMatch(/expectToolcraftSegmentedControlCellsPreservePadding\s*\(/);
  }
});

test("browser compound control entries name every required value part", () => {
  const compoundControls = getCompoundPartControls();
  if (compoundControls.length === 0) {
    return;
  }

  const browserTestSources = readFallbackBrowserTestSources();

  for (const control of compoundControls) {
    const requiredParts = getRequiredToolcraftControlPartCoverage(control);
    const entry = appAcceptance.find(
      (acceptanceEntry) =>
        acceptanceEntry.kind === "control" && acceptanceEntry.target === control.target,
    );

    expect(
      entry,
      `${control.target} must have acceptance coverage before its compound browser test can be checked.`,
    ).toBeDefined();

    if (!entry) {
      continue;
    }

    expect(
      entry.controlPartCoverage === "all-visible-parts" ||
        requiredParts.every((part) => entry.controlPartCoverage?.includes(part)),
      `${control.target} acceptance must declare controlPartCoverage for ${requiredParts.join(", ")}.`,
    ).toBe(true);

    const browserTestSource = findNamedBrowserTestSource(
      browserTestSources,
      entry.browserTestName,
    );

    expect(
      browserTestSource,
      `${control.target} must be backed by browser test "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!browserTestSource) {
      continue;
    }

    for (const part of requiredParts) {
      expect(
        browserTestSource,
        `${control.target} browser test must explicitly exercise value part "${part}".`,
      ).toContain(part);
    }
  }
});

test("segmented layout helper catches paddingless or colliding cells", async ({ page }) => {
  await page.setContent(`
    <div data-slot="field">FX Preset
      <div data-slot="toggle-group" style="display:flex;width:360px;">
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:120px;padding:0 12px;">One</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:120px;padding:0 12px;">Two</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:120px;padding:0 12px;">Off</button>
      </div>
    </div>
  `);

  await expectToolcraftSegmentedControlCellsPreservePadding(page, "FX Preset");

  await page.setContent(`
    <div data-slot="field">FX Preset
      <div data-slot="toggle-group" style="display:flex;width:180px;">
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:60px;padding:0;">Full Stack</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:60px;padding:0;">RGB Split</button>
        <button data-slot="toggle-group-item" style="box-sizing:border-box;width:60px;padding:0;">Lines</button>
      </div>
    </div>
  `);

  await expect(
    expectToolcraftSegmentedControlCellsPreservePadding(page, "FX Preset"),
  ).rejects.toThrow(/must preserve cell padding/);
});
