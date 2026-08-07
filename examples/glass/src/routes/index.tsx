import {
  createToolcraftPngExportCanvas,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import {
  ToolcraftApp,
  type ToolcraftPanelActionHandler,
} from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import { LiquidGlassDefaultMediaSync } from "../app/liquid-glass-default-media";
import {
  LiquidGlassRenderer,
  loadLiquidGlassMediaImage,
} from "../app/liquid-glass-renderer";
import { renderLiquidGlassToCanvas } from "../app/liquid-glass-render";
import {
  findLiquidGlassSourceAsset,
  findLiquidGlassTextureAsset,
  getLiquidGlassSettings,
} from "../app/liquid-glass-values";

function getImageExportResolution(state: ToolcraftState): string {
  const imageResolution = state.values["export.image.resolution"];

  return typeof imageResolution === "string" ? imageResolution : "4k";
}

function getImageExportFormat(state: ToolcraftState): "jpg" | "png" {
  const imageFormat = state.values["export.image.format"];

  return imageFormat === "jpg" ? "jpg" : "png";
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "jpg" | "png",
): Promise<Blob> {
  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Liquid glass export did not produce image bytes."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      format === "jpg" ? 0.94 : undefined,
    );
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

const handlePanelAction: ToolcraftPanelActionHandler = async ({
  action,
  reportProgress,
  state,
}) => {
  if (action.value !== "export-png") {
    return;
  }

  reportProgress(0.05);
  await waitForFrame();

  const settings = getLiquidGlassSettings(state);
  const sourceAsset = findLiquidGlassSourceAsset(state);
  const textureAsset = findLiquidGlassTextureAsset(state);
  const mediaImage = await loadLiquidGlassMediaImage(sourceAsset);
  const textureImage = await loadLiquidGlassMediaImage(textureAsset);
  const imageFormat = getImageExportFormat(state);
  const imageResolution = getImageExportResolution(state);

  reportProgress(0.25);

  const exportCanvas = createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground: settings.includeBackground,
    render: ({ context, cssHeight, cssWidth, pixelHeight, pixelWidth }) => {
      const webglCanvas = document.createElement("canvas");
      renderLiquidGlassToCanvas(
        webglCanvas,
        {
          cssHeight,
          cssWidth,
          mediaImage,
          pixelHeight,
          pixelWidth,
          settings,
          textureImage,
        },
        { preserveDrawingBuffer: true },
      );
      context.drawImage(webglCanvas, 0, 0, cssWidth, cssHeight);
    },
    resolution: imageResolution,
    state,
  });

  reportProgress(0.78);

  const blob = await canvasToBlob(exportCanvas, imageFormat);

  reportProgress(0.94);
  downloadBlob(blob, `liquid-glass.${imageFormat}`);
  reportProgress(1);
};

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      canvasContent={
        <>
          <LiquidGlassDefaultMediaSync />
          <LiquidGlassRenderer />
        </>
      }
      className="h-dvh min-h-dvh"
      onPanelAction={handlePanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
