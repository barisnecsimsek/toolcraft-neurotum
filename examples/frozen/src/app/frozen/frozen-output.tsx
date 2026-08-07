import * as React from "react";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";
import {
  useToolcraft,
  useToolcraftModelOrbitInteraction,
  useToolcraftPipeline,
  useToolcraftPipelinePass,
} from "@/toolcraft/runtime/react";

import {
  cameraRenderPass,
  imageDecodePass,
  imageModelPreparePass,
  modelPreparePass,
  previewRenderPass,
  scratchPreparePass,
  type FrozenPreviewResult,
} from "../app-renderer-pipeline";
import { registerFrozenExportProvider } from "./frozen-export";
import { registerFrozenMeltAction } from "./frozen-melt-action";
import { useFrozenMeltShortcut } from "./frozen-melt-shortcut";
import {
  createFrozenImageModel,
  disposeFrozenSourceImage,
  prepareFrozenSourceImage,
  type FrozenPreparedImage,
} from "./frozen-image-model";
import {
  disposeFrozenModel,
  loadFrozenModel,
  type FrozenPreparedModel,
} from "./frozen-model";
import {
  FrozenSceneRenderer,
  type FrozenMeltContact,
} from "./frozen-scene";
import {
  disposeFrozenScratch,
  prepareFrozenScratchTexture,
  type FrozenPreparedScratch,
} from "./frozen-texture";
import {
  getFrozenImageGeometrySettings,
  getFrozenModelTriangleBudget,
  getFrozenSceneSettings,
  getFrozenSettingsToken,
  getFrozenSourceMode,
  shouldCoolFrozenMelt,
} from "./frozen-values";
import styles from "./frozen-output.module.css";

function getAsset(
  assets: readonly ToolcraftMediaAsset[],
  sourceTarget: string,
): ToolcraftMediaAsset | null {
  return assets.find((asset) => asset.sourceTarget === sourceTarget) ?? null;
}

function assetCacheKey(asset: ToolcraftMediaAsset | null): string {
  return asset
    ? `${asset.id}:${asset.fileName}:${asset.dataUrl}:${JSON.stringify(asset.transform ?? {})}`
    : "none";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not prepare the resource.";
}

export function FrozenOutput(): React.JSX.Element {
  const { state } = useToolcraft();
  useFrozenMeltShortcut();
  const pipeline = useToolcraftPipeline();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<FrozenSceneRenderer | null>(null);
  const resizeFrameRef = React.useRef<number | null>(null);
  const thermalRenderFrameRef = React.useRef<number | null>(null);
  const pendingThermalReasonRef = React.useRef<
    "cooling" | "paint" | "refreeze"
  >("paint");
  const coolingFrameRef = React.useRef<number | null>(null);
  const coolingLastTimeRef = React.useRef(0);
  const activeMeltPointerRef = React.useRef<number | null>(null);
  const previousMeltPointRef = React.useRef<FrozenMeltContact["point"] | null>(
    null,
  );
  const imageModelBranchRef = React.useRef<FrozenPreparedModel | null>(null);
  const modelBranchRef = React.useRef<FrozenPreparedModel | null>(null);
  const preparedImagesRef = React.useRef(new Set<FrozenPreparedImage>());
  const preparedScratchesRef = React.useRef(new Set<FrozenPreparedScratch>());
  const previousRenderTokensRef = React.useRef<{
    modelId: string;
    orientation: string;
    preview: string;
    scratchId: string;
  } | null>(null);
  const [rendererReady, setRendererReady] = React.useState(false);
  const [rendererError, setRendererError] = React.useState("");
  const [renderSignature, setRenderSignature] = React.useState("");
  const [meltCursor, setMeltCursor] = React.useState({
    radius: 16,
    visible: false,
    x: 0,
    y: 0,
  });
  const sourceMode = getFrozenSourceMode(state);
  const modelAsset = getAsset(state.mediaAssets, "source.model");
  const imageAsset = getAsset(state.mediaAssets, "source.image");
  const scratchAsset = getAsset(state.mediaAssets, "source.scratchTexture");
  const modelCacheKey = assetCacheKey(modelAsset);
  const imageCacheKey = assetCacheKey(imageAsset);
  const scratchCacheKey = assetCacheKey(scratchAsset);
  const imageGeometry = React.useMemo(
    () => getFrozenImageGeometrySettings(state),
    [state],
  );
  const modelTriangleBudget = getFrozenModelTriangleBudget(state);
  const settings = React.useMemo(() => getFrozenSceneSettings(state), [state]);
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const settingsToken = getFrozenSettingsToken(settings);
  const orientationToken = JSON.stringify(settings.viewport.orientation);
  const previewToken = JSON.stringify({
    ...settings,
    viewport: { ...settings.viewport, orientation: null },
  });

  const renderThermalFrame = React.useCallback(
    (reason: "cooling" | "paint" | "refreeze") => {
      pendingThermalReasonRef.current = reason;
      if (thermalRenderFrameRef.current !== null) return;
      thermalRenderFrameRef.current = requestAnimationFrame(() => {
        thermalRenderFrameRef.current = null;
        const renderer = rendererRef.current;
        if (!renderer) return;
        const currentReason = pendingThermalReasonRef.current;
        const execute = (): FrozenPreviewResult => {
          const rendered = renderer.renderPreview(settingsRef.current);
          return {
            rendered,
            signature: `${currentReason}:${renderer.getMeltRevision()}`,
          };
        };
        const result = pipeline
          ? pipeline.runPass(previewRenderPass, undefined, execute)
          : Promise.resolve(execute());
        void result.then(
          (preview) => setRenderSignature(preview.signature),
          (error: unknown) =>
            console.error("Frozen thermal preview failed.", error),
        );
      });
    },
    [pipeline],
  );

  const stopCooling = React.useCallback(() => {
    if (coolingFrameRef.current === null) return;
    cancelAnimationFrame(coolingFrameRef.current);
    coolingFrameRef.current = null;
  }, []);

  const startCooling = React.useCallback(() => {
    if (coolingFrameRef.current !== null) return;
    coolingLastTimeRef.current = performance.now();
    const tick = (time: number) => {
      coolingFrameRef.current = null;
      const renderer = rendererRef.current;
      const currentSettings = settingsRef.current;
      if (
        !renderer ||
        !renderer.hasActiveMelt() ||
        currentSettings.melt.refreeze <= 0 ||
        !shouldCoolFrozenMelt(
          currentSettings.melt.refreezeMode,
          activeMeltPointerRef.current !== null,
        )
      ) {
        return;
      }
      const elapsed = Math.min(0.1, (time - coolingLastTimeRef.current) / 1000);
      if (elapsed >= 1 / 30) {
        coolingLastTimeRef.current = time;
        if (renderer.stepMelt(currentSettings, elapsed)) {
          renderThermalFrame("cooling");
        }
      }
      if (
        renderer.hasActiveMelt() &&
        shouldCoolFrozenMelt(
          currentSettings.melt.refreezeMode,
          activeMeltPointerRef.current !== null,
        )
      ) {
        coolingFrameRef.current = requestAnimationFrame(tick);
      }
    };
    coolingFrameRef.current = requestAnimationFrame(tick);
  }, [renderThermalFrame]);

  React.useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: FrozenSceneRenderer;
    try {
      renderer = new FrozenSceneRenderer(canvas, {
        onEnvironmentReady: () => {
          rendererRef.current?.renderPreview(settingsRef.current);
        },
      });
    } catch (error) {
      const message = errorMessage(error);
      setRendererError(message);
      console.error("Frozen WebGL initialization failed.", error);
      return;
    }
    rendererRef.current = renderer;
    setRendererReady(true);
    const unregisterExport = registerFrozenExportProvider({
      hasModel: () => renderer.hasModel(),
      renderer,
    });
    const unregisterMeltAction = registerFrozenMeltAction(() => {
      if (!renderer.clearMelt()) return;
      renderThermalFrame("refreeze");
    });

    return () => {
      unregisterExport();
      unregisterMeltAction();
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
      if (thermalRenderFrameRef.current !== null) {
        cancelAnimationFrame(thermalRenderFrameRef.current);
        thermalRenderFrameRef.current = null;
      }
      if (coolingFrameRef.current !== null) {
        cancelAnimationFrame(coolingFrameRef.current);
        coolingFrameRef.current = null;
      }
      renderer.dispose();
      rendererRef.current = null;
      if (imageModelBranchRef.current) {
        disposeFrozenModel(imageModelBranchRef.current);
        imageModelBranchRef.current = null;
      }
      if (modelBranchRef.current) {
        disposeFrozenModel(modelBranchRef.current);
        modelBranchRef.current = null;
      }
      preparedImagesRef.current.forEach(disposeFrozenSourceImage);
      preparedImagesRef.current.clear();
      preparedScratchesRef.current.forEach(disposeFrozenScratch);
      preparedScratchesRef.current.clear();
    };
  }, [renderThermalFrame]);

  React.useEffect(() => {
    if (
      settings.melt.refreeze > 0 &&
      shouldCoolFrozenMelt(
        settings.melt.refreezeMode,
        activeMeltPointerRef.current !== null,
      )
    ) {
      startCooling();
      return;
    }
    stopCooling();
  }, [
    settings.melt.refreeze,
    settings.melt.refreezeMode,
    startCooling,
    stopCooling,
  ]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererReady || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        rendererRef.current?.renderPreview(settingsRef.current);
      });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [rendererReady]);

  const prepareModel = React.useCallback(
    () =>
      modelAsset ? loadFrozenModel(modelAsset, modelTriangleBudget) : null,
    [modelAsset, modelTriangleBudget],
  );
  const modelPreparedState = useToolcraftPipelinePass(
    modelPreparePass,
    {
      "source.model": modelCacheKey,
      "source.modelTriangleBudget": modelTriangleBudget,
    },
    prepareModel,
  );
  const modelPrepared =
    modelPreparedState.status === "success" ? modelPreparedState.result : null;

  const prepareImage = React.useCallback(
    () => (imageAsset ? prepareFrozenSourceImage(imageAsset) : null),
    [imageAsset],
  );
  const imageState = useToolcraftPipelinePass(
    imageDecodePass,
    { "source.image": imageCacheKey },
    prepareImage,
  );
  const preparedImage = imageState.status === "success" ? imageState.result : null;
  const prepareImageModel = React.useCallback(
    () =>
      preparedImage ? createFrozenImageModel(preparedImage, imageGeometry) : null,
    [imageGeometry, preparedImage],
  );
  const imageModelState = useToolcraftPipelinePass(
    imageModelPreparePass,
    {
      "source.image": preparedImage?.sourceId ?? `${imageCacheKey}:pending`,
      "source.imageBevel": imageGeometry.bevel,
      "source.imageCornerRadius": imageGeometry.cornerRadius,
      "source.imageThickness": imageGeometry.thickness,
    },
    prepareImageModel,
  );
  const imageModel =
    imageModelState.status === "success" ? imageModelState.result : null;
  const preparedModel = sourceMode === "image" ? imageModel : modelPrepared;

  const prepareScratch = React.useCallback(
    () => (scratchAsset ? prepareFrozenScratchTexture(scratchAsset) : null),
    [scratchAsset],
  );
  const scratchState = useToolcraftPipelinePass(
    scratchPreparePass,
    { "source.scratchTexture": scratchCacheKey },
    prepareScratch,
  );
  const preparedScratch =
    scratchState.status === "success" ? scratchState.result : null;

  React.useLayoutEffect(() => {
    if (!rendererReady) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (preparedImage) preparedImagesRef.current.add(preparedImage);
    if (preparedScratch) preparedScratchesRef.current.add(preparedScratch);
    const modelId = preparedModel?.sourceId ?? "none";
    const scratchId = preparedScratch?.sourceId ?? "procedural";
    const previousTokens = previousRenderTokensRef.current;
    const cameraOnly = Boolean(
      previousTokens &&
        previousTokens.modelId === modelId &&
        previousTokens.scratchId === scratchId &&
        previousTokens.preview === previewToken &&
        previousTokens.orientation !== orientationToken,
    );
    previousRenderTokensRef.current = {
      modelId,
      orientation: orientationToken,
      preview: previewToken,
      scratchId,
    };
    const execute = (): FrozenPreviewResult => {
      renderer.setModel(preparedModel);
      renderer.setScratch(preparedScratch);
      const rendered = renderer.renderPreview(settings);
      if (preparedModel) {
        const branchRef =
          preparedModel.sourceKind === "image"
            ? imageModelBranchRef
            : modelBranchRef;
        const previousBranch = branchRef.current;
        branchRef.current = preparedModel;
        if (previousBranch && previousBranch !== preparedModel) {
          disposeFrozenModel(previousBranch);
        }
      } else {
        const activeAsset = sourceMode === "image" ? imageAsset : modelAsset;
        if (!activeAsset) {
          const branchRef =
            sourceMode === "image" ? imageModelBranchRef : modelBranchRef;
          if (branchRef.current) disposeFrozenModel(branchRef.current);
          branchRef.current = null;
        }
      }
      return {
        rendered,
        signature: rendered
          ? `${modelId}:${scratchId}:${settingsToken}`
          : "empty",
      };
    };
    const result = pipeline
      ? cameraOnly
        ? pipeline.runPass(cameraRenderPass, undefined, execute)
        : pipeline.runPass(previewRenderPass, undefined, execute)
      : Promise.resolve(execute());
    void result.then(
      (preview) => setRenderSignature(preview.signature),
      (error: unknown) => {
        setRenderSignature("error");
        console.error("Frozen WebGL preview failed.", error);
      },
    );
  }, [
    orientationToken,
    pipeline,
    preparedModel,
    preparedImage,
    preparedScratch,
    previewToken,
    rendererReady,
    settingsToken,
    imageAsset,
    modelAsset,
    sourceMode,
  ]);

  React.useEffect(() => {
    if (modelPreparedState.status === "error") {
      console.error("Frozen model import failed.", modelPreparedState.error);
    }
    if (imageState.status === "error") {
      console.error("Frozen image decode failed.", imageState.error);
    }
    if (imageModelState.status === "error") {
      console.error("Frozen image geometry failed.", imageModelState.error);
    }
    if (scratchState.status === "error") {
      console.error("Frozen scratch import failed.", scratchState.error);
    }
  }, [imageModelState, imageState, modelPreparedState, scratchState]);

  const hitTest = React.useCallback(
    (clientX: number, clientY: number) =>
      rendererRef.current?.hitTest(clientX, clientY) ?? false,
    [],
  );
  const orbitHandlers = useToolcraftModelOrbitInteraction<HTMLCanvasElement>({
    enabled: Boolean(preparedModel) && !settings.melt.enabled,
    historyLabel: "Rotate model",
    hitTest,
    target: "scene.orientation",
  });
  const updateMeltCursor = React.useCallback(
    (contact: FrozenMeltContact | null) => {
      if (!contact) {
        setMeltCursor((current) =>
          current.visible ? { ...current, visible: false } : current,
        );
        return;
      }
      setMeltCursor({
        radius: contact.cursorRadius,
        visible: true,
        x: contact.x,
        y: contact.y,
      });
    },
    [],
  );
  const meltHandlers = React.useMemo<
    React.HTMLAttributes<HTMLCanvasElement>
  >(
    () => ({
      onLostPointerCapture: (event) => {
        if (activeMeltPointerRef.current !== event.pointerId) return;
        activeMeltPointerRef.current = null;
        previousMeltPointRef.current = null;
        startCooling();
      },
      onPointerCancel: (event) => {
        if (activeMeltPointerRef.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        activeMeltPointerRef.current = null;
        previousMeltPointRef.current = null;
        startCooling();
      },
      onPointerDown: (event) => {
        if (
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        ) {
          return;
        }
        const renderer = rendererRef.current;
        const contact = renderer?.getMeltContact(
          event.clientX,
          event.clientY,
          settingsRef.current,
        );
        updateMeltCursor(contact ?? null);
        if (!renderer || !contact) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        activeMeltPointerRef.current = event.pointerId;
        previousMeltPointRef.current = contact.point;
        if (settingsRef.current.melt.refreezeMode === "after-release") {
          stopCooling();
        }
        if (renderer.depositMelt(contact, settingsRef.current)) {
          renderThermalFrame("paint");
        }
        if (settingsRef.current.melt.refreezeMode === "during-stroke") {
          startCooling();
        }
      },
      onPointerLeave: () => {
        if (activeMeltPointerRef.current === null) updateMeltCursor(null);
      },
      onPointerMove: (event) => {
        const renderer = rendererRef.current;
        const contact = renderer?.getMeltContact(
          event.clientX,
          event.clientY,
          settingsRef.current,
        );
        updateMeltCursor(contact ?? null);
        if (
          activeMeltPointerRef.current === event.pointerId &&
          !contact
        ) {
          previousMeltPointRef.current = null;
        }
        if (
          !renderer ||
          !contact ||
          activeMeltPointerRef.current !== event.pointerId
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const previousPoint = previousMeltPointRef.current;
        previousMeltPointRef.current = contact.point;
        if (renderer.depositMelt(contact, settingsRef.current, previousPoint)) {
          renderThermalFrame("paint");
        }
      },
      onPointerUp: (event) => {
        if (activeMeltPointerRef.current !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        activeMeltPointerRef.current = null;
        previousMeltPointRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        startCooling();
      },
    }),
    [renderThermalFrame, startCooling, stopCooling, updateMeltCursor],
  );
  const canvasHandlers = settings.melt.enabled ? meltHandlers : orbitHandlers;
  const status = rendererError
    ? "error"
    : !(sourceMode === "image" ? imageAsset : modelAsset)
      ? "empty"
      : sourceMode === "image" &&
          (imageState.status === "error" || imageModelState.status === "error")
        ? "error"
        : sourceMode === "model" && modelPreparedState.status === "error"
        ? "error"
        : preparedModel
          ? "ready"
          : "loading";
  const loadError =
    rendererError ||
    (sourceMode === "image"
      ? imageState.status === "error"
        ? errorMessage(imageState.error)
        : imageModelState.status === "error"
          ? errorMessage(imageModelState.error)
          : undefined
      : modelPreparedState.status === "error"
        ? errorMessage(modelPreparedState.error)
        : undefined);
  const scratchError =
    scratchState.status === "error" ? errorMessage(scratchState.error) : undefined;

  return (
    <div
      className={styles.root}
      data-frozen-progress={settings.mask.progress}
      data-ice-color={settings.surface.color}
      data-icicle-count={preparedModel ? settings.icicles.density : 0}
      data-icicle-direction={
        preparedModel?.sourceKind === "image" ? "gravity-bent" : "gravity"
      }
      data-icicle-length={preparedModel ? settings.icicles.length : 0}
      data-icicle-radius={preparedModel ? settings.icicles.radius : 0}
      data-include-background={String(settings.background.include)}
      data-mask-space="object"
      data-melt-enabled={String(settings.melt.enabled)}
      data-melt-refreeze-mode={settings.melt.refreezeMode}
      data-model-exposure={settings.sourceMaterial.exposure}
      data-source-mode={sourceMode}
      data-orientation={JSON.stringify(settings.viewport.orientation)}
      data-scratch-offset-x={settings.scratch.offset.x}
      data-scratch-offset-y={settings.scratch.offset.y}
      data-slot="frozen-product-output"
      data-toolcraft-product-output="frozen-webgl"
      data-viewport-offset-x={state.canvas.offset.x}
      data-viewport-offset-y={state.canvas.offset.y}
    >
      <canvas
        {...canvasHandlers}
        aria-label="Frozen 3D model preview"
        className={styles.canvas}
        data-crystal-count={preparedModel ? settings.crystals.density : 0}
        data-frozen-rendered={renderSignature}
        data-icicle-count={preparedModel ? settings.icicles.density : 0}
        data-icicle-direction={
          preparedModel?.sourceKind === "image" ? "gravity-bent" : "gravity"
        }
        data-load-error={loadError}
        data-image-aspect={preparedModel?.imageGeometry?.aspect}
        data-image-bevel={preparedModel?.imageGeometry?.bevel}
        data-image-bevel-radius={preparedModel?.imageGeometry?.bevelRadius}
        data-image-corner-radius={preparedModel?.imageGeometry?.cornerRadius}
        data-image-corner-roundness={
          preparedModel?.imageGeometry?.cornerRoundness
        }
        data-image-depth={preparedModel?.imageGeometry?.depth}
        data-image-thickness={preparedModel?.imageGeometry?.thickness}
        data-image-source-label={preparedImage?.sourceLabel}
        data-model-label={preparedModel?.sourceLabel}
        data-model-kind={preparedModel?.sourceKind}
        data-model-source-triangle-count={
          modelPrepared?.sourceTriangleCount ?? 0
        }
        data-model-original-triangle-count={
          modelPrepared?.sourceTriangleCount ?? 0
        }
        data-model-render-triangle-count={modelPrepared?.triangleCount ?? 0}
        data-model-triangle-budget={modelTriangleBudget}
        data-model-material-count={modelPrepared?.materialCount ?? 0}
        data-model-texture-count={modelPrepared?.textureCount ?? 0}
        data-model-source-id={preparedModel?.sourceId}
        data-model-status={status}
        data-render-scale={settings.viewport.renderScale}
        data-scratch-error={scratchError}
        data-scratch-label={preparedScratch?.sourceLabel}
        data-scratch-source-id={preparedScratch?.sourceId}
        data-slot="frozen-webgl-canvas"
        data-triangle-count={preparedModel?.triangleCount ?? 0}
        ref={canvasRef}
      />
      <div
        aria-hidden="true"
        className={styles.meltCursor}
        data-slot="frozen-melt-brush-cursor"
        data-visible={String(settings.melt.enabled && meltCursor.visible)}
        style={{
          height: meltCursor.radius * 2,
          transform: `translate3d(${meltCursor.x - meltCursor.radius}px, ${
            meltCursor.y - meltCursor.radius
          }px, 0)`,
          width: meltCursor.radius * 2,
        }}
      />
    </div>
  );
}
