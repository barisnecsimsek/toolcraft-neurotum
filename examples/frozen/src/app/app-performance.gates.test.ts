import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import {
  TOOLCRAFT_PERFORMANCE_VERIFICATION_LIFECYCLE,
  assessToolcraftRenderPlan,
  collectToolcraftWorkloadControls,
  collectToolcraftUnclassifiedPerformanceControls,
  type ToolcraftEnvelopePerformanceConfig,
  validateToolcraftPerformanceCoverage,
} from "@/toolcraft/runtime";
import {
  createToolcraftKernelBenchmarkRequirements,
  getToolcraftKernelBenchmarkReceiptPath,
  readToolcraftKernelBenchmarkReceipt,
} from "../../scripts/toolcraft-kernel-benchmark-receipt.mjs";
import {
  collectToolcraftVerificationInputs,
} from "../../scripts/toolcraft-verification-receipt.mjs";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  e2eDir,
  playwrightConfigForbidsFocusedTests,
  projectDir,
} from "./app-performance-test-utils";

describe("Toolcraft starter performance gates", () => {
  it("publishes separate browser acceptance and performance fallback gates", () => {
    const packageJson = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const generatedAppTestScript =
      packageJson.scripts?.["test:generated"] ?? packageJson.scripts?.test;
    const runScriptPattern = (scriptName: string) =>
      `(?:pnpm ${scriptName}|npm run ${scriptName})`;

    expect(
      generatedAppTestScript,
      "Generated app tests must invoke the Toolcraft integrity checker.",
    ).toContain("node scripts/check-toolcraft-integrity.mjs");

    expect(
      packageJson.scripts?.["test:browser"],
      "Generated apps must keep full performance and kernel benchmark scenarios out of the default browser acceptance gate.",
    ).toBe(
      'playwright install chromium && playwright test --grep-invert "browser perf:|toolcraft kernel:"',
    );
    expect(
      packageJson.scripts?.["test:browser:perf"],
      "Generated apps must expose a protected sequential Playwright checkpoint for final performance proof.",
    ).toBe("node scripts/run-browser-performance.mjs");
    const performanceRunner = readFileSync(
      join(projectDir, "scripts/run-browser-performance.mjs"),
      "utf8",
    );
    const receiptModule = readFileSync(
      join(projectDir, "scripts/toolcraft-verification-receipt.mjs"),
      "utf8",
    );
    expect(performanceRunner).toContain('runBinary(viteBin, ["build"])');
    expect(performanceRunner).toContain('TOOLCRAFT_BROWSER_SERVER_MODE: "preview"');
    expect(performanceRunner).toContain(
      'TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR: "maximum"',
    );
    expect(performanceRunner).toContain('"--workers=1"');
    expect(performanceRunner).not.toContain('"--pass-with-no-tests"');
    expect(performanceRunner).not.toContain("process.argv.slice(2)");
    expect(performanceRunner).toContain(
      "assertToolcraftVerificationInputsUnchanged",
    );
    expect(performanceRunner).toContain("clearToolcraftPerformanceReceipt");
    expect(performanceRunner).toContain("writeToolcraftPerformanceCheckpointReceipt");
    expect(receiptModule).not.toContain(
      "export async function writeToolcraftPerformanceReceipt",
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
    expect(packageJson.scripts?.["verify:perf:refresh"]).toBe(
      "node scripts/run-browser-performance.mjs --reason=explicit-performance-work",
    );
    expect(
      packageJson.scripts?.["verify:perf:record-agent-browser"],
      "A terminal-only command must not mint an agent-browser performance receipt without browser evidence.",
    ).toBeUndefined();
    expect(packageJson.scripts?.["verify:perf:record-iteration"]).toBeUndefined();
    expect(packageJson.scripts?.["verify:kernel"]).toBe(
      "node scripts/run-kernel-benchmarks.mjs",
    );
    expect(packageJson.scripts?.["verify:perf:record-exemption"]).toBeUndefined();
    expect(receiptModule).not.toContain('command === "record-iteration"');
    expect(packageJson.scripts?.["verify:receipt"]).toContain("validate");
    expect(packageJson.scripts?.["verify:final"]).toMatch(
      new RegExp(
        `^${runScriptPattern("ai:check")} && ${runScriptPattern("test")} && ${runScriptPattern("build")} && ${runScriptPattern("test:browser")} && ${runScriptPattern("verify:receipt")}$`,
      ),
    );
  });

  it("keeps the Playwright performance audit inside the browser perf tag", () => {
    const source = readFileSync(join(e2eDir, "app-performance.spec.ts"), "utf8");
    const testNames = [...source.matchAll(/test\(\s*(["'`])([^"'`]+)\1/g)].map(
      (match) => match[2],
    );

    expect(source).not.toContain("TOOLCRAFT_PERF_CHECK");
    expect(source).toContain("compileToolcraftPerformancePathAdapterMatrix");
    expect(source).toContain("deriveToolcraftPerformancePaths");
    expect(source).toContain("appPerformancePathAdapters");
    expect(source).toContain("runToolcraftPerformancePath");
    expect(source).toContain("for (const entry of performancePathMatrix)");
    expect(testNames.length).toBeGreaterThan(0);
    expect(
      testNames.every((name) => name.includes("browser perf:")),
      `app-performance.spec.ts tests must all be tagged for the dedicated perf checkpoint: ${testNames.join(", ")}`,
    ).toBe(true);
  });

  it("rejects focused Playwright tests that would bypass protected browser gates", () => {
    expect(playwrightConfigForbidsFocusedTests()).toBe(true);
  });

  it("keeps verification lifecycle authority in the runtime contract", () => {
    expect(appPerformance).not.toHaveProperty("browserCheckPolicy");
    expect(TOOLCRAFT_PERFORMANCE_VERIFICATION_LIFECYCLE).toEqual({
      diagnosis: {
        durableEvidence: false,
        purposes: ["diagnosis", "targeted-visual-investigation"],
        runner: "agent-browser",
      },
      durableEvidence: {
        explicitRefreshCommand: "verify:perf:refresh",
        firstStableCommand: "verify:perf",
        ordinaryIterationCommand: "verify:perf:record-iteration",
        runner: "protected-playwright",
      },
    });
  });

  it("requires valid performance coverage for declared workload scenarios", () => {
    expect(validateToolcraftPerformanceCoverage(appSchema, appPerformance)).toEqual([]);
  });

  it("requires protected current-source kernel evidence for benchmark decisions", async () => {
    const performanceConfig: ToolcraftEnvelopePerformanceConfig = appPerformance;
    const decisions = performanceConfig.kernelBenchmarkDecisions ?? [];
    const rawAssessment = assessToolcraftRenderPlan(appSchema, {
      ...performanceConfig,
      kernelBenchmarkDecisions: undefined,
    });
    expect(rawAssessment.errors).toEqual([]);

    if (decisions.length === 0) {
      expect(rawAssessment.requiredBenchmarks).toEqual([]);
      return;
    }

    const requirements = createToolcraftKernelBenchmarkRequirements({
      decisions,
      requirements: rawAssessment.requiredBenchmarks,
    });
    const inventory = await collectToolcraftVerificationInputs(projectDir);
    await expect(
      readToolcraftKernelBenchmarkReceipt(
        getToolcraftKernelBenchmarkReceiptPath(projectDir),
        { requirements, sourceHash: inventory.sourceHash },
      ),
    ).resolves.toBeDefined();
  });

  it("starts from an explicit empty workload envelope", () => {
    if (collectToolcraftWorkloadControls(appSchema).length > 0) {
      return;
    }

    expect(appPerformance.workloadEnvelope).toEqual({ dimensions: [] });
    expect(appPerformance).not.toHaveProperty("rendererWorkload");
    expect(appPerformance).not.toHaveProperty("workloadTargets");
    expect(appPerformance).not.toHaveProperty("fixtureAdapters");
    expect(collectToolcraftWorkloadControls(appSchema)).toEqual([]);
  });

  it("keeps workload guidance structural instead of prescribing domain constants", () => {
    const monorepoRoot = join(projectDir, "..");
    const documentation = [
      join(projectDir, "AGENTS.md"),
      join(projectDir, "docs/toolcraft/core/performance.md"),
      join(projectDir, "docs/toolcraft/performance.md"),
      join(projectDir, "docs/toolcraft/renderer-technique.md"),
      join(projectDir, "docs/toolcraft/assembly-workflow.md"),
      join(projectDir, "docs/toolcraft/workflow.md"),
      join(monorepoRoot, "apps/website/src/content/docs/toolcraft-core-performance.md"),
      join(monorepoRoot, "apps/website/src/content/docs/toolcraft-performance.md"),
      join(monorepoRoot, "apps/website/src/content/docs/toolcraft-renderer-technique.md"),
      join(monorepoRoot, "apps/website/src/content/docs/toolcraft-assembly-workflow.md"),
      join(monorepoRoot, "apps/website/src/content/docs/toolcraft-workflow.md"),
    ]
      .filter((filePath) => existsSync(filePath))
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");

    expect(documentation).toMatch(/reachable controls and inputs/i);
    expect(documentation).toMatch(/workload dimensions and enforced boundaries/i);
    expect(documentation).toMatch(
      /render-plan assessment(?: and| with).*protected kernel benchmark/i,
    );
    expect(documentation).toMatch(/derived paths and combined fixtures/i);
    expect(documentation).not.toMatch(/50_000|1_000\s+lines|1920x1080-equivalent/i);
    expect(documentation).not.toMatch(/classif(?:y|ication)[^\n]*(?:key name|key-name|keyword)/i);
    expect(documentation).not.toMatch(
      /bitmap-media|halftone|per-pixel|max text length|max media size/i,
    );
    expect(documentation).toMatch(/exact normalized development pressure `0\.8`/i);
    expect(documentation).toMatch(/exhaustive-discrete/i);
    expect(documentation).toMatch(/match(?:es)? every option one-to-one/i);
    expect(documentation).toMatch(/toolcraftDiscreteCombinationBudget/);
    expect(documentation).toMatch(/toolcraftDiscreteDimensionBudget/);
    expect(documentation).toMatch(/bypasses search budgets because no (?:combination )?search runs/i);
    expect(documentation).toMatch(/planning error/i);
    expect(documentation).toMatch(/TOOLCRAFT_PERFORMANCE_VERIFICATION_LIFECYCLE/);
    expect(documentation).toMatch(/exactly one scenario (?:for|per) (?:every )?(?:canonical |derived )?path/i);
    expect(documentation).toMatch(/no current targeted[- ]iteration writer/i);
    expect(documentation).toMatch(
      /regenerate from the current starter before later (?:product )?work/i,
    );
    expect(documentation).not.toMatch(/verify:perf:record-iteration/);
    expect(documentation).toMatch(/lifecycle event is recorded once/i);
    expect(documentation).not.toMatch(/compatibility mode|legacy preferred|legacy-only/i);
    expect(documentation).not.toMatch(/loadProfile|smoothTargetRatio/i);
    expect(documentation).not.toMatch(/without exceeding development pressure/i);
    expect(documentation).not.toMatch(/\breachableValues\b/);
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
