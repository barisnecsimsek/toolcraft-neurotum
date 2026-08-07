import type { Page } from "@playwright/test";

import {
  compileToolcraftPerformanceFixturePlan,
  deriveToolcraftPerformancePaths,
  type ResolvedToolcraftAppSchema,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformancePath,
} from "@/toolcraft/runtime";

import { attachToolcraftBrowserRuntimeEvidence } from "./browser-runtime-evidence";
import {
  expectToolcraftPerformanceBudget,
} from "./performance-budget-helpers";
import { applyToolcraftPerformancePathCompiledFixture } from "./performance-fixture-helpers";
import {
  readToolcraftPerformanceFixtureSelector,
  resolveToolcraftPerformanceFixtureSelector,
} from "./performance-fixture-selection";
import {
  measureToolcraftClipboardActionByLabel,
  measureToolcraftDownloadActionByLabel,
} from "./performance-output-action-helpers";
import type { ToolcraftPerformancePathAdapter } from "./performance-path-adapter-contract";
import { expectToolcraftPipelineInvariant } from "./performance-pipeline-evidence";
import { getToolcraftPerformancePathBudget } from "./performance-profile-helpers";
import {
  measureToolcraftAnimationFrames,
  measureToolcraftInteraction,
} from "./performance-probe-helpers";

export type ToolcraftCompiledPerformancePathAdapter = Readonly<{
  adapter: ToolcraftPerformancePathAdapter;
  path: ToolcraftPerformancePath;
  testName: string;
}>;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function getToolcraftPerformancePathTestName(
  path: Pick<ToolcraftPerformancePath, "id">,
): string {
  return `browser perf: toolcraft path ${path.id}`;
}

export function compileToolcraftPerformancePathAdapterMatrix(
  paths: readonly ToolcraftPerformancePath[],
  adapters: readonly ToolcraftPerformancePathAdapter[],
): readonly ToolcraftCompiledPerformancePathAdapter[] {
  const canonicalPaths = [...paths].sort((left, right) =>
    compareCodeUnits(left.id, right.id),
  );
  const canonicalPathIds = new Set(canonicalPaths.map((path) => path.id));
  if (canonicalPathIds.size !== canonicalPaths.length) {
    throw new Error(
      "Toolcraft performance path matrix received duplicate canonical path ids.",
    );
  }
  const adaptersByPathId = new Map<string, ToolcraftPerformancePathAdapter>();

  for (const adapter of adapters) {
    if (adaptersByPathId.has(adapter.pathId)) {
      throw new Error(
        `Toolcraft performance path matrix has a duplicate adapter for "${adapter.pathId}".`,
      );
    }
    if (!canonicalPathIds.has(adapter.pathId)) {
      throw new Error(
        `Toolcraft performance path matrix has an orphan adapter for "${adapter.pathId}".`,
      );
    }
    adaptersByPathId.set(adapter.pathId, adapter);
  }

  const missingPathIds = canonicalPaths
    .map((path) => path.id)
    .filter((pathId) => !adaptersByPathId.has(pathId));
  if (missingPathIds.length > 0) {
    throw new Error(
      `Toolcraft performance path matrix is missing adapter${missingPathIds.length === 1 ? "" : "s"} for: ${missingPathIds.join(", ")}.`,
    );
  }

  for (const path of canonicalPaths) {
    const adapter = adaptersByPathId.get(path.id)!;
    if (path.interaction === "export" && !adapter.output) {
      throw new Error(
        `Toolcraft export performance path "${path.id}" requires a protected output completion adapter.`,
      );
    }
    if (path.interaction !== "export" && adapter.output) {
      throw new Error(
        `Toolcraft non-export performance path "${path.id}" must use an interaction action.`,
      );
    }
    if (
      pathProductOutcomeInteractions.has(path.interaction) &&
      !adapter.observeOutcome
    ) {
      throw new Error(
        `Toolcraft performance path "${path.id}" requires an observable product outcome.`,
      );
    }
  }

  return Object.freeze(
    canonicalPaths.map((path) =>
      Object.freeze({
        adapter: adaptersByPathId.get(path.id)!,
        path,
        testName: getToolcraftPerformancePathTestName(path),
      }),
    ),
  );
}

const pathProductOutcomeInteractions = new Set<
  ToolcraftPerformancePath["interaction"]
>([
  "control-change",
  "control-drag",
  "mask-drag",
  "media-import",
  "timeline-playback",
  "timeline-scrub",
]);

function getPathTarget(path: ToolcraftPerformancePath): string | undefined {
  return path.targets.length === 1 ? path.targets[0] : undefined;
}

async function attachPathEvidence(
  evidenceType:
    | "performance-budget"
    | "performance-control-drag"
    | "performance-render-scale"
    | "performance-viewport",
  path: ToolcraftPerformancePath,
): Promise<void> {
  await attachToolcraftBrowserRuntimeEvidence({
    evidenceType,
    requirementId: path.id,
    target: getPathTarget(path),
  });
}

export async function runToolcraftPerformancePath(
  page: Page,
  schema: ResolvedToolcraftAppSchema,
  config: ToolcraftEnvelopePerformanceConfig,
  entry: ToolcraftCompiledPerformancePathAdapter,
): Promise<void> {
  const { adapter, path } = entry;
  const canonicalPath = deriveToolcraftPerformancePaths(schema, config).find(
    (candidate) => candidate.id === path.id,
  );
  if (!canonicalPath || JSON.stringify(canonicalPath) !== JSON.stringify(path)) {
    throw new Error(
      `Toolcraft performance path adapter "${adapter.pathId}" no longer matches the canonical derived path.`,
    );
  }

  await adapter.prepare(page);
  const fixturePlan = compileToolcraftPerformanceFixturePlan(config, path);
  if (fixturePlan.dimensionIds.length > 0) {
    if (!adapter.fixtureApplications) {
      throw new Error(
        `Toolcraft performance path adapter "${adapter.pathId}" must implement all compiled fixture dimensions: ${fixturePlan.dimensionIds.join(", ")}.`,
      );
    }
    const fixtureSelector = resolveToolcraftPerformanceFixtureSelector(
      fixturePlan,
      readToolcraftPerformanceFixtureSelector(),
    );
    await applyToolcraftPerformancePathCompiledFixture(
      config,
      path.id,
      fixturePlan,
      fixtureSelector,
      adapter.fixtureApplications(page),
    );
  } else if (adapter.fixtureApplications) {
    throw new Error(
      `Toolcraft performance path adapter "${adapter.pathId}" cannot declare fixture applications because the compiled path has no workload dimensions.`,
    );
  }

  const budget = getToolcraftPerformancePathBudget(path, config.scenarios);
  const target = getPathTarget(path);
  await expectToolcraftPipelineInvariant(
    page,
    config,
    path.id,
    async (phase) => {
      const context = Object.freeze({ page, path, phase });
      let result;
      if (adapter.output?.kind === "download") {
        const measured = await measureToolcraftDownloadActionByLabel(
          page,
          adapter.output.label,
          { pathId: path.id, phase, profile: path.profile, target },
        );
        result = measured.result;
        await adapter.output.verify(measured.completion, page);
      } else if (adapter.output?.kind === "clipboard") {
        const measured = await measureToolcraftClipboardActionByLabel(
          page,
          adapter.output.label,
          { pathId: path.id, phase, profile: path.profile, target },
        );
        result = measured.result;
        await adapter.output.verify(measured.completion, page);
      } else if (path.interaction === "animation-frame") {
        await adapter.action(context);
        result = await measureToolcraftAnimationFrames(page, 120, {
          pathId: path.id,
          phase,
          profile: path.profile,
          target,
        });
        await adapter.verifyOutcome?.(context);
      } else {
        result = await measureToolcraftInteraction(
          page,
          () => adapter.action(context),
          {
            ...(adapter.observeOutcome
              ? { observeOutcome: () => adapter.observeOutcome!(context) }
              : {}),
            pathId: path.id,
            phase,
            profile: path.profile,
            target,
          },
        );
        await adapter.verifyOutcome?.(context);
      }
      expectToolcraftPerformanceBudget(result, budget);
      await attachPathEvidence("performance-budget", path);

      if (path.interaction === "control-drag" || path.interaction === "mask-drag") {
        await attachPathEvidence("performance-control-drag", path);
      }
      if (
        path.interaction === "viewport-drag" ||
        path.interaction === "viewport-zoom"
      ) {
        await attachPathEvidence("performance-viewport", path);
      }
      if (
        path.targets.includes("canvas.renderScale") ||
        path.workloadDimensions.some((dimension) =>
          /render[-_.]?scale|resolution[-_.]?scale/iu.test(dimension),
        )
      ) {
        await attachPathEvidence("performance-render-scale", path);
      }
    },
  );
}
