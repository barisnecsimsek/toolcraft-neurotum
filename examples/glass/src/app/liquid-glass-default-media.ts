"use client";

import * as React from "react";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

export const liquidGlassDefaultSourceAsset: ToolcraftMediaAsset = {
  assetKind: "image",
  dataUrl: `${import.meta.env.BASE_URL}liquid-glass-default-background.png`,
  fileName: "flow-gradient-shader (1).png",
  id: "liquid-glass-default-background",
  layerId: "liquid-glass-default-background",
  mimeType: "image/png",
  position: { x: 0, y: 0 },
  size: { height: 2560, unit: "px", width: 4096 },
  sourceTarget: "source.upload",
};

export const liquidGlassDefaultTextureAsset: ToolcraftMediaAsset = {
  assetKind: "image",
  dataUrl: `${import.meta.env.BASE_URL}liquid-glass-default-texture.jpg`,
  fileName: "texture.jpg",
  id: "liquid-glass-default-texture",
  layerId: "liquid-glass-default-texture",
  mimeType: "image/jpeg",
  position: { x: 0, y: 0 },
  size: { height: 3744, unit: "px", width: 5616 },
  sourceTarget: "texture.upload",
};

export const liquidGlassDefaultButtonImageAsset: ToolcraftMediaAsset = {
  assetKind: "image",
  dataUrl: `${import.meta.env.BASE_URL}liquid-glass-default-button-image.png`,
  fileName: "icon.png",
  id: "liquid-glass-default-button-image",
  layerId: "liquid-glass-default-button-image",
  mimeType: "image/png",
  position: { x: 0, y: 0 },
  size: { height: 346, unit: "px", width: 346 },
  sourceTarget: "buttonImage.upload",
};

export const liquidGlassDefaultMediaAssets: ToolcraftMediaAsset[] = [
  liquidGlassDefaultSourceAsset,
  liquidGlassDefaultTextureAsset,
  liquidGlassDefaultButtonImageAsset,
];

const defaultMediaTargets = liquidGlassDefaultMediaAssets.flatMap((asset) =>
  asset.sourceTarget ? [asset.sourceTarget] : [],
);
const staleDefaultMediaIdsByTarget = new Map<string, Set<string>>([
  ["source.upload", new Set(["liquid-glass-default-source"])],
]);

function getMediaTargets(assets: ToolcraftMediaAsset[]): Set<string> {
  return new Set(
    assets.flatMap((asset) => (asset.sourceTarget ? [asset.sourceTarget] : [])),
  );
}

export function LiquidGlassDefaultMediaSync(): null {
  const { dispatch, state } = useToolcraft();
  const manuallyRemovedTargetsRef = React.useRef<Set<string>>(new Set());
  const previousMediaTargetsRef = React.useRef<Set<string> | null>(null);
  const latestHistoryLabel = state.history.undo.at(-1)?.label ?? null;

  React.useEffect(() => {
    const currentTargets = getMediaTargets(state.mediaAssets);
    const previousTargets = previousMediaTargetsRef.current;

    if (latestHistoryLabel === "Delete media" && previousTargets) {
      for (const target of defaultMediaTargets) {
        if (previousTargets.has(target) && !currentTargets.has(target)) {
          manuallyRemovedTargetsRef.current.add(target);
        }
      }
    }

    if (latestHistoryLabel?.startsWith("Reset ")) {
      manuallyRemovedTargetsRef.current.clear();
    }

    for (const defaultAsset of liquidGlassDefaultMediaAssets) {
      if (!defaultAsset.sourceTarget) {
        continue;
      }

      const staleDefaultIds = staleDefaultMediaIdsByTarget.get(defaultAsset.sourceTarget);
      const staleDefaultAsset = staleDefaultIds
        ? state.mediaAssets.find(
            (asset) =>
              asset.sourceTarget === defaultAsset.sourceTarget &&
              staleDefaultIds.has(asset.id),
          )
        : undefined;

      if (
        !staleDefaultAsset &&
        (currentTargets.has(defaultAsset.sourceTarget) ||
          manuallyRemovedTargetsRef.current.has(defaultAsset.sourceTarget))
      ) {
        continue;
      }

      dispatch({
        asset: {
          assetKind: defaultAsset.assetKind,
          dataUrl: defaultAsset.dataUrl,
          fileName: defaultAsset.fileName,
          id: defaultAsset.id,
          layerId: defaultAsset.layerId,
          mimeType: defaultAsset.mimeType,
          position: defaultAsset.position,
          size: defaultAsset.size,
          sourceTarget: defaultAsset.sourceTarget,
        },
        type: "media.import",
      });
    }

    previousMediaTargetsRef.current = currentTargets;
  }, [dispatch, latestHistoryLabel, state.mediaAssets]);

  return null;
}
