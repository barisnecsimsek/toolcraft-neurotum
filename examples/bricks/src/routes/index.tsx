import * as React from "react";

import { createToolcraftPngExportCanvas, type ToolcraftState } from "@/toolcraft/runtime";
import { ToolcraftApp, type ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import { BrickMosaicRenderer } from "../app/brick-mosaic-renderer";
import { BrickMosaicStartupMedia } from "../app/brick-mosaic-startup-media";
import {
  getBrickMosaicSettings,
  renderBrickMosaicToContext,
  type BrickMosaicImageSource,
} from "../app/brick-mosaic-render";

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function loadExportImage(state: ToolcraftState): Promise<BrickMosaicImageSource | null> {
  const mediaAsset = state.mediaAssets[0];

  if (!mediaAsset) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = mediaAsset.dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode brick mosaic image."));
        return;
      }

      resolve(blob);
    }, mimeType, 0.92);
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportBrickMosaicPng(
  state: ToolcraftState,
  reportProgress: (progress: number) => void,
): Promise<void> {
  reportProgress(0.05);

  const image = await loadExportImage(state);
  const settings = getBrickMosaicSettings(state);
  const imageFormat = asString(state.values["export.image.format"], "png").toLowerCase();
  const imageResolution = asString(state.values["export.image.resolution"], "4k");

  reportProgress(0.3);

  const exportCanvas = createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground:
      imageFormat === "jpg" ||
      imageFormat === "jpeg" ||
      state.values["export.includeBackground"] !== false,
    render: ({ context, cssHeight, cssWidth, includeBackground }) => {
      renderBrickMosaicToContext(context, cssWidth, cssHeight, {
        fillBackground: includeBackground,
        image,
        settings,
      });
    },
    resolution: imageResolution,
    state,
  });
  const mimeType = imageFormat === "jpg" || imageFormat === "jpeg" ? "image/jpeg" : "image/png";

  reportProgress(0.72);

  const blob = await canvasToBlob(exportCanvas, mimeType);
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";

  reportProgress(0.92);
  downloadBlob(blob, `brick-mosaic.${extension}`);
  reportProgress(1);
}

export function AppHome(): React.JSX.Element {
  const handlePanelAction = React.useCallback<ToolcraftPanelActionHandler>(
    ({ action, reportProgress, state }) => {
      if (action.value === "export-png") {
        return exportBrickMosaicPng(state, reportProgress);
      }

      return undefined;
    },
    [],
  );

  return (
    <ToolcraftApp
      canvasContent={
        <>
          <BrickMosaicStartupMedia />
          <BrickMosaicRenderer />
        </>
      }
      className="h-dvh min-h-dvh"
      onPanelAction={handlePanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
