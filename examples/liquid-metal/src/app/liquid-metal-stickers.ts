import type {
  ToolcraftMediaAsset,
  ToolcraftMediaTransform,
  ToolcraftState,
} from "@/toolcraft/runtime";

export const liquidMetalStickerTarget = "media.stickers";
export const liquidMetalStickerPlacementTarget = "stickers.placements";
export const liquidMetalStickerScaleTarget = "stickers.scale";
export const liquidMetalStickerRotationTarget = "stickers.rotation";
export const liquidMetalStickerScaleDefault = 0.4;
export const liquidMetalStickerScaleMin = 0.2;
export const liquidMetalStickerScaleMax = 2;
export const liquidMetalStickerRotationDefault = 0;
export const liquidMetalStickerRotationMin = -180;
export const liquidMetalStickerRotationMax = 180;

export type LiquidMetalStickerPlacement = {
  normal: [number, number, number];
  position: [number, number, number];
  rotationDegrees: number;
  scale: number;
  surfaceFaceIndex?: number;
  surfaceMeshIndex?: number;
};

export type LiquidMetalStickerPlacementMap = Record<
  string,
  LiquidMetalStickerPlacement
>;

function isFiniteTuple3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function clampFinite(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const resolved =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.max(min, Math.min(max, resolved));
}

function sanitizePlacement(value: unknown): LiquidMetalStickerPlacement | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<LiquidMetalStickerPlacement>;

  if (!isFiniteTuple3(candidate.position) || !isFiniteTuple3(candidate.normal)) {
    return null;
  }

  const normalLength = Math.hypot(...candidate.normal);

  if (normalLength < 0.0001) {
    return null;
  }

  const surfaceFaceIndex = Number.isInteger(candidate.surfaceFaceIndex)
    ? Math.max(0, candidate.surfaceFaceIndex!)
    : undefined;
  const surfaceMeshIndex = Number.isInteger(candidate.surfaceMeshIndex)
    ? Math.max(0, candidate.surfaceMeshIndex!)
    : undefined;

  return {
    normal: candidate.normal.map((entry) => entry / normalLength) as [
      number,
      number,
      number,
    ],
    position: [...candidate.position],
    rotationDegrees: clampFinite(
      candidate.rotationDegrees,
      liquidMetalStickerRotationDefault,
      liquidMetalStickerRotationMin,
      liquidMetalStickerRotationMax,
    ),
    scale: clampFinite(
      candidate.scale,
      1,
      liquidMetalStickerScaleMin,
      liquidMetalStickerScaleMax,
    ),
    ...(surfaceFaceIndex === undefined ? {} : { surfaceFaceIndex }),
    ...(surfaceMeshIndex === undefined ? {} : { surfaceMeshIndex }),
  };
}

export function getLiquidMetalStickerTransformSettings(
  state: Pick<ToolcraftState, "values">,
): Pick<LiquidMetalStickerPlacement, "rotationDegrees" | "scale"> {
  return {
    rotationDegrees: clampFinite(
      state.values[liquidMetalStickerRotationTarget],
      liquidMetalStickerRotationDefault,
      liquidMetalStickerRotationMin,
      liquidMetalStickerRotationMax,
    ),
    scale: clampFinite(
      state.values[liquidMetalStickerScaleTarget],
      liquidMetalStickerScaleDefault,
      liquidMetalStickerScaleMin,
      liquidMetalStickerScaleMax,
    ),
  };
}

export function getLiquidMetalStickerAssets(
  mediaAssets: readonly ToolcraftMediaAsset[],
): ToolcraftMediaAsset[] {
  return mediaAssets.filter(
    (asset) =>
      asset.sourceTarget === liquidMetalStickerTarget &&
      (asset.mimeType === "image/png" || /\.png$/iu.test(asset.fileName)),
  );
}

export function getLiquidMetalStickerPlacements(
  state: Pick<ToolcraftState, "values">,
): LiquidMetalStickerPlacementMap {
  const raw = state.values[liquidMetalStickerPlacementTarget];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const placements: LiquidMetalStickerPlacementMap = {};

  for (const [id, value] of Object.entries(raw)) {
    const placement = sanitizePlacement(value);

    if (placement) {
      placements[id] = placement;
    }
  }

  return placements;
}

export function getLiquidMetalStickerRenderPlacements(
  state: Pick<ToolcraftState, "selectedLayerId" | "values">,
  assets: readonly ToolcraftMediaAsset[],
): LiquidMetalStickerPlacementMap {
  const placements = getLiquidMetalStickerPlacements(state);
  const selectedAsset = assets.find(
    (asset) => asset.layerId === state.selectedLayerId,
  );
  const selectedPlacement = selectedAsset
    ? placements[selectedAsset.id]
    : undefined;

  if (!selectedAsset || !selectedPlacement) {
    return placements;
  }

  return {
    ...placements,
    [selectedAsset.id]: {
      ...selectedPlacement,
      ...getLiquidMetalStickerTransformSettings(state),
    },
  };
}

export function pruneLiquidMetalStickerPlacements(
  placements: LiquidMetalStickerPlacementMap,
  assets: readonly ToolcraftMediaAsset[],
): LiquidMetalStickerPlacementMap {
  const activeIds = new Set(assets.map((asset) => asset.id));

  return Object.fromEntries(
    Object.entries(placements).filter(([id]) => activeIds.has(id)),
  );
}

export function getLiquidMetalStickerTransformToken(
  transform: ToolcraftMediaTransform | undefined,
): string {
  return `${transform?.rotationDeg ?? 0}:${transform?.flipHorizontal ? 1 : 0}:${transform?.flipVertical ? 1 : 0}`;
}

export function getLiquidMetalStickerStateToken(
  assets: readonly ToolcraftMediaAsset[],
  placements: LiquidMetalStickerPlacementMap,
): string {
  return JSON.stringify(
    assets.map((asset) => ({
      id: asset.id,
      placement: placements[asset.id] ?? null,
      size: asset.size ?? null,
      transform: getLiquidMetalStickerTransformToken(asset.transform),
    })),
  );
}
