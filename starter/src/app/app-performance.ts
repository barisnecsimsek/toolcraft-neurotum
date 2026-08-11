import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

const sourceMediaWorkload = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: { renderScale: 2, sourceMedia: { height: 1080, width: 1920 } },
    metric: "custom" as const,
    smoothTarget: { renderScale: 2, sourceMedia: { height: 1080, width: 1920 } },
    smoothTargetRatio: 1,
    target: "renderer.preview",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason: "Live shader controls are measured with a realistic 1080p source at 2x preview scale.",
  value: { renderScale: 2, sourceMedia: { height: 1080, width: 1920 } },
};

const sliderDefinitions = [
  { defaultValue: 80, label: "Columns", max: 200, min: 10, target: "particle.columns", workload: true },
  { defaultValue: 30, label: "Rows", max: 150, min: 5, target: "particle.rows", workload: true },
  { defaultValue: 0.9, label: "Maximum width", max: 1, min: 0.1, target: "particle.maxColumnWidth", workload: true },
  { defaultValue: 0.05, label: "Column gap", max: 0.5, min: 0, target: "particle.columnGap", workload: true },
  { defaultValue: 1, label: "Width gain", max: 3, min: 0.1, target: "particle.width", workload: true },
  { defaultValue: 0, label: "Minimum width", max: 0.5, min: 0, target: "particle.minWidth", workload: true },
  { defaultValue: 0.02, label: "Softness", max: 0.5, min: 0, target: "particle.softness", workload: true },
  { defaultValue: 0.3, label: "Chance", max: 1, min: 0, target: "particle.dotChance", workload: true },
  { defaultValue: 3, label: "Density", max: 8, min: 1, target: "particle.dotDensity", workload: true },
  { defaultValue: 0.5, label: "Dot size", max: 0.9, min: 0.1, target: "particle.dotSize", workload: true },
  { defaultValue: 0, label: "Grain amount", max: 0.5, min: 0, target: "particle.grainAmount", workload: true },
  { defaultValue: 1, label: "Grain scale", max: 8, min: 0.25, target: "particle.grainScale", workload: true },
  { defaultValue: 1, label: "Grain seed", max: 100, min: 1, target: "particle.grainSeed", workload: true },
] as const;

const controlChangeDefinitions = [
  { defaultValue: "original", label: "Color mode", max: "tint", min: "original", target: "particle.colorMode" },
  { defaultValue: "#FFFFFF", label: "Tint", max: "#FF00FF", min: "#000000", target: "particle.tintColor" },
  { defaultValue: "off", label: "Color grouping", max: "color", min: "off", target: "particle.groupMode" },
  { defaultValue: "#E63326", label: "Group 1 / Reds", max: "#FFFFFF", min: "#000000", target: "particle.groupColor1" },
  { defaultValue: "#F2991A", label: "Group 2 / Oranges", max: "#FFFFFF", min: "#000000", target: "particle.groupColor2" },
  { defaultValue: "#33B34D", label: "Group 3 / Greens", max: "#FFFFFF", min: "#000000", target: "particle.groupColor3" },
  { defaultValue: "#334CCC", label: "Group 4 / Blues", max: "#FFFFFF", min: "#000000", target: "particle.groupColor4" },
  { defaultValue: "#E6E6E6", label: "Pattern background", max: "#FFFFFF", min: "#000000", target: "particle.dotPatternBackground" },
  { defaultValue: true, label: "Include", max: true, min: false, target: "export.includeBackground" },
  { defaultValue: "#000000", label: "Background", max: "#FFFFFF", min: "#000000", target: "appearance.background" },
  { defaultValue: "png", label: "Format", max: "jpg", min: "png", target: "export.image.format" },
] as const;

function scenarioSlug(target: string): string {
  return target.replaceAll(".", "-");
}

const sliderScenarios: ToolcraftPerformanceScenario[] = sliderDefinitions.map(
  (definition) => {
    const slug = scenarioSlug(definition.target);
    return {
      automated: true,
      automatedTestName: `perf: ${definition.target} drag stays responsive`,
      browser: true,
      browserTestName: `browser perf: ${definition.target} drag stays responsive`,
      budget: { maxFrameGapMs: 120, maxInteractionMs: 1800, maxLongTaskMs: 200 },
      controlLabel: definition.label,
      expectedObservable: `${definition.label} changes Particle Grid output during live pointer drag.`,
      fixture: definition.workload
        ? "1920x1080 source at render scale 2"
        : "uploaded Particle Grid source",
      id: `${slug}-drag`,
      interaction: "control-drag",
      ...(definition.workload
        ? {
            stress: true,
            stressFixture: {
              kind: "high-density" as const,
              loadProfile: {
                hardLimit: definition.max,
                metric: "numeric-max" as const,
                smoothTarget: definition.max,
                smoothTargetRatio: 1,
                target: definition.target,
                userFacingRange: "fully-guaranteed" as const,
              },
              reason: `The visible ${definition.label} maximum is the heaviest useful value.`,
              value: definition.max,
            },
            workloadFixture: sourceMediaWorkload,
          }
        : {}),
      target: definition.target,
      values: {
        default: definition.defaultValue,
        max: definition.max,
        min: definition.min,
      },
      workload: definition.workload,
    };
  },
);

const controlChangeScenarios: ToolcraftPerformanceScenario[] =
  controlChangeDefinitions.map((definition) => {
    const isParticleControl = definition.target.startsWith("particle.");

    return {
      automated: true,
      automatedTestName: `perf: ${definition.target} change stays responsive`,
      browser: true,
      browserTestName: `browser perf: ${definition.target} change stays responsive`,
      budget: { maxFrameGapMs: 120, maxInteractionMs: 1000, maxLongTaskMs: 200 },
      controlLabel: definition.label,
      expectedObservable: `${definition.label} updates its shader or export state without blocking input.`,
      fixture: "uploaded Particle Grid source",
      id: `${scenarioSlug(definition.target)}-change`,
      interaction: "control-change" as const,
      ...(isParticleControl
        ? {
            stress: true,
            stressFixture: {
              kind: "max-value" as const,
              loadProfile: {
                hardLimit: definition.max,
                metric: "custom" as const,
                smoothTarget: definition.max,
                smoothTargetRatio: 1,
                target: definition.target,
                userFacingRange: "fully-guaranteed" as const,
              },
              reason: `The alternate ${definition.label} value exercises the full shader branch.`,
              value: definition.max,
            },
            workloadFixture: sourceMediaWorkload,
          }
        : {}),
      target: definition.target,
      values: {
        default: definition.defaultValue,
        max: definition.max,
        min: definition.min,
      },
      workload: isParticleControl,
    };
  });

const imageResolutionScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "perf: export.image.resolution change stays responsive",
  browser: true,
  browserTestName: "browser perf: export.image.resolution change stays responsive",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 1000, maxLongTaskMs: 200 },
  controlLabel: "Resolution",
  expectedObservable: "Selecting 2K, 4K, or 8K updates export state without redrawing the preview.",
  fixture: "1920x1080 source with all image resolution choices",
  id: "export-image-resolution-change",
  interaction: "control-change",
  stress: true,
  stressFixture: {
    kind: "custom",
    loadProfile: {
      hardLimit: { imageResolution: "8k", sourceMedia: { height: 1080, width: 1920 } },
      metric: "custom",
      smoothTarget: { imageResolution: "8k", sourceMedia: { height: 1080, width: 1920 } },
      smoothTargetRatio: 1,
      target: "export.image.resolution",
      userFacingRange: "fully-guaranteed",
    },
    reason: "8K is the largest visible still-image export tier.",
    value: { imageResolution: "8k", sourceMedia: { height: 1080, width: 1920 } },
  },
  workloadFixture: sourceMediaWorkload,
  target: "export.image.resolution",
  values: { default: "4k", max: "8k", min: "2k" },
  workload: true,
};

const particleTargets = [
  ...sliderDefinitions.map((definition) => definition.target),
  ...controlChangeDefinitions
    .map((definition) => definition.target)
    .filter((target) => !target.startsWith("export.") && target !== "appearance.background"),
];

export const appPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  browserCheckPolicy: {
    fallbackRunner: "playwright",
    fallbackWhen: ["agent-browser-unavailable", "ci"],
    preferredRunner: "agent-browser",
  },
  rendererPipeline: {
    interactionInvalidation: [
      {
        interaction: "media-import",
        invalidates: [
          "decode-source",
          "upload-source-texture",
          "particle-grid-transform",
          "preview-composite",
        ],
        targets: ["source.image"],
      },
      {
        interaction: "control-drag",
        invalidates: ["particle-grid-transform", "preview-composite"],
        mustNotInvalidate: ["decode-source", "upload-source-texture"],
        targets: sliderDefinitions.map((definition) => definition.target),
      },
      {
        interaction: "control-change",
        invalidates: ["particle-grid-transform", "preview-composite"],
        mustNotInvalidate: ["decode-source", "upload-source-texture"],
        targets: [
          ...particleTargets,
          "appearance.background",
          "export.includeBackground",
          "canvas.size.width",
          "canvas.size.height",
          "canvas.renderScale",
        ],
      },
      {
        interaction: "control-change",
        invalidates: ["export-composite"],
        mustNotInvalidate: ["decode-source", "upload-source-texture"],
        targets: ["export.image.format", "export.image.resolution"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: [
          "decode-source",
          "upload-source-texture",
          "particle-grid-transform",
        ],
        targets: ["canvas.offset"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: [
          "decode-source",
          "upload-source-texture",
          "particle-grid-transform",
        ],
        targets: ["canvas.zoom"],
      },
      {
        interaction: "export",
        invalidates: ["export-composite"],
        mustNotInvalidate: ["decode-source", "upload-source-texture"],
        targets: ["actions.output", "export.image.format", "export.image.resolution"],
      },
    ],
    passes: [
      {
        cacheKey: ["mediaAsset.id", "mediaAsset.dataUrl"],
        id: "decode-source",
        inputs: ["mediaAssets.source.image.dataUrl"],
        invalidatedBy: ["source.image"],
        kind: "decode",
        output: "source",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["mediaAsset.id", "mediaAsset.dataUrl"],
        id: "upload-source-texture",
        inputs: ["decode-source.output"],
        invalidatedBy: ["source.image"],
        kind: "preprocess",
        output: "intermediate",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cacheKey: ["mediaAsset.id", ...particleTargets, "canvas.size", "canvas.renderScale"],
        id: "particle-grid-transform",
        inputs: ["upload-source-texture.output", ...particleTargets, "mediaAsset.transform"],
        invalidatedBy: [
          "source.image",
          ...particleTargets,
          "mediaAsset.transform",
          "canvas.size",
          "canvas.renderScale",
        ],
        kind: "pixel-transform",
        output: "intermediate",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cacheKey: [
          "particle-grid-transform.output",
          "appearance.background",
          "export.includeBackground",
        ],
        id: "preview-composite",
        inputs: [
          "particle-grid-transform.output",
          "appearance.background",
          "export.includeBackground",
        ],
        invalidatedBy: [
          "particle-grid-transform",
          "appearance.background",
          "export.includeBackground",
        ],
        kind: "composite",
        output: "preview",
        quality: "preview",
        runsOn: "gpu",
      },
      {
        id: "export-composite",
        inputs: [
          "particle-grid-transform.output",
          "appearance.background",
          "export.includeBackground",
          "export.image.format",
          "export.image.resolution",
        ],
        invalidatedBy: [
          "actions.output",
          "appearance.background",
          "export.includeBackground",
          "export.image.format",
          "export.image.resolution",
        ],
        kind: "export",
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
  },
  rendererStrategy: "webgl",
  rendererTechnique: {
    exportRenderer: "webgl",
    fidelityRisks: [
      "WGSL and GLSL hash floating-point results may differ slightly across GPUs.",
      "Cover crop and media rotate/flip must match preview and export.",
      "Brightness and hue group boundaries must preserve reference behavior.",
      "Background exclusion must keep particles opaque while gaps become transparent.",
    ],
    layers: [
      {
        content: ["shader", "bitmap-media", "dense-pattern"],
        exportMode: "composited",
        id: "productForegroundLayer",
        kind: "product-foreground",
        primitiveCount: "high",
        renderer: "webgl",
        uiSelector: '[data-toolcraft-product-output="particle-grid"]',
      },
      {
        content: ["composite"],
        exportMode: "included",
        id: "backgroundLayer",
        kind: "background",
        primitiveCount: "low",
        renderer: "webgl",
        uiSelector: '[data-toolcraft-product-output="particle-grid"]',
      },
      {
        content: ["composite"],
        exportMode: "composited",
        id: "exportComposite",
        kind: "export-composite",
        primitiveCount: "high",
        renderer: "webgl",
      },
    ],
    performanceRisks: [
      "Large source images require a full-size GPU texture upload.",
      "Render scale 2 and 8K export allocate large color buffers.",
      "Every visible shader control must remain live during pointer drag.",
    ],
    previewExportDifferenceReason:
      "Preview follows Toolcraft render scale while export renders the selected 2K, 4K, or 8K dimensions.",
    previewRenderer: "webgl",
    productRepresentation: "pixel",
    referenceRendererChangeReason:
      "The reference requires the Figma-only WebGPU shader host; WebGL2 preserves the same fragment equations and texture/uniform model in a standalone browser.",
    rendererStrategy: "webgl",
    rendererWorkload: "pixel-output",
    sourceRepresentation: "reference-runtime",
    whyNotAlternativeStrategies: [
      "Canvas 2D per-pixel loops would move dense image processing onto the main thread.",
      "DOM and SVG cannot reproduce source-sampled dense fragment output.",
      "A standalone WebGPU host would reduce compatibility without adding fidelity for this static shader.",
    ],
  },
  rendererWorkload: "pixel-output",
  scenarios: [
    {
      automated: true,
      automatedTestName: "perf: 1080p source import stays under budget",
      browser: true,
      browserTestName: "browser perf: 1080p source import stays under budget",
      budget: {
        maxFrameGapMs: 120,
        maxInteractionMs: 1800,
        maxLongTaskMs: 200,
        maxRenderMs: 1500,
      },
      controlLabel: "Source image",
      expectedObservable: "A 1080p source imports and renders without freezing the panel.",
      fixture: "1920x1080 image media fixture",
      id: "media-import",
      interaction: "media-import",
      stress: true,
      stressFixture: {
        kind: "media",
        loadProfile: {
          hardLimit: { height: 1080, width: 1920 },
          metric: "media-area",
          smoothTarget: { height: 1080, width: 1920 },
          smoothTargetRatio: 1,
          target: "source.image",
          userFacingRange: "fully-guaranteed",
        },
        reason: "1920x1080 is the realistic baseline source workload.",
        value: { height: 1080, width: 1920 },
      },
      target: "source.image",
      values: {
        default: { height: 1080, width: 1920 },
        max: { height: 1080, width: 1920 },
        min: null,
      },
      workload: true,
    },
    {
      automated: true,
      automatedTestName: "perf: source.image change stays responsive",
      browser: true,
      browserTestName: "browser perf: source.image change stays responsive",
      budget: { maxFrameGapMs: 120, maxInteractionMs: 1800, maxLongTaskMs: 200 },
      controlLabel: "Source image",
      expectedObservable: "Replacing an uploaded source updates the GPU texture without freezing controls.",
      fixture: "small/default/1920x1080 source image range",
      id: "source-image-change",
      interaction: "control-change",
      stress: true,
      stressFixture: {
        kind: "media",
        loadProfile: {
          hardLimit: { height: 1080, width: 1920 },
          metric: "media-area",
          smoothTarget: { height: 1080, width: 1920 },
          smoothTargetRatio: 1,
          target: "source.image",
          userFacingRange: "fully-guaranteed",
        },
        reason: "A 1920x1080 replacement is the supported heavy source state.",
        value: { height: 1080, width: 1920 },
      },
      workloadFixture: sourceMediaWorkload,
      target: "source.image",
      values: {
        default: { height: 720, width: 1280 },
        max: { height: 1080, width: 1920 },
        min: { height: 360, width: 640 },
      },
      workload: true,
    },
    ...sliderScenarios,
    ...controlChangeScenarios,
    imageResolutionScenario,
    {
      automated: true,
      automatedTestName: "perf: 4K Particle Grid export stays under budget",
      browser: true,
      browserTestName: "browser perf: 4K Particle Grid export stays under budget",
      budget: { maxExportMs: 8000 },
      controlLabel: "Resolution",
      expectedObservable: "A 4K Particle Grid image exports without corrupt bytes.",
      fixture: "1920x1080 source exported at 4K",
      id: "export-copy",
      interaction: "export-copy",
      stress: true,
      stressFixture: {
        kind: "custom",
        loadProfile: {
          hardLimit: { imageResolution: "4k", sourceMedia: { height: 1080, width: 1920 } },
          metric: "custom",
          smoothTarget: { imageResolution: "4k", sourceMedia: { height: 1080, width: 1920 } },
          smoothTargetRatio: 1,
          target: "export.image.resolution",
          userFacingRange: "fully-guaranteed",
        },
        reason: "4K is the default image export tier with a realistic source.",
        value: { imageResolution: "4k", sourceMedia: { height: 1080, width: 1920 } },
      },
      target: "actions.output",
      values: { default: "4k", max: "8k", min: "2k" },
      workload: true,
    },
    {
      automated: true,
      automatedTestName: "perf: Particle Grid preview stays under budget",
      browser: true,
      browserTestName: "browser perf: Particle Grid preview stays under budget",
      budget: { maxLongTaskMs: 200, maxPreviewMs: 2000 },
      expectedObservable: "Worst-case grid density renders without a long main-thread freeze.",
      fixture: "1920x1080 source at render scale 2 and maximum grid density",
      id: "preview-render",
      interaction: "preview-render",
      stress: true,
      stressFixture: {
        kind: "custom",
        loadProfile: {
          hardLimit: {
            columns: 200,
            renderScale: 2,
            rows: 150,
            sourceMedia: { height: 1080, width: 1920 },
          },
          metric: "custom",
          smoothTarget: {
            columns: 200,
            renderScale: 2,
            rows: 150,
            sourceMedia: { height: 1080, width: 1920 },
          },
          smoothTargetRatio: 1,
          target: "renderer.preview",
          userFacingRange: "fully-guaranteed",
        },
        reason: "Maximum visible grid counts at 2x preview scale form the worst preview state.",
        value: {
          columns: 200,
          renderScale: 2,
          rows: 150,
          sourceMedia: { height: 1080, width: 1920 },
        },
      },
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: Particle Grid zoom stress preserves viewport",
      browser: true,
      browserTestName: "browser perf: Particle Grid zoom stress preserves viewport",
      budget: { maxFrameGapMs: 120, maxInteractionMs: 1500, maxLongTaskMs: 200 },
      expectedObservable: "Toolbar zoom remains responsive over the worst-case grid preview.",
      fixture: "maximum Particle Grid preview",
      id: "viewport-zoom-stress",
      interaction: "viewport-zoom-stress",
      stress: true,
      stressFixture: {
        kind: "custom",
        loadProfile: {
          hardLimit: {
            columns: 200,
            renderScale: 2,
            rows: 150,
            sourceMedia: { height: 1080, width: 1920 },
          },
          metric: "custom",
          smoothTarget: {
            columns: 200,
            renderScale: 2,
            rows: 150,
            sourceMedia: { height: 1080, width: 1920 },
          },
          smoothTargetRatio: 1,
          target: "canvas.zoom",
          userFacingRange: "fully-guaranteed",
        },
        reason: "Zoom is measured over the maximum grid and selected 2x backing scale.",
        value: {
          columns: 200,
          renderScale: 2,
          rows: 150,
          sourceMedia: { height: 1080, width: 1920 },
        },
      },
      uiSelector: '[data-toolcraft-product-output="particle-grid"]',
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: Particle Grid viewport stays stable",
      browser: true,
      browserTestName: "browser perf: Particle Grid viewport stays stable",
      budget: { maxFrameGapMs: 120, maxLongTaskMs: 200 },
      expectedObservable: "Canvas offset and zoom remain stable while a particle slider updates.",
      fixture: "uploaded Particle Grid source",
      id: "viewport-stability",
      interaction: "viewport-stability",
      workload: false,
    },
  ],
  usesCustomRenderer: true,
  workloadTargets: [
    "source.image",
    ...particleTargets,
    "export.image.resolution",
  ],
});
