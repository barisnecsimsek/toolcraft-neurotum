import type { Page } from "@playwright/test";

import type { ToolcraftPerformanceConfig } from "@/toolcraft/runtime";

import {
  getToolcraftPerformanceStressValue,
  getToolcraftPerformanceWorkloadValue,
} from "./performance-budget-helpers";

export type ToolcraftStressFixtureApplyContext = {
  config: ToolcraftPerformanceConfig;
  fixture: Record<string, unknown>;
  key: string;
  page: Page;
  scenarioId: string;
};

export type ToolcraftStressFixtureAppliers = Record<
  string,
  (
    value: unknown,
    context: ToolcraftStressFixtureApplyContext,
  ) => Promise<void> | void
>;

function isToolcraftStressFixtureObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertFixtureAppliersCoverKeys(
  scenarioId: string,
  fixtureKind: "stressFixture" | "workloadFixture",
  fixtureKeys: readonly string[],
  appliers: ToolcraftStressFixtureAppliers,
): void {
  const applierLabel = fixtureKind === "stressFixture" ? "fixture" : "workload fixture";
  const missingKeys = fixtureKeys.filter((key) => !appliers[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" is missing ${applierLabel} appliers for: ${missingKeys.join(
        ", ",
      )}.`,
    );
  }

  const extraKeys = Object.keys(appliers).filter((key) => !fixtureKeys.includes(key));
  if (extraKeys.length > 0) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" declares ${applierLabel} appliers not present in ${fixtureKind}.value: ${extraKeys.join(
        ", ",
      )}.`,
    );
  }
}

async function applyToolcraftPerformanceFixture(
  page: Page,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  fixtureKind: "stressFixture" | "workloadFixture",
  fixture: unknown,
  appliers: ToolcraftStressFixtureAppliers,
): Promise<Record<string, unknown>> {
  if (!isToolcraftStressFixtureObject(fixture)) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" must provide an object ${fixtureKind}.value for ${fixtureKind === "stressFixture" ? "combined fixture" : "baseline fixture"} application.`,
    );
  }

  const fixtureKeys = Object.keys(fixture);
  if (fixtureKeys.length === 0) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" ${fixtureKind}.value must contain at least one key.`,
    );
  }

  assertFixtureAppliersCoverKeys(scenarioId, fixtureKind, fixtureKeys, appliers);

  for (const key of fixtureKeys) {
    await appliers[key]!(fixture[key], {
      config,
      fixture,
      key,
      page,
      scenarioId,
    });
  }

  return fixture;
}

export async function applyToolcraftPerformanceStressFixture(
  page: Page,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  appliers: ToolcraftStressFixtureAppliers,
): Promise<Record<string, unknown>> {
  return applyToolcraftPerformanceFixture(
    page,
    config,
    scenarioId,
    "stressFixture",
    getToolcraftPerformanceStressValue(config, scenarioId),
    appliers,
  );
}

export async function applyToolcraftPerformanceWorkloadFixture(
  page: Page,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
  appliers: ToolcraftStressFixtureAppliers,
): Promise<Record<string, unknown>> {
  return applyToolcraftPerformanceFixture(
    page,
    config,
    scenarioId,
    "workloadFixture",
    getToolcraftPerformanceWorkloadValue(config, scenarioId),
    appliers,
  );
}
