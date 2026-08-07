import type {
  ToolcraftControlSchema,
  ToolcraftControlSectionSchema,
} from "@/toolcraft/runtime";

import { frozenDefaultSceneValues } from "./frozen-default-scene";
import { frozenOutputControlSections } from "./frozen-output-controls";
import { frozenSourceControlSection } from "./frozen-source-controls";

type SliderOptions = Readonly<{
  defaultValue: number;
  description: string;
  label: string;
  max: number;
  min: number;
  orderRole?: "detail" | "input";
  performanceReason: string;
  performanceRole?: "responsiveness" | "workload";
  semanticGroup?: string;
  step: number;
  target: string;
  unit?: string;
  visibleWhen?: Readonly<{ equals: boolean | string; target: string }>;
}>;

function responsive(reason: string) {
  return {
    performanceReason: reason,
    performanceRole: "responsiveness" as const,
  };
}

function slider(options: SliderOptions): ToolcraftControlSchema {
  return {
    defaultValue: options.defaultValue,
    description: options.description,
    label: options.label,
    max: options.max,
    min: options.min,
    orderRole: options.orderRole ?? "detail",
    performanceReason: options.performanceReason,
    performanceRole: options.performanceRole ?? "responsiveness",
    semanticGroup: options.semanticGroup,
    sliderValueKind: "continuous",
    step: options.step,
    target: options.target,
    type: "slider",
    unit: options.unit,
    ...(options.visibleWhen ? { visibleWhen: options.visibleWhen } : {}),
  };
}

const thawSection = {
  controls: {
    orientation: {
      defaultValue: frozenDefaultSceneValues["scene.orientation"],
      description: "Orbit the object while the thaw field stays attached.",
      keyframeable: false,
      label: false,
      orderRole: "detail",
      ...responsive("Orbit redraws retained resources without rebuilding them."),
      target: "scene.orientation",
      type: "orientationGizmo",
      visibleWhen: { equals: false, target: "melt.enabled" },
    },
    progress: slider({
      defaultValue: frozenDefaultSceneValues["effect.progress"],
      description: "Reveals the original surface from top to bottom.",
      label: "Progress",
      max: 100,
      min: 0,
      orderRole: "input",
      performanceReason: "Updates the shared thaw-front uniform.",
      step: 1,
      target: "effect.progress",
      unit: "%",
    }),
    transition: slider({
      defaultValue: frozenDefaultSceneValues["effect.transition"],
      description: "Sets the noisy ice-to-source blend width.",
      label: "Transition",
      max: 30,
      min: 1,
      performanceReason: "Updates the mask transition uniform.",
      step: 1,
      target: "effect.transition",
      unit: "%",
    }),
    noiseScale: slider({
      defaultValue: frozenDefaultSceneValues["effect.noiseScale"],
      description: "Sets object-space lobe size along the thaw front.",
      label: "Noise scale",
      max: 8,
      min: 0.5,
      performanceReason: "Updates fixed-cost boundary noise frequency.",
      step: 0.1,
      target: "effect.noiseScale",
    }),
    turbulence: slider({
      defaultValue: frozenDefaultSceneValues["effect.turbulence"],
      description: "Breaks up a straight horizontal boundary.",
      label: "Turbulence",
      max: 40,
      min: 0,
      performanceReason: "Updates boundary displacement amplitude.",
      step: 1,
      target: "effect.turbulence",
      unit: "%",
    }),
  },
  title: "Thaw Front",
} satisfies ToolcraftControlSectionSchema;

const meltBrushVisibility = {
  equals: true,
  target: "melt.enabled",
} as const;

const meltBrushSection = {
  controls: {
    enabled: {
      defaultValue: frozenDefaultSceneValues["melt.enabled"],
      description:
        "Press M to toggle. Locks the model pose and turns primary drags on visible geometry into heat painting.",
      label: "Paint melt",
      orderRole: "mode",
      ...responsive(
        "Changes pointer ownership and the non-exported geometry brush cursor.",
      ),
      target: "melt.enabled",
      type: "switch",
    },
    heat: slider({
      defaultValue: frozenDefaultSceneValues["melt.heat"],
      description:
        "Raises peak temperature, widens the effective footprint, and collapses more frozen structure.",
      label: "Heat",
      max: 100,
      min: 0,
      orderRole: "input",
      performanceReason:
        "Updates bounded heat deposition and fixed-cost thermal threshold uniforms.",
      step: 1,
      target: "melt.heat",
      unit: "%",
      visibleWhen: meltBrushVisibility,
    }),
    radius: slider({
      defaultValue: frozenDefaultSceneValues["melt.radius"],
      description: "Sets the object-space footprint on the actual raycast surface.",
      label: "Radius",
      max: 100,
      min: 1,
      performanceReason:
        "Changes a bounded local voxel kernel and the textless brush cursor.",
      step: 1,
      target: "melt.radius",
      unit: "%",
      visibleWhen: meltBrushVisibility,
    }),
    structure: slider({
      defaultValue: frozenDefaultSceneValues["melt.structure"],
      description:
        "Breaks the thermal boundary into granular islands instead of a circular cutout.",
      label: "Structure",
      max: 100,
      min: 0,
      performanceReason:
        "Updates two fixed-cost object-space threshold noise octaves.",
      step: 1,
      target: "melt.structure",
      unit: "%",
      visibleWhen: meltBrushVisibility,
    }),
    refreeze: slider({
      defaultValue: frozenDefaultSceneValues["melt.refreeze"],
      description:
        "Controls diffusion and cooling strength; zero keeps painted melt indefinitely.",
      label: "Refreeze",
      max: 100,
      min: 0,
      performanceReason:
        "Changes the bounded thermal simulation lifetime without changing field size.",
      step: 1,
      target: "melt.refreeze",
      unit: "%",
      visibleWhen: meltBrushVisibility,
    }),
    refreezeMode: {
      defaultValue: frozenDefaultSceneValues["melt.refreezeMode"],
      description:
        "Starts cooling either while the pointer is held or only after the stroke ends.",
      label: "Refreeze mode",
      options: [
        { label: "Drawing", value: "during-stroke" },
        { label: "Release", value: "after-release" },
      ],
      orderRole: "mode",
      ...responsive(
        "Changes when the bounded thermal animation runs without changing field size.",
      ),
      target: "melt.refreezeMode",
      type: "segmented",
      visibleWhen: meltBrushVisibility,
    },
    refreezeAction: {
      actions: [{ label: "Refreeze", value: "melt.refreeze-all" }],
      defaultValue: null,
      label: "Current mask",
      orderRole: "action",
      ...responsive(
        "Clears the bounded renderer-owned thermal field and redraws the retained scene once.",
      ),
      target: "melt.action",
      type: "actions",
      visibleWhen: meltBrushVisibility,
    },
  },
  title: "Melt Brush",
} satisfies ToolcraftControlSectionSchema;

const geometrySlider = (
  options: SliderOptions & Readonly<{ semanticGroup: string }>,
) => slider(options);

const iceGeometrySection = {
  controls: {
    shellThickness: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.shellThickness"],
      description: "Expands the physical shell along source normals.",
      label: "Shell thickness",
      max: 12,
      min: 0,
      performanceReason: "Updates retained shell displacement.",
      semanticGroup: "ice-shell",
      step: 0.25,
      target: "ice.shellThickness",
      unit: "%",
    }),
    crystalDensity: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.crystalDensity"],
      description:
        "Covers a geometry-relative share of the current frozen region.",
      label: "Surface coverage",
      max: 100,
      min: 0,
      performanceReason:
        "Instance cost grows with the geometry-derived surface sample pool.",
      performanceRole: "workload",
      semanticGroup: "crystal-form",
      step: 1,
      target: "ice.crystalDensity",
      unit: "%",
    }),
    crystalSize: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.crystalSize"],
      description: "Sets crystal base width.",
      label: "Crystal size",
      max: 100,
      min: 0,
      performanceReason: "Updates retained crystal matrices.",
      semanticGroup: "crystal-form",
      step: 1,
      target: "ice.crystalSize",
      unit: "%",
    }),
    crystalElongation: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.crystalElongation"],
      description: "Stretches crystals away from the surface.",
      label: "Elongation",
      max: 100,
      min: 0,
      performanceReason: "Updates retained crystal matrices.",
      semanticGroup: "crystal-form",
      step: 1,
      target: "ice.crystalElongation",
      unit: "%",
    }),
    crystalVariation: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.crystalVariation"],
      description: "Randomizes crystal form deterministically.",
      label: "Crystal variation",
      max: 100,
      min: 0,
      performanceReason: "Updates retained crystal matrices.",
      semanticGroup: "crystal-form",
      step: 1,
      target: "ice.crystalVariation",
      unit: "%",
    }),
    icicleDensity: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.icicleDensity"],
      description:
        "Covers a geometry-relative share of eligible drainage sites: underside faces for 3D and gravity-driven lower contours for image slabs.",
      label: "Icicle coverage",
      max: 100,
      min: 0,
      performanceReason:
        "Instance cost grows with the geometry-derived eligible drainage sample pool.",
      performanceRole: "workload",
      semanticGroup: "icicle-form",
      step: 1,
      target: "ice.icicleDensity",
      unit: "%",
    }),
    icicleLength: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.icicleLength"],
      description: "Sets icicle length, including exact zero.",
      label: "Icicle length",
      max: 100,
      min: 0,
      performanceReason: "Updates retained icicle matrices.",
      semanticGroup: "icicle-form",
      step: 1,
      target: "ice.icicleLength",
      unit: "%",
    }),
    icicleRadius: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.icicleRadius"],
      description: "Sets icicle radius, including exact zero.",
      label: "Icicle radius",
      max: 100,
      min: 0,
      performanceReason: "Updates retained icicle matrices.",
      semanticGroup: "icicle-form",
      step: 1,
      target: "ice.icicleRadius",
      unit: "%",
    }),
    icicleVariation: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.icicleVariation"],
      description: "Randomizes icicle form deterministically.",
      label: "Icicle variation",
      max: 100,
      min: 0,
      performanceReason: "Updates retained icicle matrices.",
      semanticGroup: "icicle-form",
      step: 1,
      target: "ice.icicleVariation",
      unit: "%",
    }),
    icicleUnderside: geometrySlider({
      defaultValue: frozenDefaultSceneValues["ice.icicleUnderside"],
      description: "Requires increasingly downward-facing normals.",
      label: "Underside",
      max: 95,
      min: 0,
      performanceReason: "Filters retained icicle candidates.",
      semanticGroup: "icicle-form",
      step: 1,
      target: "ice.icicleUnderside",
      unit: "%",
      visibleWhen: { equals: "model", target: "source.mode" },
    }),
  },
  title: "Ice Geometry",
} satisfies ToolcraftControlSectionSchema;

const iceSurfaceSection = {
  controls: {
    color: {
      defaultValue: frozenDefaultSceneValues["ice.color"],
      label: "Tint",
      orderRole: "detail",
      ...responsive("Updates all retained physical ice materials."),
      target: "ice.color",
      type: "color",
    },
    transmission: slider({
      defaultValue: frozenDefaultSceneValues["ice.transmission"],
      description: "Controls physical refraction and light transmission.",
      label: "Transmission",
      max: 100,
      min: 0,
      performanceReason:
        "Enables a full-resolution physical transmission pass.",
      performanceRole: "workload",
      step: 1,
      target: "ice.transmission",
      unit: "%",
    }),
    ior: slider({
      defaultValue: frozenDefaultSceneValues["ice.ior"],
      description: "Sets refraction; Blender reference is 1.45.",
      label: "IOR",
      max: 1.8,
      min: 1,
      performanceReason: "Updates physical IOR.",
      step: 0.01,
      target: "ice.ior",
    }),
    roughness: slider({
      defaultValue: frozenDefaultSceneValues["ice.roughness"],
      description: "Broadens HDR reflections.",
      label: "Roughness",
      max: 100,
      min: 0,
      performanceReason: "Updates base roughness.",
      step: 1,
      target: "ice.roughness",
      unit: "%",
    }),
    roughnessVariation: slider({
      defaultValue: frozenDefaultSceneValues["ice.roughnessVariation"],
      description: "Adds low-frequency frosted variation.",
      label: "Roughness variation",
      max: 100,
      min: 0,
      performanceReason: "Updates procedural roughness variation.",
      step: 1,
      target: "ice.roughnessVariation",
      unit: "%",
    }),
  },
  title: "Ice Surface",
} satisfies ToolcraftControlSectionSchema;

const materialMaskSection = {
  controls: {
    frostCoverage: slider({
      defaultValue: frozenDefaultSceneValues["ice.materialMaskCoverage"],
      description: "Blends transparent ice into the current frost material.",
      label: "Frost coverage",
      max: 100,
      min: 0,
      performanceReason: "Updates the fixed-cost Voronoi material mask.",
      step: 1,
      target: "ice.materialMaskCoverage",
      unit: "%",
    }),
    cellScale: slider({
      defaultValue: frozenDefaultSceneValues["ice.materialMaskScale"],
      description: "Sets object-space Voronoi cell frequency.",
      label: "Scale",
      max: 20,
      min: 0.5,
      performanceReason: "Updates Voronoi cell frequency without changing cost.",
      step: 0.1,
      target: "ice.materialMaskScale",
    }),
    softness: slider({
      defaultValue: frozenDefaultSceneValues["ice.materialMaskSoftness"],
      description: "Softens the transition between clear ice and frost.",
      label: "Softness",
      max: 50,
      min: 0,
      performanceReason: "Updates the fixed-cost material blend band.",
      step: 1,
      target: "ice.materialMaskSoftness",
      unit: "%",
    }),
    distortion: slider({
      defaultValue: frozenDefaultSceneValues["ice.materialMaskDistortion"],
      description: "Jitters Voronoi cells away from a regular grid.",
      label: "Distortion",
      max: 100,
      min: 0,
      performanceReason: "Updates deterministic cell jitter without changing cost.",
      step: 1,
      target: "ice.materialMaskDistortion",
      unit: "%",
    }),
    seed: slider({
      defaultValue: frozenDefaultSceneValues["ice.materialMaskSeed"],
      description: "Selects a deterministic Voronoi arrangement.",
      label: "Seed",
      max: 100,
      min: 0,
      performanceReason: "Offsets the deterministic material mask.",
      step: 1,
      target: "ice.materialMaskSeed",
    }),
  },
  title: "Material Mask",
} satisfies ToolcraftControlSectionSchema;

const reliefSection = {
  controls: {
    scratchTexture: {
      accept: "image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif",
      assetKind: "file",
      defaultValue: null,
      description: "Loads a grayscale relief map; procedural relief remains the fallback.",
      label: "Scratch map",
      orderRole: "input",
      ...responsive("Decode and luminance conversion run once per file."),
      target: "source.scratchTexture",
      type: "fileDrop",
    },
    scratchScale: slider({
      defaultValue: frozenDefaultSceneValues["scratch.scale"],
      description: "Sets triplanar frequency.",
      label: "Scale",
      max: 100,
      min: 1,
      performanceReason: "Updates scratch mapping scale.",
      step: 1,
      target: "scratch.scale",
    }),
    scratchRotation: slider({
      defaultValue: frozenDefaultSceneValues["scratch.rotation"],
      description: "Rotates every triplanar projection.",
      label: "Rotation",
      max: 180,
      min: -180,
      performanceReason: "Updates scratch mapping rotation.",
      step: 1,
      target: "scratch.rotation",
      unit: "°",
    }),
    scratchInvert: {
      defaultValue: frozenDefaultSceneValues["scratch.invert"],
      description: "Swaps raised and recessed relief.",
      label: "Invert",
      orderRole: "detail",
      ...responsive("Updates scratch inversion."),
      target: "scratch.invert",
      type: "switch",
    },
    scratchContrast: slider({
      defaultValue: frozenDefaultSceneValues["scratch.contrast"],
      description: "Shapes relief contrast.",
      label: "Contrast",
      max: 300,
      min: 0,
      performanceReason: "Updates scratch contrast.",
      step: 1,
      target: "scratch.contrast",
      unit: "%",
    }),
    scratchDisplacement: slider({
      defaultValue: frozenDefaultSceneValues["scratch.displacement"],
      description: "Moves shell vertices from relief.",
      label: "Displacement",
      max: 20,
      min: 0,
      performanceReason: "Updates relief displacement.",
      step: 0.5,
      target: "scratch.displacement",
      unit: "%",
    }),
    scratchBump: slider({
      defaultValue: frozenDefaultSceneValues["scratch.bump"],
      description: "Perturbs physical shading normals.",
      label: "Bump",
      max: 100,
      min: 0,
      performanceReason: "Updates relief normal perturbation.",
      step: 1,
      target: "scratch.bump",
      unit: "%",
    }),
    scratchRoughness: slider({
      defaultValue: frozenDefaultSceneValues["scratch.roughness"],
      description: "Maps relief into reflection sharpness.",
      label: "Roughness influence",
      max: 100,
      min: 0,
      performanceReason: "Updates relief roughness influence.",
      step: 1,
      target: "scratch.roughness",
      unit: "%",
    }),
    scratchOffset: {
      defaultValue: frozenDefaultSceneValues["scratch.offset"],
      description: "Offsets the triplanar relief.",
      label: "Offset",
      orderRole: "detail",
      ...responsive("Updates the two-axis scratch offset."),
      target: "scratch.offset",
      type: "vector",
    },
  },
  title: "Surface Relief",
} satisfies ToolcraftControlSectionSchema;

const lightingSection = {
  controls: {
    environmentIntensity: slider({
      defaultValue: frozenDefaultSceneValues["lighting.environmentIntensity"],
      description: "Sets Delta 2 reflections and ice lighting; source images stay unlit.",
      label: "Environment",
      max: 300,
      min: 0,
      performanceReason: "Updates environment intensity.",
      step: 1,
      target: "lighting.environmentIntensity",
      unit: "%",
    }),
    environmentRotation: slider({
      defaultValue: frozenDefaultSceneValues["lighting.environmentRotation"],
      description: "Rotates HDR features around the object.",
      label: "Environment rotation",
      max: 180,
      min: -180,
      performanceReason: "Updates environment rotation.",
      step: 1,
      target: "lighting.environmentRotation",
      unit: "°",
    }),
    exposure: slider({
      defaultValue: frozenDefaultSceneValues["lighting.exposure"],
      description: "Sets ACES Filmic exposure for lit materials; source images stay unchanged.",
      label: "Exposure",
      max: 200,
      min: 25,
      performanceReason: "Updates tone-mapping exposure.",
      step: 1,
      target: "lighting.exposure",
      unit: "%",
    }),
  },
  title: "Lighting",
} satisfies ToolcraftControlSectionSchema;

export const frozenControlSections = [
  frozenSourceControlSection,
  thawSection,
  meltBrushSection,
  iceGeometrySection,
  iceSurfaceSection,
  materialMaskSection,
  reliefSection,
  lightingSection,
  ...frozenOutputControlSections,
] satisfies readonly ToolcraftControlSectionSchema[];
