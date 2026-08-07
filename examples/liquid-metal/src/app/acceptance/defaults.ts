import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftReferenceFeatureInventoryItem,
  ToolcraftTransferMode,
} from "./types";

const automatedControlsTest =
  "liquid metal product acceptance covers reference controls";
const automatedRuntimeTest =
  "liquid metal product acceptance covers runtime behavior";
const automatedExportTest =
  "liquid metal product acceptance covers image and video export";
const automatedEnvironmentTest =
  "liquid metal environment maps runtime values and HDRI source";
const automatedModelScaleTest =
  "liquid metal model scale maps normalized geometry";
const automatedStickerTest =
  "liquid metal stickers map ordered media to physical surface decals";
const automatedStickerWrapTest =
  "unfolds a 90-degree connected face with continuous non-degenerate UVs";
const automatedScratchTest =
  "liquid metal scratches map grayscale height to triplanar physical normals";
const controlsBrowserTest =
  "browser: Paper controls and presets change Liquid Metal 3D output";
const modelBrowserTest =
  "browser: model upload clear and reset update Liquid Metal 3D output";
const runtimeBrowserTest =
  "browser: canvas timeline toolbar and orbit control Liquid Metal 3D output";
const modelOrbitBrowserTest =
  "browser: model hover orbit and empty canvas pan follow ASCII interaction";
const exportBrowserTest =
  "browser: Liquid Metal 3D exports image video and background outputs";
const environmentBrowserTest =
  "browser: environment presets controls and HDRI update Liquid Metal reflections";
const modelScaleBrowserTest =
  "browser: model scale changes object bounds without changing shader phase";
const stickerBrowserTest =
  "browser: PNG stickers conform stack and drag across the lit 3D model";
const stickerWrapBrowserTest =
  "browser: PNG sticker wraps continuously across a connected hard edge";
const scratchBrowserTest =
  "browser: scratch mask adds triplanar normal depth to Liquid Metal";
const defaultSceneBrowserTest =
  "browser: authored Liquid Metal scene is preloaded and resettable";
const automatedDefaultSceneTest =
  "liquid metal default scene preloads authored model scratches and stickers";

const loopDuration = {
  evidence:
    "Paper's fragment shader advances the dominant stripe phase as t = 0.3 * u_time, so one forward stripe translation at speed 1 is 1 / 0.3 seconds.",
  seconds: 10 / 3,
  source: "product-derived" as const,
};

const referenceFeatureInventory: readonly ToolcraftReferenceFeatureInventoryItem[] =
  [
    {
      acceptanceId: "canvas.aspectRatio",
      behaviorEvidence:
        "The live Paper page renders Liquid Metal inside a responsive canvas; Toolcraft makes the output size editable.",
      featureName: "Responsive canvas sizing",
      id: "reference.canvas-sizing",
      referenceBehavior: "Paper sizes the shader to the host canvas.",
      sourceEvidence:
        "ShaderMount observes its parent size and the docs example passes width=1280 and height=720.",
      status: "toolcraft-native",
      toolcraftMapping:
        "Editable-output Setup owns aspect ratio, width, height, and render scale while Paper and Three follow the resulting backing size.",
    },
    {
      acceptanceId: "view.orbit",
      behaviorEvidence:
        "The supplied element was traced to the runnable local ascii-tool implementation, where the 70px six-axis Canvas2D handle provides hover, 600ms click snap, direct endpoint drag, a stable signed endpoint at the sphere boundary, stable backing, merged history, reset, and export exclusion.",
      featureName: "Six-axis camera orientation gizmo",
      id: "reference.orientation-gizmo",
      referenceBehavior:
        "A fixed lower-left orientation sphere projects ±X/±Y/±Z, snaps on click, and keeps a grabbed endpoint directly under the pointer while preserving camera radius and endpoint hemisphere.",
      sourceEvidence:
        "Supplied CleanShot plus the updated ascii-tool orientation-gizmo-control.tsx, orbit-camera.ts/tests, Playwright acceptance, boundary-stability plan, and worklog iterations 6-12.",
      status: "ported",
      toolcraftMapping:
        "The exact viewport handle and plain-left drag over raycast model geometry write schema-backed view.orbit; an empty-canvas left drag remains Toolcraft pan, middle drag is inert, and preview, sticker raycasting, reset/history, PNG, and video consume the same camera position/up pose.",
    },
    {
      acceptanceId: "renderer.orbit",
      behaviorEvidence:
        "The local ASCII interaction contract assigns plain-left drag over the 3D surface to camera orbit, empty-canvas left drag to Toolcraft pan, modifier-left to Toolcraft pan, and middle drag to no camera rotation.",
      featureName: "Hit-aware viewport gesture routing",
      id: "reference.model-hover-orbit",
      referenceBehavior:
        "The gesture owner is selected from the pointer-down location: model surface orbits, empty canvas pans, and middle drag is inert.",
      sourceEvidence:
        "ascii-tool effects-canvas.tsx pointer ownership plus orientation-gizmo-parity.md interaction mapping and worklog iteration 6.",
      status: "ported",
      toolcraftMapping:
        "Liquid Metal raycasts the base model after sticker picking; a plain-left model hit claims the gesture and writes view.orbit, while a miss bubbles to the runtime CanvasShell pan handler.",
    },
    {
      acceptanceId: "shader.repetition",
      behaviorEvidence:
        "Changing Repetition on the live reference changes the density of moving metal stripes.",
      featureName: "Reference control mapping",
      id: "reference.control-mapping",
      referenceBehavior:
        "Paper exposes colorBack, colorTint, repetition, softness, RGB shifts, distortion, contour, angle, speed, scale, rotation, offsets, and fit.",
      sourceEvidence:
        "Paper docs Liquid Metal page and packages/shaders-react/src/shaders/liquid-metal.tsx at commit e77c99e.",
      status: "ported",
      toolcraftMapping:
        "Built-in Toolcraft controls write the same Paper props/uniforms; Offset combines offsetX/offsetY in the built-in Vector owner.",
    },
    {
      acceptanceId: "renderer.output",
      behaviorEvidence:
        "The live page runs the official shader continuously; the npm component produces the same canvas output from deterministic frame values.",
      featureName: "Official Liquid Metal renderer state",
      id: "reference.renderer-state",
      referenceBehavior:
        "Paper owns WebGL program, uniforms, procedural time, and exact fragment output.",
      sourceEvidence:
        "@paper-design/shaders-react@0.0.77 LiquidMetal delegates to liquidMetalFragmentShader from @paper-design/shaders@0.0.77.",
      status: "ported",
      toolcraftMapping:
        "Paper's official stripe, noise, dispersion, contour, softness, tint, and time core executes directly on real Three.js model fragments; only its 2D image/shape coordinate source is adapted to the mesh surface.",
    },
    {
      acceptanceId: "media.model",
      behaviorEvidence:
        "Paper accepts an uploaded transparent image as its effect mask; the user explicitly requested a 3D object instead.",
      featureName: "Uploaded effect mask",
      id: "reference.upload-mask",
      referenceBehavior: "Upload image replaces the predefined shape mask.",
      sourceEvidence:
        "The live page Upload image button and LiquidMetal image prop processing path.",
      status: "intentionally-changed",
      toolcraftMapping:
        "Built-in fileDrop imports GLB/GLTF/OBJ/STL and mesh rasterization replaces the 2D image mask.",
      userApprovedChangeReason:
        "The user explicitly requested loading a 3D object and applying Liquid Metal to that model.",
    },
    {
      acceptanceId: "renderer.output",
      behaviorEvidence:
        "Paper predefined shapes are alternative masks only when no image is supplied.",
      featureName: "Predefined shape mask",
      id: "reference.shape-mask",
      referenceBehavior:
        "Shape selects none, circle, daisy, diamond, or metaballs.",
      sourceEvidence:
        "LiquidMetalShapes and the live page Shape select; the reference disables Shape after image upload.",
      status: "intentionally-changed",
      toolcraftMapping:
        "The 3D mesh defines the shaded surface; no second 2D mask or CanvasTexture is used, so the procedural field executes across every visible fragment.",
      userApprovedChangeReason:
        "The requested 3D model replaces Paper's 2D shape/image source; a second 2D shape would stop the effect covering the model.",
    },
    {
      acceptanceId: "shader.preset",
      behaviorEvidence:
        "Clicking Noir on the live page changed all visible values to the Noir bundle.",
      featureName: "Four Paper presets",
      id: "reference.presets",
      referenceBehavior:
        "Default, Noir, Backdrop, and Stripes batch-apply Paper parameters.",
      sourceEvidence:
        "liquidMetalPresets in @paper-design/shaders-react@0.0.77 and live preset buttons.",
      status: "ported",
      toolcraftMapping:
        "Toolcraft Actions dispatch the exact preset values except the intentionally replaced 2D shape field.",
    },
    {
      acceptanceId: "shader.colorBack",
      behaviorEvidence:
        "The live reference updates its metal base/background color immediately.",
      featureName: "Paper colors",
      id: "reference.colors",
      referenceBehavior:
        "colorBack and colorTint drive base and color-burn tint.",
      sourceEvidence: "LiquidMetal uniforms u_colorBack and u_colorTint.",
      status: "ported",
      toolcraftMapping:
        "Metal Color controls pass exact color strings to the direct Liquid Metal surface uniforms.",
    },
    {
      acceptanceId: "shader.repetition",
      behaviorEvidence:
        "Live sliders update the visible stripe edge, dispersion, noise, and contour.",
      featureName: "Paper pattern parameters",
      id: "reference.pattern",
      referenceBehavior:
        "repetition, softness, shiftRed, shiftBlue, distortion, contour, and angle change the shader field.",
      sourceEvidence: "Liquid Metal docs prop table and GLSL uniforms.",
      status: "ported",
      toolcraftMapping:
        "Metal Pattern sliders update matching direct fragment uniforms one-to-one.",
    },
    {
      acceptanceId: "shader.offset",
      behaviorEvidence:
        "Live controls move, scale, rotate, fit, and animate the shader field.",
      featureName: "Paper common projection parameters",
      id: "reference.projection",
      referenceBehavior:
        "speed, scale, rotation, offsetX, offsetY, and fit control the field.",
      sourceEvidence:
        "Paper common props plus the Liquid Metal page Leva controls.",
      status: "ported",
      toolcraftMapping:
        "Projection controls transform the non-tiled Paper field that drives physical conductor color, micro-roughness, and rippled PBR normals plus deterministic fragment time.",
    },
    {
      acceptanceId: "timeline.playback",
      behaviorEvidence:
        "Paper speed advances shader time forward; Toolcraft adds explicit transport for export.",
      featureName: "Playback",
      id: "reference.timeline.playback",
      referenceBehavior: "The reference runs forward when speed is non-zero.",
      sourceEvidence:
        "ShaderMount speed/frame behavior and LiquidMetal default speed=1.",
      status: "toolcraft-native",
      toolcraftMapping: "Top timeline play/pause owns frame progress.",
    },
    {
      acceptanceId: "timeline.scrub",
      behaviorEvidence:
        "Paper frame provides a deterministic animation starting point.",
      featureName: "Scrub",
      id: "reference.timeline.scrub",
      referenceBehavior:
        "frame deterministically selects shader time when speed=0.",
      sourceEvidence:
        "ShaderMount.setFrame and Paper Common Props documentation.",
      status: "toolcraft-native",
      toolcraftMapping: "Timeline scrub sets Paper frame milliseconds.",
    },
    {
      acceptanceId: "timeline.duration",
      behaviorEvidence:
        "Paper exposes rate rather than a transport duration; video output needs a finite range.",
      featureName: "Duration",
      id: "reference.timeline.duration",
      referenceBehavior: "Reference motion is continuous.",
      sourceEvidence: "LiquidMetal speed/frame common props.",
      status: "toolcraft-native",
      toolcraftMapping:
        "Toolcraft duration defines the recorded/playback range without changing shader controls.",
    },
    {
      acceptanceId: "timeline.loop",
      behaviorEvidence:
        "Paper advances stripe phase forward; Toolcraft owns the explicit repeat boundary.",
      featureName: "Loop",
      id: "reference.timeline.loop",
      referenceBehavior: "Continuous forward shader motion.",
      sourceEvidence:
        "direction -= t and fract(direction) in liquidMetalFragmentShader.",
      status: "toolcraft-native",
      toolcraftMapping:
        "Timeline repeats the product-derived stripe translation duration forward-only.",
    },
    {
      acceptanceId: "timeline.time-progress",
      behaviorEvidence: "Paper maps elapsed milliseconds into u_time.",
      featureName: "Time progress",
      id: "reference.timeline.time-progress",
      referenceBehavior:
        "ShaderMount increments frame by delta time times speed.",
      sourceEvidence: "ShaderMount render loop and u_time assignment.",
      status: "ported",
      toolcraftMapping:
        "Renderer maps timeline currentTimeSeconds to Paper frame milliseconds times speed.",
    },
    {
      acceptanceId: "timeline.export-at-time",
      behaviorEvidence:
        "Paper frame is deterministic and can reproduce the visible shader instant.",
      featureName: "Export at time",
      id: "reference.timeline.export-at-time",
      referenceBehavior:
        "frame fully defines a static shader state when speed=0.",
      sourceEvidence: "Paper Common Props frame documentation.",
      status: "toolcraft-native",
      toolcraftMapping:
        "PNG exports current timeline time and video encodes the full timeline duration.",
    },
  ];

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    loopDuration,
    mode: "timeline-playback",
  },
  behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
  mode: "reference-runtime-clone",
  referenceFeatureInventory,
  referenceName:
    "Paper Design Liquid Metal 0.0.77 + ASCII Tool orientation gizmo",
  referenceStudy: {
    behaviorEvidence:
      "Opened the Paper live page, captured the Default render and controls, and verified Noir; also inspected and ran the local ascii-tool orientation control and main-canvas gesture through source, tests, browser evidence, and recorded interaction iterations.",
    referenceLocation:
      "https://shaders.paper.design/liquid-metal; /Users/kusnizza/Projects/toolkit-tests/ascii-tool; supplied CleanShot 2026-07-13 at 10.53.19@2x.png",
    reproductionSteps:
      "Open the Paper live page, observe the animated Default diamond and controls, click Noir, and compare against liquidMetalPresets; then run ascii-tool, hover/click/drag its lower-left orientation gizmo, left-drag the 3D surface, pan from empty canvas, verify middle drag is inert, zoom the viewport, reset the Model Size section, and export PNG while inspecting view.orbit.",
    sourceEvidence:
      "paper-design/shaders commit e77c99ede9be8f4842c6bac22ca24902dc41334d plus npm packages 0.0.77; local ascii-tool effects-canvas.tsx, orientation-gizmo-control.tsx, orbit-camera.ts/tests, Playwright acceptance, orientation-gizmo-parity plan, and worklog iterations 6-10.",
    status: "ran-original",
  },
  referenceTimeline: {
    behaviorCoverage: [
      "playback",
      "scrub",
      "duration",
      "loop",
      "time-progress",
      "export-at-time",
    ],
    loopDuration,
    mode: "toolcraft-playback",
  },
  sourceOfTruth: "reference-runtime",
};

export const appProductReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "Liquid Metal 3D",
  productSummary:
    "Loads and orients a 3D model, applies Paper Design Liquid Metal with UV-free scratch depth, and adds ordered draggable, scalable, rotatable PNG decals constrained to connected surface islands with shared PBR environment and PNG/video export.",
  requestedBehavior:
    "Start every clean load from the authored A.obj scene with its Liquid Metal values, grayscale scratch mask, and ten editable preloaded PNG stickers; Reset restores that scene. Keep upload, removal, sticker editing, HDRI lighting, export, and the local ASCII Tool orientation behavior: six-axis snap/direct drag plus hit-aware left-drag model orbit, empty-canvas pan, inert middle drag, shared history, preview, and export state.",
};

function controlEntry(
  entry: Omit<
    ToolcraftComponentAcceptance,
    "automated" | "automatedTestName" | "browser" | "browserTestName" | "kind"
  > & {
    automatedTestName?: string;
    browserTestName?: string;
    kind?: ToolcraftComponentAcceptance["kind"];
  },
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: entry.automatedTestName ?? automatedControlsTest,
    browser: true,
    browserTestName: entry.browserTestName ?? controlsBrowserTest,
    kind: entry.kind ?? "control",
    ...entry,
  };
}

const setupEntries: readonly ToolcraftComponentAcceptance[] = [
  controlEntry({
    componentType: "settingsTransfer",
    evidence: "exported-bytes",
    expectedObservable:
      "Export Settings downloads app-scoped Liquid Metal values and Import Settings restores them.",
    fixture: "edited Liquid Metal settings transfer fixture",
    id: "runtime.settingsTransfer",
    target: "runtime.settingsTransfer",
    userAction:
      "Edit Repetition, export settings, import them, and verify output is restored.",
    browserTestName: runtimeBrowserTest,
  }),
  controlEntry({
    componentType: "aspectRatio",
    evidence: "rendered-pixels",
    expectedObservable:
      "Changing Aspect ratio resizes Paper and Three output while preserving the loaded model.",
    fixture: "16:9 to square model canvas",
    id: "canvas.aspectRatio",
    referenceCoverage: "canvas-sizing",
    target: "canvas.aspectRatio",
    userAction:
      "Choose a square Aspect ratio and observe the model projection resize.",
    browserTestName: runtimeBrowserTest,
  }),
  controlEntry({
    componentType: "text",
    evidence: "rendered-pixels",
    expectedObservable: "Editing Canvas width changes product output width.",
    fixture: "editable width",
    id: "canvas.size.width",
    target: "canvas.size.width",
    userAction: "Edit and commit Canvas width.",
    browserTestName: runtimeBrowserTest,
  }),
  controlEntry({
    componentType: "text",
    evidence: "rendered-pixels",
    expectedObservable: "Editing Canvas height changes product output height.",
    fixture: "editable height",
    id: "canvas.size.height",
    target: "canvas.size.height",
    userAction: "Edit and commit Canvas height.",
    browserTestName: runtimeBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Resolution scale changes WebGL backing pixels without changing CSS output size.",
    fixture: "1x and 2x backing size",
    id: "canvas.renderScale",
    target: "canvas.renderScale",
    userAction:
      "Drag Resolution scale and inspect the product canvas backing dimensions.",
    browserTestName: runtimeBrowserTest,
  }),
  controlEntry({
    componentType: "switch",
    evidence: "timeline-output",
    expectedObservable:
      "Timeline switch changes compact versus extended transport without changing playback state or shader values.",
    fixture: "compact and extended timeline",
    id: "panels.timeline.extended",
    target: "panels.timeline.extended",
    userAction:
      "Toggle Timeline presentation and verify the same shader frame remains active.",
    browserTestName: runtimeBrowserTest,
  }),
];

const patternControls = [
  [
    "shader.repetition",
    "Repetition",
    "Stripe density changes",
    "control-mapping",
  ],
  ["shader.softness", "Softness", "Stripe transition sharpness changes"],
  ["shader.shiftRed", "Red shift", "Red-channel dispersion changes"],
  ["shader.shiftBlue", "Blue shift", "Blue-channel dispersion changes"],
  ["shader.distortion", "Distortion", "Noise deformation changes"],
  ["shader.contour", "Contour", "Silhouette contour response changes"],
  ["shader.angle", "Angle", "Pattern direction changes"],
] as const;

const patternEntries = patternControls.map(
  ([target, label, observable, referenceCoverage]) =>
    controlEntry({
      componentType: "slider",
      evidence: "rendered-pixels",
      expectedObservable: `${observable} on the model using Paper's exact ${target} mapping.`,
      fixture: `uploaded OBJ with ${label} changed from reference default`,
      id: target,
      referenceCoverage,
      target,
      userAction: `Drag ${label} and observe live Liquid Metal pixels change during the drag.`,
    }),
);

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...setupEntries,
  controlEntry({
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "The attached default A.obj renders on clean load. Upload/import replaces it; clear/remove reaches an empty source state. Section reset and global Reset restore the default attached A.obj.",
    fixture: "preloaded A.obj plus inline replacement OBJ cube",
    id: "media.model",
    referenceCoverage: "control-mapping",
    target: "media.model",
    userAction:
      "Start from A.obj, replace it with another OBJ, clear/remove it, then use section reset and global Reset to restore A.obj.",
    browserTestName: modelBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Model scale changes the normalized model's visible bounds while the paused Liquid Metal shader phase stays fixed.",
    fixture: "uploaded OBJ at model scale 0.25 and 0.7 with playback paused",
    id: "model.scale",
    target: "model.scale",
    userAction:
      "Drag Model scale and compare the visible object bounds at one paused frame.",
    automatedTestName: automatedModelScaleTest,
    browserTestName: modelScaleBrowserTest,
  }),
  controlEntry({
    builtInFitCheck: {
      checkedBuiltIns: ["vector", "actions"],
      closestBuiltIn: "vector",
      productObservable:
        "Axis click and direct endpoint drag change the camera pose, reflected model pixels, sticker raycasting view, and exported viewpoint.",
      whyInsufficient:
        "Vector edits one stable X/Y parameter, but camera orientation requires six depth-sorted projected axes, camera up/roll, exact axis snapping, a spherical hit target, and a viewport-fixed editing handle.",
    },
    componentType: "orientationGizmo",
    customControlCoverage: [
      "built-in-gap",
      "kit-primitives",
      "minimal-ui",
      "product-output",
      "runtime-state",
    ],
    evidence: "rendered-pixels",
    expectedObservable:
      "The source-matched six-axis orientation control and model-surface left drag write view.orbit so snap, direct drag, raycast orbit, reset/history, preview, and export share one camera pose while empty-canvas pan stays independent.",
    fixture: "uploaded asymmetric OBJ at the default 4.6 camera radius",
    id: "view.orbit",
    referenceCoverage: "renderer-state",
    target: "view.orbit",
    userAction:
      "Hover and click an axis, drag its endpoint across the sphere, left-drag the visible model, pan from empty canvas, then use undo/redo and Model Size reset.",
    automatedTestName: automatedRuntimeTest,
    browserTestName: runtimeBrowserTest,
  }),
  controlEntry({
    canvasHandle: {
      exportCleanTestName: exportBrowserTest,
      outputObservable:
        "Snapping or dragging the orientation gizmo changes the rendered/exported camera view while its stable backing and transparent axes layer remain absent from output pixels.",
      testId: "liquid-metal-orientation-gizmo",
      writesTarget: "view.orbit",
    },
    componentType: "canvas-handle",
    evidence: "product-output",
    expectedObservable:
      "The 70px lower-left handle remains fixed during zoom/center, has a non-flashing separated backing, snaps on click, and keeps the grabbed endpoint under the pointer with stable front/rear opacity at the sphere boundary.",
    fixture: "uploaded asymmetric OBJ and the default front camera pose",
    id: "view.orbit.handle",
    kind: "canvas-handle",
    userAction:
      "Hover, click, and drag the six-axis orientation gizmo, then zoom/center and export PNG.",
    automatedTestName: automatedRuntimeTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "The attached default scratch mask renders on clean load and remove reaches an empty unscratched state. Upload/import replaces it; Rotate Right, Flip horizontal, and Flip vertical update runtime media transform metadata consumed by preview and export. Section reset and global Reset restore the default attached mask.",
    fixture: "preloaded Noise Scratches Black Background mask over A.obj",
    id: "media.scratches",
    target: "media.scratches",
    userAction:
      "Remove the default mask, upload a grayscale replacement, rotate and flip it, export the result, then use section reset and global Reset to restore the default mask.",
    automatedTestName: automatedScratchTest,
    browserTestName: scratchBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Depth from zero to maximum changes the physical reflection normal while model silhouette, geometry, and Paper color controls remain unchanged.",
    fixture: "grayscale scratch mask at depth 0 and 1.5",
    id: "surface.scratchDepth",
    target: "surface.scratchDepth",
    userAction:
      "Drag Depth live and compare reflected scratch grooves on the model.",
    automatedTestName: automatedScratchTest,
    browserTestName: scratchBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Scale changes object-space scratch repetition across multiple model-facing axes without UV seams or world-space swimming under orbit.",
    fixture: "curved OBJ at scratch scale 1 and 20",
    id: "surface.scratchScale",
    target: "surface.scratchScale",
    userAction:
      "Drag Scale live, orbit the model, and compare attached scratch density.",
    automatedTestName: automatedScratchTest,
    browserTestName: scratchBrowserTest,
  }),
  controlEntry({
    componentType: "switch",
    evidence: "rendered-pixels",
    expectedObservable:
      "Invert reverses height-gradient polarity so the same grayscale strokes switch between grooves and ridges without recoloring the metal.",
    fixture: "asymmetric grayscale scratch height mask",
    id: "surface.scratchInvert",
    target: "surface.scratchInvert",
    userAction:
      "Toggle Invert and compare the direction of the reflected normal relief.",
    automatedTestName: automatedScratchTest,
    browserTestName: scratchBrowserTest,
  }),
  controlEntry({
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "Ten attached default PNG stickers render on clean load; remove can reach an empty sticker state. Batch import adds distinct runtime media assets, drag reorder updates runtime media order consumed by rendered output, and rotate/flip transform metadata changes preview/export. Section reset and global Reset restore the default attached ten-sticker stack.",
    fixture: "ten preloaded stickers plus three imported PNGs over A.obj",
    id: "media.stickers",
    target: "media.stickers",
    userAction:
      "Verify the ten preloaded stickers, upload several more, reorder thumbnails, rotate and flip the selected sticker, remove one, then use section reset and global Reset to restore the authored stack.",
    automatedTestName: automatedStickerTest,
    browserTestName: stickerBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Sticker scale changes only the selected decal's clipped surface footprint; switching stickers restores each independent value, and no selection makes the control the next-import default.",
    fixture: "two differently scaled PNG decals on a curved OBJ",
    id: "stickers.scale",
    target: "stickers.scale",
    userAction:
      "Select each sticker, drag Sticker scale, switch selection, and compare independent surface footprints before and after direct movement.",
    automatedTestName: automatedStickerTest,
    browserTestName: stickerBrowserTest,
  }),
  controlEntry({
    automatedTestName: automatedDefaultSceneTest,
    browserTestName: defaultSceneBrowserTest,
    componentType: "canvasContent",
    evidence: "rendered-pixels",
    expectedObservable:
      "A clean load renders A.obj at the authored orbit with the imported Liquid Metal values, brushed scratch relief, and ten separately editable decals; removing media changes the output and Reset recreates the same default asset set without persistence residue.",
    fixture: "clean browser storage and bundled default scene assets",
    id: "renderer.default-scene",
    kind: "runtime",
    target: "renderer.output",
    userAction:
      "Open the app with clean storage, inspect the complete scene, remove default media, then press Reset and verify the authored scene returns.",
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Sticker rotation continuously turns only the selected decal in its local surface plane and remains independent from the file thumbnail's 90-degree source-image transform.",
    fixture: "asymmetric PNG decal at -180, 0, and 180 degrees",
    id: "stickers.rotation",
    target: "stickers.rotation",
    userAction:
      "Select an asymmetric sticker, drag Sticker rotation, move the decal, and verify its in-plane angle is preserved.",
    automatedTestName: automatedStickerTest,
    browserTestName: stickerBrowserTest,
  }),
  controlEntry({
    actionCoverage: [
      "preset.default",
      "preset.noir",
      "preset.backdrop",
      "preset.stripes",
    ],
    componentType: "actions",
    evidence: "rendered-pixels",
    expectedObservable:
      "Default, Noir, Backdrop, and Stripes apply the exact Paper preset parameter bundles and visibly change the model.",
    fixture: "uploaded OBJ and four Paper presets",
    id: "shader.preset",
    referenceCoverage: "control-mapping",
    target: "shader.preset",
    userAction:
      "Click every preset action and compare controls plus model pixels.",
  }),
  controlEntry({
    componentType: "color",
    evidence: "rendered-pixels",
    expectedObservable:
      "Changing Paper colorBack changes the metal base/background pixels.",
    fixture: "uploaded OBJ and dark base",
    id: "shader.colorBack",
    referenceCoverage: "control-mapping",
    target: "shader.colorBack",
    userAction: "Change Background in Metal Color and observe model pixels.",
  }),
  controlEntry({
    componentType: "color",
    evidence: "rendered-pixels",
    expectedObservable:
      "Changing Paper colorTint changes color-burn tint pixels.",
    fixture: "uploaded OBJ and blue tint",
    id: "shader.colorTint",
    target: "shader.colorTint",
    userAction: "Change Tint and observe model pixels.",
  }),
  ...patternEntries,
  controlEntry({
    componentType: "slider",
    evidence: "timeline-output",
    expectedObservable:
      "Dragging Speed changes how far Paper frame time advances for the same timeline interval.",
    fixture: "uploaded OBJ at speed 0 then 2",
    id: "shader.speed",
    target: "shader.speed",
    userAction:
      "Drag Speed live and compare forward shader motion without reverse or yoyo behavior.",
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Scale changes Paper field scale on the model.",
    fixture: "uploaded OBJ at scale 0.6 and 1.4",
    id: "shader.scale",
    target: "shader.scale",
    userAction: "Drag Scale and observe live model pixels.",
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Rotation rotates Paper's projected field on the model.",
    fixture: "uploaded OBJ at 0 and 90 degrees",
    id: "shader.rotation",
    target: "shader.rotation",
    userAction: "Drag Rotation and observe the stripe field rotate.",
  }),
  controlEntry({
    componentType: "vector",
    controlPartCoverage: ["vector.x", "vector.y"],
    evidence: "rendered-pixels",
    expectedObservable:
      "Changing both Offset axes maps to Paper offsetX and offsetY and moves the field across the model.",
    fixture: "uploaded OBJ with asymmetric stripe frame",
    id: "shader.offset",
    referenceCoverage: "control-mapping",
    target: "shader.offset",
    userAction:
      "Drag Offset on both X and Y and observe the field move in both directions.",
  }),
  controlEntry({
    componentType: "select",
    evidence: "rendered-pixels",
    expectedObservable:
      "Contain and Cover change Paper's field fit across the model viewport.",
    fixture: "non-square canvas",
    id: "shader.fit",
    optionCoverage: ["contain", "cover"],
    target: "shader.fit",
    userAction: "Choose Contain and Cover and compare model pixels.",
  }),
  controlEntry({
    componentType: "select",
    evidence: "rendered-pixels",
    expectedObservable:
      "Studio, Softbox, Product, Rim, Chrome, Neutral, Warm, and Custom HDRI select distinct physical reflection sources while preserving the model and material.",
    fixture: "uploaded OBJ under eight environment source states",
    id: "lighting.environmentPreset",
    optionCoverage: [
      "studio",
      "softbox",
      "product",
      "rim",
      "chrome",
      "neutral",
      "warm",
      "custom",
    ],
    target: "lighting.environmentPreset",
    userAction:
      "Choose every Environment Source option and compare reflected model pixels.",
    automatedTestName: automatedEnvironmentTest,
    browserTestName: environmentBrowserTest,
  }),
  controlEntry({
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "The HDR/EXR uploader is hidden for built-in sources, becomes visible for Custom HDRI, and hides again after reset; import changes reflections, remove returns to Studio fallback, and section/global reset clear the asset.",
    fixture: "valid Radiance HDR environment and uploaded OBJ",
    id: "media.environment",
    target: "media.environment",
    userAction:
      "Verify HDRI is hidden in Studio, choose Custom HDRI and verify it is visible, upload/remove an HDR file, upload again, then use Environment section reset and global Reset controls.",
    automatedTestName: automatedEnvironmentTest,
    browserTestName: environmentBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Intensity changes reflected environment energy live without rebuilding the HDRI or model.",
    fixture: "uploaded OBJ at environment intensity 0 and 2.4",
    id: "lighting.environmentIntensity",
    target: "lighting.environmentIntensity",
    userAction:
      "Drag Intensity and observe live reflected model pixels change.",
    automatedTestName: automatedEnvironmentTest,
    browserTestName: environmentBrowserTest,
  }),
  controlEntry({
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging Rotation turns the environment reflection around the model while geometry and shader phase stay fixed.",
    fixture: "asymmetric OBJ at environment rotation 0 and 180 degrees",
    id: "lighting.environmentRotation",
    target: "lighting.environmentRotation",
    userAction:
      "Drag Environment Rotation and observe reflection placement change live.",
    automatedTestName: automatedEnvironmentTest,
    browserTestName: environmentBrowserTest,
  }),
  controlEntry({
    componentType: "switch",
    evidence: "exported-bytes",
    expectedObservable:
      "Turning Include off hides the live preview background and makes PNG alpha transparent while video keeps the scene background.",
    fixture: "uploaded OBJ over colored scene background",
    id: "export.includeBackground",
    target: "export.includeBackground",
    userAction:
      "Turn Include off, inspect preview/PNG alpha, then export video and verify background remains.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "color",
    evidence: "exported-bytes",
    expectedObservable:
      "Changing scene background updates preview, PNG, and video background pixels.",
    fixture: "purple scene background",
    id: "appearance.background",
    target: "appearance.background",
    userAction: "Change the unlabeled background color and export output.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "PNG and JPG selections encode matching non-empty MIME bytes.",
    fixture: "uploaded OBJ image encodes",
    id: "export.image.format",
    optionCoverage: ["png", "jpg"],
    target: "export.image.format",
    userAction:
      "Choose PNG and JPG, export, and decode the resulting image types.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "2K, 4K, and 8K produce real 2048, 4096, and 8192 long-edge images.",
    fixture: "uploaded OBJ at three image resolutions",
    id: "export.image.resolution",
    optionCoverage: ["2k", "4k", "8k"],
    target: "export.image.resolution",
    userAction:
      "Choose multiple image resolutions, export, and decode pixel dimensions.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "MP4 or safe WebM fallback and WebM produce supported non-empty video bytes.",
    fixture: "uploaded OBJ animated video",
    id: "export.video.format",
    optionCoverage: ["mp4", "webm"],
    target: "export.video.format",
    userAction:
      "Choose both video formats and verify supported MIME fallback and bytes.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "Current uses even canvas dimensions and 4K fits inside 3840x2160 with preserved aspect ratio.",
    fixture: "current and 4K video sizes",
    id: "export.video.resolution",
    optionCoverage: ["current", "4k"],
    target: "export.video.resolution",
    userAction:
      "Choose Current and 4K, export video, and inspect metadata dimensions.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    actionCoverage: ["export.video", "export.png"],
    componentType: "panelActions",
    evidence: "exported-bytes",
    expectedObservable:
      "Sticky Export Video and Export PNG return pending promises, report progress, download non-empty final output, and clear the accent indicator after completion.",
    fixture: "uploaded OBJ with export progress",
    id: "export.actions",
    target: "export.actions",
    userAction:
      "Click both sticky exports and observe progress, download bytes, and completion.",
    automatedTestName: automatedExportTest,
    browserTestName: exportBrowserTest,
  }),
  controlEntry({
    componentType: "canvasContent",
    evidence: "rendered-pixels",
    expectedObservable:
      "The official Paper shader canvas is sampled on real depth-tested model fragments and preserves exact renderer state.",
    fixture: "uploaded asymmetric OBJ",
    id: "renderer.output",
    kind: "runtime",
    referenceCoverage: "renderer-state",
    target: "renderer.output",
    userAction:
      "Upload an OBJ and compare Paper control changes against visible model pixels.",
  }),
  controlEntry({
    componentType: "canvasContent",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Plain left drag beginning on visible model geometry updates the shared camera pose without moving the Toolcraft viewport; the same drag beginning in empty canvas pans the viewport without changing the camera, and middle drag is inert.",
    fixture: "uploaded asymmetric OBJ",
    id: "renderer.orbit",
    kind: "runtime",
    referenceCoverage: "renderer-state",
    target: "view.orbit",
    userAction:
      "Left-drag the visible model, left-drag empty canvas, middle-drag the model, then zoom the Toolcraft viewport.",
    browserTestName: modelOrbitBrowserTest,
  }),
  controlEntry({
    componentType: "canvasContent",
    evidence: "rendered-pixels",
    expectedObservable:
      "Clicking the top visible PNG decal selects its runtime media layer; dragging raycasts and previews locally, commits one undoable stickers.placements value on release, preserves scale/rotation, and keeps the decal on the selected edge-connected surface after model orbit and scaling.",
    fixture: "overlapping transparent PNG decals on a curved OBJ",
    id: "stickers.surface-drag",
    kind: "runtime",
    target: "stickers.placements",
    userAction:
      "Click the top decal, scale and rotate it, drag it over the model, orbit and scale the model, and verify it follows one continuous surface without jumping to a disconnected component.",
    automatedTestName: automatedStickerTest,
    browserTestName: stickerBrowserTest,
  }),
  controlEntry({
    componentType: "canvasContent",
    evidence: "rendered-pixels",
    expectedObservable:
      "An asymmetric PNG continues with stable proportions and continuous UVs from the selected face across valid small bevel triangles and a genuinely shared 90-degree edge, while nearby disconnected geometry and true mesh boundaries remain Liquid Metal.",
    fixture:
      "bright asymmetric PNG on a folded OBJ with a narrow valid bevel plus a nearby disconnected panel",
    id: "stickers.surface-wrap",
    kind: "runtime",
    target: "stickers.placements",
    userAction:
      "Place and rotate a sticker across the folded edge, inspect both connected faces, then orbit the model and compare the disconnected panel.",
    automatedTestName: automatedStickerWrapTest,
    browserTestName: stickerWrapBrowserTest,
  }),
  controlEntry({
    componentType: "canvasContent",
    evidence: "rendered-pixels",
    expectedObservable:
      "The transparent physical decal preserves the PNG's bright sRGB color and alpha independently of Environment Intensity and tone mapping, while Studio, Neutral, Warm, and custom HDRI affect only a subtle additive clearcoat/reflection in preview, PNG, and video.",
    fixture: "bright PNG decal under Studio and Warm environment",
    id: "stickers.environment",
    kind: "runtime",
    target: "stickers.environment",
    userAction:
      "Pause the timeline, verify a solid bright sticker retains its source-color brightness, then change Environment source/intensity/rotation and compare only the subtle reflection plus exported output.",
    automatedTestName: automatedStickerTest,
    browserTestName: stickerBrowserTest,
  }),
  controlEntry({
    componentType: "timeline",
    evidence: "timeline-output",
    expectedObservable:
      "Play/pause and scrub change deterministic Paper frames; editing duration changes the 0..state.timeline.durationSeconds range without changing shader settings; loop motion is seamless forward-only, first and last frames stitch after changing duration, and no mirror, yoyo, ping-pong, or reverse fallback appears.",
    fixture: "uploaded OBJ with extended playback timeline",
    id: "timeline.playback",
    kind: "runtime",
    referenceTimelineCoverage: "playback",
    target: "timeline.playback",
    timelineCoverage: "playback",
    timelinePlaybackCoverage: "all-playback-behavior",
    userAction:
      "Play and pause, scrub, edit timeline duration, toggle loop, and compare frame 0, midpoint, end-epsilon, and wrapped frame after changing duration.",
    automatedTestName: automatedRuntimeTest,
    browserTestName: runtimeBrowserTest,
  }),
  ...(
    ["scrub", "duration", "loop", "time-progress", "export-at-time"] as const
  ).map((coverage) =>
    controlEntry({
      componentType: "timeline",
      evidence:
        coverage === "export-at-time" ? "exported-bytes" : "timeline-output",
      expectedObservable:
        coverage === "duration"
          ? "Editing timeline duration changes the playback/export range while Paper settings stay stable."
          : coverage === "loop"
            ? "The product repeats forward-only without mirror/yoyo/ping-pong/reverse and its first/last stripe frames stitch at the derived boundary after duration changes."
            : coverage === "scrub"
              ? "Scrubbing writes deterministic normalized loop phase and changes model pixels."
              : coverage === "time-progress"
                ? "Timeline progress advances one normalized forward material cycle; Speed changes in-cycle pacing while the edited duration remains the loop rate."
                : "PNG captures the selected timeline instant and video covers the edited duration.",
      fixture: `timeline ${coverage} fixture`,
      id: `timeline.${coverage}`,
      kind: "runtime",
      referenceTimelineCoverage: coverage,
      target: `timeline.${coverage}`,
      userAction:
        coverage === "duration"
          ? "Edit and commit timeline duration and compare rendered/exported progress."
          : `Exercise timeline ${coverage} through the visible timeline UI and observe product output.`,
      automatedTestName: automatedRuntimeTest,
      browserTestName: runtimeBrowserTest,
    }),
  ),
  ...(
    ["canvas.center", "canvas.zoomIn", "history.undo", "toolbar.theme"] as const
  ).map((target) =>
    controlEntry({
      componentType: "toolbar",
      evidence: "viewport-side-effect",
      expectedObservable: `${target} changes the intended Toolcraft viewport/history/theme side effect without destabilizing model output.`,
      fixture: "uploaded OBJ toolbar fixture",
      id: target,
      kind: "runtime",
      target,
      userAction: `Use ${target} through the visible toolbar and verify the intended side effect.`,
      automatedTestName: automatedRuntimeTest,
      browserTestName: runtimeBrowserTest,
    }),
  ),
];

export const starterControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
  [
    {
      entity: "3D source model",
      groupingReason:
        "The file control owns the model import and removal lifecycle.",
      targets: ["media.model"],
      title: "Model",
    },
    {
      entity: "Normalized model framing and camera view",
      groupingReason:
        "Model scale controls source framing while the portal-only orientation control owns the matching runtime camera pose without adding duplicate panel chrome.",
      targets: ["model.scale", "view.orbit"],
      title: "Model Size",
    },
    {
      entity: "Scratch height source",
      groupingReason:
        "The component-owned single-image file control owns scratch-mask upload, transform, removal, and reset lifecycle.",
      targets: ["media.scratches"],
      title: "Scratch Mask",
    },
    {
      entity: "Liquid Metal scratch microgeometry",
      groupingReason:
        "Depth, object-space repetition, and polarity jointly tune the UV-free physical normal detail derived from the adjacent mask source.",
      targets: [
        "surface.scratchDepth",
        "surface.scratchScale",
        "surface.scratchInvert",
      ],
      title: "Surface Scratches",
    },
    {
      entity: "Ordered PNG surface decals",
      groupingReason:
        "The multi-file source owns sticker import, selection, thumbnail stack order, image transforms, and removal before direct placement on the model.",
      targets: ["media.stickers"],
      title: "Stickers",
    },
    {
      entity: "Selected surface decal transform",
      groupingReason:
        "Scale and in-plane rotation jointly edit the selected sticker placement while also defining defaults for the next imported sticker.",
      targets: ["stickers.scale", "stickers.rotation"],
      title: "Sticker Transform",
    },
    {
      workflowStage: "Apply a Paper preset",
      groupingReason:
        "The four reference actions batch-apply one coherent Paper parameter bundle.",
      targets: ["shader.preset"],
      title: "Presets",
    },
    {
      entity: "Liquid Metal color response",
      groupingReason:
        "Paper's base/background and burn tint are the two color roles of one material.",
      targets: ["shader.colorBack", "shader.colorTint"],
      title: "Metal Color",
    },
    {
      entity: "Liquid Metal stripe field",
      groupingReason:
        "These exact Paper uniforms jointly define stripe density, edges, dispersion, noise, contour, and direction.",
      targets: [
        "shader.repetition",
        "shader.softness",
        "shader.shiftRed",
        "shader.shiftBlue",
        "shader.distortion",
        "shader.contour",
        "shader.angle",
      ],
      title: "Metal Pattern",
    },
    {
      entity: "Projected Paper field",
      groupingReason:
        "Speed and sizing transforms control how the exact shader field moves across the model surface.",
      targets: [
        "shader.speed",
        "shader.scale",
        "shader.rotation",
        "shader.fit",
      ],
      title: "Projection",
    },
    {
      entity: "Projected field offset",
      groupingReason:
        "The built-in Vector is a standalone compound owner for Paper offsetX and offsetY.",
      targets: ["shader.offset"],
      title: "Offset",
    },
    {
      entity: "PBR reflection environment",
      groupingReason:
        "Source, optional HDRI media, intensity, and rotation jointly define the environment reflected by the liquid-metal conductor.",
      targets: [
        "lighting.environmentPreset",
        "media.environment",
        "lighting.environmentIntensity",
        "lighting.environmentRotation",
      ],
      title: "Environment",
    },
    {
      entity: "Scene background",
      groupingReason:
        "Include and color jointly own preview/PNG/video background behavior.",
      targets: ["export.includeBackground", "appearance.background"],
      title: "Background",
    },
    {
      workflowStage: "Configure image export",
      groupingReason:
        "Format and resolution jointly define final still-image delivery.",
      targets: ["export.image.format", "export.image.resolution"],
      title: "Image Export",
    },
    {
      workflowStage: "Configure video export",
      groupingReason:
        "Format and resolution jointly define final animated delivery.",
      targets: ["export.video.format", "export.video.resolution"],
      title: "Video Export",
    },
  ];
