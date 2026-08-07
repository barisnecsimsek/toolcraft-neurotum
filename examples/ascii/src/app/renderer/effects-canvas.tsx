import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  getToolcraftImageExportSize,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { createControlHistoryGroupId } from "@/toolcraft/ui";

import { readEffectsRendererSettings } from "./effect-state";
import { shouldSuspendGrainForPointerGesture } from "./grain-interaction";
import { orbitPoseFromPointerDelta, type OrbitPose } from "./orbit-camera";
import { ThreeEffectsEngine } from "./three-effects-engine";

function getSourceModel(state: ToolcraftState) {
  return state.mediaAssets.find((asset) => asset.sourceTarget === "source.model");
}

function getRenderScale(state: ToolcraftState): number {
  const value = Number(state.values["canvas.renderScale"]);
  return Number.isFinite(value)
    ? Math.max(1, value)
    : state.schema.canvas.renderScale.defaultValue;
}

function getFittedPreviewSize(canvas: HTMLCanvasElement): {
  height: number;
  width: number;
} {
  const bounds = canvas.getBoundingClientRect();
  const viewport = canvas.closest('[data-slot="toolcraft-runtime-canvas"]');
  const viewportBounds = viewport?.getBoundingClientRect();
  const fitScale = viewportBounds
    ? Math.min(
        1,
        viewportBounds.width / Math.max(1, bounds.width),
        viewportBounds.height / Math.max(1, bounds.height),
      )
    : 1;

  return {
    height: Math.max(1, Math.round(bounds.height * fitScale)),
    width: Math.max(1, Math.round(bounds.width * fitScale)),
  };
}

export function EffectsCanvas(): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const engineRef = React.useRef<ThreeEffectsEngine | null>(null);
  const settingsRenderFrameRef = React.useRef(0);
  const settings = React.useMemo(
    () => readEffectsRendererSettings(state),
    // Viewport pan/zoom replaces Toolcraft state but preserves values. Keeping this
    // dependency value-only prevents an unrelated viewport gesture from rerunning WebGL.
    [state.values],
  );
  const settingsRef = React.useRef(settings);
  const [modelSource, setModelSource] = React.useState<"default" | "loading" | "upload">(
    "loading",
  );
  const sourceModel = getSourceModel(state);
  const sourceIdentity = sourceModel ? `${sourceModel.id}:${sourceModel.dataUrl.length}` : "default";
  const renderScale = getRenderScale(state);

  settingsRef.current = settings;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ThreeEffectsEngine(canvas);
    engineRef.current = engine;

    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, []);

  React.useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let cancelled = false;
    setModelSource("loading");
    void engine.setModel(sourceModel).then((source) => {
      if (cancelled) return;
      setModelSource(source);
      engine.render(settingsRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, [sourceIdentity]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const viewport = canvas.closest('[data-slot="toolcraft-runtime-canvas"]');
    const resize = () => {
      const previewSize = getFittedPreviewSize(canvas);
      const pixelRatio = (window.devicePixelRatio || 1) * renderScale;
      const needsRender = engine.setSize(
        previewSize.width,
        previewSize.height,
        pixelRatio,
        previewSize.width,
      );
      if (needsRender) engine.render(settingsRef.current);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (viewport) observer.observe(viewport);
    resize();

    return () => observer.disconnect();
  }, [renderScale]);

  React.useEffect(() => {
    window.cancelAnimationFrame(settingsRenderFrameRef.current);
    settingsRenderFrameRef.current = window.requestAnimationFrame(() => {
      settingsRenderFrameRef.current = 0;
      engineRef.current?.render(settingsRef.current);
    });

    return () => window.cancelAnimationFrame(settingsRenderFrameRef.current);
  }, [settings]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let activePointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let historyGroup = "";
    let pendingPose: OrbitPose | null = null;
    let orbitFrame = 0;

    const commitOrbit = () => {
      orbitFrame = 0;
      if (!pendingPose) return;
      const value = pendingPose;
      pendingPose = null;
      dispatch({
        history: "merge",
        historyGroup,
        label: "Orbit view",
        target: "view.orbit",
        type: "controls.setValue",
        value,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      activePointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      historyGroup = createControlHistoryGroupId("view-orbit-drag");
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.orbiting = "true";
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = canvas.getBoundingClientRect();
      const nextPose = orbitPoseFromPointerDelta(
        settingsRef.current.orbitPose,
        event.clientX - lastX,
        event.clientY - lastY,
        Math.max(1, bounds.height),
      );
      lastX = event.clientX;
      lastY = event.clientY;
      const nextSettings = {
        ...settingsRef.current,
        orbitPose: nextPose,
      };
      settingsRef.current = nextSettings;
      pendingPose = nextPose;
      if (!orbitFrame) orbitFrame = window.requestAnimationFrame(commitOrbit);
    };

    const endOrbit = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (orbitFrame) window.cancelAnimationFrame(orbitFrame);
      commitOrbit();
      activePointerId = null;
      delete canvas.dataset.orbiting;
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endOrbit);
    canvas.addEventListener("pointercancel", endOrbit);

    return () => {
      if (orbitFrame) window.cancelAnimationFrame(orbitFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endOrbit);
      canvas.removeEventListener("pointercancel", endOrbit);
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (!settings.grain.enabled || !settings.grain.animate) return;
    const viewport = canvasRef.current?.closest('[data-slot="toolcraft-runtime-canvas"]');
    let frame = 0;
    let cancelled = false;
    let interacting = false;
    let resumeTimer = 0;

    const suspend = () => {
      interacting = true;
      window.clearTimeout(resumeTimer);
    };
    const pausePointer = (event: Event) => {
      if (!(event instanceof PointerEvent)) return;
      const target = event.target;
      if (
        !shouldSuspendGrainForPointerGesture({
          button: event.button,
          ctrlKey: event.ctrlKey,
          isEffectsCanvas: target === canvasRef.current,
          isOrientationGizmo:
            target instanceof Element &&
            Boolean(
              target.closest(
                '[data-toolcraft-canvas-handle="orientation-gizmo"]',
              ),
            ),
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        })
      ) {
        return;
      }
      suspend();
    };
    const resume = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        interacting = false;
      }, 80);
    };

    const renderFrame = (time: number) => {
      if (cancelled) return;
      if (!interacting) {
        engineRef.current?.renderAnimated(settingsRef.current, time / 1000);
      }
      frame = window.requestAnimationFrame(renderFrame);
    };

    viewport?.addEventListener("pointerdown", pausePointer, true);
    viewport?.addEventListener("pointerup", resume, true);
    viewport?.addEventListener("pointercancel", resume, true);
    viewport?.addEventListener("wheel", suspend, { passive: true });
    viewport?.addEventListener("wheel", resume, { passive: true });
    frame = window.requestAnimationFrame(renderFrame);
    return () => {
      cancelled = true;
      window.clearTimeout(resumeTimer);
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener("pointerdown", pausePointer, true);
      viewport?.removeEventListener("pointerup", resume, true);
      viewport?.removeEventListener("pointercancel", resume, true);
      viewport?.removeEventListener("wheel", suspend);
      viewport?.removeEventListener("wheel", resume);
    };
  }, [settings.grain.animate, settings.grain.enabled]);

  return (
    <div
      className="size-full"
      data-model-source={modelSource}
      data-toolcraft-product-output="mesh-fx"
    >
      <canvas
        aria-label="Mesh effects output"
        className="block size-full"
        data-effect-mode={String(state.values["effect.mode"] ?? "none")}
        data-view-orbit={JSON.stringify(settings.orbitPose)}
        data-toolcraft-product-output="mesh-fx-canvas"
        ref={canvasRef}
        style={{ cursor: "grab", touchAction: "none" }}
      />
    </div>
  );
}

export async function renderEffectsExportCanvas({
  includeBackground,
  imageResolution,
  state,
}: {
  includeBackground: boolean;
  imageResolution: string;
  state: ToolcraftState;
}): Promise<HTMLCanvasElement> {
  const exportSize = getToolcraftImageExportSize({ resolution: imageResolution, state });
  const sourceCanvas = document.createElement("canvas");
  const engine = new ThreeEffectsEngine(sourceCanvas);
  const previewCanvas = document.querySelector<HTMLCanvasElement>(
    '[data-toolcraft-product-output="mesh-fx-canvas"]',
  );
  const effectScaleBaselineWidth = previewCanvas
    ? getFittedPreviewSize(previewCanvas).width
    : Math.max(1, state.canvas.size.width);
  const settings = {
    ...readEffectsRendererSettings(state),
    includeBackground,
  };

  try {
    engine.setSize(exportSize.width, exportSize.height, 1, effectScaleBaselineWidth);
    await engine.setModel(getSourceModel(state));
    engine.render(settings, 0);

    return createToolcraftPngExportCanvas({
      background: settings.background,
      includeBackground: includeBackground,
      resolution: imageResolution,
      state,
      render: ({ context, cssHeight, cssWidth }) => {
        context.drawImage(sourceCanvas, 0, 0, cssWidth, cssHeight);
      },
    });
  } finally {
    engine.dispose();
  }
}
