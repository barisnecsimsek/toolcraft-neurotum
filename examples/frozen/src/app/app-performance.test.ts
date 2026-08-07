import { expect, test } from "vitest";

import { compileToolcraftPerformanceFixturePlan } from "@/toolcraft/runtime";

import { appPerformance, appPerformancePaths } from "./app-performance";

function expectScenario(id: string): void {
  const scenario = appPerformance.scenarios.find((candidate) => candidate.id === id);
  expect(scenario).toBeDefined();
  const path = appPerformancePaths.find(
    (candidate) => candidate.id === scenario?.pathId,
  );
  expect(path).toBeDefined();
  expect(scenario?.coversTargets).toEqual(path?.targets);
  if (path && path.workloadDimensions.length > 0) {
    const plan = compileToolcraftPerformanceFixturePlan(appPerformance, path);
    expect(plan.maximum.values).toEqual(
      expect.objectContaining(
        Object.fromEntries(
          path.workloadDimensions.map((dimensionId) => [
            dimensionId,
            expect.any(Number),
          ]),
        ),
      ),
    );
  }
}

test("perf: frozen model import completes within budget", () => {
  expectScenario("frozen-model-import");
  expect(
    appPerformance.workloadEnvelope.dimensions.find(
      (dimension) => dimension.id === "source-triangles",
    ),
  ).toEqual(
    expect.objectContaining({
      batchMax: 30_000,
      interactiveMax: 30_000,
    }),
  );
});

test("perf: model mesh budget drag stays responsive", () => {
  expectScenario("frozen-model-budget-drag");
  expect(
    appPerformance.workloadEnvelope.dimensions.find(
      (dimension) => dimension.id === "model-render-triangles",
    ),
  ).toEqual(
    expect.objectContaining({
      batchMax: 30_000,
      defaultValue: 30_000,
      interactiveMax: 30_000,
    }),
  );
});

test("perf: frozen scratch import completes within budget", () => {
  expectScenario("frozen-scratch-import");
});

test("perf: frozen image source import completes within budget", () => {
  expectScenario("frozen-image-source-import");
});

test("perf: thaw progress drag stays responsive", () => {
  expectScenario("frozen-progress-drag");
  expect(
    appPerformance.workloadEnvelope.dimensions.find(
      (dimension) => dimension.id === "surface-crystal-coverage",
    ),
  ).toEqual(
    expect.objectContaining({
      batchMax: 100,
      defaultValue: 98,
      interactiveMax: 100,
    }),
  );
  expect(
    appPerformance.workloadEnvelope.dimensions.find(
      (dimension) => dimension.id === "physical-transmission",
    ),
  ).toEqual(
    expect.objectContaining({
      batchMax: 100,
      defaultValue: 93,
      interactiveMax: 100,
    }),
  );
});

test("perf: geometry melt brush drag stays responsive", () => {
  expectScenario("frozen-melt-mask-drag");
});

test("perf: thermal refreeze frame stays responsive", () => {
  expectScenario("frozen-melt-refreeze-frame");
});

test("perf: image slab geometry drag stays responsive", () => {
  expectScenario("frozen-image-geometry-drag");
});

test("perf: direct model orbit stays responsive", () => {
  expectScenario("frozen-model-orbit");
});

test("perf: frozen canvas pan stays responsive", () => {
  expectScenario("frozen-canvas-pan");
});

test("perf: frozen canvas zoom stays responsive", () => {
  expectScenario("frozen-canvas-zoom");
});

test("perf: frozen preview option changes stay responsive", () => {
  expectScenario("frozen-preview-option");
});

test("perf: frozen export option changes stay responsive", () => {
  expectScenario("frozen-export-option");
});

test("perf: frozen image export completes within budget", () => {
  expectScenario("frozen-image-export");
});
