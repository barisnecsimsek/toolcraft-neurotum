import { expect } from "@playwright/test";

import {
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceCompiledFixturePlan,
  type ToolcraftPerformanceExecutedFixtureCheckpoint,
} from "@/toolcraft/runtime";

import {
  executeToolcraftCompiledPathFixtureApplications,
  type ToolcraftCompiledFixtureApplications,
} from "./performance-compiled-fixture-runtime";
import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";

export async function applyToolcraftPerformancePathCompiledFixture(
  config: ToolcraftEnvelopePerformanceConfig,
  pathId: string,
  plan: ToolcraftPerformanceCompiledFixturePlan,
  selector: "development" | "maximum",
  applications: ToolcraftCompiledFixtureApplications,
): Promise<ToolcraftPerformanceExecutedFixtureCheckpoint> {
  return executeToolcraftCompiledPathFixtureApplications({
    applications,
    assertObservation: (observedMagnitude, expectedMagnitude, dimensionId) => {
      expect(
        observedMagnitude,
        `Toolcraft performance path "${pathId}" must observe compiled dimension "${dimensionId}" after complete fixture application.`,
      ).toBe(expectedMagnitude);
    },
    attachEvidence: ({ id, target }) =>
      attachToolcraftBrowserRuntimeEvidence({
        evidenceType: "performance-compiled-fixture",
        requirementId: id,
        target,
      }),
    config,
    pathId,
    plan,
    requirementId: pathId,
    selector,
  });
}
