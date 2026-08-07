import * as React from "react";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { createControlHistoryGroupId } from "@/toolcraft/ui";

import {
  registerLiquidMetalExportProvider,
  type LiquidMetalExportProvider,
} from "./liquid-metal-export";
import { getLiquidMetalEnvironmentSettings } from "./liquid-metal-environment";
import {
  disposeLiquidMetalModel,
  loadLiquidMetalModel,
  type LoadedLiquidMetalModel,
} from "./liquid-metal-model";
import { LiquidMetalSceneRenderer } from "./liquid-metal-scene";
import {
  getLiquidMetalOrbitPoseFromPointerDelta,
  readLiquidMetalOrbitPose,
  type LiquidMetalOrbitPose,
} from "./liquid-metal-orbit";
import {
  advanceLiquidMetalPreviewDeadline,
  isLiquidMetalPreviewFrameDue,
  liquidMetalPreviewFrameIntervalMs,
  liquidMetalViewportInteractionFrameIntervalMs,
  retimeLiquidMetalPreviewDeadline,
} from "./liquid-metal-preview-scheduler";
import { getLiquidMetalScratchSettings } from "./liquid-metal-scratches";
import {
  getLiquidMetalStickerAssets,
  getLiquidMetalStickerPlacements,
  getLiquidMetalStickerStateToken,
  getLiquidMetalStickerTransformSettings,
  liquidMetalStickerPlacementTarget,
  liquidMetalStickerRotationTarget,
  liquidMetalStickerScaleTarget,
  type LiquidMetalStickerPlacementMap,
} from "./liquid-metal-stickers";
import { getLiquidMetal3DSettings } from "./liquid-metal-values";

const modelTarget = "media.model";
const viewportInteractionSettleMs = 320;

function getModelAsset(
  mediaAssets: readonly ToolcraftMediaAsset[],
): ToolcraftMediaAsset | null {
  return (
    mediaAssets.find((asset) => asset.sourceTarget === modelTarget) ?? null
  );
}

function getRenderScale(value: unknown, fallback: number): number {
  const resolved =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.round(Math.max(1, Math.min(2, resolved)));
}

function getPreviewToken({
  model,
  settingsToken,
  triangleCount,
}: {
  model: LoadedLiquidMetalModel | null;
  settingsToken: string;
  triangleCount: number;
}): string {
  return `${model?.sourceLabel ?? "none"}:${triangleCount}:${settingsToken}`;
}

export function LiquidMetal3DRenderer(): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const orbitPose = readLiquidMetalOrbitPose(state.values["view.orbit"]);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sceneRendererRef = React.useRef<LiquidMetalSceneRenderer | null>(null);
  const modelRef = React.useRef<LoadedLiquidMetalModel | null>(null);
  const orbitPoseRef = React.useRef<LiquidMetalOrbitPose>(orbitPose);
  const pendingOrbitPoseRef = React.useRef<LiquidMetalOrbitPose | null>(null);
  const orbitCommitFrameRef = React.useRef(0);
  const pointerRef = React.useRef<{
    active: boolean;
    historyGroup: string;
    lastX: number;
    lastY: number;
    mode: "none" | "orbit" | "sticker";
    pointerId: number | null;
    stickerChanged: boolean;
    stickerId: string | null;
  }>({
    active: false,
    historyGroup: "",
    lastX: 0,
    lastY: 0,
    mode: "none",
    pointerId: null,
    stickerChanged: false,
    stickerId: null,
  });
  const stateRef = React.useRef(state);
  const settings = getLiquidMetal3DSettings(state);
  const settingsRef = React.useRef(settings);
  const environmentSettings = getLiquidMetalEnvironmentSettings(state);
  const environmentSettingsRef = React.useRef(environmentSettings);
  const scratchSettings = getLiquidMetalScratchSettings(state);
  const stickerAssets = getLiquidMetalStickerAssets(state.mediaAssets);
  const stickerPlacements = getLiquidMetalStickerPlacements(state);
  const stickerTransformSettings =
    getLiquidMetalStickerTransformSettings(state);
  const selectedStickerId =
    stickerAssets.find((asset) => asset.layerId === state.selectedLayerId)
      ?.id ?? null;
  const stickerPlacementsRef =
    React.useRef<LiquidMetalStickerPlacementMap>(stickerPlacements);
  const stickerTransformCommitTimeoutRef = React.useRef<number | null>(null);
  const selectedStickerSyncRef = React.useRef<string | null>(null);
  const lastSelectedStickerIdRef = React.useRef<string | null>(null);
  const stickerToken = getLiquidMetalStickerStateToken(
    stickerAssets,
    stickerPlacements,
  );
  const previewSurfaceFrameRef = React.useRef(settings.frame);
  const previousViewportRef = React.useRef({
    offsetX: state.canvas.offset.x,
    offsetY: state.canvas.offset.y,
    zoom: state.canvas.zoom,
  });
  const viewportInteractionUntilRef = React.useRef(0);
  const renderRequestedRef = React.useRef(true);
  const renderBurstFramesRef = React.useRef(0);
  const partialStickerUpdateRef = React.useRef(false);
  const [loadedModel, setLoadedModel] =
    React.useState<LoadedLiquidMetalModel | null>(null);
  const [loadError, setLoadError] = React.useState("");
  const [environmentError, setEnvironmentError] = React.useState("");
  const [scratchError, setScratchError] = React.useState("");
  const [appliedEnvironmentKey, setAppliedEnvironmentKey] =
    React.useState("preset:studio");
  const [appliedScratchKey, setAppliedScratchKey] = React.useState("");
  const modelAsset = getModelAsset(state.mediaAssets);
  const renderScale = getRenderScale(
    state.values["canvas.renderScale"],
    state.schema.canvas.renderScale.defaultValue,
  );
  const viewportChanged =
    previousViewportRef.current.offsetX !== state.canvas.offset.x ||
    previousViewportRef.current.offsetY !== state.canvas.offset.y ||
    previousViewportRef.current.zoom !== state.canvas.zoom;

  if (viewportChanged) {
    previousViewportRef.current = {
      offsetX: state.canvas.offset.x,
      offsetY: state.canvas.offset.y,
      zoom: state.canvas.zoom,
    };
    viewportInteractionUntilRef.current =
      performance.now() + viewportInteractionSettleMs;
  }

  const viewportInteractionActive =
    typeof performance !== "undefined" &&
    performance.now() < viewportInteractionUntilRef.current;

  if (!viewportInteractionActive) {
    previewSurfaceFrameRef.current = settings.frame;
  }

  const previewSettings = {
    ...settings,
    frame: previewSurfaceFrameRef.current,
  };
  const sceneSettingsToken = JSON.stringify({
    canvas: state.canvas.size,
    renderScale,
    environment: {
      intensity: environmentSettings.intensity,
      rotationDegrees: environmentSettings.rotationDegrees,
      sourceKey: environmentSettings.sourceKey,
    },
    scratches: {
      sourceKey: scratchSettings.sourceKey,
      transform: scratchSettings.transformToken,
    },
    surface: previewSettings,
    timeline: {
      currentTimeSeconds: state.timeline.currentTimeSeconds,
      durationSeconds: state.timeline.durationSeconds,
      isPlaying: state.timeline.isPlaying,
    },
    viewOrbit: orbitPose,
  });
  const settingsToken = JSON.stringify({
    scene: sceneSettingsToken,
    stickers: stickerToken,
  });
  const sceneSettingsTokenRef = React.useRef(sceneSettingsToken);

  stateRef.current = state;
  orbitPoseRef.current = orbitPose;
  settingsRef.current = previewSettings;
  environmentSettingsRef.current = environmentSettings;
  if (stickerTransformCommitTimeoutRef.current === null) {
    stickerPlacementsRef.current = stickerPlacements;
  }
  sceneSettingsTokenRef.current = sceneSettingsToken;

  React.useEffect(() => {
    partialStickerUpdateRef.current = false;
    renderRequestedRef.current = true;
    renderBurstFramesRef.current = 2;
  }, [sceneSettingsToken, loadedModel]);

  React.useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const sceneRenderer = new LiquidMetalSceneRenderer(canvas, {
      preserveDrawingBuffer: true,
    });
    sceneRendererRef.current = sceneRenderer;
    canvas.style.height = "100%";
    canvas.style.width = "100%";

    let frameId = 0;
    let activeFrameIntervalMs = liquidMetalPreviewFrameIntervalMs;
    let nextRenderAtMs: number | null = null;
    let lastSignature = "";

    const animate = (now: number): void => {
      const currentModel = modelRef.current;
      const currentState = stateRef.current;
      const currentSettings = settingsRef.current;
      const currentRenderScale = getRenderScale(
        currentState.values["canvas.renderScale"],
        currentState.schema.canvas.renderScale.defaultValue,
      );
      const interactionActive = now < viewportInteractionUntilRef.current;
      const frameIntervalMs = interactionActive
        ? liquidMetalViewportInteractionFrameIntervalMs
        : liquidMetalPreviewFrameIntervalMs;

      if (frameIntervalMs !== activeFrameIntervalMs) {
        nextRenderAtMs = retimeLiquidMetalPreviewDeadline(
          now,
          nextRenderAtMs,
          activeFrameIntervalMs,
          frameIntervalMs,
        );
        activeFrameIntervalMs = frameIntervalMs;
      }

      const physicalWidth = Math.max(
        1,
        Math.round(currentState.canvas.size.width * currentRenderScale),
      );
      const physicalHeight = Math.max(
        1,
        Math.round(currentState.canvas.size.height * currentRenderScale),
      );
      const signature = `${sceneSettingsTokenRef.current}:${currentModel?.sourceLabel ?? "none"}`;

      if (currentModel && !sceneRenderer.hasModel()) {
        sceneRenderer.setModel(currentModel.object, {
          disposeReplacedMaterials: true,
        });
        partialStickerUpdateRef.current = false;
        renderRequestedRef.current = true;
      }

      const shouldRender =
        Boolean(currentModel) &&
        isLiquidMetalPreviewFrameDue(now, nextRenderAtMs) &&
        (currentState.timeline.isPlaying ||
          renderBurstFramesRef.current > 0 ||
          renderRequestedRef.current ||
          signature !== lastSignature);

      if (shouldRender) {
        sceneRenderer.prepare(physicalWidth, physicalHeight);
        sceneRenderer.setLiquidMetalSettings(currentSettings);
        sceneRenderer.setEnvironmentAppearance(environmentSettingsRef.current);
        sceneRenderer.render({
          background: currentSettings.background,
          height: physicalHeight,
          includeBackground: currentSettings.includeBackground,
          orbitPose: orbitPoseRef.current,
          partialStickerUpdate: partialStickerUpdateRef.current,
          width: physicalWidth,
        });
        rootRef.current?.setAttribute("data-liquid-metal-rendered", signature);
        rootRef.current?.setAttribute(
          "data-liquid-metal-surface-frame",
          String(currentSettings.frame),
        );
        rootRef.current?.setAttribute(
          "data-liquid-metal-loop-progress",
          String(currentSettings.loopProgress),
        );
        rootRef.current?.setAttribute(
          "data-liquid-metal-sticker-rendered-count",
          String(sceneRenderer.getRenderedStickerCount()),
        );
        lastSignature = signature;
        nextRenderAtMs = advanceLiquidMetalPreviewDeadline(
          now,
          nextRenderAtMs,
          frameIntervalMs,
        );
        partialStickerUpdateRef.current = false;
        renderRequestedRef.current = false;
        renderBurstFramesRef.current = Math.max(
          0,
          renderBurstFramesRef.current - 1,
        );
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      sceneRenderer.dispose();
      sceneRendererRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const sceneRenderer = sceneRendererRef.current;

    if (!sceneRenderer) return;

    let cancelled = false;

    setEnvironmentError("");
    void sceneRenderer
      .setEnvironment(environmentSettings)
      .then(() => {
        if (cancelled) return;

        setAppliedEnvironmentKey(environmentSettings.sourceKey);
        partialStickerUpdateRef.current = false;
        renderRequestedRef.current = true;
        renderBurstFramesRef.current = 2;
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Could not load the environment.";

        setEnvironmentError(message);
        console.error("Liquid Metal environment import failed.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [environmentSettings.sourceKey]);

  React.useEffect(() => {
    const sceneRenderer = sceneRendererRef.current;

    if (!sceneRenderer) return;

    let cancelled = false;

    setScratchError("");
    setAppliedScratchKey("");
    void sceneRenderer
      .setScratchMask(scratchSettings.asset)
      .then(() => {
        if (cancelled) return;

        setAppliedScratchKey(scratchSettings.sourceKey);
        partialStickerUpdateRef.current = false;
        renderRequestedRef.current = true;
        renderBurstFramesRef.current = 2;
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Could not load the scratch mask.";

        setScratchError(message);
        console.error("Liquid Metal scratch mask import failed.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [scratchSettings.sourceKey, scratchSettings.transformToken]);

  React.useEffect(() => {
    const sceneRenderer = sceneRendererRef.current;

    if (!sceneRenderer || !loadedModel) {
      return;
    }

    let cancelled = false;

    void sceneRenderer
      .setStickers(stickerAssets, stickerPlacements, stickerTransformSettings)
      .then((resolvedPlacements) => {
        if (cancelled) return;

        stickerPlacementsRef.current = resolvedPlacements;
        if (
          sceneRenderer.hasPendingStickerGeometry() ||
          sceneRenderer.needsFullStickerRender()
        ) {
          partialStickerUpdateRef.current = false;
          renderRequestedRef.current = true;
          renderBurstFramesRef.current = 2;
        }

        if (
          JSON.stringify(resolvedPlacements) !==
          JSON.stringify(stickerPlacements)
        ) {
          dispatch({
            history: "skip",
            label: "Sync surface sticker placements",
            target: liquidMetalStickerPlacementTarget,
            type: "controls.setValue",
            value: resolvedPlacements,
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        console.error("Liquid Metal sticker import failed.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, loadedModel, stickerToken]);

  React.useEffect(() => {
    if (lastSelectedStickerIdRef.current === selectedStickerId) {
      return;
    }

    if (!selectedStickerId) {
      lastSelectedStickerIdRef.current = null;
      selectedStickerSyncRef.current = null;
      return;
    }

    const placement = stickerPlacements[selectedStickerId];

    if (!placement) {
      return;
    }

    if (stickerTransformCommitTimeoutRef.current !== null) {
      window.clearTimeout(stickerTransformCommitTimeoutRef.current);
      stickerTransformCommitTimeoutRef.current = null;
      dispatch({
        history: "skip",
        label: "Commit previous sticker transform",
        target: liquidMetalStickerPlacementTarget,
        type: "controls.setValue",
        value: stickerPlacementsRef.current,
      });
    }

    lastSelectedStickerIdRef.current = selectedStickerId;
    selectedStickerSyncRef.current = selectedStickerId;
    let changed = false;

    if (stickerTransformSettings.scale !== placement.scale) {
      changed = true;
      dispatch({
        history: "skip",
        label: "Select sticker scale",
        target: liquidMetalStickerScaleTarget,
        type: "controls.setValue",
        value: placement.scale,
      });
    }

    if (
      stickerTransformSettings.rotationDegrees !== placement.rotationDegrees
    ) {
      changed = true;
      dispatch({
        history: "skip",
        label: "Select sticker rotation",
        target: liquidMetalStickerRotationTarget,
        type: "controls.setValue",
        value: placement.rotationDegrees,
      });
    }

    if (!changed) {
      selectedStickerSyncRef.current = null;
    }
  }, [
    dispatch,
    selectedStickerId,
    stickerPlacements,
    stickerTransformSettings.rotationDegrees,
    stickerTransformSettings.scale,
  ]);

  React.useEffect(() => {
    if (!selectedStickerId) {
      return;
    }

    const placement = stickerPlacements[selectedStickerId];

    if (!placement) {
      return;
    }

    if (selectedStickerSyncRef.current === selectedStickerId) {
      const selectionValuesReady =
        stickerTransformSettings.scale === placement.scale &&
        stickerTransformSettings.rotationDegrees === placement.rotationDegrees;

      if (!selectionValuesReady) {
        return;
      }

      selectedStickerSyncRef.current = null;
    }

    if (
      placement.scale === stickerTransformSettings.scale &&
      placement.rotationDegrees === stickerTransformSettings.rotationDegrees
    ) {
      return;
    }

    const transformedPlacement = sceneRendererRef.current?.setStickerTransform(
      selectedStickerId,
      stickerTransformSettings,
    ) ?? {
      ...placement,
      rotationDegrees: stickerTransformSettings.rotationDegrees,
      scale: stickerTransformSettings.scale,
    };
    const nextPlacements = {
      ...stickerPlacementsRef.current,
      [selectedStickerId]: transformedPlacement,
    };

    stickerPlacementsRef.current = nextPlacements;
    partialStickerUpdateRef.current = true;
    renderRequestedRef.current = true;
    renderBurstFramesRef.current = 1;

    if (stickerTransformCommitTimeoutRef.current !== null) {
      window.clearTimeout(stickerTransformCommitTimeoutRef.current);
    }

    stickerTransformCommitTimeoutRef.current = window.setTimeout(() => {
      stickerTransformCommitTimeoutRef.current = null;
      dispatch({
        history: "skip",
        label: "Commit selected sticker transform",
        target: liquidMetalStickerPlacementTarget,
        type: "controls.setValue",
        value: stickerPlacementsRef.current,
      });
    }, 160);
  }, [
    dispatch,
    selectedStickerId,
    stickerPlacements,
    stickerTransformSettings.rotationDegrees,
    stickerTransformSettings.scale,
  ]);

  React.useEffect(
    () => () => {
      if (stickerTransformCommitTimeoutRef.current !== null) {
        window.clearTimeout(stickerTransformCommitTimeoutRef.current);
      }
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    const previousModel = modelRef.current;

    sceneRendererRef.current?.setModel(null);
    modelRef.current = null;
    setLoadedModel(null);
    setLoadError("");
    partialStickerUpdateRef.current = false;
    renderRequestedRef.current = true;

    if (previousModel) {
      disposeLiquidMetalModel(previousModel.object);
    }

    if (!modelAsset) {
      const renderer = sceneRendererRef.current;
      const currentState = stateRef.current;

      renderer?.render({
        background: "#000000",
        height: Math.max(1, currentState.canvas.size.height),
        includeBackground: false,
        orbitPose: orbitPoseRef.current,
        width: Math.max(1, currentState.canvas.size.width),
      });
      return () => {
        cancelled = true;
      };
    }

    void loadLiquidMetalModel(modelAsset)
      .then((model) => {
        if (cancelled) {
          disposeLiquidMetalModel(model.object);
          return;
        }

        modelRef.current = model;
        setLoadedModel(model);
        sceneRendererRef.current?.setModel(model.object, {
          disposeReplacedMaterials: true,
        });
        partialStickerUpdateRef.current = false;
        renderRequestedRef.current = true;
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Could not load model.";

        setLoadError(message);
        console.error("Liquid Metal model import failed.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [modelAsset?.dataUrl, modelAsset?.fileName, modelAsset?.id]);

  React.useEffect(
    () => () => {
      if (modelRef.current) {
        disposeLiquidMetalModel(modelRef.current.object);
        modelRef.current = null;
      }
    },
    [],
  );

  React.useEffect(() => {
    const provider: LiquidMetalExportProvider = {
      getModel: () => modelRef.current?.object ?? null,
    };

    return registerLiquidMetalExportProvider(provider);
  }, []);

  const commitPendingOrbit = React.useCallback(() => {
    orbitCommitFrameRef.current = 0;
    const nextPose = pendingOrbitPoseRef.current;
    const historyGroup = pointerRef.current.historyGroup;

    if (!nextPose || !historyGroup) return;

    pendingOrbitPoseRef.current = null;
    dispatch({
      history: "merge",
      historyGroup,
      label: "Orbit view",
      target: "view.orbit",
      type: "controls.setValue",
      value: nextPose,
    });
  }, [dispatch]);

  React.useEffect(
    () => () => window.cancelAnimationFrame(orbitCommitFrameRef.current),
    [],
  );

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!modelRef.current) {
        return;
      }

      const isPlainLeftButton =
        event.button === 0 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey;
      const stickerHit = isPlainLeftButton
        ? (sceneRendererRef.current?.pickSticker(
            event.clientX,
            event.clientY,
          ) ?? null)
        : null;

      if (stickerHit) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dispatch({ layerId: stickerHit.layerId, type: "layers.select" });
        pointerRef.current = {
          active: true,
          historyGroup: `surface-sticker-drag-${stickerHit.assetId}-${event.pointerId}`,
          lastX: event.clientX,
          lastY: event.clientY,
          mode: "sticker",
          pointerId: event.pointerId,
          stickerChanged: false,
          stickerId: stickerHit.assetId,
        };
        return;
      }

      if (
        !isPlainLeftButton ||
        !sceneRendererRef.current?.hitTestModel(event.clientX, event.clientY)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerRef.current = {
        active: true,
        historyGroup: createControlHistoryGroupId("liquid-metal-view-orbit"),
        lastX: event.clientX,
        lastY: event.clientY,
        mode: "orbit",
        pointerId: event.pointerId,
        stickerChanged: false,
        stickerId: null,
      };
      event.currentTarget.dataset.orbiting = "true";
      partialStickerUpdateRef.current = false;
      renderRequestedRef.current = true;
    },
    [dispatch],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pointer = pointerRef.current;

      if (!pointer.active || pointer.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (pointer.mode === "sticker" && pointer.stickerId) {
        const placement = sceneRendererRef.current?.moveStickerAtClient(
          pointer.stickerId,
          event.clientX,
          event.clientY,
        );

        if (placement) {
          const nextPlacements = {
            ...stickerPlacementsRef.current,
            [pointer.stickerId]: placement,
          };

          stickerPlacementsRef.current = nextPlacements;
          pointerRef.current.stickerChanged = true;
          partialStickerUpdateRef.current = true;
          renderRequestedRef.current = true;
          renderBurstFramesRef.current = 1;
        }
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const nextPose = getLiquidMetalOrbitPoseFromPointerDelta(
        orbitPoseRef.current,
        event.clientX - pointer.lastX,
        event.clientY - pointer.lastY,
        Math.max(1, bounds.height),
      );

      pointerRef.current.lastX = event.clientX;
      pointerRef.current.lastY = event.clientY;
      orbitPoseRef.current = nextPose;
      pendingOrbitPoseRef.current = nextPose;
      if (!orbitCommitFrameRef.current) {
        orbitCommitFrameRef.current =
          window.requestAnimationFrame(commitPendingOrbit);
      }
      partialStickerUpdateRef.current = false;
      renderRequestedRef.current = true;
    },
    [commitPendingOrbit],
  );

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerRef.current.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const pointer = pointerRef.current;

      if (pointer.mode === "orbit") {
        window.cancelAnimationFrame(orbitCommitFrameRef.current);
        commitPendingOrbit();
        delete event.currentTarget.dataset.orbiting;
      }

      if (
        pointer.mode === "sticker" &&
        pointer.stickerId &&
        pointer.stickerChanged
      ) {
        dispatch({
          history: "record",
          label: "Move surface sticker",
          target: liquidMetalStickerPlacementTarget,
          type: "controls.setValue",
          value: stickerPlacementsRef.current,
        });
      }

      pointerRef.current.active = false;
      pointerRef.current.historyGroup = "";
      pointerRef.current.lastX = 0;
      pointerRef.current.lastY = 0;
      pointerRef.current.mode = "none";
      pointerRef.current.pointerId = null;
      pointerRef.current.stickerChanged = false;
      pointerRef.current.stickerId = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (pointer.mode === "orbit") {
        partialStickerUpdateRef.current = false;
        renderRequestedRef.current = true;
      }
    },
    [commitPendingOrbit, dispatch],
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-liquid-metal-error={loadError || undefined}
      data-liquid-metal-environment={environmentSettings.sourceKey}
      data-liquid-metal-environment-applied={appliedEnvironmentKey}
      data-liquid-metal-environment-error={environmentError || undefined}
      data-liquid-metal-model={loadedModel?.sourceLabel ?? ""}
      data-liquid-metal-scratch={scratchSettings.sourceKey}
      data-liquid-metal-scratch-applied={appliedScratchKey}
      data-liquid-metal-scratch-depth={settings.scratchDepth}
      data-liquid-metal-scratch-error={scratchError || undefined}
      data-liquid-metal-preview={getPreviewToken({
        model: loadedModel,
        settingsToken,
        triangleCount: loadedModel?.triangleCount ?? 0,
      })}
      data-liquid-metal-sticker-count={stickerAssets.length}
      data-liquid-metal-sticker-scales={stickerAssets
        .map((asset) => stickerPlacements[asset.id]?.scale ?? "")
        .join(",")}
      data-liquid-metal-sticker-selected={selectedStickerId ?? ""}
      data-toolcraft-product-output=""
      data-view-orbit={JSON.stringify(orbitPose)}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={rootRef}
    >
      <canvas
        aria-label="Liquid Metal 3D output"
        className="block h-full w-full"
        data-liquid-metal-canvas=""
        ref={canvasRef}
      />
    </div>
  );
}
