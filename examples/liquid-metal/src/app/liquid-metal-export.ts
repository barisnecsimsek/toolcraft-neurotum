import * as THREE from "three";

import {
  createToolcraftPngExportCanvas,
  getToolcraftImageExportSize,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftImageExportResolution,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import type {
  ToolcraftPanelActionContext,
  ToolcraftPanelActionHandler,
} from "@/toolcraft/runtime/react";

import {
  LiquidMetalSceneRenderer,
} from "./liquid-metal-scene";
import { readLiquidMetalOrbitPose } from "./liquid-metal-orbit";
import { getLiquidMetalScratchAsset } from "./liquid-metal-scratches";
import { getLiquidMetalEnvironmentSettings } from "./liquid-metal-environment";
import {
  getLiquidMetalStickerAssets,
  getLiquidMetalStickerRenderPlacements,
  getLiquidMetalStickerTransformSettings,
} from "./liquid-metal-stickers";
import {
  getLiquidMetal3DSettings,
  liquidMetalPresetTargetValues,
  type LiquidMetalPresetId,
} from "./liquid-metal-values";

export type LiquidMetalExportProvider = {
  getModel: () => THREE.Object3D | null;
};

declare global {
  interface Window {
    __toolcraftLastPngExport?: {
      blob: Blob;
      format: string;
      height: number;
      type: string;
      url: string;
      width: number;
    };
    __toolcraftLastVideoExport?: {
      blob: Blob;
      durationSeconds: number;
      height: number;
      type: string;
      url: string;
      width: number;
    };
  }
}

let exportProvider: LiquidMetalExportProvider | null = null;

export function registerLiquidMetalExportProvider(
  provider: LiquidMetalExportProvider | null,
): () => void {
  exportProvider = provider;

  return () => {
    if (exportProvider === provider) {
      exportProvider = null;
    }
  };
}

function getExportProvider(): LiquidMetalExportProvider {
  if (!exportProvider?.getModel()) {
    throw new Error("Upload a 3D model before exporting Liquid Metal output.");
  }

  return exportProvider;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Liquid Metal export could not encode the canvas."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function downloadBlob(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = fileName;
  link.href = url;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();

  return url;
}

async function renderExportFrame({
  height,
  includeBackground,
  model,
  state,
  timeSeconds,
  width,
}: {
  height: number;
  includeBackground: boolean;
  model: THREE.Object3D;
  state: ToolcraftState;
  timeSeconds: number;
  width: number;
}): Promise<HTMLCanvasElement> {
  const settings = getLiquidMetal3DSettings(state, {
    includeVideoBackground: includeBackground,
    timeSeconds,
  });
  const canvas = document.createElement("canvas");
  const sceneRenderer = new LiquidMetalSceneRenderer(canvas, {
    environmentMaxWidth: 2048,
    preserveDrawingBuffer: true,
  });

  try {
    sceneRenderer.setLiquidMetalSettings(settings);
    await sceneRenderer.setEnvironment(
      getLiquidMetalEnvironmentSettings(state),
    );
    await sceneRenderer.setScratchMask(
      getLiquidMetalScratchAsset(state.mediaAssets),
    );
    sceneRenderer.setModel(model.clone(true));
    const stickerAssets = getLiquidMetalStickerAssets(state.mediaAssets);

    await sceneRenderer.setStickers(
      stickerAssets,
      getLiquidMetalStickerRenderPlacements(state, stickerAssets),
      getLiquidMetalStickerTransformSettings(state),
    );
    sceneRenderer.render({
      background: settings.background,
      height,
      includeBackground,
      orbitPose: readLiquidMetalOrbitPose(state.values["view.orbit"]),
      width,
    });
    return canvas;
  } finally {
    sceneRenderer.dispose();
  }
}

export async function exportLiquidMetalPng(
  context: ToolcraftPanelActionContext,
): Promise<void> {
  const provider = getExportProvider();
  const model = provider.getModel()!;
  const imageFormat = asString(context.state.values["export.image.format"], "png");
  const imageResolution = asString(
    context.state.values["export.image.resolution"],
    "4k",
  ) as ToolcraftImageExportResolution;
  const includeBackground = shouldIncludeToolcraftPreviewBackground({
    state: context.state,
  });
  const settings = getLiquidMetal3DSettings(context.state);
  const exportSize = getToolcraftImageExportSize({
    resolution: imageResolution,
    state: context.state,
  });

  context.reportProgress(0.08);
  const renderedCanvas = await renderExportFrame({
    height: exportSize.height,
    includeBackground,
    model,
    state: context.state,
    timeSeconds: context.state.timeline.currentTimeSeconds,
    width: exportSize.width,
  });
  context.reportProgress(0.62);

  const exportCanvas = createToolcraftPngExportCanvas({
    background: settings.background,
    includeBackground,
    resolution: imageResolution,
    state: context.state,
    render: ({ context: canvasContext, cssHeight, cssWidth }) => {
      canvasContext.drawImage(renderedCanvas, 0, 0, cssWidth, cssHeight);
    },
  });
  const mimeType = imageFormat === "jpg" ? "image/jpeg" : "image/png";
  const extension = imageFormat === "jpg" ? "jpg" : "png";
  const blob = await canvasToBlob(
    exportCanvas,
    mimeType,
    imageFormat === "jpg" ? 0.94 : undefined,
  );

  context.reportProgress(0.92);
  const url = downloadBlob(blob, `liquid-metal-3d.${extension}`);

  window.__toolcraftLastPngExport = {
    blob,
    format: imageFormat,
    height: exportCanvas.height,
    type: mimeType,
    url,
    width: exportCanvas.width,
  };
  context.reportProgress(1);
}

function getSupportedVideoMime(requestedFormat: string): {
  extension: "mp4" | "webm";
  mimeType: string;
} {
  const mp4Candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];
  const webmCandidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const candidates =
    requestedFormat === "webm" ? webmCandidates : [...mp4Candidates, ...webmCandidates];
  const mimeType =
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    "video/webm";

  return {
    extension: mimeType.includes("mp4") ? "mp4" : "webm",
    mimeType,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function exportLiquidMetalVideo(
  context: ToolcraftPanelActionContext,
): Promise<void> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video export requires MediaRecorder support.");
  }

  const provider = getExportProvider();
  const model = provider.getModel()!;
  const requestedFormat = asString(
    context.state.values["export.video.format"],
    "mp4",
  );
  const resolution = asString(
    context.state.values["export.video.resolution"],
    "current",
  );
  const { extension, mimeType } = getSupportedVideoMime(requestedFormat);
  const size = getToolcraftVideoExportSize({
    resolution,
    state: context.state,
  });
  const durationSeconds = Math.max(0.1, context.state.timeline.durationSeconds);
  const fps = 30;
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  const frameIntervalMs = (durationSeconds * 1000) / frameCount;
  const settings = getLiquidMetal3DSettings(context.state, {
    includeVideoBackground: true,
    timeSeconds: 0,
  });
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const sceneRenderer = new LiquidMetalSceneRenderer(canvas, {
    environmentMaxWidth: 2048,
    preserveDrawingBuffer: true,
  });
  const includeVideoBackground = shouldIncludeToolcraftExportBackground({
    format: "video",
    schema: context.state.schema,
  });
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  const orbitPose = readLiquidMetalOrbitPose(
    context.state.values["view.orbit"],
  );

  sceneRenderer.setLiquidMetalSettings(settings);
  context.reportProgress(0.02);
  await sceneRenderer.setEnvironment(
    getLiquidMetalEnvironmentSettings(context.state),
  );
  await sceneRenderer.setScratchMask(
    getLiquidMetalScratchAsset(context.state.mediaAssets),
  );
  sceneRenderer.setModel(model.clone(true));
  const stickerAssets = getLiquidMetalStickerAssets(context.state.mediaAssets);

  await sceneRenderer.setStickers(
    stickerAssets,
    getLiquidMetalStickerRenderPlacements(context.state, stickerAssets),
    getLiquidMetalStickerTransformSettings(context.state),
  );

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    recorder.addEventListener(
      "error",
      () => reject(new Error("Liquid Metal video recorder failed.")),
      { once: true },
    );
  });

  context.reportProgress(0.04);
  recorder.start(200);
  const startedAt = performance.now();

  try {
    for (let frame = 0; frame < frameCount; frame += 1) {
      const timeSeconds = (frame / frameCount) * durationSeconds;

      sceneRenderer.setLiquidMetalSettings(
        getLiquidMetal3DSettings(context.state, {
          includeVideoBackground: true,
          timeSeconds,
        }),
      );
      sceneRenderer.render({
        background: settings.background,
        height: size.height,
        includeBackground: includeVideoBackground,
        orbitPose,
        width: size.width,
      });
      const track = stream.getVideoTracks()[0] as
        | (MediaStreamTrack & { requestFrame?: () => void })
        | undefined;

      track?.requestFrame?.();
      context.reportProgress(0.04 + (timeSeconds / durationSeconds) * 0.9);

      const targetTime = startedAt + (frame + 1) * frameIntervalMs;

      await wait(Math.max(0, targetTime - performance.now()));
    }

    recorder.requestData();
    recorder.stop();
    await stopped;
  } finally {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    stream.getTracks().forEach((track) => track.stop());
    sceneRenderer.dispose();
  }

  const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });

  if (blob.size === 0) {
    throw new Error("Liquid Metal video recorder produced an empty file.");
  }

  const url = downloadBlob(blob, `liquid-metal-3d.${extension}`);

  window.__toolcraftLastVideoExport = {
    blob,
    durationSeconds,
    height: size.height,
    type: blob.type || mimeType,
    url,
    width: size.width,
  };
  context.reportProgress(1);
}

function isPresetAction(value: string): value is `preset.${LiquidMetalPresetId}` {
  return /^preset\.(default|noir|backdrop|stripes)$/u.test(value);
}

function applyLiquidMetalPreset(context: ToolcraftPanelActionContext): void {
  if (!isPresetAction(context.action.value)) {
    return;
  }

  const presetId = context.action.value.slice("preset.".length) as LiquidMetalPresetId;

  for (const { target, value } of liquidMetalPresetTargetValues(presetId)) {
    context.dispatch({
      historyGroup: `liquid-metal-preset-${presetId}`,
      label: `Apply ${presetId} preset`,
      target,
      type: "controls.setValue",
      value,
    });
  }
}

export const handleLiquidMetalPanelAction: ToolcraftPanelActionHandler = (
  context,
): Promise<void> | void => {
  if (context.action.value === "export.png") {
    return exportLiquidMetalPng(context);
  }

  if (context.action.value === "export.video") {
    return exportLiquidMetalVideo(context);
  }

  applyLiquidMetalPreset(context);
};
