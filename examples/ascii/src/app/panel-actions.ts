import type { ToolcraftPanelActionHandler } from "@/toolcraft/runtime/react";

import { duotonePresets, stylizedEffectOptions } from "./effect-presets";
import { renderEffectsExportCanvas } from "./renderer/effects-canvas";

function asHex(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "hex" in value) {
    const hex = (value as { hex?: unknown }).hex;
    if (typeof hex === "string") return hex;
  }
  return fallback;
}

function randomHex(): string {
  const channel = () => Math.floor(32 + Math.random() * 208);
  return `#${[channel(), channel(), channel()]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function dispatchValue(
  dispatch: Parameters<ToolcraftPanelActionHandler>[0]["dispatch"],
  target: string,
  value: unknown,
): void {
  dispatch({ label: `Update ${target}`, target, type: "controls.setValue", value });
}

function randomizeActiveEffect({
  dispatch,
  mode,
}: {
  dispatch: Parameters<ToolcraftPanelActionHandler>[0]["dispatch"];
  mode: string;
}): void {
  const random = (min: number, max: number) => min + Math.random() * (max - min);
  const rounded = (min: number, max: number, step = 1) =>
    Math.round(random(min, max) / step) * step;

  switch (mode) {
    case "pixelate":
      dispatchValue(dispatch, "pixelate.size", rounded(2, 128));
      break;
    case "dither":
      dispatchValue(dispatch, "dither.size", rounded(1, 16));
      dispatchValue(dispatch, "dither.pattern", ["bayer-4", "fine-8", "clustered", "diagonal"][Math.floor(Math.random() * 4)]);
      break;
    case "ascii":
      dispatchValue(dispatch, "ascii.size", rounded(4, 50));
      dispatchValue(dispatch, "ascii.brightness", Number(random(0.5, 2).toFixed(2)));
      dispatchValue(dispatch, "ascii.spacing", Number(random(0, 0.5).toFixed(2)));
      break;
    case "halftone":
      dispatchValue(dispatch, "halftone.size", rounded(5, 100));
      dispatchValue(dispatch, "halftone.angle", rounded(0, 360));
      dispatchValue(dispatch, "halftone.spacing", Number(random(0, 0.8).toFixed(2)));
      break;
    case "mosaic":
      dispatchValue(dispatch, "mosaic.size", rounded(4, 64));
      dispatchValue(dispatch, "mosaic.jitter", Number(random(0, 1).toFixed(2)));
      break;
    case "bricks":
      dispatchValue(dispatch, "bricks.size", rounded(8, 64, 0.5));
      dispatchValue(dispatch, "bricks.light", rounded(0, 360));
      break;
    case "pointillism":
      dispatchValue(dispatch, "pointillism.size", rounded(2, 24));
      dispatchValue(dispatch, "pointillism.jitter", Number(random(0, 1).toFixed(2)));
      break;
    case "heatmap":
      dispatchValue(dispatch, "heatmap.palette", ["thermal", "viridis", "plasma", "inferno", "cool-warm"][Math.floor(Math.random() * 5)]);
      dispatchValue(dispatch, "heatmap.contrast", Number(random(0.5, 3).toFixed(2)));
      break;
    case "threshold":
      dispatchValue(dispatch, "threshold.value", Number(random(0, 1).toFixed(2)));
      dispatchValue(dispatch, "threshold.smoothing", Number(random(0, 1).toFixed(2)));
      break;
    case "duotone": {
      const preset = duotonePresets[Math.floor(Math.random() * duotonePresets.length)];
      dispatchValue(dispatch, "duotone.colors.preset", preset?.value ?? "monochrome");
      break;
    }
    default: {
      const next = stylizedEffectOptions[1 + Math.floor(Math.random() * (stylizedEffectOptions.length - 1))];
      dispatchValue(dispatch, "effect.mode", next?.value ?? "pixelate");
    }
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Browser could not encode the rendered image."));
      },
      mimeType,
      0.94,
    );
  });
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export const handleEffectsPanelAction: ToolcraftPanelActionHandler = ({
  action,
  dispatch,
  reportProgress,
  state,
}) => {
  if (action.value === "effect.randomize") {
    randomizeActiveEffect({
      dispatch,
      mode: String(state.values["effect.mode"] ?? "none"),
    });
    return;
  }

  if (action.value.startsWith("colors.swap:")) {
    const prefix = action.value.slice("colors.swap:".length);
    const ink = asHex(state.values[`${prefix}.ink`], "#000000");
    const paper = asHex(state.values[`${prefix}.paper`], "#FFFFFF");
    dispatchValue(dispatch, `${prefix}.ink`, paper);
    dispatchValue(dispatch, `${prefix}.paper`, ink);
    return;
  }

  if (action.value.startsWith("colors.randomize:")) {
    const prefix = action.value.slice("colors.randomize:".length);
    dispatchValue(dispatch, `${prefix}.ink`, randomHex());
    dispatchValue(dispatch, `${prefix}.paper`, randomHex());
    return;
  }

  if (action.value === "overlay.swap") {
    const start = asHex(state.values["overlay.start"], "#000000");
    const end = asHex(state.values["overlay.end"], "#FFFFFF");
    dispatchValue(dispatch, "overlay.start", end);
    dispatchValue(dispatch, "overlay.end", start);
    return;
  }

  if (action.value !== "export.png") {
    return;
  }

  return (async () => {
    reportProgress(0.08);
    await nextPaint();

    const format = String(state.values["export.image.format"] ?? "png").toLowerCase();
    const imageResolution = String(
      state.values["export.image.resolution"] ?? "4k",
    ).toLowerCase();
    const includeBackground =
      format === "jpg" ? true : state.values["export.includeBackground"] !== false;
    const canvas = await renderEffectsExportCanvas({
      includeBackground,
      imageResolution,
      state,
    });

    reportProgress(0.72);
    await nextPaint();
    const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
    const blob = await canvasToBlob(canvas, mimeType);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = `mesh-fx-${imageResolution}.${format === "jpg" ? "jpg" : "png"}`;
    anchor.href = url;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    reportProgress(1);
  })();
};
