import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { frozenMeltAcceptance } from "./frozen/frozen-melt-acceptance";

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: { mode: "none" },
  mode: "new-toolcraft-app",
  videoReferenceStudy: {
    acceptanceMapping: [
      {
        acceptanceId: "melt.enabled",
        behavior: "Melt mode claims geometry drags and locks model orbit.",
        frameIds: ["reference-first-contact", "reference-second-stroke"],
      },
      {
        acceptanceId: "melt.paint",
        behavior: "A continuous drag accumulates local heat into an irregular reveal.",
        frameIds: ["reference-first-contact", "reference-peak-open"],
      },
      {
        acceptanceId: "melt.heat",
        behavior: "Higher heat produces a stronger, slightly wider clear core.",
        frameIds: ["reference-first-contact", "reference-peak-open"],
      },
      {
        acceptanceId: "melt.radius",
        behavior: "The brush footprint controls the spatial size of the reveal.",
        frameIds: ["reference-first-contact", "reference-peak-open"],
      },
      {
        acceptanceId: "melt.structure",
        behavior: "The thermal boundary breaks into granular ice islands.",
        frameIds: ["reference-peak-open", "reference-second-peak"],
      },
      {
        acceptanceId: "melt.refreeze",
        behavior: "Released heat cools over seconds and partially restores ice.",
        frameIds: ["reference-cooling", "reference-refrozen"],
      },
      {
        acceptanceId: "melt.action",
        behavior: "The local thermal state can be returned to fully frozen.",
        frameIds: ["reference-rest", "reference-refrozen"],
      },
    ],
    behaviorDecomposition:
      "Geometry raycasts deposit additive heat into a bounded object-space field. Heat controls energy and some footprint dilation, Radius controls the base footprint, Structure perturbs the melt threshold at two scales, and Refreeze diffuses and exponentially cools the field. The shader multiplies the existing top-down retained-ice mask by the inverse local thermal melt signal. Pointer ownership locks orbit only after a primary geometry hit; misses remain available to canvas pan.",
    extractionEvidence:
      "ffprobe inspected the 4096x2078 H.264 source (6.733 seconds, 378 frames, nominal 60 fps). ffmpeg generated a 4x4 contact sheet at 2.5 fps, a 6x6 center-crop temporal sheet at 5 fps, and 17 individual 2048-pixel-wide frames for edge inspection under /tmp/frozen-melt-study.",
    referenceLocation:
      "local-reference://captures/CleanShot 2026-07-16 at 18.55.45.mp4",
    storyboard: [
      {
        behaviorObservation:
          "Old heat is decaying rather than leaving a permanent binary hole.",
        frameId: "reference-rest",
        frameSource: "reference video timecode 0.0 s",
        timeSeconds: 0,
        visualObservation:
          "Pale blue frost covers almost the entire view; a previous central mark is only faintly translucent.",
      },
      {
        behaviorObservation:
          "Pointer contact raises local temperature quickly and creates concentrated clear cores.",
        frameId: "reference-first-contact",
        frameSource: "reference video timecode 1.0 s",
        timeSeconds: 1,
        visualObservation:
          "New dark high-contrast openings appear near the upper form and lower-left area.",
      },
      {
        behaviorObservation:
          "Overlapping samples accumulate into a clean core, granular breakup, and soft halo.",
        frameId: "reference-peak-open",
        frameSource: "reference video timecode 1.4 s",
        timeSeconds: 1.4,
        visualObservation:
          "The upper panel is broadly readable through speckled boundaries and a wide misty transition.",
      },
      {
        behaviorObservation:
          "Temperature diffuses and cools after release, producing partial refreezing.",
        frameId: "reference-cooling",
        frameSource: "reference video timecode 2.4 s",
        timeSeconds: 2.4,
        visualObservation:
          "Previously open areas become hazier and smaller without new input.",
      },
      {
        behaviorObservation:
          "A new local heat trail coexists with the older cooling trail.",
        frameId: "reference-second-stroke",
        frameSource: "reference video timecode 3.6 s",
        timeSeconds: 3.6,
        visualObservation:
          "A lower sweep begins while the older upper reveal continues to soften.",
      },
      {
        behaviorObservation:
          "Repeated passes cross a nonlinear melt threshold and fragment the edge.",
        frameId: "reference-second-peak",
        frameSource: "reference video timecode 4.4 s",
        timeSeconds: 4.4,
        visualObservation:
          "The lower button becomes cleanly visible with ragged ice islands and a broad translucent edge.",
      },
      {
        behaviorObservation:
          "Cooling asymptotically restores ice over multiple seconds.",
        frameId: "reference-refrozen",
        frameSource: "reference video timecode 6.2 s",
        timeSeconds: 6.2,
        visualObservation:
          "Both revealed regions have substantially closed and only a muted granular trace remains.",
      },
    ],
    transitionAnalysis: [
      {
        behaviorDelta:
          "A pointer stroke deposits local energy and opens high-temperature cores while untouched frost remains stable.",
        fromFrameId: "reference-rest",
        id: "contact-deposition",
        toFrameId: "reference-first-contact",
      },
      {
        behaviorDelta:
          "Overlapping samples accumulate, expand clarity, and retain a heterogeneous boundary.",
        fromFrameId: "reference-first-contact",
        id: "thermal-accumulation",
        toFrameId: "reference-peak-open",
      },
      {
        behaviorDelta:
          "After release the clean core contracts before its diffuse halo disappears.",
        fromFrameId: "reference-peak-open",
        id: "cooling-release",
        toFrameId: "reference-cooling",
      },
      {
        behaviorDelta:
          "A separate lower trail appears while the upper thermal history persists.",
        fromFrameId: "reference-cooling",
        id: "independent-stroke",
        toFrameId: "reference-second-stroke",
      },
      {
        behaviorDelta:
          "Repeated lower passes cross the clear-core threshold and leave irregular frozen islands.",
        fromFrameId: "reference-second-stroke",
        id: "second-accumulation",
        toFrameId: "reference-second-peak",
      },
      {
        behaviorDelta:
          "The temperature field decays over seconds and progressively restores the frozen mask.",
        fromFrameId: "reference-second-peak",
        id: "progressive-refreeze",
        toFrameId: "reference-refrozen",
      },
    ],
  },
};

export const appProductReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "Frozen",
  productSummary:
    "A physical WebGL ice editor for uploaded 3D models or volumetric image slabs, with object-space thaw, an interactive thermal melt brush, HDR reflections, relief, crystals, and icicles.",
  requestedBehavior:
    "Use a GLB, OBJ, or STL, or build a color-accurate unlit image slab; adjust model-texture exposure, tune physical ice, and use a model-locking geometry brush with heat, radius, structure, cooling, and refreeze behavior before exporting the configured still image.",
};

function controlEntry({
  componentType,
  controlPartCoverage,
  expectedObservable,
  id,
  label,
  target = id,
  visibilityCoverage,
}: {
  componentType: string;
  controlPartCoverage?: ToolcraftComponentAcceptance["controlPartCoverage"];
  expectedObservable: string;
  id: string;
  label: string;
  target?: string;
  visibilityCoverage?: ToolcraftComponentAcceptance["visibilityCoverage"];
}): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: `${id} changes frozen product output`,
    browser: true,
    browserTestName: `browser: ${id} changes frozen product output`,
    componentType,
    ...(controlPartCoverage ? { controlPartCoverage } : {}),
    evidence: "rendered-pixels",
    expectedObservable,
    fixture: "uploaded asymmetric OBJ with a visible frozen region",
    id,
    kind: "control",
    target,
    userAction: `Change ${label} and observe the rendered model.`,
    ...(visibilityCoverage ? { visibilityCoverage } : {}),
  };
}

const sliderControlDefinitions = [
  ["effect.progress", "Progress", "Moves the noisy boundary from the object's highest point to its lowest point."],
  ["effect.transition", "Transition", "Changes the visible width of the ice-to-source transition."],
  ["effect.noiseScale", "Noise scale", "Changes the object-space frequency of the thaw boundary."],
  ["effect.turbulence", "Turbulence", "Perturbs the boundary while preserving top-to-bottom direction."],
  ["ice.shellThickness", "Shell thickness", "Expands the physical shell along source normals."],
  [
    "ice.crystalDensity",
    "Surface coverage",
    "Changes geometry-relative crystal coverage inside the current thaw mask.",
  ],
  ["ice.crystalSize", "Crystal size", "Changes the width of every generated frost crystal."],
  ["ice.crystalElongation", "Elongation", "Stretches crystals away from the source surface."],
  ["ice.crystalVariation", "Crystal variation", "Changes deterministic crystal shape variation."],
  [
    "ice.icicleDensity",
    "Icicle coverage",
    "Changes geometry-relative underside coverage for 3D or eligible gravity-drainage coverage for image slabs.",
  ],
  ["ice.icicleLength", "Icicle length", "Changes length and produces zero instances at zero."],
  ["ice.icicleRadius", "Icicle radius", "Changes radius and produces zero instances at zero."],
  ["ice.icicleVariation", "Icicle variation", "Changes deterministic icicle shape variation."],
  ["ice.transmission", "Transmission", "Changes physical light transmission through the ice."],
  ["ice.ior", "IOR", "Changes physical refraction at the ice boundary."],
  ["ice.roughness", "Roughness", "Broadens HDR reflections on frozen surfaces."],
  ["ice.roughnessVariation", "Roughness variation", "Changes low-frequency frosted roughness variation."],
  ["ice.materialMaskCoverage", "Frost coverage", "Blends exact transparent-ice and current-frost endpoints."],
  ["ice.materialMaskScale", "Scale", "Changes object-space Voronoi cell frequency."],
  ["ice.materialMaskSoftness", "Softness", "Changes the clear-to-frost transition width."],
  ["ice.materialMaskDistortion", "Distortion", "Jitters Voronoi cell centers."],
  ["ice.materialMaskSeed", "Seed", "Selects a deterministic Voronoi arrangement."],
  ["scratch.scale", "Scale", "Changes UV-independent triplanar scratch frequency."],
  ["scratch.rotation", "Rotation", "Rotates the triplanar relief projections."],
  ["scratch.contrast", "Contrast", "Shapes grayscale relief contrast."],
  ["scratch.displacement", "Displacement", "Moves shell vertices from the relief signal."],
  ["scratch.bump", "Bump", "Perturbs physical shading normals from relief."],
  ["scratch.roughness", "Roughness influence", "Maps relief into reflection sharpness."],
  ["lighting.environmentIntensity", "Environment", "Changes Delta 2 reflection and ice-light strength while the source image stays unlit."],
  ["lighting.environmentRotation", "Environment rotation", "Rotates reflected HDR features around the object."],
  ["lighting.exposure", "Exposure", "Changes ACES Filmic exposure for lit materials while the source image stays unchanged."],
] as const;

const productControls = [
  ...sliderControlDefinitions.map(([id, label, expectedObservable]) =>
    controlEntry({ componentType: "slider", expectedObservable, id, label }),
  ),
  controlEntry({
    componentType: "slider",
    expectedObservable:
      "Changes the downward-normal eligibility threshold for 3D sources.",
    id: "ice.icicleUnderside",
    label: "Underside",
    visibilityCoverage: ["hidden", "visible"],
  }),
  controlEntry({
    componentType: "color",
    expectedObservable:
      "Tint changes shell, crystal, and icicle color while source material remains intact.",
    id: "ice.color",
    label: "Tint",
  }),
  controlEntry({
    componentType: "switch",
    expectedObservable: "Invert swaps raised and recessed relief values.",
    id: "scratch.invert",
    label: "Invert",
  }),
  controlEntry({
    componentType: "vector",
    controlPartCoverage: ["vector.x", "vector.y"],
    expectedObservable: "Offset moves the triplanar relief across the object surface.",
    id: "scratch.offset",
    label: "Offset",
  }),
] as const;

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName: "source mode switches between 3D and image geometry",
    browser: true,
    browserTestName: "browser: source mode switches between 3D and image geometry",
    componentType: "segmented",
    evidence: "rendered-pixels",
    expectedObservable:
      "Selecting 3D or Image shows only that branch and renders the corresponding prepared source.",
    fixture: "uploaded asymmetric OBJ and wide two-color PNG",
    id: "source.mode",
    kind: "control",
    optionCoverage: ["model", "image"],
    target: "source.mode",
    userAction: "Switch between 3D and Image and compare visible controls and output.",
  },
  {
    automated: true,
    automatedTestName: "source.modelExposure changes model brightness",
    browser: true,
    browserTestName: "browser: Model exposure changes source brightness",
    componentType: "slider",
    evidence: "rendered-pixels",
    expectedObservable:
      "Positive EV brightens the textured 3D source and negative EV darkens it without changing the ice or output dimensions.",
    fixture: "bundled textured Night King model rendered fully thawed",
    id: "source.modelExposure",
    kind: "control",
    target: "source.modelExposure",
    userAction:
      "Drag Exposure from negative to positive EV and compare source foreground luminance.",
    visibilityCoverage: ["hidden", "visible"],
  },
  {
    automated: true,
    automatedTestName: "source model upload clear and reset drive the WebGL scene",
    browser: true,
    browserTestName:
      "browser: source model upload clear and reset drive the WebGL scene",
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "The predefined textured Night King ZIP renders on clean startup; it can be removed to an empty canvas, a replacement upload renders, and Reset restores the predefined model.",
    fixture:
      "bundled optimized Night King ZIP plus inline asymmetric textured GLB and ZIP OBJ/MTL package",
    id: "source.model",
    kind: "control",
    mediaLifecycleCoverage: [
      "default-remove",
      "default-reset",
      "upload",
      "remove",
      "reset",
    ],
    target: "source.model",
    userAction:
      "Remove the default model, upload an OBJ replacement, then use Reset and observe the default model return.",
    visibilityCoverage: ["hidden", "visible"],
  },
  controlEntry({
    componentType: "slider",
    expectedObservable:
      "Mesh budget reduces rendered source triangles while preserving texture coordinates and surface normals.",
    id: "source.modelTriangleBudget",
    label: "Mesh budget",
    visibilityCoverage: ["hidden", "visible"],
  }),
  {
    automated: true,
    automatedTestName:
      "source image upload transforms clear and reset drive volumetric geometry",
    browser: true,
    browserTestName:
      "browser: source image upload transforms clear and reset drive volumetric geometry",
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "Uploading an image creates an unlit color-accurate textured rounded volume with gravity-bent drainage icicles; rotate and flip update its texture and aspect, removal empties the image branch, and Reset restores the default 3D scene.",
    fixture: "generated asymmetric two-color PNG",
    id: "source.image",
    kind: "control",
    mediaLifecycleCoverage: [
      "upload",
      "rotate",
      "flip",
      "transform-output",
      "remove",
      "reset",
    ],
    target: "source.image",
    userAction:
      "Select Image, upload a PNG, rotate and flip it, remove it, then use Reset.",
    visibilityCoverage: ["hidden", "visible"],
  },
  {
    automated: true,
    automatedTestName: "source scratch texture drives retained triplanar relief",
    browser: true,
    browserTestName:
      "browser: source scratch texture drives retained triplanar relief",
    componentType: "fileDrop",
    evidence: "media-lifecycle",
    expectedObservable:
      "The predefined wall texture binds a bounded luminance map on clean startup; it can be removed to procedural relief, replaced by an upload, and Reset restores the predefined texture.",
    fixture:
      "bundled Black Painted Wall JPEG plus generated black-and-white PNG scratch map",
    id: "source.scratchTexture",
    kind: "control",
    mediaLifecycleCoverage: [
      "default-remove",
      "default-reset",
      "upload",
      "remove",
      "reset",
    ],
    target: "source.scratchTexture",
    userAction:
      "Remove the default map, upload a grayscale replacement, then use Reset and observe the default map return.",
  },
  controlEntry({
    componentType: "slider",
    expectedObservable:
      "Thickness changes the real side depth of the active textured slab.",
    id: "source.imageThickness",
    label: "Thickness",
    visibilityCoverage: ["hidden", "visible"],
  }),
  controlEntry({
    componentType: "slider",
    expectedObservable:
      "Round corners clips the image and slab to one shared depth-independent rounded silhouette.",
    id: "source.imageCornerRadius",
    label: "Round corners",
    visibilityCoverage: ["hidden", "visible"],
  }),
  controlEntry({
    componentType: "slider",
    expectedObservable:
      "Bevel changes the rounded edge radius without exceeding the safe geometric bound.",
    id: "source.imageBevel",
    label: "Bevel",
    visibilityCoverage: ["hidden", "visible"],
  }),
  {
    automated: true,
    automatedTestName:
      "orientation pose changes rendered model and undo resets it",
    browser: true,
    browserTestName:
      "browser: orientation gizmo and direct model orbit share canvas ownership",
    canvasHandle: {
      exportCleanTestName: "export excludes orientation gizmo",
      outputObservable:
        "The visible model and exported camera follow the shared orientation pose.",
      testId: "toolcraft-orientation-gizmo",
      writesTarget: "scene.orientation",
    },
    componentType: "orientationGizmo",
    evidence: "product-output",
    expectedObservable:
      "Axis and model drags rotate the model while a drag outside the model remains a canvas pan.",
    fixture: "uploaded asymmetric OBJ with empty canvas around it",
    id: "scene.orientation",
    kind: "canvas-handle",
    orientationGizmoCoverage: "all-required-orientation-gizmo-behavior",
    target: "scene.orientation",
    userAction:
      "Drag a gizmo axis, drag the visible model, drag outside it, then use undo and reset.",
    visibilityCoverage: ["hidden", "visible"],
  },
  ...frozenMeltAcceptance,
  ...productControls,
  {
    automated: true,
    automatedTestName:
      "background inclusion controls preview and PNG transparency",
    backgroundOutputCoverage: [
      "preview-hidden-when-excluded",
      "image-transparent-when-excluded",
    ],
    browser: true,
    browserTestName:
      "browser: background inclusion controls preview and PNG transparency",
    componentType: "switch",
    evidence: "rendered-pixels",
    expectedObservable:
      "Turning Include off makes the product background transparent in preview and PNG output.",
    fixture: "uploaded OBJ over a dark blue background",
    id: "export.includeBackground",
    kind: "control",
    target: "export.includeBackground",
    userAction: "Turn Include off and compare preview and exported alpha.",
  },
  controlEntry({
    componentType: "color",
    expectedObservable:
      "Changing Background updates WebGL preview clear color and exported background pixels.",
    id: "scene.background",
    label: "Background",
  }),
  {
    automated: true,
    automatedTestName: "image export format selects PNG or JPG",
    browser: true,
    browserTestName: "browser: image export format selects PNG or JPG",
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable: "Selecting PNG or JPG changes the downloaded image encoding.",
    fixture: "uploaded OBJ image export fixture",
    id: "export.image.format",
    kind: "control",
    optionCoverage: ["png", "jpg"],
    target: "export.image.format",
    userAction: "Select each image format and export the product.",
  },
  {
    automated: true,
    automatedTestName: "image export resolution changes exported dimensions",
    browser: true,
    browserTestName:
      "browser: image export resolution changes exported dimensions",
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "Selecting 2K, 4K, or 8K changes decoded image dimensions at the selected long edge.",
    fixture: "uploaded OBJ image resolution fixture",
    id: "export.image.resolution",
    kind: "control",
    optionCoverage: ["2k", "4k", "8k"],
    target: "export.image.resolution",
    userAction: "Select each resolution, export, and inspect decoded dimensions.",
  },
  {
    actionCoverage: ["export.png"],
    automated: true,
    automatedTestName: "export PNG produces frozen product image bytes",
    browser: true,
    browserTestName: "browser: export PNG produces frozen product image bytes",
    componentType: "panelActions",
    evidence: "exported-bytes",
    expectedObservable:
      "Export PNG downloads non-empty image bytes using the current model, thaw, orbit, background, and resolution settings.",
    fixture: "uploaded OBJ at a partially thawed state",
    id: "actions.output",
    kind: "control",
    target: "actions.output",
    userAction: "Click Export PNG and inspect the delivered image.",
  },
  {
    automated: true,
    automatedTestName: "frozen settings restore after browser reload",
    browser: true,
    browserTestName: "browser: frozen settings restore after browser reload",
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable:
      "Changed thaw progress, ice tint, and attached source media restore after a real browser reload.",
    fixture: "edited Frozen settings with one persisted replacement model",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    target: "effect.progress",
    userAction:
      "Change Progress and Tint, replace the model, reload the page, and observe restored settings and media.",
  },
];

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] = [
  {
    entity: "Active 3D or image-derived source",
    groupingReason:
      "The mode selector, conditional uploads, 3D material exposure, thickness, round corners, and bevel jointly choose, construct, and present the active source object.",
    targets: [
      "source.mode",
      "source.model",
      "source.modelTriangleBudget",
      "source.modelExposure",
      "source.image",
      "source.imageThickness",
      "source.imageCornerRadius",
      "source.imageBevel",
    ],
    title: "Source",
  },
  {
    entity: "Top-to-bottom thaw field",
    groupingReason:
      "Progress, transition, scale, and turbulence jointly define the noisy thaw boundary.",
    targets: [
      "scene.orientation",
      "effect.progress",
      "effect.transition",
      "effect.noiseScale",
      "effect.turbulence",
    ],
    title: "Thaw Front",
  },
  {
    entity: "Interactive object-space thermal field",
    groupingReason:
      "The brush toggle, energy, footprint, structural breakup, cooling strength and timing, and local reset command jointly define direct melt painting on source geometry.",
    targets: [
      "melt.enabled",
      "melt.heat",
      "melt.radius",
      "melt.structure",
      "melt.refreeze",
      "melt.refreezeMode",
      "melt.action",
    ],
    title: "Melt Brush",
  },
  {
    entity: "Generated ice geometry",
    groupingReason:
      "Shell, crystal, and icicle controls change the frozen geometry attached to the source surface.",
    targets: [
      "ice.shellThickness",
      "ice.crystalDensity",
      "ice.crystalSize",
      "ice.crystalElongation",
      "ice.crystalVariation",
      "ice.icicleDensity",
      "ice.icicleLength",
      "ice.icicleRadius",
      "ice.icicleVariation",
      "ice.icicleUnderside",
    ],
    title: "Ice Geometry",
  },
  {
    entity: "Ice material",
    groupingReason:
      "Tint, transmission, IOR, base roughness, and variation define all physical frozen materials.",
    targets: [
      "ice.color",
      "ice.transmission",
      "ice.ior",
      "ice.roughness",
      "ice.roughnessVariation",
    ],
    title: "Ice Surface",
  },
  {
    entity: "Two-material Voronoi mask",
    groupingReason:
      "Coverage, cell scale, softness, distortion, and seed jointly author the clear-ice to frost blend.",
    targets: [
      "ice.materialMaskCoverage",
      "ice.materialMaskScale",
      "ice.materialMaskSoftness",
      "ice.materialMaskDistortion",
      "ice.materialMaskSeed",
    ],
    title: "Material Mask",
  },
  {
    entity: "Scratch image resource",
    groupingReason:
      "The standalone file control owns the optional grayscale texture lifecycle.",
    targets: ["source.scratchTexture"],
    title: "Scratch map",
  },
  {
    entity: "Triplanar surface relief",
    groupingReason:
      "Mapping, shaping, displacement, bump, and roughness controls interpret one relief signal.",
    targets: [
      "scratch.scale",
      "scratch.rotation",
      "scratch.invert",
      "scratch.contrast",
      "scratch.displacement",
      "scratch.bump",
      "scratch.roughness",
    ],
    title: "Surface Relief",
  },
  {
    entity: "Triplanar relief offset",
    groupingReason:
      "The atomic two-axis vector pad directly authors the relief offset.",
    targets: ["scratch.offset"],
    title: "Offset",
  },
  {
    entity: "HDR environment lighting",
    groupingReason:
      "Environment strength, rotation, and exposure tune the one physical lighting stage.",
    targets: [
      "lighting.environmentIntensity",
      "lighting.environmentRotation",
      "lighting.exposure",
    ],
    title: "Lighting",
  },
  {
    entity: "Output background",
    groupingReason:
      "Background inclusion and color jointly define preview and still-export background output.",
    targets: ["export.includeBackground", "scene.background"],
    title: "Background",
  },
  {
    groupingReason:
      "Format and resolution jointly configure the delivered still image.",
    targets: ["export.image.format", "export.image.resolution"],
    title: "Image Export",
    workflowStage: "Image delivery",
  },
];
