import type {
  ResolvedToolcraftAppSchema,
  ToolcraftTimelineMode,
} from "@/toolcraft/runtime";

import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftTransferMode,
  ToolcraftVisibleControl,
} from "./types";

export type ToolcraftAcceptanceValidationContext = {
  acceptance: readonly ToolcraftComponentAcceptance[];
  controls: readonly ToolcraftVisibleControl[];
  hasVideoExportAction: boolean;
  layersEnabled: boolean;
  schema: ResolvedToolcraftAppSchema;
  sectionInventory: readonly ToolcraftControlSectionInventoryEntry[];
  timelineMode: ToolcraftTimelineMode | null;
  transferMode: ToolcraftTransferMode;
};

export type ToolcraftAcceptanceValidator = (
  context: ToolcraftAcceptanceValidationContext,
) => string[];

export function runToolcraftAcceptanceValidators(
  context: ToolcraftAcceptanceValidationContext,
  validators: readonly ToolcraftAcceptanceValidator[],
): string[] {
  return validators.flatMap((validator) => validator(context));
}
