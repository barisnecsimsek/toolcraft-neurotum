import {
  getToolcraftControlKeyframeCapability,
  getToolcraftSettingsTransferEligibility,
} from "@/toolcraft/runtime";
import type {
  ToolcraftActionSchema,
  ToolcraftControlConditionSchema,
  ToolcraftControlOrderRole,
  ToolcraftControlSchema,
  ResolvedToolcraftAppSchema,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";

export type ToolcraftAcceptanceEvidence =
  | "command-side-effect"
  | "exported-bytes"
  | "media-lifecycle"
  | "persistence-state"
  | "product-output"
  | "rendered-pixels"
  | "timeline-output"
  | "viewport-side-effect";

export type ToolcraftReferenceCoverage =
  | "canvas-sizing"
  | "control-mapping"
  | "export-at-time"
  | "export-copy"
  | "media-lifecycle"
  | "pause-resume"
  | "renderer-loop"
  | "renderer-state"
  | "restart"
  | "spawn-update-cadence"
  | "time-progress";

export type ToolcraftReferenceTimelineCoverage =
  | "all-range"
  | "duration"
  | "export-at-time"
  | "export-range"
  | "jump-to-trim-start"
  | "keyframes"
  | "loop"
  | "playback"
  | "range-playback"
  | "restart"
  | "scrub"
  | "state-jump"
  | "time-progress"
  | "trim-range";

export type ToolcraftTimelinePlaybackCoverage =
  | "duration"
  | "loop"
  | "pause-resume"
  | "rendered-frame"
  | "scrub";

export type ToolcraftCanvasSizingCoverage = "fixed-output-size";

export type ToolcraftPersistenceCoverage = "reload";

export type ToolcraftSettingsTransferCoverage = "opt-out";

export type ToolcraftAutonomousAnimationCoverage =
  | "no-duration-control"
  | "no-export-at-time"
  | "no-loop-control"
  | "no-play-pause"
  | "no-scrub"
  | "no-user-facing-transport";

export type ToolcraftAnimationIntent =
  | {
      mode: "none";
    }
  | {
      behaviorCoverage: readonly ToolcraftAutonomousAnimationCoverage[];
      mode: "autonomous";
      reason: string;
    }
  | {
      mode: "timeline-keyframes";
    }
  | {
      mode: "timeline-playback";
    };

export type ToolcraftReferenceTimelineMode =
  | "custom-reference-timeline"
  | "none"
  | "toolcraft-keyframes"
  | "toolcraft-playback";

export type ToolcraftReferenceTimelineContract = {
  behaviorCoverage: readonly ToolcraftReferenceTimelineCoverage[];
  mode: ToolcraftReferenceTimelineMode;
};

export type ToolcraftLayerCoverage =
  | "grouping"
  | "media-lifecycle"
  | "reorder"
  | "selected-layer-controls"
  | "selection"
  | "visibility";

export type ToolcraftControlPartCoverage =
  | "anchorGrid.position"
  | "channelMixer.activeChannel"
  | "channelMixer.values"
  | "curves.activeChannel"
  | "curves.points"
  | "colorOpacity.hex"
  | "colorOpacity.opacity"
  | "fontPicker.color"
  | "fontPicker.fontId"
  | "fontPicker.fontSize"
  | "fontPicker.fontWeight"
  | "fontPicker.letterSpacing"
  | "fontPicker.lineHeight"
  | "fontPicker.opacity"
  | "fontPicker.textCase"
  | "gradient.angle"
  | "gradient.gradientType"
  | "gradient.stops.color"
  | "gradient.stops.opacity"
  | "gradient.stops.position"
  | "palette.family"
  | "palette.shade"
  | "rangeInput.end"
  | "rangeInput.start"
  | "rangeSlider.lower"
  | "rangeSlider.upper"
  | "vector.x"
  | "vector.y";

export type ToolcraftCustomControlCoverage =
  | "built-in-gap"
  | "kit-primitives"
  | "minimal-ui"
  | "product-output"
  | "runtime-state";

const builtInToolcraftControlTypeValues = [
  "actions",
  "anchorGrid",
  "aspectRatio",
  "channelMixer",
  "checkbox",
  "code",
  "collectionActions",
  "color",
  "colorOpacity",
  "curves",
  "fileDrop",
  "fontPicker",
  "gradient",
  "imagePicker",
  "palette",
  "panelActions",
  "rangeInput",
  "rangeSlider",
  "segmented",
  "select",
  "settingsTransfer",
  "slider",
  "switch",
  "text",
  "vector",
] as const;
const settingsTransferOptOutReasonPattern =
  /\b(ephemeral|temporary|one-off|not portable|session-only)\b/i;
const insufficientFixedCanvasSizingReasonPattern =
  /\b(no|without|missing|lacks?|does\s+not\s+(?:have|expose)|did\s+not\s+(?:have|expose)|has\s+no|had\s+no)\b[^.]{0,80}\b(?:size|dimension|canvas|output)\b[^.]{0,80}\b(?:editor|controls?|settings?|picker|input|ui)\b|\breference\s+app\b[^.]{0,120}\b(?:no|without|missing|lacks?|does\s+not\s+(?:have|expose)|did\s+not\s+(?:have|expose)|has\s+no|had\s+no)\b[^.]{0,80}\b(?:size|dimension|canvas|output)\b/i;

export type ToolcraftBuiltInControlType =
  (typeof builtInToolcraftControlTypeValues)[number];

export type ToolcraftBuiltInFitCheck = {
  checkedBuiltIns: readonly ToolcraftBuiltInControlType[];
  closestBuiltIn: ToolcraftBuiltInControlType | "none";
  productObservable: string;
  whyInsufficient: string;
};

export type ToolcraftTransferMode =
  | {
      animationIntent?: ToolcraftAnimationIntent;
      mode: "new-toolcraft-app";
    }
  | {
      animationIntent?: ToolcraftAnimationIntent;
      behaviorCoverage: readonly ToolcraftReferenceCoverage[];
      mode: "reference-runtime-clone";
      referenceName: string;
      referenceTimeline: ToolcraftReferenceTimelineContract;
      sourceOfTruth: "reference-runtime";
    };

export type ToolcraftProductReadiness =
  | {
      mode: "starter";
      reason: string;
    }
  | {
      mode: "product";
      productName: string;
      productSummary: string;
      requestedBehavior: string;
    };

export type ToolcraftComponentAcceptance = {
  actionCoverage?: readonly string[];
  automated: boolean;
  automatedTestName: string;
  browser: boolean;
  browserTestName: string;
  componentType: string;
  evidence: ToolcraftAcceptanceEvidence;
  expectedObservable: string;
  fixture: string;
  id: string;
  canvasHandle?: {
    exportCleanTestName: string;
    outputObservable: string;
    testId: string;
    writesTarget: string;
  };
  kind: "canvas-handle" | "control" | "runtime";
  canvasSizingCoverage?: ToolcraftCanvasSizingCoverage;
  layerCoverage?: ToolcraftLayerCoverage;
  optionCoverage?: "each-visible-item" | readonly string[];
  persistenceCoverage?: ToolcraftPersistenceCoverage;
  referenceCoverage?: ToolcraftReferenceCoverage;
  referenceTimelineCoverage?: ToolcraftReferenceTimelineCoverage;
  settingsTransferCoverage?: ToolcraftSettingsTransferCoverage;
  target?: string;
  timelineCoverage?: "keyframes" | "playback";
  timelinePlaybackCoverage?:
    | "all-playback-behavior"
    | readonly ToolcraftTimelinePlaybackCoverage[];
  controlPartCoverage?:
    | "all-visible-parts"
    | readonly ToolcraftControlPartCoverage[];
  customControlCoverage?:
    | "all-custom-control-behavior"
    | readonly ToolcraftCustomControlCoverage[];
  builtInFitCheck?: ToolcraftBuiltInFitCheck;
  userAction: string;
};

export type ToolcraftVisibleControl = {
  control: ToolcraftControlSchema;
  controlId: string;
  sectionTitle?: string;
};

export type ToolcraftControlOrderItem = {
  controlId: string;
  rank: number;
  role: ToolcraftControlOrderRole;
  sectionTitle?: string;
  target: string;
  type: string;
};

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    behaviorCoverage: [
      "no-duration-control",
      "no-export-at-time",
      "no-loop-control",
      "no-play-pause",
      "no-scrub",
      "no-user-facing-transport",
    ],
    mode: "autonomous",
    reason:
      "The drawing uses a physics loop for ink diffusion and optional Auto flow, but has no user-facing transport or scrubber.",
  },
  behaviorCoverage: [
    "canvas-sizing",
    "control-mapping",
    "export-copy",
    "renderer-loop",
    "renderer-state",
    "spawn-update-cadence",
  ],
  mode: "reference-runtime-clone",
  referenceName: "Suminagashi",
  referenceTimeline: {
    behaviorCoverage: [],
    mode: "none",
  },
  sourceOfTruth: "reference-runtime",
};

export const appProductReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "Suminagashi Draw",
  productSummary:
    "A WebGL suminagashi drawing surface with absorption-based inks, watercolor brush controls, optional Auto flow, palette-selected ink, fast clear fade, and image export.",
  requestedBehavior:
    "Port the drawing behavior from https://suminagashi-fjdbyyqi.manus.space/ into the Toolcraft app, use the Palette component for ink selection, render a flat beige paper canvas without texture, make ink spread while drawing, let strokes settle into a static result after drying, and expose watercolor brush controls.",
};

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName: "canvas sizing controls drive the WebGL output size",
    browser: true,
    browserTestName: "browser: canvas sizing controls drive the WebGL output size",
    componentType: "aspectRatio",
    evidence: "rendered-pixels",
    expectedObservable:
      "Changing Aspect ratio updates the WebGL drawing output dimensions from the initial 1920x1080 default.",
    fixture: "Default 1920x1080 canvas, then aspect preset fixture.",
    id: "runtime.canvasAspectRatio",
    kind: "control",
    referenceCoverage: "canvas-sizing",
    target: "canvas.aspectRatio",
    userAction:
      "Change Aspect ratio in the first setup section and verify the WebGL output dimensions update.",
  },
  {
    automated: true,
    automatedTestName: "canvas sizing controls drive the WebGL output size",
    browser: true,
    browserTestName: "browser: canvas sizing controls drive the WebGL output size",
    componentType: "text",
    evidence: "rendered-pixels",
    expectedObservable:
      "Editing Canvas width changes the WebGL drawing output width while preserving runtime render scale.",
    fixture: "Default 1920x1080 canvas, then custom canvas width fixture.",
    id: "runtime.canvasWidth",
    kind: "control",
    target: "canvas.size.width",
    userAction:
      "Edit Canvas width in the first setup section and verify the WebGL output backing width updates.",
  },
  {
    automated: true,
    automatedTestName: "canvas sizing controls drive the WebGL output size",
    browser: true,
    browserTestName: "browser: canvas sizing controls drive the WebGL output size",
    componentType: "text",
    evidence: "rendered-pixels",
    expectedObservable:
      "Editing Canvas height changes the WebGL drawing output height while preserving runtime render scale.",
    fixture: "Default 1920x1080 canvas, then custom canvas height fixture.",
    id: "runtime.canvasHeight",
    kind: "control",
    target: "canvas.size.height",
    userAction:
      "Edit Canvas height in the first setup section and verify the WebGL output backing height updates.",
  },
  {
    automated: true,
    automatedTestName: "resolution scale controls WebGL backing pixels",
    browser: true,
    browserTestName: "browser: resolution scale controls WebGL backing pixels",
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Resolution scale changes the WebGL backing pixels without changing the 1920x1080 output size.",
    fixture: "Fixed canvas with Resolution scale control.",
    id: "canvas.renderScale",
    kind: "control",
    target: "canvas.renderScale",
    userAction: "Drag the Resolution scale slider.",
  },
  {
    automated: true,
    automatedTestName: "ink palette family and shade affect drawn ink",
    browser: true,
    browserTestName: "browser: ink palette family and shade affect drawn ink",
    componentType: "palette",
    controlPartCoverage: ["palette.family", "palette.shade"],
    evidence: "product-output",
    expectedObservable:
      "Changing Palette family and shade changes the rendered pixels for the first new brush stroke.",
    fixture: "Default single-mode palette fixture.",
    id: "ink.palette",
    kind: "control",
    referenceCoverage: "control-mapping",
    target: "ink.palette",
    userAction: "Click a different palette family and shade, then draw the first stroke.",
  },
  {
    automated: true,
    automatedTestName: "brush size changes stroke thickness",
    browser: true,
    browserTestName: "browser: brush size changes stroke thickness",
    componentType: "slider",
    evidence: "product-output",
    expectedObservable:
      "Increasing Size makes the next brush stroke cover more product pixels.",
    fixture: "Brush size stroke fixture.",
    id: "brush.size",
    kind: "control",
    target: "brush.size",
    userAction: "Drag Size and draw a stroke.",
  },
  {
    automated: true,
    automatedTestName: "brush load changes pigment density",
    browser: true,
    browserTestName: "browser: brush load changes pigment density",
    componentType: "slider",
    evidence: "product-output",
    expectedObservable:
      "Increasing Load makes the next brush stroke darker and more saturated.",
    fixture: "Brush load stroke fixture.",
    id: "brush.load",
    kind: "control",
    target: "brush.load",
    userAction: "Drag Load and draw a stroke.",
  },
  {
    automated: true,
    automatedTestName: "brush wetness changes immediate spread",
    browser: true,
    browserTestName: "browser: brush wetness changes immediate spread",
    componentType: "slider",
    evidence: "product-output",
    expectedObservable:
      "Increasing Wetness makes ink spread while the pointer is still down.",
    fixture: "Wet brush live-spread fixture.",
    id: "brush.wetness",
    kind: "control",
    target: "brush.wetness",
    userAction: "Drag Wetness, hold a stroke, and wait before pointerup.",
  },
  {
    automated: true,
    automatedTestName: "brush settle changes post-release stop timing",
    browser: true,
    browserTestName: "browser: brush settle changes post-release stop timing",
    componentType: "slider",
    evidence: "product-output",
    expectedObservable:
      "Increasing Settle makes released strokes continue changing for longer before becoming static.",
    fixture: "Post-release settle timing fixture.",
    id: "brush.settle",
    kind: "control",
    target: "brush.settle",
    userAction: "Drag Settle, draw and release a stroke, then compare post-release motion.",
  },
  {
    automated: true,
    automatedTestName: "brush taper smooths post-release flow stop",
    browser: true,
    browserTestName: "browser: brush taper smooths post-release flow stop",
    componentType: "slider",
    evidence: "product-output",
    expectedObservable:
      "Increasing Taper makes released flow fade out smoothly for longer instead of stopping sharply.",
    fixture: "Post-release taper fade fixture.",
    id: "brush.taper",
    kind: "control",
    target: "brush.taper",
    userAction: "Drag Taper, draw and release a stroke, then compare late post-release motion.",
  },
  {
    automated: true,
    automatedTestName: "brush flow changes water movement strength",
    browser: true,
    browserTestName: "browser: brush flow changes water movement strength",
    componentType: "slider",
    evidence: "product-output",
    expectedObservable:
      "Increasing Flow makes brush movement push the pigment farther along the stroke.",
    fixture: "Brush flow movement fixture.",
    id: "brush.flow",
    kind: "control",
    target: "brush.flow",
    userAction: "Drag Flow and draw a moving stroke.",
  },
  {
    automated: true,
    automatedTestName: "auto flow toggles autonomous reference drops",
    browser: true,
    browserTestName: "browser: auto flow toggles autonomous reference drops",
    componentType: "switch",
    evidence: "product-output",
    expectedObservable:
      "Turning Auto on enables idle reference drops and stirring while leaving the default paper calm.",
    fixture: "Auto-flow reference fixture.",
    id: "flow.auto",
    kind: "control",
    referenceCoverage: "spawn-update-cadence",
    target: "flow.auto",
    userAction: "Toggle Auto on and wait for the reference idle flow.",
  },
  {
    actionCoverage: ["clear"],
    automated: true,
    automatedTestName: "clear action fades ink to blank",
    browser: true,
    browserTestName: "browser: clear action fades ink to blank",
    componentType: "actions",
    evidence: "product-output",
    expectedObservable: "Clicking Clear quickly fades the current ink to blank paper.",
    fixture: "Seeded dye clear fixture.",
    id: "flow.clearSignal",
    kind: "control",
    referenceCoverage: "control-mapping",
    target: "flow.clearSignal",
    userAction: "Click the Clear action.",
  },
  {
    automated: true,
    automatedTestName: "paper texture controls paper surface",
    browser: true,
    browserTestName: "browser: paper texture controls paper surface",
    componentType: "switch",
    evidence: "rendered-pixels",
    expectedObservable:
      "Turning Texture on changes the flat paper into a procedural paper surface.",
    fixture: "Blank paper texture fixture.",
    id: "paper.texture.enabled",
    kind: "control",
    target: "paper.texture.enabled",
    userAction: "Toggle Texture in the Paper section.",
  },
  {
    automated: true,
    automatedTestName: "paper texture controls paper surface",
    browser: true,
    browserTestName: "browser: paper texture controls paper surface",
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Increasing Grain makes fine paper variation more visible, and Grain is disabled when Texture is off.",
    fixture: "Blank paper texture fixture.",
    id: "paper.texture.grain",
    kind: "control",
    target: "paper.texture.grain",
    userAction: "Verify Grain is disabled with Texture off, then turn Texture on and drag Grain.",
  },
  {
    automated: true,
    automatedTestName: "paper texture controls paper surface",
    browser: true,
    browserTestName: "browser: paper texture controls paper surface",
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Changing Scale changes the size of the paper grain pattern, and Scale is disabled when Texture is off.",
    fixture: "Blank paper texture fixture.",
    id: "paper.texture.scale",
    kind: "control",
    target: "paper.texture.scale",
    userAction: "Verify Scale is disabled with Texture off, then turn Texture on and drag Scale.",
  },
  {
    automated: true,
    automatedTestName: "paper texture controls paper surface",
    browser: true,
    browserTestName: "browser: paper texture controls paper surface",
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Increasing Fiber makes directional paper streaks more visible, and Fiber is disabled when Texture is off.",
    fixture: "Blank paper texture fixture.",
    id: "paper.texture.fiber",
    kind: "control",
    target: "paper.texture.fiber",
    userAction: "Verify Fiber is disabled with Texture off, then turn Texture on and drag Fiber.",
  },
  {
    automated: true,
    automatedTestName: "paper texture controls paper surface",
    browser: true,
    browserTestName: "browser: paper texture controls paper surface",
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Increasing Mottle makes broad paper tone variation more visible, and Mottle is disabled when Texture is off.",
    fixture: "Blank paper texture fixture.",
    id: "paper.texture.mottle",
    kind: "control",
    target: "paper.texture.mottle",
    userAction: "Verify Mottle is disabled with Texture off, then turn Texture on and drag Mottle.",
  },
  {
    automated: true,
    automatedTestName: "background include controls preview and png alpha",
    browser: true,
    browserTestName: "browser: background include controls preview and png alpha",
    componentType: "switch",
    evidence: "rendered-pixels",
    expectedObservable:
      "Turning Include off hides the live preview product background and creates transparent PNG output.",
    fixture: "Background transparency fixture.",
    id: "export.includeBackground",
    kind: "control",
    target: "export.includeBackground",
    userAction: "Toggle Include in the Background section.",
  },
  {
    automated: true,
    automatedTestName: "background color changes flat paper color",
    browser: true,
    browserTestName: "browser: background color changes flat paper color",
    componentType: "color",
    evidence: "rendered-pixels",
    expectedObservable: "Changing the Background color updates the flat paper shader color.",
    fixture: "Flat paper color fixture.",
    id: "appearance.background",
    kind: "control",
    target: "appearance.background",
    userAction: "Choose a different background color.",
  },
  {
    automated: true,
    automatedTestName: "image format controls exported image type",
    browser: true,
    browserTestName: "browser: image format controls exported image type",
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable: "Choosing PNG or JPG changes the exported image MIME type.",
    fixture: "Image export format fixture.",
    id: "export.image.format",
    kind: "control",
    optionCoverage: ["png", "jpg"],
    target: "export.image.format",
    userAction: "Choose PNG and JPG in Image Export.",
  },
  {
    automated: true,
    automatedTestName: "image resolution controls exported image dimensions",
    browser: true,
    browserTestName: "browser: image resolution controls exported image dimensions",
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable: "Choosing 2K and 4K changes decoded exported image dimensions.",
    fixture: "Image export resolution fixture.",
    id: "export.image.resolution",
    kind: "control",
    optionCoverage: ["2k", "4k", "8k"],
    target: "export.image.resolution",
    userAction: "Choose 2K and 4K resolutions and export.",
  },
  {
    actionCoverage: ["export-image"],
    automated: true,
    automatedTestName: "exports still image output",
    browser: true,
    browserTestName: "browser: exports still image output",
    componentType: "panelActions",
    evidence: "exported-bytes",
    expectedObservable:
      "Export PNG/JPG downloads decoded image bytes at the selected resolution.",
    fixture: "Painted fluid export fixture.",
    id: "export.action",
    kind: "control",
    referenceCoverage: "export-copy",
    target: "export.action",
    userAction: "Click Export PNG.",
  },
  {
    automated: true,
    automatedTestName: "renderer loop preserves reference state and cadence",
    browser: true,
    browserTestName: "browser: renderer loop preserves reference state and cadence",
    componentType: "webgl renderer",
    evidence: "rendered-pixels",
    expectedObservable:
      "A user brush stroke moves and diffuses over frames using persistent WebGL velocity and dye fields.",
    fixture: "Painted brush-stroke runtime fixture.",
    id: "reference.rendererLoop",
    kind: "runtime",
    referenceCoverage: "renderer-loop",
    userAction: "Draw a brush stroke and wait for several animation frames.",
  },
  {
    automated: true,
    automatedTestName: "renderer spreads ink before pointer release",
    browser: true,
    browserTestName: "browser: renderer spreads ink before pointer release",
    componentType: "webgl renderer",
    evidence: "rendered-pixels",
    expectedObservable:
      "While the pointer is still pressed, the current stroke's pixels change across animation frames.",
    fixture: "Held brush wet-spread fixture.",
    id: "reference.liveBrushSpread",
    kind: "runtime",
    referenceCoverage: "renderer-loop",
    userAction: "Hold a brush stroke on the canvas and wait before releasing.",
  },
  {
    automated: true,
    automatedTestName: "renderer state persists dye and velocity between frames",
    browser: true,
    browserTestName: "browser: renderer state persists dye and velocity between frames",
    componentType: "webgl renderer",
    evidence: "rendered-pixels",
    expectedObservable:
      "Pointer splats continue to advect after the pointer is released, proving mutable renderer state is preserved.",
    fixture: "Pointer splat state fixture.",
    id: "reference.rendererState",
    kind: "runtime",
    referenceCoverage: "renderer-state",
    userAction: "Draw a stroke and wait for diffusion.",
  },
  {
    automated: true,
    automatedTestName: "renderer time progress advances painted simulation",
    browser: true,
    browserTestName: "browser: renderer time progress advances painted simulation",
    componentType: "webgl renderer",
    evidence: "rendered-pixels",
    expectedObservable:
      "The product observable changes over time after a user brush stroke or with Auto enabled.",
    fixture: "Painted time-progress fixture.",
    id: "reference.timeProgress",
    kind: "runtime",
    userAction: "Draw a brush stroke and wait while the ink spreads.",
  },
  {
    automated: true,
    automatedTestName: "settings transfer is explicitly session-only",
    browser: true,
    browserTestName: "browser: settings transfer is explicitly session-only",
    componentType: "settingsTransfer",
    evidence: "persistence-state",
    expectedObservable:
      "Settings transfer is intentionally off because the live dye and velocity state is session-only and not portable; localStorage persistence covers user-edited controls.",
    fixture: "Session-only settings-transfer policy fixture.",
    id: "runtime.settingsTransfer",
    kind: "runtime",
    settingsTransferCoverage: "opt-out",
    target: "runtime.settingsTransfer",
    userAction: "Verify no settings import/export controls appear while edited settings still persist.",
  },
  {
    automated: true,
    automatedTestName: "settings persist after browser reload",
    browser: true,
    browserTestName: "browser: settings persist after browser reload",
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable:
      "Changing Background color survives a real page reload through schema localStorage persistence.",
    fixture: "LocalStorage persistence fixture.",
    id: "runtime.persistence",
    kind: "runtime",
    persistenceCoverage: "reload",
    target: "persistence.localStorage",
    userAction: "Change settings, reload the page, and observe restored values.",
  },
];

function getActionValue(action: ToolcraftActionSchema | string): string {
  return typeof action === "string" ? action : action.value;
}

function getActionSearchText(action: ToolcraftActionSchema | string): string {
  return typeof action === "string" ? action : `${action.label} ${action.value} ${action.command ?? ""}`;
}

function isCanvasSizeTarget(target: string): boolean {
  return target === "canvas.size.width" || target === "canvas.size.height";
}

function isResetPanelAction(action: ToolcraftActionSchema | string): boolean {
  return /\breset\b/i.test(getActionSearchText(action));
}

function getControlOptionValues(control: ToolcraftControlSchema): readonly string[] {
  if (control.type === "imagePicker") {
    return control.items?.map((item) => item.value) ?? [];
  }

  return control.options?.map((option) => option.value) ?? [];
}

function hasCoverageForValues(
  coverage: ToolcraftComponentAcceptance["actionCoverage"] | ToolcraftComponentAcceptance["optionCoverage"],
  values: readonly string[],
): boolean {
  if (values.length === 0) {
    return true;
  }

  if (coverage === "each-visible-item") {
    return true;
  }

  if (!Array.isArray(coverage)) {
    return false;
  }

  return values.every((value) => coverage.includes(value));
}

function hasControlPartCoverage(
  coverage: ToolcraftComponentAcceptance["controlPartCoverage"],
  requiredParts: readonly ToolcraftControlPartCoverage[],
): boolean {
  if (requiredParts.length === 0) {
    return true;
  }

  if (coverage === "all-visible-parts") {
    return true;
  }

  if (!Array.isArray(coverage)) {
    return false;
  }

  return requiredParts.every((part) => coverage.includes(part));
}

function hasCustomControlCoverage(
  coverage: ToolcraftComponentAcceptance["customControlCoverage"],
  requiredParts: readonly ToolcraftCustomControlCoverage[],
): boolean {
  if (coverage === "all-custom-control-behavior") {
    return true;
  }

  if (!Array.isArray(coverage)) {
    return false;
  }

  return requiredParts.every((part) => coverage.includes(part));
}

function hasTimelinePlaybackCoverage(
  coverage: ToolcraftComponentAcceptance["timelinePlaybackCoverage"],
  requiredParts: readonly ToolcraftTimelinePlaybackCoverage[],
): boolean {
  if (coverage === "all-playback-behavior") {
    return true;
  }

  if (!Array.isArray(coverage)) {
    return false;
  }

  return requiredParts.every((part) => coverage.includes(part));
}

function hasTimelinePlaybackCoveragePart(
  coverage: ToolcraftComponentAcceptance["timelinePlaybackCoverage"],
  part: ToolcraftTimelinePlaybackCoverage,
): boolean {
  return coverage === "all-playback-behavior" || (Array.isArray(coverage) && coverage.includes(part));
}

function getAcceptanceEvidenceText(entry: ToolcraftComponentAcceptance): string {
  return [
    entry.automatedTestName,
    entry.browserTestName,
    entry.expectedObservable,
    entry.fixture,
    entry.userAction,
  ].join(" ");
}

function getFileDropLifecycleCoverageErrors(
  label: string,
  entry: ToolcraftComponentAcceptance,
): string[] {
  const errors: string[] = [];
  const evidenceText = getAcceptanceEvidenceText(entry);

  if (entry.evidence !== "media-lifecycle") {
    errors.push(
      `${label} fileDrop acceptance evidence must be "media-lifecycle" so upload, clear, and reset behavior cannot be replaced by generic product-output coverage.`,
    );
  }

  if (
    !/\b(upload|import|drop|drag|browse|choose|select file|source image)\b/i.test(
      evidenceText,
    ) ||
    !/\b(clear|remove|delete|trash)\b/i.test(evidenceText) ||
    !/\b(reset|reset controls|section reset|global reset)\b/i.test(evidenceText)
  ) {
    errors.push(
      `${label} fileDrop acceptance must prove upload/import, clear/remove, and section or global reset remove source media.`,
    );
  }

  return errors;
}

const conditionOperatorLabels = [
  "equals",
  "notEquals",
  "oneOf",
  "notOneOf",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
] as const satisfies readonly (keyof ToolcraftControlConditionSchema)[];

function hasConditionOperator(condition: ToolcraftControlConditionSchema): boolean {
  return conditionOperatorLabels.some((operator) => operator in condition);
}

function getConditionValidationErrors({
  condition,
  conditionName,
  controlTargets,
  label,
}: {
  condition: ToolcraftControlConditionSchema;
  conditionName: "disabledWhen" | "visibleWhen";
  controlTargets: ReadonlySet<string>;
  label: string;
}): string[] {
  const errors: string[] = [];

  if (!hasConditionOperator(condition)) {
    errors.push(
      `${label} ${conditionName} must declare one of equals, notEquals, oneOf, notOneOf, greaterThan, greaterThanOrEqual, lessThan, or lessThanOrEqual so the dependent state is deterministic.`,
    );
  }

  for (const arrayOperator of ["oneOf", "notOneOf"] as const) {
    if (
      arrayOperator in condition &&
      (!Array.isArray(condition[arrayOperator]) ||
        condition[arrayOperator]?.length === 0)
    ) {
      errors.push(
        `${label} ${conditionName}.${arrayOperator} must be a non-empty array.`,
      );
    }
  }

  for (const numericOperator of [
    "greaterThan",
    "greaterThanOrEqual",
    "lessThan",
    "lessThanOrEqual",
  ] as const) {
    if (
      numericOperator in condition &&
      (typeof condition[numericOperator] !== "number" ||
        !Number.isFinite(condition[numericOperator]))
    ) {
      errors.push(
        `${label} ${conditionName}.${numericOperator} must be a finite number.`,
      );
    }
  }

  if (
    !controlTargets.has(condition.target) &&
    !isCanvasSizeTarget(condition.target)
  ) {
    errors.push(
      `${label} ${conditionName} target ${condition.target} does not match another schema control target or canvas size target.`,
    );
  }

  return errors;
}

export function getRequiredToolcraftControlPartCoverage(
  control: ToolcraftControlSchema,
): readonly ToolcraftControlPartCoverage[] {
  switch (control.type) {
    case "anchorGrid":
      return ["anchorGrid.position"];
    case "channelMixer":
      return ["channelMixer.activeChannel", "channelMixer.values"];
    case "curves":
      return control.variant === "single"
        ? ["curves.points"]
        : ["curves.activeChannel", "curves.points"];
    case "fontPicker":
      return [
        "fontPicker.fontId",
        "fontPicker.fontWeight",
        "fontPicker.fontSize",
        "fontPicker.letterSpacing",
        "fontPicker.lineHeight",
        "fontPicker.textCase",
        "fontPicker.color",
        "fontPicker.opacity",
      ];
    case "gradient":
      return [
        "gradient.gradientType",
        "gradient.angle",
        "gradient.stops.position",
        "gradient.stops.color",
        "gradient.stops.opacity",
      ];
    case "palette":
      return ["palette.family", "palette.shade"];
    case "rangeInput":
      return ["rangeInput.start", "rangeInput.end"];
    case "rangeSlider":
      return ["rangeSlider.lower", "rangeSlider.upper"];
    case "vector":
      return ["vector.x", "vector.y"];
    default:
      return [];
  }
}

const builtInToolcraftControlTypes = new Set<string>(
  builtInToolcraftControlTypeValues,
);

const requiredCustomControlCoverage: readonly ToolcraftCustomControlCoverage[] = [
  "built-in-gap",
  "kit-primitives",
  "minimal-ui",
  "product-output",
  "runtime-state",
];

function isCustomToolcraftControl(control: ToolcraftControlSchema): boolean {
  return !builtInToolcraftControlTypes.has(control.type);
}

const collectionEntityCustomControlRe =
  /\b(collection|repeatable|list|lists|item|items|entry|entries|row|rows|asset|assets|object|objects|color|colors|swatch|swatches|glyph|glyphs|symbol|symbols|point|points|stop|stops|variant|variants|rule|rules|mask|masks|shape|shapes|layer|layers|media|image|images|file|files)\b/i;
const collectionOperationCustomControlRe =
  /\b(add|adding|delete|deleting|remove|removing|reorder|reordering|order|ordering|sort|sorting|select|selecting|selected|selection|duplicate|duplicating|upload|import|clear|clearing)\b/i;

const actionLikeCustomControlRe =
  /\b(add|adding|delete|deleting|remove|removing|duplicate|duplicating|sort|sorting|normalize|normalizing|clear|clearing|reset|shuffle|randomize|randomizing)\b/i;

const chromeOnlyCustomControlReasonRe =
  /\b(icon|icons|visual|style|styling|layout|spacing|chrome|button|buttons|compact|custom look|custom ui)\b/i;
const productInteractionCustomControlReasonRe =
  /\b(runtime|state|canvas|output|export|upload|import|preview|reorder|ordering|sort|drag|resize|handle|threshold|density|mapping|geometry|nested|multi|multiple|per-item|metadata|hit target|validation|selection)\b/i;
const collectionValueKeyRe =
  /^(items?|entries|rows|assets|objects|colors?|glyphs?|symbols?|points?|stops?|variants?|rules?|masks?|shapes?|layers?|media|images?|files?)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyUnknownForFitCheck(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(stringifyUnknownForFitCheck).join(" ");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .flatMap(([key, entryValue]) => [key, stringifyUnknownForFitCheck(entryValue)])
      .join(" ");
  }

  return "";
}

function arrayLooksLikeCollectionValue(value: readonly unknown[]): boolean {
  return (
    value.length === 0 ||
    value.some((item) => isRecord(item) || Array.isArray(item) || typeof item === "string")
  );
}

function hasCollectionValueShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return Array.isArray(value) && arrayLooksLikeCollectionValue(value);
  }

  return Object.entries(value).some(([key, entryValue]) => {
    if (Array.isArray(entryValue)) {
      return collectionValueKeyRe.test(key) || arrayLooksLikeCollectionValue(entryValue);
    }

    return collectionValueKeyRe.test(key) && isRecord(entryValue);
  });
}

function getCustomFitCheckSearchText(
  entry: ToolcraftComponentAcceptance,
  control?: ToolcraftControlSchema,
): string {
  return [
    control?.type,
    control?.target,
    typeof control?.label === "string" ? control.label : undefined,
    stringifyUnknownForFitCheck(control?.defaultValue),
    entry.id,
    entry.target,
    entry.componentType,
    entry.expectedObservable,
    entry.userAction,
    entry.builtInFitCheck?.whyInsufficient,
    entry.builtInFitCheck?.productObservable,
  ]
    .filter(Boolean)
    .join(" ");
}

function isCollectionLikeCustomControl(
  entry: ToolcraftComponentAcceptance,
  control: ToolcraftControlSchema,
): boolean {
  if (hasCollectionValueShape(control.defaultValue)) {
    return true;
  }

  const searchText = getCustomFitCheckSearchText(entry, control);

  return (
    collectionEntityCustomControlRe.test(searchText) &&
    collectionOperationCustomControlRe.test(searchText)
  );
}

function getBuiltInFitCheckErrors(
  label: string,
  entry: ToolcraftComponentAcceptance,
  control: ToolcraftControlSchema,
): string[] {
  const fitCheck = entry.builtInFitCheck;

  if (!fitCheck) {
    return [
      `${label} is a custom control and must declare builtInFitCheck with checkedBuiltIns, closestBuiltIn, whyInsufficient, and productObservable.`,
    ];
  }

  const errors: string[] = [];
  const checkedBuiltIns = Array.isArray(fitCheck.checkedBuiltIns)
    ? fitCheck.checkedBuiltIns
    : [];

  if (checkedBuiltIns.length === 0) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns must name at least one checked built-in control.`,
    );
  }

  const unknownCheckedBuiltIns = checkedBuiltIns.filter(
    (builtIn) => !builtInToolcraftControlTypes.has(builtIn),
  );

  if (unknownCheckedBuiltIns.length > 0) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns contains unknown built-in controls: ${unknownCheckedBuiltIns.join(", ")}.`,
    );
  }

  if (
    fitCheck.closestBuiltIn !== "none" &&
    !checkedBuiltIns.includes(fitCheck.closestBuiltIn)
  ) {
    errors.push(
      `${label} builtInFitCheck.closestBuiltIn must be one of the checked built-ins or "none".`,
    );
  }

  if (fitCheck.whyInsufficient.trim().length < 24) {
    errors.push(
      `${label} builtInFitCheck.whyInsufficient must explain why the closest built-in cannot express the product interaction.`,
    );
  }

  if (fitCheck.productObservable.trim().length < 24) {
    errors.push(
      `${label} builtInFitCheck.productObservable must name the product output or side effect that proves the custom control is necessary.`,
    );
  }

  const searchText = getCustomFitCheckSearchText(entry, control);

  if (
    isCollectionLikeCustomControl(entry, control) &&
    !checkedBuiltIns.includes("collectionActions")
  ) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns must include collectionActions when the custom control owns a growable, removable, selectable, or reorderable runtime item set.`,
    );
  }

  if (actionLikeCustomControlRe.test(searchText) && !checkedBuiltIns.includes("actions")) {
    errors.push(
      `${label} builtInFitCheck.checkedBuiltIns must include actions when the custom control exposes local command buttons such as add, remove, delete, duplicate, sort, normalize, or clear.`,
    );
  }

  if (
    chromeOnlyCustomControlReasonRe.test(fitCheck.whyInsufficient) &&
    !productInteractionCustomControlReasonRe.test(fitCheck.whyInsufficient)
  ) {
    errors.push(
      `${label} builtInFitCheck.whyInsufficient cannot justify a custom control only with icons, layout, styling, or custom buttons; name the product interaction or value model that built-ins cannot express.`,
    );
  }

  return errors;
}

function isSliderLikeControl(control: ToolcraftControlSchema): boolean {
  return control.type === "slider" || control.type === "rangeSlider";
}

const SMALL_SEMANTIC_DISCRETE_POSITION_LIMIT = 13;
const MAX_VISUAL_DISCRETE_POSITION_COUNT = 32;
const SEMANTIC_DISCRETE_SLIDER_RE =
  /\b(anchor|band|bands|cell|cells|col|cols|column|columns|count|gap|grid|jitter|level|levels|octave|octaves|pass|passes|point|points|row|rows|segment|segments|step|steps|tile|tiles)\b/i;
const FINITE_ANIMATION_STEP_SLIDER_RE =
  /\b(char|chars|character|characters|flip|flips|glyph|glyphs|frame|frames|letter|letters)\b/i;
const FINITE_ANIMATION_STEP_VALUE_RE = /\b(count|depth|step|steps)\b/i;
const SEMANTIC_CONTINUOUS_SLIDER_RE =
  /\b(duration|fps|frame rate|frames per second|rate|speed|time|seconds?|ms|milliseconds?|hz|cols\/s|ch\/s)\b/i;

function getStepPositionCount(control: ToolcraftControlSchema): number | undefined {
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

function getStepMarkerCount(control: ToolcraftControlSchema): number | undefined {
  return getStepPositionCount(control);
}

function isIntegerStepDomain(control: ToolcraftControlSchema): boolean {
  return (
    typeof control.min === "number" &&
    typeof control.max === "number" &&
    typeof control.step === "number" &&
    Number.isInteger(control.min) &&
    Number.isInteger(control.max) &&
    Number.isInteger(control.step)
  );
}

function getSliderSemanticText(
  controlId: string,
  control: ToolcraftControlSchema,
): string {
  return [
    controlId,
    control.target,
    getControlLabelText(control),
    typeof control.unit === "string" ? control.unit : "",
  ].join(" ");
}

function shouldUseVisualDiscreteSlider(
  controlId: string,
  control: ToolcraftControlSchema,
): boolean {
  const positionCount = getStepPositionCount(control);

  if (!positionCount || !isIntegerStepDomain(control)) {
    return false;
  }

  const semanticText = getSliderSemanticText(controlId, control);

  if (SEMANTIC_CONTINUOUS_SLIDER_RE.test(semanticText)) {
    return false;
  }

  const hasFiniteAnimationStepSemantics =
    FINITE_ANIMATION_STEP_SLIDER_RE.test(semanticText) &&
    FINITE_ANIMATION_STEP_VALUE_RE.test(semanticText);

  if (hasFiniteAnimationStepSemantics) {
    return positionCount <= MAX_VISUAL_DISCRETE_POSITION_COUNT;
  }

  if (positionCount > SMALL_SEMANTIC_DISCRETE_POSITION_LIMIT) {
    return false;
  }

  return SEMANTIC_DISCRETE_SLIDER_RE.test(semanticText);
}

function getSliderVariantClassificationErrors({
  control,
  controlId,
  label,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  label: string;
}): string[] {
  const errors: string[] = [];
  const positionCount = getStepPositionCount(control);

  if (!positionCount) {
    return errors;
  }

  if (
    shouldUseVisualDiscreteSlider(controlId, control) &&
    control.variant !== "discrete"
  ) {
    errors.push(
      `${label} has ${positionCount} semantic integer positions and must use variant "discrete" so Toolcraft renders tick markers.`,
    );
  }

  if (
    control.variant === "discrete" &&
    positionCount > MAX_VISUAL_DISCRETE_POSITION_COUNT
  ) {
    errors.push(
      `${label} declares variant "discrete" with ${positionCount} positions, which would overload tick markers. Keep it stepped continuous or use a different control.`,
    );
  }

  return errors;
}

function getControlLabelText(control: ToolcraftControlSchema): string {
  return typeof control.label === "string" ? control.label : "";
}

function hasVisibleControlLabel(control: ToolcraftControlSchema): boolean {
  return typeof control.label === "string" && control.label.trim().length > 0;
}

const singleCurveSemanticPattern =
  /\b(acceleration|accel|bend|easing|ease|response|depth|mask|opacity|alpha|motion|velocity|threshold|falloff|remap|remapping)\b|speed\s+profile|mapping\s+curve|curve\s+mapping/i;
const rgbCurveSemanticPattern =
  /\b(rgb|rgba|channel|channels|red|green|blue|color\s*correction|colour\s*correction|color\s*grading|colour\s*grading|color\s*grade|colour\s*grade|color\s*curve|colour\s*curve|tone\s*mapping|hue|saturation|chroma)\b/i;

function getCurveSemanticText(
  controlId: string,
  control: ToolcraftControlSchema,
): string {
  return [
    controlId,
    control.target,
    getControlLabelText(control),
    control.description ?? "",
  ]
    .join(" ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function shouldUseSingleCurveVariant(
  controlId: string,
  control: ToolcraftControlSchema,
): boolean {
  if (control.type !== "curves" || control.variant === "single") {
    return false;
  }

  const text = getCurveSemanticText(controlId, control);

  return singleCurveSemanticPattern.test(text) && !rgbCurveSemanticPattern.test(text);
}

function getToggleControlLabelError(
  control: ToolcraftControlSchema,
  sectionTitle?: string,
): string | undefined {
  if (control.type !== "switch" && control.type !== "checkbox") {
    return undefined;
  }

  const label = getControlLabelText(control).trim();

  if (/^(enable|disable)\b/i.test(label)) {
    return `toggle labels must name the setting context only; use "CRT", "Background", "Glow", or "Loop" instead of "${label}".`;
  }

  if (
    label &&
    sectionTitle &&
    normalizeToolcraftSemanticText(label) ===
      normalizeToolcraftSemanticText(sectionTitle)
  ) {
    return `toggle label "${label}" duplicates section title "${sectionTitle}". Use a shorter contextual label such as "Include" or rename the toggle to a more specific setting.`;
  }

  return undefined;
}

const maxInlineSwitchLabelLength = 16;
const maxInlineSwitchLabelWordCount = 2;

function getInlineSwitchLabelText(
  controlId: string,
  control: ToolcraftControlSchema,
): string {
  if (control.label === false) {
    return "";
  }

  const label = getControlLabelText(control).trim();

  return label || controlId;
}

function isInlineSwitchLabelSafe(
  controlId: string,
  control: ToolcraftControlSchema,
): boolean {
  const label = getInlineSwitchLabelText(controlId, control);

  if (!label) {
    return true;
  }

  const wordCount = label.split(/\s+/u).filter(Boolean).length;

  return label.length <= maxInlineSwitchLabelLength && wordCount <= maxInlineSwitchLabelWordCount;
}

function isBooleanControl(control: ToolcraftControlSchema | undefined): boolean {
  return control?.type === "checkbox" || control?.type === "switch";
}

function controlsShareToolcraftTargetEntity(
  firstControl: ToolcraftControlSchema,
  secondControl: ToolcraftControlSchema,
): boolean {
  const firstPrefix = getToolcraftLooseTargetPrefix(firstControl.target);
  const secondPrefix = getToolcraftLooseTargetPrefix(secondControl.target);

  return Boolean(firstPrefix && firstPrefix === secondPrefix);
}

function sectionHasInlineLayoutGroupForPair(
  section: NonNullable<ResolvedToolcraftAppSchema["panels"]["controls"]>["sections"][number],
  firstControlId: string,
  secondControlId: string,
): boolean {
  return (section.layoutGroups ?? []).some(
    (layoutGroup) =>
      layoutGroup.layout === "inline" &&
      layoutGroup.columns === 2 &&
      layoutGroup.controls.length === 2 &&
      layoutGroup.controls.includes(firstControlId) &&
      layoutGroup.controls.includes(secondControlId),
  );
}

function getControlActions(
  control: ToolcraftControlSchema,
): readonly (ToolcraftActionSchema | string)[] {
  const maybeControlWithActions = control as {
    actions?: readonly (ToolcraftActionSchema | string)[];
  };

  return Array.isArray(maybeControlWithActions.actions)
    ? maybeControlWithActions.actions
    : [];
}

function getTimelineTransportControlText(
  controlId: string,
  control: ToolcraftControlSchema,
): string {
  return [
    controlId,
    control.target,
    getControlLabelText(control),
    ...getControlActions(control).map(getActionSearchText),
  ].join(" ");
}

function getAnimationIntentControlText({
  control,
  controlId,
  sectionTitle,
}: ToolcraftVisibleControl): string {
  return [
    sectionTitle ?? "",
    controlId,
    control.target,
    getControlLabelText(control),
  ].join(" ");
}

function getSearchableControlText({
  control,
  controlId,
  sectionTitle,
}: ToolcraftVisibleControl): string {
  return [
    sectionTitle ?? "",
    controlId,
    control.target,
    getControlLabelText(control),
  ]
    .join(" ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function actionLooksLikePngExport(action: ToolcraftActionSchema | string): boolean {
  const text = getActionSearchText(action).replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    (/\b(export|download)\b/i.test(text) && /\b(png|image)\b/i.test(text)) ||
    /\bexport\.png\b/i.test(text)
  );
}

function actionLooksLikeVideoExport(action: ToolcraftActionSchema | string): boolean {
  const text = getActionSearchText(action).replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    (/\b(export|download)\b/i.test(text) && /\b(video|mp4|webm|mov)\b/i.test(text)) ||
    /\bexport\.video\b/i.test(text)
  );
}

function schemaHasPngExportPanelAction(schema: ResolvedToolcraftAppSchema): boolean {
  return (schema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some(
      (control) =>
        control.type === "panelActions" &&
        getControlActions(control).some(actionLooksLikePngExport),
    ),
  );
}

function schemaHasVideoExportPanelAction(schema: ResolvedToolcraftAppSchema): boolean {
  return (schema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some(
      (control) =>
        control.type === "panelActions" &&
        getControlActions(control).some(actionLooksLikeVideoExport),
    ),
  );
}

function getFirstPanelActionsSectionIndex(schema: ResolvedToolcraftAppSchema): number {
  return (schema.panels.controls?.sections ?? []).findIndex((section) =>
    Object.values(section.controls).some((control) => control.type === "panelActions"),
  );
}

function getSchemaControlsSectionByTitle(
  schema: ResolvedToolcraftAppSchema,
  title: string,
): NonNullable<ResolvedToolcraftAppSchema["panels"]["controls"]>["sections"][number] | undefined {
  const normalizedTitle = normalizeToolcraftSemanticText(title);

  return (schema.panels.controls?.sections ?? []).find(
    (section) => normalizeToolcraftSemanticText(section.title) === normalizedTitle,
  );
}

function getSchemaControlsSectionIndexByTitle(
  schema: ResolvedToolcraftAppSchema,
  title: string,
): number {
  const normalizedTitle = normalizeToolcraftSemanticText(title);

  return (schema.panels.controls?.sections ?? []).findIndex(
    (section) => normalizeToolcraftSemanticText(section.title) === normalizedTitle,
  );
}

function getSectionControlEntryByTarget(
  section:
    | NonNullable<ResolvedToolcraftAppSchema["panels"]["controls"]>["sections"][number]
    | undefined,
  target: string,
): readonly [string, ToolcraftControlSchema] | undefined {
  if (!section) {
    return undefined;
  }

  return Object.entries(section.controls).find(([, control]) => control.target === target);
}

function schemaHasOutputBackgroundColorControl(
  controls: readonly ToolcraftVisibleControl[],
): boolean {
  return controls.some((visibleControl) => {
    const { control } = visibleControl;

    if (control.type !== "color") {
      return false;
    }

    return /\b(background|backdrop|scene|canvas)\b/i.test(
      getSearchableControlText(visibleControl),
    );
  });
}

function schemaHasOutputBackgroundToggleControl(
  controls: readonly ToolcraftVisibleControl[],
): boolean {
  return controls.some(isOutputBackgroundToggleControl);
}

function isOutputBackgroundToggleControl(visibleControl: ToolcraftVisibleControl): boolean {
  const { control } = visibleControl;

  if (
    control.type !== "switch" &&
    control.type !== "checkbox" &&
    control.type !== "select" &&
    control.type !== "segmented"
  ) {
    return false;
  }

  return /\b(background|backdrop|transparent|transparency|alpha)\b/i.test(
    getSearchableControlText(visibleControl),
  );
}

function getOutputBackgroundColorEntry(
  section:
    | NonNullable<ResolvedToolcraftAppSchema["panels"]["controls"]>["sections"][number]
    | undefined,
): readonly [string, ToolcraftControlSchema] | undefined {
  if (!section) {
    return undefined;
  }

  return Object.entries(section.controls).find(([controlId, control]) => {
    if (control.type !== "color") {
      return false;
    }

    return /\b(background|backdrop|scene|canvas)\b/i.test(
      [section.title, controlId, control.target, getControlLabelText(control)]
        .join(" ")
        .replace(/([a-z])([A-Z])/g, "$1 $2"),
    );
  });
}

function sectionHasEqualWidthOutputBackgroundRow(
  section:
    | NonNullable<ResolvedToolcraftAppSchema["panels"]["controls"]>["sections"][number]
    | undefined,
  toggleControlId: string | undefined,
  colorControlId: string | undefined,
): boolean {
  if (!section || !toggleControlId || !colorControlId) {
    return false;
  }

  return (section.layoutGroups ?? []).some(
    (layoutGroup) =>
      layoutGroup.layout === "inline" &&
      layoutGroup.columns === 2 &&
      layoutGroup.controls.length === 2 &&
      layoutGroup.controls[0] === toggleControlId &&
      layoutGroup.controls[1] === colorControlId,
  );
}

const SEGMENTED_CONTROL_MAX_OPTIONS = 4;
const SEGMENTED_CONTROL_MAX_OPTION_LABEL_LENGTH = 9;
const SEGMENTED_CONTROL_MAX_TOTAL_LABEL_LENGTH = 24;

function getSegmentedControlLayoutError(
  control: ToolcraftControlSchema,
): string | null {
  if (control.type !== "segmented") {
    return null;
  }

  const labels = control.options?.map((option) => option.label.trim()) ?? [];
  const totalLabelLength = labels.reduce((total, label) => total + label.length, 0);
  const longLabels = labels.filter(
    (label) => label.length > SEGMENTED_CONTROL_MAX_OPTION_LABEL_LENGTH,
  );

  if (
    labels.length > SEGMENTED_CONTROL_MAX_OPTIONS ||
    longLabels.length > 0 ||
    totalLabelLength > SEGMENTED_CONTROL_MAX_TOTAL_LABEL_LENGTH
  ) {
    return [
      `segmented controls must preserve cell padding: use at most ${SEGMENTED_CONTROL_MAX_OPTIONS} short options`,
      `(max ${SEGMENTED_CONTROL_MAX_OPTION_LABEL_LENGTH} characters per label and ${SEGMENTED_CONTROL_MAX_TOTAL_LABEL_LENGTH} total)`,
      "or shorten labels first; if the compact names still exceed the budget, use a select dropdown instead.",
    ].join(" ");
  }

  return null;
}

const controlOrderRoleRanks = {
  input: 0,
  mode: 1,
  primary: 2,
  spatial: 2,
  color: 2,
  strength: 3,
  detail: 4,
  advanced: 5,
  action: 6,
} satisfies Record<ToolcraftControlOrderRole, number>;

const requiredReferenceCloneCoverage = [
  "canvas-sizing",
  "control-mapping",
  "renderer-state",
] satisfies readonly ToolcraftReferenceCoverage[];

const referenceTransportCoverage = new Set<ToolcraftReferenceCoverage>([
  "export-at-time",
  "pause-resume",
  "restart",
  "time-progress",
]);

const toolcraftReferenceTimelineCoverage = new Set<ToolcraftReferenceTimelineCoverage>([
  "duration",
  "export-at-time",
  "keyframes",
  "loop",
  "playback",
  "restart",
  "scrub",
  "time-progress",
]);

const customReferenceTimelineCoverage = new Set<ToolcraftReferenceTimelineCoverage>([
  "all-range",
  "export-range",
  "jump-to-trim-start",
  "range-playback",
  "state-jump",
  "trim-range",
]);

const timelineTransportControlPattern =
  /\b(play|pause|paused|resume|animate|restart)\b/i;

const animationIntentControlPattern =
  /\b(animation|animate|motion|playback)\b/i;

const requiredAutonomousAnimationCoverage = [
  "no-user-facing-transport",
  "no-play-pause",
  "no-scrub",
  "no-duration-control",
  "no-loop-control",
  "no-export-at-time",
] satisfies readonly ToolcraftAutonomousAnimationCoverage[];

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

function isModeSelectorControl(
  controlId: string,
  control: ToolcraftControlSchema,
): boolean {
  if (control.type !== "select" && control.type !== "segmented") {
    return false;
  }

  return /mode|type|filter|blend|style|preset|variant/i.test(
    `${controlId} ${control.target} ${getControlLabelText(control)}`,
  );
}

function matchesControlMeaning(
  controlId: string,
  control: ToolcraftControlSchema,
  pattern: RegExp,
): boolean {
  return pattern.test(`${controlId} ${control.target} ${getControlLabelText(control)}`);
}

export function inferToolcraftControlOrderRole(
  controlId: string,
  control: ToolcraftControlSchema,
): ToolcraftControlOrderRole {
  if (control.orderRole) {
    return control.orderRole;
  }

  if (control.type === "panelActions") {
    return "action";
  }

  if (
    control.type === "fileDrop" ||
    control.target.startsWith("media.") ||
    control.target === "canvas.size.width" ||
    control.target === "canvas.size.height"
  ) {
    return "input";
  }

  if (isModeSelectorControl(controlId, control)) {
    return "mode";
  }

  if (control.type === "vector") {
    return "spatial";
  }

  if (control.type === "color" || control.type === "gradient") {
    return "color";
  }

  if (
    matchesControlMeaning(
      controlId,
      control,
      /grain|noise|texture|detail|blur|threshold|sample|quality|density|iteration|radius/i,
    )
  ) {
    return "detail";
  }

  if (
    isSliderLikeControl(control) ||
    matchesControlMeaning(
      controlId,
      control,
      /amount|brightness|contrast|depth|highlight|intensity|mix|opacity|saturation|scale|spread|strength/i,
    )
  ) {
    return "strength";
  }

  return "primary";
}

function getToolcraftControlOrderErrors(schema: ResolvedToolcraftAppSchema): string[] {
  const errors: string[] = [];

  for (const section of schema.panels.controls?.sections ?? []) {
    let previousItem: ToolcraftControlOrderItem | undefined;

    for (const [controlId, control] of Object.entries(section.controls)) {
      if (control.type === "panelActions") {
        continue;
      }

      const role = inferToolcraftControlOrderRole(controlId, control);
      const item: ToolcraftControlOrderItem = {
        controlId,
        rank: controlOrderRoleRanks[role],
        role,
        sectionTitle: section.title,
        target: control.target,
        type: control.type,
      };

      if (previousItem && item.rank < previousItem.rank) {
        const sectionLabel = section.title ? `${section.title} / ` : "";

        errors.push(
          `${sectionLabel}${controlId} (${control.target}) has orderRole "${role}" after ${previousItem.controlId} (${previousItem.target}) with orderRole "${previousItem.role}". Move mode/input/primary controls before dependent strength/detail/advanced controls or split them into an earlier section.`,
        );
      }

      previousItem = item;
    }
  }

  return errors;
}

const genericControlSectionTitlePattern =
  /^(controls?|settings?|parameters?|options?|configuration|config|adjustments?)$/i;

const controlTypeSectionTitlePattern =
  /^(sliders?|colors?|colours?|inputs?|selects?|switches?|checkboxes?|toggles?|buttons?|actions?)$/i;

const weakControlLabelContextSectionTitlePattern =
  /^(appearance|look|looks|properties?|style|styles|values?|visuals?)$/i;

const broadControlSectionTitlePattern =
  /^(animation|export|flow|icon|logo|motion|output|scene|shape|shapes|text|typography|visual|visuals)$/i;

const genericControlLabelPattern =
  /^(angle|amount|blur|brightness|color|contrast|count|density|depth|frequency|height|hue|intensity|offset|opacity|phase|position|quality|radius|rotation|saturation|scale|size|spacing|speed|strength|threshold|tint|width)$/i;

const maxPreferredControlsPerSection = 7;
const maxHardControlsPerSection = 10;

const controlSemanticClusterPatterns: ReadonlyArray<readonly [string, RegExp]> = [
  ["input", /\b(upload|source|prompt|content|text|phrase|copy|message|file|media|image)\b/i],
  ["mode", /\b(mode|type|preset|style|variant|blend|filter|layout|format|quality)\b/i],
  ["motion", /\b(animation|speed|velocity|accel|acceleration|correlation|duration|timing|loop|phase|fps|rate)\b/i],
  ["geometry", /\b(width|height|size|scale|position|offset|anchor|origin|target|radius|distance|spread|bend|curve|curves|path|shape|grid|gap)\b/i],
  ["density", /\b(fill|density|amount|count|ratio|word|words|letter|letters|particle|particles|layer|layers|island|islands)\b/i],
  ["color", /\b(color|colour|gradient|shade|tint|background|halo|glow|opacity|alpha|stroke|fillColor|fillOpacity)\b/i],
  ["typography", /\b(font|weight|case|leading|tracking|lineHeight|letterSpacing|typeface)\b/i],
  ["export", /\b(export|copy|download|video|png|webm|mp4|mov|bitrate|resolution)\b/i],
];

const fontPickerOwnedTypographyPartLabels = new Map<string, string>([
  ["case", "case"],
  ["color", "color"],
  ["colour", "color"],
  ["family", "font family"],
  ["fill", "color"],
  ["fillcolor", "color"],
  ["fillopacity", "opacity"],
  ["font", "font family"],
  ["fontcolor", "color"],
  ["fontfamily", "font family"],
  ["fontid", "font family"],
  ["fontsize", "font size"],
  ["fontweight", "font weight"],
  ["foreground", "color"],
  ["foregroundcolor", "color"],
  ["leading", "line height"],
  ["letterspacing", "letter spacing"],
  ["lineheight", "line height"],
  ["opacity", "opacity"],
  ["size", "font size"],
  ["textcase", "case"],
  ["textcolor", "color"],
  ["textfill", "color"],
  ["textopacity", "opacity"],
  ["tracking", "letter spacing"],
  ["typeface", "font family"],
  ["weight", "font weight"],
]);

const fontPickerDescriptionOwnedPartPatterns: ReadonlyArray<readonly [string, RegExp]> = [
  ["font family", /\b(?:font\s+family|family|typeface)\b/i],
  ["font weight", /\b(?:font\s+weight|weight)\b/i],
  ["font size", /\b(?:font\s+size|size)\b/i],
  ["case", /\b(?:text\s+case|case|uppercase|lowercase|capitalize|title\s+case)\b/i],
  ["color", /\b(?:text\s+color|font\s+color|color|colour|fill)\b/i],
  ["opacity", /\b(?:text\s+opacity|font\s+opacity|opacity|alpha)\b/i],
  ["letter spacing", /\b(?:letter\s+spacing|tracking)\b/i],
  ["line height", /\b(?:line\s+height|leading)\b/i],
];

function getToolcraftSectionLabel(sectionTitle: string | undefined, sectionIndex: number): string {
  return sectionTitle?.trim() || `untitled section ${sectionIndex + 1}`;
}

function humanizeToolcraftLabelPart(value: string): string {
  const text = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "";
  }

  return text.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function lowerCaseToolcraftLabelStart(value: string): string {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function normalizeToolcraftSemanticText(value: string | undefined): string {
  return humanizeToolcraftLabelPart(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getToolcraftTargetParts(target: string): string[] {
  return target.split(".").filter(Boolean);
}

function getToolcraftTargetProperty(target: string): string {
  return getToolcraftTargetParts(target).at(-1) ?? "";
}

function getToolcraftStrictTargetPrefix(target: string): string | null {
  const parts = getToolcraftTargetParts(target);

  if (parts.length < 3) {
    return null;
  }

  const prefix = parts.slice(0, -1).join(".");

  if (prefix === "canvas.size") {
    return null;
  }

  return prefix;
}

function getToolcraftLooseTargetPrefix(target: string): string | null {
  const parts = getToolcraftTargetParts(target);

  if (parts.length < 2) {
    return null;
  }

  const prefix = parts.slice(0, -1).join(".");

  if (prefix === "canvas.size") {
    return null;
  }

  return prefix;
}

function isToolcraftWeakSectionContext(sectionTitle: string | undefined): boolean {
  if (!sectionTitle) {
    return true;
  }

  return (
    genericControlSectionTitlePattern.test(sectionTitle) ||
    controlTypeSectionTitlePattern.test(sectionTitle) ||
    weakControlLabelContextSectionTitlePattern.test(sectionTitle)
  );
}

function doesToolcraftSectionMatchTarget(
  sectionTitle: string | undefined,
  target: string,
): boolean {
  const sectionText = normalizeToolcraftSemanticText(sectionTitle);

  if (!sectionText) {
    return false;
  }

  return getToolcraftTargetParts(target).some((part) => {
    const targetText = normalizeToolcraftSemanticText(part);
    return (
      targetText.length > 0 &&
      (targetText === sectionText ||
        targetText.includes(sectionText) ||
        sectionText.includes(targetText))
    );
  });
}

function getToolcraftSuggestedControlLabel(
  control: ToolcraftControlSchema,
  sectionTitle: string | undefined,
): string {
  const label = getControlLabelText(control).trim();
  const targetProperty = humanizeToolcraftLabelPart(control.target.split(".").at(-1) ?? "");
  const normalizedLabel = normalizeToolcraftSemanticText(label);
  const normalizedTargetProperty = normalizeToolcraftSemanticText(targetProperty);

  if (
    label &&
    normalizedTargetProperty &&
    normalizedTargetProperty !== normalizedLabel &&
    normalizedTargetProperty.endsWith(normalizedLabel)
  ) {
    return targetProperty;
  }

  const property = label || targetProperty;
  const loosePrefix = getToolcraftLooseTargetPrefix(control.target);
  const prefixParts = loosePrefix ? getToolcraftTargetParts(loosePrefix) : [];
  const prefixEntity = humanizeToolcraftLabelPart(prefixParts.at(-1) ?? "");
  const sectionEntity =
    sectionTitle && !isToolcraftWeakSectionContext(sectionTitle)
      ? humanizeToolcraftLabelPart(sectionTitle)
      : "";
  const entity = prefixEntity || sectionEntity;

  if (!entity) {
    return property;
  }

  const normalizedEntity = normalizeToolcraftSemanticText(entity);
  const normalizedProperty = normalizeToolcraftSemanticText(property);

  if (normalizedEntity && normalizedProperty.includes(normalizedEntity)) {
    return property;
  }

  return `${entity} ${lowerCaseToolcraftLabelStart(property)}`;
}

function getToolcraftFontPickerOwnedTypographyPart(
  control: ToolcraftControlSchema,
): string | undefined {
  if (control.type === "fontPicker") {
    return undefined;
  }

  const normalizedCandidates = [
    getToolcraftTargetProperty(control.target),
    getControlLabelText(control),
  ].map(normalizeToolcraftSemanticText);

  for (const candidate of normalizedCandidates) {
    const ownedPart = fontPickerOwnedTypographyPartLabels.get(candidate);

    if (ownedPart) {
      return ownedPart;
    }
  }

  return undefined;
}

function getToolcraftControlSemanticCluster(
  controlId: string,
  control: ToolcraftControlSchema,
): string {
  const text = [
    controlId,
    getToolcraftTargetProperty(control.target),
    getControlLabelText(control),
    control.description ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  for (const [cluster, pattern] of controlSemanticClusterPatterns) {
    if (pattern.test(text)) {
      return cluster;
    }
  }

  return inferToolcraftControlOrderRole(controlId, control);
}

function getToolcraftGenericControlLabelError({
  control,
  controlId,
  sectionLabel,
  sectionLoosePrefixCount,
  sectionTitle,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  sectionLabel: string;
  sectionLoosePrefixCount: number;
  sectionTitle: string | undefined;
}): string | undefined {
  const label = getControlLabelText(control).trim();

  if (!genericControlLabelPattern.test(label)) {
    return undefined;
  }

  const hasWeakContext =
    isToolcraftWeakSectionContext(sectionTitle) ||
    (sectionLoosePrefixCount > 1 &&
      !doesToolcraftSectionMatchTarget(sectionTitle, control.target));

  if (!hasWeakContext) {
    return undefined;
  }

  const suggestedLabel = getToolcraftSuggestedControlLabel(control, sectionTitle);

  return `${sectionLabel} / ${controlId} label "${label}" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "${suggestedLabel}".`;
}

function getToolcraftControlDescriptionError({
  control,
  controlId,
  sectionLabel,
  sectionTitle,
}: {
  control: ToolcraftControlSchema;
  controlId: string;
  sectionLabel: string;
  sectionTitle: string | undefined;
}): string | undefined {
  const description = control.description?.trim();

  if (!description) {
    return undefined;
  }

  const label = getControlLabelText(control).trim();

  if (
    isToolcraftObviousColorSectionControlDescription({
      control,
      description,
      label,
      sectionTitle,
    })
  ) {
    return `${sectionLabel} / ${controlId} description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.`;
  }

  if (control.type !== "fontPicker") {
    return undefined;
  }

  const repeatedParts = fontPickerDescriptionOwnedPartPatterns
    .filter(([, pattern]) => pattern.test(description))
    .map(([part]) => part);

  if (repeatedParts.length < 2) {
    return undefined;
  }

  return `${sectionLabel} / ${controlId} description repeats FontPicker-owned fields (${repeatedParts.join(", ")}). FontPicker help must explain only non-obvious product behavior; use section titles and visible field labels for font family, weight, size, case, color, opacity, letter spacing, and line height, or omit description.`;
}

function isToolcraftColorSectionTitle(sectionTitle: string | undefined): boolean {
  return /\b(colou?rs?|palette|palettes|shades?|accents?)\b/i.test(
    sectionTitle ?? "",
  );
}

function isToolcraftSequentialColorLabel(label: string): boolean {
  return /^colou?r\s+\d+$/i.test(label.trim());
}

function isToolcraftPaletteVariationTarget(target: string): boolean {
  return (
    /(?:^|\.)(?:palette|palettes|colou?rs?|shades?|accents?)\b/i.test(
      target,
    ) || /(?:^|\.)(?:accent|shade|colou?r)\d+\b/i.test(target)
  );
}

function isToolcraftSimplePaletteDistributionLabel(label: string): boolean {
  return /^(spread|mix|distribution)$/i.test(label.trim());
}

function isToolcraftGenericControlHelpDescription(description: string): boolean {
  return /^(adjusts?|changes?|chooses?|controls?|defines?|selects?|sets?|updates?)\b/i.test(
    description.trim(),
  );
}

function isToolcraftObviousColorSectionControlDescription({
  control,
  description,
  label,
  sectionTitle,
}: {
  control: ToolcraftControlSchema;
  description: string;
  label: string;
  sectionTitle: string | undefined;
}): boolean {
  if (!isToolcraftColorSectionTitle(sectionTitle)) {
    return false;
  }

  if (
    (control.type === "color" || control.type === "colorOpacity") &&
    isToolcraftSequentialColorLabel(label)
  ) {
    return true;
  }

  return (
    isToolcraftSimplePaletteDistributionLabel(label) &&
    isToolcraftGenericControlHelpDescription(description)
  );
}

function getToolcraftColorBankLabelErrors({
  controls,
  sectionLabel,
  sectionTitle,
}: {
  controls: readonly [string, ToolcraftControlSchema][];
  sectionLabel: string;
  sectionTitle: string | undefined;
}): string[] {
  const colorControls = controls.filter(([, control]) => {
    if (control.type !== "color" && control.type !== "colorOpacity") {
      return false;
    }

    return true;
  });

  if (colorControls.length < 2) {
    return [];
  }

  const loosePrefixes = new Set(
    colorControls
      .map(([, control]) => getToolcraftLooseTargetPrefix(control.target))
      .filter((prefix): prefix is string => Boolean(prefix)),
  );

  if (loosePrefixes.size !== 1) {
    return [];
  }

  const sequentialColorControls = colorControls.filter(([, control]) =>
    isToolcraftSequentialColorLabel(getControlLabelText(control)),
  );
  const isPaletteVariationBank =
    colorControls.every(([, control]) =>
      isToolcraftPaletteVariationTarget(control.target),
    ) ||
    (isToolcraftColorSectionTitle(sectionTitle) &&
      sequentialColorControls.length > 0);

  if (!isPaletteVariationBank) {
    return [];
  }

  const visibleColorControls = colorControls.filter(([, control]) =>
    hasVisibleControlLabel(control),
  );
  const errors: string[] = [];

  if (
    visibleColorControls.length > 0 &&
    visibleColorControls.length < colorControls.length
  ) {
    errors.push(
      `${sectionLabel} mixes labeled and unlabeled color items in one palette variation group. Decide label visibility for the whole group: omit all per-item labels when colors only add variety, or label every item only when each color has a distinct user-facing role.`,
    );
  }

  for (const [controlId, control] of sequentialColorControls) {
    const label = getControlLabelText(control).trim();

    errors.push(
      `${sectionLabel} / ${controlId} uses visible label "${label}" for a palette variation color. When colors only add variety to one shared palette, set label: false or use collectionActions with unlabeled items. Keep visible labels only when each color edits a distinct user-facing entity such as Fill, Stroke, Background, Connector, or Object color.`,
    );
  }

  return errors;
}

function getToolcraftControlSectionGroupingErrors(
  schema: ResolvedToolcraftAppSchema,
): string[] {
  const errors: string[] = [];
  const visibleControls: Array<{
    control: ToolcraftControlSchema;
    controlId: string;
    loosePrefix: string | null;
    sectionLabel: string;
  }> = [];
  const strictPrefixSections = new Map<string, Set<string>>();
  const loosePrefixSections = new Map<string, Set<string>>();
  const colorSectionLoosePrefixes = new Map<string, string>();
  const sectionTitleCounts = new Map<string, { count: number; label: string }>();

  for (const [sectionIndex, section] of (schema.panels.controls?.sections ?? []).entries()) {
    const sectionTitle = section.title?.trim();
    const sectionLabel = getToolcraftSectionLabel(sectionTitle, sectionIndex);
    const controls = Object.entries(section.controls).filter(
      ([, control]) => control.type !== "panelActions",
    );

    if (controls.length === 0) {
      continue;
    }

    if (!sectionTitle) {
      errors.push(
        `${sectionLabel} is missing a controls section title. Every visible controls-panel section must name the product entity, workflow stage, or behavior it edits.`,
      );
    }

    if (sectionTitle) {
      const normalizedSectionTitle = normalizeToolcraftSemanticText(sectionTitle);
      const titleCount = sectionTitleCounts.get(normalizedSectionTitle);
      sectionTitleCounts.set(normalizedSectionTitle, {
        count: (titleCount?.count ?? 0) + 1,
        label: titleCount?.label ?? sectionTitle,
      });
    }

    if (sectionTitle && genericControlSectionTitlePattern.test(sectionTitle)) {
      errors.push(
        `${sectionLabel} is too generic for a controls section. Name the product entity, workflow stage, or behavior it edits instead of using a bucket title.`,
      );
    }

    if (sectionTitle && controlTypeSectionTitlePattern.test(sectionTitle)) {
      errors.push(
        `${sectionLabel} names a UI control type instead of the product entity. Group controls by product meaning, not by Slider, Color, Input, Button, or similar component type.`,
      );
    }

    const sectionLoosePrefixes = new Set(
      controls
        .map(([, control]) => getToolcraftLooseTargetPrefix(control.target))
        .filter((prefix): prefix is string => Boolean(prefix)),
    );
    const productControls = controls.filter(
      ([, control]) =>
        control.type !== "settingsTransfer" &&
        control.target !== "canvas.size.width" &&
        control.target !== "canvas.size.height",
    );
    const semanticClusters = new Set(
      productControls.map(([controlId, control]) =>
        getToolcraftControlSemanticCluster(controlId, control),
      ),
    );
    const clusterList = [...semanticClusters].join(", ");
    const hasBroadSectionTitle =
      sectionTitle !== undefined && broadControlSectionTitlePattern.test(sectionTitle);

    if (
      productControls.length > maxPreferredControlsPerSection &&
      hasBroadSectionTitle &&
      semanticClusters.size >= 3
    ) {
      errors.push(
        `${sectionLabel} has ${productControls.length} controls across multiple semantic clusters (${clusterList}). Broad section titles are only valid for small cohesive groups; split this into discrete sections with specific titles such as motion, geometry, density, color, typography, or export sub-entities.`,
      );
    }

    if (productControls.length > maxHardControlsPerSection && semanticClusters.size > 1) {
      errors.push(
        `${sectionLabel} has ${productControls.length} controls across ${semanticClusters.size} semantic clusters (${clusterList}). Controls-panel sections should stay discrete; split sections that grow past ${maxHardControlsPerSection} controls unless every control edits one tightly scoped entity.`,
      );
    }

    errors.push(
      ...getToolcraftColorBankLabelErrors({
        controls,
        sectionLabel,
        sectionTitle,
      }),
    );

    for (const [controlId, control] of controls) {
      const strictPrefix = getToolcraftStrictTargetPrefix(control.target);
      const loosePrefix = getToolcraftLooseTargetPrefix(control.target);
      const genericLabelError = getToolcraftGenericControlLabelError({
        control,
        controlId,
        sectionLabel,
        sectionLoosePrefixCount: sectionLoosePrefixes.size,
        sectionTitle,
      });

      if (genericLabelError) {
        errors.push(genericLabelError);
      }

      const descriptionError = getToolcraftControlDescriptionError({
        control,
        controlId,
        sectionLabel,
        sectionTitle,
      });

      if (descriptionError) {
        errors.push(descriptionError);
      }

      visibleControls.push({
        control,
        controlId,
        loosePrefix,
        sectionLabel,
      });

      if (strictPrefix) {
        const sections = strictPrefixSections.get(strictPrefix) ?? new Set<string>();
        sections.add(sectionLabel);
        strictPrefixSections.set(strictPrefix, sections);
      }

      if (loosePrefix) {
        const sections = loosePrefixSections.get(loosePrefix) ?? new Set<string>();
        sections.add(sectionLabel);
        loosePrefixSections.set(loosePrefix, sections);
      }

      if (
        control.type === "color" &&
        sectionTitle &&
        /^colors?$/i.test(sectionTitle) &&
        loosePrefix
      ) {
        colorSectionLoosePrefixes.set(loosePrefix, `${sectionLabel} / ${controlId}`);
      }
    }
  }

  for (const { count, label } of sectionTitleCounts.values()) {
    if (count > 1) {
      errors.push(
        `Controls panel repeats the section title "${label}" ${count} times. Section titles must be unique and describe distinct product entities or workflow stages.`,
      );
    }
  }

  const fontPickerControls = visibleControls.filter(
    (item) => item.control.type === "fontPicker" && item.loosePrefix,
  );

  for (const item of visibleControls) {
    if (!item.loosePrefix || item.control.type === "fontPicker") {
      continue;
    }

    const ownedTypographyPart =
      getToolcraftFontPickerOwnedTypographyPart(item.control);

    if (!ownedTypographyPart) {
      continue;
    }

    const owningFontPicker = fontPickerControls.find(
      (fontPicker) => fontPicker.loosePrefix === item.loosePrefix,
    );

    if (!owningFontPicker) {
      continue;
    }

    const label = getControlLabelText(item.control).trim() || item.controlId;

    errors.push(
      `${item.sectionLabel} / ${item.controlId} splits "${label}" out of the FontPicker-owned typography block for "${item.loosePrefix}". Keep font family, weight, size, case, letter spacing, line height, color, and opacity in the same fontPicker value.`,
    );
  }

  for (const [prefix, sections] of strictPrefixSections) {
    if (sections.size > 1) {
      errors.push(
        `Controls for product entity "${prefix}" are split across sections: ${[...sections].join(", ")}. Keep controls for the same product entity in one semantic section unless the spec names a real workflow split.`,
      );
    }
  }

  for (const [prefix, colorControlLabel] of colorSectionLoosePrefixes) {
    const sections = loosePrefixSections.get(prefix);

    if (sections && sections.size > 1) {
      errors.push(
        `${colorControlLabel} is separated from other "${prefix}" controls. A color that configures the same product entity belongs inside that entity section with a concise field label that stays unambiguous in context.`,
      );
    }
  }

  return errors;
}

export function collectToolcraftVisibleControls(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ToolcraftVisibleControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls).map(([controlId, control]) => ({
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
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(([, control]) => control.type !== "panelActions")
      .map(([controlId, control]) => {
        const role = inferToolcraftControlOrderRole(controlId, control);

        return {
          controlId,
          rank: controlOrderRoleRanks[role],
          role,
          sectionTitle: section.title,
          target: control.target,
          type: control.type,
        };
      }),
  );
}

export function getToolcraftControlOrderTargets(
  schema: ResolvedToolcraftAppSchema = appSchema,
): string[] {
  return getToolcraftControlOrder(schema).map((item) => item.target);
}

export function validateToolcraftAcceptanceCoverage(
  schema: ResolvedToolcraftAppSchema = appSchema,
  acceptance: readonly ToolcraftComponentAcceptance[] = appAcceptance,
  transferMode: ToolcraftTransferMode = appTransferMode,
): string[] {
  const errors: string[] = [];
  const controls = collectToolcraftVisibleControls(schema);
  const controlAcceptance = new Map(
    acceptance
      .filter((entry) => entry.kind === "control")
      .map((entry) => [entry.target, entry]),
  );
  const timelineMode = schema.panels.timeline?.enabled ? schema.panels.timeline.mode : null;
  const layersEnabled = Boolean(schema.panels.layers);
  const controlTargets = new Set(controls.map(({ control }) => control.target));
  const animationIntent = transferMode.animationIntent;
  const animationControls = controls.filter(
    (visibleControl) =>
      visibleControl.control.type !== "panelActions" &&
      animationIntentControlPattern.test(getAnimationIntentControlText(visibleControl)),
  );
  const commandTargets = new Set([
    "canvas.center",
    "canvas.setOffset",
    "canvas.setSize",
    "canvas.setViewport",
    "canvas.zoomIn",
    "canvas.zoomOut",
    "controls.setValue",
    "history.redo",
    "history.undo",
  ]);

  errors.push(...getToolcraftControlOrderErrors(schema));
  errors.push(...getToolcraftControlSectionGroupingErrors(schema));

  for (const [sectionIndex, section] of (schema.panels.controls?.sections ?? []).entries()) {
    const sectionLabel = getToolcraftSectionLabel(section.title, sectionIndex);

    for (const layoutGroup of section.layoutGroups ?? []) {
      if (layoutGroup.layout !== "inline") {
        continue;
      }

      const rangeSliderIds = layoutGroup.controls.filter(
        (controlId) => section.controls[controlId]?.type === "rangeSlider",
      );

      if (rangeSliderIds.length > 0) {
        errors.push(
          `${sectionLabel} layoutGroups inline row "${layoutGroup.controls.join(", ")}" includes rangeSlider ${rangeSliderIds.join(", ")}. RangeSlider is a full-width two-thumb control and must not share a row with another slider or range slider.`,
        );
      }

      const switchEntries = layoutGroup.controls
        .map((controlId) => [controlId, section.controls[controlId]] as const)
        .filter(
          (entry): entry is readonly [string, ToolcraftControlSchema] =>
            Boolean(entry[1]) && entry[1].type === "switch",
        );
      const booleanEntries = layoutGroup.controls
        .map((controlId) => [controlId, section.controls[controlId]] as const)
        .filter(
          (entry): entry is readonly [string, ToolcraftControlSchema] =>
            Boolean(entry[1]) && isBooleanControl(entry[1]),
        );
      const parameterEntries = layoutGroup.controls
        .map((controlId) => [controlId, section.controls[controlId]] as const)
        .filter(
          (entry): entry is readonly [string, ToolcraftControlSchema] =>
            Boolean(entry[1]) && !isBooleanControl(entry[1]),
        );

      if (switchEntries.length > 1) {
        const unsafeSwitchLabels = switchEntries.filter(
          ([controlId, control]) => !isInlineSwitchLabelSafe(controlId, control),
        );

        if (unsafeSwitchLabels.length > 0) {
          errors.push(
            `${sectionLabel} layoutGroups inline row "${layoutGroup.controls.join(", ")}" includes switch labels ${unsafeSwitchLabels.map(([controlId, control]) => `${controlId} "${getInlineSwitchLabelText(controlId, control)}"`).join(", ")} that are too long for a two-column toggle row. Switches share a row only when every visible label fits without truncation; shorten labels or stack them.`,
          );
        }
      }

      if (booleanEntries.length === 1 && parameterEntries.length === 1) {
        const unsafeBooleanLabels = booleanEntries.filter(
          ([controlId, control]) => !isInlineSwitchLabelSafe(controlId, control),
        );

        if (unsafeBooleanLabels.length > 0) {
          errors.push(
            `${sectionLabel} layoutGroups inline row "${layoutGroup.controls.join(", ")}" includes toggle label ${unsafeBooleanLabels.map(([controlId, control]) => `${controlId} "${getInlineSwitchLabelText(controlId, control)}"`).join(", ")} that is too long for a compact toggle-plus-parameter row. Keep the toggle label short, such as "Include" inside Background, or stack the controls.`,
          );
        }
      }
    }

    const sectionControls = Object.entries(section.controls).filter(
      ([, control]) => control.type !== "panelActions",
    );

    for (let index = 0; index < sectionControls.length - 1; index += 1) {
      const [firstControlId, firstControl] = sectionControls[index] ?? [];
      const [secondControlId, secondControl] = sectionControls[index + 1] ?? [];

      if (
        !firstControlId ||
        !secondControlId ||
        !firstControl ||
        !secondControl ||
        firstControl.visibleWhen ||
        secondControl.visibleWhen ||
        !isBooleanControl(firstControl) ||
        !isBooleanControl(secondControl) ||
        !isInlineSwitchLabelSafe(firstControlId, firstControl) ||
        !isInlineSwitchLabelSafe(secondControlId, secondControl) ||
        !controlsShareToolcraftTargetEntity(firstControl, secondControl) ||
        sectionHasInlineLayoutGroupForPair(section, firstControlId, secondControlId)
      ) {
        continue;
      }

      errors.push(
        `${sectionLabel} has adjacent short toggle controls "${firstControlId}" and "${secondControlId}" for the same product entity "${getToolcraftLooseTargetPrefix(firstControl.target)}". Put them in a two-column inline layoutGroup so compact paired toggles share one row.`,
      );
    }
  }

  if (schemaHasPngExportPanelAction(schema)) {
    const backgroundSection = getSchemaControlsSectionByTitle(schema, "Background");
    const backgroundSectionIndex = getSchemaControlsSectionIndexByTitle(schema, "Background");
    const panelActionsSectionIndex = getFirstPanelActionsSectionIndex(schema);
    const imageExportSectionIndex = getSchemaControlsSectionIndexByTitle(schema, "Image Export");
    const videoExportSectionIndex = getSchemaControlsSectionIndexByTitle(schema, "Video Export");
    const hasVideoExportAction = schemaHasVideoExportPanelAction(schema);
    const expectedOutputSettingsIndex =
      imageExportSectionIndex >= 0 ? imageExportSectionIndex : videoExportSectionIndex;
    const finalExportSettingsIndex = hasVideoExportAction
      ? videoExportSectionIndex
      : imageExportSectionIndex;
    const includeBackgroundEntry = getSectionControlEntryByTarget(
      backgroundSection,
      "export.includeBackground",
    );
    const backgroundColorEntry = getOutputBackgroundColorEntry(backgroundSection);
    const imageExportSection = getSchemaControlsSectionByTitle(schema, "Image Export");
    const imageFormatEntry = getSectionControlEntryByTarget(
      imageExportSection,
      "export.image.format",
    );
    const imageResolutionEntry = getSectionControlEntryByTarget(
      imageExportSection,
      "export.image.resolution",
    );
    const imageFormatControl = imageFormatEntry?.[1];
    const imageResolutionControl = imageResolutionEntry?.[1];
    const imageFormatOptionValues =
      imageFormatControl?.options?.map((option) => option.value.toLowerCase()) ?? [];
    const imageResolutionOptionValues =
      imageResolutionControl?.options?.map((option) => option.value.toLowerCase()) ?? [];

    if (!backgroundSection) {
      errors.push(
        'Product apps with Export PNG must expose a separate controls section titled "Background" directly before the first export settings section.',
      );
    }

    if (
      backgroundSectionIndex >= 0 &&
      expectedOutputSettingsIndex >= 0 &&
      backgroundSectionIndex !== expectedOutputSettingsIndex - 1
    ) {
      errors.push(
        'The "Background" controls section must sit directly before the first export settings section: Image Export when PNG export exists, otherwise Video Export.',
      );
    }

    if (
      finalExportSettingsIndex >= 0 &&
      panelActionsSectionIndex >= 0 &&
      finalExportSettingsIndex !== panelActionsSectionIndex - 1
    ) {
      errors.push(
        'Export settings must sit directly above sticky footer actions: Image Export for still apps, or Video Export after Image Export for animated apps.',
      );
    }

    if (
      hasVideoExportAction &&
      imageExportSectionIndex >= 0 &&
      videoExportSectionIndex >= 0 &&
      imageExportSectionIndex !== videoExportSectionIndex - 1
    ) {
      errors.push(
        'Animated apps with both Export PNG and Export Video must place Image Export immediately before Video Export.',
      );
    }

    if (!schemaHasOutputBackgroundColorControl(controls)) {
      errors.push(
        "Product apps with Export PNG must expose a user-facing background color control such as appearance.background or scene.background. Preview and PNG export must read that runtime value instead of hardcoding the product background.",
      );
    }

    if (!backgroundColorEntry) {
      errors.push(
        'The "Background" section must contain the renderer-owned background color control, such as appearance.background or scene.background.',
      );
    } else {
      const [, backgroundColorControl] = backgroundColorEntry;

      if (backgroundColorControl.label !== false) {
        errors.push(
          'The background color control inside the required "Background" section must use label false; the section title already supplies the visible context.',
        );
      }
    }

    if (!schemaHasOutputBackgroundToggleControl(controls)) {
      errors.push(
        'Product apps with Export PNG must expose export.includeBackground inside the required "Background" section as a Switch labeled "Include". PNG export must pass that runtime value to createToolcraftPngExportCanvas includeBackground; live preview must use shouldIncludeToolcraftPreviewBackground(state).',
      );
    }

    if (!includeBackgroundEntry) {
      errors.push(
        'The "Background" section must contain export.includeBackground as the Include switch.',
      );
    } else {
      const [, includeBackgroundControl] = includeBackgroundEntry;

      if (includeBackgroundControl.type !== "switch") {
        errors.push('export.includeBackground must be a Switch control labeled "Include".');
      }

      if (getControlLabelText(includeBackgroundControl) !== "Include") {
        errors.push(
          'export.includeBackground must use the short visible label "Include"; the Background section title already supplies the rest of the context.',
        );
      }
    }

    if (
      !sectionHasEqualWidthOutputBackgroundRow(
        backgroundSection,
        includeBackgroundEntry?.[0],
        backgroundColorEntry?.[0],
      )
    ) {
      errors.push(
        'The "Background" section must render export.includeBackground and the background color in one two-column inline layoutGroup, with Include on the left and the unlabeled background color on the right.',
      );
    }

    if (!imageExportSection) {
      errors.push(
        'Apps with Export PNG must expose image export settings in a separate controls section titled "Image Export" directly above sticky footer export actions or directly before "Video Export" when video export also exists.',
      );
    }

    if (!imageFormatControl) {
      errors.push(
        'The separate "Image Export" section must include a format control with target "export.image.format".',
      );
    } else {
      if (imageFormatControl.type !== "select") {
        errors.push(
          'Image Export format must be a Select control so it matches the Video Export settings structure.',
        );
      }

      if (!imageFormatOptionValues.includes("png") || !imageFormatOptionValues.includes("jpg")) {
        errors.push('Image Export format options must include "png" and "jpg".');
      }

      if (imageFormatControl.defaultValue !== "png") {
        errors.push('Image Export format must default to "png".');
      }
    }

    if (!imageResolutionControl) {
      errors.push(
        'The separate "Image Export" section must include a resolution control with target "export.image.resolution".',
      );
    } else {
      if (imageResolutionControl.type !== "select") {
        errors.push(
          'Image Export resolution must be a Select control so it matches the Video Export settings structure.',
        );
      }

      if (
        !imageResolutionOptionValues.includes("2k") ||
        !imageResolutionOptionValues.includes("4k") ||
        !imageResolutionOptionValues.includes("8k")
      ) {
        errors.push(
          'Image Export resolution options must include "2k", "4k", and "8k".',
        );
      }

      if (imageResolutionControl.defaultValue !== "4k") {
        errors.push('Image Export resolution must default to "4k".');
      }
    }

    const imageFormatControlId = imageFormatEntry?.[0];
    const imageResolutionControlId = imageResolutionEntry?.[0];
    const imageExportHasInlinePair =
      imageExportSection === undefined ||
      imageFormatControlId === undefined ||
      imageResolutionControlId === undefined
        ? false
        : sectionHasInlineLayoutGroupForPair(
            imageExportSection,
            imageFormatControlId,
            imageResolutionControlId,
          );

    if (!imageExportHasInlinePair) {
      errors.push(
        "Image Export format and resolution must render as one compact two-column inline row, matching Video Export settings.",
      );
    }
  }

  if (animationControls.length > 0 && !timelineMode && animationIntent?.mode !== "autonomous") {
    errors.push(
      [
        `Animation controls ${animationControls.map(({ control, controlId, sectionTitle }) => `"${sectionTitle ? `${sectionTitle} / ` : ""}${controlId}" (${control.target})`).join(", ")} exist while panels.timeline is omitted.`,
        'Use panels.timeline mode "playback" for product animation transport, mode "keyframes" for editable keyframes, or declare appTransferMode.animationIntent mode "autonomous" with coverage proving there is no user-facing transport.',
      ].join(" "),
    );
  }

  if (animationIntent?.mode === "autonomous") {
    const declaredAutonomousCoverage = new Set(animationIntent.behaviorCoverage);
    const missingAutonomousCoverage = requiredAutonomousAnimationCoverage.filter(
      (coverage) => !declaredAutonomousCoverage.has(coverage),
    );

    if (timelineMode) {
      errors.push(
        `appTransferMode.animationIntent mode "autonomous" conflicts with panels.timeline mode "${timelineMode}". Use timeline-playback, timeline-keyframes, or remove the timeline.`,
      );
    }

    if (!animationIntent.reason.trim()) {
      errors.push(
        'appTransferMode.animationIntent mode "autonomous" must include a reason explaining why the animation is decorative/self-running and does not need top timeline transport.',
      );
    }

    if (missingAutonomousCoverage.length > 0) {
      errors.push(
        `appTransferMode.animationIntent mode "autonomous" must include behaviorCoverage ${missingAutonomousCoverage.map((coverage) => `"${coverage}"`).join(", ")}.`,
      );
    }
  }

  if (animationIntent?.mode === "timeline-playback" && timelineMode !== "playback") {
    errors.push(
      'appTransferMode.animationIntent mode "timeline-playback" requires panels.timeline mode "playback".',
    );
  }

  if (animationIntent?.mode === "timeline-keyframes" && timelineMode !== "keyframes") {
    errors.push(
      'appTransferMode.animationIntent mode "timeline-keyframes" requires panels.timeline mode "keyframes".',
    );
  }

  if (transferMode.mode === "reference-runtime-clone") {
    const declaredReferenceCoverage = new Set(transferMode.behaviorCoverage);
    const referenceTimeline = transferMode.referenceTimeline;

    if (!schema.assembly.surfaces.canvas.enabled) {
      errors.push(
        "reference-runtime-clone must keep the Toolcraft canvas shell enabled; preserve the reference renderer inside ToolcraftApp canvasContent instead of replacing the app with the original UI.",
      );
    }

    if (!transferMode.referenceName.trim()) {
      errors.push(
        "reference-runtime-clone transferMode must name the reference app or artifact.",
      );
    }

    if (transferMode.sourceOfTruth !== "reference-runtime") {
      errors.push(
        'reference-runtime-clone transferMode must set sourceOfTruth to "reference-runtime".',
      );
    }

    for (const coverage of requiredReferenceCloneCoverage) {
      if (!declaredReferenceCoverage.has(coverage)) {
        errors.push(
          `reference-runtime-clone transferMode must include behaviorCoverage "${coverage}".`,
        );
      }
    }

    for (const coverage of declaredReferenceCoverage) {
      const entry = acceptance.find(
        (acceptanceEntry) => acceptanceEntry.referenceCoverage === coverage,
      );

      if (!entry) {
        errors.push(
          `reference-runtime-clone behaviorCoverage "${coverage}" is missing an acceptance entry with referenceCoverage "${coverage}".`,
        );
        continue;
      }

      if (!entry.automated || !entry.automatedTestName.trim()) {
        errors.push(
          `${entry.id} must have automated coverage proving reference behavior "${coverage}".`,
        );
      }

      if (!entry.browser || !entry.browserTestName.trim()) {
        errors.push(
          `${entry.id} must have browser coverage proving reference behavior "${coverage}".`,
        );
      }

      if (!entry.expectedObservable.trim()) {
        errors.push(
          `${entry.id} must describe the observable reference behavior for "${coverage}".`,
        );
      }
    }

    if (!referenceTimeline) {
      errors.push(
        'reference-runtime-clone transferMode must declare referenceTimeline with mode "none", "toolcraft-playback", "toolcraft-keyframes", or "custom-reference-timeline".',
      );
    } else {
      const declaredReferenceTimelineCoverage = new Set(referenceTimeline.behaviorCoverage);
      const declaredReferenceTransportCoverage = [...declaredReferenceCoverage].filter(
        (coverage) => referenceTransportCoverage.has(coverage),
      );
      const declaredToolcraftTimelineCoverage = [...declaredReferenceTimelineCoverage].filter(
        (coverage) => toolcraftReferenceTimelineCoverage.has(coverage),
      );

      if (referenceTimeline.mode === "none" && declaredReferenceTimelineCoverage.size > 0) {
        errors.push(
          'referenceTimeline mode "none" must not declare reference timeline behaviorCoverage.',
        );
      }

      if (
        referenceTimeline.mode === "none" &&
        declaredReferenceTransportCoverage.length > 0
      ) {
        errors.push(
          `reference-runtime-clone transport behaviorCoverage ${declaredReferenceTransportCoverage.map((coverage) => `"${coverage}"`).join(", ")} requires referenceTimeline mode "toolcraft-playback", "toolcraft-keyframes", or "custom-reference-timeline"; mode "none" is only for references with no user-facing transport behavior.`,
        );
      }

      if (
        (referenceTimeline.mode === "toolcraft-playback" ||
          referenceTimeline.mode === "toolcraft-keyframes") &&
        declaredReferenceTimelineCoverage.size === 0
      ) {
        errors.push(
          `referenceTimeline mode "${referenceTimeline.mode}" must list the concrete timeline transport behaviors in behaviorCoverage.`,
        );
      }

      if (referenceTimeline.mode === "toolcraft-playback" && timelineMode !== "playback") {
        errors.push(
          'referenceTimeline mode "toolcraft-playback" requires panels.timeline mode "playback".',
        );
      }

      if (referenceTimeline.mode === "toolcraft-keyframes" && timelineMode !== "keyframes") {
        errors.push(
          'referenceTimeline mode "toolcraft-keyframes" requires panels.timeline mode "keyframes".',
        );
      }

      if (
        referenceTimeline.mode === "toolcraft-playback" &&
        declaredReferenceTimelineCoverage.has("keyframes")
      ) {
        errors.push(
          'referenceTimeline behaviorCoverage "keyframes" requires referenceTimeline mode "toolcraft-keyframes".',
        );
      }

      if (
        referenceTimeline.mode === "toolcraft-keyframes" &&
        !declaredReferenceTimelineCoverage.has("keyframes")
      ) {
        errors.push(
          'referenceTimeline mode "toolcraft-keyframes" must include behaviorCoverage "keyframes".',
        );
      }

      if (
        (referenceTimeline.mode === "toolcraft-playback" ||
          referenceTimeline.mode === "toolcraft-keyframes") &&
        declaredToolcraftTimelineCoverage.length === 0
      ) {
        errors.push(
          `referenceTimeline mode "${referenceTimeline.mode}" must include at least one Toolcraft timeline behavior such as "playback", "restart", "scrub", "duration", "loop", "time-progress", "export-at-time", or "keyframes".`,
        );
      }

      if (
        referenceTimeline.mode === "custom-reference-timeline" &&
        declaredReferenceTimelineCoverage.size === 0
      ) {
        errors.push(
          'referenceTimeline mode "custom-reference-timeline" must list every reference timeline behavior in behaviorCoverage.',
        );
      }

      for (const coverage of declaredReferenceTimelineCoverage) {
        if (
          customReferenceTimelineCoverage.has(coverage) &&
          referenceTimeline.mode !== "custom-reference-timeline"
        ) {
          errors.push(
            `referenceTimeline mode "${referenceTimeline.mode}" cannot preserve custom reference timeline behavior "${coverage}". Use mode "custom-reference-timeline" and browser-backed referenceTimelineCoverage instead.`,
          );
        }

        const entry = acceptance.find(
          (acceptanceEntry) => acceptanceEntry.referenceTimelineCoverage === coverage,
        );

        if (!entry) {
          errors.push(
            `referenceTimeline behaviorCoverage "${coverage}" is missing an acceptance entry with referenceTimelineCoverage "${coverage}".`,
          );
          continue;
        }

        if (entry.kind !== "runtime") {
          errors.push(
            `${entry.id} must be a runtime acceptance entry proving reference timeline behavior "${coverage}".`,
          );
        }

        if (!entry.automated || !entry.automatedTestName.trim()) {
          errors.push(
            `${entry.id} must have automated coverage proving reference timeline behavior "${coverage}".`,
          );
        }

        if (!entry.browser || !entry.browserTestName.trim()) {
          errors.push(
            `${entry.id} must have browser coverage proving reference timeline behavior "${coverage}".`,
          );
        }

        if (!entry.expectedObservable.trim()) {
          errors.push(
            `${entry.id} must describe the observable reference timeline behavior for "${coverage}".`,
          );
        }
      }
    }
  } else {
    for (const entry of acceptance) {
      if (entry.referenceCoverage) {
        errors.push(
          `${entry.id} declares referenceCoverage "${entry.referenceCoverage}" but transferMode is not "reference-runtime-clone".`,
        );
      }

      if (entry.referenceTimelineCoverage) {
        errors.push(
          `${entry.id} declares referenceTimelineCoverage "${entry.referenceTimelineCoverage}" but transferMode is not "reference-runtime-clone".`,
        );
      }
    }
  }

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

  if (timelineMode) {
    const playbackEntry = acceptance.find(
      (entry) => entry.kind === "runtime" && entry.timelineCoverage === "playback",
    );

    if (!playbackEntry) {
      errors.push(
        `panels.timeline mode "${timelineMode}" requires a runtime acceptance entry with timelineCoverage "playback" proving pause, scrub, duration/loop, and rendered-frame behavior.`,
      );
    } else if (
      !hasTimelinePlaybackCoverage(
        playbackEntry.timelinePlaybackCoverage,
        requiredTimelinePlaybackCoverage,
      )
    ) {
      errors.push(
        `${playbackEntry.id} timelineCoverage "playback" must declare timelinePlaybackCoverage for pause-resume, scrub, duration, loop, and rendered-frame. Duration coverage must prove renderer progress maps 0..state.timeline.durationSeconds, not a local fixed animation duration.`,
      );
    } else if (hasTimelinePlaybackCoveragePart(playbackEntry.timelinePlaybackCoverage, "duration")) {
      const durationEvidenceText = [
        playbackEntry.automatedTestName,
        playbackEntry.browserTestName,
        playbackEntry.expectedObservable,
        playbackEntry.userAction,
      ].join(" ");

      if (!/\bduration\b/i.test(durationEvidenceText) || !/\b(edit|change|commit|enter|set)\w*\b/i.test(durationEvidenceText)) {
        errors.push(
          `${playbackEntry.id} timelinePlaybackCoverage "duration" must describe editing/changing the timeline duration through the UI and proving the renderer follows state.timeline.durationSeconds.`,
        );
      }
    }
  }

  if (schema.canvas.sizing.mode === "fixed-output") {
    const fixedCanvasSizingEntry = acceptance.find(
      (entry) =>
        entry.kind === "runtime" &&
        entry.canvasSizingCoverage === "fixed-output-size",
    );

    if (!fixedCanvasSizingEntry) {
      errors.push(
        'canvas.sizing mode "fixed-output" requires a runtime acceptance entry with canvasSizingCoverage "fixed-output-size" explaining why width and height are intentionally non-editable. A user-provided base/default size should normally use "editable-output".',
      );
    } else {
      const evidenceText = getAcceptanceEvidenceText(fixedCanvasSizingEntry);

      if (!/(fixed|locked|non-editable|not user-editable|must not edit|reference-defined|product-defined)/i.test(evidenceText)) {
        errors.push(
          `${fixedCanvasSizingEntry.id} canvasSizingCoverage "fixed-output-size" must explain why the product output dimensions are intentionally fixed, not merely initialized from a default size.`,
        );
      }

      if (insufficientFixedCanvasSizingReasonPattern.test(evidenceText)) {
        errors.push(
          `${fixedCanvasSizingEntry.id} canvasSizingCoverage "fixed-output-size" cannot be justified by the reference or previous app lacking a size editor. Product-output apps use editable-output by default; use fixed-output only for a real fixed-format, product-defined, or explicitly locked dimension requirement.`,
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

  if (schema.persistence.storage === "localStorage") {
    const persistenceEntry = acceptance.find(
      (entry) =>
        entry.kind === "runtime" &&
        entry.persistenceCoverage === "reload",
    );

    if (!persistenceEntry) {
      errors.push(
        'persistence.storage "localStorage" requires a runtime acceptance entry with persistenceCoverage "reload" proving user-edited persisted state restores after a real browser reload. Settings import/export is not a substitute for persistence.',
      );
    } else {
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
    }
  }

  const settingsTransferEligibility = getToolcraftSettingsTransferEligibility({
    panels: schema.panels,
  });

  if (settingsTransferEligibility.eligible && !schema.settingsTransfer.enabled) {
    const settingsTransferOptOutEntry = acceptance.find(
      (entry) =>
        entry.kind === "runtime" &&
        entry.target === "runtime.settingsTransfer" &&
        entry.settingsTransferCoverage === "opt-out",
    );

    if (!settingsTransferOptOutEntry) {
      errors.push(
        [
          "settingsTransfer is required for this complex product app because settings-transfer eligibility was reached.",
          `Eligibility: ${settingsTransferEligibility.controlCount} product controls, ${settingsTransferEligibility.sectionCount} product sections, weighted score ${settingsTransferEligibility.score}, reasons ${settingsTransferEligibility.reasons.join(", ")}.`,
          'Use schema settingsTransfer: "auto" or true, or add a runtime acceptance entry with settingsTransferCoverage "opt-out" explaining why the app is ephemeral, temporary, one-off, not portable, or session-only.',
        ].join(" "),
      );
    } else {
      const evidenceText = getAcceptanceEvidenceText(settingsTransferOptOutEntry);

      if (!settingsTransferOptOutEntry.automated || !settingsTransferOptOutEntry.automatedTestName.trim()) {
        errors.push(
          `${settingsTransferOptOutEntry.id} settingsTransferCoverage "opt-out" must have automated coverage proving the app intentionally omits portable settings.`,
        );
      }

      if (!settingsTransferOptOutEntry.browser || !settingsTransferOptOutEntry.browserTestName.trim()) {
        errors.push(
          `${settingsTransferOptOutEntry.id} settingsTransferCoverage "opt-out" must have browser coverage proving the app intentionally omits portable settings.`,
        );
      }

      if (!settingsTransferOptOutReasonPattern.test(evidenceText)) {
        errors.push(
          `${settingsTransferOptOutEntry.id} settingsTransferCoverage "opt-out" must explain why the complex app does not need portable settings using a concrete reason such as ephemeral, temporary, one-off, not portable, or session-only.`,
        );
      }
    }
  }

  if (timelineMode === "keyframes") {
    const hasKeyframesCoverage = acceptance.some(
      (entry) => entry.kind === "runtime" && entry.timelineCoverage === "keyframes",
    );

    if (!hasKeyframesCoverage) {
      errors.push(
        'panels.timeline mode "keyframes" requires a runtime acceptance entry with timelineCoverage "keyframes" proving expanded rows, diamonds, keyframe mutation, and renderer evaluation.',
      );
    }
  }

  for (const { control, controlId, sectionTitle } of controls) {
    const label = `${sectionTitle ? `${sectionTitle} / ` : ""}${controlId} (${control.target})`;
    const entry = controlAcceptance.get(control.target);
    const keyframeCapability = getToolcraftControlKeyframeCapability(control);
    const isCustomControl = isCustomToolcraftControl(control);
    const isSelectedLayerTarget = control.target.startsWith("selectedLayer.");
    const toggleLabelError = getToggleControlLabelError(control, sectionTitle);

    if (toggleLabelError) {
      errors.push(`${label} ${toggleLabelError}`);
    }

    if (
      control.type === "rangeSlider" &&
      Array.isArray(control.defaultValue) &&
      typeof control.defaultValue[0] === "number" &&
      typeof control.defaultValue[1] === "number" &&
      control.defaultValue[0] === control.defaultValue[1]
    ) {
      errors.push(
        `${label} rangeSlider defaultValue must start with different lower and upper values so the two-thumb control does not collapse into a single-value slider.`,
      );
    }

    if (
      control.type !== "panelActions" &&
      timelineTransportControlPattern.test(getTimelineTransportControlText(controlId, control))
    ) {
      errors.push(
        `${label} looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.`,
      );
    }

    if (shouldUseSingleCurveVariant(controlId, control)) {
      errors.push(
        `${label} is a semantic single curve and must set variant: "single"; RGB/R/G/B curve tabs are reserved for color-correction or channel-specific curves.`,
      );
    }

    if (control.keyframeable === true && !keyframeCapability.capable) {
      errors.push(
        `${label} sets keyframeable true, but this control type or runtime-owned target cannot create timeline keyframes.`,
      );
    }

    if (
      timelineMode === "keyframes" &&
      keyframeCapability.capable &&
      control.keyframeable === false
    ) {
      errors.push(
        `${label} is keyframe-capable by Toolcraft control type; remove keyframeable: false and provide keyframe evaluator coverage instead of hiding the diamond.`,
      );
    }

    if (isSelectedLayerTarget && !layersEnabled) {
      errors.push(
        `${label} uses reserved selectedLayer.* target without panels.layers enabled. Use an app-specific target for single-layer apps or enable layers with layerCoverage.`,
      );
    }

    if (control.visibleWhen) {
      errors.push(
        ...getConditionValidationErrors({
          condition: control.visibleWhen,
          conditionName: "visibleWhen",
          controlTargets,
          label,
        }),
      );
    }

    if (control.disabledWhen) {
      errors.push(
        ...getConditionValidationErrors({
          condition: control.disabledWhen,
          conditionName: "disabledWhen",
          controlTargets,
          label,
        }),
      );
    }

    if (!entry) {
      errors.push(`${label} is missing an acceptance entry.`);
      continue;
    }

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

    if (control.type === "fileDrop") {
      errors.push(...getFileDropLifecycleCoverageErrors(label, entry));
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

    if (
      control.disabledWhen &&
      !/\b(disabled|unavailable|inactive|not editable|not meaningful|no effect|without effect)\b/i.test(
        getAcceptanceEvidenceText(entry),
      )
    ) {
      errors.push(
        `${label} uses disabledWhen and acceptance must prove the control becomes disabled/unavailable when ${control.disabledWhen.target} reaches the disabling value.`,
      );
    }

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
      const requiresVideoBackgroundEvidence = schemaHasVideoExportPanelAction(schema);
      const provesVideoBackground =
        !requiresVideoBackgroundEvidence ||
        (/\bvideo\b/i.test(evidenceText) &&
          /\b(keep|keeps|preserve|preserves|stay|stays|remain|remains|still|background)\b/i.test(
            evidenceText,
          ));

      if (!provesPngTransparency || !provesPreviewTransparency || !provesVideoBackground) {
        errors.push(
          requiresVideoBackgroundEvidence
            ? `${label} controls background inclusion and acceptance must prove disabling it makes PNG output transparent, hides the live preview product background, and keeps video output with the product background.`
            : `${label} controls background inclusion and acceptance must prove disabling it makes PNG output transparent and hides the live preview product background.`,
        );
      }
    }

    const requiredControlParts =
      getRequiredToolcraftControlPartCoverage(control);

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

    if (isSliderLikeControl(control)) {
      const expectedMarkerCount = getStepMarkerCount(control);

      if (
        control.variant === "discrete" &&
        expectedMarkerCount &&
        control.markerCount !== expectedMarkerCount
      ) {
        errors.push(
          `${label} discrete slider must render one marker per step; expected markerCount ${expectedMarkerCount}, received ${String(control.markerCount)}.`,
        );
      }

      errors.push(
        ...getSliderVariantClassificationErrors({
          control,
          controlId,
          label,
        }),
      );
    }

    if (control.type === "imagePicker") {
      const itemValues = getControlOptionValues(control);

      if (!hasCoverageForValues(entry.optionCoverage, itemValues)) {
        errors.push(
          `${label} must cover every visible ImagePicker item: ${itemValues.join(", ")}.`,
        );
      }
    }

    if (control.type === "select" || control.type === "segmented") {
      const optionValues = getControlOptionValues(control);

      if (optionValues.length > 1 && !hasCoverageForValues(entry.optionCoverage, optionValues)) {
        errors.push(`${label} must cover every visible option: ${optionValues.join(", ")}.`);
      }

      const segmentedLayoutError = getSegmentedControlLayoutError(control);

      if (segmentedLayoutError) {
        errors.push(`${label} ${segmentedLayoutError}`);
      }
    }

    if (control.type === "panelActions") {
      const actionValues = control.actions?.map(getActionValue) ?? [];
      const resetActionValues =
        control.actions?.filter(isResetPanelAction).map(getActionValue) ?? [];

      if (resetActionValues.length > 0) {
        errors.push(
          `${label} must not include Reset footer actions (${resetActionValues.join(", ")}). The controls panel header owns Reset controls; sticky panelActions are only for product delivery actions such as Export, Copy, Generate, Apply, or Download.`,
        );
      }

      if (!hasCoverageForValues(entry.actionCoverage, actionValues)) {
        errors.push(`${label} must cover every footer action: ${actionValues.join(", ")}.`);
      }
    }
  }

  for (const entry of acceptance) {
    if (entry.kind === "control" && entry.target && !controlTargets.has(entry.target)) {
      errors.push(`${entry.id} points to missing control target ${entry.target}.`);
    }

    if (entry.kind !== "canvas-handle") {
      continue;
    }

    if (!entry.canvasHandle) {
      errors.push(`${entry.id} canvas handle is missing canvasHandle metadata.`);
      continue;
    }

    if (!entry.canvasHandle.testId.trim()) {
      errors.push(`${entry.id} canvas handle must provide a stable testId.`);
    }

    if (!entry.canvasHandle.writesTarget.trim()) {
      errors.push(`${entry.id} canvas handle must name the runtime target it writes.`);
    }

    if (
      entry.canvasHandle.writesTarget &&
      !controlTargets.has(entry.canvasHandle.writesTarget) &&
      !commandTargets.has(entry.canvasHandle.writesTarget)
    ) {
      errors.push(
        `${entry.id} canvas handle writesTarget ${entry.canvasHandle.writesTarget} does not match a schema target or supported editor command.`,
      );
    }

    if (!entry.canvasHandle.outputObservable.trim()) {
      errors.push(`${entry.id} canvas handle must describe the product output change.`);
    }

    if (!entry.canvasHandle.exportCleanTestName.trim()) {
      errors.push(`${entry.id} canvas handle must point to an export-clean test.`);
    }

    if (!entry.browser || !entry.browserTestName.trim()) {
      errors.push(`${entry.id} canvas handle must have browser drag coverage.`);
    }

    if (!entry.automated || !entry.automatedTestName.trim()) {
      errors.push(`${entry.id} canvas handle must have automated output coverage.`);
    }
  }

  return errors;
}
