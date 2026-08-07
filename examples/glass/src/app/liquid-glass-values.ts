import type { ToolcraftState } from "@/toolcraft/runtime";

import {
  liquidGlassDefaultSettings,
  type LiquidGlassSettings,
  type LiquidGlassShape,
  type LiquidGlassTextAlignX,
  type LiquidGlassTextAlignY,
  type LiquidGlassTextureBlendMode,
  type LiquidGlassTextureMode,
  type LiquidGlassTexturePreset,
  type LiquidGlassTextCase,
  type LiquidGlassTextDragTarget,
  type LiquidGlassTextLetterSpacing,
  type LiquidGlassTextLineHeight,
  type LiquidGlassTextStyle,
  type ResolvedLiquidGlassGeometry,
} from "./liquid-glass-types";

const glassShapes = new Set<LiquidGlassShape>([
  "circle",
  "pill",
  "rounded",
  "square",
]);
const textureModes = new Set<LiquidGlassTextureMode>(["image", "off", "preset"]);
const texturePresets = new Set<LiquidGlassTexturePreset>([
  "brushed",
  "etched",
  "grain",
  "speckle",
]);
const textureBlendModes = new Set<LiquidGlassTextureBlendMode>([
  "multiply",
  "normal",
  "overlay",
  "screen",
  "soft-light",
]);
const textAlignXValues = new Set<LiquidGlassTextAlignX>(["center", "left", "right"]);
const textAlignYValues = new Set<LiquidGlassTextAlignY>(["bottom", "middle", "top"]);
const textDragTargets = new Set<LiquidGlassTextDragTarget>(["glass", "text"]);
const textCaseValues = new Set<LiquidGlassTextCase>([
  "capitalize",
  "lowercase",
  "original",
  "titleCase",
  "uppercase",
]);
const textLetterSpacingValues = new Set<LiquidGlassTextLetterSpacing>([
  "normal",
  "tight",
  "tighter",
  "wide",
  "wider",
  "widest",
]);
const textLineHeightValues = new Set<LiquidGlassTextLineHeight>([
  "loose",
  "none",
  "normal",
  "relaxed",
  "snug",
  "tight",
]);
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberValue(
  values: Record<string, unknown>,
  target: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = values[target];
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw)
        : Number.NaN;

  return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function stringValue<TValue extends string>(
  values: Record<string, unknown>,
  target: string,
  fallback: TValue,
  allowed: ReadonlySet<TValue>,
): TValue {
  const raw = values[target];

  return typeof raw === "string" && allowed.has(raw as TValue)
    ? (raw as TValue)
    : fallback;
}

function booleanValue(
  values: Record<string, unknown>,
  target: string,
  fallback: boolean,
): boolean {
  const raw = values[target];

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    return !["false", "off", "no", "transparent", "exclude"].includes(
      raw.trim().toLowerCase(),
    );
  }

  return fallback;
}

function colorValue(
  values: Record<string, unknown>,
  target: string,
  fallback: string,
): string {
  const raw = values[target];

  if (typeof raw === "string" && /^#[0-9a-f]{3,8}$/iu.test(raw)) {
    return raw;
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "hex" in raw &&
    typeof raw.hex === "string" &&
    /^#[0-9a-f]{3,8}$/iu.test(raw.hex)
  ) {
    return raw.hex;
  }

  return fallback;
}

function colorOpacityValue(
  values: Record<string, unknown>,
  target: string,
  fallback: { color: string; opacity: number },
): { color: string; opacity: number } {
  const raw = values[target];

  if (typeof raw === "string" && /^#[0-9a-f]{3,8}$/iu.test(raw)) {
    return fallback;
  }

  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const color =
    "hex" in raw && typeof raw.hex === "string" && /^#[0-9a-f]{3,8}$/iu.test(raw.hex)
      ? raw.hex
      : "color" in raw &&
          typeof raw.color === "string" &&
          /^#[0-9a-f]{3,8}$/iu.test(raw.color)
        ? raw.color
        : fallback.color;
  const opacity =
    "opacity" in raw
      ? typeof raw.opacity === "number"
        ? raw.opacity
        : typeof raw.opacity === "string"
          ? Number.parseFloat(raw.opacity)
          : Number.NaN
      : fallback.opacity;

  return {
    color,
    opacity: Number.isFinite(opacity) ? clamp(opacity, 0, 100) : fallback.opacity,
  };
}

function textContentValue(
  values: Record<string, unknown>,
  target: string,
  fallback: string,
): string {
  const raw = values[target];

  if (typeof raw !== "string") {
    return fallback;
  }

  return raw.slice(0, 800);
}

function fontPickerValue(
  values: Record<string, unknown>,
  target: string,
  fallback: LiquidGlassTextStyle,
): LiquidGlassTextStyle {
  const raw = values[target];

  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const color =
    "color" in raw &&
    typeof raw.color === "string" &&
    /^#[0-9a-f]{3,8}$/iu.test(raw.color)
      ? raw.color
      : fallback.color;
  const fontId =
    "fontId" in raw && typeof raw.fontId === "string" && raw.fontId.trim()
      ? raw.fontId.trim().toLowerCase()
      : fallback.fontId;
  const fontSize =
    "fontSize" in raw
      ? typeof raw.fontSize === "number"
        ? raw.fontSize
        : typeof raw.fontSize === "string"
          ? Number.parseFloat(raw.fontSize)
          : Number.NaN
      : fallback.fontSize;
  const opacity =
    "opacity" in raw
      ? typeof raw.opacity === "number"
        ? raw.opacity
        : typeof raw.opacity === "string"
          ? Number.parseFloat(raw.opacity)
          : Number.NaN
      : fallback.opacity;

  return {
    color,
    fontId,
    fontSize: Number.isFinite(fontSize) ? clamp(fontSize, 8, 240) : fallback.fontSize,
    fontWeight:
      "fontWeight" in raw && typeof raw.fontWeight === "string"
        ? raw.fontWeight
        : fallback.fontWeight,
    letterSpacing:
      "letterSpacing" in raw &&
      typeof raw.letterSpacing === "string" &&
      textLetterSpacingValues.has(raw.letterSpacing as LiquidGlassTextLetterSpacing)
        ? (raw.letterSpacing as LiquidGlassTextLetterSpacing)
        : fallback.letterSpacing,
    lineHeight:
      "lineHeight" in raw &&
      typeof raw.lineHeight === "string" &&
      textLineHeightValues.has(raw.lineHeight as LiquidGlassTextLineHeight)
        ? (raw.lineHeight as LiquidGlassTextLineHeight)
        : fallback.lineHeight,
    opacity: Number.isFinite(opacity) ? clamp(opacity, 0, 100) : fallback.opacity,
    textCase:
      "textCase" in raw &&
      typeof raw.textCase === "string" &&
      textCaseValues.has(raw.textCase as LiquidGlassTextCase)
        ? (raw.textCase as LiquidGlassTextCase)
        : fallback.textCase,
  };
}

function vectorValue(
  values: Record<string, unknown>,
  target: string,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  const raw = values[target];

  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const parseAxis = (value: unknown, fallbackValue: number) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallbackValue;
    }

    return fallbackValue;
  };
  const x = "x" in raw ? parseAxis(raw.x, fallback.x) : fallback.x;
  const y = "y" in raw ? parseAxis(raw.y, fallback.y) : fallback.y;

  return {
    x: clamp((x + 1) / 2, 0, 1),
    y: clamp((y + 1) / 2, 0, 1),
  };
}

function rawVectorValue(
  values: Record<string, unknown>,
  target: string,
  fallback: { x: number; y: number },
  min: number,
  max: number,
): { x: number; y: number } {
  const raw = values[target];

  if (typeof raw !== "object" || raw === null) {
    return fallback;
  }

  const parseAxis = (value: unknown, fallbackValue: number) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallbackValue;
    }

    return fallbackValue;
  };
  const x = "x" in raw ? parseAxis(raw.x, fallback.x) : fallback.x;
  const y = "y" in raw ? parseAxis(raw.y, fallback.y) : fallback.y;

  return {
    x: clamp(x, min, max),
    y: clamp(y, min, max),
  };
}

export function getLiquidGlassSettings(state: ToolcraftState): LiquidGlassSettings {
  const { values } = state;
  const defaults = liquidGlassDefaultSettings;
  const shadowColor = colorOpacityValue(values, "shadow.color", {
    color: defaults.shadow.color,
    opacity: defaults.shadow.opacity,
  });

  return {
    background: colorValue(values, "appearance.background", defaults.background),
    buttonImage: {
      blendMode: stringValue(
        values,
        "buttonImage.blendMode",
        defaults.buttonImage.blendMode,
        textureBlendModes,
      ),
      offset: rawVectorValue(
        values,
        "buttonImage.offset",
        defaults.buttonImage.offset,
        -1,
        1,
      ),
      scale: numberValue(values, "buttonImage.scale", defaults.buttonImage.scale, 0.2, 3),
    },
    canvasHeight: state.canvas.size.height,
    canvasWidth: state.canvas.size.width,
    glass: {
      bend: numberValue(values, "glass.bend", defaults.glass.bend, 0, 1),
      bendWidth: numberValue(
        values,
        "glass.bendWidth",
        defaults.glass.bendWidth,
        0.04,
        0.4,
      ),
      brightness: numberValue(
        values,
        "glass.brightness",
        defaults.glass.brightness,
        -0.5,
        0.7,
      ),
      center: vectorValue(values, "glass.center", defaults.glass.center),
      curvature: numberValue(
        values,
        "glass.curvature",
        defaults.glass.curvature,
        0,
        1,
      ),
      depth: numberValue(values, "glass.depth", defaults.glass.depth, 0, 1),
      dispersion: numberValue(
        values,
        "glass.dispersion",
        defaults.glass.dispersion,
        0,
        2,
      ),
      fisheye: numberValue(values, "glass.fisheye", defaults.glass.fisheye, 0, 1),
      frost: numberValue(values, "glass.frost", defaults.glass.frost, 0, 14),
      glow: numberValue(values, "glass.glow", defaults.glass.glow, 0, 1),
      glowSpread: numberValue(
        values,
        "glass.glowSpread",
        defaults.glass.glowSpread,
        0.2,
        2,
      ),
      height: numberValue(values, "glass.height", defaults.glass.height, 96, 720),
      murkiness: numberValue(
        values,
        "glass.murkiness",
        defaults.glass.murkiness,
        0,
        0.8,
      ),
      opacity: numberValue(values, "glass.opacity", defaults.glass.opacity, 0.05, 1),
      radius: numberValue(values, "glass.radius", defaults.glass.radius, 0, 360),
      shape: stringValue(values, "glass.shape", defaults.glass.shape, glassShapes),
      sheen: numberValue(values, "glass.sheen", defaults.glass.sheen, 0, 2),
      sheenAngle: numberValue(
        values,
        "glass.sheenAngle",
        defaults.glass.sheenAngle,
        0,
        180,
      ),
      sheenWidth: numberValue(
        values,
        "glass.sheenWidth",
        defaults.glass.sheenWidth,
        1,
        10,
      ),
      specular: numberValue(
        values,
        "glass.specular",
        defaults.glass.specular,
        0,
        2.5,
      ),
      splay: numberValue(values, "glass.splay", defaults.glass.splay, 0, 1),
      strength: numberValue(
        values,
        "glass.strength",
        defaults.glass.strength,
        0,
        0.3,
      ),
      width: numberValue(values, "glass.width", defaults.glass.width, 96, 960),
    },
    includeBackground: booleanValue(
      values,
      "export.includeBackground",
      defaults.includeBackground,
    ),
    shadow: {
      blur: numberValue(values, "shadow.blur", defaults.shadow.blur, 0, 140),
      color: shadowColor.color,
      enabled: booleanValue(values, "shadow.enabled", defaults.shadow.enabled),
      offset: rawVectorValue(values, "shadow.offset", defaults.shadow.offset, -1, 1),
      opacity: shadowColor.opacity,
    },
    source: {
      saturation: numberValue(
        values,
        "source.saturation",
        defaults.source.saturation,
        0.4,
        1.6,
      ),
    },
    texture: {
      blendMode: stringValue(
        values,
        "texture.blendMode",
        defaults.texture.blendMode,
        textureBlendModes,
      ),
      mode: stringValue(values, "texture.mode", defaults.texture.mode, textureModes),
      opacity: numberValue(
        values,
        "texture.opacity",
        defaults.texture.opacity,
        0,
        1,
      ),
      preset: stringValue(
        values,
        "texture.preset",
        defaults.texture.preset,
        texturePresets,
      ),
    },
    text: {
      alignX: stringValue(values, "text.alignX", defaults.text.alignX, textAlignXValues),
      alignY: stringValue(values, "text.alignY", defaults.text.alignY, textAlignYValues),
      blendMode: stringValue(
        values,
        "text.blendMode",
        defaults.text.blendMode,
        textureBlendModes,
      ),
      content: textContentValue(values, "text.content", defaults.text.content),
      dragTarget: stringValue(
        values,
        "text.dragTarget",
        defaults.text.dragTarget,
        textDragTargets,
      ),
      enabled: booleanValue(values, "text.enabled", defaults.text.enabled),
      offset: rawVectorValue(values, "text.offset", defaults.text.offset, -1, 1),
      style: fontPickerValue(values, "text.style", defaults.text.style),
    },
  };
}

export function getLiquidGlassGeometry(
  settings: LiquidGlassSettings,
): ResolvedLiquidGlassGeometry {
  const rawWidth = settings.glass.width;
  const rawHeight = settings.glass.height;
  const minSide = Math.min(rawWidth, rawHeight);
  const shape = settings.glass.shape;
  const width = shape === "circle" ? minSide : rawWidth;
  const height = shape === "circle" ? minSide : rawHeight;
  const radius =
    shape === "square"
      ? 0
      : shape === "circle"
        ? Math.min(width, height) / 2
        : settings.glass.radius;

  return {
    halfHeight: Math.max(1, height / 2),
    halfWidth: Math.max(1, width / 2),
    height: Math.max(1, height),
    radius: Math.max(0, Math.min(radius, Math.min(width, height) / 2)),
    width: Math.max(1, width),
  };
}

export function findLiquidGlassSourceAsset(state: ToolcraftState) {
  return (
    state.mediaAssets.find(
      (asset) =>
        asset.sourceTarget === "source.upload" &&
        (asset.assetKind ?? "image") === "image",
    ) ?? null
  );
}

export function findLiquidGlassTextureAsset(state: ToolcraftState) {
  return (
    state.mediaAssets.find(
      (asset) =>
        asset.sourceTarget === "texture.upload" &&
        (asset.assetKind ?? "image") === "image",
    ) ?? null
  );
}

export function findLiquidGlassButtonImageAsset(state: ToolcraftState) {
  return (
    state.mediaAssets.find(
      (asset) =>
        asset.sourceTarget === "buttonImage.upload" &&
        (asset.assetKind ?? "image") === "image",
    ) ?? null
  );
}
