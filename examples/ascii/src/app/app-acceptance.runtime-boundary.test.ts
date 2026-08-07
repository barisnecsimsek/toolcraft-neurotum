import { describe, expect, it } from "vitest";

import { appTransferMode } from "./app-acceptance";
import {
  getProductImplementationSource,
  readRouteSource,
  stripJsComments,
} from "./app-acceptance.source-test-utils";
import { appSchema } from "./app-schema";

const toolcraftAppRenderPattern =
  /<\s*ToolcraftApp\b|React\.createElement\s*\(\s*ToolcraftApp\b/;
const runtimeSurfaceComponentNames = [
  "ToolcraftRoot",
  "CanvasShell",
  "ControlsPanel",
  "LayersPanel",
  "TimelinePanel",
  "ToolbarPanel",
] as const;
const runtimeSurfaceNamePattern = runtimeSurfaceComponentNames.join("|");
const manualRuntimeSurfaceRenderPattern = new RegExp(
  `<\\s*(?:(?:${runtimeSurfaceNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${runtimeSurfaceNamePattern})\\b)|React\\.createElement\\s*\\(\\s*(?:(?:${runtimeSurfaceNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${runtimeSurfaceNamePattern})\\b)`,
);
const lowLevelRuntimeSurfaceImportPattern = new RegExp(
  `import\\s*\\{[^}]*\\b(?:${runtimeSurfaceNamePattern})\\b[^}]*\\}\\s*from\\s*["'][^"']*runtime/react["']`,
);
const builtInControlComponentNames = [
  "ActionsControl",
  "AnchorGridControl",
  "ChannelMixerControl",
  "CheckboxControl",
  "CodeTextareaControl",
  "ColorControl",
  "ColorOpacityControl",
  "CurvesControl",
  "FileDropControl",
  "FontPickerControl",
  "GradientControl",
  "ImagePickerControl",
  "PaletteControl",
  "PanelActionsControl",
  "RangeInputControl",
  "RangeSliderControl",
  "SegmentedControl",
  "SelectControl",
  "SliderControl",
  "SwitchControl",
  "TextInputControl",
  "VectorControl",
] as const;
const builtInControlNamePattern = builtInControlComponentNames.join("|");
const repoUiImportPattern = "@repo" + "/ui";
const builtInControlImportSourcePattern = ["toolcraft/ui", repoUiImportPattern].join("|");
const builtInControlImportPattern = new RegExp(
  `import\\s*\\{[^}]*\\b(?:${builtInControlNamePattern})\\b[^}]*\\}\\s*from\\s*["'][^"']*(?:${builtInControlImportSourcePattern})[^"']*["']`,
);
const directBuiltInControlRenderPattern = new RegExp(
  `<\\s*(?:(?:${builtInControlNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${builtInControlNamePattern})\\b)|React\\.createElement\\s*\\(\\s*(?:(?:${builtInControlNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${builtInControlNamePattern})\\b)`,
);
const customTimelineTransportRenderPattern =
  /<\s*[A-Z][A-Za-z0-9]*(?:Playback|Timeline|Transport)(?:Panel|Controls|Bar)\b/;

describe("Toolcraft template runtime boundary", () => {
  it("keeps the app route backed by the Toolcraft template shell", () => {
    const routeSource = readRouteSource();

    expect(
      routeSource,
      "The route must render ToolcraftApp directly; mentions in tests/docs do not prove the app shell is used.",
    ).toMatch(toolcraftAppRenderPattern);
    expect(
      routeSource,
      "Routes must not manually compose low-level runtime surfaces. Use ToolcraftApp so panel, canvas, toolbar, layers, and timeline design stay runtime-owned.",
    ).not.toMatch(manualRuntimeSurfaceRenderPattern);
    expect(routeSource).not.toMatch(
      /<\s*iframe\b|React\.createElement\s*\(\s*["']iframe["']/i,
    );
  });

  it("detects manual runtime surface composition even when acceptance text mentions ToolcraftApp", () => {
    const bypassRouteSource = stripJsComments(`
      import {
        CanvasShell,
        ControlsPanel,
        ToolcraftRoot,
        ToolbarPanel,
      } from "@/toolcraft/runtime/react";

      export function AppHome() {
        return (
          <ToolcraftRoot schema={appSchema}>
            <CanvasShell renderDefaultMedia={false}>
              <ProductCanvas />
            </CanvasShell>
            <AppPlaybackPanel />
            <ControlsPanel panelPlacement="floating" />
            <ToolbarPanel panelPlacement="floating" />
          </ToolcraftRoot>
        );
      }

      const acceptanceText =
        "preserve the reference renderer inside ToolcraftApp canvasContent";
    `);

    expect(bypassRouteSource).not.toMatch(toolcraftAppRenderPattern);
    expect(bypassRouteSource).toMatch(manualRuntimeSurfaceRenderPattern);
    expect(bypassRouteSource).toMatch(customTimelineTransportRenderPattern);
  });

  it("keeps app-specific code inside runtime extension points", () => {
    const implementationSource = getProductImplementationSource();

    expect(
      implementationSource,
      "App-specific code must not import low-level runtime surfaces. Render ToolcraftApp and use schema, canvasContent, controlRenderers, onPanelAction, and runtime commands.",
    ).not.toMatch(lowLevelRuntimeSurfaceImportPattern);
    expect(
      implementationSource,
      "App-specific code must not render low-level runtime surfaces directly. Fix shared runtime behavior instead of replacing panels, canvas, toolbar, timeline, or layers locally.",
    ).not.toMatch(manualRuntimeSurfaceRenderPattern);
    expect(
      implementationSource,
      "App-specific code must not import built-in control components directly. Declare built-in controls in schema or register a true product-specific controlRenderer.",
    ).not.toMatch(builtInControlImportPattern);
    expect(
      implementationSource,
      "App-specific code must not render built-in control components directly. Use schema control types so reset, history, layout, keyframes, disabled states, markers, labels, and acceptance stay runtime-owned.",
    ).not.toMatch(directBuiltInControlRenderPattern);
  });

  it("detects direct built-in control rendering as a runtime bypass", () => {
    const bypassSource = stripJsComments(`
      import { SliderControl } from "@/toolcraft/ui/components/controls/slider";
      import { TimelinePanel } from "@/toolcraft/runtime/react";

      export function BadControl() {
        return (
          <div>
            <SliderControl name="Opacity" value={50} onValueChange={() => {}} />
            {React.createElement(TimelinePanel, { panelPlacement: "floating" })}
          </div>
        );
      }
    `);

    expect(bypassSource).toMatch(lowLevelRuntimeSurfaceImportPattern);
    expect(bypassSource).toMatch(manualRuntimeSurfaceRenderPattern);
    expect(bypassSource).toMatch(builtInControlImportPattern);
    expect(bypassSource).toMatch(directBuiltInControlRenderPattern);
  });

  it("does not allow app-level playback transport beside the runtime timeline", () => {
    const routeSource = readRouteSource();
    const referenceTimelineMode =
      appTransferMode.mode === "reference-runtime-clone"
        ? appTransferMode.referenceTimeline.mode
        : null;

    if (
      appSchema.panels.timeline?.enabled &&
      referenceTimelineMode !== "custom-reference-timeline"
    ) {
      expect(
        routeSource,
        "Toolcraft playback/keyframe timelines must use the runtime TimelinePanel. App-level playback/transport panels are allowed only for explicit custom-reference-timeline transfers.",
      ).not.toMatch(customTimelineTransportRenderPattern);
    }
  });
});
