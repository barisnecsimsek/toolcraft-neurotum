import type {
  ResolvedToolcraftAppSchema,
  ToolcraftTimelineMode,
} from "@/toolcraft/runtime";

import {
  hasTimelinePlaybackCoverage,
  hasTimelinePlaybackCoveragePart,
} from "./coverage";
import { getAcceptanceEvidenceText } from "./evidence";
import {
  schemaHasPngExportPanelAction,
  schemaHasVideoExportPanelAction,
} from "./output-export";
import { hasSeamlessForwardLoopEvidence } from "./timeline-loop";
import type {
  ToolcraftComponentAcceptance,
  ToolcraftLayerCoverage,
  ToolcraftTimelinePlaybackCoverage,
} from "./types";

const insufficientFixedCanvasSizingReasonPattern =
  /\b(no|without|missing|lacks?|does\s+not\s+(?:have|expose)|did\s+not\s+(?:have|expose)|has\s+no|had\s+no)\b[^.]{0,80}\b(?:size|dimension|canvas|output)\b[^.]{0,80}\b(?:editor|controls?|settings?|picker|input|ui)\b|\breference\s+app\b[^.]{0,120}\b(?:no|without|missing|lacks?|does\s+not\s+(?:have|expose)|did\s+not\s+(?:have|expose)|has\s+no|had\s+no)\b[^.]{0,80}\b(?:size|dimension|canvas|output)\b/i;

const requiredLayerCoverage = [
  "selection",
  "visibility",
  "reorder",
  "grouping",
] satisfies readonly ToolcraftLayerCoverage[];

const requiredTimelinePlaybackCoverage = [
  "pause-resume",
  "scrub",
  "duration",
  "loop",
  "rendered-frame",
] satisfies readonly ToolcraftTimelinePlaybackCoverage[];

export function getToolcraftLayerCoverageErrors({
  acceptance,
  layersEnabled,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  layersEnabled: boolean;
}): string[] {
  const errors: string[] = [];

  if (layersEnabled) {
    for (const coverage of requiredLayerCoverage) {
      const entry = acceptance.find(
        (acceptanceEntry) =>
          acceptanceEntry.kind === "runtime" && acceptanceEntry.layerCoverage === coverage,
      );

      if (!entry) {
        errors.push(
          `panels.layers requires a runtime acceptance entry with layerCoverage "${coverage}" proving layer ${coverage} behavior.`,
        );
        continue;
      }

      if (!entry.automated || !entry.automatedTestName.trim()) {
        errors.push(`${entry.id} must have automated coverage proving layer ${coverage}.`);
      }

      if (!entry.browser || !entry.browserTestName.trim()) {
        errors.push(`${entry.id} must have browser coverage proving layer ${coverage}.`);
      }

      if (!entry.expectedObservable.trim()) {
        errors.push(
          `${entry.id} must describe the observable layer behavior for "${coverage}".`,
        );
      }
    }
  } else {
    for (const entry of acceptance) {
      if (entry.layerCoverage) {
        errors.push(
          `${entry.id} declares layerCoverage "${entry.layerCoverage}" but panels.layers is not enabled.`,
        );
      }
    }
  }

  return errors;
}

export function getToolcraftTimelinePlaybackCoverageErrors({
  acceptance,
  timelineMode,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  timelineMode: ToolcraftTimelineMode | null;
}): string[] {
  const errors: string[] = [];

  if (!timelineMode) {
    return errors;
  }

  const playbackEntry = acceptance.find(
    (entry) => entry.kind === "runtime" && entry.timelineCoverage === "playback",
  );

  if (!playbackEntry) {
    errors.push(
      `panels.timeline mode "${timelineMode}" requires a runtime acceptance entry with timelineCoverage "playback" proving pause, scrub, duration/loop, and rendered-frame behavior.`,
    );
    return errors;
  }

  if (
    !hasTimelinePlaybackCoverage(
      playbackEntry.timelinePlaybackCoverage,
      requiredTimelinePlaybackCoverage,
    )
  ) {
    errors.push(
      `${playbackEntry.id} timelineCoverage "playback" must declare timelinePlaybackCoverage for pause-resume, scrub, duration, loop, and rendered-frame. Duration coverage must prove renderer progress maps 0..state.timeline.durationSeconds, not a local fixed animation duration.`,
    );
    return errors;
  }

  const playbackEvidenceText = [
    playbackEntry.automatedTestName,
    playbackEntry.browserTestName,
    playbackEntry.expectedObservable,
    playbackEntry.userAction,
  ].join(" ");

  if (
    hasTimelinePlaybackCoveragePart(playbackEntry.timelinePlaybackCoverage, "duration") &&
    (!/\bduration\b/i.test(playbackEvidenceText) ||
      !/\b(edit|change|commit|enter|set)\w*\b/i.test(playbackEvidenceText))
  ) {
    errors.push(
      `${playbackEntry.id} timelinePlaybackCoverage "duration" must describe editing/changing the timeline duration through the UI and proving the renderer follows state.timeline.durationSeconds.`,
    );
  }

  if (
    hasTimelinePlaybackCoveragePart(playbackEntry.timelinePlaybackCoverage, "loop") &&
    !hasSeamlessForwardLoopEvidence(playbackEvidenceText)
  ) {
    errors.push(
      `${playbackEntry.id} timelinePlaybackCoverage "loop" must prove a seamless forward-only product loop: motion advances in one direction, avoids mirror/yoyo/ping-pong/reverse fallbacks, first and last frames stitch without a visible jump, and the same seam holds after changing timeline duration.`,
    );
  }

  return errors;
}

export function getToolcraftTimelineKeyframeCoverageErrors({
  acceptance,
  timelineMode,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  timelineMode: ToolcraftTimelineMode | null;
}): string[] {
  if (timelineMode !== "keyframes") {
    return [];
  }

  const hasKeyframesCoverage = acceptance.some(
    (entry) => entry.kind === "runtime" && entry.timelineCoverage === "keyframes",
  );

  if (hasKeyframesCoverage) {
    return [];
  }

  return [
    'panels.timeline mode "keyframes" requires a runtime acceptance entry with timelineCoverage "keyframes" proving expanded rows, diamonds, keyframe mutation, and renderer evaluation.',
  ];
}

export function getToolcraftCanvasSizingCoverageErrors({
  acceptance,
  schema,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  schema: ResolvedToolcraftAppSchema;
}): string[] {
  const errors: string[] = [];

  if (schema.canvas.sizing.mode === "fixed-output") {
    if (schemaHasPngExportPanelAction(schema) || schemaHasVideoExportPanelAction(schema)) {
      errors.push(
        'Product/output apps with export actions must use canvas.sizing mode "editable-output" so Aspect ratio, Canvas width, and Canvas height are always available. Put reference, fixed-format, or user-requested dimensions in canvas.size as the initial value instead of hiding size controls with "fixed-output".',
      );
    }

    const fixedCanvasSizingEntry = acceptance.find(
      (entry) =>
        entry.kind === "runtime" &&
        entry.canvasSizingCoverage === "fixed-output-size",
    );

    if (!fixedCanvasSizingEntry) {
      errors.push(
        'canvas.sizing mode "fixed-output" requires a runtime acceptance entry with canvasSizingCoverage "fixed-output-size" explaining why width and height are intentionally non-editable. Product/output apps must use "editable-output"; user-provided, reference, fixed-format, or base/default sizes belong in canvas.size as editable initial values.',
      );
    } else {
      const evidenceText = getAcceptanceEvidenceText(fixedCanvasSizingEntry);

      if (!/(fixed|locked|non-editable|not user-editable|must not edit|reference-defined|product-defined)/i.test(evidenceText)) {
        errors.push(
          `${fixedCanvasSizingEntry.id} canvasSizingCoverage "fixed-output-size" must explain why the output dimensions are intentionally fixed for a non-product/internal fixture, not merely initialized from a default size.`,
        );
      }

      if (insufficientFixedCanvasSizingReasonPattern.test(evidenceText)) {
        errors.push(
          `${fixedCanvasSizingEntry.id} canvasSizingCoverage "fixed-output-size" cannot be justified by the reference or previous app lacking a size editor. Exportable product apps must use editable-output; put reference, product-defined, or fixed-format dimensions in canvas.size as initial values instead of hiding size controls.`,
        );
      }

      if (!fixedCanvasSizingEntry.automated || !fixedCanvasSizingEntry.automatedTestName.trim()) {
        errors.push(
          `${fixedCanvasSizingEntry.id} must have automated coverage proving fixed output dimensions.`,
        );
      }

      if (!fixedCanvasSizingEntry.browser || !fixedCanvasSizingEntry.browserTestName.trim()) {
        errors.push(
          `${fixedCanvasSizingEntry.id} must have browser coverage proving fixed output dimensions.`,
        );
      }
    }
  }

  if (
    schema.canvas.enabled &&
    schema.canvas.upload &&
    schema.canvas.sizing.mode === "intrinsic-media"
  ) {
    const intrinsicCanvasSizingEntry = acceptance.find(
      (entry) =>
        entry.kind === "runtime" &&
        entry.canvasSizingCoverage === "intrinsic-media-size",
    );

    if (!intrinsicCanvasSizingEntry) {
      errors.push(
        'canvas.sizing mode "intrinsic-media" with upload requires a runtime acceptance entry with canvasSizingCoverage "intrinsic-media-size" proving the app is a true media-viewer/source-native product where imported media natural dimensions intentionally own canvas.size. Uploaded background/source images inside product canvases must use "editable-output" and keep the current canvas size.',
      );
    } else {
      const evidenceText = getAcceptanceEvidenceText(intrinsicCanvasSizingEntry);

      if (
        !/(media[- ]viewer|source[- ]native|natural dimension|natural size|intrinsic media|intrinsic size|media owns canvas|canvas\.size)/i.test(
          evidenceText,
        )
      ) {
        errors.push(
          `${intrinsicCanvasSizingEntry.id} canvasSizingCoverage "intrinsic-media-size" must explain why uploaded media natural dimensions intentionally own canvas.size instead of behaving as background/source material inside the current editable output canvas.`,
        );
      }

      if (!intrinsicCanvasSizingEntry.automated || !intrinsicCanvasSizingEntry.automatedTestName.trim()) {
        errors.push(
          `${intrinsicCanvasSizingEntry.id} must have automated coverage proving intrinsic media sizing.`,
        );
      }

      if (!intrinsicCanvasSizingEntry.browser || !intrinsicCanvasSizingEntry.browserTestName.trim()) {
        errors.push(
          `${intrinsicCanvasSizingEntry.id} must have browser coverage proving intrinsic media sizing.`,
        );
      }
    }
  }

  return errors;
}

export function getToolcraftPersistenceCoverageErrors({
  acceptance,
  schema,
}: {
  acceptance: readonly ToolcraftComponentAcceptance[];
  schema: ResolvedToolcraftAppSchema;
}): string[] {
  const errors: string[] = [];

  if (schema.persistence.storage !== "localStorage") {
    return errors;
  }

  const persistenceEntry = acceptance.find(
    (entry) =>
      entry.kind === "runtime" &&
      entry.persistenceCoverage === "reload",
  );

  if (!persistenceEntry) {
    errors.push(
      'persistence.storage "localStorage" requires a runtime acceptance entry with persistenceCoverage "reload" proving user-edited persisted state restores after a real browser reload. Settings import/export is not a substitute for persistence.',
    );
    return errors;
  }

  const evidenceText = getAcceptanceEvidenceText(persistenceEntry);

  if (!persistenceEntry.automated || !persistenceEntry.automatedTestName.trim()) {
    errors.push(
      `${persistenceEntry.id} must have automated coverage proving persistence reload behavior.`,
    );
  }

  if (!persistenceEntry.browser || !persistenceEntry.browserTestName.trim()) {
    errors.push(
      `${persistenceEntry.id} must have browser coverage proving persistence reload behavior.`,
    );
  }

  if (!persistenceEntry.expectedObservable.trim()) {
    errors.push(
      `${persistenceEntry.id} must describe the persisted state observable after reload.`,
    );
  }

  if (!/\b(reload|refresh|reopen|page\.reload)\b/i.test(evidenceText)) {
    errors.push(
      `${persistenceEntry.id} persistenceCoverage "reload" must describe changing a user-facing setting, reloading the browser page, and observing the restored value/output.`,
    );
  }

  return errors;
}
