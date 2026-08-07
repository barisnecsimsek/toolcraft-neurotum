import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime";
import { ToolcraftApp, type ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import {
  SuminagashiRenderer,
  type SuminagashiRendererHandle,
} from "../app/suminagashi-renderer";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readColorHex(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
    return value.toLowerCase();
  }

  if (isRecord(value) && typeof value.hex === "string" && /^#[0-9a-f]{6}$/i.test(value.hex)) {
    return value.hex.toLowerCase();
  }

  return fallback;
}

function readImageFormat(value: unknown): "jpg" | "png" {
  return value === "jpg" ? "jpg" : "png";
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Image export did not produce a blob."));
      },
      mimeType,
      quality,
    );
  });
}

export function AppHome(): React.JSX.Element {
  const rendererRef = React.useRef<SuminagashiRendererHandle | null>(null);

  const handlePanelAction = React.useCallback<ToolcraftPanelActionHandler>(
    async ({ action, dispatch, reportProgress, state }) => {
      if (action.value === "clear") {
        const nextClearSignal = Date.now();

        dispatch({
          history: "skip",
          label: "Clear ink",
          target: "flow.clearSignal",
          type: "controls.setValue",
          value: nextClearSignal,
        });
        rendererRef.current?.clear();
        return;
      }

      if (action.value !== "export-image") {
        return;
      }

      reportProgress(0.08);

      const imageFormat = readImageFormat(state.values["export.image.format"]);
      const imageResolution = String(state.values["export.image.resolution"] ?? "4k");
      const background = readColorHex(state.values["appearance.background"], "#efeae0");
      const includeBackground =
        imageFormat === "jpg" ? true : shouldIncludeToolcraftPreviewBackground({ state });
      const exportCanvas = createToolcraftPngExportCanvas({
        background,
        includeBackground,
        render: ({ context, cssWidth, cssHeight }) => {
          rendererRef.current?.drawCurrentFrame(context, cssWidth, cssHeight);
        },
        resolution: imageResolution,
        state,
      });

      reportProgress(0.62);

      const mimeType = imageFormat === "jpg" ? "image/jpeg" : "image/png";
      const blob = await canvasToBlob(exportCanvas, mimeType, imageFormat === "jpg" ? 0.92 : undefined);

      reportProgress(0.9);
      downloadBlob(blob, `suminagashi.${imageFormat}`);
      reportProgress(1);
    },
    [],
  );

  return (
    <ToolcraftApp
      canvasContent={<SuminagashiRenderer ref={rendererRef} />}
      className="suminagashi-app h-dvh min-h-dvh"
      onPanelAction={handlePanelAction}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
