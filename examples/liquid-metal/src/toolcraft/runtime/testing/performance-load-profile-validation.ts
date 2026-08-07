import type { ToolcraftControlSchema } from "../schema/types";
import {
  arePerformanceFixtureValuesEqual,
  customFixtureValueNeedsLoadProfile,
  getAreaFixtureValue,
  getCountFixtureValue,
  getNumericFixtureValue,
  hasPerformanceFixtureValue,
} from "./performance-fixture-values";
import type {
  ToolcraftPerformanceFixture,
  ToolcraftPerformanceFixtureKind,
  ToolcraftPerformanceLoadMetric,
  ToolcraftPerformanceLoadProfile,
  ToolcraftPerformanceScenario,
  ToolcraftPerformanceUserFacingRange,
} from "./performance-types";

const performanceLoadMetrics = new Set<ToolcraftPerformanceLoadMetric>([
  "canvas-area",
  "count",
  "custom",
  "media-area",
  "numeric-max",
  "numeric-min",
  "text-length",
]);

const performanceUserFacingRanges = new Set<ToolcraftPerformanceUserFacingRange>([
  "experimental-above-smooth",
  "fully-guaranteed",
]);

const loadProfileRequiredFixtureKinds = new Set<ToolcraftPerformanceFixtureKind>([
  "high-density",
  "large-canvas",
  "many-items",
  "max-value",
  "media",
]);

function getLoadProfileActualSmoothRatio(
  profile: ToolcraftPerformanceLoadProfile,
): number | null {
  if (profile.metric === "numeric-max") {
    const hardLimit = getNumericFixtureValue(profile.hardLimit);
    const smoothTarget = getNumericFixtureValue(profile.smoothTarget);

    return hardLimit !== null && smoothTarget !== null && hardLimit > 0
      ? smoothTarget / hardLimit
      : null;
  }

  if (profile.metric === "numeric-min") {
    const hardLimit = getNumericFixtureValue(profile.hardLimit);
    const smoothTarget = getNumericFixtureValue(profile.smoothTarget);

    return hardLimit !== null && smoothTarget !== null && smoothTarget > 0
      ? hardLimit / smoothTarget
      : null;
  }

  if (profile.metric === "count") {
    const hardLimit = getCountFixtureValue(profile.hardLimit);
    const smoothTarget = getCountFixtureValue(profile.smoothTarget);

    return hardLimit !== null && smoothTarget !== null && hardLimit > 0
      ? smoothTarget / hardLimit
      : null;
  }

  if (profile.metric === "canvas-area" || profile.metric === "media-area") {
    const hardArea = getAreaFixtureValue(profile.hardLimit);
    const smoothArea = getAreaFixtureValue(profile.smoothTarget);

    return hardArea !== null && smoothArea !== null && hardArea > 0
      ? smoothArea / hardArea
      : null;
  }

  return null;
}

function formatLoadProfileRatio(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function getLoadProfileSmoothTargetRatioError(
  label: string,
  profile: ToolcraftPerformanceLoadProfile,
): string | null {
  const declaredRatio = profile.smoothTargetRatio;

  if (
    typeof declaredRatio !== "number" ||
    !Number.isFinite(declaredRatio) ||
    declaredRatio <= 0 ||
    declaredRatio > 1
  ) {
    return null;
  }

  if (
    declaredRatio === 1 &&
    !arePerformanceFixtureValuesEqual(profile.smoothTarget, profile.hardLimit)
  ) {
    return `${label}.smoothTargetRatio 1 requires smoothTarget to equal hardLimit.`;
  }

  const actualRatio = getLoadProfileActualSmoothRatio(profile);

  if (actualRatio === null) {
    return null;
  }

  const tolerance = 0.0001;

  if (declaredRatio === 1) {
    return Math.abs(actualRatio - 1) <= tolerance
      ? null
      : `${label}.smoothTargetRatio 1 must describe the actual smooth target ratio ${formatLoadProfileRatio(actualRatio)}.`;
  }

  const previousStepRatio = Math.min(1, declaredRatio + 0.1);

  return actualRatio >= declaredRatio - tolerance &&
    actualRatio < previousStepRatio - tolerance
    ? null
    : `${label}.smoothTargetRatio ${formatLoadProfileRatio(declaredRatio)} must describe the actual smooth target ratio ${formatLoadProfileRatio(actualRatio)}.`;
}

function fixtureRequiresLoadProfile(fixture: ToolcraftPerformanceFixture): boolean {
  return (
    loadProfileRequiredFixtureKinds.has(fixture.kind) ||
    (fixture.kind === "custom" && customFixtureValueNeedsLoadProfile(fixture.value))
  );
}

function getLoadProfileRatioStepCount(ratio: number): number {
  return Math.round((1 - ratio) / 0.1);
}

function isTenPercentRatioStep(ratio: number): boolean {
  return Math.abs(ratio * 10 - Math.round(ratio * 10)) < 0.0001;
}

function getSchemaNumericHardLimit(
  control: ToolcraftControlSchema | undefined,
  metric: ToolcraftPerformanceLoadMetric,
): number | null {
  if (!control || (metric !== "numeric-max" && metric !== "numeric-min")) {
    return null;
  }

  const value = metric === "numeric-max" ? control.max : control.min;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getPerformanceLoadProfileErrors(
  scenario: ToolcraftPerformanceScenario,
  fieldName: "stressFixture" | "workloadFixture",
  fixture: ToolcraftPerformanceFixture,
  control: ToolcraftControlSchema | undefined,
): string[] {
  const errors: string[] = [];
  const profile = fixture.loadProfile;

  if (!profile) {
    return fixtureRequiresLoadProfile(fixture)
      ? [
          `${scenario.id} ${fieldName}.loadProfile must declare hardLimit, smoothTarget, and smoothTargetRatio so performance workload is a measured smooth target rather than a hidden toy fixture.`,
        ]
      : [];
  }

  const label = `${scenario.id} ${fieldName}.loadProfile`;

  if (!profile.target.trim()) {
    errors.push(`${label}.target must name the product workload target.`);
  }

  if (!performanceLoadMetrics.has(profile.metric)) {
    errors.push(`${label}.metric "${profile.metric}" is not supported.`);
  }

  if (!performanceUserFacingRanges.has(profile.userFacingRange)) {
    errors.push(`${label}.userFacingRange "${profile.userFacingRange}" is not supported.`);
  }

  if (
    typeof profile.smoothTargetRatio !== "number" ||
    !Number.isFinite(profile.smoothTargetRatio) ||
    profile.smoothTargetRatio <= 0 ||
    profile.smoothTargetRatio > 1
  ) {
    errors.push(`${label}.smoothTargetRatio must be > 0 and <= 1.`);
  } else if (!isTenPercentRatioStep(profile.smoothTargetRatio)) {
    errors.push(`${label}.smoothTargetRatio must use 10 percent steps such as 1, 0.9, or 0.8.`);
  }

  const smoothTargetRatioError = getLoadProfileSmoothTargetRatioError(label, profile);

  if (smoothTargetRatioError) {
    errors.push(smoothTargetRatioError);
  }

  if (!hasPerformanceFixtureValue(fixture)) {
    errors.push(`${label}.smoothTarget cannot be checked because ${fieldName}.value is missing.`);
  } else if (!arePerformanceFixtureValuesEqual(profile.smoothTarget, fixture.value)) {
    errors.push(`${label}.smoothTarget must match ${fieldName}.value so browser tests apply the documented smooth workload target.`);
  }

  const schemaHardLimit = getSchemaNumericHardLimit(control, profile.metric);

  if (
    schemaHardLimit !== null &&
    !arePerformanceFixtureValuesEqual(profile.hardLimit, schemaHardLimit)
  ) {
    errors.push(`${label}.hardLimit must match schema ${profile.metric === "numeric-max" ? "max" : "min"} ${schemaHardLimit}.`);
  }

  if (profile.metric === "numeric-max" || profile.metric === "numeric-min") {
    const hardLimit = getNumericFixtureValue(profile.hardLimit);
    const smoothTarget = getNumericFixtureValue(profile.smoothTarget);

    if (hardLimit === null || smoothTarget === null) {
      errors.push(`${label}.${profile.metric} hardLimit and smoothTarget must be numeric.`);
    } else if (profile.metric === "numeric-max" && smoothTarget > hardLimit) {
      errors.push(`${label}.smoothTarget must be <= hardLimit for numeric-max workloads.`);
    } else if (profile.metric === "numeric-min" && smoothTarget < hardLimit) {
      errors.push(`${label}.smoothTarget must be >= hardLimit for numeric-min workloads.`);
    }
  }

  if (profile.metric === "count") {
    const hardLimit = getCountFixtureValue(profile.hardLimit);
    const smoothTarget = getCountFixtureValue(profile.smoothTarget);

    if (hardLimit === null || smoothTarget === null) {
      errors.push(`${label}.count hardLimit and smoothTarget must be numeric counts, arrays, or objects with count/items.`);
    } else if (smoothTarget > hardLimit) {
      errors.push(`${label}.smoothTarget count must be <= hardLimit count.`);
    }
  }

  if (profile.metric === "canvas-area" || profile.metric === "media-area") {
    const hardArea = getAreaFixtureValue(profile.hardLimit);
    const smoothArea = getAreaFixtureValue(profile.smoothTarget);

    if (hardArea === null || smoothArea === null) {
      errors.push(`${label}.${profile.metric} hardLimit and smoothTarget must include numeric width and height.`);
    } else if (smoothArea > hardArea) {
      errors.push(`${label}.smoothTarget area must be <= hardLimit area.`);
    }
  }

  if (fixture.kind === "many-items") {
    const smoothCount = getCountFixtureValue(fixture.value);

    if (typeof fixture.minCount !== "number" || fixture.minCount <= 0) {
      errors.push(`${scenario.id} ${fieldName}.minCount must be a positive number for many-items fixtures.`);
    } else if (smoothCount !== null && smoothCount < fixture.minCount) {
      errors.push(`${scenario.id} ${fieldName}.value must include at least ${fixture.minCount} items for many-items fixtures.`);
    }
  }

  if (
    typeof profile.smoothTargetRatio === "number" &&
    Number.isFinite(profile.smoothTargetRatio)
  ) {
    if (profile.smoothTargetRatio === 1) {
      if (profile.userFacingRange !== "fully-guaranteed") {
        errors.push(`${label}.userFacingRange must be "fully-guaranteed" when smoothTargetRatio is 1.`);
      }
    } else if (profile.smoothTargetRatio > 0 && profile.smoothTargetRatio < 1) {
      if (profile.degradationStepPercent !== 10) {
        errors.push(`${label}.degradationStepPercent must be 10 when smoothTargetRatio is below 1.`);
      }

      if (profile.userFacingRange !== "experimental-above-smooth") {
        errors.push(`${label}.userFacingRange must be "experimental-above-smooth" when smoothTargetRatio is below 1.`);
      }

      const expectedEvidenceCount = getLoadProfileRatioStepCount(profile.smoothTargetRatio);
      const evidence = profile.evidence ?? [];

      if (evidence.length < expectedEvidenceCount) {
        errors.push(`${label}.evidence must include failed measurements for each 10 percent step above smoothTargetRatio ${profile.smoothTargetRatio}.`);
      }

      for (const [index, entry] of evidence.entries()) {
        const evidenceLabel = `${label}.evidence[${index}]`;

        if (!entry.scenarioId.trim()) {
          errors.push(`${evidenceLabel}.scenarioId must name the measured scenario.`);
        }

        if (entry.result !== "failed") {
          errors.push(`${evidenceLabel}.result must be "failed" for degraded smooth targets.`);
        }

        if (!entry.measuredResult.trim()) {
          errors.push(`${evidenceLabel}.measuredResult must include the measured budget failure.`);
        }

        if (!entry.optimizationAttempted?.trim()) {
          errors.push(`${evidenceLabel}.optimizationAttempted must describe the optimization attempted before lowering the smooth target.`);
        }

        if (!entry.decision.trim()) {
          errors.push(`${evidenceLabel}.decision must explain why this target was rejected or lowered.`);
        }
      }
    }
  }

  return errors;
}
