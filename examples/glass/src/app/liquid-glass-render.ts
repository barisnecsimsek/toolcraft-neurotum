import {
  createLiquidGlassLensMapGenerator,
  type LiquidGlassLensMapGenerator,
} from "./liquid-glass-displacement";
import type { ToolcraftMediaTransform } from "@/toolcraft/runtime";
import { getFontPickerFontById } from "@/toolcraft/ui/components/controls/font-picker/font-catalog";
import {
  type LiquidGlassLensDescriptor,
  LiquidGlassWebGLRenderer,
  type LiquidGlassWebGLRendererOptions,
} from "./liquid-glass-webgl";
import type { LiquidGlassSettings } from "./liquid-glass-types";
import { getLiquidGlassGeometry } from "./liquid-glass-values";

export type LiquidGlassRenderOptions = {
  buttonImage?: LiquidGlassMediaImage | null;
  buttonImageTransform?: ToolcraftMediaTransform;
  cssHeight: number;
  cssWidth: number;
  mediaImage?: LiquidGlassMediaImage | null;
  mediaTransform?: ToolcraftMediaTransform;
  pixelHeight: number;
  pixelWidth: number;
  settings: LiquidGlassSettings;
  textureImage?: LiquidGlassMediaImage | null;
  textureTransform?: ToolcraftMediaTransform;
};

export type LiquidGlassMediaImage = HTMLImageElement | ImageBitmap;

type SourceDrawOptions = {
  cssHeight: number;
  cssWidth: number;
  mediaImage?: LiquidGlassMediaImage | null;
  mediaTransform?: ToolcraftMediaTransform;
  pixelHeight: number;
  pixelWidth: number;
  settings: LiquidGlassSettings;
};

type TextureDrawOptions = {
  settings: LiquidGlassSettings;
  textureImage?: LiquidGlassMediaImage | null;
  textureTransform?: ToolcraftMediaTransform;
};

type ButtonImageDrawOptions = {
  buttonImage?: LiquidGlassMediaImage | null;
  buttonImageTransform?: ToolcraftMediaTransform;
  settings: LiquidGlassSettings;
};

type TextDrawOptions = {
  settings: LiquidGlassSettings;
};

const mapSize = 512;
const maxButtonImageTextureSize = 1536;
const maxTextTextureSize = 1536;
const minButtonImageTextureSize = 128;
const minTextTextureSize = 128;
const textureSize = 512;

const letterSpacingScale: Record<LiquidGlassSettings["text"]["style"]["letterSpacing"], number> = {
  normal: 0,
  tight: -0.025,
  tighter: -0.05,
  wide: 0.025,
  wider: 0.05,
  widest: 0.1,
};

const lineHeightScale: Record<LiquidGlassSettings["text"]["style"]["lineHeight"], number> = {
  loose: 2,
  none: 1,
  normal: 1.5,
  relaxed: 1.625,
  snug: 1.375,
  tight: 1.25,
};

const mediaImageCacheIds = new WeakMap<object, number>();
let nextMediaImageCacheId = 1;

function getMediaImageSize(image: LiquidGlassMediaImage): { height: number; width: number } {
  const width = "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
  const height = "naturalHeight" in image ? image.naturalHeight || image.height : image.height;

  return { height, width };
}

function isMediaImageReady(
  image: LiquidGlassMediaImage | null | undefined,
): image is LiquidGlassMediaImage {
  return Boolean(image && (!("complete" in image) || image.complete));
}

function getMediaImageCacheKey(image: LiquidGlassMediaImage | null | undefined): string {
  if (!image) {
    return "";
  }

  let id = mediaImageCacheIds.get(image);

  if (id === undefined) {
    id = nextMediaImageCacheId;
    nextMediaImageCacheId += 1;
    mediaImageCacheIds.set(image, id);
  }

  const { height, width } = getMediaImageSize(image);
  const source = "currentSrc" in image ? image.currentSrc || image.src || "" : "";

  return JSON.stringify([id, source, width, height]);
}

function normalizeMediaRotation(rotationDeg: number | undefined): 0 | 90 | 180 | 270 {
  const normalized = ((Math.round((rotationDeg ?? 0) / 90) * 90) % 360 + 360) % 360;

  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: LiquidGlassMediaImage,
  width: number,
  height: number,
  transform?: ToolcraftMediaTransform,
): void {
  const { height: imageHeight, width: imageWidth } = getMediaImageSize(image);

  if (imageWidth <= 0 || imageHeight <= 0) {
    return;
  }

  const rotationDeg = normalizeMediaRotation(transform?.rotationDeg);
  const rotatedWidth = rotationDeg === 90 || rotationDeg === 270 ? imageHeight : imageWidth;
  const rotatedHeight = rotationDeg === 90 || rotationDeg === 270 ? imageWidth : imageHeight;
  const coverScale = Math.max(width / rotatedWidth, height / rotatedHeight);
  const drawWidth = imageWidth * coverScale;
  const drawHeight = imageHeight * coverScale;
  const scaleX = transform?.flipHorizontal ? -1 : 1;
  const scaleY = transform?.flipVertical ? -1 : 1;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((rotationDeg * Math.PI) / 180);
  context.scale(scaleX, scaleY);
  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

function drawContainImage(
  context: CanvasRenderingContext2D,
  image: LiquidGlassMediaImage,
  width: number,
  height: number,
  {
    offset,
    scale,
    transform,
  }: {
    offset: { x: number; y: number };
    scale: number;
    transform?: ToolcraftMediaTransform;
  },
): void {
  const { height: imageHeight, width: imageWidth } = getMediaImageSize(image);

  if (imageWidth <= 0 || imageHeight <= 0) {
    return;
  }

  const rotationDeg = normalizeMediaRotation(transform?.rotationDeg);
  const rotatedWidth = rotationDeg === 90 || rotationDeg === 270 ? imageHeight : imageWidth;
  const rotatedHeight = rotationDeg === 90 || rotationDeg === 270 ? imageWidth : imageHeight;
  const containScale = Math.min(width / rotatedWidth, height / rotatedHeight) * scale;
  const drawWidth = imageWidth * containScale;
  const drawHeight = imageHeight * containScale;
  const scaleX = transform?.flipHorizontal ? -1 : 1;
  const scaleY = transform?.flipVertical ? -1 : 1;

  context.save();
  context.translate(
    width / 2 + offset.x * width * 0.5,
    height / 2 - offset.y * height * 0.5,
  );
  context.rotate((rotationDeg * Math.PI) / 180);
  context.scale(scaleX, scaleY);
  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

function deterministicNoise(x: number, y: number, salt: number): number {
  const value = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + salt * 37.719) *
    43758.5453123;

  return value - Math.floor(value);
}

function drawGrainTexture(context: CanvasRenderingContext2D, size: number): void {
  const imageData = context.createImageData(size, size);
  const { data } = imageData;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const noise = deterministicNoise(x, y, 1);
      const value = Math.round(126 + noise * 118);

      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = Math.round(22 + noise * 76);
    }
  }

  context.putImageData(imageData, 0, 0);
}

function drawBrushedTexture(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = "rgba(255,255,255,0.04)";
  context.fillRect(0, 0, size, size);
  context.lineCap = "round";

  for (let y = -size * 0.15; y < size * 1.15; y += 4) {
    const noise = deterministicNoise(y, 17, 2);
    const offset = (noise - 0.5) * 42;
    context.beginPath();
    context.moveTo(-size * 0.08, y + offset);
    context.lineTo(size * 1.08, y - size * 0.18 + offset * 0.35);
    context.strokeStyle = `rgba(255,255,255,${0.028 + noise * 0.08})`;
    context.lineWidth = noise > 0.82 ? 2 : 1;
    context.stroke();
  }

  for (let y = 0; y < size; y += 18) {
    const noise = deterministicNoise(23, y, 3);
    context.fillStyle = `rgba(0,0,0,${0.012 + noise * 0.028})`;
    context.fillRect(0, y, size, 1);
  }
}

function drawSpeckleTexture(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = "rgba(255,255,255,0.02)";
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 1450; index += 1) {
    const nx = deterministicNoise(index, 5, 4);
    const ny = deterministicNoise(index, 11, 5);
    const strength = deterministicNoise(index, 19, 6);
    const radius = 0.8 + strength * 2.6;
    const light = index % 5 !== 0;

    context.fillStyle = light
      ? `rgba(255,255,255,${0.07 + strength * 0.28})`
      : `rgba(0,0,0,${0.04 + strength * 0.14})`;
    context.beginPath();
    context.arc(nx * size, ny * size, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawEtchedTexture(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = "rgba(255,255,255,0.03)";
  context.fillRect(0, 0, size, size);
  context.lineCap = "round";

  for (let index = 0; index < 92; index += 1) {
    const x = deterministicNoise(index, 13, 7) * size;
    const y = deterministicNoise(index, 29, 8) * size;
    const length = size * (0.08 + deterministicNoise(index, 31, 9) * 0.18);
    const angle = -0.78 + (deterministicNoise(index, 37, 10) - 0.5) * 0.4;
    const alpha = 0.07 + deterministicNoise(index, 41, 11) * 0.2;

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.strokeStyle = `rgba(255,255,255,${alpha})`;
    context.lineWidth = 1 + deterministicNoise(index, 43, 12) * 1.2;
    context.stroke();
  }

  for (let index = 0; index < 36; index += 1) {
    const x = deterministicNoise(index, 47, 13) * size;
    const y = deterministicNoise(index, 53, 14) * size;
    const length = size * (0.04 + deterministicNoise(index, 59, 15) * 0.12);

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y + length * 0.18);
    context.strokeStyle = "rgba(0,0,0,0.08)";
    context.lineWidth = 1;
    context.stroke();
  }
}

function applyTextCase(
  value: string,
  textCase: LiquidGlassSettings["text"]["style"]["textCase"],
): string {
  if (textCase === "uppercase") {
    return value.toUpperCase();
  }

  if (textCase === "lowercase") {
    return value.toLowerCase();
  }

  if (textCase === "capitalize" || textCase === "titleCase") {
    return value.replace(/\b([\p{L}\p{N}])/gu, (match) => match.toUpperCase());
  }

  return value;
}

function getTextCanvasSize(settings: LiquidGlassSettings): {
  height: number;
  scale: number;
  width: number;
} {
  const geometry = getLiquidGlassGeometry(settings);
  const maxSide = Math.max(geometry.width, geometry.height);
  const scale = Math.min(2, maxTextTextureSize / Math.max(1, maxSide));

  return {
    height: Math.max(minTextTextureSize, Math.round(geometry.height * scale)),
    scale,
    width: Math.max(minTextTextureSize, Math.round(geometry.width * scale)),
  };
}

function getButtonImageCanvasSize(settings: LiquidGlassSettings): {
  height: number;
  width: number;
} {
  const geometry = getLiquidGlassGeometry(settings);
  const maxSide = Math.max(geometry.width, geometry.height);
  const scale = Math.min(2, maxButtonImageTextureSize / Math.max(1, maxSide));

  return {
    height: Math.max(minButtonImageTextureSize, Math.round(geometry.height * scale)),
    width: Math.max(minButtonImageTextureSize, Math.round(geometry.width * scale)),
  };
}

function getFontFamily(fontId: string): string {
  const family = getFontPickerFontById(fontId)?.family ?? "Inter";

  return `"${family.replace(/"/g, "")}", Inter, system-ui, sans-serif`;
}

function measureTextLine(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacingPx: number,
): number {
  const glyphs = Array.from(text);

  if (glyphs.length <= 1) {
    return context.measureText(text).width;
  }

  return (
    glyphs.reduce((width, glyph) => width + context.measureText(glyph).width, 0) +
    letterSpacingPx * (glyphs.length - 1)
  );
}

function drawTextLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: LiquidGlassSettings["text"]["alignX"],
  letterSpacingPx: number,
): void {
  if (Math.abs(letterSpacingPx) < 0.01) {
    context.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
    context.fillText(text, x, y);
    return;
  }

  const glyphs = Array.from(text);
  const lineWidth = measureTextLine(context, text, letterSpacingPx);
  let nextX =
    align === "left" ? x : align === "right" ? x - lineWidth : x - lineWidth / 2;

  context.textAlign = "left";
  for (const glyph of glyphs) {
    context.fillText(glyph, nextX, y);
    nextX += context.measureText(glyph).width + letterSpacingPx;
  }
}

function wrapTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacingPx: number,
): string[] {
  const lines: string[] = [];
  const rawLines = text.split(/\r?\n/g);

  for (const rawLine of rawLines) {
    const words = rawLine.trim().split(/\s+/g).filter(Boolean);

    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = words[0] ?? "";

    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (measureTextLine(context, candidate, letterSpacingPx) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }

    lines.push(line);
  }

  return lines.slice(0, 12);
}

function hexToRgba(hex: string, opacity: number): string {
  const value = hex.replace("#", "").trim();
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : value.slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;

  return `rgba(${red},${green},${blue},${Math.max(0, Math.min(1, opacity / 100))})`;
}

function hexToRgbUnit(hex: string): [number, number, number] {
  const value = hex.replace("#", "").trim();
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : value.slice(0, 6);
  const number = Number.parseInt(normalized, 16);

  if (!Number.isFinite(number)) {
    return [0, 0, 0];
  }

  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  ];
}

function renderTextToCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  { settings }: TextDrawOptions,
): void {
  if (!settings.text.enabled || !settings.text.content.trim()) {
    if (canvas.width !== 1 || canvas.height !== 1) {
      canvas.width = 1;
      canvas.height = 1;
    }
    context.clearRect(0, 0, 1, 1);
    return;
  }

  const { height, scale, width } = getTextCanvasSize(settings);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const style = settings.text.style;
  const fontSize = Math.max(1, style.fontSize * scale);
  const letterSpacingPx = fontSize * (letterSpacingScale[style.letterSpacing] ?? 0);
  const lineHeightPx = fontSize * (lineHeightScale[style.lineHeight] ?? 1.5);
  const content = applyTextCase(settings.text.content, style.textCase);
  const maxWidth = width * 0.84;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.filter = "none";
  context.font = `${style.fontWeight} ${fontSize}px ${getFontFamily(style.fontId)}`;
  context.textBaseline = "middle";
  context.fillStyle = hexToRgba(style.color, style.opacity);

  const lines = wrapTextLines(context, content, maxWidth, letterSpacingPx);
  const totalHeight = Math.max(fontSize, lineHeightPx * Math.max(1, lines.length));
  const x =
    settings.text.alignX === "left"
      ? width * 0.08
      : settings.text.alignX === "right"
        ? width * 0.92
        : width / 2;
  const firstY =
    settings.text.alignY === "top"
      ? height * 0.12 + fontSize / 2
      : settings.text.alignY === "bottom"
        ? height * 0.88 - totalHeight + fontSize / 2
        : height / 2 - totalHeight / 2 + fontSize / 2;

  lines.forEach((line, index) => {
    drawTextLine(
      context,
      line,
      x,
      firstY + index * lineHeightPx,
      settings.text.alignX,
      letterSpacingPx,
    );
  });

  context.restore();
}

function renderTextureToCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  { settings, textureImage, textureTransform }: TextureDrawOptions,
): void {
  if (canvas.width !== textureSize || canvas.height !== textureSize) {
    canvas.width = textureSize;
    canvas.height = textureSize;
  }

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, textureSize, textureSize);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.filter = "none";

  if (settings.texture.mode === "image" && isMediaImageReady(textureImage)) {
    drawCoverImage(context, textureImage, textureSize, textureSize, textureTransform);
  } else if (settings.texture.mode === "preset") {
    if (settings.texture.preset === "brushed") {
      drawBrushedTexture(context, textureSize);
    } else if (settings.texture.preset === "speckle") {
      drawSpeckleTexture(context, textureSize);
    } else if (settings.texture.preset === "etched") {
      drawEtchedTexture(context, textureSize);
    } else {
      drawGrainTexture(context, textureSize);
    }
  }

  context.restore();
}

function renderButtonImageToCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  { buttonImage, buttonImageTransform, settings }: ButtonImageDrawOptions,
): void {
  if (!isMediaImageReady(buttonImage)) {
    if (canvas.width !== 1 || canvas.height !== 1) {
      canvas.width = 1;
      canvas.height = 1;
    }
    context.clearRect(0, 0, 1, 1);
    return;
  }

  const { height, width } = getButtonImageCanvasSize(settings);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.filter = "none";
  drawContainImage(context, buttonImage, width, height, {
    offset: settings.buttonImage.offset,
    scale: settings.buttonImage.scale,
    transform: buttonImageTransform,
  });
  context.restore();
}

function renderSourceToCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  {
    cssHeight,
    cssWidth,
    mediaImage,
    mediaTransform,
    pixelHeight,
    pixelWidth,
    settings,
  }: SourceDrawOptions,
): void {
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const pixelRatio = pixelWidth / cssWidth;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.restore();

  context.save();
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  if (settings.includeBackground) {
    context.fillStyle = settings.background;
    context.fillRect(0, 0, cssWidth, cssHeight);
  }

  if (isMediaImageReady(mediaImage)) {
    drawCoverImage(context, mediaImage, cssWidth, cssHeight, mediaTransform);
  }

  context.restore();
}

function getDisplacementMapKey(
  settings: LiquidGlassSettings,
  geometry = getLiquidGlassGeometry(settings),
): string {
  return JSON.stringify([
    mapSize,
    geometry.halfWidth,
    geometry.halfHeight,
    geometry.radius,
    settings.glass.depth,
    settings.glass.curvature,
    settings.glass.splay,
    settings.glass.bend,
    settings.glass.bendWidth,
    settings.glass.sheen,
    settings.glass.sheenWidth,
    settings.glass.sheenAngle,
    settings.glass.glow,
    settings.glass.glowSpread,
  ]);
}

function getSourceCanvasKey({
  cssHeight,
  cssWidth,
  mediaImage,
  mediaTransform,
  pixelHeight,
  pixelWidth,
  settings,
}: SourceDrawOptions): string {
  return JSON.stringify([
    cssWidth,
    cssHeight,
    pixelWidth,
    pixelHeight,
    settings.background,
    settings.includeBackground,
    isMediaImageReady(mediaImage),
    getMediaImageCacheKey(mediaImage),
    mediaTransform?.rotationDeg ?? 0,
    mediaTransform?.flipHorizontal === true,
    mediaTransform?.flipVertical === true,
  ]);
}

function getTextureCanvasKey({
  settings,
  textureImage,
  textureTransform,
}: TextureDrawOptions): string {
  if (settings.texture.mode === "off") {
    return JSON.stringify([textureSize, "off"]);
  }

  return JSON.stringify([
    textureSize,
    settings.texture.mode,
    settings.texture.preset,
    isMediaImageReady(textureImage),
    getMediaImageCacheKey(textureImage),
    textureTransform?.rotationDeg ?? 0,
    textureTransform?.flipHorizontal === true,
    textureTransform?.flipVertical === true,
  ]);
}

function getButtonImageCanvasKey({
  buttonImage,
  buttonImageTransform,
  settings,
}: ButtonImageDrawOptions): string {
  const geometry = getLiquidGlassGeometry(settings);

  if (!isMediaImageReady(buttonImage)) {
    return JSON.stringify(["off", geometry.width, geometry.height]);
  }

  return JSON.stringify([
    "on",
    geometry.width,
    geometry.height,
    settings.buttonImage.offset.x,
    settings.buttonImage.offset.y,
    settings.buttonImage.scale,
    getMediaImageCacheKey(buttonImage),
    buttonImageTransform?.rotationDeg ?? 0,
    buttonImageTransform?.flipHorizontal === true,
    buttonImageTransform?.flipVertical === true,
  ]);
}

function getTextCanvasKey({ settings }: TextDrawOptions): string {
  if (!settings.text.enabled || !settings.text.content.trim()) {
    return JSON.stringify(["off"]);
  }

  const geometry = getLiquidGlassGeometry(settings);

  return JSON.stringify([
    settings.text.enabled,
    settings.text.content,
    settings.text.alignX,
    settings.text.alignY,
    settings.text.style.fontId,
    settings.text.style.fontWeight,
    settings.text.style.fontSize,
    settings.text.style.letterSpacing,
    settings.text.style.lineHeight,
    settings.text.style.textCase,
    settings.text.style.color,
    settings.text.style.opacity,
    geometry.width,
    geometry.height,
  ]);
}

function getTextureBlendModeValue(
  blendMode: LiquidGlassSettings["texture"]["blendMode"],
): number {
  if (blendMode === "normal") {
    return 0;
  }

  if (blendMode === "multiply") {
    return 1;
  }

  if (blendMode === "screen") {
    return 2;
  }

  if (blendMode === "soft-light") {
    return 4;
  }

  return 3;
}

function createLensDescriptor(
  settings: LiquidGlassSettings,
  cssWidth: number,
  cssHeight: number,
  pixelWidth: number,
  pixelHeight: number,
): LiquidGlassLensDescriptor {
  const geometry = getLiquidGlassGeometry(settings);
  const centerX = settings.glass.center.x;
  const centerY = settings.glass.center.y;
  const surfaceNorm = Math.sqrt((cssWidth * cssWidth + cssHeight * cssHeight) / 2);
  const pixelScale = Math.max(
    1,
    (pixelWidth / Math.max(1, cssWidth) + pixelHeight / Math.max(1, cssHeight)) / 2,
  );
  const [shadowRed, shadowGreen, shadowBlue] = hexToRgbUnit(settings.shadow.color);
  const shadowAlpha =
    settings.shadow.enabled && settings.shadow.opacity > 0
      ? Math.max(0, Math.min(1, settings.shadow.opacity / 100))
      : 0;
  return {
    blur: settings.glass.frost,
    brightness: settings.glass.brightness,
    buttonImageBlendMode: getTextureBlendModeValue(settings.buttonImage.blendMode),
    buttonImageEnabled: 0,
    cornerRadius: geometry.radius / cssWidth,
    dispersion: settings.glass.dispersion,
    fisheye: settings.glass.fisheye,
    murkiness: settings.glass.murkiness,
    opacity: settings.glass.opacity,
    originX: (centerX * cssWidth - geometry.halfWidth) / cssWidth,
    originY: 1 - (centerY * cssHeight + geometry.halfHeight) / cssHeight,
    scaleX: (settings.glass.strength * surfaceNorm) / cssWidth,
    scaleY: (settings.glass.strength * surfaceNorm) / cssHeight,
    shadowBlurPx: settings.shadow.blur * pixelScale,
    shadowEnabled: shadowAlpha > 0 || settings.shadow.blur > 0 ? (settings.shadow.enabled ? 1 : 0) : 0,
    shadowOffsetX: (settings.shadow.offset.x * geometry.width) / cssWidth,
    shadowOffsetY: (-settings.shadow.offset.y * geometry.height) / cssHeight,
    shadowOpacity: shadowAlpha,
    shadowRed,
    shadowGreen,
    shadowBlue,
    sizeX: geometry.width / cssWidth,
    sizeY: geometry.height / cssHeight,
    sourceSaturation: settings.source.saturation,
    specular: settings.glass.specular,
    textureBlendMode: getTextureBlendModeValue(settings.texture.blendMode),
    textureEnabled:
      settings.texture.mode === "off" || settings.texture.opacity <= 0 ? 0 : 1,
    textureOpacity: settings.texture.opacity,
    textBlendMode: getTextureBlendModeValue(settings.text.blendMode),
    textEnabled:
      settings.text.enabled && settings.text.content.trim() && settings.text.style.opacity > 0
        ? 1
        : 0,
    textOffsetX: settings.text.offset.x,
    textOffsetY: settings.text.offset.y,
  };
}

export class LiquidGlassRenderRuntime {
  private buttonImageCanvas: HTMLCanvasElement;
  private buttonImageContext: CanvasRenderingContext2D;
  private displacementGenerator: LiquidGlassLensMapGenerator;
  private lastButtonImageKey = "";
  private lastMapKey = "";
  private lastSourceKey = "";
  private lastTextKey = "";
  private lastTextureKey = "";
  private renderer: LiquidGlassWebGLRenderer;
  private sourceCanvas: HTMLCanvasElement;
  private sourceContext: CanvasRenderingContext2D;
  private textCanvas: HTMLCanvasElement;
  private textContext: CanvasRenderingContext2D;
  private textureCanvas: HTMLCanvasElement;
  private textureContext: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: LiquidGlassWebGLRendererOptions = {},
  ) {
    this.renderer = new LiquidGlassWebGLRenderer(canvas, options);
    this.displacementGenerator = createLiquidGlassLensMapGenerator(mapSize);
    this.buttonImageCanvas = document.createElement("canvas");
    this.sourceCanvas = document.createElement("canvas");
    this.textCanvas = document.createElement("canvas");
    this.textureCanvas = document.createElement("canvas");
    const buttonImageContext = this.buttonImageCanvas.getContext("2d");
    const sourceContext = this.sourceCanvas.getContext("2d");
    const textContext = this.textCanvas.getContext("2d");
    const textureContext = this.textureCanvas.getContext("2d");

    if (!buttonImageContext || !sourceContext || !textContext || !textureContext) {
      throw new Error("Liquid glass rendering requires Canvas 2D.");
    }

    this.buttonImageContext = buttonImageContext;
    this.sourceContext = sourceContext;
    this.textContext = textContext;
    this.textureContext = textureContext;
  }

  dispose(): void {
    this.renderer.dispose();
    this.displacementGenerator.dispose();
    this.buttonImageCanvas.width = 0;
    this.buttonImageCanvas.height = 0;
    this.sourceCanvas.width = 0;
    this.sourceCanvas.height = 0;
    this.textCanvas.width = 0;
    this.textCanvas.height = 0;
    this.textureCanvas.width = 0;
    this.textureCanvas.height = 0;
    this.lastButtonImageKey = "";
    this.lastSourceKey = "";
    this.lastTextKey = "";
    this.lastTextureKey = "";
  }

  invalidateTextFrame(): void {
    this.lastTextKey = "";
  }

  render(options: LiquidGlassRenderOptions): void {
    const pixelWidth = Math.max(1, Math.round(options.pixelWidth));
    const pixelHeight = Math.max(1, Math.round(options.pixelHeight));
    const cssWidth = Math.max(1, options.cssWidth);
    const cssHeight = Math.max(1, options.cssHeight);
    const geometry = getLiquidGlassGeometry(options.settings);
    const mapKey = getDisplacementMapKey(options.settings, geometry);
    const sourceOptions = {
      ...options,
      cssHeight,
      cssWidth,
      pixelHeight,
      pixelWidth,
    };
    const sourceKey = getSourceCanvasKey(sourceOptions);
    const textureOptions = {
      settings: options.settings,
      textureImage: options.textureImage,
      textureTransform: options.textureTransform,
    };
    const textureKey = getTextureCanvasKey(textureOptions);
    const buttonImageOptions = {
      buttonImage: options.buttonImage,
      buttonImageTransform: options.buttonImageTransform,
      settings: options.settings,
    };
    const buttonImageKey = getButtonImageCanvasKey(buttonImageOptions);
    const textOptions = {
      settings: options.settings,
    };
    const textKey = getTextCanvasKey(textOptions);

    this.renderer.resize(pixelWidth, pixelHeight);

    const sourceDirty = sourceKey !== this.lastSourceKey;
    const textureDirty = textureKey !== this.lastTextureKey;
    const buttonImageDirty = buttonImageKey !== this.lastButtonImageKey;
    const textDirty = textKey !== this.lastTextKey;

    if (sourceDirty) {
      renderSourceToCanvas(this.sourceCanvas, this.sourceContext, sourceOptions);
      this.lastSourceKey = sourceKey;
    }

    if (textureDirty) {
      renderTextureToCanvas(this.textureCanvas, this.textureContext, textureOptions);
      this.lastTextureKey = textureKey;
    }

    if (buttonImageDirty) {
      renderButtonImageToCanvas(
        this.buttonImageCanvas,
        this.buttonImageContext,
        buttonImageOptions,
      );
      this.lastButtonImageKey = buttonImageKey;
    }

    if (textDirty) {
      renderTextToCanvas(this.textCanvas, this.textContext, textOptions);
      this.lastTextKey = textKey;
    }

    if (mapKey !== this.lastMapKey) {
      const mapCanvas = this.displacementGenerator.generate({
        bend: options.settings.glass.bend,
        bendWidth: options.settings.glass.bendWidth,
        borderRadius: geometry.radius,
        clipToShape: true,
        curvature: options.settings.glass.curvature,
        depth: options.settings.glass.depth,
        glow: options.settings.glass.glow,
        glowFalloff: 0.5,
        glowSpread: options.settings.glass.glowSpread,
        lensHalfHeight: geometry.halfHeight,
        lensHalfWidth: geometry.halfWidth,
        sheen: options.settings.glass.sheen,
        sheenAngle: options.settings.glass.sheenAngle,
        sheenFalloff: 1.5,
        sheenWidth: options.settings.glass.sheenWidth,
        softEdge: true,
        splay: options.settings.glass.splay,
      });
      this.renderer.setDisplacementMap(mapCanvas);
      this.lastMapKey = mapKey;
    }

    const lensDescriptor = createLensDescriptor(
      options.settings,
      cssWidth,
      cssHeight,
      pixelWidth,
      pixelHeight,
    );
    lensDescriptor.buttonImageEnabled =
      isMediaImageReady(options.buttonImage) && this.buttonImageCanvas.width > 1
        ? 1
        : 0;

    this.renderer.render(
      this.sourceCanvas,
      pixelWidth,
      pixelHeight,
      lensDescriptor,
      {
        buttonImage: this.buttonImageCanvas,
        buttonImageDirty,
        buttonImageHeight: this.buttonImageCanvas.height,
        buttonImageWidth: this.buttonImageCanvas.width,
        sourceDirty,
        text: this.textCanvas,
        textDirty,
        textHeight: this.textCanvas.height,
        textWidth: this.textCanvas.width,
        texture: this.textureCanvas,
        textureDirty,
        textureHeight: textureSize,
        textureWidth: textureSize,
      },
    );
  }
}

export function renderLiquidGlassToCanvas(
  canvas: HTMLCanvasElement,
  options: LiquidGlassRenderOptions,
  rendererOptions: LiquidGlassWebGLRendererOptions = {},
): void {
  const runtime = new LiquidGlassRenderRuntime(canvas, rendererOptions);

  try {
    runtime.render(options);
  } finally {
    runtime.dispose();
  }
}
