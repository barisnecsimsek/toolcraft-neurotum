import { defineToolcraft } from "../schema/define-toolcraft";
import {
  registerToolcraftRendererPipeline,
  type ToolcraftRendererPipelinePassContract,
} from "../rendering/renderer-pipeline-registration";
import type { ToolcraftPerformancePath } from "./performance-path-model";
import type {
  ToolcraftEnvelopePerformanceConfig,
  ToolcraftInteractionInvalidation,
  ToolcraftPerformanceScenario,
  ToolcraftRenderPass,
} from "./performance-types";

export const groupedSchema = defineToolcraft({
  canvas: { enabled: true, sizing: { mode: "editable-output" } },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            opacity: {
              defaultValue: 0.5,
              label: "Opacity",
              max: 1,
              min: 0,
              performanceRole: "responsiveness",
              target: "effect.opacity",
              type: "slider",
            },
            strength: {
              defaultValue: 0.5,
              label: "Strength",
              max: 1,
              min: 0,
              performanceRole: "responsiveness",
              target: "effect.strength",
              type: "slider",
            },
          },
          title: "Effect",
        },
      ],
      title: "Controls",
    },
  },
});

export const workloadSchema = defineToolcraft({
  canvas: { enabled: true, sizing: { mode: "editable-output" } },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            density: {
              defaultValue: 4,
              label: "Density",
              max: 12,
              min: 1,
              performanceRole: "workload",
              target: "render.density",
              type: "slider",
            },
          },
          title: "Render",
        },
      ],
      title: "Controls",
    },
  },
});

export function createPass(
  overrides: Partial<ToolcraftRenderPass>,
): ToolcraftRenderPass {
  return {
    cacheKey: ["effect.source"],
    cost: {
      dimensions: [],
      frequency: "interaction",
      relationship: "constant",
    },
    id: "uniform-composite",
    inputs: ["effect.source"],
    invalidatedBy: ["effect.opacity", "effect.strength"],
    kind: "composite",
    lifecycle: { cache: "memoized", resourceScope: "renderer" },
    output: "preview",
    quality: "full",
    runsOn: "gpu",
    ...overrides,
  };
}

export function createInvalidation(
  overrides: Partial<ToolcraftInteractionInvalidation>,
): ToolcraftInteractionInvalidation {
  return {
    interaction: "control-drag",
    invalidates: ["uniform-composite"],
    targets: ["effect.opacity"],
    ...overrides,
  };
}

export function createConfig(options: {
  dimensions?: ToolcraftEnvelopePerformanceConfig["workloadEnvelope"]["dimensions"];
  interactions?: readonly ToolcraftInteractionInvalidation[];
  passes?: readonly ToolcraftRenderPass[];
  scenarios?: ToolcraftEnvelopePerformanceConfig["scenarios"];
} = {}): ToolcraftEnvelopePerformanceConfig {
  const rendererPipeline = registerToolcraftRendererPipeline<
    Record<string, ToolcraftRendererPipelinePassContract<unknown>>
  >()({
    interactionInvalidation: options.interactions ?? [
      createInvalidation({ targets: ["effect.opacity"] }),
      createInvalidation({ targets: ["effect.strength"] }),
    ],
    passes: options.passes ?? [createPass({})],
    runtimeId: "grouped-effect-renderer-v1",
  });

  return {
    rendererPipeline,
    rendererStrategy: "webgl",
    rendererTechnique: {
      exportRenderer: "webgl",
      fidelityRisks: ["The fixture must keep preview and export output equivalent."],
      performanceRisks: ["Interactive composite updates must remain GPU-backed."],
      previewRenderer: "webgl",
      productRepresentation: "pixel",
      rendererStrategy: "webgl",
      sourceRepresentation: "procedural-data",
      whyNotAlternativeStrategies: [
        "The fixture exercises an explicitly GPU-owned composite path.",
      ],
    },
    scenarios: options.scenarios ?? [],
    usesCustomRenderer: true,
    workloadEnvelope: { dimensions: options.dimensions ?? [] },
  };
}

export function createScenario(
  path: ToolcraftPerformancePath,
  overrides: Partial<
    Exclude<ToolcraftPerformanceScenario, { interaction: "export" }>
  > = {},
): Exclude<ToolcraftPerformanceScenario, { interaction: "export" }> {
  return {
    automated: true,
    automatedTestName: "perf: shared uniform drag stays responsive",
    browser: true,
    browserTestName: "browser perf: shared uniform drag stays responsive",
    controlLabel: "Opacity",
    coversTargets: path.targets,
    expectedObservable: "Dragging a uniform control keeps the preview responsive.",
    fixture: "combined uniform path fixture",
    id: "shared-uniform-drag",
    interaction: "control-drag",
    pathId: path.id,
    target: path.targets[0],
    ...overrides,
  };
}
