import type {
  ToolcraftControlSchema,
  ResolvedToolcraftAppSchema,
} from "../schema/types";

export type ToolcraftPerformanceInteraction =
  | "animation-frame"
  | "animation-viewport-drag"
  | "control-change"
  | "control-drag"
  | "export-copy"
  | "media-import"
  | "preview-render"
  | "viewport-zoom-stress"
  | "viewport-stability";

export type ToolcraftPerformanceCoverage = {
  automated: boolean;
  automatedTestName: string;
  browser: boolean;
  browserTestName: string;
};

export type ToolcraftPerformanceBudget = {
  maxExportMs?: number;
  maxFrameGapMs?: number;
  maxInteractionMs?: number;
  maxLongTaskMs?: number;
  maxPreviewMs?: number;
  maxRenderMs?: number;
};

export type ToolcraftPerformanceValueSet = {
  default: unknown;
  max?: unknown;
  min?: unknown;
};

export type ToolcraftPerformanceStressFixtureKind =
  | "custom"
  | "high-density"
  | "large-canvas"
  | "large-text"
  | "many-items"
  | "max-value"
  | "media";

export type ToolcraftPerformanceStressFixture = {
  kind: ToolcraftPerformanceStressFixtureKind;
  minChars?: number;
  minCount?: number;
  minLines?: number;
  reason: string;
  value?: unknown;
};

export type ToolcraftPerformanceScenario = ToolcraftPerformanceCoverage & {
  budget: ToolcraftPerformanceBudget;
  controlLabel?: string;
  expectedObservable: string;
  fixture: string;
  id: string;
  interaction: ToolcraftPerformanceInteraction;
  target?: string;
  stress?: boolean;
  stressFixture?: ToolcraftPerformanceStressFixture;
  uiSelector?: string;
  values?: ToolcraftPerformanceValueSet;
  workload: boolean;
};

export type ToolcraftRendererStrategy =
  | "none"
  | "dom"
  | "svg"
  | "canvas-2d"
  | "webgl"
  | "webgpu";

export type ToolcraftRendererWorkload =
  | "none"
  | "simple-composition"
  | "text-output"
  | "vector-output"
  | "pixel-output";

export type ToolcraftSourceRepresentation =
  | "reference-runtime"
  | "dom-text"
  | "svg"
  | "canvas-2d"
  | "webgl-texture"
  | "webgpu-texture"
  | "image-media"
  | "video-media"
  | "procedural-data"
  | "mixed";

export type ToolcraftProductRepresentation =
  | "text"
  | "vector"
  | "pixel"
  | "video"
  | "mixed";

export type ToolcraftPreviewRenderer =
  | "dom"
  | "svg"
  | "canvas-2d"
  | "webgl"
  | "webgpu";

export type ToolcraftExportRenderer =
  | "none"
  | "dom"
  | "svg"
  | "canvas-2d"
  | "webgl"
  | "webgpu"
  | "media-recorder"
  | "webcodecs";

export type ToolcraftRendererLayerKind =
  | "background"
  | "product-foreground"
  | "editing-handles"
  | "export-composite";

export type ToolcraftRendererLayerContent =
  | "bitmap-media"
  | "composite"
  | "dense-pattern"
  | "geometry"
  | "handles"
  | "noise"
  | "shader"
  | "text";

export type ToolcraftRendererLayerPrimitiveCount = "low" | "medium" | "high";

export type ToolcraftRendererLayerExportMode =
  | "included"
  | "excluded"
  | "composited";

export type ToolcraftRendererLayer = {
  content: readonly ToolcraftRendererLayerContent[];
  exportMode: ToolcraftRendererLayerExportMode;
  id: string;
  intentionalRasterizationReason?: string;
  kind: ToolcraftRendererLayerKind;
  primitiveCount: ToolcraftRendererLayerPrimitiveCount;
  renderer: Exclude<ToolcraftRendererStrategy, "none">;
  uiSelector?: string;
};

export type ToolcraftRendererTechnique = {
  exportRenderer: ToolcraftExportRenderer;
  fidelityRisks: readonly string[];
  intentionalRasterizationReason?: string;
  layers?: readonly ToolcraftRendererLayer[];
  performanceRisks: readonly string[];
  previewExportDifferenceReason?: string;
  previewRenderer: ToolcraftPreviewRenderer;
  productRepresentation: ToolcraftProductRepresentation;
  referenceRendererChangeReason?: string;
  rendererStrategy: ToolcraftRendererStrategy;
  rendererWorkload: ToolcraftRendererWorkload;
  sourceRepresentation: ToolcraftSourceRepresentation;
  whyNotAlternativeStrategies: readonly string[];
};

export type ToolcraftPerformanceConfig = {
  rendererStrategy: ToolcraftRendererStrategy;
  rendererTechnique?: ToolcraftRendererTechnique;
  rendererWorkload: ToolcraftRendererWorkload;
  scenarios: readonly ToolcraftPerformanceScenario[];
  usesCustomRenderer: boolean;
  workloadTargets: readonly string[];
};

export type ToolcraftPerformanceSensitiveControl = {
  control: ToolcraftControlSchema;
  controlId: string;
  target: string;
};

export type ToolcraftUnclassifiedPerformanceControl = {
  control: ToolcraftControlSchema;
  controlId: string;
  target: string;
};

const maxPerformanceBudgetCaps: Required<ToolcraftPerformanceBudget> = {
  maxExportMs: 8000,
  maxFrameGapMs: 120,
  maxInteractionMs: 2000,
  maxLongTaskMs: 250,
  maxPreviewMs: 2000,
  maxRenderMs: 2000,
};

export function defineToolcraftPerformance(
  config: ToolcraftPerformanceConfig,
): ToolcraftPerformanceConfig {
  return config;
}

const workloadControlPattern =
  /char\s*size|cell|density|glyph|grid|iteration|matrix|particle|quality|radius|resolution|sample|scale|size/i;

const heavyTextInputPattern = /code|css|instruction|json|prompt|script|shader|template/i;

const largeTextStressMinChars = 50_000;
const largeTextStressMinLines = 1_000;

const stressFixtureKinds = new Set<ToolcraftPerformanceStressFixtureKind>([
  "custom",
  "high-density",
  "large-canvas",
  "large-text",
  "many-items",
  "max-value",
  "media",
]);

function getControlSemanticText(control: ToolcraftControlSchema): string {
  return [
    control.target,
    typeof control.label === "string" ? control.label : "",
    control.unit ?? "",
    control.valueLabel ?? "",
    control.xLabel ?? "",
    control.yLabel ?? "",
    ...(control.options ?? []).flatMap((option) => [option.label, option.value]),
  ].join(" ");
}

function isSemanticallyWorkloadControl(control: ToolcraftControlSchema): boolean {
  const semanticText = getControlSemanticText(control);

  if (control.type === "code" || control.type === "text") {
    return heavyTextInputPattern.test(semanticText);
  }

  return workloadControlPattern.test(semanticText);
}

function isPotentialWorkloadControl(control: ToolcraftControlSchema): boolean {
  return control.performanceRole === "workload" || isSemanticallyWorkloadControl(control);
}

export function collectToolcraftPerformanceSensitiveControls(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftPerformanceSensitiveControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(([, control]) => isPotentialWorkloadControl(control))
      .map(([controlId, control]) => ({
        control,
        controlId,
        target: control.target,
      })),
  );
}

function collectToolcraftPerformanceRoleConflicts(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftPerformanceSensitiveControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(
        ([, control]) =>
          control.performanceRole === "responsiveness" &&
          isSemanticallyWorkloadControl(control),
      )
      .map(([controlId, control]) => ({
        control,
        controlId,
        target: control.target,
      })),
  );
}

export function collectToolcraftUnclassifiedPerformanceControls(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftUnclassifiedPerformanceControl[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls)
      .filter(
        ([, control]) =>
          control.type !== "panelActions" &&
          control.performanceRole !== "workload" &&
          control.performanceRole !== "responsiveness",
      )
      .map(([controlId, control]) => ({
        control,
        controlId,
        target: control.target,
      })),
  );
}

function hasAnyBudget(budget: ToolcraftPerformanceBudget): boolean {
  return Object.values(budget).some((value) => typeof value === "number" && value > 0);
}

function hasMinDefaultMax(values: ToolcraftPerformanceScenario["values"]): boolean {
  return values !== undefined && "default" in values && "min" in values && "max" in values;
}

function hasStressFixtureValue(
  fixture: ToolcraftPerformanceStressFixture,
): fixture is ToolcraftPerformanceStressFixture & { value: unknown } {
  return Object.prototype.hasOwnProperty.call(fixture, "value");
}

function getTextLineCount(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  return value.split(/\r\n|\r|\n/).length;
}

function isLargeTextWorkloadControl(
  control: ToolcraftControlSchema | undefined,
): boolean {
  if (
    !control ||
    (control.type !== "code" && control.type !== "text" && control.type !== "textarea")
  ) {
    return false;
  }

  return (
    control.type === "code" ||
    control.type === "textarea" ||
    heavyTextInputPattern.test(getControlSemanticText(control))
  );
}

function getStressFixtureErrors(
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): string[] {
  if (!scenario.workload) {
    return [];
  }

  const errors: string[] = [];
  const fixture = scenario.stressFixture;

  if (!fixture) {
    return [
      `${scenario.id} workload scenario must declare stressFixture with the real heaviest value used by browser performance tests.`,
    ];
  }

  if (!stressFixtureKinds.has(fixture.kind)) {
    errors.push(`${scenario.id} stressFixture.kind "${fixture.kind}" is not supported.`);
  }

  if (!fixture.reason.trim()) {
    errors.push(
      `${scenario.id} stressFixture must explain why this is the heaviest useful fixture.`,
    );
  }

  if (fixture.kind !== "custom" && !hasStressFixtureValue(fixture)) {
    errors.push(`${scenario.id} stressFixture must include value so browser tests can use it.`);
  }

  if (!isLargeTextWorkloadControl(control) && fixture.kind !== "large-text") {
    return errors;
  }

  if (fixture.kind !== "large-text") {
    errors.push(
      `${scenario.id} text workload scenario must use stressFixture.kind "large-text" with a real long text value.`,
    );
    return errors;
  }

  if (typeof fixture.value !== "string") {
    errors.push(`${scenario.id} large-text stressFixture.value must be a string.`);
    return errors;
  }

  const minChars = fixture.minChars ?? largeTextStressMinChars;
  const minLines = fixture.minLines ?? largeTextStressMinLines;

  if (minChars < largeTextStressMinChars) {
    errors.push(
      `${scenario.id} large-text stressFixture.minChars must be >= ${largeTextStressMinChars}.`,
    );
  }

  if (minLines < largeTextStressMinLines) {
    errors.push(
      `${scenario.id} large-text stressFixture.minLines must be >= ${largeTextStressMinLines}.`,
    );
  }

  if (fixture.value.length < minChars) {
    errors.push(
      `${scenario.id} large-text stressFixture.value must contain at least ${minChars} characters.`,
    );
  }

  if (getTextLineCount(fixture.value) < minLines) {
    errors.push(
      `${scenario.id} large-text stressFixture.value must contain at least ${minLines} lines.`,
    );
  }

  return errors;
}

function hasPositiveBudgetField(
  budget: ToolcraftPerformanceBudget,
  field: keyof ToolcraftPerformanceBudget,
): boolean {
  const value = budget[field];
  return typeof value === "number" && value > 0;
}

function getMissingInteractionBudgetFields(
  scenario: ToolcraftPerformanceScenario,
): string[] {
  switch (scenario.interaction) {
    case "animation-frame":
      return hasPositiveBudgetField(scenario.budget, "maxFrameGapMs")
        ? hasPositiveBudgetField(scenario.budget, "maxLongTaskMs")
          ? []
          : ["maxLongTaskMs"]
        : hasPositiveBudgetField(scenario.budget, "maxLongTaskMs")
          ? ["maxFrameGapMs"]
          : ["maxFrameGapMs", "maxLongTaskMs"];
    case "animation-viewport-drag":
    case "viewport-zoom-stress":
      return (["maxInteractionMs", "maxFrameGapMs", "maxLongTaskMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
    case "viewport-stability":
      return hasPositiveBudgetField(scenario.budget, "maxFrameGapMs")
        ? []
        : ["maxFrameGapMs"];
    case "control-change":
    case "control-drag":
    case "media-import":
      return (["maxInteractionMs", "maxFrameGapMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
    case "export-copy":
      return hasPositiveBudgetField(scenario.budget, "maxExportMs") ? [] : ["maxExportMs"];
    case "preview-render":
      return hasPositiveBudgetField(scenario.budget, "maxPreviewMs") ||
        hasPositiveBudgetField(scenario.budget, "maxRenderMs")
        ? []
        : ["maxPreviewMs or maxRenderMs"];
  }
}

function getBudgetCapErrors(scenario: ToolcraftPerformanceScenario): string[] {
  return Object.entries(scenario.budget).flatMap(([field, value]) => {
    const budgetField = field as keyof ToolcraftPerformanceBudget;
    const cap = maxPerformanceBudgetCaps[budgetField];

    if (typeof value !== "number" || value <= cap) {
      return [];
    }

    return [`${scenario.id} ${budgetField} budget must be <= ${cap}ms, received ${value}ms.`];
  });
}

function requiresConcreteUiTarget(interaction: ToolcraftPerformanceInteraction): boolean {
  return interaction === "control-change" || interaction === "control-drag";
}

function getAllSchemaControls(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftControlSchema[] {
  return (schema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.values(section.controls),
  );
}

function getVisiblePerformanceControlTargets(schema: ResolvedToolcraftAppSchema): string[] {
  return getAllSchemaControls(schema)
    .filter((control) => control.type !== "panelActions")
    .map((control) => control.target);
}

function getActionValue(
  action: NonNullable<ToolcraftControlSchema["actions"]>[number],
): string {
  return typeof action === "string" ? action : action.value;
}

function hasOutputDeliveryAction(schema: ResolvedToolcraftAppSchema): boolean {
  return getAllSchemaControls(schema).some(
    (control) =>
      control.type === "panelActions" &&
      (control.actions ?? []).some((action) =>
        /copy|download|export/i.test(getActionValue(action)),
      ),
  );
}

function hasKeyframeTimeline(schema: ResolvedToolcraftAppSchema): boolean {
  return schema.panels.timeline?.enabled === true && schema.panels.timeline.mode === "keyframes";
}

function hasLayersPanel(schema: ResolvedToolcraftAppSchema): boolean {
  return schema.panels.layers === true;
}

function hasNonEmptyItems(items: readonly string[]): boolean {
  return items.some((item) => item.trim().length > 0);
}

const rasterRendererStrategies = new Set<ToolcraftRendererStrategy>([
  "canvas-2d",
  "webgl",
  "webgpu",
]);

const semanticForegroundContent = new Set<ToolcraftRendererLayerContent>([
  "geometry",
  "text",
]);

const detailHeavyRendererContent = new Set<ToolcraftRendererLayerContent>([
  "bitmap-media",
  "dense-pattern",
  "noise",
  "shader",
]);

const vectorLayerRendererStrategies = new Set<ToolcraftRendererStrategy>(["dom", "svg"]);

function getLayerContentFamily(content: ToolcraftRendererLayerContent): string {
  if (content === "geometry" || content === "handles") {
    return "vector";
  }

  if (content === "text") {
    return "text";
  }

  if (
    content === "bitmap-media" ||
    content === "dense-pattern" ||
    content === "noise" ||
    content === "shader"
  ) {
    return "pixel";
  }

  return "composite";
}

function hasSemanticForegroundContent(layer: ToolcraftRendererLayer): boolean {
  return layer.content.some((content) => semanticForegroundContent.has(content));
}

function hasDetailHeavyRendererLayer(
  technique: ToolcraftRendererTechnique | undefined,
): boolean {
  return (technique?.layers ?? []).some(
    (layer) =>
      layer.primitiveCount === "high" ||
      layer.content.some((content) => detailHeavyRendererContent.has(content)),
  );
}

function hasHighCountCanvas2DRendererLayer(
  technique: ToolcraftRendererTechnique | undefined,
): boolean {
  return (technique?.layers ?? []).some(
    (layer) =>
      layer.renderer === "canvas-2d" &&
      layer.primitiveCount === "high" &&
      (hasSemanticForegroundContent(layer) ||
        layer.content.some((content) => detailHeavyRendererContent.has(content))),
  );
}

function hasStressPreviewOrAnimationScenario(config: ToolcraftPerformanceConfig): boolean {
  return config.scenarios.some(
    (scenario) =>
      scenario.stress === true &&
      (scenario.interaction === "preview-render" ||
        scenario.interaction === "animation-frame"),
  );
}

function hasLongTaskBudgetScenario(config: ToolcraftPerformanceConfig): boolean {
  return config.scenarios.some((scenario) =>
    hasPositiveBudgetField(scenario.budget, "maxLongTaskMs"),
  );
}

function hasZoomSensitiveRenderer(config: ToolcraftPerformanceConfig): boolean {
  return (
    config.rendererWorkload === "text-output" ||
    config.rendererWorkload === "vector-output" ||
    config.rendererWorkload === "pixel-output" ||
    hasDetailHeavyRendererLayer(config.rendererTechnique)
  );
}

function getRendererLayerErrors(technique: ToolcraftRendererTechnique): string[] {
  const errors: string[] = [];
  const layers = technique.layers ?? [];

  if (technique.productRepresentation === "mixed" && layers.length === 0) {
    errors.push(
      'productRepresentation "mixed" requires rendererTechnique.layers so mixed output is machine-checkable.',
    );
  }

  if (technique.productRepresentation === "mixed") {
    const contentFamilies = new Set(
      layers.flatMap((layer) => layer.content.map((content) => getLayerContentFamily(content))),
    );
    contentFamilies.delete("composite");

    if (contentFamilies.size < 2) {
      errors.push(
        'productRepresentation "mixed" requires rendererTechnique.layers with at least two different content families.',
      );
    }
  }

  for (const layer of layers) {
    if (!layer.id.trim()) {
      errors.push("rendererTechnique layers must have non-empty ids.");
    }

    if (!hasNonEmptyItems(layer.content)) {
      errors.push(`rendererTechnique layer "${layer.id}" must list content.`);
    }

    if (
      layer.kind === "product-foreground" &&
      hasSemanticForegroundContent(layer) &&
      layer.primitiveCount !== "high" &&
      rasterRendererStrategies.has(layer.renderer) &&
      !layer.intentionalRasterizationReason?.trim()
    ) {
      errors.push(
        `rendererTechnique layer "${layer.id}" uses ${layer.renderer} for low-count semantic geometry/text. Use dom/svg for semantic foreground or provide intentionalRasterizationReason.`,
      );
    }

    if (
      (layer.kind === "product-foreground" || layer.kind === "editing-handles") &&
      !layer.uiSelector?.trim()
    ) {
      errors.push(
        `rendererTechnique layer "${layer.id}" is ${layer.kind} and must declare uiSelector so browser tests can verify the visible renderer layer.`,
      );
    }

    if (
      layer.kind === "editing-handles" &&
      (!vectorLayerRendererStrategies.has(layer.renderer) || layer.exportMode !== "excluded")
    ) {
      errors.push(
        `rendererTechnique layer "${layer.id}" is editing-handles and must use dom/svg with exportMode "excluded".`,
      );
    }
  }

  return errors;
}

function getRendererTechniqueErrors(config: ToolcraftPerformanceConfig): string[] {
  const errors: string[] = [];
  const technique = config.rendererTechnique;

  if (config.usesCustomRenderer && !technique) {
    return [
      "Custom renderers must declare rendererTechnique so renderer choice is machine-checkable.",
    ];
  }

  if (!config.usesCustomRenderer && technique) {
    errors.push("Non-custom renderer configs must omit rendererTechnique.");
  }

  if (!technique) {
    return errors;
  }

  if (technique.rendererWorkload !== config.rendererWorkload) {
    errors.push(
      `rendererTechnique.rendererWorkload "${technique.rendererWorkload}" must match rendererWorkload "${config.rendererWorkload}".`,
    );
  }

  if (technique.rendererStrategy !== config.rendererStrategy) {
    errors.push(
      `rendererTechnique.rendererStrategy "${technique.rendererStrategy}" must match rendererStrategy "${config.rendererStrategy}".`,
    );
  }

  if (config.usesCustomRenderer && !hasNonEmptyItems(technique.whyNotAlternativeStrategies)) {
    errors.push(
      "Custom renderer technique must explain why alternative renderer strategies were rejected.",
    );
  }

  if (config.usesCustomRenderer && !hasNonEmptyItems(technique.fidelityRisks)) {
    errors.push("Custom renderer technique must list fidelity risks.");
  }

  if (config.usesCustomRenderer && !hasNonEmptyItems(technique.performanceRisks)) {
    errors.push("Custom renderer technique must list performance risks.");
  }

  if (
    technique.productRepresentation === "text" &&
    technique.rendererWorkload !== "text-output" &&
    !technique.intentionalRasterizationReason?.trim()
  ) {
    errors.push(
      'productRepresentation "text" requires rendererWorkload "text-output" unless intentionalRasterizationReason is provided.',
    );
  }

  if (
    technique.productRepresentation === "vector" &&
    technique.rendererWorkload !== "vector-output" &&
    !technique.intentionalRasterizationReason?.trim()
  ) {
    errors.push(
      'productRepresentation "vector" requires rendererWorkload "vector-output" unless intentionalRasterizationReason is provided.',
    );
  }

  if (
    technique.productRepresentation === "pixel" &&
    technique.rendererWorkload !== "pixel-output"
  ) {
    errors.push('productRepresentation "pixel" requires rendererWorkload "pixel-output".');
  }

  if (
    technique.previewRenderer !== technique.exportRenderer &&
    technique.exportRenderer !== "none" &&
    !technique.previewExportDifferenceReason?.trim()
  ) {
    errors.push("Different preview/export renderers require previewExportDifferenceReason.");
  }

  if (
    technique.sourceRepresentation === "reference-runtime" &&
    technique.previewRenderer !== technique.rendererStrategy &&
    !technique.referenceRendererChangeReason?.trim()
  ) {
    errors.push("Reference runtime renderer changes require referenceRendererChangeReason.");
  }

  errors.push(...getRendererLayerErrors(technique));

  return errors;
}

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

  errors.push(...getRendererTechniqueErrors(config));

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
    config.rendererWorkload === "pixel-output" &&
    !gpuRendererStrategies.has(config.rendererStrategy)
  ) {
    errors.push(
      `rendererWorkload "pixel-output" must use rendererStrategy "webgl" or "webgpu", received "${config.rendererStrategy}".`,
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

    if (scenario.workload && !hasMinDefaultMax(scenario.values)) {
      errors.push(`${scenario.id} workload scenario must include min/default/max values.`);
    }

    errors.push(...getStressFixtureErrors(scenario, controlsByTarget.get(scenario.target ?? "")));

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
    collectToolcraftPerformanceSensitiveControls(schema).map((entry) => entry.target),
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
    const hasWorkloadCoverage = targetScenarios.some(
      (scenario) =>
        scenario.workload &&
        (scenario.interaction === "control-drag" ||
          scenario.interaction === "control-change") &&
        hasMinDefaultMax(scenario.values),
    );

    if (!hasWorkloadCoverage) {
      errors.push(`${target} must have min/default/max workload performance coverage.`);
    }
  }

  for (const target of getVisiblePerformanceControlTargets(schema)) {
    if (!scenariosByTarget.has(target)) {
      errors.push(
        `${target} must have a performance scenario because every visible control can affect app responsiveness.`,
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

    if (schema.canvas.upload && !interactions.has("media-import")) {
      errors.push(
        "Custom renderers with canvas upload must include a media-import performance scenario.",
      );
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
