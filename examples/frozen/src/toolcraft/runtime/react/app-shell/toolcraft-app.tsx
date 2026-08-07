"use client";

import * as React from "react";

import type { ResolvedToolcraftAppSchema } from "../../schema/types";
import type { AnyToolcraftRendererPipelineRegistration } from "../../rendering";
import type { ToolcraftState } from "../../state/types";
import { CanvasShell } from "../canvas/canvas-shell";
import {
  ControlsPanel,
  type ToolcraftPanelActionHandler,
} from "../controls-panel/controls-panel";
import type { ToolcraftControlRendererMap } from "../controls-panel/control-renderers";
import { ToolcraftRoot } from "./toolcraft-root";
import { LayersPanel } from "../layers/layers-panel";
import { TimelinePanel } from "../timeline/timeline-panel";
import { ToolbarPanel } from "./toolbar-panel";
import { useToolcraftCommittedSelector } from "./toolcraft-selectors";

export type ToolcraftAppComposition = {
  canvasContent?: React.ReactNode;
  controlRenderers?: ToolcraftControlRendererMap;
  onPanelAction?: ToolcraftPanelActionHandler;
  renderDefaultCanvasMedia?: boolean;
  rendererPipelineRegistration?: AnyToolcraftRendererPipelineRegistration;
  schema: ResolvedToolcraftAppSchema;
};

export type ToolcraftAppProps = ToolcraftAppComposition & {
  className?: string;
  style?: React.CSSProperties;
};

const toolcraftMinAppWidthPx = 1024;

const selectAppSurfaces = (state: ToolcraftState) =>
  state.schema.assembly.surfaces;
const selectTimelinePanelHidden = (state: ToolcraftState) =>
  state.panels.timeline.hidden === true;
const selectTimelinePanelExtended = (state: ToolcraftState) =>
  state.panels.timeline.extended === true;

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function ToolcraftAppContent({
  canvasContent,
  className,
  controlRenderers,
  onPanelAction,
  renderDefaultCanvasMedia = true,
  style,
}: Omit<ToolcraftAppProps, "rendererPipelineRegistration" | "schema">): React.JSX.Element {
  const surfaces = useToolcraftCommittedSelector(selectAppSurfaces);
  const timelinePanelHidden = useToolcraftCommittedSelector(
    selectTimelinePanelHidden,
  );
  const timelinePanelVariant =
    useToolcraftCommittedSelector(selectTimelinePanelExtended)
      ? "extended"
      : "compact";

  return (
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
        <div
          data-toolcraft-timeline-panel-hidden={timelinePanelHidden ? "true" : undefined}
          data-toolcraft-timeline-panel-variant={timelinePanelVariant}
          hidden={timelinePanelHidden}
        >
          <TimelinePanel panelPlacement="floating" variant={timelinePanelVariant} />
        </div>
      ) : null}
      {surfaces.panels.toolbar.enabled ? (
        <ToolbarPanel panelPlacement="floating" />
      ) : null}
    </div>
  );
}

export function ToolcraftApp({
  rendererPipelineRegistration,
  schema,
  ...props
}: ToolcraftAppProps): React.JSX.Element {
  return (
    <ToolcraftRoot
      rendererPipelineRegistration={rendererPipelineRegistration}
      schema={schema}
    >
      <ToolcraftAppContent {...props} />
    </ToolcraftRoot>
  );
}
