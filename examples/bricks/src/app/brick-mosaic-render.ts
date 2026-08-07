import type { ToolcraftState } from "@/toolcraft/runtime";

export type BrickMosaicImageSource = CanvasImageSource & {
  height?: number;
  naturalHeight?: number;
  naturalWidth?: number;
  width?: number;
};

export type BrickMosaicSettings = {
  background: string;
  brick: {
    chaos: number;
    detail: number;
    edgeDepth: number;
    gap: number;
    rounding: number;
    scale: number;
  };
  lighting: {
    direction: { x: number; y: number };
    shadow: number;
  };
  studs: {
    diameter: number;
    height: number;
    highlight: number;
    include: boolean;
  };
  tone: {
    brightness: number;
    contrast: number;
    monochrome: boolean;
    posterize: number;
    saturation: number;
  };
};

export type BrickMosaicRenderOptions = {
  shuffle?: {
    seed: number;
  };
  fillBackground?: boolean;
  image?: BrickMosaicImageSource | null;
  settings: BrickMosaicSettings;
};

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

type BrickReliefTile = {
  canvas: HTMLCanvasElement;
  offset: number;
  targetHeight: number;
  targetWidth: number;
};

const pixelatedImageCache = new WeakMap<BrickMosaicImageSource, Map<string, HTMLCanvasElement>>();
const roundedPathCache = new Map<string, Path2D>();
const brickReliefTileCache = new Map<string, BrickReliefTile>();
const localPermutationCache = new Map<string, readonly number[]>();
const chaosPermutationCache = new Map<string, readonly number[]>();
const PIXELATED_IMAGE_CACHE_LIMIT = 24;
const ROUNDED_PATH_CACHE_LIMIT = 96;
const BRICK_RELIEF_TILE_CACHE_LIMIT = 128;
const LOCAL_PERMUTATION_CACHE_LIMIT = 24;
const CHAOS_PERMUTATION_CACHE_LIMIT = 64;
const BRICK_MOSAIC_CHAOS_SEED = 0x6d2b79f5;
export const BRICK_MOSAIC_SHUFFLE_RADIUS = 4;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampChannel(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

function cacheNumber(value: number, precision = 1000): string {
  return String(Math.round(value * precision) / precision);
}

function seededUnit(seed: number, index: number, salt: number): number {
  let value = (seed | 0) ^ Math.imul(index + 1, 0x9e3779b1) ^ salt;

  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;

  return (value >>> 0) / 4_294_967_295;
}

function createBrickMosaicLocalPermutation(
  columns: number,
  rows: number,
  seed: number,
  radius: number,
  participation: number,
): readonly number[] {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));
  const safeRadius = Math.max(1, Math.floor(radius));
  const cellCount = safeColumns * safeRows;
  const permutation = Array.from({ length: cellCount }, (_, index) => index);
  const paired = new Uint8Array(cellCount);
  const safeParticipation = clamp(participation, 0, 1);

  if (safeParticipation <= 0) {
    return permutation;
  }

  if (safeParticipation < 1) {
    for (let index = 0; index < cellCount; index += 1) {
      if (seededUnit(seed, index, 0x3c6ef372) > safeParticipation) {
        paired[index] = 1;
      }
    }
  }

  for (let index = 0; index < cellCount; index += 1) {
    if (paired[index]) {
      continue;
    }

    const column = index % safeColumns;
    const row = Math.floor(index / safeColumns);
    const minColumn = Math.max(0, column - safeRadius);
    const maxColumn = Math.min(safeColumns - 1, column + safeRadius);
    const minRow = Math.max(0, row - safeRadius);
    const maxRow = Math.min(safeRows - 1, row + safeRadius);
    let partnerIndex = -1;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const partnerColumn =
        minColumn +
        Math.floor(
          seededUnit(seed, index, 0x68bc21eb + attempt * 0x9e37) *
            (maxColumn - minColumn + 1),
        );
      const partnerRow =
        minRow +
        Math.floor(
          seededUnit(seed, index, 0x02e5be93 + attempt * 0x7f4a) *
            (maxRow - minRow + 1),
        );
      const offsetX = partnerColumn - column;
      const offsetY = partnerRow - row;

      if (
        (offsetX === 0 && offsetY === 0) ||
        offsetX * offsetX + offsetY * offsetY > safeRadius * safeRadius
      ) {
        continue;
      }

      const candidate = partnerRow * safeColumns + partnerColumn;

      if (!paired[candidate]) {
        partnerIndex = candidate;
        break;
      }
    }

    paired[index] = 1;

    if (partnerIndex >= 0) {
      paired[partnerIndex] = 1;
      permutation[index] = partnerIndex;
      permutation[partnerIndex] = index;
    }
  }

  return permutation;
}

export function getBrickMosaicLocalPermutation(
  columns: number,
  rows: number,
  seed: number,
  radius = BRICK_MOSAIC_SHUFFLE_RADIUS,
): readonly number[] {
  return createBrickMosaicLocalPermutation(columns, rows, seed, radius, 1);
}

export function getBrickMosaicChaosPermutation(
  columns: number,
  rows: number,
  chaos: number,
): readonly number[] {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));
  const amount = clamp(chaos, 0, 1);
  const maxRadius = Math.max(
    BRICK_MOSAIC_SHUFFLE_RADIUS,
    Math.round(Math.hypot(safeColumns - 1, safeRows - 1) * 0.85),
  );
  const radius = Math.max(1, Math.round(1 + (maxRadius - 1) * amount ** 1.6));

  return createBrickMosaicLocalPermutation(
    safeColumns,
    safeRows,
    BRICK_MOSAIC_CHAOS_SEED,
    radius,
    amount,
  );
}

function getCachedBrickMosaicLocalPermutation(
  columns: number,
  rows: number,
  seed: number,
): readonly number[] {
  const key = `${columns}x${rows}:${seed}:${BRICK_MOSAIC_SHUFFLE_RADIUS}`;
  const cached = localPermutationCache.get(key);

  if (cached) {
    localPermutationCache.delete(key);
    localPermutationCache.set(key, cached);
    return cached;
  }

  const next = getBrickMosaicLocalPermutation(columns, rows, seed);

  localPermutationCache.set(key, next);
  trimCache(localPermutationCache, LOCAL_PERMUTATION_CACHE_LIMIT);

  return next;
}

function getCachedBrickMosaicChaosPermutation(
  columns: number,
  rows: number,
  chaos: number,
): readonly number[] {
  const normalizedChaos = Math.round(clamp(chaos, 0, 1) * 1000) / 1000;
  const key = `${columns}x${rows}:${normalizedChaos}`;
  const cached = chaosPermutationCache.get(key);

  if (cached) {
    chaosPermutationCache.delete(key);
    chaosPermutationCache.set(key, cached);
    return cached;
  }

  const next = getBrickMosaicChaosPermutation(columns, rows, normalizedChaos);

  chaosPermutationCache.set(key, next);
  trimCache(chaosPermutationCache, CHAOS_PERMUTATION_CACHE_LIMIT);

  return next;
}

function trimCache<T>(cache: Map<string, T>, limit: number): void {
  while (cache.size > limit) {
    const firstKey = cache.keys().next().value;

    if (typeof firstKey !== "string") {
      return;
    }

    cache.delete(firstKey);
  }
}

function colorValueHex(value: unknown, fallback: string): string {
  const record = asRecord(value);
  const hex = record.hex;

  return typeof hex === "string" && /^#[0-9a-f]{3,8}$/i.test(hex) ? hex : fallback;
}

function normalizeVector(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  const record = asRecord(value);
  const x = asNumber(record.x, fallback.x);
  const y = asNumber(record.y, fallback.y);
  const length = Math.hypot(x, y);

  if (length < 0.001) {
    return fallback;
  }

  return {
    x: x / length,
    y: y / length,
  };
}

export function getBrickMosaicSettings(state: ToolcraftState): BrickMosaicSettings {
  const values = state.values;

  return {
    background: colorValueHex(values["appearance.background"], "#dce7ec"),
    brick: {
      chaos: clamp(asNumber(values["brick.chaos"], 0), 0, 100) / 100,
      detail: clamp(Math.round(asNumber(values["brick.detail"], 42)), 8, 180),
      edgeDepth: clamp(asNumber(values["brick.edgeDepth"], 42), 0, 100) / 100,
      gap: clamp(asNumber(values["brick.gap"], 1.25), 0, 24),
      rounding: clamp(asNumber(values["brick.rounding"], 10), 0, 48) / 100,
      scale: clamp(asNumber(values["brick.scale"], 1), 0.5, 2),
    },
    lighting: {
      direction: normalizeVector(values["lighting.direction"], { x: -0.45, y: -0.55 }),
      shadow: clamp(asNumber(values["lighting.shadow"], 34), 0, 100) / 100,
    },
    studs: {
      diameter: clamp(asNumber(values["stud.diameter"], 56), 0, 100) / 100,
      height: clamp(asNumber(values["stud.height"], 42), 0, 100) / 100,
      highlight: clamp(asNumber(values["stud.highlight"], 50), 0, 100) / 100,
      include: asBoolean(values["stud.include"], true),
    },
    tone: {
      brightness: clamp(asNumber(values["tone.brightness"], 100), 0, 220) / 100,
      contrast: clamp(asNumber(values["tone.contrast"], 108), 0, 240) / 100,
      monochrome: asBoolean(values["tone.monochrome"], false),
      posterize: clamp(Math.round(asNumber(values["tone.posterize"], 4)), 0, 12),
      saturation: clamp(asNumber(values["tone.saturation"], 105), 0, 240) / 100,
    },
  };
}

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized.slice(0, 6);
  const value = Number.parseInt(full, 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function rgbToCss(color: RgbColor, alpha = 1): string {
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(
    color.b,
  )}, ${clamp(alpha, 0, 1)})`;
}

function adjustColor(color: RgbColor, amount: number): RgbColor {
  if (amount >= 0) {
    return {
      b: color.b + (255 - color.b) * amount,
      g: color.g + (255 - color.g) * amount,
      r: color.r + (255 - color.r) * amount,
    };
  }

  const multiplier = 1 + amount;

  return {
    b: color.b * multiplier,
    g: color.g * multiplier,
    r: color.r * multiplier,
  };
}

function applyTone(color: RgbColor, settings: BrickMosaicSettings["tone"]): RgbColor {
  const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const saturation = settings.monochrome ? 0 : settings.saturation;
  const contrast = settings.contrast;
  const brightness = settings.brightness;
  const posterize = settings.posterize;
  let next = {
    b: luminance + (color.b - luminance) * saturation,
    g: luminance + (color.g - luminance) * saturation,
    r: luminance + (color.r - luminance) * saturation,
  };

  next = {
    b: (next.b - 128) * contrast + 128,
    g: (next.g - 128) * contrast + 128,
    r: (next.r - 128) * contrast + 128,
  };
  next = {
    b: next.b * brightness,
    g: next.g * brightness,
    r: next.r * brightness,
  };

  if (posterize > 0) {
    const levels = posterize + 2;
    const step = 255 / (levels - 1);
    next = {
      b: Math.round(next.b / step) * step,
      g: Math.round(next.g / step) * step,
      r: Math.round(next.r / step) * step,
    };
  }

  return {
    b: clampChannel(next.b),
    g: clampChannel(next.g),
    r: clampChannel(next.r),
  };
}

function createPixelatedImageCanvas(
  image: BrickMosaicImageSource | null | undefined,
  columns: number,
  rows: number,
  tone: BrickMosaicSettings["tone"],
): HTMLCanvasElement | null {
  if (!image || typeof document === "undefined") {
    return null;
  }

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = Math.max(1, columns);
  sampleCanvas.height = Math.max(1, rows);

  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });

  if (!sampleContext) {
    return null;
  }

  const posterizeContrast = 1 + tone.posterize * 0.1;
  sampleContext.filter = [
    tone.monochrome ? "grayscale(1)" : "grayscale(0)",
    `saturate(${tone.saturation})`,
    `contrast(${tone.contrast * posterizeContrast})`,
    `brightness(${tone.brightness})`,
  ].join(" ");
  sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
  sampleContext.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);

  return sampleCanvas;
}

function getToneCacheKey(tone: BrickMosaicSettings["tone"]): string {
  return [
    tone.monochrome ? "mono" : "color",
    tone.posterize,
    cacheNumber(tone.saturation),
    cacheNumber(tone.contrast),
    cacheNumber(tone.brightness),
  ].join("|");
}

function getCachedPixelatedImageCanvas(
  image: BrickMosaicImageSource | null | undefined,
  columns: number,
  rows: number,
  tone: BrickMosaicSettings["tone"],
): HTMLCanvasElement | null {
  if (!image || typeof document === "undefined") {
    return null;
  }

  const key = `${columns}x${rows}|${getToneCacheKey(tone)}`;
  let entries = pixelatedImageCache.get(image);

  if (!entries) {
    entries = new Map<string, HTMLCanvasElement>();
    pixelatedImageCache.set(image, entries);
  }

  const cached = entries.get(key);

  if (cached) {
    entries.delete(key);
    entries.set(key, cached);
    return cached;
  }

  const next = createPixelatedImageCanvas(image, columns, rows, tone);

  if (next) {
    entries.set(key, next);
    trimCache(entries, PIXELATED_IMAGE_CACHE_LIMIT);
  }

  return next;
}

function getPlaceholderColor(column: number, row: number, columns: number, rows: number): RgbColor {
  const x = columns <= 1 ? 0 : column / (columns - 1);
  const y = rows <= 1 ? 0 : row / (rows - 1);
  const ring = Math.sin((x * 2.2 + y * 1.4) * Math.PI);

  return {
    b: 180 + ring * 28 - y * 34,
    g: 154 + x * 50 + y * 36,
    r: 90 + x * 120 + y * 86,
  };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function roundedRectPath2d(width: number, height: number, radius: number): Path2D | null {
  if (typeof Path2D === "undefined") {
    return null;
  }

  const safeRadius = Math.min(radius, width / 2, height / 2);
  const key = `${cacheNumber(width)}x${cacheNumber(height)}:${cacheNumber(safeRadius)}`;
  const cached = roundedPathCache.get(key);

  if (cached) {
    roundedPathCache.delete(key);
    roundedPathCache.set(key, cached);
    return cached;
  }

  const path = new Path2D();

  path.moveTo(safeRadius, 0);
  path.lineTo(width - safeRadius, 0);
  path.quadraticCurveTo(width, 0, width, safeRadius);
  path.lineTo(width, height - safeRadius);
  path.quadraticCurveTo(width, height, width - safeRadius, height);
  path.lineTo(safeRadius, height);
  path.quadraticCurveTo(0, height, 0, height - safeRadius);
  path.lineTo(0, safeRadius);
  path.quadraticCurveTo(0, 0, safeRadius, 0);
  path.closePath();

  roundedPathCache.set(key, path);
  trimCache(roundedPathCache, ROUNDED_PATH_CACHE_LIMIT);

  return path;
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRectPath(context, x, y, width, height, radius);
  context.fill();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRectPath(context, x, y, width, height, radius);
  context.stroke();
}

function renderBrick(
  context: CanvasRenderingContext2D,
  color: RgbColor | null,
  x: number,
  y: number,
  width: number,
  height: number,
  settings: BrickMosaicSettings,
): void {
  const radius = Math.min(width, height) * settings.brick.rounding;
  const light = settings.lighting.direction;
  const bevel = settings.brick.edgeDepth;
  const shadow = settings.lighting.shadow;
  const shadowOffset = Math.max(0.5, Math.min(width, height) * 0.045) * shadow;

  context.save();
  context.fillStyle = `rgba(0, 0, 0, ${0.2 * shadow})`;
  fillRoundedRect(
    context,
    x - light.x * shadowOffset,
    y - light.y * shadowOffset,
    width,
    height,
    radius,
  );
  context.restore();

  if (color) {
    context.fillStyle = rgbToCss(color);
    fillRoundedRect(context, x, y, width, height, radius);
  }

  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();
  const gradient = context.createLinearGradient(
    x + width * (0.5 - light.x * 0.5),
    y + height * (0.5 - light.y * 0.5),
    x + width * (0.5 + light.x * 0.5),
    y + height * (0.5 + light.y * 0.5),
  );
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * bevel})`);
  gradient.addColorStop(0.45, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 * bevel + 0.1 * shadow})`);
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
  context.restore();

  context.strokeStyle = `rgba(0, 0, 0, ${0.22 * bevel + 0.08 * shadow})`;
  context.lineWidth = Math.max(0.6, Math.min(width, height) * 0.035);
  strokeRoundedRect(context, x, y, width, height, radius);

  if (!settings.studs.include) {
    return;
  }

  const studRadius = Math.max(0.6, Math.min(width, height) * settings.studs.diameter * 0.5);
  const studX = x + width / 2;
  const studY = y + height / 2;
  const studOffset = Math.max(0.35, studRadius * 0.14) * settings.studs.height;

  context.save();
  context.beginPath();
  context.arc(studX - light.x * studOffset, studY - light.y * studOffset, studRadius, 0, Math.PI * 2);
  context.fillStyle = `rgba(0, 0, 0, ${0.28 * shadow * settings.studs.height})`;
  context.fill();
  context.restore();

  const studGradient = context.createRadialGradient(
    studX - light.x * studRadius * 0.38,
    studY - light.y * studRadius * 0.38,
    studRadius * 0.1,
    studX,
    studY,
    studRadius,
  );
  if (color) {
    studGradient.addColorStop(
      0,
      rgbToCss(adjustColor(color, 0.32 * settings.studs.highlight), 0.95),
    );
    studGradient.addColorStop(0.55, rgbToCss(adjustColor(color, 0.06)));
    studGradient.addColorStop(
      1,
      rgbToCss(adjustColor(color, -0.2 * settings.studs.height - 0.08 * shadow)),
    );
  } else {
    studGradient.addColorStop(0, `rgba(255, 255, 255, ${0.4 * settings.studs.highlight})`);
    studGradient.addColorStop(0.58, "rgba(255, 255, 255, 0.04)");
    studGradient.addColorStop(
      1,
      `rgba(0, 0, 0, ${0.24 * settings.studs.height + 0.08 * shadow})`,
    );
  }

  context.beginPath();
  context.arc(studX, studY, studRadius, 0, Math.PI * 2);
  context.fillStyle = studGradient;
  context.fill();
  context.strokeStyle = `rgba(0, 0, 0, ${0.22 * settings.studs.height + 0.06 * shadow})`;
  context.lineWidth = Math.max(0.35, studRadius * 0.1);
  context.stroke();
}

function getContextScale(context: CanvasRenderingContext2D): number {
  const transform = context.getTransform();
  const scale = Math.max(Math.abs(transform.a), Math.abs(transform.d), 1);

  return Number.isFinite(scale) ? scale : 1;
}

function getBrickReliefTileKey(
  width: number,
  height: number,
  settings: BrickMosaicSettings,
  renderScale: number,
): string {
  return [
    cacheNumber(width),
    cacheNumber(height),
    cacheNumber(renderScale),
    cacheNumber(settings.brick.edgeDepth),
    cacheNumber(settings.brick.rounding),
    cacheNumber(settings.lighting.direction.x),
    cacheNumber(settings.lighting.direction.y),
    cacheNumber(settings.lighting.shadow),
    settings.studs.include ? "stud" : "flat",
    cacheNumber(settings.studs.diameter),
    cacheNumber(settings.studs.height),
    cacheNumber(settings.studs.highlight),
  ].join("|");
}

function getBrickReliefPadding(width: number, height: number, settings: BrickMosaicSettings): number {
  const minSide = Math.min(width, height);
  const shadowPadding = Math.max(0.5, minSide * 0.045) * settings.lighting.shadow;
  const strokePadding = Math.max(0.6, minSide * 0.035) / 2;

  return Math.ceil(shadowPadding + strokePadding + 1);
}

function createBrickReliefTile(
  width: number,
  height: number,
  settings: BrickMosaicSettings,
  renderScale: number,
): BrickReliefTile | null {
  if (typeof document === "undefined") {
    return null;
  }

  const offset = getBrickReliefPadding(width, height, settings);
  const targetWidth = width + offset * 2;
  const targetHeight = height + offset * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(targetWidth * renderScale));
  canvas.height = Math.max(1, Math.ceil(targetHeight * renderScale));

  const tileContext = canvas.getContext("2d");

  if (!tileContext) {
    return null;
  }

  tileContext.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  renderBrick(tileContext, null, offset, offset, width, height, settings);

  return {
    canvas,
    offset,
    targetHeight,
    targetWidth,
  };
}

function getCachedBrickReliefTile(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: BrickMosaicSettings,
): BrickReliefTile | null {
  const renderScale = getContextScale(context);
  const key = getBrickReliefTileKey(width, height, settings, renderScale);
  const cached = brickReliefTileCache.get(key);

  if (cached) {
    brickReliefTileCache.delete(key);
    brickReliefTileCache.set(key, cached);
    return cached;
  }

  const next = createBrickReliefTile(width, height, settings, renderScale);

  if (next) {
    brickReliefTileCache.set(key, next);
    trimCache(brickReliefTileCache, BRICK_RELIEF_TILE_CACHE_LIMIT);
  }

  return next;
}

export function renderBrickMosaicToContext(
  context: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  options: BrickMosaicRenderOptions,
): void {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const settings = options.settings;
  const targetLongEdge = clamp(Math.round(settings.brick.detail / settings.brick.scale), 8, 220);
  const cellSize = Math.max(2, Math.max(width, height) / targetLongEdge);
  const columns = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const pixelatedImage = getCachedPixelatedImageCanvas(
    options.image,
    columns,
    rows,
    settings.tone,
  );
  const gap = Math.min(settings.brick.gap, cellSize * 0.42);
  const backgroundColor = hexToRgb(settings.background);
  const chaosPermutation =
    settings.brick.chaos > 0
      ? getCachedBrickMosaicChaosPermutation(columns, rows, settings.brick.chaos)
      : null;
  const shufflePermutation = options.shuffle
    ? getCachedBrickMosaicLocalPermutation(columns, rows, options.shuffle.seed)
    : null;

  context.save();
  context.clearRect(0, 0, width, height);

  if (options.fillBackground !== false) {
    context.fillStyle = settings.background;
    context.fillRect(0, 0, width, height);
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const slotIndex = row * columns + column;
      const shuffledIndex = shufflePermutation?.[slotIndex] ?? slotIndex;
      const sourceIndex = chaosPermutation?.[shuffledIndex] ?? shuffledIndex;
      const sourceColumn = sourceIndex % columns;
      const sourceRow = Math.floor(sourceIndex / columns);
      const x = column * cellSize;
      const y = row * cellSize;
      const brickWidth = Math.min(cellSize, width - x);
      const brickHeight = Math.min(cellSize, height - y);
      const inset = gap / 2;
      const brickX = x + inset;
      const brickY = y + inset;
      const brickRenderWidth = Math.max(0.5, brickWidth - gap);
      const brickRenderHeight = Math.max(0.5, brickHeight - gap);
      const renderX = brickX;
      const renderY = brickY;
      const brickRadius = Math.min(brickRenderWidth, brickRenderHeight) * settings.brick.rounding;
      const placeholderColor = pixelatedImage
        ? null
        : applyTone(getPlaceholderColor(sourceColumn, sourceRow, columns, rows), settings.tone);
      const mixedColor = placeholderColor
        ? applyTone(
            {
              b: placeholderColor.b * 0.78 + backgroundColor.b * 0.22,
              g: placeholderColor.g * 0.78 + backgroundColor.g * 0.22,
              r: placeholderColor.r * 0.78 + backgroundColor.r * 0.22,
            },
            settings.tone,
          )
        : null;

      if (pixelatedImage) {
        const brickPath = roundedRectPath2d(brickRenderWidth, brickRenderHeight, brickRadius);

        context.save();
        context.imageSmoothingEnabled = false;

        if (brickPath) {
          context.translate(renderX, renderY);
          context.clip(brickPath);
          context.drawImage(
            pixelatedImage,
            sourceColumn,
            sourceRow,
            1,
            1,
            0,
            0,
            brickRenderWidth,
            brickRenderHeight,
          );
        } else {
          roundedRectPath(context, renderX, renderY, brickRenderWidth, brickRenderHeight, brickRadius);
          context.clip();
          context.drawImage(
            pixelatedImage,
            sourceColumn,
            sourceRow,
            1,
            1,
            renderX,
            renderY,
            brickRenderWidth,
            brickRenderHeight,
          );
        }

        context.restore();

        const reliefTile = getCachedBrickReliefTile(
          context,
          brickRenderWidth,
          brickRenderHeight,
          settings,
        );

        if (reliefTile) {
          context.drawImage(
            reliefTile.canvas,
            renderX - reliefTile.offset,
            renderY - reliefTile.offset,
            reliefTile.targetWidth,
            reliefTile.targetHeight,
          );
        } else {
          renderBrick(context, null, renderX, renderY, brickRenderWidth, brickRenderHeight, settings);
        }
      } else {
        renderBrick(
          context,
          mixedColor,
          renderX,
          renderY,
          brickRenderWidth,
          brickRenderHeight,
          settings,
        );
      }

    }
  }

  context.restore();
}
