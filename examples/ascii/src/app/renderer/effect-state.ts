import {
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { resolveDuotoneColors } from "../effect-presets";
import {
  readOrbitPose,
  type OrbitPose,
} from "./orbit-camera";

export type EffectsRendererSettings = {
  adjustments: {
    brightness: number;
    contrast: number;
    exposure: number;
    hue: number;
    saturation: number;
    temperature: number;
    tint: number;
    toneMapping: number;
  };
  ascii: {
    brightness: number;
    characters: string;
    colorMode: number;
    invert: boolean;
    shape: number;
    size: number;
    spacing: number;
  };
  background: string;
  bloom: {
    blend: number;
    enabled: boolean;
    mix: number;
    radius: number;
    softness: number;
    strength: number;
    threshold: number;
  };
  blur: {
    angle: number;
    aperture: number;
    easing: number;
    enabled: boolean;
    focusPoint: { x: number; y: number };
    focusRange: number;
    maxBlur: number;
    mode: number;
    position: number;
  };
  bricks: {
    bevel: number;
    colorMode: number;
    grout: number;
    light: number;
    size: number;
    stud: number;
  };
  chromatic: {
    amount: number;
    angle: number;
    enabled: boolean;
    mode: number;
  };
  dither: {
    brightness: number;
    colorMode: number;
    contrast: number;
    levels: number;
    pattern: number;
    size: number;
  };
  duotone: { ink: string; paper: string };
  effect: number;
  grain: {
    amount: number;
    animate: boolean;
    enabled: boolean;
    mode: number;
  };
  halftone: {
    angle: number;
    colorMode: number;
    invert: boolean;
    shape: number;
    size: number;
    spacing: number;
    type: number;
  };
  heatmap: {
    brightness: number;
    colorMix: number;
    contrast: number;
    invert: boolean;
    palette: number;
    steps: number;
  };
  includeBackground: boolean;
  orbitPose: OrbitPose;
  mosaic: {
    colorMode: number;
    edgeColor: string;
    edges: number;
    jitter: number;
    size: number;
  };
  overlay: {
    angle: number;
    enabled: boolean;
    end: string;
    opacity: number;
    start: string;
  };
  pixelate: {
    colorMode: number;
    size: number;
  };
  pointillism: {
    colorMode: number;
    jitter: number;
    shape: number;
    size: number;
    spacing: number;
  };
  threshold: {
    colorMode: number;
    invert: boolean;
    smoothing: number;
    value: number;
  };
  vignette: {
    amount: number;
    enabled: boolean;
    softness: number;
  };
};

function valueAt(state: ToolcraftState, target: string): unknown {
  return state.values[target];
}

function asNumber(state: ToolcraftState, target: string, fallback: number): number {
  const value = valueAt(state, target);
  const numericValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function asBoolean(state: ToolcraftState, target: string, fallback = false): boolean {
  const value = valueAt(state, target);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value.toLowerCase() === "on";
  }

  return fallback;
}

function asString(state: ToolcraftState, target: string, fallback: string): string {
  const value = valueAt(state, target);
  return typeof value === "string" ? value : fallback;
}

function asColor(state: ToolcraftState, target: string, fallback: string): string {
  const value = valueAt(state, target);

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "hex" in value) {
    const hex = (value as { hex?: unknown }).hex;
    return typeof hex === "string" ? hex : fallback;
  }

  return fallback;
}

function enumIndex(state: ToolcraftState, target: string, options: readonly string[]): number {
  return Math.max(0, options.indexOf(asString(state, target, options[0] ?? "")));
}

function colorMode(state: ToolcraftState, target: string, fallback = "source"): number {
  return enumIndex(state, target, ["source", "duotone", "grayscale"].includes(fallback)
    ? ["source", "duotone", "grayscale"]
    : [fallback, "duotone", "grayscale"]);
}

function printColorMode(state: ToolcraftState, target: string): number {
  const value = asString(state, target, "duotone");
  return Math.max(0, ["duotone", "grayscale", "source"].indexOf(value));
}

function resolveColors(state: ToolcraftState, prefix: string): { ink: string; paper: string } {
  return resolveDuotoneColors({
    ink: asColor(state, `${prefix}.ink`, "#000000"),
    paper: asColor(state, `${prefix}.paper`, "#FFFFFF"),
    preset: asString(state, `${prefix}.preset`, "monochrome"),
  });
}

function asVector(
  state: ToolcraftState,
  target: string,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  const value = valueAt(state, target);

  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const record = value as { x?: unknown; y?: unknown };
  const x = Number(record.x);
  const y = Number(record.y);

  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
  };
}

function readOverlaySettings(state: ToolcraftState): EffectsRendererSettings["overlay"] {
  const colors = resolveDuotoneColors({
    ink: asColor(state, "overlay.start", "#000000"),
    paper: asColor(state, "overlay.end", "#FFFFFF"),
    preset: asString(state, "overlay.preset", "manual"),
  });
  return {
    angle: asNumber(state, "overlay.angle", 45),
    enabled: asBoolean(state, "overlay.enabled"),
    end: colors.paper,
    opacity: asNumber(state, "overlay.opacity", 0.6),
    start: colors.ink,
  };
}

export function readEffectsRendererSettings(state: ToolcraftState): EffectsRendererSettings {
  const effectName = asString(state, "effect.mode", "none");
  const activeColorPrefix =
    effectName === "duotone" ? "duotone.colors" : `${effectName}.colors`;
  const blurFocusPoint = asVector(state, "blur.focusPoint", { x: 0, y: 0 });
  const chromaticDisplayAmount = asNumber(state, "chromatic.amount", 0.05);
  const grainDisplayAmount = asNumber(state, "grain.amount", 0.41);

  return {
    adjustments: {
      brightness: asNumber(state, "adjustments.brightness", 0),
      contrast: asNumber(state, "adjustments.contrast", 0),
      exposure: asNumber(state, "adjustments.exposure", 0),
      hue: asNumber(state, "adjustments.hue", 0),
      saturation: asNumber(state, "adjustments.saturation", 0),
      temperature: asNumber(state, "adjustments.temperature", 0),
      tint: asNumber(state, "adjustments.tint", 0),
      toneMapping: enumIndex(state, "adjustments.toneMapping", [
        "raw",
        "aces",
        "agx",
        "neutral",
        "reinhard",
        "cineon",
        "punchy",
      ]),
    },
    ascii: {
      brightness: asNumber(state, "ascii.brightness", 1),
      characters: asString(state, "ascii.characters", "@#%&*+=-:."),
      colorMode: colorMode(state, "ascii.colorMode"),
      invert: asBoolean(state, "ascii.invert"),
      shape: enumIndex(state, "ascii.shape", [
        "mixed",
        "blocks",
        "circles",
        "lines",
        "diagonal",
        "cross",
        "diamond",
        "hash",
        "matrix",
        "binary",
        "braille",
        "morse",
        "dots",
        "slashes",
        "custom",
      ]),
      size: asNumber(state, "ascii.size", 8),
      spacing: asNumber(state, "ascii.spacing", 0),
    },
    background: asColor(state, "scene.background", "#1C1C1E"),
    bloom: {
      blend: enumIndex(state, "bloom.blend", ["screen", "add"]),
      enabled: asBoolean(state, "bloom.enabled"),
      mix: asNumber(state, "bloom.mix", 1),
      radius: asNumber(state, "bloom.radius", 0.5),
      softness: asNumber(state, "bloom.softness", 0.3),
      strength: asNumber(state, "bloom.strength", 0.4),
      threshold: asNumber(state, "bloom.threshold", 0.85),
    },
    blur: {
      angle: asNumber(state, "blur.angle", 0) * (Math.PI / 180),
      aperture: asNumber(state, "blur.aperture", 0.5),
      easing: enumIndex(state, "blur.easing", [
        "linear",
        "ease-in",
        "ease-out",
        "ease-in-out",
        "ease-in-cubic",
        "ease-out-cubic",
      ]),
      enabled: asBoolean(state, "blur.enabled"),
      focusPoint: { x: blurFocusPoint.x, y: -blurFocusPoint.y },
      focusRange: asNumber(state, "blur.focusRange", 0.2),
      maxBlur: asNumber(state, "blur.maxBlur", 8),
      mode: enumIndex(state, "blur.mode", ["lens", "tilt"]),
      position: asNumber(state, "blur.position", 0),
    },
    bricks: {
      bevel: asNumber(state, "bricks.bevel", 0.6),
      colorMode: colorMode(state, "bricks.colorMode"),
      grout: asNumber(state, "bricks.grout", 0.08),
      light: asNumber(state, "bricks.light", 135),
      size: asNumber(state, "bricks.size", 22),
      stud: asNumber(state, "bricks.stud", 0.5),
    },
    chromatic: {
      amount: chromaticDisplayAmount * 0.1,
      angle: asNumber(state, "chromatic.angle", 0),
      enabled: asBoolean(state, "chromatic.enabled"),
      mode: enumIndex(state, "chromatic.mode", ["radial", "directional"]),
    },
    dither: {
      brightness: asNumber(state, "dither.brightness", 0),
      colorMode: printColorMode(state, "dither.colorMode"),
      contrast: asNumber(state, "dither.contrast", 1.5),
      levels: asNumber(state, "dither.levels", 4),
      pattern: ({
        "bayer-4": 1,
        "blue-noise": 7,
        "blue-noise-2": 9,
        "blue-noise-half": 10,
        "clustered": 3,
        "coarse-2": 0,
        diagonal: 8,
        "fine-8": 2,
        "noise-2": 6,
        "r2-noise": 11,
        scanline: 4,
        "white-noise": 5,
      } as Record<string, number>)[asString(state, "dither.pattern", "fine-8")] ?? 2,
      size: asNumber(state, "dither.size", 2),
    },
    duotone: resolveColors(state, activeColorPrefix),
    effect: enumIndex(state, "effect.mode", stylizedEffectNames),
    grain: {
      amount: 0.3 * grainDisplayAmount ** 2,
      animate: asBoolean(state, "grain.dynamic", true),
      enabled: asBoolean(state, "grain.enabled"),
      mode: enumIndex(state, "grain.mode", ["uniform", "luminosity"]),
    },
    halftone: {
      angle: asNumber(state, "halftone.angle", 0),
      colorMode: colorMode(state, "halftone.colorMode"),
      invert: asBoolean(state, "halftone.invert"),
      shape: enumIndex(state, "halftone.shape", ["circle", "square", "diamond", "cross"]),
      size: asNumber(state, "halftone.size", 15),
      spacing: asNumber(state, "halftone.spacing", 0),
      type: enumIndex(state, "halftone.type", ["graphic", "print"]),
    },
    heatmap: {
      brightness: asNumber(state, "heatmap.brightness", 0),
      colorMix: asNumber(state, "heatmap.colorMix", 0),
      contrast: asNumber(state, "heatmap.contrast", 1),
      invert: asBoolean(state, "heatmap.invert"),
      palette: enumIndex(state, "heatmap.palette", [
        "thermal",
        "viridis",
        "plasma",
        "inferno",
        "cool-warm",
      ]),
      steps: asNumber(state, "heatmap.steps", 0),
    },
    includeBackground: shouldIncludeToolcraftPreviewBackground({ state }),
    orbitPose: readOrbitPose(valueAt(state, "view.orbit")),
    mosaic: {
      colorMode: colorMode(state, "mosaic.colorMode"),
      edgeColor: asColor(state, "mosaic.edgeColor", "#000000"),
      edges: asNumber(state, "mosaic.edges", 0.15),
      jitter: asNumber(state, "mosaic.jitter", 0.5),
      size: asNumber(state, "mosaic.size", 16),
    },
    overlay: readOverlaySettings(state),
    pixelate: {
      colorMode: colorMode(state, "pixelate.colorMode"),
      size: asNumber(state, "pixelate.size", 8),
    },
    pointillism: {
      colorMode: colorMode(state, "pointillism.colorMode"),
      jitter: asNumber(state, "pointillism.jitter", 0.5),
      shape: enumIndex(state, "pointillism.shape", ["circle", "square", "diamond"]),
      size: asNumber(state, "pointillism.size", 6),
      spacing: asNumber(state, "pointillism.spacing", 0),
    },
    threshold: {
      colorMode: printColorMode(state, "threshold.colorMode"),
      invert: asBoolean(state, "threshold.invert"),
      smoothing: asNumber(state, "threshold.smoothing", 0),
      value: asNumber(state, "threshold.value", 0.5),
    },
    vignette: {
      amount: asNumber(state, "vignette.amount", 0.6),
      enabled: asBoolean(state, "vignette.enabled"),
      softness: asNumber(state, "vignette.softness", 0.7),
    },
  };
}

const stylizedEffectNames = [
  "none",
  "pixelate",
  "dither",
  "ascii",
  "halftone",
  "mosaic",
  "bricks",
  "pointillism",
  "heatmap",
  "threshold",
  "duotone",
] as const;
