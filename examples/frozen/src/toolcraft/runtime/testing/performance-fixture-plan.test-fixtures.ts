import {
  defineToolcraftFixtureAdapter,
  deriveToolcraftPerformancePaths,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceContinuousFixtureAdapter,
  type ToolcraftPerformanceFixtureAdapter,
  type ToolcraftPerformanceFixtureInverseCheckpoint,
  type ToolcraftPerformancePath,
  type ToolcraftPipelineInteraction,
  type ToolcraftRenderPass,
  type ToolcraftWorkloadDimension,
} from "./performance";
import { groupedSchema } from "./performance-paths.test-fixtures";

export function createCanonicalAdapter(
  dimensionId: string,
  overrides: Partial<ToolcraftPerformanceContinuousFixtureAdapter<number>> = {},
) {
  return defineToolcraftFixtureAdapter({
    apply: (value: number) => value,
    dimensionId,
    observe: (value: number) => value,
    ...overrides,
  });
}

export function createCanonicalDimension(
  id: string,
  overrides: Partial<ToolcraftWorkloadDimension> = {},
): ToolcraftWorkloadDimension {
  return {
    batchMax: 200,
    defaultValue: 20,
    id,
    interactiveMax: 100,
    mapping: "direct",
    source: { kind: "runtime-state", path: `fixture.${id}` },
    unit: "units",
    ...overrides,
  };
}

export function createCanonicalPass(
  id: string,
  dimensions: readonly string[],
  relationship: NonNullable<ToolcraftRenderPass["cost"]>["relationship"],
): ToolcraftRenderPass {
  return {
    cost: { dimensions, frequency: "interaction", relationship },
    id,
    inputs: [],
    invalidatedBy: ["fixture.target"],
    kind: "composite",
    output: "preview",
    quality: "full",
    runsOn: "gpu",
  };
}

export function createCanonicalConfig(options: {
  adapters: Readonly<Record<string, ToolcraftPerformanceFixtureAdapter>>;
  dimensions: readonly ToolcraftWorkloadDimension[];
  interaction?: ToolcraftPipelineInteraction;
  inverseCheckpoints?: readonly ToolcraftPerformanceFixtureInverseCheckpoint[];
  passes: readonly ToolcraftRenderPass[];
}): ToolcraftEnvelopePerformanceConfig {
  const interaction = options.interaction ?? "control-drag";
  return {
    fixtureAdapters: {
      dimensions: options.adapters,
      inverseCheckpoints: options.inverseCheckpoints ?? [],
    },
    rendererPipeline: {
      interactionInvalidation: [
        {
          interaction,
          invalidates: options.passes.map((pass) => pass.id),
          targets: ["fixture.target"],
        },
      ],
      passes: options.passes,
    },
    rendererStrategy: "webgl",
    scenarios: [],
    usesCustomRenderer: true,
    workloadEnvelope: { dimensions: options.dimensions },
  };
}

export function getCanonicalPath(
  config: ToolcraftEnvelopePerformanceConfig,
): ToolcraftPerformancePath {
  const paths = deriveToolcraftPerformancePaths(groupedSchema, config);
  if (paths.length !== 1) {
    throw new Error(`Expected one canonical fixture path; received ${paths.length}.`);
  }
  return paths[0]!;
}

export function withCanonicalEvidence(
  config: ToolcraftEnvelopePerformanceConfig,
  checkpoints: readonly Omit<ToolcraftPerformanceFixtureInverseCheckpoint, "pathId">[],
): ToolcraftEnvelopePerformanceConfig {
  const path = getCanonicalPath(config);
  return {
    ...config,
    fixtureAdapters: {
      ...config.fixtureAdapters!,
      inverseCheckpoints: checkpoints.map((checkpoint) => ({
        ...checkpoint,
        pathId: path.id,
      })),
    },
  };
}
