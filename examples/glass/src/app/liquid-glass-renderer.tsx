"use client";

import * as React from "react";

import {
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftMediaAsset,
  type ToolcraftMediaTransform,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";
import { getFontPickerFontById } from "@/toolcraft/ui/components/controls/font-picker/font-catalog";
import { ensureFontPickerPreviewLoaded } from "@/toolcraft/ui/components/controls/font-picker/font-preview-loader";

import {
  LiquidGlassRenderRuntime,
  renderLiquidGlassToCanvas,
  type LiquidGlassMediaImage,
  type LiquidGlassRenderOptions,
} from "./liquid-glass-render";
import type { LiquidGlassSettings } from "./liquid-glass-types";
import {
  findLiquidGlassButtonImageAsset,
  findLiquidGlassSourceAsset,
  findLiquidGlassTextureAsset,
  getLiquidGlassGeometry,
  getLiquidGlassSettings,
} from "./liquid-glass-values";

const glassDragHistoryGroup = "liquid-glass-canvas-drag";
const glassDragZoneTestId = "liquid-glass-drag-zone";
const liveControlPreviewBaseThrottleMs = 32;
const liveControlPreviewHeavyThrottleMs = 460;
const liveControlPreviewFrostThrottleMs = 360;
const liveControlPreviewMapThrottleMs = 96;
const liveControlPreviewRefractionThrottleMs = 32;
const liveControlPreviewFirstHeavyDelayMs = liveControlPreviewHeavyThrottleMs;
const liveControlPreviewImmediateThresholdMs = 180;
const liveControlPreviewResizeThrottleMs = 900;
const liveControlPreviewShadowThrottleMs = 160;
const liveControlPointerReleaseGraceMs = 160;
const mediaImportPreviewDelayMs = 140;
const textDragHistoryGroup = "liquid-glass-text-drag";

type GlassDragState = {
  canvasHeight: number;
  canvasWidth: number;
  geometryHeight: number;
  geometryWidth: number;
  kind: "glass" | "text";
  pointerId: number;
  rectHeight: number;
  rectWidth: number;
  startClientX: number;
  startClientY: number;
  startCenterX: number;
  startCenterY: number;
  startOffsetX: number;
  startOffsetY: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRenderScale(state: ToolcraftState): number {
  const raw = state.values["canvas.renderScale"];
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw)
        : state.schema.canvas.renderScale.defaultValue;

  return Number.isFinite(value) ? Math.max(1, Math.min(2, value)) : 2;
}

function isSameMediaTransform(
  next: ToolcraftMediaTransform | undefined,
  previous: ToolcraftMediaTransform | undefined,
): boolean {
  return (
    (next?.rotationDeg ?? 0) === (previous?.rotationDeg ?? 0) &&
    next?.flipHorizontal === previous?.flipHorizontal &&
    next?.flipVertical === previous?.flipVertical
  );
}

function getLiveControlPreviewThrottleMs(
  nextOptions: LiquidGlassRenderOptions,
  previousOptions: LiquidGlassRenderOptions | null,
): number {
  if (!previousOptions) {
    return 0;
  }

  if (
    nextOptions.pixelWidth !== previousOptions.pixelWidth ||
    nextOptions.pixelHeight !== previousOptions.pixelHeight ||
    nextOptions.cssWidth !== previousOptions.cssWidth ||
    nextOptions.cssHeight !== previousOptions.cssHeight
  ) {
    return liveControlPreviewResizeThrottleMs;
  }

  if (
    nextOptions.mediaImage !== previousOptions.mediaImage ||
    nextOptions.textureImage !== previousOptions.textureImage ||
    nextOptions.buttonImage !== previousOptions.buttonImage ||
    !isSameMediaTransform(nextOptions.mediaTransform, previousOptions.mediaTransform) ||
    !isSameMediaTransform(nextOptions.textureTransform, previousOptions.textureTransform) ||
    !isSameMediaTransform(nextOptions.buttonImageTransform, previousOptions.buttonImageTransform)
  ) {
    return liveControlPreviewHeavyThrottleMs;
  }

  const next = nextOptions.settings;
  const previous = previousOptions.settings;

  if (next.glass.frost !== previous.glass.frost) {
    return liveControlPreviewFrostThrottleMs;
  }

  if (next.shadow.blur !== previous.shadow.blur) {
    return liveControlPreviewShadowThrottleMs;
  }

  if (
    next.glass.strength !== previous.glass.strength ||
    next.glass.fisheye !== previous.glass.fisheye ||
    next.glass.dispersion !== previous.glass.dispersion
  ) {
    return liveControlPreviewRefractionThrottleMs;
  }

  if (
    next.glass.width !== previous.glass.width ||
    next.glass.height !== previous.glass.height ||
    next.glass.radius !== previous.glass.radius ||
    next.glass.shape !== previous.glass.shape ||
    next.glass.depth !== previous.glass.depth ||
    next.glass.curvature !== previous.glass.curvature ||
    next.glass.splay !== previous.glass.splay ||
    next.glass.bend !== previous.glass.bend ||
    next.glass.bendWidth !== previous.glass.bendWidth ||
    next.glass.sheen !== previous.glass.sheen ||
    next.glass.sheenWidth !== previous.glass.sheenWidth ||
    next.glass.sheenAngle !== previous.glass.sheenAngle ||
    next.glass.glow !== previous.glass.glow ||
    next.glass.glowSpread !== previous.glass.glowSpread
  ) {
    return liveControlPreviewMapThrottleMs;
  }

  return liveControlPreviewBaseThrottleMs;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load liquid glass source image."));
    image.src = dataUrl;
  });
}

async function loadImageBitmap(dataUrl: string): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function" || typeof fetch !== "function") {
    return null;
  }

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function disposeLiquidGlassMediaImage(image: LiquidGlassMediaImage | null): void {
  if (image && "close" in image) {
    image.close();
  }
}

function getTextFontDescriptor(settings: LiquidGlassSettings): string | null {
  const entry = getFontPickerFontById(settings.text.style.fontId);

  if (!entry) {
    return null;
  }

  const weight = /^\d+$/.test(settings.text.style.fontWeight)
    ? settings.text.style.fontWeight
    : "400";
  const family = entry.family.trim().replace(/"/g, '\\"');

  return `${weight} 16px "${family}"`;
}

export async function loadLiquidGlassMediaImage(
  asset: ToolcraftMediaAsset | null,
): Promise<LiquidGlassMediaImage | null> {
  if (!asset) {
    return null;
  }

  return (await loadImageBitmap(asset.dataUrl)) ?? loadImage(asset.dataUrl);
}

export function LiquidGlassRenderer(): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const currentPreviewCenterRef = React.useRef<{ x: number; y: number } | null>(null);
  const currentPreviewTextOffsetRef = React.useRef<{ x: number; y: number } | null>(null);
  const dragRenderFrameRef = React.useRef<number | null>(null);
  const dragStateRef = React.useRef<GlassDragState | null>(null);
  const glassDragActiveRef = React.useRef(false);
  const lastRenderedOptionsRef = React.useRef<LiquidGlassRenderOptions | null>(null);
  const latestRenderOptionsRef = React.useRef<LiquidGlassRenderOptions | null>(null);
  const lastStateRenderAtRef = React.useRef(-Infinity);
  const pendingStateRenderHeavyRef = React.useRef(false);
  const pendingDragCenterRef = React.useRef<{ x: number; y: number } | null>(null);
  const pendingDragTextOffsetRef = React.useRef<{ x: number; y: number } | null>(null);
  const lastPointerEndAtRef = React.useRef(-Infinity);
  const pointerActiveRef = React.useRef(false);
  const pointerPreviewRenderedRef = React.useRef(false);
  const renderedOnceRef = React.useRef(false);
  const runtimeRef = React.useRef<LiquidGlassRenderRuntime | null>(null);
  const stateRenderFollowupRef = React.useRef(false);
  const stateRenderFrameRef = React.useRef<number | null>(null);
  const stateRenderTimeoutRef = React.useRef<number | null>(null);
  const stateRenderTimeoutDueAtRef = React.useRef<number | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const buttonImageAsset = findLiquidGlassButtonImageAsset(state);
  const sourceAsset = findLiquidGlassSourceAsset(state);
  const textureAsset = findLiquidGlassTextureAsset(state);
  const [isGlassDragging, setIsGlassDragging] = React.useState(false);
  const [buttonImage, setButtonImage] = React.useState<LiquidGlassMediaImage | null>(null);
  const [mediaImage, setMediaImage] = React.useState<LiquidGlassMediaImage | null>(null);
  const [textureImage, setTextureImage] = React.useState<LiquidGlassMediaImage | null>(null);
  const settings = React.useMemo(() => {
    const next = getLiquidGlassSettings(state);

    return {
      ...next,
      includeBackground: shouldIncludeToolcraftPreviewBackground({ state }),
    };
  }, [state]);
  const renderScale = getRenderScale(state);
  const pixelWidth = Math.max(1, Math.round(state.canvas.size.width * renderScale));
  const pixelHeight = Math.max(1, Math.round(state.canvas.size.height * renderScale));
  const geometry = React.useMemo(() => getLiquidGlassGeometry(settings), [settings]);
  const centerX = settings.glass.center.x * state.canvas.size.width;
  const centerY = settings.glass.center.y * state.canvas.size.height;
  const textDragActive = settings.text.enabled && settings.text.dragTarget === "text";
  const dragZoneStyle = React.useMemo<React.CSSProperties>(
    () => ({
      borderRadius: geometry.radius,
      cursor: isGlassDragging ? "grabbing" : textDragActive ? "move" : "grab",
      height: geometry.height,
      left: centerX - geometry.halfWidth,
      pointerEvents: "auto",
      top: centerY - geometry.halfHeight,
      touchAction: "none",
      width: geometry.width,
    }),
    [centerX, centerY, geometry, isGlassDragging, textDragActive],
  );

  const renderLatestStateOptions = React.useCallback(() => {
    const runtime = runtimeRef.current;
    const options = latestRenderOptionsRef.current;

    if (runtime && options) {
      runtime.render(options);
      lastRenderedOptionsRef.current = options;
      renderedOnceRef.current = true;
      if (pointerActiveRef.current) {
        pointerPreviewRenderedRef.current = true;
      }
      lastStateRenderAtRef.current = window.performance.now();
    }
  }, []);

  const scheduleStateRender = React.useCallback(
    (delayMs: number, { heavy = false }: { heavy?: boolean } = {}) => {
      if (stateRenderFrameRef.current !== null) {
        pendingStateRenderHeavyRef.current = pendingStateRenderHeavyRef.current || heavy;
        if (!pointerActiveRef.current) {
          stateRenderFollowupRef.current = true;
        }
        return;
      }

      const normalizedDelayMs = Math.max(0, delayMs);
      const dueAt = window.performance.now() + normalizedDelayMs;

      if (stateRenderTimeoutRef.current !== null) {
        pendingStateRenderHeavyRef.current = pendingStateRenderHeavyRef.current || heavy;
        const currentDueAt = stateRenderTimeoutDueAtRef.current ?? Infinity;

        if (dueAt >= currentDueAt - 1) {
          return;
        }

        window.clearTimeout(stateRenderTimeoutRef.current);
        stateRenderTimeoutRef.current = null;
        stateRenderTimeoutDueAtRef.current = null;
      } else {
        pendingStateRenderHeavyRef.current = heavy;
      }

      const requestRenderFrame = () => {
        stateRenderFrameRef.current = window.requestAnimationFrame(() => {
          stateRenderFrameRef.current = null;
          stateRenderTimeoutDueAtRef.current = null;
          pendingStateRenderHeavyRef.current = false;
          const needsFollowup = stateRenderFollowupRef.current;
          stateRenderFollowupRef.current = false;
          renderLatestStateOptions();
          if (needsFollowup) {
            requestRenderFrame();
          }
        });
      };

      if (normalizedDelayMs > 0) {
        stateRenderTimeoutDueAtRef.current = dueAt;
        stateRenderTimeoutRef.current = window.setTimeout(() => {
          stateRenderTimeoutRef.current = null;
          stateRenderTimeoutDueAtRef.current = null;
          requestRenderFrame();
        }, normalizedDelayMs);
        return;
      }

      requestRenderFrame();
    },
    [renderLatestStateOptions],
  );

  const flushStateRender = React.useCallback(() => {
    if (stateRenderTimeoutRef.current !== null) {
      window.clearTimeout(stateRenderTimeoutRef.current);
      stateRenderTimeoutRef.current = null;
      stateRenderTimeoutDueAtRef.current = null;
    }

    scheduleStateRender(0);
  }, [scheduleStateRender]);

  React.useEffect(() => {
    let cancelled = false;

    if (!settings.text.enabled || !settings.text.content.trim()) {
      return () => {
        cancelled = true;
      };
    }

    const fontEntry = getFontPickerFontById(settings.text.style.fontId);
    const descriptor = getTextFontDescriptor(settings);
    const fontFaceSet = typeof document !== "undefined" ? document.fonts : null;

    if (!fontEntry || !descriptor || !fontFaceSet) {
      return () => {
        cancelled = true;
      };
    }

    const check =
      typeof fontFaceSet.check === "function"
        ? fontFaceSet.check.bind(fontFaceSet)
        : null;
    const load =
      typeof fontFaceSet.load === "function"
        ? fontFaceSet.load.bind(fontFaceSet)
        : null;

    if (check?.(descriptor)) {
      return () => {
        cancelled = true;
      };
    }

    void ensureFontPickerPreviewLoaded(fontEntry)
      .then(() => load?.(descriptor))
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) {
          return;
        }

        runtimeRef.current?.invalidateTextFrame();
        flushStateRender();
      });

    return () => {
      cancelled = true;
    };
  }, [
    flushStateRender,
    settings,
    settings.text.content,
    settings.text.enabled,
    settings.text.style.fontId,
    settings.text.style.fontWeight,
  ]);

  React.useEffect(() => {
    let cancelled = false;

    if (!buttonImageAsset) {
      setButtonImage((previousImage) => {
        disposeLiquidGlassMediaImage(previousImage);

        return null;
      });

      return () => {
        cancelled = true;
      };
    }

    const timeoutId = window.setTimeout(() => {
      void loadLiquidGlassMediaImage(buttonImageAsset)
        .then((image) => {
          if (cancelled) {
            disposeLiquidGlassMediaImage(image);
            return;
          }

          setButtonImage((previousImage) => {
            disposeLiquidGlassMediaImage(previousImage);

            return image;
          });
        })
        .catch(() => {
          if (!cancelled) {
            setButtonImage((previousImage) => {
              disposeLiquidGlassMediaImage(previousImage);

              return null;
            });
          }
        });
    }, mediaImportPreviewDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [buttonImageAsset?.dataUrl]);

  React.useEffect(() => {
    let cancelled = false;

    if (!sourceAsset) {
      setMediaImage((previousImage) => {
        disposeLiquidGlassMediaImage(previousImage);

        return null;
      });

      return () => {
        cancelled = true;
      };
    }

    const timeoutId = window.setTimeout(() => {
      void loadLiquidGlassMediaImage(sourceAsset)
        .then((image) => {
          if (cancelled) {
            disposeLiquidGlassMediaImage(image);
            return;
          }

          setMediaImage((previousImage) => {
            disposeLiquidGlassMediaImage(previousImage);

            return image;
          });
        })
        .catch(() => {
          if (!cancelled) {
            setMediaImage((previousImage) => {
              disposeLiquidGlassMediaImage(previousImage);

              return null;
            });
          }
        });
    }, mediaImportPreviewDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [sourceAsset?.dataUrl]);

  React.useEffect(() => {
    let cancelled = false;

    if (!textureAsset) {
      setTextureImage((previousImage) => {
        disposeLiquidGlassMediaImage(previousImage);

        return null;
      });

      return () => {
        cancelled = true;
      };
    }

    const timeoutId = window.setTimeout(() => {
      void loadLiquidGlassMediaImage(textureAsset)
        .then((image) => {
          if (cancelled) {
            disposeLiquidGlassMediaImage(image);
            return;
          }

          setTextureImage((previousImage) => {
            disposeLiquidGlassMediaImage(previousImage);

            return image;
          });
        })
        .catch(() => {
          if (!cancelled) {
            setTextureImage((previousImage) => {
              disposeLiquidGlassMediaImage(previousImage);

              return null;
            });
          }
        });
    }, mediaImportPreviewDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [textureAsset?.dataUrl]);

  React.useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    if (!runtimeRef.current) {
      runtimeRef.current = new LiquidGlassRenderRuntime(canvas, {
        preserveDrawingBuffer: true,
      });
    }

    return () => {
      if (stateRenderFrameRef.current !== null) {
        window.cancelAnimationFrame(stateRenderFrameRef.current);
        stateRenderFrameRef.current = null;
      }
      if (stateRenderTimeoutRef.current !== null) {
        window.clearTimeout(stateRenderTimeoutRef.current);
        stateRenderTimeoutRef.current = null;
      }
      stateRenderTimeoutDueAtRef.current = null;
      stateRenderFollowupRef.current = false;
      pendingStateRenderHeavyRef.current = false;
      if (dragRenderFrameRef.current !== null) {
        window.cancelAnimationFrame(dragRenderFrameRef.current);
        dragRenderFrameRef.current = null;
      }
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const handlePointerDown = () => {
      pointerActiveRef.current = true;
      lastPointerEndAtRef.current = -Infinity;
      pointerPreviewRenderedRef.current = false;
      lastStateRenderAtRef.current = -Infinity;
      if (stateRenderFrameRef.current !== null) {
        window.cancelAnimationFrame(stateRenderFrameRef.current);
        stateRenderFrameRef.current = null;
      }
      if (stateRenderTimeoutRef.current !== null) {
        window.clearTimeout(stateRenderTimeoutRef.current);
        stateRenderTimeoutRef.current = null;
      }
      stateRenderTimeoutDueAtRef.current = null;
      stateRenderFollowupRef.current = false;
      pendingStateRenderHeavyRef.current = false;
    };
    const handlePointerEnd = () => {
      pointerActiveRef.current = false;
      lastPointerEndAtRef.current = window.performance.now();
      flushStateRender();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointercancel", handlePointerEnd, true);
    document.addEventListener("pointerup", handlePointerEnd, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointercancel", handlePointerEnd, true);
      document.removeEventListener("pointerup", handlePointerEnd, true);
    };
  }, [flushStateRender]);

  React.useLayoutEffect(() => {
    const nextOptions = {
      buttonImage,
      buttonImageTransform: buttonImageAsset?.transform,
      cssHeight: state.canvas.size.height,
      cssWidth: state.canvas.size.width,
      mediaImage,
      mediaTransform: sourceAsset?.transform,
      pixelHeight,
      pixelWidth,
      settings,
      textureImage,
      textureTransform: textureAsset?.transform,
    };
    latestRenderOptionsRef.current = nextOptions;

    if (glassDragActiveRef.current) {
      return;
    }

    currentPreviewCenterRef.current = settings.glass.center;
    currentPreviewTextOffsetRef.current = settings.text.offset;
    const now = window.performance.now();
    const isPointerPreviewWindow =
      pointerActiveRef.current ||
      now - lastPointerEndAtRef.current <= liveControlPointerReleaseGraceMs;
    const elapsedMs = now - lastStateRenderAtRef.current;
    const throttleMs =
      isPointerPreviewWindow && renderedOnceRef.current
        ? getLiveControlPreviewThrottleMs(nextOptions, lastRenderedOptionsRef.current)
        : 0;
    const isHeavyPreview = throttleMs > liveControlPreviewImmediateThresholdMs;
    const delayMs =
      isPointerPreviewWindow && !pointerPreviewRenderedRef.current && isHeavyPreview
        ? Math.min(throttleMs, liveControlPreviewFirstHeavyDelayMs)
        : Math.max(0, throttleMs - elapsedMs);
    scheduleStateRender(delayMs, { heavy: isHeavyPreview });
  }, [
    buttonImage,
    buttonImageAsset?.transform,
    mediaImage,
    pixelHeight,
    pixelWidth,
    scheduleStateRender,
    settings,
    sourceAsset?.transform,
    state.canvas.size.height,
    state.canvas.size.width,
    textureImage,
    textureAsset?.transform,
  ]);

  const commitGlassCenter = React.useCallback(
    (center: { x: number; y: number }) => {
      dispatch({
        history: "merge",
        historyGroup: glassDragHistoryGroup,
        label: "Move glass",
        target: "glass.center",
        type: "controls.setValue",
        value: {
          x: center.x * 2 - 1,
          y: center.y * 2 - 1,
        },
      });
    },
    [dispatch],
  );

  const commitTextOffset = React.useCallback(
    (offset: { x: number; y: number }) => {
      dispatch({
        history: "merge",
        historyGroup: textDragHistoryGroup,
        label: "Move text",
        target: "text.offset",
        type: "controls.setValue",
        value: offset,
      });
    },
    [dispatch],
  );

  const renderGlassPreviewAtCenter = React.useCallback(
    (center: { x: number; y: number }) => {
      const runtime = runtimeRef.current;
      const options = latestRenderOptionsRef.current;

      if (!runtime || !options) {
        return;
      }

      const nextOptions: LiquidGlassRenderOptions = {
        ...options,
        settings: {
          ...options.settings,
          glass: {
            ...options.settings.glass,
            center,
          },
        },
      };

      currentPreviewCenterRef.current = center;
      latestRenderOptionsRef.current = nextOptions;
      runtime.render(nextOptions);
      lastRenderedOptionsRef.current = nextOptions;
      renderedOnceRef.current = true;
      commitGlassCenter(center);
    },
    [commitGlassCenter],
  );

  const renderTextPreviewAtOffset = React.useCallback(
    (offset: { x: number; y: number }) => {
      const runtime = runtimeRef.current;
      const options = latestRenderOptionsRef.current;

      if (!runtime || !options) {
        return;
      }

      const nextOptions: LiquidGlassRenderOptions = {
        ...options,
        settings: {
          ...options.settings,
          text: {
            ...options.settings.text,
            offset,
          },
        },
      };

      currentPreviewTextOffsetRef.current = offset;
      latestRenderOptionsRef.current = nextOptions;
      runtime.render(nextOptions);
      lastRenderedOptionsRef.current = nextOptions;
      renderedOnceRef.current = true;
      commitTextOffset(offset);
    },
    [commitTextOffset],
  );

  const flushPendingGlassPreview = React.useCallback(() => {
    if (dragRenderFrameRef.current !== null) {
      window.cancelAnimationFrame(dragRenderFrameRef.current);
      dragRenderFrameRef.current = null;
    }

    const pendingCenter = pendingDragCenterRef.current;

    if (pendingCenter) {
      renderGlassPreviewAtCenter(pendingCenter);
    }
    const pendingOffset = pendingDragTextOffsetRef.current;

    if (pendingOffset) {
      renderTextPreviewAtOffset(pendingOffset);
    }
  }, [renderGlassPreviewAtCenter, renderTextPreviewAtOffset]);

  const scheduleGlassPreview = React.useCallback(
    (center: { x: number; y: number }) => {
      pendingDragCenterRef.current = center;

      if (dragRenderFrameRef.current !== null) {
        return;
      }

      dragRenderFrameRef.current = window.requestAnimationFrame(() => {
        dragRenderFrameRef.current = null;
        const pendingCenter = pendingDragCenterRef.current;

        if (pendingCenter) {
          renderGlassPreviewAtCenter(pendingCenter);
        }
      });
    },
    [renderGlassPreviewAtCenter],
  );

  const scheduleTextPreview = React.useCallback(
    (offset: { x: number; y: number }) => {
      pendingDragTextOffsetRef.current = offset;

      if (dragRenderFrameRef.current !== null) {
        return;
      }

      dragRenderFrameRef.current = window.requestAnimationFrame(() => {
        dragRenderFrameRef.current = null;
        const pendingOffset = pendingDragTextOffsetRef.current;

        if (pendingOffset) {
          renderTextPreviewAtOffset(pendingOffset);
        }
      });
    },
    [renderTextPreviewAtOffset],
  );

  const handleGlassPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      const wrapper = wrapperRef.current;
      const rect = wrapper?.getBoundingClientRect();

      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      glassDragActiveRef.current = true;
      pendingDragCenterRef.current = null;
      pendingDragTextOffsetRef.current = null;
      setIsGlassDragging(true);
      if (stateRenderFrameRef.current !== null) {
        window.cancelAnimationFrame(stateRenderFrameRef.current);
        stateRenderFrameRef.current = null;
      }
      if (stateRenderTimeoutRef.current !== null) {
        window.clearTimeout(stateRenderTimeoutRef.current);
        stateRenderTimeoutRef.current = null;
      }
      stateRenderTimeoutDueAtRef.current = null;
      stateRenderFollowupRef.current = false;
      pendingStateRenderHeavyRef.current = false;

      const currentCenter = currentPreviewCenterRef.current ?? settings.glass.center;
      const currentOffset = currentPreviewTextOffsetRef.current ?? settings.text.offset;
      const kind = settings.text.enabled && settings.text.dragTarget === "text" ? "text" : "glass";
      dragStateRef.current = {
        canvasHeight: state.canvas.size.height,
        canvasWidth: state.canvas.size.width,
        geometryHeight: geometry.height,
        geometryWidth: geometry.width,
        kind,
        pointerId: event.pointerId,
        rectHeight: rect.height,
        rectWidth: rect.width,
        startCenterX: currentCenter.x,
        startCenterY: currentCenter.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffsetX: currentOffset.x,
        startOffsetY: currentOffset.y,
      };
    },
    [
      geometry.height,
      geometry.width,
      settings.glass.center,
      settings.text.dragTarget,
      settings.text.enabled,
      settings.text.offset,
      state.canvas.size.height,
      state.canvas.size.width,
    ],
  );

  const handleGlassPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const deltaClientX = event.clientX - drag.startClientX;
      const deltaClientY = event.clientY - drag.startClientY;

      if (drag.kind === "text") {
        const deltaOutputX = (deltaClientX / drag.rectWidth) * drag.canvasWidth;
        const deltaOutputY = (deltaClientY / drag.rectHeight) * drag.canvasHeight;
        const nextOffsetX = clamp(
          drag.startOffsetX + (deltaOutputX * 2) / Math.max(1, drag.geometryWidth),
          -1,
          1,
        );
        const nextOffsetY = clamp(
          drag.startOffsetY + (deltaOutputY * 2) / Math.max(1, drag.geometryHeight),
          -1,
          1,
        );

        scheduleTextPreview({ x: nextOffsetX, y: nextOffsetY });
        return;
      }

      const nextX = clamp(drag.startCenterX + deltaClientX / drag.rectWidth, 0, 1);
      const nextY = clamp(drag.startCenterY + deltaClientY / drag.rectHeight, 0, 1);

      scheduleGlassPreview({ x: nextX, y: nextY });
    },
    [scheduleGlassPreview, scheduleTextPreview],
  );

  const handleGlassPointerEnd = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      flushPendingGlassPreview();
      const pendingCenter = pendingDragCenterRef.current;

      if (pendingCenter) {
        commitGlassCenter(pendingCenter);
      }
      const pendingOffset = pendingDragTextOffsetRef.current;

      if (pendingOffset) {
        commitTextOffset(pendingOffset);
      }
      pendingDragCenterRef.current = null;
      pendingDragTextOffsetRef.current = null;

      dragStateRef.current = null;
      glassDragActiveRef.current = false;
      setIsGlassDragging(false);
    },
    [commitGlassCenter, commitTextOffset, flushPendingGlassPreview],
  );

  return (
    <div className="relative h-full w-full" data-liquid-glass-interaction-layer="" ref={wrapperRef}>
      <canvas
        aria-label="Liquid glass product output"
        className="block h-full w-full"
        data-liquid-glass-renderer=""
        data-toolcraft-product-output=""
        ref={canvasRef}
        style={{ height: "100%", width: "100%" }}
      />
      <div
        aria-hidden="true"
        className="absolute"
        data-liquid-glass-drag-zone=""
        data-liquid-glass-text-drag={textDragActive ? "true" : undefined}
        data-testid={glassDragZoneTestId}
        onPointerCancel={handleGlassPointerEnd}
        onPointerDown={handleGlassPointerDown}
        onPointerMove={handleGlassPointerMove}
        onPointerUp={handleGlassPointerEnd}
        style={dragZoneStyle}
      />
    </div>
  );
}

export async function renderLiquidGlassExportCanvas(
  targetCanvas: HTMLCanvasElement,
  state: ToolcraftState,
  settings: LiquidGlassSettings,
): Promise<void> {
  const sourceAsset = findLiquidGlassSourceAsset(state);
  const buttonImageAsset = findLiquidGlassButtonImageAsset(state);
  const textureAsset = findLiquidGlassTextureAsset(state);
  const buttonImage = await loadLiquidGlassMediaImage(buttonImageAsset);
  const mediaImage = await loadLiquidGlassMediaImage(sourceAsset);
  const textureImage = await loadLiquidGlassMediaImage(textureAsset);

  renderLiquidGlassToCanvas(
    targetCanvas,
    {
      buttonImage,
      buttonImageTransform: buttonImageAsset?.transform,
      cssHeight: state.canvas.size.height,
      cssWidth: state.canvas.size.width,
      mediaImage,
      mediaTransform: sourceAsset?.transform,
      pixelHeight: targetCanvas.height,
      pixelWidth: targetCanvas.width,
      settings,
      textureImage,
      textureTransform: textureAsset?.transform,
    },
    { preserveDrawingBuffer: true },
  );
}
