import type { LiquidMetalProps } from "@paper-design/shaders-react";

import {
  getToolcraftTimelineLoopProgress,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { getLiquidMetalScratchSettings } from "./liquid-metal-scratches";

export type LiquidMetalPresetId = "backdrop" | "default" | "noir" | "stripes";

export type LiquidMetal3DSettings = {
  angle: number;
  background: string;
  colorBack: string;
  colorTint: string;
  contour: number;
  distortion: number;
  fit: "contain" | "cover";
  frame: number;
  includeBackground: boolean;
  loopProgress: number;
  modelScale: number;
  offsetX: number;
  offsetY: number;
  repetition: number;
  rotation: number;
  scale: number;
  scratchDepth: number;
  scratchInvert: boolean;
  scratchScale: number;
  shiftBlue: number;
  shiftRed: number;
  softness: number;
  speed: number;
};

export type LiquidMetalPresetValues = Omit<
  LiquidMetal3DSettings,
  | "background"
  | "frame"
  | "includeBackground"
  | "loopProgress"
  | "modelScale"
  | "scratchDepth"
  | "scratchInvert"
  | "scratchScale"
>;

const sharedSizing = {
  fit: "contain" as const,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export const liquidMetalReferencePresets: Record<
  LiquidMetalPresetId,
  LiquidMetalPresetValues
> = {
  default: {
    ...sharedSizing,
    angle: 70,
    colorBack: "#AAAAAC",
    colorTint: "#FFFFFF",
    contour: 0.4,
    distortion: 0.07,
    repetition: 2,
    scale: 0.6,
    shiftBlue: 0.3,
    shiftRed: 0.3,
    softness: 0.1,
    speed: 1,
  },
  noir: {
    ...sharedSizing,
    angle: 90,
    colorBack: "#000000",
    colorTint: "#606060",
    contour: 0,
    distortion: 0,
    repetition: 1.5,
    scale: 0.6,
    shiftBlue: 0,
    shiftRed: 0,
    softness: 0.45,
    speed: 1,
  },
  backdrop: {
    ...sharedSizing,
    angle: 90,
    colorBack: "#AAAAAC",
    colorTint: "#FFFFFF",
    contour: 0.4,
    distortion: 0.1,
    repetition: 1.5,
    scale: 1,
    shiftBlue: 0.3,
    shiftRed: 0.3,
    softness: 0.05,
    speed: 1,
  },
  stripes: {
    ...sharedSizing,
    angle: 0,
    colorBack: "#000000",
    colorTint: "#2C5D72",
    contour: 0.4,
    distortion: 0.4,
    repetition: 6,
    scale: 0.6,
    shiftBlue: -1,
    shiftRed: 1,
    softness: 0.8,
    speed: 1,
  },
};

const presetTargets = {
  angle: "shader.angle",
  colorBack: "shader.colorBack",
  colorTint: "shader.colorTint",
  contour: "shader.contour",
  distortion: "shader.distortion",
  fit: "shader.fit",
  offset: "shader.offset",
  repetition: "shader.repetition",
  rotation: "shader.rotation",
  scale: "shader.scale",
  shiftBlue: "shader.shiftBlue",
  shiftRed: "shader.shiftRed",
  softness: "shader.softness",
  speed: "shader.speed",
} as const;

export const liquidMetalPresetTargetValues = (
  presetId: LiquidMetalPresetId,
): readonly { target: string; value: unknown }[] => {
  const preset = liquidMetalReferencePresets[presetId];

  return [
    { target: presetTargets.colorBack, value: { hex: preset.colorBack } },
    { target: presetTargets.colorTint, value: { hex: preset.colorTint } },
    { target: presetTargets.repetition, value: preset.repetition },
    { target: presetTargets.softness, value: preset.softness },
    { target: presetTargets.shiftRed, value: preset.shiftRed },
    { target: presetTargets.shiftBlue, value: preset.shiftBlue },
    { target: presetTargets.distortion, value: preset.distortion },
    { target: presetTargets.contour, value: preset.contour },
    { target: presetTargets.angle, value: preset.angle },
    { target: presetTargets.speed, value: preset.speed },
    { target: presetTargets.scale, value: preset.scale },
    { target: presetTargets.rotation, value: preset.rotation },
    {
      target: presetTargets.offset,
      value: { x: preset.offsetX, y: preset.offsetY },
    },
    { target: presetTargets.fit, value: preset.fit },
    { target: "shader.preset", value: presetId },
  ];
};

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "object" && value !== null && "hex" in value) {
    const hex = (value as { hex?: unknown }).hex;

    if (typeof hex === "string" && hex.length > 0) {
      return hex;
    }
  }

  return fallback;
}

function asCoordinate(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function asOffset(value: unknown): { x: number; y: number } {
  if (typeof value !== "object" || value === null) {
    return { x: 0, y: 0 };
  }

  const offset = value as { x?: unknown; y?: unknown };

  return {
    x: asCoordinate(offset.x),
    y: asCoordinate(offset.y),
  };
}

export function getLiquidMetal3DSettings(
  state: ToolcraftState,
  options: { includeVideoBackground?: boolean; timeSeconds?: number } = {},
): LiquidMetal3DSettings {
  const defaults = liquidMetalReferencePresets.default;
  const offset = asOffset(state.values[presetTargets.offset]);
  const speed = asNumber(state.values[presetTargets.speed], defaults.speed);
  const timeSeconds = options.timeSeconds ?? state.timeline.currentTimeSeconds;
  const loopProgress = getToolcraftTimelineLoopProgress({
    currentTimeSeconds: Math.max(0, timeSeconds),
    durationSeconds: state.timeline.durationSeconds,
  });
  const scratches = getLiquidMetalScratchSettings(state);

  return {
    angle: asNumber(state.values[presetTargets.angle], defaults.angle),
    background: asColor(state.values["appearance.background"], "#AFAFC5"),
    colorBack: asColor(state.values[presetTargets.colorBack], defaults.colorBack),
    colorTint: asColor(state.values[presetTargets.colorTint], defaults.colorTint),
    contour: asNumber(state.values[presetTargets.contour], defaults.contour),
    distortion: asNumber(state.values[presetTargets.distortion], defaults.distortion),
    fit:
      asString(state.values[presetTargets.fit], defaults.fit) === "cover"
        ? "cover"
        : "contain",
    frame: loopProgress * 1000,
    includeBackground: options.includeVideoBackground
      ? true
      : shouldIncludeToolcraftPreviewBackground({ state }),
    loopProgress,
    modelScale: Math.max(
      0.25,
      Math.min(3, asNumber(state.values["model.scale"], 1)),
    ),
    offsetX: offset.x,
    offsetY: offset.y,
    repetition: asNumber(
      state.values[presetTargets.repetition],
      defaults.repetition,
    ),
    rotation: asNumber(state.values[presetTargets.rotation], defaults.rotation),
    scale: asNumber(state.values[presetTargets.scale], defaults.scale),
    scratchDepth: scratches.depth,
    scratchInvert: scratches.invert,
    scratchScale: scratches.scale,
    shiftBlue: asNumber(state.values[presetTargets.shiftBlue], defaults.shiftBlue),
    shiftRed: asNumber(state.values[presetTargets.shiftRed], defaults.shiftRed),
    softness: asNumber(state.values[presetTargets.softness], defaults.softness),
    speed,
  };
}

export function getLiquidMetalPaperProps(
  settings: LiquidMetal3DSettings,
): Pick<
  LiquidMetalProps,
  | "angle"
  | "colorBack"
  | "colorTint"
  | "contour"
  | "distortion"
  | "fit"
  | "frame"
  | "offsetX"
  | "offsetY"
  | "repetition"
  | "rotation"
  | "scale"
  | "shape"
  | "shiftBlue"
  | "shiftRed"
  | "softness"
  | "speed"
> {
  return {
    angle: settings.angle,
    colorBack: settings.colorBack,
    colorTint: settings.colorTint,
    contour: settings.contour,
    distortion: settings.distortion,
    fit: settings.fit,
    frame: settings.frame,
    offsetX: settings.offsetX,
    offsetY: settings.offsetY,
    repetition: settings.repetition,
    rotation: settings.rotation,
    scale: settings.scale,
    shape: "none",
    shiftBlue: settings.shiftBlue,
    shiftRed: settings.shiftRed,
    softness: settings.softness,
    speed: 0,
  };
}
