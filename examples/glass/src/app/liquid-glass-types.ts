export type LiquidGlassShape = "circle" | "pill" | "rounded" | "square";
export type LiquidGlassTextureBlendMode =
  | "multiply"
  | "normal"
  | "overlay"
  | "screen"
  | "soft-light";
export type LiquidGlassTextureMode = "image" | "off" | "preset";
export type LiquidGlassTexturePreset = "brushed" | "etched" | "grain" | "speckle";
export type LiquidGlassTextAlignX = "center" | "left" | "right";
export type LiquidGlassTextAlignY = "bottom" | "middle" | "top";
export type LiquidGlassTextBlendMode = LiquidGlassTextureBlendMode;
export type LiquidGlassButtonImageBlendMode = LiquidGlassTextureBlendMode;
export type LiquidGlassTextCase =
  | "capitalize"
  | "lowercase"
  | "original"
  | "titleCase"
  | "uppercase";
export type LiquidGlassTextDragTarget = "glass" | "text";
export type LiquidGlassTextLetterSpacing =
  | "normal"
  | "tight"
  | "tighter"
  | "wide"
  | "wider"
  | "widest";
export type LiquidGlassTextLineHeight =
  | "loose"
  | "none"
  | "normal"
  | "relaxed"
  | "snug"
  | "tight";

export type LiquidGlassVector = {
  x: number;
  y: number;
};

export type LiquidGlassTextStyle = {
  color: string;
  fontId: string;
  fontSize: number;
  fontWeight: string;
  letterSpacing: LiquidGlassTextLetterSpacing;
  lineHeight: LiquidGlassTextLineHeight;
  opacity: number;
  textCase: LiquidGlassTextCase;
};

export type LiquidGlassSettings = {
  background: string;
  buttonImage: {
    blendMode: LiquidGlassButtonImageBlendMode;
    offset: LiquidGlassVector;
    scale: number;
  };
  canvasHeight: number;
  canvasWidth: number;
  glass: {
    bend: number;
    bendWidth: number;
    brightness: number;
    center: LiquidGlassVector;
    curvature: number;
    depth: number;
    dispersion: number;
    fisheye: number;
    frost: number;
    glow: number;
    glowSpread: number;
    height: number;
    murkiness: number;
    opacity: number;
    radius: number;
    shape: LiquidGlassShape;
    sheen: number;
    sheenAngle: number;
    sheenWidth: number;
    specular: number;
    splay: number;
    strength: number;
    width: number;
  };
  includeBackground: boolean;
  shadow: {
    blur: number;
    color: string;
    enabled: boolean;
    offset: LiquidGlassVector;
    opacity: number;
  };
  source: {
    saturation: number;
  };
  texture: {
    blendMode: LiquidGlassTextureBlendMode;
    mode: LiquidGlassTextureMode;
    opacity: number;
    preset: LiquidGlassTexturePreset;
  };
  text: {
    alignX: LiquidGlassTextAlignX;
    alignY: LiquidGlassTextAlignY;
    blendMode: LiquidGlassTextBlendMode;
    content: string;
    dragTarget: LiquidGlassTextDragTarget;
    enabled: boolean;
    offset: LiquidGlassVector;
    style: LiquidGlassTextStyle;
  };
};

export type ResolvedLiquidGlassGeometry = {
  halfHeight: number;
  halfWidth: number;
  height: number;
  radius: number;
  width: number;
};

export const liquidGlassDefaultSettings = {
  background: "#090A0F",
  buttonImage: {
    blendMode: "overlay",
    offset: { x: 0.07, y: 0.01 },
    scale: 0.71,
  },
  canvasHeight: 1080,
  canvasWidth: 1920,
  glass: {
    bend: 0.6,
    bendWidth: 0.21,
    brightness: 0,
    center: { x: 0.5, y: 0.5 },
    curvature: 0.64,
    depth: 0.17,
    dispersion: 2,
    fisheye: 0.28,
    frost: 1.5,
    glow: 0.5,
    glowSpread: 1,
    height: 360,
    murkiness: 0.1,
    opacity: 1,
    radius: 230,
    shape: "circle",
    sheen: 1.1,
    sheenAngle: 53,
    sheenWidth: 5.5,
    specular: 1.67,
    splay: 0.24,
    strength: 0.15,
    width: 459,
  },
  includeBackground: true,
  shadow: {
    blur: 59,
    color: "#2E214A",
    enabled: true,
    offset: { x: 0, y: 0.14 },
    opacity: 60,
  },
  source: {
    saturation: 1.08,
  },
  texture: {
    blendMode: "screen",
    mode: "image",
    opacity: 0.9,
    preset: "grain",
  },
  text: {
    alignX: "center",
    alignY: "middle",
    blendMode: "overlay",
    content: "Glass",
    dragTarget: "glass",
    enabled: false,
    offset: { x: 0, y: -0.15 },
    style: {
      color: "#FFFFFF",
      fontId: "inter",
      fontSize: 80,
      fontWeight: "600",
      letterSpacing: "tight",
      lineHeight: "tight",
      opacity: 100,
      textCase: "original",
    },
  },
} as const satisfies LiquidGlassSettings;
