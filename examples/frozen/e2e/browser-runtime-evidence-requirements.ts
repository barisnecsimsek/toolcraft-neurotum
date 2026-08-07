import type {
  ResolvedToolcraftAppSchema,
  ToolcraftPerformancePath,
} from "@/toolcraft/runtime";

import type { ToolcraftBrowserRuntimeRequirement } from "../src/app/test-evidence/browser-runtime-contract";
import { schemaHasVideoExportPanelAction } from "../src/app/acceptance/output-export";
import {
  getRequiredToolcraftControlPartCoverage,
  type ToolcraftBackgroundOutputCoverage,
  type ToolcraftComponentAcceptance,
  type ToolcraftConditionalVisibilityCoverage,
  type ToolcraftOrientationGizmoCoverage,
  type ToolcraftTimelinePlaybackCoverage,
} from "../src/app/app-acceptance";
import { getToolcraftPerformancePathTestName } from "./performance-path-helpers";

type BrowserAcceptanceRequirementSource = Pick<
  ToolcraftComponentAcceptance,
  | "browser"
  | "browserTestName"
  | "backgroundOutputCoverage"
  | "canvasHandle"
  | "controlPartCoverage"
  | "evidence"
  | "id"
  | "layerCoverage"
  | "orientationGizmoCoverage"
  | "referenceCoverage"
  | "referenceTimelineCoverage"
  | "target"
  | "timelineCoverage"
  | "timelinePlaybackCoverage"
  | "visibilityCoverage"
>;

type BrowserSchemaRequirementSource = Pick<ResolvedToolcraftAppSchema, "panels">;

function getAcceptanceEvidenceType(
  evidence: ToolcraftComponentAcceptance["evidence"],
): ToolcraftBrowserRuntimeRequirement["evidenceType"] | undefined {
  switch (evidence) {
    case "product-output":
    case "rendered-pixels":
    case "timeline-output":
      return "product-observable-change";
    case "exported-bytes":
      return "exported-artifact";
    case "command-side-effect":
    case "media-lifecycle":
    case "persistence-state":
    case "viewport-side-effect":
      return evidence;
    default:
      return undefined;
  }
}

const layerEvidenceTypeByCoverage = {
  grouping: "layer-grouping",
  "media-lifecycle": "layer-media-lifecycle",
  reorder: "layer-reorder",
  "selected-layer-controls": "layer-selected-layer-controls",
  selection: "layer-selection",
  visibility: "layer-visibility",
} as const satisfies Record<
  NonNullable<ToolcraftComponentAcceptance["layerCoverage"]>,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const timelineEvidenceTypeByCoverage = {
  duration: "timeline-duration",
  loop: "timeline-loop",
  "pause-resume": "timeline-pause-resume",
  "rendered-frame": "timeline-rendered-frame",
  scrub: "timeline-scrub",
} as const satisfies Record<
  ToolcraftTimelinePlaybackCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const timelinePlaybackCoverage = Object.keys(
  timelineEvidenceTypeByCoverage,
) as Array<keyof typeof timelineEvidenceTypeByCoverage>;

const conditionalVisibilityEvidenceTypeByCoverage = {
  hidden: "conditional-control-hidden",
  visible: "conditional-control-visible",
} as const satisfies Record<
  ToolcraftConditionalVisibilityCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const conditionalVisibilityCoverage = Object.keys(
  conditionalVisibilityEvidenceTypeByCoverage,
) as ToolcraftConditionalVisibilityCoverage[];

const backgroundOutputEvidenceTypeByCoverage = {
  "image-transparent-when-excluded": "background-image-transparency",
  "preview-hidden-when-excluded": "background-preview-exclusion",
  "video-background-preserved": "background-video-preserved",
} as const satisfies Record<
  ToolcraftBackgroundOutputCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const backgroundOutputCoverage = Object.keys(
  backgroundOutputEvidenceTypeByCoverage,
) as ToolcraftBackgroundOutputCoverage[];

const orientationEvidenceTypeByCoverage = {
  "axis-drag": "orientation-axis-drag",
  "axis-snap": "orientation-axis-snap",
  "canvas-miss-pan": "orientation-canvas-miss-pan",
  "export-clean": "canvas-export-clean",
  "model-drag": "orientation-model-drag",
  "shared-pose-output": "orientation-shared-pose-output",
  "undo-reset": "orientation-undo-reset",
} as const satisfies Record<
  ToolcraftOrientationGizmoCoverage,
  ToolcraftBrowserRuntimeRequirement["evidenceType"]
>;

const orientationGizmoCoverage = Object.keys(
  orientationEvidenceTypeByCoverage,
) as ToolcraftOrientationGizmoCoverage[];

export function deriveToolcraftBrowserRuntimeRequirements(
  acceptance: readonly BrowserAcceptanceRequirementSource[],
  schema?: BrowserSchemaRequirementSource,
): ToolcraftBrowserRuntimeRequirement[] {
  const controlsByTarget = new Map(
    (schema?.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls).flatMap((control) =>
        control.target ? [[control.target, control] as const] : [],
      ),
    ),
  );

  return acceptance.flatMap((entry) => {
    if (!entry.browser) return [];

    const target = entry.target ?? entry.canvasHandle?.writesTarget;
    const control = target ? controlsByTarget.get(target) : undefined;
    const hasOrientationCoverage =
      entry.orientationGizmoCoverage !== undefined;
    const evidenceTypes: ToolcraftBrowserRuntimeRequirement["evidenceType"][] = [];
    const baseEvidenceType = getAcceptanceEvidenceType(entry.evidence);
    if (baseEvidenceType) evidenceTypes.push(baseEvidenceType);

    if (entry.canvasHandle && !hasOrientationCoverage) {
      evidenceTypes.push("canvas-handle-interaction");
    }
    if (entry.timelineCoverage === "keyframes") {
      evidenceTypes.push("timeline-keyframes");
    }
    if (entry.timelineCoverage === "playback") {
      const coverage =
        entry.timelinePlaybackCoverage === "all-playback-behavior"
          ? timelinePlaybackCoverage
          : entry.timelinePlaybackCoverage ?? [];
      evidenceTypes.push(
        ...coverage.map((item) => timelineEvidenceTypeByCoverage[item]),
      );
    }
    if (entry.layerCoverage) {
      evidenceTypes.push(layerEvidenceTypeByCoverage[entry.layerCoverage]);
    }
    if (entry.referenceCoverage || entry.referenceTimelineCoverage) {
      evidenceTypes.push("reference-parity");
    }
    const visibilityCoverage =
      entry.visibilityCoverage === "all-conditional-visibility"
        ? conditionalVisibilityCoverage
        : entry.visibilityCoverage ?? [];
    evidenceTypes.push(
      ...visibilityCoverage.map(
        (item) => conditionalVisibilityEvidenceTypeByCoverage[item],
      ),
    );
    const backgroundCoverage =
      entry.backgroundOutputCoverage === "all-required-background-output"
        ? backgroundOutputCoverage.filter(
            (item) =>
              item !== "video-background-preserved" ||
              (schema ? schemaHasVideoExportPanelAction(schema) : false),
          )
        : entry.backgroundOutputCoverage ?? [];
    evidenceTypes.push(
      ...backgroundCoverage.map(
        (item) => backgroundOutputEvidenceTypeByCoverage[item],
      ),
    );

    if (control?.type === "segmented") {
      evidenceTypes.push("segmented-control-layout");
    }
    if (
      (control?.type === "slider" || control?.type === "rangeSlider") &&
      control.variant === "discrete"
    ) {
      evidenceTypes.push("discrete-slider-layout");
    }

    const requirements = [...new Set(evidenceTypes)].map((evidenceType) => ({
      evidenceType,
      requirementId: entry.id,
      target,
      testName: entry.browserTestName,
    }));

    const orientationCoverage =
      entry.orientationGizmoCoverage ===
      "all-required-orientation-gizmo-behavior"
        ? orientationGizmoCoverage
        : entry.orientationGizmoCoverage ?? [];
    for (const item of orientationCoverage) {
      requirements.push({
        evidenceType: orientationEvidenceTypeByCoverage[item],
        requirementId: `${entry.id}#${item}`,
        target,
        testName:
          item === "export-clean"
            ? (entry.canvasHandle?.exportCleanTestName ?? entry.browserTestName)
            : entry.browserTestName,
      });
    }
    const controlParts =
      entry.controlPartCoverage === "all-visible-parts"
        ? control
          ? getRequiredToolcraftControlPartCoverage(control)
          : []
        : entry.controlPartCoverage ?? [];
    for (const part of controlParts) {
      requirements.push({
        evidenceType: "compound-control-part",
        requirementId: `${entry.id}#${part}`,
        target: entry.target,
        testName: entry.browserTestName,
      });
    }
    if (entry.canvasHandle && !hasOrientationCoverage) {
      requirements.push({
        evidenceType: "canvas-export-clean",
        requirementId: entry.id,
        target: entry.canvasHandle.writesTarget,
        testName: entry.canvasHandle.exportCleanTestName,
      });
    }
    return requirements;
  });
}

const pathProductOutcomeInteractions = new Set<ToolcraftPerformancePath["interaction"]>([
  "control-change",
  "control-drag",
  "mask-drag",
  "media-import",
  "timeline-playback",
  "timeline-scrub",
]);

export function deriveToolcraftPerformancePathRuntimeRequirements(
  paths: readonly ToolcraftPerformancePath[],
): ToolcraftBrowserRuntimeRequirement[] {
  return paths.flatMap((path) => {
    const evidenceTypes: ToolcraftBrowserRuntimeRequirement["evidenceType"][] = [
      "performance-measurement",
      "performance-budget",
    ];
    if (pathProductOutcomeInteractions.has(path.interaction)) {
      evidenceTypes.push("performance-product-outcome");
    }
    if (path.workloadDimensions.length > 0) {
      evidenceTypes.push("performance-compiled-fixture");
    }
    if (path.interaction === "export") {
      evidenceTypes.push("performance-output-completion");
    }
    if (path.interaction === "control-drag" || path.interaction === "mask-drag") {
      evidenceTypes.push("performance-control-drag");
    }
    if (path.interaction === "animation-frame") {
      evidenceTypes.push("performance-animation-frames");
    }
    if (path.interaction === "viewport-drag" || path.interaction === "viewport-zoom") {
      evidenceTypes.push("performance-viewport");
    }
    if (
      path.targets.includes("canvas.renderScale") ||
      path.workloadDimensions.some((dimension) =>
        /render[-_.]?scale|resolution[-_.]?scale/iu.test(dimension),
      )
    ) {
      evidenceTypes.push("performance-render-scale");
    }

    const target = path.targets.length === 1 ? path.targets[0] : undefined;
    return evidenceTypes.map((evidenceType) => ({
      evidenceType,
      requirementId: path.id,
      target,
      testName: getToolcraftPerformancePathTestName(path),
    }));
  });
}
