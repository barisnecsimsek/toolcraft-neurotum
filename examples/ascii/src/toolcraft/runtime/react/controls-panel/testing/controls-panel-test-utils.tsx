import { act, cleanup, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileDrop, Panel } from "@/toolcraft/ui";
import {
  DEFAULT_COLOR_FORMAT_MODE,
  getColorSurfaceModel,
  getColorSurfaceSliderConfig,
  getColorSurfaceStyle,
  getColorSurfaceThumbPosition,
  getSurfaceHsvColor,
  StyleGuideColorPicker,
} from "@/toolcraft/ui/components/controls";
import * as React from "react";
import { afterEach, beforeAll, vi } from "vitest";

import { defineToolcraft } from "../../../schema/define-toolcraft";
import type { ResolvedToolcraftAppSchema } from "../../../schema/types";
import type { ToolcraftInitialState } from "../../../state/types";
import { CanvasShell } from "../../canvas/canvas-shell";
import { ControlsPanel } from "../controls-panel";
import { ToolcraftRoot } from "../../app-shell/toolcraft-root";
import { useToolcraft } from "../../app-shell/use-toolcraft";

export {
  act,
  CanvasShell,
  cleanup,
  ControlsPanel,
  createEvent,
  DEFAULT_COLOR_FORMAT_MODE,
  defineToolcraft,
  FileDrop,
  fireEvent,
  getColorSurfaceModel,
  getColorSurfaceSliderConfig,
  getColorSurfaceStyle,
  getColorSurfaceThumbPosition,
  getSurfaceHsvColor,
  Panel,
  React,
  render,
  screen,
  StyleGuideColorPicker,
  ToolcraftRoot,
  vi,
  waitFor,
};

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
    writable: true,
  });

  window.requestAnimationFrame ??= ((callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0)) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame ??= ((handle: number) =>
    window.clearTimeout(handle)) as typeof window.cancelAnimationFrame;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

export function createSchema() {
  return defineToolcraft({
    canvas: { enabled: true, size: { height: 180, unit: "px", width: 320 } },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              prompt: {
                defaultValue: "Initial prompt",
                description: "Describe the generated result.",
                label: "Prompt",
                target: "generation.prompt",
                type: "text",
              },
              opacity: {
                defaultValue: 75,
                label: "Opacity",
                max: 100,
                min: 0,
                target: "selectedLayer.opacity",
                type: "slider",
                unit: "%",
              },
              staticOpacity: {
                defaultValue: 40,
                keyframeable: false,
                label: "Static opacity",
                max: 100,
                min: 0,
                target: "style.staticOpacity",
                type: "slider",
                unit: "%",
              },
              blend: {
                defaultValue: "normal",
                label: "Blend",
                options: [
                  { label: "Normal", value: "normal" },
                  { label: "Screen", value: "screen" },
                ],
                target: "style.blend",
                type: "segmented",
              },
              enabled: {
                defaultValue: true,
                label: "Enabled",
                target: "generation.enabled",
                type: "switch",
              },
            },
            title: "Basic",
          },
          {
            controls: {
              anchor: {
                defaultValue: "center",
                label: "Anchor",
                target: "generation.anchor",
                type: "anchorGrid",
              },
            },
            layout: "standalone",
          },
          {
            controls: {
              image: {
                defaultValue: "image-1",
                items: [
                  {
                    alt: "Image 1",
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E",
                    value: "image-1",
                  },
                  {
                    alt: "Image 2",
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E",
                    value: "image-2",
                  },
                ],
                label: "Image",
                target: "input.image",
                type: "imagePicker",
              },
            },
            layout: "standalone",
          },
          {
            controls: {
              outputMix: {
                label: "Output Mix",
                target: "style.outputMix",
                type: "channelMixer",
              },
            },
            layout: "standalone",
            title: "Output Mix",
          },
          {
            controls: {
              curves: {
                label: false,
                target: "style.curves",
                type: "curves",
              },
            },
            layout: "standalone",
          },
          {
            controls: {
              fill: {
                defaultValue: { hex: "#C1FF00" },
                label: "Fill",
                target: "style.fill",
                type: "color",
              },
              stroke: {
                defaultValue: { hex: "#FF6A00" },
                label: "Stroke",
                target: "style.stroke",
                type: "color",
              },
            },
            layout: "standalone",
          },
          {
            actionGroup: "secondary",
            controls: {
              footer: {
                actions: [
                  {
                    command: "controls.reset",
                    label: "Reset",
                    value: "reset",
                    variant: "outline",
                  },
                  {
                    command: "controls.apply",
                    label: "Apply",
                    value: "apply",
                    variant: "default",
                  },
                ],
                target: "panel.actions",
                type: "panelActions",
              },
            },
            layout: "standalone",
          },
        ],
        title: "Generation Controls",
      },
      timeline: true,
    },
  });
}

export function StateProbe() {
  const { dispatch, state } = useToolcraft();

  return (
    <>
      <button
        onClick={() => dispatch({ expanded: true, type: "timeline.setExpanded" })}
        type="button"
      >
        Expand timeline
      </button>
      <span data-testid="prompt-value">{String(state.values["generation.prompt"])}</span>
      <span data-testid="enabled-value">{String(state.values["generation.enabled"])}</span>
      <span data-testid="image-value">{String(state.values["input.image"])}</span>
      <span data-testid="font-value">
        {JSON.stringify(state.values["typography.font"])}
      </span>
      <span data-testid="text-color-value">
        {JSON.stringify(state.values["text.color"])}
      </span>
      <span data-testid="gradient-value">
        {JSON.stringify(state.values["style.gradient"])}
      </span>
      <span data-testid="canvas-size">
        {state.canvas.size.width},{state.canvas.size.height}
      </span>
      <span data-testid="media-count">{state.mediaAssets.length}</span>
      <span data-testid="media-ids">
        {state.mediaAssets.map((asset) => asset.id).join(",")}
      </span>
      <span data-testid="media-sizes">
        {state.mediaAssets
          .map((asset) =>
            asset.size ? `${asset.size.width}x${asset.size.height}` : "none",
          )
          .join(",")}
      </span>
      <span data-testid="media-transforms">
        {JSON.stringify(state.mediaAssets.map((asset) => asset.transform ?? null))}
      </span>
      <span data-testid="timeline-expanded">{String(state.timeline.expanded)}</span>
      <span data-testid="timeline-panel-extended">{String(state.panels.timeline.extended)}</span>
      <span data-testid="timeline-panel-hidden">{String(state.panels.timeline.hidden)}</span>
      <span data-testid="timeline-keyframes">
        {JSON.stringify(state.timeline.keyframeGroups)}
      </span>
      <span data-testid="values-json">{JSON.stringify(state.values)}</span>
    </>
  );
}

export function renderControlsPanel(
  props: Partial<React.ComponentProps<typeof ControlsPanel>> = {},
  initialState?: ToolcraftInitialState,
) {
  return renderControlsPanelWithSchema(createSchema(), props, initialState);
}

export function renderControlsPanelWithSchema(
  schema: ResolvedToolcraftAppSchema,
  props: Partial<React.ComponentProps<typeof ControlsPanel>> = {},
  initialState?: ToolcraftInitialState,
) {
  return render(
    <ToolcraftRoot initialState={initialState} schema={schema}>
      <ControlsPanel framed={false} {...props} />
      <StateProbe />
    </ToolcraftRoot>,
  );
}
