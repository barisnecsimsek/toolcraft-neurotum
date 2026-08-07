import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

function dragScenario({
  controlLabel,
  id,
  target,
}: {
  controlLabel: string;
  id: string;
  target: string;
}): ToolcraftPerformanceScenario {
  return {
    automated: true,
    automatedTestName: "brick mosaic responsiveness scenarios are declared",
    browser: true,
    browserTestName: `browser perf: ${id}`,
    budget: {
      maxFrameGapMs: 120,
      maxInteractionMs: 1800,
    },
    controlLabel,
    expectedObservable: `${target} can be dragged without freezing the canvas viewport.`,
    fixture: "uploaded color blocks image",
    id,
    interaction: "control-drag",
    target,
    workload: false,
  };
}

function changeScenario({
  controlLabel,
  id,
  target,
  uiSelector,
}: {
  controlLabel?: string;
  id: string;
  target: string;
  uiSelector?: string;
}): ToolcraftPerformanceScenario {
  return {
    automated: true,
    automatedTestName: "brick mosaic responsiveness scenarios are declared",
    browser: true,
    browserTestName: `browser perf: ${id}`,
    budget: {
      maxFrameGapMs: 120,
      maxInteractionMs: 1600,
    },
    controlLabel,
    expectedObservable: `${target} can change through the real control without destabilizing output.`,
    fixture: "uploaded color blocks image",
    id,
    interaction: "control-change",
    target,
    uiSelector,
    workload: false,
  };
}

function workloadDragScenario({
  controlLabel,
  id,
  max,
  min,
  target,
  stressKind,
  stressReason,
  stressValue,
}: {
  controlLabel: string;
  id: string;
  max: unknown;
  min: unknown;
  target: string;
  stressKind: "high-density" | "large-canvas" | "max-value";
  stressReason: string;
  stressValue: unknown;
}): ToolcraftPerformanceScenario {
  return {
    automated: true,
    automatedTestName: "brick mosaic workload scenarios are declared",
    browser: true,
    browserTestName: `browser perf: ${id}`,
    budget: {
      maxFrameGapMs: 120,
      maxInteractionMs: 2000,
    },
    controlLabel,
    expectedObservable: `${target} stress value remains responsive while changing renderer workload.`,
    fixture: "uploaded color blocks image",
    id,
    interaction: "control-drag",
    stressFixture: {
      kind: stressKind,
      reason: stressReason,
      value: stressValue,
    },
    target,
    values: {
      default: stressValue,
      max,
      min,
    },
    workload: true,
  };
}

export const appPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  rendererStrategy: "canvas-2d",
  rendererTechnique: {
    exportRenderer: "canvas-2d",
    fidelityRisks: [
      "Fine source details are intentionally quantized into brick cells.",
      "Posterization can flatten subtle image gradients when the user raises it.",
    ],
    layers: [
      {
        content: ["geometry"],
        exportMode: "included",
        id: "backgroundLayer",
        kind: "background",
        primitiveCount: "low",
        renderer: "canvas-2d",
      },
      {
        content: ["bitmap-media", "geometry", "dense-pattern"],
        exportMode: "included",
        id: "productForegroundLayer",
        intentionalRasterizationReason:
          "The visible product is a dense grid of rasterized brick geometry sampled from bitmap media.",
        kind: "product-foreground",
        primitiveCount: "high",
        renderer: "canvas-2d",
        uiSelector: "[data-brick-mosaic-canvas]",
      },
      {
        content: ["composite"],
        exportMode: "composited",
        id: "exportComposite",
        kind: "export-composite",
        primitiveCount: "medium",
        renderer: "canvas-2d",
      },
    ],
    performanceRisks: [
      "Very high detail can create many brick/stud draw calls.",
      "8K export can spend most time in browser canvas encoding.",
    ],
    previewRenderer: "canvas-2d",
    productRepresentation: "mixed",
    rendererStrategy: "canvas-2d",
    rendererWorkload: "simple-composition",
    sourceRepresentation: "image-media",
    whyNotAlternativeStrategies: [
      "DOM and SVG would create one node per brick/stud and are a poor fit for dense grids.",
      "WebGL/WebGPU would be appropriate for a true pixel-output shader pipeline, but Canvas 2D keeps brick geometry and PNG export behavior simpler for this first version.",
      "A default media preview cannot draw raised studs, bevels, posterization, or export the final product quality.",
    ],
  },
  rendererWorkload: "simple-composition",
  scenarios: [
    {
      automated: true,
      automatedTestName: "brick mosaic preview render scenario is declared",
      browser: true,
      browserTestName: "browser perf: brick mosaic stress preview render",
      budget: {
        maxLongTaskMs: 250,
        maxPreviewMs: 2000,
      },
      expectedObservable:
        "The renderer draws a dense uploaded brick mosaic preview without long main-thread stalls.",
      fixture: "uploaded color blocks image at high detail",
      id: "brick-mosaic-preview-render",
      interaction: "preview-render",
      stress: true,
      stressFixture: {
        kind: "high-density",
        reason: "Detail 96 with scale 0.6 produces the densest useful brick grid.",
        value: {
          detail: 96,
          scale: 0.6,
        },
      },
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "brick mosaic media import scenario is declared",
      browser: true,
      browserTestName: "browser perf: brick mosaic media import",
      budget: {
        maxFrameGapMs: 120,
        maxInteractionMs: 2000,
      },
      expectedObservable: "Uploading image media decodes once and updates the brick mosaic preview.",
      fixture: "generated SVG media fixture",
      id: "media-source-import",
      interaction: "media-import",
      target: "media.source",
      workload: false,
    },
    workloadDragScenario({
      controlLabel: "Resolution scale",
      id: "canvas-render-scale-drag",
      max: 2,
      min: 1,
      stressKind: "max-value",
      stressReason: "2x is the largest user-selectable preview backing scale.",
      stressValue: 2,
      target: "canvas.renderScale",
    }),
    changeScenario({
      controlLabel: "Export Settings",
      id: "settings-transfer-change",
      target: "runtime.settingsTransfer",
    }),
    workloadDragScenario({
      controlLabel: "Detail",
      id: "brick-detail-drag",
      max: 96,
      min: 12,
      stressKind: "high-density",
      stressReason: "Detail 96 creates the highest grid count before Scale is applied.",
      stressValue: 96,
      target: "brick.detail",
    }),
    {
      ...workloadDragScenario({
        controlLabel: "Scale",
        id: "brick-scale-drag",
        max: 1.5,
        min: 0.6,
        stressKind: "high-density",
        stressReason:
          "Scale 0.6 creates the smallest bricks and highest effective grid count during the held local shuffle.",
        stressValue: 0.6,
        target: "brick.scale",
      }),
      expectedObservable:
        "Scale remains responsive while the dense brick preview swaps nearby cells and restores the final image on release.",
    },
    dragScenario({ controlLabel: "Chaos", id: "brick-chaos-drag", target: "brick.chaos" }),
    dragScenario({ controlLabel: "Gap", id: "brick-gap-drag", target: "brick.gap" }),
    dragScenario({ controlLabel: "Corners", id: "brick-corners-drag", target: "brick.rounding" }),
    dragScenario({ controlLabel: "Bevel", id: "brick-bevel-drag", target: "brick.edgeDepth" }),
    changeScenario({ controlLabel: "Include", id: "stud-include-change", target: "stud.include" }),
    dragScenario({ controlLabel: "Diameter", id: "stud-diameter-drag", target: "stud.diameter" }),
    dragScenario({ controlLabel: "Height", id: "stud-height-drag", target: "stud.height" }),
    dragScenario({ controlLabel: "Shine", id: "stud-shine-drag", target: "stud.highlight" }),
    changeScenario({ controlLabel: "Mono", id: "tone-mono-change", target: "tone.monochrome" }),
    dragScenario({ controlLabel: "Posterize", id: "tone-posterize-drag", target: "tone.posterize" }),
    dragScenario({ controlLabel: "Saturation", id: "tone-saturation-drag", target: "tone.saturation" }),
    dragScenario({ controlLabel: "Contrast", id: "tone-contrast-drag", target: "tone.contrast" }),
    dragScenario({ controlLabel: "Brightness", id: "tone-brightness-drag", target: "tone.brightness" }),
    changeScenario({
      controlLabel: "Direction",
      id: "lighting-direction-change",
      target: "lighting.direction",
      uiSelector: "[aria-label='Direction X/Y pad']",
    }),
    dragScenario({ controlLabel: "Shadow", id: "lighting-shadow-drag", target: "lighting.shadow" }),
    changeScenario({
      controlLabel: "Include",
      id: "background-include-change",
      target: "export.includeBackground",
    }),
    changeScenario({
      controlLabel: "Background",
      id: "background-color-change",
      target: "appearance.background",
      uiSelector: "[aria-label='Pick background']",
    }),
    changeScenario({
      controlLabel: "Format",
      id: "image-format-change",
      target: "export.image.format",
    }),
    {
      automated: true,
      automatedTestName: "brick mosaic workload scenarios are declared",
      browser: true,
      browserTestName: "browser perf: image-resolution-change",
      budget: {
        maxFrameGapMs: 120,
        maxInteractionMs: 1600,
      },
      controlLabel: "Resolution",
      expectedObservable:
        "Selecting the heaviest image export resolution remains responsive before export.",
      fixture: "uploaded color blocks image",
      id: "image-resolution-change",
      interaction: "control-change",
      stressFixture: {
        kind: "large-canvas",
        reason: "8K is the largest image export long-edge preset exposed by the app.",
        value: "8k",
      },
      target: "export.image.resolution",
      values: {
        default: "4k",
        max: "8k",
        min: "2k",
      },
      workload: true,
    },
    {
      automated: true,
      automatedTestName: "brick mosaic export copy scenario is declared",
      browser: true,
      browserTestName: "browser perf: brick mosaic export copy",
      budget: {
        maxExportMs: 8000,
      },
      expectedObservable:
        "Export PNG completes with image bytes at the selected output resolution.",
      fixture: "uploaded color blocks image",
      id: "brick-mosaic-export-copy",
      interaction: "export-copy",
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "brick mosaic viewport stability scenario is declared",
      browser: true,
      browserTestName: "browser perf: brick mosaic viewport stability",
      budget: {
        maxFrameGapMs: 120,
      },
      expectedObservable:
        "Toolbar and panel interactions keep the canvas viewport stable around the brick mosaic output.",
      fixture: "uploaded color blocks image",
      id: "brick-mosaic-viewport-stability",
      interaction: "viewport-stability",
      target: "runtime.viewport",
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "brick mosaic zoom stress scenario is declared",
      browser: true,
      browserTestName: "browser perf: brick mosaic zoom stress",
      budget: {
        maxFrameGapMs: 120,
        maxInteractionMs: 2000,
        maxLongTaskMs: 250,
      },
      expectedObservable:
        "Real toolbar zoom controls stay responsive while the dense brick mosaic canvas is visible.",
      fixture: "uploaded color blocks image at high detail",
      id: "brick-mosaic-zoom-stress",
      interaction: "viewport-zoom-stress",
      stress: true,
      workload: false,
    },
  ],
  usesCustomRenderer: true,
  workloadTargets: [
    "canvas.renderScale",
    "brick.detail",
    "brick.scale",
    "export.image.resolution",
  ],
});
