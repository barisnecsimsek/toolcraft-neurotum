"use client";

import * as React from "react";

import type { ResolvedToolcraftAppSchema } from "../schema/types";
import { CanvasShell } from "./canvas-shell";
import {
  ControlsPanel,
  type ToolcraftPanelActionHandler,
} from "./controls-panel";
import type { ToolcraftControlRendererMap } from "./control-renderers";
import { ToolcraftRoot } from "./toolcraft-root";
import { LayersPanel } from "./layers-panel";
import { TimelinePanel } from "./timeline-panel";
import { ToolbarPanel } from "./toolbar-panel";

export type ToolcraftAppProps = {
  canvasContent?: React.ReactNode;
  className?: string;
  controlRenderers?: ToolcraftControlRendererMap;
  onPanelAction?: ToolcraftPanelActionHandler;
  renderDefaultCanvasMedia?: boolean;
  schema: ResolvedToolcraftAppSchema;
  style?: React.CSSProperties;
};

const toolcraftMinAppWidthPx = 1024;

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function ToolcraftApp({
  canvasContent,
  className,
  controlRenderers,
  onPanelAction,
  renderDefaultCanvasMedia = true,
  schema,
  style,
}: ToolcraftAppProps): React.JSX.Element {
  const surfaces = schema.assembly.surfaces;

  return (
    <ToolcraftRoot schema={schema}>
      <div
        className={cn(
          "relative min-h-[640px] w-full overflow-hidden bg-[color:var(--background)]",
          className,
        )}
        data-slot="toolcraft-runtime-app"
        style={{
          ...style,
          minWidth: toolcraftMinAppWidthPx,
        }}
      >
        {surfaces.canvas.enabled ? (
          <CanvasShell renderDefaultMedia={renderDefaultCanvasMedia}>
            {canvasContent}
          </CanvasShell>
        ) : null}
        {surfaces.panels.layers?.enabled ? (
          <LayersPanel panelPlacement="floating" />
        ) : null}
        {surfaces.panels.controls?.enabled ? (
          <ControlsPanel
            controlRenderers={controlRenderers}
            onPanelAction={onPanelAction}
            panelPlacement="floating"
          />
        ) : null}
        {surfaces.panels.timeline?.enabled ? (
          <TimelinePanel panelPlacement="floating" />
        ) : null}
        {surfaces.panels.toolbar.enabled ? (
          <ToolbarPanel panelPlacement="floating" />
        ) : null}
      </div>
    </ToolcraftRoot>
  );
}
