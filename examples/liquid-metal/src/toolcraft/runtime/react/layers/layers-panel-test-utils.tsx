import { cleanup, render } from "@testing-library/react";
import type * as React from "react";
import { vi } from "vitest";

import { defineToolcraft } from "../../schema/define-toolcraft";
import type { ToolcraftLayer, ToolcraftMediaAsset } from "../../state/types";
import { ToolcraftRoot } from "../app-shell/toolcraft-root";
import { useToolcraft } from "../app-shell/use-toolcraft";
import { LayersPanel } from "./layers-panel";

export function installLayersPanelMatchMedia() {
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
}

export function cleanupLayersPanelTestEnv() {
  cleanup();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
  window.localStorage.clear();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "elementFromPoint");
}

export function createSchema() {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      layers: true,
    },
  });
}

export const seededLayers: ToolcraftLayer[] = [
  {
    collapsed: false,
    displayName: "Scene Group",
    id: "group-1",
    kind: "group",
    name: "scene-group",
    visible: true,
  },
  {
    displayName: "Layer 1",
    id: "layer-1",
    kind: "layer",
    name: "layer-1",
    parentGroupId: "group-1",
    visible: true,
  },
  {
    displayName: "Layer 2",
    id: "layer-2",
    kind: "layer",
    name: "layer-2",
    visible: true,
  },
];

function StateProbe() {
  const { state } = useToolcraft();

  return (
    <>
      <span data-testid="selected-layer">{state.selectedLayerId}</span>
      <span data-testid="layer-count">{state.layers.length}</span>
      <span data-testid="layer-1-visible">
        {String(state.layers.find((layer) => layer.id === "layer-1")?.visible)}
      </span>
      <span data-testid="group-collapsed">
        {String(state.layers.find((layer) => layer.id === "group-1")?.collapsed)}
      </span>
      <span data-testid="layer-tree">
        {state.layers
          .map((layer) => `${layer.id}:${layer.parentGroupId ?? "root"}`)
          .join("|")}
      </span>
    </>
  );
}

export function renderLayersPanel(
  props: Partial<React.ComponentProps<typeof LayersPanel>> = {},
  layers = seededLayers,
  mediaAssets: ToolcraftMediaAsset[] = [
    {
      dataUrl: "data:image/png;base64,test",
      fileName: "layer-1.png",
      id: "media-1",
      layerId: "layer-1",
      mimeType: "image/png",
      position: { x: 0, y: 0 },
      size: { height: 768, unit: "px", width: 1024 },
    },
  ],
) {
  return render(
    <ToolcraftRoot
      initialState={{
        layers,
        mediaAssets,
        selectedLayerId: "layer-1",
      }}
      schema={createSchema()}
    >
      <LayersPanel framed={false} {...props} />
      <StateProbe />
    </ToolcraftRoot>,
  );
}

export function mockLayerRowRect(row: HTMLElement, top = 0) {
  vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
    bottom: top + 32,
    height: 32,
    left: 0,
    right: 240,
    toJSON: () => ({}),
    top,
    width: 240,
    x: 0,
    y: top,
  });
}
