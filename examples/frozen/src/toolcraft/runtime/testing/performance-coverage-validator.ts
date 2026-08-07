import type { ResolvedToolcraftAppSchema } from "../schema/types";
import type { ToolcraftPerformanceConfig } from "./performance-types";
import { createToolcraftEnvelopeValidationContext } from "./performance-envelope-validation-context";
import { getToolcraftPerformanceFixtureAdapterErrors } from "./performance-fixture-adapters";
import { getToolcraftSchemaDiscreteSnapshotErrors } from "./performance-fixture-discrete-adapters";
import { getToolcraftPerformancePathCoverageErrors } from "./performance-path-coverage-policy";
import { getToolcraftPerformanceProfileErrors } from "./performance-profile-validation";
import { getRendererTechniqueErrors } from "./performance-renderer-technique-validation";
import { getToolcraftWorkloadEnvelopeErrorsForContext } from "./performance-workload-envelope-validation";
import { getRendererPipelineErrorsForEnvelopeContext } from "./performance-renderer-pipeline-validation";

export function validateToolcraftPerformanceCoverage(
  schema: ResolvedToolcraftAppSchema,
  config: ToolcraftPerformanceConfig,
): string[] {
  const initialContext = createToolcraftEnvelopeValidationContext(schema, config);
  const workloadEnvelopeErrors =
    getToolcraftWorkloadEnvelopeErrorsForContext(initialContext);
  const context = {
    ...initialContext,
    workloadEnvelopeValid: workloadEnvelopeErrors.length === 0,
  };
  return [
    ...workloadEnvelopeErrors,
    ...getRendererTechniqueErrors(config),
    ...getRendererPipelineErrorsForEnvelopeContext(context),
    ...getToolcraftPerformanceProfileErrors(context.paths),
    ...getToolcraftPerformancePathCoverageErrors(context),
    ...(Object.prototype.hasOwnProperty.call(config, "fixtureAdapters") &&
    context.workloadEnvelopeValid
      ? getToolcraftPerformanceFixtureAdapterErrors(config, context.paths)
      : []),
    ...(context.workloadEnvelopeValid
      ? getToolcraftSchemaDiscreteSnapshotErrors(schema, config)
      : []),
  ];
}
