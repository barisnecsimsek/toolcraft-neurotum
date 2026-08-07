import * as React from "react";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime";
import type { ToolcraftState } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { getPaletteHex, type PaletteControlValue } from "@/toolcraft/ui";

import {
  SuminagashiFluidEngine,
  type SuminagashiFluidSettings,
} from "./suminagashi-fluid";

export type SuminagashiRendererHandle = {
  drawCurrentFrame: (context: CanvasRenderingContext2D, cssWidth: number, cssHeight: number) => void;
  clear: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readPaletteValue(value: unknown): PaletteControlValue {
  if (
    isRecord(value) &&
    typeof value.family === "string" &&
    typeof value.shade === "string"
  ) {
    return {
      family: value.family as PaletteControlValue["family"],
      shade: value.shade as PaletteControlValue["shade"],
    };
  }

  return { family: "Slate", shade: "900" };
}

function readRenderScale(state: ToolcraftState): number {
  const value = state.values["canvas.renderScale"];

  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(2, Math.max(1, value))
    : state.schema.canvas.renderScale.defaultValue;
}

function readSettings(state: ToolcraftState): SuminagashiFluidSettings {
  const palette = readPaletteValue(state.values["ink.palette"]);

  return {
    autoFlow: readBoolean(state.values["flow.auto"], false),
    backgroundHex: readColorHex(state.values["appearance.background"], "#efeae0"),
    brushFlow: readNumber(state.values["brush.flow"], 100, 0, 180),
    brushLoad: readNumber(state.values["brush.load"], 100, 20, 180),
    brushSettle: readNumber(state.values["brush.settle"], 100, 0, 200),
    brushSize: readNumber(state.values["brush.size"], 28, 6, 72),
    brushTaper: readNumber(state.values["brush.taper"], 100, 0, 200),
    brushWetness: readNumber(state.values["brush.wetness"], 70, 0, 100),
    includeBackground: shouldIncludeToolcraftPreviewBackground({ state }),
    paletteHex: getPaletteHex(palette),
    paperTextureEnabled: readBoolean(state.values["paper.texture.enabled"], false),
    paperTextureFiber: readNumber(state.values["paper.texture.fiber"], 45, 0, 100),
    paperTextureGrain: readNumber(state.values["paper.texture.grain"], 35, 0, 100),
    paperTextureMottle: readNumber(state.values["paper.texture.mottle"], 30, 0, 100),
    paperTextureScale: readNumber(state.values["paper.texture.scale"], 100, 50, 220),
  };
}

export const SuminagashiRenderer = React.forwardRef<SuminagashiRendererHandle>(
  function SuminagashiRenderer(_props, ref): React.JSX.Element {
    const { state } = useToolcraft();
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const engineRef = React.useRef<SuminagashiFluidEngine | null>(null);
    const previousClearSignalRef = React.useRef<unknown>(state.values["flow.clearSignal"]);
    const previousViewportRef = React.useRef({
      offsetX: state.canvas.offset.x,
      offsetY: state.canvas.offset.y,
      zoom: state.canvas.zoom,
    });
    const settings = React.useMemo(() => readSettings(state), [state]);
    const previousDisplaySettingsRef = React.useRef({
      backgroundHex: settings.backgroundHex,
      includeBackground: settings.includeBackground,
      paperTextureEnabled: settings.paperTextureEnabled,
      paperTextureFiber: settings.paperTextureFiber,
      paperTextureGrain: settings.paperTextureGrain,
      paperTextureMottle: settings.paperTextureMottle,
      paperTextureScale: settings.paperTextureScale,
    });
    const renderScale = readRenderScale(state);

    React.useImperativeHandle(
      ref,
      () => ({
        drawCurrentFrame(context, cssWidth, cssHeight) {
          const canvas = canvasRef.current;
          const engine = engineRef.current;

          if (!canvas || !engine) {
            return;
          }

          engine.renderDisplay(settings);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(canvas, 0, 0, cssWidth, cssHeight);
        },
        clear() {
          engineRef.current?.clearWithFade();
        },
      }),
      [settings],
    );

    React.useEffect(() => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return undefined;
      }

      const engine = new SuminagashiFluidEngine(canvas);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      engineRef.current = engine;
      engine.setReducedMotion(reducedMotion.matches);
      engine.setSettings(settings);
      engine.resize({
        cssHeight: state.canvas.size.height,
        cssWidth: state.canvas.size.width,
        renderScale,
      });
      engine.start();

      const onReducedMotionChange = (event: MediaQueryListEvent): void => {
        engine.setReducedMotion(event.matches);
      };

      reducedMotion.addEventListener("change", onReducedMotionChange);

      return () => {
        reducedMotion.removeEventListener("change", onReducedMotionChange);
        engine.dispose();
        engineRef.current = null;
      };
    }, []);

    React.useEffect(() => {
      const engine = engineRef.current;

      if (!engine) {
        return;
      }

      engine.markViewportInteraction();
      engine.setSettings(settings);

      const previousDisplaySettings = previousDisplaySettingsRef.current;
      const displayChanged =
        previousDisplaySettings.backgroundHex !== settings.backgroundHex ||
        previousDisplaySettings.includeBackground !== settings.includeBackground ||
        previousDisplaySettings.paperTextureEnabled !== settings.paperTextureEnabled ||
        previousDisplaySettings.paperTextureFiber !== settings.paperTextureFiber ||
        previousDisplaySettings.paperTextureGrain !== settings.paperTextureGrain ||
        previousDisplaySettings.paperTextureMottle !== settings.paperTextureMottle ||
        previousDisplaySettings.paperTextureScale !== settings.paperTextureScale;

      previousDisplaySettingsRef.current = {
        backgroundHex: settings.backgroundHex,
        includeBackground: settings.includeBackground,
        paperTextureEnabled: settings.paperTextureEnabled,
        paperTextureFiber: settings.paperTextureFiber,
        paperTextureGrain: settings.paperTextureGrain,
        paperTextureMottle: settings.paperTextureMottle,
        paperTextureScale: settings.paperTextureScale,
      };

      if (displayChanged) {
        engine.renderDisplay(settings);
      }
    }, [settings]);

    React.useEffect(() => {
      engineRef.current?.markViewportInteraction();
    }, [state.values]);

    React.useEffect(() => {
      const engine = engineRef.current;

      if (!engine) {
        return undefined;
      }

      const timeout = window.setTimeout(() => {
        engine.resize({
          cssHeight: state.canvas.size.height,
          cssWidth: state.canvas.size.width,
          renderScale,
        });
      }, 120);

      engine.markViewportInteraction();
      return () => window.clearTimeout(timeout);
    }, [renderScale, state.canvas.size.height, state.canvas.size.width]);

    React.useEffect(() => {
      const previous = previousClearSignalRef.current;
      const next = state.values["flow.clearSignal"];

      previousClearSignalRef.current = next;

      if (next !== previous && typeof next === "number" && next > 0) {
        engineRef.current?.clearWithFade();
      }
    }, [state.values]);

    React.useEffect(() => {
      const previous = previousViewportRef.current;
      const next = {
        offsetX: state.canvas.offset.x,
        offsetY: state.canvas.offset.y,
        zoom: state.canvas.zoom,
      };

      previousViewportRef.current = next;

      if (
        next.offsetX !== previous.offsetX ||
        next.offsetY !== previous.offsetY ||
        next.zoom !== previous.zoom
      ) {
        engineRef.current?.markViewportInteraction();
      }
    }, [state.canvas.offset.x, state.canvas.offset.y, state.canvas.zoom]);

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      engineRef.current?.pointerDown(event.clientX, event.clientY);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
      event.stopPropagation();
      engineRef.current?.pointerMove(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
      event.stopPropagation();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      engineRef.current?.pointerUp();
    };

    const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>): void => {
      event.stopPropagation();
      engineRef.current?.pointerCancel();
    };

    return (
      <canvas
        aria-label="Suminagashi drawing surface"
        className="block h-full w-full cursor-crosshair touch-none"
        data-suminagashi-canvas=""
        data-toolcraft-product-output=""
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={canvasRef}
        style={{
          backgroundColor: settings.includeBackground ? settings.backgroundHex : "transparent",
          height: state.canvas.size.height,
          width: state.canvas.size.width,
        }}
      />
    );
  },
);
