import {
  assessToolcraftRenderPlan,
  defineToolcraftPerformance,
  defineToolcraftSchemaDiscreteFixtureAdapter,
  deriveToolcraftPerformancePaths,
  requireToolcraftSchemaPerformanceValues,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceFixtureAdapter,
  type ToolcraftPerformancePath,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { appRendererPipelineRegistration } from "./app-renderer-pipeline";
import { appSchema } from "./app-schema";
import { frozenSourceImageMaximumEdge } from "./frozen/frozen-image-model";
import { frozenSourceTriangleLimit } from "./frozen/frozen-model";

function numericAdapter(
  dimensionId: string,
): ToolcraftPerformanceFixtureAdapter<number> {
  return {
    apply: (value) => value,
    dimensionId,
    observe: (value) => value,
  };
}

const sourceTriangleEntries = [
  { appliedValue: "small-stl", value: 12 },
  { appliedValue: "maximum-stl", value: frozenSourceTriangleLimit },
] as const;

const sourceTriangleAdapter = {
  apply(value: number) {
    const entry = sourceTriangleEntries.find((candidate) => candidate.value === value);
    if (!entry) throw new Error(`Unsupported source triangle fixture ${value}.`);
    return entry.appliedValue;
  },
  dimensionId: "source-triangles",
  domain: {
    attestation:
      "App-owned browser fixtures generate valid binary STL meshes at the exact declared triangle counts and upload them through source.model.",
    id: "source.model.triangles",
    kind: "external-input",
  },
  entries: sourceTriangleEntries,
  kind: "exhaustive-discrete",
  observe(value: (typeof sourceTriangleEntries)[number]["appliedValue"]) {
    const entry = sourceTriangleEntries.find(
      (candidate) => candidate.appliedValue === value,
    );
    if (!entry) throw new Error(`Unknown source triangle fixture ${value}.`);
    return entry.value;
  },
} as const;

const sourceImageEntries = [
  { appliedValue: "small-source-image", value: 128 * 128 },
  {
    appliedValue: "maximum-source-image",
    value: frozenSourceImageMaximumEdge * frozenSourceImageMaximumEdge,
  },
] as const;

const sourceImageAdapter = {
  apply(value: number) {
    const entry = sourceImageEntries.find((candidate) => candidate.value === value);
    if (!entry) throw new Error(`Unsupported source image fixture ${value}.`);
    return entry.appliedValue;
  },
  dimensionId: "source-image-pixels",
  domain: {
    attestation:
      "App-owned browser fixtures upload exact-size PNG resources through source.image; product preparation bounds the decoded edge at 2,048 pixels.",
    id: "source.image.pixels",
    kind: "external-input",
  },
  entries: sourceImageEntries,
  kind: "exhaustive-discrete",
  observe(value: (typeof sourceImageEntries)[number]["appliedValue"]) {
    const entry = sourceImageEntries.find(
      (candidate) => candidate.appliedValue === value,
    );
    if (!entry) throw new Error(`Unknown source image fixture ${value}.`);
    return entry.value;
  },
} as const;

const scratchTextureEntries = [
  { appliedValue: "small-scratch", value: 128 * 128 },
  { appliedValue: "maximum-scratch", value: 2_048 * 2_048 },
] as const;

const scratchTextureAdapter = {
  apply(value: number) {
    const entry = scratchTextureEntries.find((candidate) => candidate.value === value);
    if (!entry) throw new Error(`Unsupported scratch texture fixture ${value}.`);
    return entry.appliedValue;
  },
  dimensionId: "scratch-texture-pixels",
  domain: {
    attestation:
      "App-owned browser fixtures upload exact-size grayscale PNG resources through source.scratchTexture; product preparation bounds the decoded edge at 2,048 pixels.",
    id: "source.scratchTexture.pixels",
    kind: "external-input",
  },
  entries: scratchTextureEntries,
  kind: "exhaustive-discrete",
  observe(value: (typeof scratchTextureEntries)[number]["appliedValue"]) {
    const entry = scratchTextureEntries.find(
      (candidate) => candidate.appliedValue === value,
    );
    if (!entry) throw new Error(`Unknown scratch texture fixture ${value}.`);
    return entry.value;
  },
} as const;

const exportResolutionEntries = [
  { appliedValue: "2k", value: 2048 },
  { appliedValue: "4k", value: 4096 },
  { appliedValue: "8k", value: 8192 },
] as const;
type ExportResolution =
  (typeof exportResolutionEntries)[number]["appliedValue"];
const exportResolutionValues = requireToolcraftSchemaPerformanceValues(
  appSchema,
  "export.image.resolution",
);
const exportWidthAdapter = defineToolcraftSchemaDiscreteFixtureAdapter(
  appSchema,
  {
    dimensionId: "export-width-px",
    entries: exportResolutionEntries,
    target: "export.image.resolution",
  },
);
const defaultExportWidth = exportWidthAdapter.observe(
  exportResolutionValues.default as ExportResolution,
);
const maximumExportWidth = exportWidthAdapter.observe(
  exportResolutionValues.max as ExportResolution,
);

const crystalValues = requireToolcraftSchemaPerformanceValues(
  appSchema,
  "ice.crystalDensity",
);
const icicleValues = requireToolcraftSchemaPerformanceValues(
  appSchema,
  "ice.icicleDensity",
);
const transmissionValues = requireToolcraftSchemaPerformanceValues(
  appSchema,
  "ice.transmission",
);
const modelTriangleBudgetValues = requireToolcraftSchemaPerformanceValues(
  appSchema,
  "source.modelTriangleBudget",
);
const renderScaleValues = requireToolcraftSchemaPerformanceValues(
  appSchema,
  "canvas.renderScale",
);
const crystalAdapter = numericAdapter("surface-crystal-coverage");
const icicleAdapter = numericAdapter("icicle-coverage");

const performanceModel = defineToolcraftPerformance({
  fixtureAdapters: {
    dimensions: {
      "surface-crystal-coverage": crystalAdapter,
      "export-width-px": exportWidthAdapter,
      "icicle-coverage": icicleAdapter,
      "model-render-triangles": numericAdapter("model-render-triangles"),
      "physical-transmission": numericAdapter("physical-transmission"),
      "preview-render-scale": numericAdapter("preview-render-scale"),
      "scratch-texture-pixels": scratchTextureAdapter,
      "source-image-pixels": sourceImageAdapter,
      "source-triangles": sourceTriangleAdapter,
    },
  },
  kernelBenchmarkDecisions: [
    {
      candidates: ["webgl"],
      decision:
        "Keep camera-only orbit rendering on the retained WebGL scene so the shared pose updates uniforms without rebuilding source geometry or sampled ice resources.",
      id: "camera-render",
      selected: "webgl",
    },
    {
      candidates: ["webgl"],
      decision:
        "Keep preview updates on WebGL because the retained thaw scene depth-tests the source mesh and thousands of crystal and icicle instances during continuous parameter drag and bounded thermal cooling frames at the assessed maximum workload; image-card wall icicles use fixed-cost per-vertex gravity bending inside the same instanced draw.",
      id: "preview-render",
      selected: "webgl",
    },
  ],
  rendererPipeline: appRendererPipelineRegistration,
  rendererStrategy: "webgl",
  rendererTechnique: {
    exportRenderer: "webgl",
    fidelityRisks: [
      "WebGL uses a physically shaded, texture-displaced shell instead of Blender OpenVDB remeshing.",
      "GLB/glTF source materials and packaged OBJ MTL textures are preserved, while OBJ and STL without usable materials use neutral fallback PBR material.",
      "Triplanar scratch sampling avoids missing UVs but cannot reproduce a deliberately authored UV seam layout.",
    ],
    intentionalRasterizationReason:
      "The product is an interactive lit 3D scene delivered as PNG or JPG pixels.",
    layers: [
      {
        content: ["composite"],
        exportMode: "included",
        id: "sceneBackground",
        kind: "background",
        primitiveCount: "low",
        renderer: "webgl",
        uiSelector: '[data-slot="frozen-webgl-canvas"]',
      },
      {
        content: ["geometry", "shader"],
        exportMode: "included",
        id: "sourceModel",
        intentionalRasterizationReason:
          "The uploaded arbitrary triangle mesh requires perspective projection, material shading, and depth testing with generated ice.",
        kind: "product-foreground",
        primitiveCount: "medium",
        renderer: "webgl",
        uiSelector: '[data-slot="frozen-webgl-canvas"]',
      },
      {
        content: ["dense-pattern", "geometry", "noise", "shader"],
        exportMode: "included",
        id: "generatedIce",
        kind: "product-foreground",
        primitiveCount: "high",
        renderer: "webgl",
        uiSelector: '[data-slot="frozen-webgl-canvas"]',
      },
      {
        content: ["handles"],
        exportMode: "excluded",
        id: "meltBrushCursor",
        kind: "editing-handles",
        primitiveCount: "low",
        renderer: "dom",
        uiSelector: '[data-slot="frozen-melt-brush-cursor"]',
      },
      {
        content: ["composite", "geometry", "noise", "shader"],
        exportMode: "composited",
        id: "imageExportComposite",
        kind: "export-composite",
        primitiveCount: "high",
        renderer: "webgl",
      },
    ],
    performanceRisks: [
      "Maximum rendered source topology, x2 backing scale, physical transmission, and instancing combine during orbit and slider drag.",
      "ZIP extraction and optional mesh simplification add one source-bound preprocessing pass before retained rendering.",
      "A maximum 2,048-square scratch upload requires one bounded luminance conversion before its retained GPU upload.",
      "A maximum 2,048-square source image requires one bounded color decode before constant-detail rounded-rectangle geometry is prepared.",
      "A fixed 48-cubed thermal field uploads at a coalesced cadence during mask drag and while positive refreeze remains active.",
      "2K export uses tiled WebGL rendering and a full-size 2D delivery surface.",
    ],
    previewRenderer: "webgl",
    productRepresentation: "mixed",
    rendererStrategy: "webgl",
    sourceRepresentation: "mixed",
    whyNotAlternativeStrategies: [
      "DOM and SVG do not provide depth-tested arbitrary mesh rendering.",
      "Canvas 2D cannot preserve perspective, surface normals, source materials, and thousands of depth-tested instances at full quality.",
      "WebGPU would simplify compute-heavy remeshing but is not required for the bounded retained geometry used here.",
    ],
  },
  scenarios: [],
  usesCustomRenderer: true,
  workloadEnvelope: {
    dimensions: [
      {
        batchMax: frozenSourceTriangleLimit,
        defaultValue: sourceTriangleEntries[0].value,
        id: "source-triangles",
        interactiveMax: frozenSourceTriangleLimit,
        mapping: "direct",
        source: { id: "source.model.triangles", kind: "external-input" },
        unit: "source-triangles",
      },
      {
        batchMax: Number(modelTriangleBudgetValues.max),
        defaultValue: Number(modelTriangleBudgetValues.default),
        id: "model-render-triangles",
        interactiveMax: Number(modelTriangleBudgetValues.max),
        mapping: "direct",
        source: {
          kind: "schema-target",
          target: "source.modelTriangleBudget",
          workloadBoundary: "maximum",
        },
        unit: "rendered-triangles",
      },
      {
        batchMax: scratchTextureEntries[1].value,
        defaultValue: scratchTextureEntries[0].value,
        id: "scratch-texture-pixels",
        interactiveMax: scratchTextureEntries[1].value,
        mapping: "area",
        source: {
          id: "source.scratchTexture.pixels",
          kind: "external-input",
        },
        unit: "decoded-pixels",
      },
      {
        batchMax: sourceImageEntries[1].value,
        defaultValue: sourceImageEntries[0].value,
        id: "source-image-pixels",
        interactiveMax: sourceImageEntries[1].value,
        mapping: "area",
        source: {
          id: "source.image.pixels",
          kind: "external-input",
        },
        unit: "decoded-pixels",
      },
      {
        batchMax: Number(crystalValues.max),
        defaultValue: Number(crystalValues.default),
        id: "surface-crystal-coverage",
        interactiveMax: Number(crystalValues.max),
        mapping: "direct",
        source: {
          kind: "schema-target",
          target: "ice.crystalDensity",
          workloadBoundary: "maximum",
        },
        unit: "percent",
      },
      {
        batchMax: Number(icicleValues.max),
        defaultValue: Number(icicleValues.default),
        id: "icicle-coverage",
        interactiveMax: Number(icicleValues.max),
        mapping: "direct",
        source: {
          kind: "schema-target",
          target: "ice.icicleDensity",
          workloadBoundary: "maximum",
        },
        unit: "percent",
      },
      {
        batchMax: Number(transmissionValues.max),
        defaultValue: Number(transmissionValues.default),
        id: "physical-transmission",
        interactiveMax: Number(transmissionValues.max),
        mapping: "direct",
        source: {
          kind: "schema-target",
          target: "ice.transmission",
          workloadBoundary: "maximum",
        },
        unit: "percent",
      },
      {
        batchMax: Number(renderScaleValues.max),
        defaultValue: Number(renderScaleValues.default),
        id: "preview-render-scale",
        interactiveMax: Number(renderScaleValues.max),
        mapping: "quadratic",
        source: {
          kind: "runtime-state",
          path: "canvas.renderScale",
        },
        unit: "backing-scale",
      },
      {
        batchMax: maximumExportWidth,
        defaultValue: defaultExportWidth,
        id: "export-width-px",
        mapping: "quadratic",
        source: {
          kind: "schema-target",
          target: "export.image.resolution",
        },
        unit: "output-width-px",
      },
    ],
  },
} satisfies ToolcraftEnvelopePerformanceConfig);

export const appRenderPlanAssessment = assessToolcraftRenderPlan(
  appSchema,
  performanceModel,
);
export const appPerformancePaths = deriveToolcraftPerformancePaths(
  appSchema,
  performanceModel,
);

function requirePerformancePath(
  interaction: ToolcraftPerformancePath["interaction"],
  target?: string,
): ToolcraftPerformancePath {
  const path = appPerformancePaths.find(
    (candidate) =>
      candidate.interaction === interaction &&
      (target === undefined || candidate.targets.includes(target)),
  );
  if (!path) {
    throw new Error(
      `Missing derived ${interaction}${target ? ` target ${target}` : ""} performance path.`,
    );
  }
  return path;
}

function coverPath(path: ToolcraftPerformancePath) {
  return { coversTargets: path.targets, pathId: path.id } as const;
}

const exportPath = requirePerformancePath("export");
const mediaImportPath = requirePerformancePath("media-import", "source.model");
const imageImportPath = requirePerformancePath("media-import", "source.image");
const scratchImportPath = requirePerformancePath(
  "media-import",
  "source.scratchTexture",
);
const controlDragPath = requirePerformancePath("control-drag", "effect.progress");
const maskDragPath = requirePerformancePath(
  "mask-drag",
  "melt.temperatureField",
);
const thermalAnimationPath = requirePerformancePath(
  "animation-frame",
  "melt.temperatureField",
);
const imageGeometryPath = requirePerformancePath(
  "control-drag",
  "source.imageThickness",
);
const modelGeometryPath = requirePerformancePath(
  "control-drag",
  "source.modelTriangleBudget",
);
const orientationPath = requirePerformancePath("viewport-drag", "scene.orientation");
const canvasPanPath = requirePerformancePath(
  "viewport-drag",
  "canvas.viewport.offset",
);
const canvasZoomPath = requirePerformancePath("viewport-zoom");
const previewChangePath = requirePerformancePath(
  "control-change",
  "export.includeBackground",
);
const exportOptionPath = requirePerformancePath(
  "control-change",
  "export.image.format",
);

const scenarios = [
  {
    automated: true,
    automatedTestName: "perf: frozen scratch import completes within budget",
    browser: true,
    browserTestName: "browser perf: frozen scratch import completes within budget",
    controlLabel: "Scratch map",
    ...coverPath(scratchImportPath),
    expectedObservable:
      "Import decodes bounded luminance once and binds the retained triplanar texture.",
    fixture: "compiled grayscale PNG fixture",
    id: "frozen-scratch-import",
    interaction: "media-import",
    target: "source.scratchTexture",
  },
  {
    automated: true,
    automatedTestName: "perf: frozen model import completes within budget",
    browser: true,
    browserTestName: "browser perf: frozen model import completes within budget",
    controlLabel: "Model package",
    ...coverPath(mediaImportPath),
    expectedObservable: "Import prepares source bounds and deterministic surface samples once.",
    fixture: "compiled generated OBJ fixture",
    id: "frozen-model-import",
    interaction: "media-import",
    target: "source.model",
  },
  {
    automated: true,
    automatedTestName: "perf: model mesh budget drag stays responsive",
    browser: true,
    browserTestName: "browser perf: model mesh budget drag stays responsive",
    controlLabel: "Mesh budget",
    ...coverPath(modelGeometryPath),
    expectedObservable:
      "Dragging Mesh budget rebuilds the source once and changes the retained rendered triangle count.",
    fixture: "compiled textured static model fixture",
    id: "frozen-model-budget-drag",
    interaction: "control-drag",
    target: "source.modelTriangleBudget",
  },
  {
    automated: true,
    automatedTestName: "perf: frozen image source import completes within budget",
    browser: true,
    browserTestName:
      "browser perf: frozen image source import completes within budget",
    controlLabel: "Image",
    ...coverPath(imageImportPath),
    expectedObservable:
      "Import decodes a bounded color texture and prepares a textured volumetric slab.",
    fixture: "compiled exact-size PNG source fixture",
    id: "frozen-image-source-import",
    interaction: "media-import",
    target: "source.image",
  },
  {
    automated: true,
    automatedTestName: "perf: thaw progress drag stays responsive",
    browser: true,
    browserTestName: "browser perf: thaw progress drag stays responsive",
    controlLabel: "Progress",
    ...coverPath(controlDragPath),
    expectedObservable: "Dragging Progress updates the stable thaw boundary during the gesture.",
    fixture: "compiled maximum preview fixture",
    id: "frozen-progress-drag",
    interaction: "control-drag",
    target: "effect.progress",
  },
  {
    automated: true,
    automatedTestName: "perf: geometry melt brush drag stays responsive",
    browser: true,
    browserTestName: "browser perf: geometry melt brush drag stays responsive",
    ...coverPath(maskDragPath),
    expectedObservable:
      "A captured direct or brush-fringe geometry drag deposits a continuous thermal trail without rebuilding source resources.",
    fixture:
      "compiled maximum preview fixture with persistent thermal paint and cached projected source triangles",
    id: "frozen-melt-mask-drag",
    interaction: "mask-drag",
    target: "melt.temperatureField",
    uiSelector: '[data-slot="frozen-webgl-canvas"]',
  },
  {
    automated: true,
    automatedTestName: "perf: thermal refreeze frame stays responsive",
    browser: true,
    browserTestName: "browser perf: thermal refreeze frame stays responsive",
    ...coverPath(thermalAnimationPath),
    expectedObservable:
      "A bounded cooling step reduces the live temperature field and redraws retained WebGL resources.",
    fixture: "compiled maximum preview fixture with active thermal cooling",
    id: "frozen-melt-refreeze-frame",
    interaction: "animation-frame",
    target: "melt.temperatureField",
  },
  {
    automated: true,
    automatedTestName: "perf: image slab geometry drag stays responsive",
    browser: true,
    browserTestName:
      "browser perf: image slab geometry drag stays responsive",
    controlLabel: "Thickness",
    ...coverPath(imageGeometryPath),
    expectedObservable:
      "Dragging an image geometry control rebuilds the constant-detail rounded extrusion without decoding the image again.",
    fixture: "uploaded small PNG image slab fixture",
    id: "frozen-image-geometry-drag",
    interaction: "control-drag",
    target: "source.imageThickness",
  },
  {
    automated: true,
    automatedTestName: "perf: direct model orbit stays responsive",
    browser: true,
    browserTestName: "browser perf: direct model orbit stays responsive",
    ...coverPath(orientationPath),
    expectedObservable: "A direct model drag changes the shared camera pose and rendered frame.",
    fixture: "compiled maximum preview fixture with asymmetric OBJ",
    id: "frozen-model-orbit",
    interaction: "viewport-drag",
    target: "scene.orientation",
  },
  {
    automated: true,
    automatedTestName: "perf: frozen canvas pan stays responsive",
    browser: true,
    browserTestName: "browser perf: frozen canvas pan stays responsive",
    ...coverPath(canvasPanPath),
    expectedObservable: "Dragging outside the model changes viewport offset without rerendering ice.",
    fixture: "uploaded small OBJ with canvas margin",
    id: "frozen-canvas-pan",
    interaction: "viewport-drag",
    target: "canvas.viewport.offset",
  },
  {
    automated: true,
    automatedTestName: "perf: frozen canvas zoom stays responsive",
    browser: true,
    browserTestName: "browser perf: frozen canvas zoom stays responsive",
    ...coverPath(canvasZoomPath),
    expectedObservable: "Toolbar zoom changes the viewport without changing output dimensions.",
    fixture: "uploaded small OBJ viewport fixture",
    id: "frozen-canvas-zoom",
    interaction: "viewport-zoom",
    target: "canvas.viewport.zoom",
  },
  {
    automated: true,
    automatedTestName: "perf: frozen preview option changes stay responsive",
    browser: true,
    browserTestName: "browser perf: frozen preview option changes stay responsive",
    controlLabel: "Include",
    ...coverPath(previewChangePath),
    expectedObservable: "Changing background inclusion updates the retained WebGL frame.",
    fixture: "uploaded small OBJ preview fixture",
    id: "frozen-preview-option",
    interaction: "control-change",
    target: "export.includeBackground",
  },
  {
    automated: true,
    automatedTestName: "perf: frozen export option changes stay responsive",
    browser: true,
    browserTestName: "browser perf: frozen export option changes stay responsive",
    controlLabel: "Format",
    ...coverPath(exportOptionPath),
    expectedObservable: "Changing image format does not invalidate WebGL preview resources.",
    fixture: "image export option fixture",
    id: "frozen-export-option",
    interaction: "control-change",
    target: "export.image.format",
  },
  {
    actionValue: "export.png",
    automated: true,
    automatedTestName: "perf: frozen image export completes within budget",
    browser: true,
    browserTestName: "browser perf: frozen image export completes within budget",
    completionEvidence: "download",
    controlLabel: "Export PNG",
    ...coverPath(exportPath),
    expectedObservable: "Maximum image export downloads and decodes at selected dimensions.",
    fixture: "compiled maximum export fixture",
    id: "frozen-image-export",
    interaction: "export",
    target: "export.image.resolution",
  },
] satisfies readonly ToolcraftPerformanceScenario[];

export const appPerformance = defineToolcraftPerformance({
  ...performanceModel,
  scenarios,
});
