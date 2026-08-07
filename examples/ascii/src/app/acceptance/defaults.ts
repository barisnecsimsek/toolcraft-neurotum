import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { productControlSections } from "../app-schema";
import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftReferenceFeatureInventoryItem,
  ToolcraftTransferMode,
} from "./types";

const automatedControlTestName =
  "maps every Mesh FX schema control to runtime-backed renderer state";
const browserEffectsTestName =
  "browser: applies Mesh FX controls to rendered 3D output";
const browserSourceParityTestName =
  "browser: effect baseline and camera orbit";
const browserModelTestName =
  "browser: uploads and clears a 3D model through fileDrop";
const browserExportTestName =
  "browser: exports 3D output with background format resolution and progress";

function actionValues(control: ToolcraftControlSchema): readonly string[] | undefined {
  if (control.type !== "actions" && control.type !== "panelActions") {
    return undefined;
  }

  return (control.actions ?? []).map((action) =>
    typeof action === "string" ? action : action.value,
  );
}

function acceptanceForControl({
  control,
  controlId,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
}): ToolcraftComponentAcceptance {
  const isOutputAction = control.type === "panelActions";
  const isMedia = control.type === "fileDrop";
  const isExportSetting = control.target.startsWith("export.");
  const isBackground = control.target === "scene.background";
  const isOrientation = control.target === "view.orbit";
  const isSourceParityControl =
    control.target === "effect.mode" ||
    isOrientation ||
    control.target.startsWith("ascii.") ||
    control.target.startsWith("dither.");
  const browserTestName = isMedia
    ? browserModelTestName
    : isOutputAction || isExportSetting || isBackground
      ? browserExportTestName
      : isSourceParityControl
        ? browserSourceParityTestName
      : browserEffectsTestName;
  const expectedObservable =
    control.target === "export.includeBackground"
      ? "Turning Include off hides the live preview product background and exports transparent PNG pixels; video output keeps the product background, and turning Include on restores the selected color."
      : isOutputAction
        ? "Export PNG produces decoded image bytes at the selected format and 2K/4K/8K pixel dimensions while the sticky progress indicator advances."
        : isMedia
          ? "Uploading GLB or OBJ replaces the built-in model in the product canvas; clearing and global Reset restore it."
          : `Changing ${control.target} changes the rendered 3D product output without moving the Toolcraft viewport.`;

  return {
    actionCoverage: actionValues(control),
    automated: true,
    automatedTestName: automatedControlTestName,
    browser: true,
    browserTestName,
    componentType: control.type,
    controlPartCoverage:
      control.type === "gradient" || control.type === "vector"
        ? "all-visible-parts"
        : undefined,
    evidence: isOutputAction
      ? "exported-bytes"
      : isMedia
        ? "media-lifecycle"
        : "product-output",
    expectedObservable,
    fixture: isMedia
      ? "Generated OBJ tetrahedron fixture and built-in model reset fixture"
      : "Built-in ring model at 1920x1080 with visible light-to-dark surface detail",
    id: control.target,
    kind: "control",
    ...(isOrientation
      ? {
          builtInFitCheck: {
            checkedBuiltIns: ["vector"] as const,
            closestBuiltIn: "vector" as const,
            productObservable:
              "The six-axis viewport handle and left-drag gesture update the rendered camera view and environment reflections.",
            whyInsufficient:
              "The vector control cannot express a viewport-fixed six-axis camera projection, camera up-vector handling, axis snapping, or free pointer orbit.",
          },
          customControlCoverage: "all-custom-control-behavior" as const,
        }
      : {}),
    optionCoverage:
      control.type === "select" || control.type === "segmented"
        ? "each-visible-item"
        : undefined,
    referenceCoverage:
      control.target === "effect.mode"
        ? "control-mapping"
        : control.target === "view.orbit"
          ? "renderer-state"
        : control.target === "source.model"
          ? "media-lifecycle"
          : control.target === "actions.output"
            ? "export-copy"
            : undefined,
    target: control.target,
    userAction: isOutputAction
      ? "Choose image format and resolution, toggle Include, change Background, then click Export PNG."
      : isMedia
        ? "Upload an OBJ through 3D model, clear it, upload again, then use Reset controls."
        : control.type === "actions"
          ? `Click every action for ${controlId}.`
          : isOrientation
            ? "Drag the viewport orientation gizmo, click each axis endpoint, and left-drag the product canvas."
            : `Interact with ${String(control.label || controlId)} through the visible Toolcraft control.`,
  };
}

const controlAcceptance = productControlSections.flatMap((section) =>
  Object.entries(section.controls).map(([controlId, control]) =>
    acceptanceForControl({ control, controlId }),
  ),
);

const runtimeAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName: automatedControlTestName,
    browser: true,
    browserTestName: browserSourceParityTestName,
    canvasHandle: {
      exportCleanTestName: browserSourceParityTestName,
      outputObservable:
        "Dragging or snapping the orientation gizmo changes the rendered camera view while its opaque circular backing stays visually stable and the handle stays out of PNG pixels.",
      testId: "orientation-gizmo",
      writesTarget: "view.orbit",
    },
    componentType: "canvas-handle",
    evidence: "product-output",
    expectedObservable:
      "The bottom-left six-axis handle stays fixed to the viewport with a non-flashing opaque backing; a click snaps to an axis and a grabbed axis point follows the pointer directly across the orientation sphere.",
    fixture: "Built-in ring model with the default camera pose",
    id: "view.orbit.handle",
    kind: "canvas-handle",
    userAction: "Hover, click, and drag the six-axis orientation gizmo.",
  },
  {
    automated: true,
    automatedTestName: automatedControlTestName,
    browser: true,
    browserTestName: "browser: edits canvas size and keeps 3D output stable",
    componentType: "canvas",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Editing canvas width and height changes output dimensions while the 3D renderer and viewport remain stable.",
    fixture: "Built-in ring model on editable 1920x1080 canvas",
    id: "reference.canvas-sizing",
    kind: "runtime",
    referenceCoverage: "canvas-sizing",
    userAction: "Edit Canvas width and Canvas height in Setup, then use toolbar zoom and center.",
  },
  {
    automated: true,
    automatedTestName: automatedControlTestName,
    browser: true,
    browserTestName: browserEffectsTestName,
    componentType: "webgl-renderer",
    evidence: "rendered-pixels",
    expectedObservable:
      "The WebGL renderer preserves layered highlights, inner-wall shadows, and physical volume before mapping stylization, adjustments, and post-processing to visible pixels.",
    fixture: "Built-in ring model with contrast-bearing highlights and shadows",
    id: "reference.renderer-state",
    kind: "runtime",
    referenceCoverage: "renderer-state",
    userAction: "Exercise each Effects branch and compare the product canvas before and after.",
  },
  {
    automated: true,
    automatedTestName: automatedControlTestName,
    browser: true,
    browserTestName: "browser: omits timeline while autonomous grain remains effect-local",
    componentType: "timeline-policy",
    evidence: "command-side-effect",
    expectedObservable:
      "No timeline or video export is visible; Film Grain Animate changes only the autonomous shader noise.",
    fixture: "Film Grain enabled with Animate on and off",
    id: "reference.timeline-omitted",
    kind: "runtime",
    referenceCoverage: "control-mapping",
    userAction: "Verify the timeline is absent, then toggle Film Grain Animate and observe canvas pixels.",
  },
];

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...controlAcceptance,
  ...runtimeAcceptance,
];

export const starterControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "3D source and camera view",
    groupingReason:
      "The uploaded 3D source and its viewport orientation share one visible editing stage while the orientation handle itself remains on the canvas.",
    targets: ["source.model", "view.orbit"],
    title: "3D model",
    workflowStage: "Source and view",
  },
  ...productControlSections
    .slice(1)
    .filter((section) =>
      !Object.values(section.controls).some((control) => control.type === "panelActions"),
    )
    .map((section) => ({
      entity: section.title ?? "3D effect",
      groupingReason: `${section.title ?? "This section"} groups controls that edit one 3D effect entity or delivery stage and share conditional visibility.`,
      targets: Object.values(section.controls).map((control) => control.target),
      title: section.title ?? "3D Effect",
    })),
];

export const appProductReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "Mesh FX Lab",
  productSummary:
    "Applies stylized, adjustment, and post-processing effects to a built-in shape or uploaded 3D model.",
  requestedBehavior:
    "Provide a complete 3D effects workflow with custom model upload, a six-axis orientation gizmo with click-to-snap and free point drag, left-button camera orbit, Toolcraft-native shell behavior, and no timeline.",
};

const referenceFeatureInventory: readonly ToolcraftReferenceFeatureInventoryItem[] = [
  {
    acceptanceId: "view.orbit",
    behaviorEvidence: "The inspected runtime uses left-button camera rotation and a 70px Canvas2D six-axis orientation widget. Blender's Interactive Navigation contract distinguishes click-to-axis from drag-to-orbit, and the user explicitly requested both free point dragging and immediate point tracking beneath the pointer.",
    featureName: "Camera orbit and orientation gizmo",
    id: "camera-orbit",
    referenceBehavior: "The original screen widget exposes six camera axes and axis snapping; the requested redesign replaces its constrained point drag with Blender-style free orbit.",
    sourceEvidence: "Inspected live camera/controller state, supplied PNG still, and Blender Viewport Preferences Interactive Navigation documentation.",
    status: "intentionally-changed",
    toolcraftMapping: "The runtime-backed view.orbit pose drives preview/export, plain left drag on the product canvas, and a 70px bottom-left Canvas2D handle where a click snaps and a grabbed point directly tracks the pointer on the orientation sphere.",
    userApprovedChangeReason: "The user explicitly requested Blender-style point dragging that freely orbits the view.",
  },
  {
    acceptanceId: "source.model",
    behaviorEvidence: "The live Torus route renders TorusGeometry(1.5, 0.48, 34, 62), normalized to outer radius 1.58 and mesh scale 1.1; the requested port additionally requires custom model upload.",
    featureName: "3D source model",
    id: "source-model",
    referenceBehavior: "Render a Torus as the editable source object.",
    sourceEvidence: "Live route, c4d3150.js Torus constructor/normalization source, and inspected Three.js geometry at https://studio.morflax.com/abstract/create/Torus.",
    status: "toolcraft-native",
    toolcraftMapping: "Custom physical ring fallback plus Toolcraft fileDrop for GLB, embedded glTF, and OBJ normalized to the same model footprint.",
  },
  {
    acceptanceId: "reference.renderer-state",
    behaviorEvidence: "The live reference scene contains a white fully metallic MeshPhysicalMaterial, Studio_HDRI_43 reflections at intensity 1.25, one directional light, and a 15-degree camera; its Dither output shows multiple independent highlight and shadow bands around the Torus. The original loader reports that the current JPEG has no gain-map metadata and uses its SDR-to-linear-HalfFloat fallback.",
    featureName: "Physical base-scene volume",
    id: "physical-base-scene",
    referenceBehavior: "Build complex 3D luminance and inner-wall volume before any screen-space effect quantizes or remaps the image.",
    sourceEvidence: "Live Three.js scene/material/texture inspection plus c4d3150.js material, environment-loader, light, camera, and Torus source.",
    status: "intentionally-changed",
    toolcraftMapping: "The renderer generates a local PMREM studio environment from six custom light panels and uses an independently tuned physical material, geometry, camera, and directional light before the shared effect graph.",
    userApprovedChangeReason: "The user explicitly requested removal of copied product traces and renamed/custom implementation details.",
  },
  ...[
    "None",
    "Pixelate",
    "Dither",
    "ASCII",
    "Halftone",
    "Mosaic",
    "Bricks",
    "Pointillism",
    "Heatmap",
    "Threshold",
    "Duotone",
  ].map((featureName) => ({
    acceptanceId: "effect.mode",
    behaviorEvidence: `${featureName} was selected in the live Stylized Effects menu; its conditional controls/defaults and shipped fragment shader were inspected and its Toolcraft branch was exercised in WebGL.`,
    featureName: `${featureName} stylized effect`,
    id: `stylized-${featureName.toLowerCase().replace(/\s+/g, "-")}`,
    referenceBehavior: `Selecting ${featureName} changes screen-space rendering and reveals only its relevant effect parameters.`,
    sourceEvidence: "Live Effects DOM plus the browser-delivered 0c43fd8.js UI bundle and c4d3150.js Three.js/effects bundle.",
    status: "ported" as const,
    toolcraftMapping: `effect.mode selects the ${featureName} GPU shader branch with schema-backed conditional controls.`,
  })),
  {
    acceptanceId: "reference.renderer-state",
    behaviorEvidence: "The live Adjustments accordion and shipped effects manager expose tone mapping plus seven numeric corrections after the ordered post stack.",
    featureName: "Adjustments",
    id: "adjustments",
    referenceBehavior: "Tone mapping, exposure, brightness, contrast, saturation, hue, temperature, and tint alter final pixels.",
    sourceEvidence: "Live Adjustments DOM, 0c43fd8.js tone-mapping mapping, and c4d3150.js adjustments/output passes.",
    status: "ported",
    toolcraftMapping: "Schema controls update adjustment shader uniforms after stylization.",
  },
  {
    acceptanceId: "reference.renderer-state",
    behaviorEvidence: "Blur, Chromatic, Film Grain, Bloom, Vignette, and Gradient Overlay were toggled live; source pass order, shaders, defaults, and uniform mappings were inspected.",
    featureName: "Post-processing stack",
    id: "post-processing",
    referenceBehavior: "Six independently enabled post effects expose conditional parameters and compose on the 3D output.",
    sourceEvidence: "Live Post-processing DOM plus c4d3150.js pass order and individual shader/factory implementations.",
    status: "ported",
    toolcraftMapping: "Separate Toolcraft sections enable the source-ordered GPU pass stack before adjustments/output.",
  },
  {
    acceptanceId: "reference.canvas-sizing",
    behaviorEvidence: "The reference canvas presents a fixed composition; Toolcraft keeps its editable output-size behavior per user request to retain the current app shell.",
    featureName: "Canvas and viewport",
    id: "canvas-viewport",
    referenceBehavior: "Display the rendered 3D product in an editor canvas.",
    sourceEvidence: "Live reference canvas and Toolcraft editable-output contract.",
    status: "toolcraft-native",
    toolcraftMapping: "Toolcraft CanvasShell owns sizing, pan, zoom, radar, and render scale.",
  },
  {
    acceptanceId: "actions.output",
    behaviorEvidence: "The live reference exposes an Export action; the requested app keeps Toolcraft still-image delivery.",
    featureName: "Still-image export",
    id: "export-image",
    referenceBehavior: "Export the current rendered composition.",
    sourceEvidence: "Visible Export button in the live reference navigation.",
    status: "toolcraft-native",
    toolcraftMapping: "Sticky Export PNG uses Toolcraft Background and Image Export controls at 2K/4K/8K.",
  },
  {
    acceptanceId: "reference.timeline-omitted",
    behaviorEvidence: "The reference shows a bottom timeline and Add animation control.",
    featureName: "Reference timeline",
    id: "timeline",
    referenceBehavior: "Reference transport provides time and animation controls.",
    sourceEvidence: "Visible Add animation button and 0:00–0:10 timeline in the live reference.",
    status: "intentionally-changed",
    toolcraftMapping: "Timeline and video export are omitted; Film Grain may animate autonomously without transport.",
    userApprovedChangeReason: "The user explicitly requested that the timeline is not needed.",
  },
];

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    behaviorCoverage: [
      "no-user-facing-transport",
      "no-play-pause",
      "no-scrub",
      "no-duration-control",
      "no-loop-control",
      "no-export-at-time",
    ],
    mode: "autonomous",
    reason:
      "Film Grain Animate is self-running decorative shader noise; the user explicitly excluded the timeline and the app has no video export.",
  },
  behaviorCoverage: [
    "canvas-sizing",
    "control-mapping",
    "renderer-state",
    "media-lifecycle",
    "export-copy",
  ],
  mode: "reference-runtime-clone",
  referenceFeatureInventory,
  referenceName: "Abstract Torus Creator / Effects",
  referenceStudy: {
    behaviorEvidence:
      "Ran the live app, selected every effect, inspected all conditional controls, recovered exact defaults, UI-to-uniform transforms, shader sources, ASCII atlas generation, resize scaling, and pass order, then inspected the live Three.js Torus geometry, physical material, Studio_HDRI_43 loader/fallback, camera, and active light graph.",
    referenceLocation: "https://studio.morflax.com/abstract/create/Torus",
    reproductionSteps:
      "Open the live route and exercise every Effects branch; fetch /_nuxt/0c43fd8.js and /_nuxt/c4d3150.js; inspect PostEffectsSettings, EffectControls, shader definitions, EffectsManager, generateCharTexture, _rebuildPassOrder, the Torus scene graph, active material, environment texture, camera, and lights.",
    sourceEvidence:
      "Inspected live DOM/WebGL behavior, live Three.js scene/material/environment state, and browser-delivered source bundles 0c43fd8.js (UI/state) and c4d3150.js (Three.js scene/shaders/effects manager).",
    status: "ran-original",
  },
  referenceTimeline: {
    behaviorCoverage: [],
    mode: "none",
  },
  sourceOfTruth: "reference-runtime",
};
