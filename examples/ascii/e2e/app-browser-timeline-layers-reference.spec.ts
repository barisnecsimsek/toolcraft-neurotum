import { expect, test } from "@playwright/test";

import { appTransferMode } from "../src/app/app-acceptance";
import {
  getLayerCoverageEntries,
  getReferenceCoverageEntry,
  getTimelineCoverageEntries,
} from "./browser-acceptance-selectors";
import {
  findNamedBrowserTestSource,
  hasLayerGroupTarget,
  hasProductObservableHelper,
  hasRealLayerDragInteraction,
  hasRealLayerRowInteraction,
  hasRealLayerVisibilityInteraction,
  readFallbackBrowserTestSources,
} from "./browser-test-source-helpers";

test("browser timeline coverage verifies the concrete timeline mode behavior", () => {
  const browserTestSources = readFallbackBrowserTestSources();

  for (const entry of getTimelineCoverageEntries("playback")) {
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

    expect(browserTestSource, `${entry.id} must test pause/play transport.`).toMatch(
      /Pause playback[\s\S]*Play playback|Play playback[\s\S]*Pause playback/,
    );
    expect(browserTestSource, `${entry.id} must test loop transport state.`).toMatch(
      /Disable loop[\s\S]*Enable loop|Enable loop[\s\S]*Disable loop/,
    );
  }

  for (const entry of getTimelineCoverageEntries("keyframes")) {
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

    expect(browserTestSource, `${entry.id} must open the expanded keyframe editor.`).toMatch(
      /Expand timeline panel|timeline\.setExpanded|timeline-expanded/,
    );
    expect(browserTestSource, `${entry.id} must create or update keyframe rows.`).toMatch(
      /Add .* keyframe|Disable .* keyframes|timeline-keyframe-row/,
    );
    expect(
      hasProductObservableHelper(browserTestSource),
      `${entry.id} must prove rendered keyframe output through the shared product observable helper.`,
    ).toBe(true);
  }
});

test("browser layer coverage verifies concrete layer behavior", () => {
  const layerEntries = getLayerCoverageEntries();
  if (layerEntries.length === 0) {
    return;
  }

  const browserTestSources = readFallbackBrowserTestSources();

  for (const entry of layerEntries) {
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

    switch (entry.layerCoverage) {
      case "selection":
        expect(
          hasRealLayerRowInteraction(browserTestSource),
          `${entry.id} must select a real LayersPanel row, not dispatch layers.select directly.`,
        ).toBe(true);
        break;
      case "visibility":
        expect(
          hasRealLayerRowInteraction(browserTestSource),
          `${entry.id} must locate the real layer row before toggling visibility.`,
        ).toBe(true);
        expect(
          hasRealLayerVisibilityInteraction(browserTestSource),
          `${entry.id} must toggle a real layer visibility button.`,
        ).toBe(true);
        break;
      case "reorder":
        expect(
          hasRealLayerRowInteraction(browserTestSource),
          `${entry.id} must locate real layer rows before reorder.`,
        ).toBe(true);
        expect(
          hasRealLayerDragInteraction(browserTestSource),
          `${entry.id} must drag real layer rows instead of dispatching layers.reorder.`,
        ).toBe(true);
        break;
      case "grouping":
        expect(
          hasRealLayerRowInteraction(browserTestSource),
          `${entry.id} must locate real layer rows before grouping.`,
        ).toBe(true);
        expect(
          hasRealLayerDragInteraction(browserTestSource),
          `${entry.id} must drag a real layer row into a group.`,
        ).toBe(true);
        expect(
          hasLayerGroupTarget(browserTestSource),
          `${entry.id} must use a real group row as the drop target.`,
        ).toBe(true);
        break;
      case "selected-layer-controls":
        expect(
          hasRealLayerRowInteraction(browserTestSource),
          `${entry.id} must prove controls edit the selected layer output.`,
        ).toBe(true);
        expect(
          hasProductObservableHelper(browserTestSource),
          `${entry.id} must assert a product output or rendered-pixel change.`,
        ).toBe(true);
        break;
      case "media-lifecycle":
        expect(browserTestSource, `${entry.id} must test layer media lifecycle.`).toMatch(
          /media\.import|media\.delete|upload|delete|remove/i,
        );
        break;
    }
  }
});

test("browser reference-runtime-clone coverage proves reference parity behavior", () => {
  if (appTransferMode.mode !== "reference-runtime-clone") {
    return;
  }

  const browserTestSources = readFallbackBrowserTestSources();

  for (const coverage of appTransferMode.behaviorCoverage) {
    const entry = getReferenceCoverageEntry(coverage);

    expect(
      entry,
      `reference-runtime-clone behavior "${coverage}" must have an acceptance entry.`,
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
      `${entry.id} must be backed by browser test "${entry.browserTestName}".`,
    ).toBeDefined();

    if (!browserTestSource) {
      continue;
    }

    expect(
      browserTestSource,
      `${entry.id} must compare against reference runtime behavior, not only assert that Toolcraft state changed.`,
    ).toMatch(/reference|baseline|parity|sourceOfTruth|legacy|cadence|lifetime|spawn/i);
  }
});
