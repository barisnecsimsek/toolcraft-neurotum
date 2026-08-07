import { render } from "@testing-library/react";
import type * as React from "react";
import { vi } from "vitest";

import { defineToolcraft } from "../../schema/define-toolcraft";
import type { ToolcraftInitialState } from "../../state/types";
import { ToolcraftRoot } from "../app-shell/toolcraft-root";
import { useToolcraft } from "../app-shell/use-toolcraft";
import { CanvasShell } from "./canvas-shell";

export function createSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      size: { width: 300, height: 200, unit: "px" },
      upload: true,
    },
    panels: {},
  });
}

export function createIntrinsicMediaSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      sizing: { mode: "intrinsic-media" },
      upload: true,
    },
    panels: {},
  });
}

export function createUploadDefaultSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      upload: true,
    },
    panels: {},
  });
}

export function CanvasStateProbe() {
  const { state } = useToolcraft();

  return (
    <>
      <span data-testid="canvas-offset">
        {state.canvas.offset.x},{state.canvas.offset.y}
      </span>
      <span data-testid="canvas-zoom">{state.canvas.zoom}</span>
      <span data-testid="media-count">{state.mediaAssets.length}</span>
      <span data-testid="media-size">
        {state.mediaAssets[0]?.size?.width ?? 0},{state.mediaAssets[0]?.size?.height ?? 0}
      </span>
      <span data-testid="media-targets">
        {state.mediaAssets.map((asset) => asset.sourceTarget ?? "none").join(",")}
      </span>
      <span data-testid="media-kinds">
        {state.mediaAssets.map((asset) => asset.assetKind ?? "image").join(",")}
      </span>
    </>
  );
}

export function mockCanvasRect(canvas: HTMLElement): void {
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    bottom: 600,
    height: 600,
    left: 0,
    right: 800,
    toJSON: () => ({}),
    top: 0,
    width: 800,
    x: 0,
    y: 0,
  });
}

type RenderCanvasShellOptions = {
  afterCanvas?: React.ReactNode;
  children?: React.ReactNode;
  frameProps?: React.HTMLAttributes<HTMLDivElement>;
  initialState?: ToolcraftInitialState;
  schema?: ReturnType<typeof defineToolcraft>;
};

export function renderCanvasShell({
  afterCanvas,
  children,
  frameProps,
  initialState,
  schema = createSchema(),
}: RenderCanvasShellOptions = {}) {
  const { style, ...restFrameProps } = frameProps ?? {};

  return render(
    <ToolcraftRoot initialState={initialState} schema={schema}>
      <div
        {...restFrameProps}
        style={{ height: 640, position: "relative", width: 640, ...style }}
      >
        <CanvasShell>{children}</CanvasShell>
        {afterCanvas}
      </div>
    </ToolcraftRoot>,
  );
}
