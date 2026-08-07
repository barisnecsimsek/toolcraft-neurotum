"use client";

import * as React from "react";

import type { ToolcraftState } from "../../state/types";
import {
  CanvasDefaultMediaLayer,
  getVisibleCanvasImageAssets,
} from "./canvas-default-media-layer";
import { CanvasViewportWorld } from "./canvas-viewport-world";
import { useCanvasDropImport } from "./use-canvas-drop-import";
import { useCanvasViewportInteractions } from "./use-canvas-viewport-interactions";
import { useToolcraftStore } from "../app-shell/toolcraft-store-context";
import { useToolcraftCommittedSelector } from "../app-shell/toolcraft-selectors";
import { useToolcraftDispatch } from "../app-shell/use-toolcraft";
import { ToolcraftCanvasHandleLayers } from "../canvas-handles/canvas-handle-layer-registry";

export type CanvasShellProps = {
  children?: React.ReactNode;
  renderDefaultMedia?: boolean;
};

function isDragLeavingCurrentTarget(
  event: React.DragEvent<HTMLElement>,
): boolean {
  const nextTarget = event.relatedTarget;

  return !(
    nextTarget instanceof Node && event.currentTarget.contains(nextTarget)
  );
}

function mediaAssetListsEqual<MediaAsset>(
  previous: readonly MediaAsset[],
  next: readonly MediaAsset[],
): boolean {
  return (
    previous.length === next.length &&
    previous.every((mediaAsset, index) => mediaAsset === next[index])
  );
}

const selectCanvasSchema = (state: ToolcraftState) => state.schema.canvas;
const selectSelectedLayerId = (state: ToolcraftState) => state.selectedLayerId;
const selectCanvasSize = (state: ToolcraftState) => state.canvas.size;

export function CanvasShell({
  children,
  renderDefaultMedia = true,
}: CanvasShellProps): React.JSX.Element {
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();
  const [dragOver, setDragOver] = React.useState(false);
  const canvasSchema = useToolcraftCommittedSelector(selectCanvasSchema);
  const selectedLayerId = useToolcraftCommittedSelector(selectSelectedLayerId);
  const size = useToolcraftCommittedSelector(selectCanvasSize);
  const visibleMediaAssets = useToolcraftCommittedSelector(
    getVisibleCanvasImageAssets,
    mediaAssetListsEqual,
  );
  const uploadEnabled = canvasSchema.upload;
  const { handlePointerDown, handlePointerMove, handlePointerUp, viewportRef } =
    useCanvasViewportInteractions({
      draggable: canvasSchema.draggable,
      store,
    });
  const handleDrop = useCanvasDropImport({
    dispatch,
    setDragOver,
    store,
    uploadEnabled,
  });
  const hasCanvasContent = visibleMediaAssets.length > 0;
  const hasCanvasSlot = React.Children.count(children) > 0;
  const renderEditableCanvas =
    canvasSchema.sizing.mode !== "intrinsic-media" ||
    canvasSchema.sizeSource === "app" ||
    hasCanvasContent ||
    hasCanvasSlot;

  const beginDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    if (!uploadEnabled) {
      return;
    }

    event.preventDefault();
    setDragOver(true);
  };

  return (
    <div
      aria-label="Canvas viewport"
      className="group/canvas absolute inset-0 cursor-grab touch-none overflow-hidden bg-[color:var(--background)] active:cursor-grabbing"
      data-drag-over={dragOver}
      data-slot="toolcraft-runtime-canvas"
      onDragEnter={beginDragOver}
      onDragLeave={(event) => {
        if (isDragLeavingCurrentTarget(event)) {
          setDragOver(false);
        }
      }}
      onDragOver={beginDragOver}
      onDrop={handleDrop}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={viewportRef}
      role="application"
    >
      <CanvasViewportWorld>
        {renderEditableCanvas ? (
          <div
            className="relative z-10 overflow-hidden"
            data-toolcraft-canvas-content=""
            data-toolcraft-editable-canvas=""
            style={{
              height: size.height,
              width: size.width,
            }}
          >
            {renderDefaultMedia
              ? visibleMediaAssets.map((mediaAsset) => (
                  <CanvasDefaultMediaLayer
                    canvasSize={size}
                    dispatch={dispatch}
                    key={mediaAsset.id}
                    mediaAsset={mediaAsset}
                    selected={selectedLayerId === mediaAsset.layerId}
                  />
                ))
              : null}
            {children ? (
              <div
                className="absolute inset-0 z-20"
                data-toolcraft-canvas-slot=""
              >
                {children}
              </div>
            ) : null}
          </div>
        ) : null}
      </CanvasViewportWorld>
      <ToolcraftCanvasHandleLayers />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[color:color-mix(in_oklab,var(--link)_8%,transparent)] opacity-0 transition-opacity duration-150 ease-out group-data-[drag-over=true]/canvas:opacity-100"
        data-canvas-drag-highlight=""
      />
    </div>
  );
}
