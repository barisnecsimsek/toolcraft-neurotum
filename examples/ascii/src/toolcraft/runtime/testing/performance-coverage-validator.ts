import type { ResolvedToolcraftAppSchema } from "../schema/types";
import { isToolcraftRuntimeOwnedTarget } from "../schema/runtime-targets";
import type {
  ToolcraftPerformanceConfig,
  ToolcraftPerformanceScenario,
  ToolcraftRendererStrategy,
} from "./performance-types";
import { getBrowserCheckPolicyErrors } from "./performance-browser-policy";
import {
  collectToolcraftPerformanceRoleConflicts,
  collectToolcraftPerformanceSensitiveControls,
} from "./performance-control-classification";
import {
  getBudgetCapErrors,
  getMissingInteractionBudgetFields,
  hasAnyBudget,
} from "./performance-budget-validation";
import {
  getStressFixtureErrors,
  getWorkloadFixtureErrors,
} from "./performance-fixture-validation";
import {
  getSliderDragControlType,
  hasControlDragScenario,
  hasMinDefaultMax,
  requiresConcreteUiTarget,
} from "./performance-scenario-validation";
import {
  getAllSchemaControls,
  getVisiblePerformanceControlTargets,
  hasKeyframeTimeline,
  hasLayersPanel,
  hasOutputDeliveryAction,
} from "./performance-schema-queries";
import {
  getRendererPipelineErrors,
  getRendererTechniqueErrors,
  hasDetailHeavyRendererLayer,
  hasHighCountCanvas2DRendererLayer,
  hasLongTaskBudgetScenario,
  hasMainThreadCanvasRasterCompositePreviewPressure,
  hasMeasuredGpuAlternativeEvidence,
  hasStressPreviewOrAnimationScenario,
  hasZoomSensitiveRenderer,
} from "./performance-renderer-validation";

export function validateToolcraftPerformanceCoverage(
  schema: ResolvedToolcraftAppSchema,
  config: ToolcraftPerformanceConfig,
): string[] {
  const errors: string[] = [];
  const scenariosByTarget = new Map<string, ToolcraftPerformanceScenario[]>();
  const browserTestNamesByScenario = new Map<string, string>();
  const customRendererStrategies = new Set<ToolcraftRendererStrategy>([
    "dom",
    "svg",
    "canvas-2d",
    "webgl",
    "webgpu",
  ]);
  const gpuRendererStrategies = new Set<ToolcraftRendererStrategy>(["webgl", "webgpu"]);
  const controlsByTarget = new Map(
    getAllSchemaControls(schema).map((control) => [control.target, control] as const),
  );

  errors.push(...getBrowserCheckPolicyErrors(config));
  errors.push(...getRendererTechniqueErrors(config));
  errors.push(...getRendererPipelineErrors(schema, config));

  if (config.usesCustomRenderer && !customRendererStrategies.has(config.rendererStrategy)) {
    errors.push(
      'Custom renderers must declare rendererStrategy "dom", "svg", "canvas-2d", "webgl", or "webgpu".',
    );
  }

  if (!config.usesCustomRenderer && config.rendererStrategy !== "none") {
    errors.push(
      `Non-custom renderer configs must use rendererStrategy "none", received "${config.rendererStrategy}".`,
    );
  }

  if (config.usesCustomRenderer && config.rendererWorkload === "none") {
    errors.push(
      'Custom renderers must declare rendererWorkload "simple-composition", "text-output", "vector-output", or "pixel-output".',
    );
  }

  if (!config.usesCustomRenderer && config.rendererWorkload !== "none") {
    errors.push(
      `Non-custom renderer configs must use rendererWorkload "none", received "${config.rendererWorkload}".`,
    );
  }

  if (
    hasMainThreadCanvasRasterCompositePreviewPressure(config) &&
    config.rendererWorkload !== "pixel-output"
  ) {
    errors.push(
      `Canvas 2D pipelines with main-thread rasterize/composite preview pressure must use rendererWorkload "pixel-output" or move expensive passes off the main thread; received "${config.rendererWorkload}".`,
    );
  }

  if (
    config.rendererWorkload === "pixel-output" &&
    !gpuRendererStrategies.has(config.rendererStrategy) &&
    (!config.rendererTechnique || !hasMeasuredGpuAlternativeEvidence(config.rendererTechnique))
  ) {
    errors.push(
      `rendererWorkload "pixel-output" should use rendererStrategy "webgl" or "webgpu", received "${config.rendererStrategy}". Keeping a CPU renderer requires rendererTechnique.measuredAlternativeEvidence for WebGL/WebGPU stress comparison.`,
    );
  }

  if (config.rendererWorkload === "pixel-output") {
    if (!hasStressPreviewOrAnimationScenario(config)) {
      errors.push(
        'rendererWorkload "pixel-output" must include a stress preview-render or animation-frame scenario with stress: true for the largest product canvas and heaviest workload values.',
      );
    }

    if (!hasLongTaskBudgetScenario(config)) {
      errors.push(
        'rendererWorkload "pixel-output" must include at least one maxLongTaskMs budget so GPU-backed previews cannot pass while freezing the main thread.',
      );
    }
  }

  if (config.usesCustomRenderer && hasDetailHeavyRendererLayer(config.rendererTechnique)) {
    if (!hasStressPreviewOrAnimationScenario(config)) {
      errors.push(
        "Detail-heavy custom renderers must include a stress preview-render or animation-frame scenario for the largest product canvas and heaviest workload values.",
      );
    }

    if (!hasLongTaskBudgetScenario(config)) {
      errors.push(
        "Detail-heavy custom renderers must include at least one maxLongTaskMs budget so renderer technology can be revised when main-thread work stalls.",
      );
    }
  }

  if (
    config.usesCustomRenderer &&
    hasHighCountCanvas2DRendererLayer(config.rendererTechnique) &&
    !hasStressPreviewOrAnimationScenario(config)
  ) {
    errors.push(
      "High-count Canvas 2D renderer layers must include stress preview-render or animation-frame evidence before delivery. If that stress evidence fails, revise renderer strategy instead of only lowering product workload.",
    );
  }

  for (const scenario of config.scenarios) {
    if (!scenario.id.trim()) {
      errors.push("Performance scenario is missing an id.");
    }

    if (!scenario.fixture.trim()) {
      errors.push(`${scenario.id} must name a representative fixture.`);
    }

    if (!scenario.expectedObservable.trim()) {
      errors.push(`${scenario.id} must describe a product-level performance observable.`);
    }

    if (!hasAnyBudget(scenario.budget)) {
      errors.push(`${scenario.id} must declare at least one numeric performance budget.`);
    }

    const missingBudgetFields = getMissingInteractionBudgetFields(scenario);
    if (missingBudgetFields.length > 0) {
      errors.push(
        `${scenario.id} ${scenario.interaction} scenario must declare ${missingBudgetFields.join(
          " and ",
        )}.`,
      );
    }

    errors.push(...getBudgetCapErrors(scenario));

    if (!scenario.automated || !scenario.automatedTestName.trim()) {
      errors.push(`${scenario.id} must point to an automated performance test.`);
    }

    if (!scenario.browser || !scenario.browserTestName.trim()) {
      errors.push(`${scenario.id} must point to a browser performance test.`);
    }

    if (scenario.browser && scenario.browserTestName.trim()) {
      const previousScenarioId = browserTestNamesByScenario.get(scenario.browserTestName);

      if (previousScenarioId) {
        errors.push(
          `${scenario.id} browserTestName "${scenario.browserTestName}" is already used by ${previousScenarioId}. Give each performance scenario its own browser test so every control is actually exercised.`,
        );
      } else {
        browserTestNamesByScenario.set(scenario.browserTestName, scenario.id);
      }
    }

    if (
      scenario.workload &&
      scenario.interaction !== "media-import" &&
      !hasMinDefaultMax(scenario.values)
    ) {
      errors.push(`${scenario.id} workload scenario must include min/default/max values.`);
    }

    const scenarioControl = controlsByTarget.get(scenario.target ?? "");
    errors.push(...getStressFixtureErrors(scenario, scenarioControl));
    errors.push(...getWorkloadFixtureErrors(config, scenario, scenarioControl));

    if (
      requiresConcreteUiTarget(scenario.interaction) &&
      !scenario.controlLabel?.trim() &&
      !scenario.uiSelector?.trim()
    ) {
      errors.push(
        `${scenario.id} ${scenario.interaction} scenario must declare controlLabel or uiSelector for its real browser interaction.`,
      );
    }

    if (scenario.target) {
      const scenarios = scenariosByTarget.get(scenario.target) ?? [];
      scenarios.push(scenario);
      scenariosByTarget.set(scenario.target, scenarios);
    }
  }

  const performanceTargets = new Set(config.workloadTargets);
  const schemaTargets = new Set(
    (schema.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls).map((control) => control.target),
    ),
  );
  const sensitiveTargets = new Set(
    collectToolcraftPerformanceSensitiveControls(schema)
      .map((entry) => entry.target)
      .filter((target) => !isToolcraftRuntimeOwnedTarget(target)),
  );
  const performanceRoleConflicts = collectToolcraftPerformanceRoleConflicts(schema);

  for (const { controlId, target } of performanceRoleConflicts) {
    errors.push(
      `${controlId} (${target}) looks performance-sensitive but declares performanceRole "responsiveness". Use performanceRole "workload" with workloadTargets and min/default/max coverage, or rename/restructure the control if it is truly lightweight.`,
    );
  }

  for (const target of sensitiveTargets) {
    if (!performanceTargets.has(target)) {
      errors.push(
        `${target} is performance-sensitive and must be listed in workloadTargets with min/default/max workload coverage.`,
      );
    }
  }

  for (const target of performanceTargets) {
    if (!schemaTargets.has(target)) {
      errors.push(`Performance workload target ${target} does not exist in schema controls.`);
    }

    const targetScenarios = scenariosByTarget.get(target) ?? [];
    const targetControl = controlsByTarget.get(target);
    const targetRequiresDrag = getSliderDragControlType(targetControl) !== null;
    const hasWorkloadCoverage = targetScenarios.some(
      (scenario) =>
        scenario.workload &&
        (targetRequiresDrag
          ? scenario.interaction === "control-drag"
          : scenario.interaction === "control-drag" ||
            scenario.interaction === "control-change") &&
        hasMinDefaultMax(scenario.values),
    );

    if (!hasWorkloadCoverage) {
      errors.push(
        targetRequiresDrag
          ? `${target} must have min/default/max workload performance coverage through a real control-drag scenario.`
          : `${target} must have min/default/max workload performance coverage.`,
      );
    }
  }

  for (const target of getVisiblePerformanceControlTargets(schema)) {
    if (isToolcraftRuntimeOwnedTarget(target)) {
      continue;
    }

    const targetScenarios = scenariosByTarget.get(target) ?? [];
    const targetControl = controlsByTarget.get(target);
    const sliderControlType = getSliderDragControlType(targetControl);

    if (targetScenarios.length === 0) {
      errors.push(
        `${target} must have a performance scenario because every visible control can affect app responsiveness.`,
      );
    } else if (sliderControlType && !hasControlDragScenario(targetScenarios)) {
      errors.push(
        `${target} is a ${sliderControlType} and must have a control-drag performance scenario proving live canvas/product feedback while dragging.`,
      );
    }
  }

  if (hasOutputDeliveryAction(schema)) {
    const interactions = new Set(config.scenarios.map((scenario) => scenario.interaction));

    if (!interactions.has("export-copy")) {
      errors.push("Output actions must include an export-copy performance scenario.");
    }
  }

  if (config.usesCustomRenderer) {
    const interactions = new Set(config.scenarios.map((scenario) => scenario.interaction));
    const hasAnimatedRendererScenario = interactions.has("animation-frame");
    const needsViewportZoomStress =
      hasAnimatedRendererScenario || hasZoomSensitiveRenderer(config);

    for (const requiredInteraction of [
      "preview-render",
      "control-drag",
      "viewport-stability",
    ] as const) {
      if (!interactions.has(requiredInteraction)) {
        errors.push(
          `Custom renderers must include a ${requiredInteraction} performance scenario.`,
        );
      }
    }

    if (hasAnimatedRendererScenario) {
      const hasAnimatedViewportDrag = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "animation-viewport-drag" &&
          scenario.stress === true,
      );

      if (!hasAnimatedViewportDrag) {
        errors.push(
          "Animated custom renderers must include an animation-viewport-drag performance scenario that samples frames while physically moving the canvas viewport.",
        );
      }
    }

    if (needsViewportZoomStress) {
      const hasViewportZoomStress = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "viewport-zoom-stress" &&
          scenario.stress === true,
      );

      if (!hasViewportZoomStress) {
        errors.push(
          "Detail-heavy or animated custom renderers must include a viewport-zoom-stress performance scenario that uses real zoom controls while sampling frame gaps and long tasks.",
        );
      }
    }

    if (schema.canvas.upload) {
      const mediaImportScenarios = config.scenarios.filter(
        (scenario) => scenario.interaction === "media-import",
      );

      if (mediaImportScenarios.length === 0) {
        errors.push(
          "Custom renderers with canvas upload must include a media-import performance scenario.",
        );
      } else if (
        !mediaImportScenarios.some(
          (scenario) => scenario.workload && scenario.stressFixture?.kind === "media",
        )
      ) {
        errors.push(
          'Custom renderers with canvas upload must include a workload media-import performance scenario with stressFixture.kind "media".',
        );
      }
    }

    if (hasKeyframeTimeline(schema)) {
      const hasKeyframeViewportStability = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "viewport-stability" &&
          scenario.target === "timeline.keyframes",
      );

      if (!hasKeyframeViewportStability) {
        errors.push(
          'Keyframe custom renderers must include a viewport-stability performance scenario with target "timeline.keyframes" that exercises zoom/radar, expanded keyframes, keyframe creation, and playback or scrubbing.',
        );
      }
    }

    if (hasLayersPanel(schema)) {
      const hasLayerViewportStability = config.scenarios.some(
        (scenario) =>
          scenario.interaction === "viewport-stability" &&
          scenario.target === "layers.interactions",
      );

      if (!hasLayerViewportStability) {
        errors.push(
          'Layer-enabled custom renderers must include a viewport-stability performance scenario with target "layers.interactions" that exercises zoom/radar, layer selection, visibility, reorder or grouping, and selected-layer output stability.',
        );
      }
    }
  }

  return errors;
}
