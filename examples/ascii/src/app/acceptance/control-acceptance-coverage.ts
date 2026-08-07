import {
  getToolcraftControlKeyframeCapability,
  type ResolvedToolcraftAppSchema,
  type ToolcraftControlSchema,
  type ToolcraftTimelineMode,
} from "@/toolcraft/runtime";

import { getRequiredToolcraftControlPartCoverage } from "./control-parts";
import {
  getBuiltInFitCheckErrors,
  isCustomToolcraftControl,
  requiredCustomControlCoverage,
} from "./custom-controls";
import {
  hasControlPartCoverage,
  hasCustomControlCoverage,
} from "./coverage";
import { getAcceptanceEvidenceText } from "./evidence";
import { getFileDropLifecycleCoverageErrors } from "./media-upload";
import {
  isOutputBackgroundToggleControl,
  schemaHasPngExportPanelAction,
} from "./output-export";
import type { ToolcraftComponentAcceptance } from "./types";

function getControlAcceptanceEntryErrors({
  control,
  entry,
  label,
}: {
  control: ToolcraftControlSchema;
  entry: ToolcraftComponentAcceptance;
  label: string;
}): string[] {
  const errors: string[] = [];

  if (!entry.automated) {
    errors.push(`${label} must have automated acceptance coverage.`);
  }

  if (!entry.browser) {
    errors.push(`${label} must have browser acceptance coverage.`);
  }

  if (entry.browser && !entry.browserTestName.trim()) {
    errors.push(`${label} must point to a browser test name.`);
  }

  if (!entry.expectedObservable.trim()) {
    errors.push(`${label} must describe a product-level observable.`);
  }

  if (!entry.automatedTestName.trim()) {
    errors.push(`${label} must point to an automated test name.`);
  }

  if (entry.componentType !== control.type) {
    errors.push(
      `${label} acceptance componentType must be "${control.type}", received "${entry.componentType}".`,
    );
  }

  return errors;
}

function getControlLifecycleAndCustomErrors({
  control,
  entry,
  label,
  schema,
}: {
  control: ToolcraftControlSchema;
  entry: ToolcraftComponentAcceptance;
  label: string;
  schema: ResolvedToolcraftAppSchema;
}): string[] {
  const errors: string[] = [];
  const isCustomControl = isCustomToolcraftControl(control);

  if (control.type === "fileDrop") {
    const hasDefaultMediaAssets = schema.media.defaultAssets.some(
      (asset) => asset.sourceTarget === control.target,
    );

    errors.push(
      ...getFileDropLifecycleCoverageErrors(
        label,
        control,
        entry,
        hasDefaultMediaAssets,
      ),
    );
  }

  if (
    isCustomControl &&
    !hasCustomControlCoverage(
      entry.customControlCoverage,
      requiredCustomControlCoverage,
    )
  ) {
    errors.push(
      `${label} is a custom control and must declare customControlCoverage for: ${requiredCustomControlCoverage.join(", ")}.`,
    );
  }

  if (isCustomControl) {
    errors.push(...getBuiltInFitCheckErrors(label, entry, control));
  }

  return errors;
}

function getControlEvidenceErrors({
  control,
  controlId,
  entry,
  label,
  schema,
  sectionTitle,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  entry: ToolcraftComponentAcceptance;
  label: string;
  schema: ResolvedToolcraftAppSchema;
  sectionTitle: string | undefined;
}): string[] {
  const errors: string[] = [];

  if (
    control.visibleWhen &&
    !/\b(visible|shown|show|appears|hidden|hide|hides|not visible|disappear|unavailable)\b/i.test(
      getAcceptanceEvidenceText(entry),
    )
  ) {
    errors.push(
      `${label} uses visibleWhen and acceptance must prove the control becomes visible and hidden/unavailable when ${control.visibleWhen.target} reaches the gating values.`,
    );
  }

  if (
    schemaHasPngExportPanelAction(schema) &&
    isOutputBackgroundToggleControl({ control, controlId, sectionTitle })
  ) {
    const evidenceText = getAcceptanceEvidenceText(entry);
    const provesPngTransparency =
      /\b(png|image)\b/i.test(evidenceText) &&
      /\b(transparent|transparency|alpha)\b/i.test(evidenceText);
    const provesPreviewTransparency =
      /\b(preview|canvas)\b/i.test(evidenceText) &&
      /\b(transparent|transparency|alpha|hide|hides|hidden|without background|no background|background off)\b/i.test(
        evidenceText,
      );
    const provesVideoBackground =
      /\bvideo\b/i.test(evidenceText) &&
      /\b(keep|keeps|preserve|preserves|stay|stays|remain|remains|still|background)\b/i.test(
        evidenceText,
      );

    if (!provesPngTransparency || !provesPreviewTransparency || !provesVideoBackground) {
      errors.push(
        `${label} controls background inclusion and acceptance must prove disabling it makes PNG output transparent, hides the live preview product background, and keeps video output with the product background.`,
      );
    }
  }

  return errors;
}

function getControlPartAndRuntimeCoverageErrors({
  control,
  entry,
  label,
  layersEnabled,
  timelineMode,
}: {
  control: ToolcraftControlSchema;
  entry: ToolcraftComponentAcceptance;
  label: string;
  layersEnabled: boolean;
  timelineMode: ToolcraftTimelineMode | null;
}): string[] {
  const errors: string[] = [];
  const keyframeCapability = getToolcraftControlKeyframeCapability(control);
  const isSelectedLayerTarget = control.target.startsWith("selectedLayer.");
  const requiredControlParts = getRequiredToolcraftControlPartCoverage(control);

  if (!hasControlPartCoverage(entry.controlPartCoverage, requiredControlParts)) {
    errors.push(
      `${label} must declare controlPartCoverage for every semantic value part: ${requiredControlParts.join(", ")}.`,
    );
  }

  if (timelineMode === "keyframes" && keyframeCapability.capable) {
    if (entry.timelineCoverage !== "keyframes") {
      errors.push(
        `${label} is keyframe-capable by Toolcraft control type and must have acceptance timelineCoverage "keyframes" proving its diamond creates/updates a keyframe row and changes evaluated output.`,
      );
    }
  }

  if (
    isSelectedLayerTarget &&
    layersEnabled &&
    entry.layerCoverage !== "selected-layer-controls"
  ) {
    errors.push(
      `${label} targets selectedLayer.* and must have acceptance layerCoverage "selected-layer-controls" proving the control edits the currently selected layer output.`,
    );
  }

  return errors;
}

export function getControlAcceptanceCoverageErrors({
  control,
  controlId,
  entry,
  label,
  layersEnabled,
  schema,
  sectionTitle,
  timelineMode,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  entry: ToolcraftComponentAcceptance;
  label: string;
  layersEnabled: boolean;
  schema: ResolvedToolcraftAppSchema;
  sectionTitle: string | undefined;
  timelineMode: ToolcraftTimelineMode | null;
}): string[] {
  return [
    ...getControlAcceptanceEntryErrors({ control, entry, label }),
    ...getControlLifecycleAndCustomErrors({ control, entry, label, schema }),
    ...getControlEvidenceErrors({
      control,
      controlId,
      entry,
      label,
      schema,
      sectionTitle,
    }),
    ...getControlPartAndRuntimeCoverageErrors({
      control,
      entry,
      label,
      layersEnabled,
      timelineMode,
    }),
  ];
}
