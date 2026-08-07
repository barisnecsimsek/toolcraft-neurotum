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
  | "mask-drag"
  | "media-import"
  | "preview-render"
  | "timeline-playback"
  | "timeline-scrub"
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

export type ToolcraftPerformanceFixtureKind =
  | "custom"
  | "high-density"
  | "large-canvas"
  | "large-text"
  | "many-items"
  | "max-value"
  | "media";

export type ToolcraftPerformanceFixture = {
  kind: ToolcraftPerformanceFixtureKind;
  minChars?: number;
  minCount?: number;
  minLines?: number;
  reason: string;
  value?: unknown;
};

export type ToolcraftPerformanceStressFixtureKind = ToolcraftPerformanceFixtureKind;
export type ToolcraftPerformanceStressFixture = ToolcraftPerformanceFixture;
export type ToolcraftPerformanceWorkloadFixture = ToolcraftPerformanceFixture;

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
  workloadFixture?: ToolcraftPerformanceWorkloadFixture;
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

export type ToolcraftRenderPassKind =
  | "decode"
  | "preprocess"
  | "pixel-transform"
  | "vector-build"
  | "text-layout"
  | "rasterize"
  | "composite"
  | "handles"
  | "export";

export type ToolcraftRenderPassRunLocation =
  | "main"
  | "worker"
  | "gpu"
  | "worker-or-gpu"
  | "export-only";

export type ToolcraftRenderPassOutput =
  | "source"
  | "intermediate"
  | "preview"
  | "overlay"
  | "export";

export type ToolcraftRenderPassQuality = "preview" | "full" | "retina" | "export";

export type ToolcraftRenderPass = {
  cacheKey?: readonly string[];
  id: string;
  inputs: readonly string[];
  invalidatedBy: readonly string[];
  kind: ToolcraftRenderPassKind;
  output: ToolcraftRenderPassOutput;
  quality: ToolcraftRenderPassQuality;
  runsOn: ToolcraftRenderPassRunLocation;
};

export type ToolcraftPipelineInteraction =
  | "animation-frame"
  | "control-change"
  | "control-drag"
  | "media-import"
  | "mask-drag"
  | "viewport-drag"
  | "viewport-zoom"
  | "timeline-playback"
  | "timeline-scrub"
  | "export";

export type ToolcraftInteractionInvalidation = {
  interaction: ToolcraftPipelineInteraction;
  invalidates: readonly string[];
  mustNotInvalidate?: readonly string[];
  targets: readonly string[];
};

export type ToolcraftRendererPipeline = {
  interactionInvalidation: readonly ToolcraftInteractionInvalidation[];
  passes: readonly ToolcraftRenderPass[];
};

export type ToolcraftPerformanceConfig = {
  rendererPipeline?: ToolcraftRendererPipeline;
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
const mediaStressMinArea = 1920 * 1080;
const mediaStressMinLongEdge = 1920;

const performanceFixtureKinds = new Set<ToolcraftPerformanceFixtureKind>([
  "custom",
  "high-density",
  "large-canvas",
  "large-text",
  "many-items",
  "max-value",
  "media",
]);

const renderPassKinds = new Set<ToolcraftRenderPassKind>([
  "decode",
  "preprocess",
  "pixel-transform",
  "vector-build",
  "text-layout",
  "rasterize",
  "composite",
  "handles",
  "export",
]);

const renderPassRunLocations = new Set<ToolcraftRenderPassRunLocation>([
  "main",
  "worker",
  "gpu",
  "worker-or-gpu",
  "export-only",
]);

const renderPassOutputs = new Set<ToolcraftRenderPassOutput>([
  "source",
  "intermediate",
  "preview",
  "overlay",
  "export",
]);

const renderPassQualities = new Set<ToolcraftRenderPassQuality>([
  "preview",
  "full",
  "retina",
  "export",
]);

const pipelineInteractions = new Set<ToolcraftPipelineInteraction>([
  "animation-frame",
  "control-change",
  "control-drag",
  "media-import",
  "mask-drag",
  "viewport-drag",
  "viewport-zoom",
  "timeline-playback",
  "timeline-scrub",
  "export",
]);

const expensiveRenderPassKinds = new Set<ToolcraftRenderPassKind>([
  "decode",
  "preprocess",
  "pixel-transform",
  "text-layout",
  "rasterize",
]);

const cacheRequiredRenderPassKinds = new Set<ToolcraftRenderPassKind>([
  ...expensiveRenderPassKinds,
  "composite",
]);

const highFrequencyViewportInteractions = new Set<ToolcraftPipelineInteraction>([
  "animation-frame",
  "mask-drag",
  "timeline-playback",
  "timeline-scrub",
  "viewport-drag",
  "viewport-zoom",
]);

const vaguePipelineReferencePattern =
  /^(?:all|all values|everything|props|runtime|settings|state|values)$/i;

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

function hasPerformanceFixtureValue(
  fixture: ToolcraftPerformanceFixture,
): fixture is ToolcraftPerformanceFixture & { value: unknown } {
  return Object.prototype.hasOwnProperty.call(fixture, "value");
}

function isPerformanceFixtureObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMediaStressFixtureDimensions(
  value: unknown,
): { height: number; width: number } | null {
  if (!isPerformanceFixtureObjectValue(value)) {
    return null;
  }

  const width = Number(value.width);
  const height = Number(value.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { height, width };
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

function getPerformanceFixtureShapeErrors(
  scenarioId: string,
  fieldName: "stressFixture" | "workloadFixture",
  fixture: ToolcraftPerformanceFixture,
  options: {
    requireLargeText?: boolean;
    requireMedia?: boolean;
  } = {},
): string[] {
  const errors: string[] = [];

  if (!performanceFixtureKinds.has(fixture.kind)) {
    errors.push(`${scenarioId} ${fieldName}.kind "${fixture.kind}" is not supported.`);
  }

  if (options.requireMedia) {
    if (fixture.kind !== "media") {
      errors.push(
        `${scenarioId} media-import scenario must use ${fieldName}.kind "media" with a realistic uploaded source size.`,
      );
    }
  }

  if (!fixture.reason.trim()) {
    errors.push(
      `${scenarioId} ${fieldName} must explain why this is the heaviest useful fixture.`,
    );
  }

  if (!hasPerformanceFixtureValue(fixture)) {
    errors.push(
      `${scenarioId} ${fieldName} must include value so browser tests can apply the exact heavy state.`,
    );
  } else if (fixture.kind === "custom") {
    if (!isPerformanceFixtureObjectValue(fixture.value)) {
      errors.push(
        `${scenarioId} custom ${fieldName}.value must be an object with one key per heavy state part so browser tests can apply every key.`,
      );
    } else if (Object.keys(fixture.value).length === 0) {
      errors.push(
        `${scenarioId} custom ${fieldName}.value must include at least one heavy state key.`,
      );
    }
  } else if (fixture.kind === "media") {
    const dimensions = getMediaStressFixtureDimensions(fixture.value);

    if (!dimensions) {
      errors.push(
        `${scenarioId} media ${fieldName}.value must be an object with numeric width and height so browser tests can generate or load a realistic source image.`,
      );
    } else if (
      Math.max(dimensions.width, dimensions.height) < mediaStressMinLongEdge ||
      dimensions.width * dimensions.height < mediaStressMinArea
    ) {
      errors.push(
        `${scenarioId} media ${fieldName}.value must be at least 1920x1080-equivalent; received ${dimensions.width}x${dimensions.height}.`,
      );
    }
  }

  if (!options.requireLargeText && fixture.kind !== "large-text") {
    return errors;
  }

  if (fixture.kind !== "large-text") {
    errors.push(
      `${scenarioId} text workload scenario must use ${fieldName}.kind "large-text" with a real long text value.`,
    );
    return errors;
  }

  if (typeof fixture.value !== "string") {
    errors.push(`${scenarioId} large-text ${fieldName}.value must be a string.`);
    return errors;
  }

  const minChars = fixture.minChars ?? largeTextStressMinChars;
  const minLines = fixture.minLines ?? largeTextStressMinLines;

  if (minChars < largeTextStressMinChars) {
    errors.push(
      `${scenarioId} large-text ${fieldName}.minChars must be >= ${largeTextStressMinChars}.`,
    );
  }

  if (minLines < largeTextStressMinLines) {
    errors.push(
      `${scenarioId} large-text ${fieldName}.minLines must be >= ${largeTextStressMinLines}.`,
    );
  }

  if (fixture.value.length < minChars) {
    errors.push(
      `${scenarioId} large-text ${fieldName}.value must contain at least ${minChars} characters.`,
    );
  }

  if (getTextLineCount(fixture.value) < minLines) {
    errors.push(
      `${scenarioId} large-text ${fieldName}.value must contain at least ${minLines} lines.`,
    );
  }

  return errors;
}

function getStressFixtureErrors(
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): string[] {
  const isMediaImport = scenario.interaction === "media-import";

  if (!scenario.workload && scenario.stress !== true && !scenario.stressFixture && !isMediaImport) {
    return [];
  }

  const fixture = scenario.stressFixture;

  if (!fixture) {
    if (isMediaImport) {
      return [
        `${scenario.id} media-import scenario must declare stressFixture.kind "media" with a realistic uploaded source size.`,
      ];
    }

    return scenario.workload
      ? [
          `${scenario.id} workload scenario must declare stressFixture with the real heaviest value used by browser performance tests.`,
        ]
      : [
          `${scenario.id} stress scenario must declare stressFixture with the real heaviest state used by browser performance tests.`,
        ];
  }

  const errors: string[] = [];

  if (isMediaImport && !scenario.workload) {
    errors.push(
      `${scenario.id} media-import scenario must set workload true because decoded source size changes renderer workload.`,
    );
  }

  errors.push(
    ...getPerformanceFixtureShapeErrors(scenario.id, "stressFixture", fixture, {
      requireLargeText: isLargeTextWorkloadControl(control),
      requireMedia: isMediaImport,
    }),
  );

  return errors;
}

function stressFixtureAlreadyDefinesIndependentWorkload(
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): boolean {
  return (
    scenario.stressFixture?.kind === "large-text" &&
    isLargeTextWorkloadControl(control)
  );
}

function isWorkloadBaselineSensitiveScenario(
  config: ToolcraftPerformanceConfig,
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): boolean {
  if (
    !scenario.workload ||
    (scenario.interaction !== "control-change" && scenario.interaction !== "control-drag")
  ) {
    return false;
  }

  if (!config.usesCustomRenderer) {
    return false;
  }

  if (config.rendererWorkload === "none" || config.rendererWorkload === "simple-composition") {
    return false;
  }

  return !stressFixtureAlreadyDefinesIndependentWorkload(scenario, control);
}

function getWorkloadFixtureErrors(
  config: ToolcraftPerformanceConfig,
  scenario: ToolcraftPerformanceScenario,
  control: ToolcraftControlSchema | undefined,
): string[] {
  const requiresBaseline = isWorkloadBaselineSensitiveScenario(config, scenario, control);
  const errors: string[] = [];

  if (scenario.workloadFixture && !scenario.stressFixture) {
    errors.push(
      `${scenario.id} workloadFixture must be paired with stressFixture so tests apply a heavy baseline and then the measured scenario value.`,
    );
  }

  if (!requiresBaseline && !scenario.workloadFixture) {
    return errors;
  }

  const fixture = scenario.workloadFixture;

  if (!fixture) {
    errors.push(
      `${scenario.id} workload control scenario must declare workloadFixture for the app's heavy baseline state; stressFixture covers the control value only.`,
    );
    return errors;
  }

  errors.push(
    ...getPerformanceFixtureShapeErrors(
      scenario.id,
      "workloadFixture",
      fixture,
    ),
  );

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
    case "mask-drag":
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
    case "timeline-playback":
      return (["maxFrameGapMs", "maxLongTaskMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
    case "timeline-scrub":
      return (["maxInteractionMs", "maxFrameGapMs", "maxLongTaskMs"] as const).filter(
        (field) => !hasPositiveBudgetField(scenario.budget, field),
      );
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
  return (
    interaction === "control-change" ||
    interaction === "control-drag" ||
    interaction === "mask-drag" ||
    interaction === "timeline-playback" ||
    interaction === "timeline-scrub"
  );
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

function hasDetailHeavyCanvas2DRendererLayer(
  technique: ToolcraftRendererTechnique | undefined,
): boolean {
  return (technique?.layers ?? []).some(
    (layer) =>
      layer.renderer === "canvas-2d" &&
      layer.content.some((content) => detailHeavyRendererContent.has(content)),
  );
}

function hasMeasuredGpuAlternativeEvidence(
  technique: ToolcraftRendererTechnique,
): boolean {
  const evidenceText = [
    ...technique.whyNotAlternativeStrategies,
    ...technique.performanceRisks,
  ].join(" ");

  return (
    /\b(?:webgl|webgpu|gpu)\b/i.test(evidenceText) &&
    /\b(?:budget|evidence|frame|long task|measure|measured|perf|performance|stress)\b/i.test(
      evidenceText,
    )
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

  if (
    config.usesCustomRenderer &&
    technique.rendererStrategy === "canvas-2d" &&
    hasDetailHeavyCanvas2DRendererLayer(technique) &&
    !hasMeasuredGpuAlternativeEvidence(technique)
  ) {
    errors.push(
      "Detail-heavy Canvas 2D renderers must evaluate WebGL/WebGPU in rendererTechnique.whyNotAlternativeStrategies or performanceRisks with measured stress evidence before keeping the pixel work on CPU.",
    );
  }

  return errors;
}

function getPassById(
  pipeline: ToolcraftRendererPipeline,
): Map<string, ToolcraftRenderPass> {
  return new Map(pipeline.passes.map((pass) => [pass.id, pass]));
}

function hasPipelineReference(value: string): boolean {
  return value.trim().length > 0 && !vaguePipelineReferencePattern.test(value.trim());
}

function getPipelineReferenceErrors(
  passId: string,
  field: string,
  references: readonly string[] | undefined,
): string[] {
  if (!references || references.length === 0) {
    return [`rendererPipeline pass "${passId}" must list ${field}.`];
  }

  return references.flatMap((reference) =>
    hasPipelineReference(reference)
      ? []
      : [
          `rendererPipeline pass "${passId}" ${field} entry "${reference}" is too vague. Name the concrete runtime target, source key, resource key, or cache key part.`,
        ],
  );
}

function getPipelineInteractionForScenario(
  interaction: ToolcraftPerformanceInteraction,
): ToolcraftPipelineInteraction | null {
  switch (interaction) {
    case "animation-frame":
      return "animation-frame";
    case "animation-viewport-drag":
      return "viewport-drag";
    case "control-change":
      return "control-change";
    case "control-drag":
      return "control-drag";
    case "export-copy":
      return "export";
    case "mask-drag":
      return "mask-drag";
    case "media-import":
      return "media-import";
    case "preview-render":
      return null;
    case "timeline-playback":
      return "timeline-playback";
    case "timeline-scrub":
      return "timeline-scrub";
    case "viewport-zoom-stress":
      return "viewport-zoom";
    case "viewport-stability":
      return null;
  }
}

function getRendererPipelineErrors(
  _schema: ResolvedToolcraftAppSchema,
  config: ToolcraftPerformanceConfig,
): string[] {
  const errors: string[] = [];
  const pipeline = config.rendererPipeline;

  if (config.usesCustomRenderer && !pipeline) {
    return [
      "Custom renderers must declare rendererPipeline so render passes, cache keys, and invalidation are machine-checkable.",
    ];
  }

  if (!config.usesCustomRenderer && pipeline) {
    return ["Non-custom renderer configs must omit rendererPipeline."];
  }

  if (!pipeline) {
    return errors;
  }

  if (pipeline.passes.length === 0) {
    errors.push("rendererPipeline must declare at least one render pass.");
  }

  if (pipeline.interactionInvalidation.length === 0) {
    errors.push(
      "rendererPipeline must declare interactionInvalidation so high-frequency UI work cannot accidentally invalidate expensive passes.",
    );
  }

  const passIds = new Set<string>();

  for (const pass of pipeline.passes) {
    const passId = pass.id.trim();

    if (!passId) {
      errors.push("rendererPipeline passes must have non-empty ids.");
    } else if (passIds.has(passId)) {
      errors.push(`rendererPipeline pass id "${passId}" must be unique.`);
    } else {
      passIds.add(passId);
    }

    if (!renderPassKinds.has(pass.kind)) {
      errors.push(`rendererPipeline pass "${pass.id}" kind "${pass.kind}" is not supported.`);
    }

    if (!renderPassRunLocations.has(pass.runsOn)) {
      errors.push(
        `rendererPipeline pass "${pass.id}" runsOn "${pass.runsOn}" is not supported.`,
      );
    }

    if (!renderPassOutputs.has(pass.output)) {
      errors.push(
        `rendererPipeline pass "${pass.id}" output "${pass.output}" is not supported.`,
      );
    }

    if (!renderPassQualities.has(pass.quality)) {
      errors.push(
        `rendererPipeline pass "${pass.id}" quality "${pass.quality}" is not supported.`,
      );
    }

    errors.push(...getPipelineReferenceErrors(pass.id, "inputs", pass.inputs));
    errors.push(...getPipelineReferenceErrors(pass.id, "invalidatedBy", pass.invalidatedBy));

    if (pass.cacheKey) {
      errors.push(...getPipelineReferenceErrors(pass.id, "cacheKey", pass.cacheKey));
    }

    if (
      cacheRequiredRenderPassKinds.has(pass.kind) &&
      (!pass.cacheKey || pass.cacheKey.length === 0)
    ) {
      errors.push(
        `rendererPipeline pass "${pass.id}" is a cache-sensitive ${pass.kind} pass and must declare cacheKey so tests can reject full recomputation on every control change.`,
      );
    }

    if (pass.kind === "decode") {
      const hasMediaImportScenario = config.scenarios.some(
        (scenario) => scenario.interaction === "media-import",
      );

      if (!hasMediaImportScenario) {
        errors.push(
          `rendererPipeline pass "${pass.id}" decodes media, so performance scenarios must include media-import coverage.`,
        );
      }
    }
  }

  const passesById = getPassById(pipeline);
  const invalidationTargets = new Set<string>();
  const pipelineInteractionSet = new Set(
    pipeline.interactionInvalidation.map((invalidation) => invalidation.interaction),
  );

  for (const invalidation of pipeline.interactionInvalidation) {
    if (!pipelineInteractions.has(invalidation.interaction)) {
      errors.push(
        `rendererPipeline interaction "${invalidation.interaction}" is not supported.`,
      );
    }

    errors.push(
      ...getPipelineReferenceErrors(
        invalidation.interaction,
        "targets",
        invalidation.targets,
      ),
    );

    for (const target of invalidation.targets) {
      if (hasPipelineReference(target)) {
        invalidationTargets.add(target);
      }
    }

    const mustNotInvalidate = new Set(invalidation.mustNotInvalidate ?? []);

    for (const passId of invalidation.invalidates) {
      if (!passId.trim()) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} invalidates contains an empty pass id.`,
        );
        continue;
      }

      const pass = passesById.get(passId);

      if (!pass) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} invalidates unknown pass "${passId}".`,
        );
        continue;
      }

      if (mustNotInvalidate.has(passId)) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} cannot both invalidate and mustNotInvalidate pass "${passId}".`,
        );
      }

      if (
        highFrequencyViewportInteractions.has(invalidation.interaction) &&
        expensiveRenderPassKinds.has(pass.kind)
      ) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} must not invalidate expensive pass "${passId}" (${pass.kind}). Move viewport work to transforms/uniforms or explain it through a cheaper pass.`,
        );
      }
    }

    for (const passId of invalidation.mustNotInvalidate ?? []) {
      if (!passId.trim()) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} mustNotInvalidate contains an empty pass id.`,
        );
      } else if (!passesById.has(passId)) {
        errors.push(
          `rendererPipeline ${invalidation.interaction} mustNotInvalidate unknown pass "${passId}".`,
        );
      }
    }
  }

  for (const scenario of config.scenarios) {
    const pipelineInteraction = getPipelineInteractionForScenario(scenario.interaction);

    if (pipelineInteraction && !pipelineInteractionSet.has(pipelineInteraction)) {
      errors.push(
        `Performance scenario ${scenario.id} exercises ${pipelineInteraction}, so rendererPipeline.interactionInvalidation must declare that interaction.`,
      );
    }
  }

  for (const target of config.workloadTargets) {
    if (!invalidationTargets.has(target)) {
      errors.push(
        `Performance workload target ${target} must appear in rendererPipeline interactionInvalidation targets.`,
      );
    }
  }

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
    config.rendererWorkload === "pixel-output" &&
    !gpuRendererStrategies.has(config.rendererStrategy) &&
    (!config.rendererTechnique || !hasMeasuredGpuAlternativeEvidence(config.rendererTechnique))
  ) {
    errors.push(
      `rendererWorkload "pixel-output" should use rendererStrategy "webgl" or "webgpu", received "${config.rendererStrategy}". Keeping a CPU renderer requires measured WebGL/WebGPU evidence in rendererTechnique.whyNotAlternativeStrategies or performanceRisks.`,
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
