import { expect, test } from "@playwright/test";

import type { ToolcraftPerformanceCompiledFixturePlan } from "@/toolcraft/runtime";

import {
  TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR_ENV,
  readToolcraftPerformanceFixtureSelector,
  resolveToolcraftPerformanceFixtureSelector,
} from "./performance-fixture-selection";

const availablePlan = {
  development: {
    checkpoint: {
      kind: "development",
      normalizedPressure: 0.8,
      values: { count: 80 },
    },
    status: "available",
  },
  dimensionIds: ["count"],
  kind: "interactive",
  maximum: {
    kind: "interactive-max",
    normalizedPressure: 1,
    values: { count: 100 },
  },
  pathId: "performance-path:fixture-selection",
} as const satisfies ToolcraftPerformanceCompiledFixturePlan;

const unavailablePlan = {
  ...availablePlan,
  development: {
    reason: "No exact reachable vector has normalized pressure 0.8.",
    status: "unavailable",
  },
} as const satisfies ToolcraftPerformanceCompiledFixturePlan;

test("browser perf: targeted fixture selection defaults to development", () => {
  expect(readToolcraftPerformanceFixtureSelector({})).toBe("development");
  expect(
    readToolcraftPerformanceFixtureSelector({
      [TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR_ENV]: "maximum",
    }),
  ).toBe("maximum");
});

test("browser perf: unavailable development fixtures use the reachable maximum", () => {
  expect(
    resolveToolcraftPerformanceFixtureSelector(availablePlan, "development"),
  ).toBe("development");
  expect(
    resolveToolcraftPerformanceFixtureSelector(unavailablePlan, "development"),
  ).toBe("maximum");
  expect(resolveToolcraftPerformanceFixtureSelector(availablePlan, "maximum")).toBe(
    "maximum",
  );
});

test("browser perf: fixture selection rejects unknown modes", () => {
  expect(() =>
    readToolcraftPerformanceFixtureSelector({
      [TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR_ENV]: "fast-ish",
    }),
  ).toThrow(/must be development or maximum/u);
});
