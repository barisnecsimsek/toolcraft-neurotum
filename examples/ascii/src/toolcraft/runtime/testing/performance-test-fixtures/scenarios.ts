import { defineToolcraftPerformance } from "../performance";
import {
  createAnimatedVectorRendererPipeline,
  createTextRendererPipeline,
} from "./renderer-pipelines";
import {
  createCombinedRendererStressFixture,
  createCustomStressFixture,
  createLargeTextStressFixture,
  createMaxValueStressFixture,
} from "./stress-fixtures";

export function createViewportZoomStressScenario() {
  return {
    automated: true,
    automatedTestName: "perf: detailed canvas zoom stays smooth",
    browser: true,
    browserTestName: "browser perf: detailed canvas zoom stays smooth",
    budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
    expectedObservable:
      "Zooming detailed product output does not shake the canvas or block frames.",
    fixture: "detailed renderer zoom fixture",
    id: "viewport-zoom-stress",
    interaction: "viewport-zoom-stress" as const,
    stress: true,
    stressFixture: createCombinedRendererStressFixture(),
    target: "canvas.viewport",
    workload: false,
  };
}

export function createTextRendererScenarios(
  options: { includeStressPreview?: boolean; includeViewportZoomStress?: boolean } = {},
) {
  const includeStressPreview = options.includeStressPreview ?? true;
  const includeViewportZoomStress = options.includeViewportZoomStress ?? true;

  return [
    {
      automated: true,
      automatedTestName: "perf: text preview render stays under budget",
      browser: true,
      browserTestName: "browser perf: text preview render stays under budget",
      budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
      expectedObservable: "Text preview renders crisply without freezing.",
      fixture: "native-resolution glyph output fixture",
      id: "text-preview-render",
      interaction: "preview-render" as const,
      stress: includeStressPreview,
      ...(includeStressPreview
        ? { stressFixture: createCombinedRendererStressFixture() }
        : {}),
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: density drag stays responsive",
      browser: true,
      browserTestName: "browser perf: density drag stays responsive",
      budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
      controlLabel: "Density",
      expectedObservable: "Dragging Density updates text output without blocking the UI.",
      fixture: "runtime density fixture",
      id: "density-drag",
      interaction: "control-drag" as const,
      stressFixture: createMaxValueStressFixture(
        12,
        "Density max is the heaviest glyph output fixture.",
      ),
      target: "render.density",
      values: { default: 4, max: 12, min: 1 },
      workloadFixture: createLargeTextStressFixture(),
      workload: true,
    },
    {
      automated: true,
      automatedTestName: "perf: mode change stays responsive",
      browser: true,
      browserTestName: "browser perf: mode change stays responsive",
      budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
      controlLabel: "Mode",
      expectedObservable: "Changing Mode updates text output without blocking the UI.",
      fixture: "runtime mode fixture",
      id: "mode-change",
      interaction: "control-change" as const,
      target: "render.mode",
      values: { default: "soft", max: "sharp", min: "soft" },
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: viewport stays stable",
      browser: true,
      browserTestName: "browser perf: viewport stays stable",
      budget: { maxFrameGapMs: 80 },
      expectedObservable: "Viewport remains stable.",
      fixture: "native-resolution glyph output fixture",
      id: "viewport-stability",
      interaction: "viewport-stability" as const,
      workload: false,
    },
    ...(includeViewportZoomStress ? [createViewportZoomStressScenario()] : []),
  ];
}

export function createAnimationFrameScenario() {
  return {
    automated: true,
    automatedTestName: "perf: animation frame loop stays smooth",
    browser: true,
    browserTestName: "browser perf: animation frame loop stays smooth",
    budget: { maxFrameGapMs: 80, maxLongTaskMs: 80 },
    expectedObservable: "Animated renderer advances without long frame gaps.",
    fixture: "animated renderer fixture",
    id: "animation-frame-loop",
    interaction: "animation-frame" as const,
    stress: true,
    stressFixture: createCustomStressFixture(
      { animation: "fastest", density: 12 },
      "Animation stress must sample the heaviest animated output.",
    ),
    workload: false,
  };
}

export function createAnimationViewportDragScenario() {
  return {
    automated: true,
    automatedTestName: "perf: animated canvas drag stays smooth",
    browser: true,
    browserTestName: "browser perf: animated canvas drag stays smooth",
    budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
    expectedObservable: "Animated renderer stays smooth while the canvas viewport is dragged.",
    fixture: "animated renderer canvas drag fixture",
    id: "animation-viewport-drag",
    interaction: "animation-viewport-drag" as const,
    stress: true,
    stressFixture: createCustomStressFixture(
      { animation: "fastest", density: 12 },
      "Animated viewport drag must run while the heaviest animated output is visible.",
    ),
    target: "canvas.viewport",
    workload: false,
  };
}

export function createAnimatedVectorRendererConfig(options: { includeViewportDrag: boolean }) {
  return defineToolcraftPerformance({
    rendererStrategy: "svg",
    rendererTechnique: {
      exportRenderer: "svg",
      fidelityRisks: ["animated vector output must stay crisp while panning"],
      performanceRisks: ["dense vector animation can jank while the viewport moves"],
      previewRenderer: "svg",
      productRepresentation: "vector",
      rendererStrategy: "svg",
      rendererWorkload: "vector-output",
      sourceRepresentation: "procedural-data",
      whyNotAlternativeStrategies: ["svg preserves semantic vector output for this fixture"],
    },
    rendererWorkload: "vector-output",
    rendererPipeline: createAnimatedVectorRendererPipeline(),
    scenarios: [
      ...createTextRendererScenarios(),
      createAnimationFrameScenario(),
      ...(options.includeViewportDrag ? [createAnimationViewportDragScenario()] : []),
    ],
    usesCustomRenderer: true,
    workloadTargets: ["render.density"],
  });
}
