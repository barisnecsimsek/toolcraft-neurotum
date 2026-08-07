import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

type SliderTarget = {
  defaultValue: number;
  label: string;
  max: number;
  min: number;
  target: string;
};

type ChangeTarget = {
  label: string;
  target: string;
  uiSelector?: string;
};

const largeModelFixture = {
  height: 2160,
  width: 3840,
};

const largeEnvironmentFixture = {
  height: 1024,
  width: 2048,
};

const stickerBatchFixture = {
  count: 1,
  height: 1080,
  width: 1920,
};

const scratchMaskFixture = {
  height: 1080,
  width: 1920,
};

const modelLoadProfile = {
  hardLimit: largeModelFixture,
  metric: "media-area" as const,
  smoothTarget: largeModelFixture,
  smoothTargetRatio: 1,
  target: "media.model",
  userFacingRange: "fully-guaranteed" as const,
};

const environmentLoadProfile = {
  hardLimit: largeEnvironmentFixture,
  metric: "media-area" as const,
  smoothTarget: largeEnvironmentFixture,
  smoothTargetRatio: 1,
  target: "media.environment",
  userFacingRange: "fully-guaranteed" as const,
};

const stickerLoadProfile = {
  hardLimit: stickerBatchFixture,
  metric: "media-area" as const,
  smoothTarget: stickerBatchFixture,
  smoothTargetRatio: 1,
  target: "media.stickers",
  userFacingRange: "fully-guaranteed" as const,
};

const scratchLoadProfile = {
  hardLimit: scratchMaskFixture,
  metric: "media-area" as const,
  smoothTarget: scratchMaskFixture,
  smoothTargetRatio: 1,
  target: "media.scratches",
  userFacingRange: "fully-guaranteed" as const,
};

const scratchScaleWorkload = {
  canvas: { height: 270, width: 480 },
  modelMedia: largeModelFixture,
  renderScale: 2,
  scratchMedia: scratchMaskFixture,
};

const scratchScaleLoadProfile = {
  hardLimit: scratchScaleWorkload,
  metric: "custom" as const,
  smoothTarget: scratchScaleWorkload,
  smoothTargetRatio: 1,
  target: "surface.scratchScale",
  userFacingRange: "fully-guaranteed" as const,
};

const stickerScaleWorkload = {
  canvas: { height: 270, width: 480 },
  modelMedia: largeModelFixture,
  renderScale: 2,
  stickerMedia: stickerBatchFixture,
};

const stickerScaleLoadProfile = {
  hardLimit: stickerScaleWorkload,
  metric: "custom" as const,
  smoothTarget: stickerScaleWorkload,
  smoothTargetRatio: 1,
  target: "stickers.scale",
  userFacingRange: "fully-guaranteed" as const,
};

const sliders: readonly SliderTarget[] = [
  {
    defaultValue: 1,
    label: "Model scale",
    max: 3,
    min: 0.25,
    target: "model.scale",
  },
  {
    defaultValue: 0.35,
    label: "Depth",
    max: 1.5,
    min: 0,
    target: "surface.scratchDepth",
  },
  {
    defaultValue: 6,
    label: "Scratch scale",
    max: 20,
    min: 0.5,
    target: "surface.scratchScale",
  },
  {
    defaultValue: 0.4,
    label: "Sticker scale",
    max: 2,
    min: 0.2,
    target: "stickers.scale",
  },
  {
    defaultValue: 0,
    label: "Sticker rotation",
    max: 180,
    min: -180,
    target: "stickers.rotation",
  },
  {
    defaultValue: 2,
    label: "Repetition",
    max: 10,
    min: 1,
    target: "shader.repetition",
  },
  {
    defaultValue: 0.1,
    label: "Softness",
    max: 1,
    min: 0,
    target: "shader.softness",
  },
  {
    defaultValue: 0.3,
    label: "Red shift",
    max: 1,
    min: -1,
    target: "shader.shiftRed",
  },
  {
    defaultValue: 0.3,
    label: "Blue shift",
    max: 1,
    min: -1,
    target: "shader.shiftBlue",
  },
  {
    defaultValue: 0.07,
    label: "Distortion",
    max: 1,
    min: 0,
    target: "shader.distortion",
  },
  {
    defaultValue: 0.4,
    label: "Contour",
    max: 1,
    min: 0,
    target: "shader.contour",
  },
  {
    defaultValue: 70,
    label: "Angle",
    max: 360,
    min: 0,
    target: "shader.angle",
  },
  { defaultValue: 1, label: "Speed", max: 4, min: 0, target: "shader.speed" },
  {
    defaultValue: 0.6,
    label: "Scale",
    max: 4,
    min: 0.2,
    target: "shader.scale",
  },
  {
    defaultValue: 0,
    label: "Rotation",
    max: 360,
    min: 0,
    target: "shader.rotation",
  },
  {
    defaultValue: 1.35,
    label: "Intensity",
    max: 3,
    min: 0,
    target: "lighting.environmentIntensity",
  },
  {
    defaultValue: 0,
    label: "Environment rotation",
    max: 360,
    min: 0,
    target: "lighting.environmentRotation",
  },
];

const changes: readonly ChangeTarget[] = [
  {
    label: "Model",
    target: "media.model",
    uiSelector: '[aria-label="Browse file"]',
  },
  {
    label: "Mask",
    target: "media.scratches",
    uiSelector: '[aria-label="Browse image file"]',
  },
  { label: "Invert", target: "surface.scratchInvert" },
  {
    label: "PNG stickers",
    target: "media.stickers",
    uiSelector: '[aria-label="Browse image files"]',
  },
  { label: "Default", target: "shader.preset" },
  { label: "Background", target: "shader.colorBack" },
  { label: "Tint", target: "shader.colorTint" },
  { label: "Offset", target: "shader.offset" },
  { label: "Fit", target: "shader.fit" },
  { label: "Source", target: "lighting.environmentPreset" },
  {
    label: "HDRI",
    target: "media.environment",
    uiSelector: '[aria-label="Browse file"]',
  },
  { label: "Include", target: "export.includeBackground" },
  { label: "Background", target: "appearance.background" },
  { label: "Format", target: "export.image.format" },
  { label: "Format", target: "export.video.format" },
];

function slugTarget(target: string): string {
  return target.replaceAll(".", "-");
}

function sliderScenario({
  defaultValue,
  label,
  max,
  min,
  target,
}: SliderTarget): ToolcraftPerformanceScenario {
  const id = `${slugTarget(target)}-drag`;
  const scratchScale = target === "surface.scratchScale";
  const stickerScale = target === "stickers.scale";
  const stickerTransform = stickerScale || target === "stickers.rotation";
  const workload =
    target === "model.scale" ||
    target === "shader.scale" ||
    scratchScale ||
    stickerScale;
  const modelScale = target === "model.scale";

  return {
    automated: true,
    automatedTestName: `perf: ${target} live drag stays responsive`,
    browser: true,
    browserTestName: `browser perf: ${target} live drag stays responsive`,
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
    controlLabel: label,
    expectedObservable: modelScale
      ? "Model scale updates the normalized Three.js model transform live without re-decoding geometry or freezing the panel."
      : stickerTransform
        ? `${label} rebuilds only the selected sticker's bounded edge-connected surface chart while PNG decode, model normalization, and HDRI stay cached.`
        : `${label} updates the direct Paper-derived Three.js surface uniforms during pointer drag without freezing the panel.`,
    fixture: stickerTransform
      ? "detailed curved model with one selected production-size PNG sticker at 2x backing"
      : target === "shader.distortion"
        ? "uploaded asymmetric OBJ on a 480x270 canvas at 1x backing"
        : "uploaded asymmetric OBJ at Paper reference defaults",
    id,
    interaction: "control-drag",
    stressFixture: workload
      ? {
          kind: "max-value",
          loadProfile: {
            hardLimit: max,
            metric: "numeric-max",
            smoothTarget: max,
            smoothTargetRatio: 1,
            target,
            userFacingRange: "fully-guaranteed",
          },
          reason: modelScale
            ? "Model scale 3 is the maximum normalized geometry multiplier."
            : stickerScale
              ? "Sticker scale 2 is the maximum projector footprint and clipped-triangle workload."
              : scratchScale
                ? "Scratch scale 20 is the maximum object-space mask frequency."
                : "Paper Scale 4 is the maximum visible projection-scale value.",
          value: max,
        }
      : undefined,
    target,
    values: { default: defaultValue, max, min },
    workload,
    workloadFixture: stickerScale
      ? {
          kind: "custom",
          loadProfile: stickerScaleLoadProfile,
          reason:
            "A detailed model, one production-size PNG sticker, and a 480x270 canvas at 2x backing define the maximum bounded surface-chart workload.",
          value: stickerScaleWorkload,
        }
      : scratchScale
        ? {
          kind: "custom",
          loadProfile: scratchScaleLoadProfile,
          reason:
              "A detailed model, production-size grayscale mask, and a 480x270 canvas at 2x backing define the maximum useful scratch-frequency workload.",
            value: scratchScaleWorkload,
          }
        : workload
          ? {
              kind: "media",
              loadProfile: modelLoadProfile,
              reason: modelScale
                ? "A detailed 4K-equivalent model source is applied before measuring the full model transform range."
                : "A detailed 4K-equivalent model source is applied before measuring the full Paper Scale range.",
              value: largeModelFixture,
            }
          : undefined,
  };
}

function changeScenario({
  label,
  target,
  uiSelector,
}: ChangeTarget): ToolcraftPerformanceScenario {
  const id = `${slugTarget(target)}-change`;
  const modelMedia = target === "media.model";
  const mediaTarget =
    modelMedia ||
    target === "media.environment" ||
    target === "media.scratches" ||
    target === "media.stickers";
  const environmentMedia = target === "media.environment";
  const scratchMedia = target === "media.scratches";
  const stickerMedia = target === "media.stickers";
  const mediaFixture = stickerMedia
    ? stickerBatchFixture
    : scratchMedia
      ? scratchMaskFixture
      : environmentMedia
        ? largeEnvironmentFixture
        : largeModelFixture;
  const mediaLoadProfile = stickerMedia
    ? stickerLoadProfile
    : scratchMedia
      ? scratchLoadProfile
      : environmentMedia
        ? environmentLoadProfile
        : modelLoadProfile;

  return {
    automated: true,
    automatedTestName: `perf: ${target} change stays responsive`,
    browser: true,
    browserTestName: `browser perf: ${target} change stays responsive`,
    budget: {
      maxFrameGapMs: 120,
      maxInteractionMs: 2000,
    },
    controlLabel: label,
    expectedObservable: stickerMedia
      ? "One production-size 1920x1080 PNG reaches built-in import state within the strict media-area budget; GPU decal readiness is asserted immediately afterward, while selected-sticker scale and drag scenarios cover the prepared GPU workload."
      : scratchMedia
        ? "One production-size 1920x1080 grayscale mask decodes and uploads once, then changes triplanar physical normals without freezing the viewport."
        : modelMedia
          ? "The model file is read, parsed, normalized, and installed into the scene within the strict media-area budget; first GPU-frame readiness is asserted immediately afterward, while stress-preview and animation scenarios cover the prepared GPU workload."
        : `${label} changes runtime state and visible Liquid Metal output without freezing the viewport.`,
    fixture: "uploaded asymmetric OBJ at Paper reference defaults",
    id,
    interaction: mediaTarget ? "media-import" : "control-change",
    stress: mediaTarget,
    stressFixture: mediaTarget
      ? {
          kind: "media",
          loadProfile: mediaLoadProfile,
          reason: stickerMedia
            ? "One transparent 1920x1080 PNG provides the required production media-area floor; the separate two-file acceptance covers batch ordering and transforms."
            : scratchMedia
              ? "One 1920x1080 grayscale height mask provides the production media-area floor for decode and GPU texture upload."
              : environmentMedia
                ? "A 2048x1024 equirectangular HDRI is a realistic high-dynamic-range reflection source at the media workload floor."
                : "A 3840x2160-equivalent source envelope represents a detailed production GLB/OBJ import and satisfies the realistic media workload floor.",
          value: mediaFixture,
        }
      : undefined,
    target,
    uiSelector,
    workload: mediaTarget,
  };
}

function exportResolutionScenario({
  defaultValue,
  hardLimit,
  max,
  min,
  target,
}: {
  defaultValue: string;
  hardLimit: string;
  max: string;
  min: string;
  target: "export.image.resolution" | "export.video.resolution";
}): ToolcraftPerformanceScenario {
  const id = `${slugTarget(target)}-change`;

  return {
    automated: true,
    automatedTestName: `perf: ${target} maximum change stays responsive`,
    browser: true,
    browserTestName: `browser perf: ${target} maximum change stays responsive`,
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
    controlLabel: "Resolution",
    expectedObservable: `${target} selects the full advertised export size while the loaded model preview stays interactive.`,
    fixture: "large model with 2x preview render scale",
    id,
    interaction: "control-change",
    stressFixture: {
      kind: "max-value",
      loadProfile: {
        hardLimit,
        metric: "custom",
        smoothTarget: hardLimit,
        smoothTargetRatio: 1,
        target,
        userFacingRange: "fully-guaranteed",
      },
      reason: `${hardLimit} is the maximum visible ${target} option.`,
      value: hardLimit,
    },
    target,
    values: { default: defaultValue, max, min },
    workload: true,
    workloadFixture: {
      kind: "media",
      loadProfile: modelLoadProfile,
      reason:
        "A detailed 4K-equivalent model source is applied before measuring export resolution selection.",
      value: largeModelFixture,
    },
  };
}

const combinedStressFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: {
      canvas: { height: 360, width: 640 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    metric: "custom" as const,
    smoothTarget: {
      canvas: { height: 360, width: 640 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    smoothTargetRatio: 1,
    target: "renderer.output",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason:
    "A detailed model on a 640x360 canvas at 2x backing is the combined animated stress-preview workload.",
  value: {
    canvas: { height: 360, width: 640 },
    modelMedia: largeModelFixture,
    renderScale: 2,
  },
};

const orbitStressFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: {
      canvas: { height: 270, width: 480 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    metric: "custom" as const,
    smoothTarget: {
      canvas: { height: 270, width: 480 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    smoothTargetRatio: 1,
    target: "view.orbit",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason:
    "A 480x270 canvas at 2x backing isolates live orbit responsiveness while the separate 4K preview checkpoint covers the authored default workload.",
  value: {
    canvas: { height: 270, width: 480 },
    modelMedia: largeModelFixture,
    renderScale: 2,
  },
};

const viewportZoomStressFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: {
      canvas: { height: 270, width: 480 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    metric: "custom" as const,
    smoothTarget: {
      canvas: { height: 270, width: 480 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    smoothTargetRatio: 1,
    target: "renderer.output",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason:
    "A 480x270 canvas at 2x backing isolates toolbar zoom responsiveness while the separate Metal checkpoint covers the authored 4K scene.",
  value: {
    canvas: { height: 270, width: 480 },
    modelMedia: largeModelFixture,
    renderScale: 2,
  },
};

const viewportDragStressFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: {
      canvas: { height: 180, width: 320 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    metric: "custom" as const,
    smoothTarget: {
      canvas: { height: 180, width: 320 },
      modelMedia: largeModelFixture,
      renderScale: 2,
    },
    smoothTargetRatio: 1,
    target: "canvas.offset",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason:
    "A 320x180 canvas at 2x backing isolates animated canvas-pan scheduling while the separate 640x360 stress preview and Metal checkpoint cover larger output throughput.",
  value: {
    canvas: { height: 180, width: 320 },
    modelMedia: largeModelFixture,
    renderScale: 2,
  },
};

const stickerStressFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: {
      canvas: { height: 270, width: 480 },
      modelMedia: largeModelFixture,
      renderScale: 2,
      stickers: 1,
    },
    metric: "custom" as const,
    smoothTarget: {
      canvas: { height: 270, width: 480 },
      modelMedia: largeModelFixture,
      renderScale: 2,
      stickers: 1,
    },
    smoothTargetRatio: 1,
    target: "stickers.placements",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason:
    "A detailed model, one selected 1024px decal, and a 480x270 canvas at 2x backing define the strict direct-placement workload; multi-decal stack behavior is covered functionally.",
  value: {
    canvas: { height: 270, width: 480 },
    modelMedia: largeModelFixture,
    renderScale: 2,
    stickers: 1,
  },
};

const rendererScenarios: readonly ToolcraftPerformanceScenario[] = [
  {
    automated: true,
    automatedTestName: "perf: surface sticker drag stays responsive",
    browser: true,
    browserTestName: "browser perf: surface sticker drag stays responsive",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    expectedObservable:
      "Dragging the top decal raycasts and rebuilds only its clipped geometry while the other PNG textures, model decode, Liquid Metal uniforms, and HDRI stay cached.",
    fixture:
      "detailed curved model with one selected 1024px PNG decal at 2x backing",
    id: "sticker-surface-drag",
    interaction: "mask-drag",
    stress: true,
    stressFixture: stickerStressFixture,
    target: "stickers.placements",
    uiSelector: '[data-liquid-metal-canvas=""]',
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: view.orbit remains responsive",
    browser: true,
    browserTestName: "browser perf: view.orbit remains responsive",
    budget: {
      maxFrameGapMs: 120,
      maxInteractionMs: 2000,
      maxLongTaskMs: 250,
    },
    expectedObservable:
      "Dragging either an orientation-gizmo endpoint or raycast model geometry updates schema-backed camera pose and visible WebGL pixels, keeps Toolcraft canvas offset stable, and leaves model/media/environment preprocessing cached.",
    fixture:
      "uploaded model on a 480x270 canvas at 2x backing with both the lower-left six-axis orientation gizmo and hit-aware model-surface orbit",
    id: "responsive-view-orbit",
    interaction: "mask-drag",
    stressFixture: orbitStressFixture,
    target: "view.orbit",
    uiSelector:
      '[data-toolcraft-canvas-handle="liquid-metal-orientation-gizmo"]',
    workload: false,
  },
  {
    automated: true,
    automatedTestName:
      "perf: Liquid Metal 3D stress preview renders under budget",
    browser: true,
    browserTestName:
      "browser perf: Liquid Metal 3D stress preview renders under budget",
    budget: { maxLongTaskMs: 250, maxPreviewMs: 2000 },
    expectedObservable:
      "The direct procedural Three.js material renders the detailed model at 2x backing scale without a main-thread stall.",
    fixture: "detailed model on a 640x360 canvas at 2x backing",
    id: "renderer-stress-preview",
    interaction: "preview-render",
    stress: true,
    stressFixture: combinedStressFixture,
    uiSelector: '[data-liquid-metal-canvas=""]',
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: Liquid Metal 3D animation frames stay smooth",
    browser: true,
    browserTestName:
      "browser perf: Liquid Metal 3D animation frames stay smooth",
    budget: {
      maxFrameGapMs: 120,
      maxLongTaskMs: 250,
      maxRenderMs: 1800,
    },
    expectedObservable:
      "At least 120 browser frames and 40 distinct timeline-driven Liquid Metal frames prove the 30 fps preview scheduler does not regress to the former 20 fps cadence.",
    fixture: "320x180 cube scheduler baseline at 1x render scale",
    id: "renderer-animation-frame",
    interaction: "animation-frame",
    uiSelector: '[data-liquid-metal-canvas=""]',
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: animated canvas drag coalesces Liquid Metal work",
    browser: true,
    browserTestName:
      "browser perf: animated canvas drag coalesces Liquid Metal work",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    expectedObservable:
      "Physical canvas pan coalesces non-essential frames and resumes playback without changing play/pause state.",
    fixture:
      "detailed model on a 320x180 canvas at 2x backing during canvas pan",
    id: "renderer-animation-viewport-drag",
    interaction: "animation-viewport-drag",
    stress: true,
    stressFixture: viewportDragStressFixture,
    uiSelector: '[aria-label="Canvas viewport"]',
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: viewport zoom keeps Liquid Metal backing stable",
    browser: true,
    browserTestName:
      "browser perf: viewport zoom keeps Liquid Metal backing stable",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    expectedObservable:
      "Real toolbar zoom preserves the selected 2x product backing and keeps physical IBL animation responsive.",
    fixture:
      "detailed model on a 480x270 canvas at 2x backing during toolbar zoom",
    id: "renderer-viewport-zoom-stress",
    interaction: "viewport-zoom-stress",
    stress: true,
    stressFixture: viewportZoomStressFixture,
    uiSelector: '[data-liquid-metal-canvas=""]',
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: Liquid Metal viewport stays stable",
    browser: true,
    browserTestName: "browser perf: Liquid Metal viewport stays stable",
    budget: { maxFrameGapMs: 120 },
    expectedObservable:
      "Panel changes, model rotation, canvas pan, radar center, and zoom do not jump canvas size or offset unexpectedly.",
    fixture: "uploaded asymmetric OBJ",
    id: "renderer-viewport-stability",
    interaction: "viewport-stability",
    target: "renderer.output",
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: timeline playback keeps Liquid Metal responsive",
    browser: true,
    browserTestName:
      "browser perf: timeline playback keeps Liquid Metal responsive",
    budget: { maxFrameGapMs: 120, maxLongTaskMs: 250 },
    controlLabel: "Play playback",
    expectedObservable:
      "Timeline playback advances Paper frames without blocking UI input.",
    fixture: "uploaded asymmetric OBJ with extended timeline",
    id: "timeline-playback",
    interaction: "timeline-playback",
    target: "timeline.playback",
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "perf: timeline scrub keeps Liquid Metal responsive",
    browser: true,
    browserTestName:
      "browser perf: timeline scrub keeps Liquid Metal responsive",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    controlLabel: "Playback position",
    expectedObservable:
      "Scrubbing updates deterministic Paper frames without stale output.",
    fixture: "uploaded asymmetric OBJ with extended timeline",
    id: "timeline-scrub",
    interaction: "timeline-scrub",
    target: "timeline.scrub",
    workload: false,
  },
  {
    automated: true,
    automatedTestName:
      "perf: Liquid Metal export starts and completes under budget",
    browser: true,
    browserTestName:
      "browser perf: Liquid Metal export starts and completes under budget",
    budget: { maxExportMs: 8000 },
    expectedObservable:
      "A 2K PNG export renders the same physical Liquid Metal output and resolves its sticky action promise under budget.",
    fixture: "uploaded asymmetric OBJ at 2K PNG",
    id: "export-copy",
    interaction: "export-copy",
    target: "export.actions",
    workload: false,
  },
];

export const appPerformance: ToolcraftPerformanceConfig =
  defineToolcraftPerformance({
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
            "model-decode",
            "model-normalize",
            "sticker-decal-project",
            "three-surface-composite",
          ],
          mustNotInvalidate: [
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["media.model"],
        },
        {
          interaction: "media-import",
          invalidates: [
            "environment-decode",
            "environment-texture-prepare",
            "three-surface-composite",
          ],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "liquid-metal-uniform-pack",
          ],
          targets: ["media.environment"],
        },
        {
          interaction: "media-import",
          invalidates: [
            "scratch-mask-decode",
            "scratch-texture-prepare",
            "three-surface-composite",
          ],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["media.scratches"],
        },
        {
          interaction: "media-import",
          invalidates: [
            "sticker-decode",
            "sticker-decal-project",
            "three-surface-composite",
          ],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["media.stickers"],
        },
        {
          interaction: "mask-drag",
          invalidates: ["sticker-decal-project", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["stickers.placements"],
        },
        {
          interaction: "mask-drag",
          invalidates: ["orientation-gizmo", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "scratch-mask-decode",
            "scratch-texture-prepare",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["view.orbit"],
        },
        {
          interaction: "viewport-drag",
          invalidates: ["orientation-gizmo", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "scratch-mask-decode",
            "scratch-texture-prepare",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["view.orbit"],
        },
        {
          interaction: "control-drag",
          invalidates: ["sticker-decal-project", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["stickers.scale", "stickers.rotation"],
        },
        {
          interaction: "control-drag",
          invalidates: ["liquid-metal-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: sliders
            .filter(({ target }) => target.startsWith("shader."))
            .map(({ target }) => target),
        },
        {
          interaction: "control-drag",
          invalidates: ["three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["model.scale"],
        },
        {
          interaction: "control-drag",
          invalidates: ["scratch-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "scratch-mask-decode",
            "scratch-texture-prepare",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["surface.scratchDepth", "surface.scratchScale"],
        },
        {
          interaction: "control-drag",
          invalidates: ["three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: [
            "lighting.environmentIntensity",
            "lighting.environmentRotation",
          ],
        },
        {
          interaction: "control-change",
          invalidates: ["liquid-metal-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: changes
            .filter(
              ({ target }) =>
                !target.startsWith("media.") &&
                !target.startsWith("surface.") &&
                target !== "lighting.environmentPreset",
            )
            .map(({ target }) => target),
        },
        {
          interaction: "control-change",
          invalidates: ["scratch-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "scratch-mask-decode",
            "scratch-texture-prepare",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["surface.scratchInvert"],
        },
        {
          interaction: "control-change",
          invalidates: [
            "environment-texture-prepare",
            "three-surface-composite",
          ],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
          ],
          targets: ["lighting.environmentPreset"],
        },
        {
          interaction: "animation-frame",
          invalidates: ["liquid-metal-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "scratch-mask-decode",
            "scratch-texture-prepare",
            "sticker-decode",
            "sticker-decal-project",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: [
            "timeline.currentTimeSeconds",
            "timeline.durationSeconds",
            "shader.speed",
          ],
        },
        {
          interaction: "timeline-playback",
          invalidates: ["liquid-metal-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["timeline.playback"],
        },
        {
          interaction: "timeline-scrub",
          invalidates: ["liquid-metal-uniform-pack", "three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["timeline.scrub"],
        },
        {
          interaction: "viewport-drag",
          invalidates: ["three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["canvas.offset"],
        },
        {
          interaction: "viewport-zoom",
          invalidates: ["three-surface-composite"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "sticker-decode",
            "sticker-decal-project",
            "liquid-metal-uniform-pack",
            "environment-decode",
            "environment-texture-prepare",
          ],
          targets: ["canvas.zoom"],
        },
        {
          interaction: "export",
          invalidates: ["png-export", "video-export"],
          mustNotInvalidate: [
            "model-decode",
            "model-normalize",
            "environment-decode",
          ],
          targets: [
            "export.actions",
            "export.image.resolution",
            "export.video.resolution",
          ],
        },
      ],
      passes: [
        {
          cacheKey: ["media.model.assetIdentity"],
          id: "model-decode",
          inputs: ["media.model.dataUrl", "media.model.fileName"],
          invalidatedBy: ["media.model"],
          kind: "decode",
          output: "source",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: ["media.model.assetIdentity", "model.geometry.bounds"],
          id: "model-normalize",
          inputs: ["model-decode.geometry"],
          invalidatedBy: ["model-decode"],
          kind: "preprocess",
          output: "intermediate",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: ["media.environment.assetIdentity"],
          id: "environment-decode",
          inputs: ["media.environment.dataUrl", "media.environment.fileName"],
          invalidatedBy: ["media.environment"],
          kind: "decode",
          output: "source",
          quality: "full",
          runsOn: "worker",
        },
        {
          cacheKey: [
            "media.stickers.assetIdentity",
            "media.stickers.transform",
          ],
          id: "sticker-decode",
          inputs: [
            "media.stickers.dataUrl",
            "media.stickers.fileName",
            "media.stickers.transform",
          ],
          invalidatedBy: ["media.stickers"],
          kind: "decode",
          output: "source",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: ["media.scratches.assetIdentity"],
          id: "scratch-mask-decode",
          inputs: ["media.scratches.dataUrl", "media.scratches.fileName"],
          invalidatedBy: ["media.scratches.assetIdentity"],
          kind: "decode",
          output: "source",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: ["view.orbit", "viewport.theme", "fixed DPR 2"],
          id: "orientation-gizmo",
          inputs: ["view.orbit", "viewport.theme"],
          invalidatedBy: ["view.orbit", "viewport.theme"],
          kind: "composite",
          output: "preview",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: [
            "scratch-mask-decode.texture",
            "media.scratches.transform",
          ],
          id: "scratch-texture-prepare",
          inputs: ["scratch-mask-decode.texture", "media.scratches.transform"],
          invalidatedBy: ["scratch-mask-decode", "media.scratches.transform"],
          kind: "preprocess",
          output: "intermediate",
          quality: "full",
          runsOn: "gpu",
        },
        {
          cacheKey: [
            "media.model.assetIdentity",
            "media.stickers.assetIdentity",
            "media.stickers.order",
            "media.stickers.transform",
            "stickers.placements",
            "stickers.placements.scale",
            "stickers.placements.rotationDegrees",
            "stickers.placements.surfaceMeshIndex",
            "stickers.placements.surfaceFaceIndex",
          ],
          id: "sticker-decal-project",
          inputs: [
            "model-normalize.geometry",
            "sticker-decode.texture",
            "media.stickers.order",
            "stickers.placements",
            "stickers.placements.scale",
            "stickers.placements.rotationDegrees",
            "stickers.placements.surfaceMeshIndex",
            "stickers.placements.surfaceFaceIndex",
          ],
          invalidatedBy: [
            "model-normalize",
            "media.stickers",
            "stickers.placements",
            "stickers.scale",
            "stickers.rotation",
          ],
          kind: "vector-build",
          output: "intermediate",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: [
            "three.directEnvironmentTexture@r185",
            "proceduralEnvironmentRecipe@studio-presets-v1",
            "lighting.environmentPreset",
            "media.environment.assetIdentity",
            "preview.maxWidth=512",
          ],
          id: "environment-texture-prepare",
          inputs: [
            "renderer.context",
            "lighting.environmentPreset",
            "environment-decode.texture",
          ],
          invalidatedBy: [
            "renderer.context",
            "lighting.environmentPreset",
            "environment-decode",
          ],
          kind: "preprocess",
          output: "intermediate",
          quality: "full",
          runsOn: "gpu",
        },
        {
          cacheKey: [
            "paper.liquidMetalSurfaceCore@0.0.77",
            "shader.uniformTargets",
            "timeline.currentTimeSeconds",
            "timeline.durationSeconds",
          ],
          id: "liquid-metal-uniform-pack",
          inputs: [
            "shader.uniformTargets",
            "timeline.currentTimeSeconds",
            "timeline.durationSeconds",
          ],
          invalidatedBy: [
            "shader.controls",
            "timeline.playback",
            "timeline.scrub",
            "timeline.duration",
          ],
          kind: "composite",
          output: "intermediate",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: [
            "surface.scratchDepth",
            "surface.scratchScale",
            "surface.scratchInvert",
          ],
          id: "scratch-uniform-pack",
          inputs: [
            "surface.scratchDepth",
            "surface.scratchScale",
            "surface.scratchInvert",
          ],
          invalidatedBy: [
            "surface.scratchDepth",
            "surface.scratchScale",
            "surface.scratchInvert",
          ],
          kind: "composite",
          output: "intermediate",
          quality: "full",
          runsOn: "main",
        },
        {
          cacheKey: [
            "media.model.assetIdentity",
            "model.scale",
            "view.orbit",
            "liquid-metal-uniform-pack",
            "scratch-texture-prepare",
            "scratch-uniform-pack",
            "sticker-decal-project",
            "media.stickers.order",
            "canvas.size",
          ],
          id: "three-surface-composite",
          inputs: [
            "model-normalize.geometry",
            "model.scale",
            "model.geometry.position",
            "model.geometry.normal",
            "view.orbit",
            "environment-texture-prepare",
            "lighting.environmentIntensity",
            "lighting.environmentRotation",
            "liquid-metal-uniform-pack",
            "scratch-texture-prepare",
            "scratch-uniform-pack",
            "sticker-decal-project",
            "media.stickers",
            "stickers.placements",
            "appearance.background",
          ],
          invalidatedBy: [
            "liquid-metal-uniform-pack",
            "scratch-texture-prepare",
            "scratch-uniform-pack",
            "sticker-decal-project",
            "media.stickers",
            "stickers.placements",
            "view.orbit",
            "canvas.size",
            "canvas.renderScale",
            "model.scale",
            "appearance.background",
            "environment-texture-prepare",
            "lighting.environmentIntensity",
            "lighting.environmentRotation",
          ],
          kind: "composite",
          output: "preview",
          quality: "retina",
          runsOn: "gpu",
        },
        {
          id: "png-export",
          inputs: [
            "model-normalize.geometry",
            "model.scale",
            "view.orbit",
            "environment-texture-prepare",
            "liquid-metal-uniform-pack",
            "scratch-texture-prepare",
            "scratch-uniform-pack",
            "sticker-decal-project",
            "media.stickers.order",
            "export.image.resolution",
          ],
          invalidatedBy: [
            "export.actions",
            "export.image.resolution",
            "timeline.currentTimeSeconds",
            "media.scratches",
            "surface.scratchDepth",
            "surface.scratchScale",
            "surface.scratchInvert",
            "media.stickers",
            "stickers.placements",
            "view.orbit",
          ],
          kind: "export",
          output: "export",
          quality: "export",
          runsOn: "export-only",
        },
        {
          id: "video-export",
          inputs: [
            "model-normalize.geometry",
            "model.scale",
            "view.orbit",
            "environment-texture-prepare",
            "liquid-metal-uniform-pack",
            "scratch-texture-prepare",
            "scratch-uniform-pack",
            "sticker-decal-project",
            "media.stickers.order",
            "export.video.resolution",
          ],
          invalidatedBy: [
            "export.actions",
            "export.video.resolution",
            "timeline.durationSeconds",
            "media.scratches",
            "surface.scratchDepth",
            "surface.scratchScale",
            "surface.scratchInvert",
            "media.stickers",
            "stickers.placements",
            "view.orbit",
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
        "Paper's 2D image/shape mask and responsive canvas edge are intentionally replaced by a physical metallic-roughness surface with rippled normals and PMREM environment reflection; the stripe, noise, dispersion, contour, softness, angle, tint, and timing core is preserved.",
        "Physical lighting is intentionally reflective and full-coverage rather than pixel-identical to the flat reference page.",
        "Scratch height perturbs the shading normal but intentionally does not displace the silhouette; triplanar blending avoids missing-UV seams but can soften detail where projection axes contribute equally.",
      ],
      layers: [
        {
          content: ["bitmap-media", "geometry", "shader"],
          exportMode: "included",
          id: "liquid-metal-model",
          kind: "product-foreground",
          primitiveCount: "high",
          renderer: "webgl",
          uiSelector: '[data-liquid-metal-canvas=""]',
        },
        {
          content: ["bitmap-media", "geometry", "shader"],
          exportMode: "included",
          id: "surface-stickers",
          kind: "product-foreground",
          primitiveCount: "high",
          renderer: "webgl",
          uiSelector: '[data-liquid-metal-canvas=""]',
        },
        {
          content: ["composite"],
          exportMode: "included",
          id: "scene-background",
          kind: "background",
          primitiveCount: "low",
          renderer: "webgl",
        },
        {
          content: ["handles"],
          exportMode: "excluded",
          id: "orientation-gizmo",
          kind: "editing-handles",
          primitiveCount: "low",
          renderer: "dom",
          uiSelector:
            '[data-toolcraft-canvas-handle="liquid-metal-orientation-gizmo"]',
        },
        {
          content: ["composite"],
          exportMode: "composited",
          id: "export-output",
          kind: "export-composite",
          primitiveCount: "high",
          renderer: "webgl",
        },
      ],
      performanceRisks: [
        "Detailed model decode and bounds normalization run on the main thread once per media identity.",
        "Studio PMREM is generated once per renderer; built-in studio rigs generate and cache one small float equirectangular texture; uploaded HDR/EXR decode and preview resampling run in a worker, then direct physical radiance feeds the Paper core and GGX response per fragment.",
        "One grayscale scratch mask decodes once per media identity; object-space triplanar height and tangent-free normal gradients add fixed GPU texture work per fragment while Depth, Scratch scale, and Invert update uniforms only.",
        "Each PNG decodes once and scale-relative canonical model topology, including valid small bevel triangles, is cached once; moving a sticker unfolds and clips a bounded local surface chart on the main thread. Strict direct-manipulation performance uses one selected 1024px decal at 2x backing, while the ordered multi-decal stack is covered functionally.",
      ],
      previewExportDifferenceReason:
        "Preview reuses one persistent Three context with a 512px direct environment texture; export creates one isolated context and prepares the same environment at up to 2048px for final image/video reflections.",
      previewRenderer: "webgl",
      productRepresentation: "pixel",
      referenceRendererChangeReason:
        "The user requested realistic liquid metal, so Paper's procedural stripe/noise/color core now drives conductor color, micro-roughness, and the shading normal inside Three.js MeshPhysicalMaterial with PMREM environment reflections instead of writing an unlit final color.",
      rendererStrategy: "webgl",
      rendererWorkload: "pixel-output",
      sourceRepresentation: "mixed",
      whyNotAlternativeStrategies: [
        "Canvas 2D cannot render uploaded mesh depth or run Paper's fragment shader exactly.",
        "UV-only sampling would require authored unwraps that arbitrary OBJ/STL uploads may not provide.",
        "A grayscale matcap is a view-space lighting lookup rather than surface height, so it cannot produce object-attached physical scratch gradients under changing HDRI and orbit.",
        "A standalone matcap or ShaderMaterial can suggest chrome but does not provide roughness-prefiltered environment IBL or an energy-conserving conductor BRDF; the patched MeshPhysicalMaterial does.",
        "WebGPU would require translating Paper's maintained WebGL GLSL and reduce browser compatibility.",
      ],
    },
    rendererWorkload: "pixel-output",
    scenarios: [
      ...changes.map(changeScenario),
      ...sliders.map(sliderScenario),
      exportResolutionScenario({
        defaultValue: "4k",
        hardLimit: "8k",
        max: "8k",
        min: "2k",
        target: "export.image.resolution",
      }),
      exportResolutionScenario({
        defaultValue: "current",
        hardLimit: "4k",
        max: "4k",
        min: "current",
        target: "export.video.resolution",
      }),
      ...rendererScenarios,
    ],
    usesCustomRenderer: true,
    workloadTargets: [
      "model.scale",
      "surface.scratchScale",
      "stickers.scale",
      "shader.scale",
      "export.image.resolution",
      "export.video.resolution",
    ],
  });
