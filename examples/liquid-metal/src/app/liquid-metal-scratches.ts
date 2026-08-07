import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime";

export const liquidMetalScratchTarget = "media.scratches";

export type LiquidMetalScratchSettings = {
  asset: ToolcraftMediaAsset | null;
  depth: number;
  invert: boolean;
  scale: number;
  sourceKey: string;
  transformToken: string;
};

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getLiquidMetalScratchAsset(
  mediaAssets: readonly ToolcraftMediaAsset[],
): ToolcraftMediaAsset | null {
  return (
    mediaAssets.find(
      (asset) =>
        asset.sourceTarget === liquidMetalScratchTarget &&
        asset.assetKind === "image",
    ) ?? null
  );
}

export function getLiquidMetalScratchTransformToken(
  asset: ToolcraftMediaAsset | null,
): string {
  if (!asset) return "none";

  return JSON.stringify({
    flipHorizontal: asset.transform?.flipHorizontal ?? false,
    flipVertical: asset.transform?.flipVertical ?? false,
    rotationDeg: asset.transform?.rotationDeg ?? 0,
  });
}

export function getLiquidMetalScratchSettings(
  state: ToolcraftState,
): LiquidMetalScratchSettings {
  const asset = getLiquidMetalScratchAsset(state.mediaAssets);

  return {
    asset,
    depth: Math.max(
      0,
      Math.min(1.5, asNumber(state.values["surface.scratchDepth"], 0.35)),
    ),
    invert: state.values["surface.scratchInvert"] === true,
    scale: Math.max(
      0.5,
      Math.min(20, asNumber(state.values["surface.scratchScale"], 6)),
    ),
    sourceKey: asset ? `${asset.id}:${asset.fileName}` : "none",
    transformToken: getLiquidMetalScratchTransformToken(asset),
  };
}
