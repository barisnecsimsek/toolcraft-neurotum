import {
  defineToolcraft,
  type ToolcraftControlConditionSchema,
  type ToolcraftControlSchema,
  type ToolcraftControlSectionSchema,
} from "@/toolcraft/runtime";

import {
  colorModeOptions,
  duotonePresetOptions,
  extendedColorModeOptions,
  stylizedEffectOptions,
} from "./effect-presets";
import { DEFAULT_ORBIT_POSE } from "./renderer/orbit-camera";

const responsiveness = {
  performanceReason:
    "This control updates GPU uniforms or stable renderer state and must preserve live canvas feedback.",
  performanceRole: "responsiveness",
} as const;

const workload = {
  performanceReason:
    "This control changes source decoding or selects the active full-screen shader workload.",
  performanceRole: "workload",
} as const;

function when(target: string, equals: unknown): ToolcraftControlConditionSchema {
  return { equals, target };
}

function slider({
  defaultValue,
  isWorkload = false,
  label,
  max,
  min,
  step,
  target,
  unit,
  variant,
  visibleWhen,
}: {
  defaultValue: number;
  isWorkload?: boolean;
  label: string;
  max: number;
  min: number;
  step: number;
  target: string;
  unit?: string;
  variant?: string;
  visibleWhen?: ToolcraftControlConditionSchema;
}): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    max,
    min,
    orderRole: "detail",
    step,
    target,
    type: "slider",
    ...(unit ? { unit } : {}),
    ...(variant ? { variant } : {}),
    ...(visibleWhen ? { visibleWhen } : {}),
    ...(isWorkload ? workload : responsiveness),
  };
}

function select({
  defaultValue,
  label,
  options,
  target,
  visibleWhen,
  isWorkload = false,
}: {
  defaultValue: string;
  isWorkload?: boolean;
  label: string;
  options: readonly { label: string; value: string }[];
  target: string;
  visibleWhen?: ToolcraftControlConditionSchema;
}): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    orderRole: "detail",
    options,
    target,
    type: "select",
    ...(visibleWhen ? { visibleWhen } : {}),
    ...(isWorkload ? workload : responsiveness),
  };
}

function segmented(options: Parameters<typeof select>[0]): ToolcraftControlSchema {
  return { ...select(options), type: "segmented" };
}

function switchControl({
  defaultValue,
  label,
  target,
  visibleWhen,
}: {
  defaultValue: boolean;
  label: string;
  target: string;
  visibleWhen?: ToolcraftControlConditionSchema;
}): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    orderRole: "detail",
    target,
    type: "switch",
    ...(visibleWhen ? { visibleWhen } : {}),
    ...responsiveness,
  };
}

function color({
  defaultValue,
  label,
  target,
  visibleWhen,
}: {
  defaultValue: string;
  label: boolean | string;
  target: string;
  visibleWhen?: ToolcraftControlConditionSchema;
}): ToolcraftControlSchema {
  return {
    defaultValue,
    label,
    orderRole: "detail",
    target,
    type: "color",
    ...(visibleWhen ? { visibleWhen } : {}),
    ...responsiveness,
  };
}

function makeDuotoneSection({
  colorModeTarget,
  defaultPreset = "monochrome",
  effectMode,
  prefix,
  title,
}: {
  colorModeTarget?: string;
  defaultPreset?: string;
  effectMode: string;
  prefix: string;
  title: string;
}): ToolcraftControlSectionSchema {
  const duotoneVisibility = colorModeTarget
    ? when(colorModeTarget, "duotone")
    : undefined;
  const manualVisibility = when(`${prefix}.preset`, "manual");

  return {
    controls: {
      preset: select({
        defaultValue: defaultPreset,
        label: "Preset",
        options: duotonePresetOptions,
        target: `${prefix}.preset`,
        visibleWhen: duotoneVisibility,
      }),
      ink: color({
        defaultValue: "#000000",
        label: "Ink",
        target: `${prefix}.ink`,
        visibleWhen: manualVisibility,
      }),
      paper: color({
        defaultValue: "#FFFFFF",
        label: "Paper",
        target: `${prefix}.paper`,
        visibleWhen: manualVisibility,
      }),
      colorActions: {
        actions: [
          { label: "Swap", value: `colors.swap:${prefix}` },
          { icon: "shuffle", label: "Randomize", value: `colors.randomize:${prefix}` },
        ],
        defaultValue: null,
        label: "Manual colors",
        orderRole: "action",
        performanceReason: "Color utilities dispatch two bounded uniform updates.",
        performanceRole: "responsiveness",
        target: `${prefix}.actions`,
        type: "actions",
        visibleWhen: manualVisibility,
      },
    },
    title,
    visibleWhen: when("effect.mode", effectMode),
  };
}

const pixelateSection: ToolcraftControlSectionSchema = {
  controls: {
    size: slider({
      defaultValue: 8,
      isWorkload: true,
      label: "Size",
      max: 128,
      min: 2,
      step: 1,
      target: "pixelate.size",
    }),
    colorMode: segmented({
      defaultValue: "source",
      label: "Color mode",
      options: colorModeOptions,
      target: "pixelate.colorMode",
    }),
  },
  title: "Pixelate",
  visibleWhen: when("effect.mode", "pixelate"),
};

const ditherSection: ToolcraftControlSectionSchema = {
  controls: {
    size: slider({
      defaultValue: 1,
      isWorkload: true,
      label: "Size",
      max: 16,
      min: 1,
      step: 1,
      target: "dither.size",
    }),
    pattern: select({
      defaultValue: "blue-noise",
      label: "Pattern",
      options: [
        { label: "Coarse 2×2", value: "coarse-2" },
        { label: "Bayer 4×4", value: "bayer-4" },
        { label: "Fine 8×8", value: "fine-8" },
        { label: "Clustered", value: "clustered" },
        { label: "Scanline", value: "scanline" },
        { label: "Diagonal", value: "diagonal" },
        { label: "White Noise", value: "white-noise" },
        { label: "Noise 2×", value: "noise-2" },
        { label: "Blue Noise", value: "blue-noise" },
        { label: "Blue Noise 2×", value: "blue-noise-2" },
        { label: "Blue Noise 0.5×", value: "blue-noise-half" },
        { label: "R2 Noise", value: "r2-noise" },
      ],
      target: "dither.pattern",
    }),
    colorMode: segmented({
      defaultValue: "duotone",
      isWorkload: true,
      label: "Color mode",
      options: extendedColorModeOptions,
      target: "dither.colorMode",
    }),
    levels: slider({
      defaultValue: 4,
      label: "Levels",
      max: 16,
      min: 2,
      step: 1,
      target: "dither.levels",
      variant: "discrete",
      visibleWhen: when("dither.colorMode", "grayscale"),
    }),
    brightness: slider({
      defaultValue: 0,
      label: "Brightness",
      max: 1,
      min: -1,
      step: 0.05,
      target: "dither.brightness",
      visibleWhen: when("dither.colorMode", "source"),
    }),
    contrast: slider({
      defaultValue: 1.5,
      label: "Contrast",
      max: 3,
      min: 0.5,
      step: 0.05,
      target: "dither.contrast",
      visibleWhen: when("dither.colorMode", "source"),
    }),
  },
  title: "Dither",
  visibleWhen: when("effect.mode", "dither"),
};

const asciiSection: ToolcraftControlSectionSchema = {
  controls: {
    shape: select({
      defaultValue: "mixed",
      isWorkload: true,
      label: "Shape",
      options: [
        { label: "Mixed", value: "mixed" },
        { label: "Blocks", value: "blocks" },
        { label: "Circles", value: "circles" },
        { label: "Lines", value: "lines" },
        { label: "Diagonal", value: "diagonal" },
        { label: "Cross", value: "cross" },
        { label: "Diamond", value: "diamond" },
        { label: "Hash @#%&*+=-:.", value: "hash" },
        { label: "Matrix 01アイウエオ", value: "matrix" },
        { label: "Binary 01", value: "binary" },
        { label: "Braille", value: "braille" },
        { label: "Morse ·—", value: "morse" },
        { label: "Dots ·•●○", value: "dots" },
        { label: "Slashes /\\|", value: "slashes" },
        { label: "Custom", value: "custom" },
      ],
      target: "ascii.shape",
    }),
    customCharacters: {
      commitMode: "content",
      defaultValue: "@#%&*+=-:.",
      description: "Characters used for the Custom ASCII shape.",
      label: "Characters",
      orderRole: "detail",
      target: "ascii.characters",
      type: "text",
      visibleWhen: when("ascii.shape", "custom"),
      ...responsiveness,
    },
    size: slider({
      defaultValue: 8,
      isWorkload: true,
      label: "Size",
      max: 50,
      min: 4,
      step: 1,
      target: "ascii.size",
    }),
    brightness: slider({
      defaultValue: 1,
      label: "Brightness",
      max: 2,
      min: 0.5,
      step: 0.01,
      target: "ascii.brightness",
    }),
    spacing: slider({
      defaultValue: 0,
      label: "Spacing",
      max: 0.5,
      min: 0,
      step: 0.01,
      target: "ascii.spacing",
    }),
    invert: switchControl({ defaultValue: false, label: "Invert", target: "ascii.invert" }),
    colorMode: segmented({
      defaultValue: "source",
      label: "Color mode",
      options: colorModeOptions,
      target: "ascii.colorMode",
    }),
  },
  title: "ASCII",
  visibleWhen: when("effect.mode", "ascii"),
};

const halftoneSection: ToolcraftControlSectionSchema = {
  controls: {
    type: segmented({
      defaultValue: "print",
      label: "Type",
      options: [
        { label: "Graphic", value: "graphic" },
        { label: "Print", value: "print" },
      ],
      target: "halftone.type",
    }),
    shape: segmented({
      defaultValue: "circle",
      label: "Shape",
      options: [
        { label: "Circle", value: "circle" },
        { label: "Square", value: "square" },
        { label: "Diamond", value: "diamond" },
        { label: "Cross", value: "cross" },
      ],
      target: "halftone.shape",
    }),
    size: slider({
      defaultValue: 15,
      isWorkload: true,
      label: "Size",
      max: 100,
      min: 5,
      step: 1,
      target: "halftone.size",
    }),
    angle: slider({
      defaultValue: 0,
      label: "Angle",
      max: 360,
      min: 0,
      step: 1,
      target: "halftone.angle",
      unit: "°",
    }),
    spacing: slider({
      defaultValue: 0,
      label: "Spacing",
      max: 0.8,
      min: 0,
      step: 0.01,
      target: "halftone.spacing",
    }),
    invert: switchControl({ defaultValue: false, label: "Invert", target: "halftone.invert" }),
    colorMode: segmented({
      defaultValue: "source",
      label: "Color mode",
      options: colorModeOptions,
      target: "halftone.colorMode",
    }),
  },
  title: "Halftone",
  visibleWhen: when("effect.mode", "halftone"),
};

const mosaicSection: ToolcraftControlSectionSchema = {
  controls: {
    size: slider({
      defaultValue: 16,
      isWorkload: true,
      label: "Size",
      max: 64,
      min: 4,
      step: 1,
      target: "mosaic.size",
    }),
    edges: slider({
      defaultValue: 0.15,
      label: "Edges",
      max: 0.15,
      min: 0,
      step: 0.005,
      target: "mosaic.edges",
    }),
    jitter: slider({
      defaultValue: 0.5,
      label: "Jitter",
      max: 1,
      min: 0,
      step: 0.01,
      target: "mosaic.jitter",
    }),
    edgeColor: color({ defaultValue: "#000000", label: "Edge color", target: "mosaic.edgeColor" }),
    colorMode: segmented({
      defaultValue: "source",
      label: "Color mode",
      options: colorModeOptions,
      target: "mosaic.colorMode",
    }),
  },
  title: "Mosaic",
  visibleWhen: when("effect.mode", "mosaic"),
};

const bricksSection: ToolcraftControlSectionSchema = {
  controls: {
    size: slider({ defaultValue: 22, isWorkload: true, label: "Size", max: 64, min: 8, step: 0.5, target: "bricks.size" }),
    stud: slider({ defaultValue: 0.5, label: "Stud", max: 1, min: 0, step: 0.01, target: "bricks.stud" }),
    bevel: slider({ defaultValue: 0.6, label: "Bevel", max: 1, min: 0, step: 0.01, target: "bricks.bevel" }),
    grout: slider({ defaultValue: 0.08, label: "Grout", max: 0.25, min: 0, step: 0.005, target: "bricks.grout" }),
    light: slider({ defaultValue: 135, label: "Light", max: 360, min: 0, step: 1, target: "bricks.light", unit: "°" }),
    colorMode: segmented({ defaultValue: "source", label: "Color mode", options: colorModeOptions, target: "bricks.colorMode" }),
  },
  title: "Bricks",
  visibleWhen: when("effect.mode", "bricks"),
};

const pointillismSection: ToolcraftControlSectionSchema = {
  controls: {
    shape: segmented({
      defaultValue: "circle",
      label: "Shape",
      options: [
        { label: "Circle", value: "circle" },
        { label: "Square", value: "square" },
        { label: "Diamond", value: "diamond" },
      ],
      target: "pointillism.shape",
    }),
    dotSize: slider({ defaultValue: 6, isWorkload: true, label: "Dot size", max: 24, min: 2, step: 1, target: "pointillism.size" }),
    jitter: slider({ defaultValue: 0.5, label: "Jitter", max: 1, min: 0, step: 0.01, target: "pointillism.jitter" }),
    spacing: slider({ defaultValue: 0, label: "Spacing", max: 0.8, min: 0, step: 0.01, target: "pointillism.spacing" }),
    colorMode: segmented({ defaultValue: "source", label: "Color mode", options: colorModeOptions, target: "pointillism.colorMode" }),
  },
  title: "Pointillism",
  visibleWhen: when("effect.mode", "pointillism"),
};

const heatmapSection: ToolcraftControlSectionSchema = {
  controls: {
    palette: select({
      defaultValue: "thermal",
      label: "Palette",
      options: [
        { label: "Thermal", value: "thermal" },
        { label: "Viridis", value: "viridis" },
        { label: "Plasma", value: "plasma" },
        { label: "Inferno", value: "inferno" },
        { label: "Cool-Warm", value: "cool-warm" },
      ],
      target: "heatmap.palette",
    }),
    brightness: slider({ defaultValue: 0, label: "Brightness", max: 1, min: -1, step: 0.01, target: "heatmap.brightness" }),
    contrast: slider({ defaultValue: 1, label: "Contrast", max: 3, min: 0.5, step: 0.01, target: "heatmap.contrast" }),
    invert: switchControl({ defaultValue: false, label: "Invert", target: "heatmap.invert" }),
    colorMix: slider({ defaultValue: 0, label: "Color mix", max: 1, min: 0, step: 0.01, target: "heatmap.colorMix" }),
    steps: slider({ defaultValue: 0, label: "Steps", max: 8, min: 0, step: 1, target: "heatmap.steps", variant: "discrete" }),
  },
  title: "Heatmap",
  visibleWhen: when("effect.mode", "heatmap"),
};

const thresholdSection: ToolcraftControlSectionSchema = {
  controls: {
    threshold: slider({ defaultValue: 0.5, label: "Threshold", max: 1, min: 0, step: 0.01, target: "threshold.value" }),
    smoothing: slider({ defaultValue: 0, label: "Smoothing", max: 1, min: 0, step: 0.01, target: "threshold.smoothing" }),
    invert: switchControl({ defaultValue: false, label: "Invert", target: "threshold.invert" }),
    colorMode: segmented({ defaultValue: "duotone", isWorkload: true, label: "Color mode", options: extendedColorModeOptions, target: "threshold.colorMode" }),
  },
  title: "Threshold",
  visibleWhen: when("effect.mode", "threshold"),
};

export const productControlSections: readonly ToolcraftControlSectionSchema[] = [
  {
    controls: {
      model: {
        accept: ".glb,.gltf,.obj,model/gltf-binary,model/gltf+json,text/plain",
        assetKind: "file",
        defaultValue: null,
        description: "Upload one GLB, embedded glTF, or OBJ model. Clear it to restore the built-in model.",
        label: "3D model",
        orderRole: "detail",
        target: "source.model",
        type: "fileDrop",
        ...responsiveness,
      },
      orientation: {
        defaultValue: DEFAULT_ORBIT_POSE,
        description:
          "Click an axis to snap, or drag any axis point directly around the orientation sphere.",
        label: false,
        orderRole: "detail",
        target: "view.orbit",
        type: "orientationGizmo",
        ...responsiveness,
      },
    },
    layout: "standalone",
    title: "3D model",
  },
  {
    controls: {
      mode: select({
        defaultValue: "dither",
        isWorkload: true,
        label: "Effect",
        options: stylizedEffectOptions,
        target: "effect.mode",
      }),
      randomize: {
        actions: [{ icon: "shuffle", label: "Randomize", value: "effect.randomize" }],
        defaultValue: null,
        label: "Variation",
        orderRole: "action",
        performanceReason: "Randomize dispatches a bounded set of ordinary uniform updates.",
        performanceRole: "responsiveness",
        target: "effect.actions",
        type: "actions",
        visibleWhen: { notEquals: "none", target: "effect.mode" },
      },
    },
    title: "Stylized Effect",
  },
  pixelateSection,
  makeDuotoneSection({ colorModeTarget: "pixelate.colorMode", effectMode: "pixelate", prefix: "pixelate.colors", title: "Pixelate Colors" }),
  ditherSection,
  makeDuotoneSection({ colorModeTarget: "dither.colorMode", defaultPreset: "tidepool", effectMode: "dither", prefix: "dither.colors", title: "Dither Colors" }),
  asciiSection,
  makeDuotoneSection({ colorModeTarget: "ascii.colorMode", effectMode: "ascii", prefix: "ascii.colors", title: "ASCII Colors" }),
  halftoneSection,
  makeDuotoneSection({ colorModeTarget: "halftone.colorMode", effectMode: "halftone", prefix: "halftone.colors", title: "Halftone Colors" }),
  mosaicSection,
  makeDuotoneSection({ colorModeTarget: "mosaic.colorMode", effectMode: "mosaic", prefix: "mosaic.colors", title: "Mosaic Colors" }),
  bricksSection,
  makeDuotoneSection({ colorModeTarget: "bricks.colorMode", effectMode: "bricks", prefix: "bricks.colors", title: "Bricks Colors" }),
  pointillismSection,
  makeDuotoneSection({ colorModeTarget: "pointillism.colorMode", effectMode: "pointillism", prefix: "pointillism.colors", title: "Pointillism Colors" }),
  heatmapSection,
  thresholdSection,
  makeDuotoneSection({ colorModeTarget: "threshold.colorMode", effectMode: "threshold", prefix: "threshold.colors", title: "Threshold Colors" }),
  makeDuotoneSection({ effectMode: "duotone", prefix: "duotone.colors", title: "Duotone Colors" }),
  {
    controls: {
      toneMapping: select({
        defaultValue: "raw",
        label: "Tone mapping",
        options: [
          { label: "None (Raw)", value: "raw" },
          { label: "ACES Filmic", value: "aces" },
          { label: "AgX", value: "agx" },
          { label: "Neutral", value: "neutral" },
          { label: "Reinhard", value: "reinhard" },
          { label: "Cineon Filmic", value: "cineon" },
          { label: "Punchy", value: "punchy" },
        ],
        target: "adjustments.toneMapping",
      }),
    },
    title: "Tone Mapping",
  },
  {
    controls: {
      exposure: slider({ defaultValue: 0, label: "Exposure", max: 2, min: -2, step: 0.01, target: "adjustments.exposure" }),
      brightness: slider({ defaultValue: 0, label: "Brightness", max: 1, min: -1, step: 0.01, target: "adjustments.brightness" }),
      contrast: slider({ defaultValue: 0, label: "Contrast", max: 1, min: -1, step: 0.01, target: "adjustments.contrast" }),
      saturation: slider({ defaultValue: 0, label: "Saturation", max: 1, min: -1, step: 0.01, target: "adjustments.saturation" }),
      hue: slider({ defaultValue: 0, label: "Hue", max: 360, min: 0, step: 1, target: "adjustments.hue", unit: "°" }),
      temperature: slider({ defaultValue: 0, label: "Temperature", max: 1, min: -1, step: 0.01, target: "adjustments.temperature" }),
      tint: slider({ defaultValue: 0, label: "Tint", max: 1, min: -1, step: 0.01, target: "adjustments.tint" }),
    },
    title: "Color Adjustments",
  },
  {
    controls: {
      enabled: switchControl({ defaultValue: false, label: "Include", target: "blur.enabled" }),
    },
    title: "Blur",
  },
  {
    controls: {
      mode: select({
        defaultValue: "lens",
        label: "Mode",
        options: [
          { label: "Lens Blur", value: "lens" },
          { label: "Tilt Shift", value: "tilt" },
        ],
        target: "blur.mode",
      }),
      easing: select({
        defaultValue: "linear",
        label: "Easing",
        options: [
          { label: "Linear", value: "linear" },
          { label: "Ease In", value: "ease-in" },
          { label: "Ease Out", value: "ease-out" },
          { label: "Ease In-Out", value: "ease-in-out" },
          { label: "Ease In Cubic", value: "ease-in-cubic" },
          { label: "Ease Out Cubic", value: "ease-out-cubic" },
        ],
        target: "blur.easing",
      }),
      focusPoint: {
        coordinateMode: "screen",
        defaultValue: { x: 0, y: 0 },
        label: "Focus point",
        orderRole: "detail",
        target: "blur.focusPoint",
        type: "vector",
        visibleWhen: when("blur.mode", "lens"),
        xLabel: "X",
        yLabel: "Y",
        ...responsiveness,
      },
      position: slider({ defaultValue: 0, label: "Position", max: 0.5, min: -0.5, step: 0.01, target: "blur.position", visibleWhen: when("blur.mode", "tilt") }),
      angle: slider({ defaultValue: 0, label: "Angle", max: 360, min: 0, step: 1, target: "blur.angle", unit: "°", visibleWhen: when("blur.mode", "tilt") }),
    },
    title: "Blur Focus",
    visibleWhen: when("blur.enabled", true),
  },
  {
    controls: {
      focusRange: slider({ defaultValue: 0.2, label: "Focus range", max: 0.5, min: 0, step: 0.01, target: "blur.focusRange" }),
      aperture: slider({ defaultValue: 0.5, label: "Aperture", max: 2, min: 0.1, step: 0.01, target: "blur.aperture" }),
      maxBlur: slider({ defaultValue: 8, label: "Max blur", max: 40, min: 1, step: 0.5, target: "blur.maxBlur" }),
    },
    title: "Blur Strength",
    visibleWhen: when("blur.enabled", true),
  },
  {
    controls: {
      enabled: switchControl({ defaultValue: true, label: "Include", target: "chromatic.enabled" }),
      mode: select({
        defaultValue: "radial",
        label: "Mode",
        options: [
          { label: "Radial", value: "radial" },
          { label: "Directional", value: "directional" },
        ],
        target: "chromatic.mode",
        visibleWhen: when("chromatic.enabled", true),
      }),
      amount: slider({ defaultValue: 0.02, label: "Amount", max: 1, min: 0, step: 0.01, target: "chromatic.amount", visibleWhen: when("chromatic.enabled", true) }),
      angle: slider({ defaultValue: 0, label: "Angle", max: 360, min: 0, step: 1, target: "chromatic.angle", unit: "°", visibleWhen: when("chromatic.mode", "directional") }),
    },
    title: "Chromatic",
  },
  {
    controls: {
      enabled: switchControl({ defaultValue: true, label: "Include", target: "grain.enabled" }),
      mode: select({
        defaultValue: "luminosity",
        label: "Mode",
        options: [
          { label: "Uniform", value: "uniform" },
          { label: "Luminosity", value: "luminosity" },
        ],
        target: "grain.mode",
        visibleWhen: when("grain.enabled", true),
      }),
      amount: slider({ defaultValue: 0.41, label: "Grain", max: 1, min: 0, step: 0.01, target: "grain.amount", visibleWhen: when("grain.enabled", true) }),
      dynamicNoise: switchControl({ defaultValue: true, label: "Dynamic noise", target: "grain.dynamic", visibleWhen: when("grain.enabled", true) }),
    },
    title: "Film Grain",
  },
  {
    controls: {
      enabled: switchControl({ defaultValue: false, label: "Include", target: "bloom.enabled" }),
      strength: slider({ defaultValue: 1.2, label: "Strength", max: 3, min: 0, step: 0.01, target: "bloom.strength", visibleWhen: when("bloom.enabled", true) }),
      mix: slider({ defaultValue: 0.73, label: "Mix", max: 1, min: 0, step: 0.01, target: "bloom.mix", visibleWhen: when("bloom.enabled", true) }),
      threshold: slider({ defaultValue: 0.85, label: "Threshold", max: 1, min: 0, step: 0.01, target: "bloom.threshold", visibleWhen: when("bloom.enabled", true) }),
      softness: slider({ defaultValue: 0.3, label: "Softness", max: 1, min: 0.01, step: 0.01, target: "bloom.softness", visibleWhen: when("bloom.enabled", true) }),
      radius: slider({ defaultValue: 0.5, isWorkload: true, label: "Radius", max: 1, min: 0, step: 0.01, target: "bloom.radius", visibleWhen: when("bloom.enabled", true) }),
      blend: segmented({
        defaultValue: "add",
        label: "Blend",
        options: [
          { label: "Screen", value: "screen" },
          { label: "Add", value: "add" },
        ],
        target: "bloom.blend",
        visibleWhen: when("bloom.enabled", true),
      }),
    },
    title: "Bloom",
  },
  {
    controls: {
      enabled: switchControl({ defaultValue: false, label: "Include", target: "vignette.enabled" }),
      amount: slider({ defaultValue: 0.6, label: "Amount", max: 1, min: 0, step: 0.01, target: "vignette.amount", visibleWhen: when("vignette.enabled", true) }),
      softness: slider({ defaultValue: 0.7, label: "Softness", max: 1, min: 0, step: 0.01, target: "vignette.softness", visibleWhen: when("vignette.enabled", true) }),
    },
    title: "Vignette",
  },
  {
    controls: {
      enabled: switchControl({ defaultValue: false, label: "Include", target: "overlay.enabled" }),
    },
    title: "Gradient Overlay",
  },
  {
    controls: {
      preset: select({
        defaultValue: "manual",
        label: "Preset",
        options: duotonePresetOptions,
        target: "overlay.preset",
      }),
      start: color({
        defaultValue: "#000000",
        label: "Start",
        target: "overlay.start",
        visibleWhen: when("overlay.preset", "manual"),
      }),
      end: color({
        defaultValue: "#FFFFFF",
        label: "End",
        target: "overlay.end",
        visibleWhen: when("overlay.preset", "manual"),
      }),
      colorActions: {
        actions: [{ label: "Swap", value: "overlay.swap" }],
        defaultValue: null,
        label: "Colors",
        orderRole: "detail",
        target: "overlay.actions",
        type: "actions",
        visibleWhen: when("overlay.preset", "manual"),
        ...responsiveness,
      },
      angle: slider({ defaultValue: 45, label: "Angle", max: 360, min: 0, step: 1, target: "overlay.angle", unit: "°" }),
      opacity: slider({ defaultValue: 0.6, label: "Opacity", max: 1, min: 0, step: 0.01, target: "overlay.opacity" }),
    },
    title: "Overlay Settings",
    visibleWhen: when("overlay.enabled", true),
  },
  {
    controls: {
      includeBackground: {
        ...switchControl({ defaultValue: true, label: "Include", target: "export.includeBackground" }),
        description: "Shows the product background in preview and exported PNG output.",
      },
      background: color({ defaultValue: "#1C1C1E", label: false, target: "scene.background" }),
    },
    layoutGroups: [{ columns: 2, controls: ["includeBackground", "background"], layout: "inline" }],
    title: "Background",
  },
  {
    controls: {
      format: select({
        defaultValue: "png",
        label: "Format",
        options: [
          { label: "PNG", value: "png" },
          { label: "JPG", value: "jpg" },
        ],
        target: "export.image.format",
      }),
      resolution: select({
        defaultValue: "4k",
        isWorkload: true,
        label: "Resolution",
        options: [
          { label: "2K", value: "2k" },
          { label: "4K", value: "4k" },
          { label: "8K", value: "8k" },
        ],
        target: "export.image.resolution",
      }),
    },
    layoutGroups: [{ columns: 2, controls: ["format", "resolution"], layout: "inline" }],
    title: "Image Export",
  },
  {
    controls: {
      output: {
        actions: [{ icon: "upload-simple", label: "Export PNG", value: "export.png" }],
        defaultValue: null,
        target: "actions.output",
        type: "panelActions",
      },
    },
    title: "Output",
  },
];

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: { defaultValue: 2, enabled: true, max: 2, min: 1, step: 1 },
    size: { height: 1080, unit: "px", width: 1920 },
    sizing: { mode: "editable-output" },
    upload: true,
  },
  export: { png: { background: "include" } },
  panels: {
    controls: {
      sections: productControlSections,
      title: "Mesh FX",
    },
  },
  persistence: { storage: "none" },
  settingsTransfer: {
    appId: "mesh-fx-lab",
    enabled: "auto",
    fileName: "mesh-fx-settings.json",
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
