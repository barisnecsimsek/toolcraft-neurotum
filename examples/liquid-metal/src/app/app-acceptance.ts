import { getToolcraftControlKeyframeCapability } from "@/toolcraft/runtime";
import type {
  ResolvedToolcraftAppSchema,
} from "@/toolcraft/runtime";

import { getToolcraftAnimationIntentErrors } from "./acceptance/animation-intent";
import {
  appAcceptance,
  starterControlSectionInventory,
  appProductReadiness,
  appTransferMode,
} from "./acceptance/defaults";
import type {
  ToolcraftAcceptanceEvidence,
  ToolcraftAnimationIntent,
  ToolcraftAutonomousAnimationCoverage,
  ToolcraftBuiltInControlType,
  ToolcraftBuiltInFitCheck,
  ToolcraftCanvasSizingCoverage,
  ToolcraftComponentAcceptance,
  ToolcraftControlOrderItem,
  ToolcraftControlPartCoverage,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftCustomControlCoverage,
  ToolcraftLayerCoverage,
  ToolcraftPersistenceCoverage,
  ToolcraftProductReadiness,
  ToolcraftReferenceCoverage,
  ToolcraftReferenceFeatureInventoryItem,
  ToolcraftReferenceFeatureStatus,
  ToolcraftReferenceStudyEvidence,
  ToolcraftReferenceStudyStatus,
  ToolcraftReferenceTimelineCoverage,
  ToolcraftReferenceTimelineContract,
  ToolcraftReferenceTimelineMode,
  ToolcraftSettingsTransferCoverage,
  ToolcraftTimelineLoopDurationIntent,
  ToolcraftTimelineLoopDurationSource,
  ToolcraftTimelinePlaybackCoverage,
  ToolcraftTransferMode,
  ToolcraftVideoReferenceAcceptanceMapping,
  ToolcraftVideoReferenceStoryboardFrame,
  ToolcraftVideoReferenceStudyEvidence,
  ToolcraftVideoReferenceTransition,
  ToolcraftVisibleControl,
} from "./acceptance/types";
import { getRequiredToolcraftControlPartCoverage } from "./acceptance/control-parts";
import { isToolcraftVisibleAcceptanceControl } from "./acceptance/controls";
import { getToolcraftControlAcceptanceErrors } from "./acceptance/control-acceptance";
import {
  getToolcraftControlOrder as getToolcraftControlOrderForSchema,
  getToolcraftControlOrderErrors,
  getToolcraftControlOrderTargets as getToolcraftControlOrderTargetsForSchema,
  inferToolcraftControlOrderRole,
} from "./acceptance/control-order";
import {
  getToolcraftControlSectionGroupingErrors,
} from "./acceptance/control-layout";
import { getToolcraftControlSectionInventoryErrors } from "./acceptance/control-section-inventory";
import {
  getToolcraftInlineLayoutErrors,
} from "./acceptance/inline-layout";
import {
  getToolcraftOutputExportErrors,
  schemaHasVideoExportPanelAction,
} from "./acceptance/output-export";
import { getToolcraftRuntimeSetupSectionErrors } from "./acceptance/runtime-setup";
import {
  getToolcraftCanvasSizingCoverageErrors,
  getToolcraftTimelineKeyframeCoverageErrors,
  getToolcraftLayerCoverageErrors,
  getToolcraftPersistenceCoverageErrors,
  getToolcraftTimelinePlaybackCoverageErrors,
} from "./acceptance/runtime-coverage";
import { getToolcraftReferenceRuntimeCloneErrors } from "./acceptance/reference-runtime";
import {
  getToolcraftVideoReferenceStudyErrors,
} from "./acceptance/video-reference-study";
import {
  runToolcraftAcceptanceValidators,
  type ToolcraftAcceptanceValidationContext,
  type ToolcraftAcceptanceValidator,
} from "./acceptance/validation-pipeline";
import { appSchema } from "./app-schema";

export {
  appAcceptance,
  starterControlSectionInventory,
  appProductReadiness,
  appTransferMode,
};
export type {
  ToolcraftAcceptanceEvidence,
  ToolcraftAnimationIntent,
  ToolcraftAutonomousAnimationCoverage,
  ToolcraftBuiltInControlType,
  ToolcraftBuiltInFitCheck,
  ToolcraftCanvasSizingCoverage,
  ToolcraftComponentAcceptance,
  ToolcraftControlOrderItem,
  ToolcraftControlPartCoverage,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftCustomControlCoverage,
  ToolcraftLayerCoverage,
  ToolcraftPersistenceCoverage,
  ToolcraftProductReadiness,
  ToolcraftReferenceCoverage,
  ToolcraftReferenceFeatureInventoryItem,
  ToolcraftReferenceFeatureStatus,
  ToolcraftReferenceStudyEvidence,
  ToolcraftReferenceStudyStatus,
  ToolcraftReferenceTimelineContract,
  ToolcraftReferenceTimelineCoverage,
  ToolcraftReferenceTimelineMode,
  ToolcraftSettingsTransferCoverage,
  ToolcraftTimelineLoopDurationIntent,
  ToolcraftTimelineLoopDurationSource,
  ToolcraftTimelinePlaybackCoverage,
  ToolcraftTransferMode,
  ToolcraftVideoReferenceAcceptanceMapping,
  ToolcraftVideoReferenceStoryboardFrame,
  ToolcraftVideoReferenceStudyEvidence,
  ToolcraftVideoReferenceTransition,
  ToolcraftVisibleControl,
};
export { inferToolcraftControlOrderRole };

export { getRequiredToolcraftControlPartCoverage };

export function collectToolcraftVisibleControls(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftVisibleControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(([, control]) => isToolcraftVisibleAcceptanceControl(control))
      .map(([controlId, control]) => ({
        control,
        controlId,
        sectionTitle: section.title,
      })),
  );
}

export function collectToolcraftKeyframeableControls(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftVisibleControl[] {
  return collectToolcraftVisibleControls(schema).filter(
    ({ control }) => getToolcraftControlKeyframeCapability(control).capable,
  );
}

export function getToolcraftControlOrder(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftControlOrderItem[] {
  return getToolcraftControlOrderForSchema(schema);
}

export function getToolcraftControlOrderTargets(
  schema: ResolvedToolcraftAppSchema = appSchema,
): string[] {
  return getToolcraftControlOrderTargetsForSchema(schema);
}

function createToolcraftAcceptanceValidationContext({
  acceptance,
  schema,
  sectionInventory,
  transferMode,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  schema: ResolvedToolcraftAppSchema;
  sectionInventory: readonly ToolcraftControlSectionInventoryEntry[];
  transferMode: ToolcraftTransferMode;
}): ToolcraftAcceptanceValidationContext {
  const controls = collectToolcraftVisibleControls(schema);

  return {
    acceptance,
    controls,
    hasVideoExportAction: schemaHasVideoExportPanelAction(schema),
    layersEnabled: Boolean(schema.panels.layers),
    schema,
    sectionInventory,
    timelineMode: schema.panels.timeline?.enabled ? schema.panels.timeline.mode : null,
    transferMode,
  };
}

const toolcraftAcceptanceValidators: readonly ToolcraftAcceptanceValidator[] = [
  ({ schema }) => getToolcraftRuntimeSetupSectionErrors(schema),
  ({ schema }) => getToolcraftControlOrderErrors(schema),
  ({ schema, sectionInventory }) =>
    getToolcraftControlSectionGroupingErrors(schema, sectionInventory),
  ({ schema, sectionInventory }) =>
    getToolcraftControlSectionInventoryErrors(schema, sectionInventory),
  ({ schema }) => getToolcraftInlineLayoutErrors(schema),
  ({ controls, hasVideoExportAction, schema }) =>
    getToolcraftOutputExportErrors({
      controls,
      hasVideoExportAction,
      schema,
    }),
  getToolcraftVideoReferenceStudyErrors,
  getToolcraftAnimationIntentErrors,
  ({ acceptance, schema, timelineMode, transferMode }) =>
    getToolcraftReferenceRuntimeCloneErrors({
      acceptance,
      schema,
      timelineMode,
      transferMode,
    }),
  ({ acceptance, layersEnabled }) =>
    getToolcraftLayerCoverageErrors({ acceptance, layersEnabled }),
  ({ acceptance, timelineMode }) =>
    getToolcraftTimelinePlaybackCoverageErrors({ acceptance, timelineMode }),
  ({ acceptance, timelineMode }) =>
    getToolcraftTimelineKeyframeCoverageErrors({ acceptance, timelineMode }),
  ({ acceptance, schema }) =>
    getToolcraftCanvasSizingCoverageErrors({ acceptance, schema }),
  ({ acceptance, schema }) =>
    getToolcraftPersistenceCoverageErrors({ acceptance, schema }),
  ({ acceptance, controls, layersEnabled, schema, timelineMode }) =>
    getToolcraftControlAcceptanceErrors({
      acceptance,
      controls,
      layersEnabled,
      schema,
      timelineMode,
    }),
];

export function validateToolcraftAcceptanceCoverage(
  schema: ResolvedToolcraftAppSchema = appSchema,
  acceptance: readonly ToolcraftComponentAcceptance[] = appAcceptance,
  transferMode?: ToolcraftTransferMode,
  sectionInventory?: readonly ToolcraftControlSectionInventoryEntry[],
): string[] {
  const validatesCurrentProduct = schema === appSchema && acceptance === appAcceptance;
  const resolvedTransferMode =
    transferMode ?? (validatesCurrentProduct ? appTransferMode : { mode: "new-toolcraft-app" });
  const resolvedSectionInventory =
    sectionInventory ?? (validatesCurrentProduct ? starterControlSectionInventory : []);

  return runToolcraftAcceptanceValidators(
    createToolcraftAcceptanceValidationContext({
      acceptance,
      schema,
      sectionInventory: resolvedSectionInventory,
      transferMode: resolvedTransferMode,
    }),
    toolcraftAcceptanceValidators,
  );
}
