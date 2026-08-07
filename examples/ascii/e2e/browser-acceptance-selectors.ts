import {
  isToolcraftRuntimeOwnedTarget,
} from "../src/toolcraft/runtime";
import {
  getRequiredToolcraftControlPartCoverage,
  appAcceptance,
} from "../src/app/app-acceptance";
import { appSchema } from "../src/app/app-schema";

export function getCanvasHandleEntries() {
  return appAcceptance.filter((entry) => entry.kind === "canvas-handle");
}

export function getDiscreteSliderControls() {
  return (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(
        ([, control]) =>
          (control.type === "slider" || control.type === "rangeSlider") &&
          control.variant === "discrete" &&
          !isToolcraftRuntimeOwnedTarget(control.target),
      )
      .map(([id, control]) => ({
        control,
        shouldRenderMarkers: shouldInlineDiscreteSliderRenderMarkers(section, id, control),
      })),
  );
}

function getStepPositionCount(control: {
  max?: number;
  min?: number;
  step?: number;
}): number | undefined {
  if (
    typeof control.step !== "number" ||
    typeof control.min !== "number" ||
    typeof control.max !== "number" ||
    !Number.isFinite(control.step) ||
    !Number.isFinite(control.min) ||
    !Number.isFinite(control.max) ||
    control.step <= 0 ||
    control.max <= control.min
  ) {
    return undefined;
  }

  const rawStepCount = (control.max - control.min) / control.step;
  const roundedStepCount = Math.round(rawStepCount);
  const intervalCount =
    Math.abs(rawStepCount - roundedStepCount) < Number.EPSILON * 100
      ? roundedStepCount
      : Math.floor(rawStepCount) + 1;

  return Math.max(2, intervalCount + 1);
}

function isSliderLikeControl(control: { type?: string } | undefined): boolean {
  return control?.type === "slider" || control?.type === "rangeSlider";
}

function shouldInlineDiscreteSliderRenderMarkers(
  section: NonNullable<typeof appSchema.panels.controls>["sections"][number],
  id: string,
  control: { max?: number; min?: number; step?: number },
): boolean {
  const positionCount = getStepPositionCount(control);

  if (!positionCount || positionCount <= 20) {
    return true;
  }

  const inlineSliderGroup = section.layoutGroups?.find(
    (layoutGroup) =>
      layoutGroup.layout === "inline" &&
      layoutGroup.columns === 2 &&
      layoutGroup.controls.length === 2 &&
      layoutGroup.controls.includes(id) &&
      layoutGroup.controls.every((controlId) =>
        isSliderLikeControl(section.controls[controlId]),
      ),
  );

  return !inlineSliderGroup;
}

export function getSegmentedControls() {
  return (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.values(section.controls).filter((control) => control.type === "segmented"),
  );
}

export function getCompoundPartControls() {
  return (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.values(section.controls).filter(
      (control) => getRequiredToolcraftControlPartCoverage(control).length > 0,
    ),
  );
}

export function getTimelineCoverageEntries(coverage: "keyframes" | "playback") {
  return appAcceptance.filter((entry) => entry.timelineCoverage === coverage);
}

export function getLayerCoverageEntries() {
  return appAcceptance.filter((entry) => entry.layerCoverage);
}

export function getReferenceCoverageEntry(coverage: string) {
  return appAcceptance.find((entry) => entry.referenceCoverage === coverage);
}

export function requiresProductObservableProof(
  entry: (typeof appAcceptance)[number],
): boolean {
  return (
    entry.evidence === "product-output" ||
    entry.evidence === "rendered-pixels" ||
    entry.evidence === "timeline-output"
  );
}
