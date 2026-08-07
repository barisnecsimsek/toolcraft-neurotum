import {
  createToolcraftPngExportCanvas,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import type { FrozenSceneRenderer } from "./frozen-scene";
import { getFrozenSceneSettings } from "./frozen-values";

export type FrozenImageFormat = "jpg" | "png";

type FrozenExportProvider = Readonly<{
  hasModel: () => boolean;
  renderer: FrozenSceneRenderer;
}>;

let exportProvider: FrozenExportProvider | null = null;
const exportTileSize = 512;
const exportTilesPerFrame = 8;

export function registerFrozenExportProvider(
  provider: FrozenExportProvider,
): () => void {
  exportProvider = provider;
  return () => {
    if (exportProvider === provider) exportProvider = null;
  };
}

function imageFormat(state: ToolcraftState): FrozenImageFormat {
  return state.values["export.image.format"] === "jpg" ? "jpg" : "png";
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: FrozenImageFormat,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image export failed."))),
      format === "jpg" ? "image/jpeg" : "image/png",
      0.95,
    );
  });
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function requireExportProvider(): FrozenExportProvider {
  const provider = exportProvider;
  if (!provider || !provider.hasModel()) {
    throw new Error("Upload a GLB, OBJ, or STL model before exporting.");
  }
  return provider;
}

function createFrozenExportTargetCanvas(state: ToolcraftState): HTMLCanvasElement {
  const settings = getFrozenSceneSettings(state);
  const resolution = String(state.values["export.image.resolution"] ?? "4k");
  return createToolcraftPngExportCanvas({
    background: settings.background.color,
    includeBackground: settings.background.include,
    render: () => undefined,
    resolution,
    state,
  });
}

export function createFrozenExportCanvas(state: ToolcraftState): HTMLCanvasElement {
  const provider = requireExportProvider();
  const settings = getFrozenSceneSettings(state);
  const resolution = String(state.values["export.image.resolution"] ?? "4k");

  return createToolcraftPngExportCanvas({
    background: settings.background.color,
    includeBackground: settings.background.include,
    render: ({ context, cssHeight, cssWidth, pixelHeight, pixelWidth }) => {
      provider.renderer.render(
        { ...settings, background: { ...settings.background, include: false } },
        pixelWidth,
        pixelHeight,
      );
      context.drawImage(provider.renderer.canvas, 0, 0, cssWidth, cssHeight);
      provider.renderer.renderPreview(settings);
    },
    resolution,
    state,
  });
}

export async function downloadFrozenImage(
  state: ToolcraftState,
  reportProgress: (progress: number) => void,
): Promise<void> {
  const provider = requireExportProvider();
  const settings = getFrozenSceneSettings(state);
  const format = imageFormat(state);
  const canvas = createFrozenExportTargetCanvas(state);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export requires a 2D canvas context.");
  const columns = Math.ceil(canvas.width / exportTileSize);
  const rows = Math.ceil(canvas.height / exportTileSize);
  const tileCount = columns * rows;
  let completedTiles = 0;

  await nextAnimationFrame();
  for (let y = 0; y < canvas.height; y += exportTileSize) {
    for (let x = 0; x < canvas.width; x += exportTileSize) {
      const width = Math.min(exportTileSize, canvas.width - x);
      const height = Math.min(exportTileSize, canvas.height - y);
      provider.renderer.renderTile(
        { ...settings, background: { ...settings.background, include: false } },
        canvas.width,
        canvas.height,
        x,
        y,
        width,
        height,
      );
      context.drawImage(provider.renderer.canvas, 0, 0, width, height, x, y, width, height);
      completedTiles += 1;
      reportProgress(0.1 + (completedTiles / tileCount) * 0.45);
      if (completedTiles % exportTilesPerFrame === 0) await nextAnimationFrame();
    }
  }
  await nextAnimationFrame();
  provider.renderer.renderPreview(settings);

  const blob = await canvasToBlob(canvas, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `frozen-model.${format}`;
  link.href = url;
  document.body.append(link);
  reportProgress(0.85);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  reportProgress(1);
}
