"use client";

import * as React from "react";

import type { ToolcraftState } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import {
  getBrickMosaicSettings,
  renderBrickMosaicToContext,
  type BrickMosaicImageSource,
} from "./brick-mosaic-render";

type LoadedImage = {
  assetKey: string;
  image: HTMLImageElement;
};

type BrickShuffleFrame = {
  phase: "assembled" | "shuffling";
  seed: number;
};

function isScaleSliderPointerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const slider = target.closest('[data-slot="slider"]');

  return Boolean(slider?.querySelector('input[type="range"][aria-label="Scale"]'));
}

function useBrickScaleShuffle(scale: number): BrickShuffleFrame {
  const [frame, setFrame] = React.useState<BrickShuffleFrame>({
    phase: "assembled",
    seed: 0,
  });
  const draggingRef = React.useRef(false);
  const previousScaleRef = React.useRef(scale);
  const seedRef = React.useRef(0);

  const shuffle = React.useCallback(() => {
    seedRef.current = (seedRef.current + 1) % 2_147_483_647;
    setFrame({ phase: "shuffling", seed: seedRef.current });
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isScaleSliderPointerTarget(event.target)) {
        return;
      }

      draggingRef.current = true;
      shuffle();
    };
    const handlePointerEnd = () => {
      if (!draggingRef.current) {
        return;
      }

      draggingRef.current = false;
      setFrame({ phase: "assembled", seed: seedRef.current });
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("blur", handlePointerEnd);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("blur", handlePointerEnd);
    };
  }, [shuffle]);

  React.useEffect(() => {
    if (scale === previousScaleRef.current) {
      return;
    }

    previousScaleRef.current = scale;

    if (draggingRef.current) {
      shuffle();
    }
  }, [scale, shuffle]);

  return frame;
}

function getPreviewScale(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(2, Math.max(1, value))
    : fallback;
}

function shouldIncludeBrickMosaicPreviewBackground(state: ToolcraftState): boolean {
  const value = state.values["export.includeBackground"];

  if (typeof value === "boolean") {
    return value;
  }

  return true;
}

export function BrickMosaicRenderer(): React.JSX.Element {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sourceAsset = state.mediaAssets[0] ?? null;
  const assetKey = sourceAsset ? `${sourceAsset.id}:${sourceAsset.dataUrl.length}` : "";
  const [loadedImage, setLoadedImage] = React.useState<LoadedImage | null>(null);
  const settings = React.useMemo(() => getBrickMosaicSettings(state), [state]);
  const shuffleFrame = useBrickScaleShuffle(settings.brick.scale);
  const includeBackground = shouldIncludeBrickMosaicPreviewBackground(state);
  const previewScale = getPreviewScale(
    state.values["canvas.renderScale"],
    state.schema.canvas.renderScale.defaultValue,
  );

  React.useEffect(() => {
    if (!sourceAsset) {
      setLoadedImage(null);
      return undefined;
    }

    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        setLoadedImage({ assetKey, image });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setLoadedImage(null);
      }
    };
    image.src = sourceAsset.dataUrl;

    return () => {
      cancelled = true;
    };
  }, [assetKey, sourceAsset]);

  React.useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    let frameId = 0;
    const cssWidth = Math.max(1, state.canvas.size.width);
    const cssHeight = Math.max(1, state.canvas.size.height);
    const pixelWidth = Math.max(1, Math.ceil(cssWidth * previewScale));
    const pixelHeight = Math.max(1, Math.ceil(cssHeight * previewScale));

    frameId = window.requestAnimationFrame(() => {
      if (canvas.width !== pixelWidth) {
        canvas.width = pixelWidth;
      }

      if (canvas.height !== pixelHeight) {
        canvas.height = pixelHeight;
      }

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.setTransform(previewScale, 0, 0, previewScale, 0, 0);
      renderBrickMosaicToContext(context, cssWidth, cssHeight, {
        fillBackground: includeBackground,
        image:
          loadedImage?.assetKey === assetKey
            ? (loadedImage.image as BrickMosaicImageSource)
            : null,
        settings,
        shuffle:
          shuffleFrame.phase === "shuffling" ? { seed: shuffleFrame.seed } : undefined,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    assetKey,
    includeBackground,
    loadedImage,
    previewScale,
    settings,
    shuffleFrame.phase,
    shuffleFrame.seed,
    state.canvas.size.height,
    state.canvas.size.width,
  ]);

  return (
    <canvas
      aria-label="Brick mosaic preview"
      className="block h-full w-full"
      data-brick-mosaic-canvas=""
      data-brick-shuffle-phase={shuffleFrame.phase}
      data-toolcraft-product-output=""
      ref={canvasRef}
    />
  );
}
