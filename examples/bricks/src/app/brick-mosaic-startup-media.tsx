"use client";

import * as React from "react";

import { useToolcraft } from "@/toolcraft/runtime/react";

import { brickMosaicStartupImage } from "./brick-mosaic-startup-preset";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read startup image."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Startup image did not produce a data URL."));
    };
    reader.readAsDataURL(blob);
  });
}

export function BrickMosaicStartupMedia(): null {
  const { dispatch, state } = useToolcraft();
  const mediaAssetCount = state.mediaAssets.length;
  const attemptedImportRef = React.useRef(false);
  const latestMediaAssetCountRef = React.useRef(mediaAssetCount);

  latestMediaAssetCountRef.current = mediaAssetCount;

  React.useEffect(() => {
    if (attemptedImportRef.current || mediaAssetCount > 0) {
      return undefined;
    }

    let cancelled = false;
    attemptedImportRef.current = true;

    async function importStartupImage(): Promise<void> {
      try {
        const response = await fetch(brickMosaicStartupImage.src);

        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);

        if (cancelled) {
          return;
        }

        dispatch({
          asset: {
            dataUrl,
            fileName: brickMosaicStartupImage.fileName,
            id: brickMosaicStartupImage.id,
            mimeType: blob.type || brickMosaicStartupImage.mimeType,
            position: brickMosaicStartupImage.position,
            size: brickMosaicStartupImage.size,
          },
          replaceExisting: true,
          type: "media.import",
        });
      } catch {
        // The renderer has a placeholder fallback, so startup media loading is best-effort.
      }
    }

    void importStartupImage();

    return () => {
      cancelled = true;

      if (latestMediaAssetCountRef.current === 0) {
        attemptedImportRef.current = false;
      }
    };
  }, [dispatch, mediaAssetCount]);

  return null;
}
