import { expect, test } from "@playwright/test";

import { deriveToolcraftPerformancePaths } from "@/toolcraft/runtime";

import { appPerformance } from "../src/app/app-performance";
import { appSchema } from "../src/app/app-schema";
import { appPerformancePathAdapters } from "./app-performance-path-adapters";
import {
  compileToolcraftPerformancePathAdapterMatrix,
  runToolcraftPerformancePath,
} from "./performance-path-helpers";
import { attachToolcraftPerformanceEnvironmentEvidence } from "./performance-environment-evidence";

const performancePathMatrix = compileToolcraftPerformancePathAdapterMatrix(
  deriveToolcraftPerformancePaths(appSchema, appPerformance),
  appPerformancePathAdapters,
);

test.setTimeout(180_000);

test("browser perf: toolcraft environment", async ({ page }) => {
  await page.goto("/");
  await attachToolcraftPerformanceEnvironmentEvidence(page);
});

for (const entry of performancePathMatrix) {
  test(entry.testName, async ({ page }) => {
    await runToolcraftPerformancePath(
      page,
      appSchema,
      appPerformance,
      entry,
    );
  });
}

test("browser perf: declared renderer layer selectors are present", async ({ page }) => {
  if (!appPerformance.usesCustomRenderer) {
    return;
  }

  const visibleLayers =
    appPerformance.rendererTechnique?.layers?.filter((layer) => layer.uiSelector) ?? [];

  await page.goto("/");

  for (const layer of visibleLayers) {
    await expect(
      page.locator(layer.uiSelector!).first(),
      `renderer layer "${layer.id}" should exist at ${layer.uiSelector}`,
    ).toBeVisible();
  }
});
