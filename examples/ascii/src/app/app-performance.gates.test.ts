import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import {
  collectToolcraftUnclassifiedPerformanceControls,
  validateToolcraftPerformanceCoverage,
} from "@/toolcraft/runtime";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import { e2eDir, projectDir } from "./app-performance-test-utils";

describe("Toolcraft starter performance gates", () => {
  it("publishes separate browser acceptance and performance fallback gates", () => {
    const packageJson = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const runScriptPattern = (scriptName: string) =>
      `(?:pnpm ${scriptName}|npm run ${scriptName})`;

    expect(
      packageJson.scripts?.["test:browser"],
      "Generated apps must keep full performance scenarios out of the default browser acceptance gate.",
    ).toBe('playwright install chromium && playwright test --grep-invert "browser perf:"');
    expect(
      packageJson.scripts?.["test:browser:perf"],
      "Generated apps must expose a sequential Playwright fallback so perf budgets can be measured when no agent browser is available.",
    ).toBe(
      'playwright install chromium && playwright test --grep "browser perf:" --workers=1 --pass-with-no-tests',
    );
    expect(packageJson.scripts?.["verify:quick"]).toMatch(
      new RegExp(`^${runScriptPattern("ai:check")} && ${runScriptPattern("test")}$`),
    );
    expect(packageJson.scripts?.["verify:ui"]).toMatch(
      new RegExp(`^${runScriptPattern("test:browser")}$`),
    );
    expect(packageJson.scripts?.["verify:perf"]).toMatch(
      new RegExp(`^${runScriptPattern("test:browser:perf")}$`),
    );
    expect(packageJson.scripts?.["verify:perf:playwright"]).toMatch(
      new RegExp(`^${runScriptPattern("test:browser:perf")}$`),
    );
    expect(packageJson.scripts?.["verify:final"]).toMatch(
      new RegExp(
        `^${runScriptPattern("ai:check")} && ${runScriptPattern("test")} && ${runScriptPattern("build")} && ${runScriptPattern("test:browser")}$`,
      ),
    );
  });

  it("keeps the Playwright performance audit inside the browser perf tag", () => {
    const source = readFileSync(join(e2eDir, "app-performance.spec.ts"), "utf8");
    const testNames = [...source.matchAll(/test\(\s*(["'`])([^"'`]+)\1/g)].map(
      (match) => match[2],
    );

    expect(source).not.toContain("TOOLCRAFT_PERF_CHECK");
    expect(testNames.length).toBeGreaterThan(0);
    expect(
      testNames.every((name) => name.includes("browser perf:")),
      `app-performance.spec.ts tests must all be tagged for the dedicated perf checkpoint: ${testNames.join(", ")}`,
    ).toBe(true);
  });

  it("declares agent browser as the preferred performance runner", () => {
    expect(appPerformance.browserCheckPolicy).toEqual({
      fallbackRunner: "playwright",
      fallbackWhen: ["agent-browser-unavailable", "ci"],
      preferredRunner: "agent-browser",
    });
  });

  it("requires valid performance coverage for declared workload scenarios", () => {
    expect(validateToolcraftPerformanceCoverage(appSchema, appPerformance)).toEqual([]);
  });

  it("requires every visible control to classify its performance role", () => {
    const unclassifiedControls =
      collectToolcraftUnclassifiedPerformanceControls(appSchema);

    expect(
      unclassifiedControls,
      "Every visible non-action control must declare performanceRole as workload or responsiveness so AI cannot skip the performance decision.",
    ).toEqual([]);
  });
});
