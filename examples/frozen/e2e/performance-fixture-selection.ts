import type { ToolcraftPerformanceCompiledFixturePlan } from "@/toolcraft/runtime";

export const TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR_ENV =
  "TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR";

export type ToolcraftPerformanceFixtureSelector = "development" | "maximum";

export function readToolcraftPerformanceFixtureSelector(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ToolcraftPerformanceFixtureSelector {
  const value = environment[TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR_ENV];
  if (value === undefined || value === "development") return "development";
  if (value === "maximum") return "maximum";
  throw new Error(
    `${TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR_ENV} must be development or maximum.`,
  );
}

export function resolveToolcraftPerformanceFixtureSelector(
  plan: ToolcraftPerformanceCompiledFixturePlan,
  requested: ToolcraftPerformanceFixtureSelector,
): ToolcraftPerformanceFixtureSelector {
  if (requested === "maximum") return "maximum";
  return plan.development.status === "available" ? "development" : "maximum";
}
