import { describe, expect, it } from "vitest";

import { getToolcraftSettingsTransferEligibility } from "@/toolcraft/runtime";

import {
  appAcceptance,
  appProductReadiness,
  appTransferMode,
  getToolcraftControlOrderTargets,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  liquidGlassDefaultButtonImageAsset,
  liquidGlassDefaultMediaAssets,
  liquidGlassDefaultSourceAsset,
  liquidGlassDefaultTextureAsset,
} from "./liquid-glass-default-media";
import { liquidGlassDefaultSettings } from "./liquid-glass-types";
import { getLiquidGlassGeometry } from "./liquid-glass-values";

function authoredSectionTargets(): string[][] {
  return (appSchema.panels.controls?.sections ?? []).map((section) =>
    Object.values(section.controls).map((control) => control.target),
  );
}

describe("appSchema", () => {
  it("publishes the liquid glass Toolcraft product contract", () => {
    expect(appProductReadiness).toMatchObject({
      mode: "product",
      productName: "Liquid Glass",
    });
    expect(appTransferMode).toEqual({
      animationIntent: { mode: "none" },
      behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
      mode: "reference-runtime-clone",
      referenceName: "samasante/liquid-glass",
      referenceTimeline: { behaviorCoverage: [], mode: "none" },
      sourceOfTruth: "reference-runtime",
    });

    expect(appSchema.canvas).toMatchObject({
      draggable: true,
      enabled: true,
      renderScale: { defaultValue: 2, enabled: true, max: 2, min: 1 },
      size: { height: 1080, unit: "px", width: 1920 },
      sizing: { mode: "editable-output" },
      upload: true,
    });
    expect(appSchema.export?.png).toEqual({ background: "include" });
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
  });

  it("keeps the control section inventory grouped by product workflow", () => {
    expect((appSchema.panels.controls?.sections ?? []).map((section) => section.title)).toEqual([
      "Setup",
      "Source",
      "Source Texture",
      "Glass Shape",
      "Center",
      "Glass Blend",
      "Glass Shadow",
      "Glass Text",
      "Button Image",
      "Glass Texture",
      "Refraction",
      "Edge",
      "Surface",
      "Highlights",
      "Background",
      "Image Export",
      "Export",
    ]);
    expect(authoredSectionTargets()).toEqual([
      [
        "runtime.settingsTransfer",
        "canvas.aspectRatio",
        "canvas.size.width",
        "canvas.size.height",
        "canvas.renderScale",
      ],
      ["source.upload"],
      ["source.saturation"],
      ["glass.shape", "glass.width", "glass.height", "glass.radius"],
      ["glass.center"],
      ["glass.opacity"],
      ["shadow.enabled", "shadow.offset", "shadow.color", "shadow.blur"],
      [
        "text.enabled",
        "text.dragTarget",
        "text.blendMode",
        "text.alignX",
        "text.alignY",
        "text.offset",
        "text.content",
        "text.style",
      ],
      [
        "buttonImage.upload",
        "buttonImage.blendMode",
        "buttonImage.offset",
        "buttonImage.scale",
      ],
      [
        "texture.mode",
        "texture.preset",
        "texture.upload",
        "texture.blendMode",
        "texture.opacity",
      ],
      [
        "glass.strength",
        "glass.depth",
        "glass.curvature",
        "glass.fisheye",
        "glass.dispersion",
        "glass.splay",
      ],
      ["glass.bend", "glass.bendWidth"],
      ["glass.frost", "glass.brightness", "glass.murkiness"],
      [
        "glass.specular",
        "glass.sheen",
        "glass.sheenWidth",
        "glass.sheenAngle",
        "glass.glow",
        "glass.glowSpread",
      ],
      ["export.includeBackground", "appearance.background"],
      ["export.image.format", "export.image.resolution"],
      ["panel.actions"],
    ]);
    expect(getToolcraftControlOrderTargets(appSchema)).toEqual([
      "runtime.settingsTransfer",
      "canvas.aspectRatio",
      "canvas.size.width",
      "canvas.size.height",
      "canvas.renderScale",
      "source.upload",
      "source.saturation",
      "glass.shape",
      "glass.width",
      "glass.height",
      "glass.radius",
      "glass.center",
      "glass.opacity",
      "shadow.enabled",
      "shadow.offset",
      "shadow.color",
      "shadow.blur",
      "text.enabled",
      "text.dragTarget",
      "text.blendMode",
      "text.alignX",
      "text.alignY",
      "text.offset",
      "text.content",
      "text.style",
      "buttonImage.upload",
      "buttonImage.blendMode",
      "buttonImage.offset",
      "buttonImage.scale",
      "texture.mode",
      "texture.preset",
      "texture.upload",
      "texture.blendMode",
      "texture.opacity",
      "glass.strength",
      "glass.depth",
      "glass.curvature",
      "glass.fisheye",
      "glass.dispersion",
      "glass.splay",
      "glass.bend",
      "glass.bendWidth",
      "glass.frost",
      "glass.brightness",
      "glass.murkiness",
      "glass.specular",
      "glass.sheen",
      "glass.sheenWidth",
      "glass.sheenAngle",
      "glass.glow",
      "glass.glowSpread",
      "export.includeBackground",
      "appearance.background",
      "export.image.format",
      "export.image.resolution",
    ]);
  });

  it("uses Toolcraft persistence, settings transfer, and required export controls", () => {
    expect(appSchema.persistence).toEqual({
      include: ["values", "canvas", "panels"],
      key: "toolcraft:liquid-glass:state:v6",
      storage: "localStorage",
      version: 6,
    });
    expect(appSchema.settingsTransfer).toEqual({
      appId: "liquid-glass",
      enabled: true,
      fileName: "liquid-glass-settings.json",
      mode: "auto",
    });
    expect(getToolcraftSettingsTransferEligibility({ panels: appSchema.panels })).toMatchObject({
      eligible: true,
    });

    const backgroundSection = appSchema.panels.controls?.sections.find(
      (section) => section.title === "Background",
    );
    const imageExportSection = appSchema.panels.controls?.sections.find(
      (section) => section.title === "Image Export",
    );

    expect(backgroundSection?.layoutGroups).toEqual([
      { columns: 2, controls: ["includeBackground", "background"], layout: "inline" },
    ]);
    expect(backgroundSection?.controls.includeBackground).toMatchObject({
      label: "Include",
      target: "export.includeBackground",
      type: "switch",
    });
    expect(backgroundSection?.controls.background).toMatchObject({
      label: false,
      target: "appearance.background",
      type: "color",
    });
    expect(imageExportSection?.layoutGroups).toEqual([
      { columns: 2, controls: ["imageFormat", "imageResolution"], layout: "inline" },
    ]);
    expect(imageExportSection?.controls.imageFormat).toMatchObject({
      target: "export.image.format",
      type: "select",
    });
    expect(imageExportSection?.controls.imageResolution).toMatchObject({
      defaultValue: "4k",
      target: "export.image.resolution",
      type: "select",
    });
  });

  it("keeps spatial vector pads screen-aligned through Toolcraft defaults", () => {
    const controls = (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
      Object.values(section.controls),
    );

    expect(
      controls
        .filter((control) =>
          ["glass.center", "shadow.offset", "text.offset", "buttonImage.offset"].includes(
            control.target,
          ),
        )
        .map((control) => ({
          coordinateMode: control.coordinateMode,
          defaultValue: control.defaultValue,
          target: control.target,
          type: control.type,
        })),
    ).toEqual([
      {
        coordinateMode: "screen",
        defaultValue: { x: 0, y: 0 },
        target: "glass.center",
        type: "vector",
      },
      {
        coordinateMode: "screen",
        defaultValue: { x: 0, y: 0.14 },
        target: "shadow.offset",
        type: "vector",
      },
      {
        coordinateMode: "screen",
        defaultValue: { x: 0, y: -0.15 },
        target: "text.offset",
        type: "vector",
      },
      {
        coordinateMode: "screen",
        defaultValue: { x: 0.07, y: 0.01 },
        target: "buttonImage.offset",
        type: "vector",
      },
    ]);
  });

  it("keeps default centered circle geometry", () => {
    const glassShapeSection = appSchema.panels.controls?.sections.find(
      (section) => section.title === "Glass Shape",
    );
    const glassTextSection = appSchema.panels.controls?.sections.find(
      (section) => section.title === "Glass Text",
    );
    const buttonImageSection = appSchema.panels.controls?.sections.find(
      (section) => section.title === "Button Image",
    );

    expect(glassShapeSection?.controls.glassShape).toMatchObject({
      defaultValue: "circle",
    });
    expect(glassShapeSection?.controls.glassWidth).toMatchObject({
      defaultValue: 459,
    });
    expect(glassShapeSection?.controls.glassHeight).toMatchObject({
      defaultValue: 459,
    });
    expect(glassShapeSection?.controls.glassRadius).toMatchObject({
      defaultValue: 230,
    });
    expect(glassTextSection?.controls.textEnabled).toMatchObject({
      defaultValue: false,
    });
    expect(buttonImageSection?.controls.buttonImageBlendMode).toMatchObject({
      defaultValue: "overlay",
    });
    expect(buttonImageSection?.controls.buttonImageOffset).toMatchObject({
      defaultValue: { x: 0.07, y: 0.01 },
    });
    expect(buttonImageSection?.controls.buttonImageScale).toMatchObject({
      defaultValue: 0.71,
    });
    expect(liquidGlassDefaultSettings.glass.center).toEqual({ x: 0.5, y: 0.5 });
    expect(liquidGlassDefaultSettings.glass.shape).toBe("circle");
    expect(liquidGlassDefaultSettings.shadow.color).toBe("#2E214A");
    expect(liquidGlassDefaultSettings.text.enabled).toBe(false);
    expect(liquidGlassDefaultSettings.buttonImage).toEqual({
      blendMode: "overlay",
      offset: { x: 0.07, y: 0.01 },
      scale: 0.71,
    });
    const geometry = getLiquidGlassGeometry(liquidGlassDefaultSettings);
    expect(geometry).toMatchObject({
      height: 459,
      width: 459,
    });
    expect(geometry.radius).toBeCloseTo(229.5);
  });

  it("seeds default source, texture, and button image media as visible fileDrop assets", () => {
    expect(liquidGlassDefaultSourceAsset).toMatchObject({
      dataUrl: "/liquid-glass-default-background.png",
      fileName: "flow-gradient-shader (1).png",
      sourceTarget: "source.upload",
    });
    expect(liquidGlassDefaultTextureAsset).toMatchObject({
      dataUrl: "/liquid-glass-default-texture.jpg",
      fileName: "texture.jpg",
      sourceTarget: "texture.upload",
    });
    expect(liquidGlassDefaultButtonImageAsset).toMatchObject({
      dataUrl: "/liquid-glass-default-button-image.png",
      fileName: "icon.png",
      size: { height: 346, unit: "px", width: 346 },
      sourceTarget: "buttonImage.upload",
    });
    expect(liquidGlassDefaultMediaAssets).toEqual([
      liquidGlassDefaultSourceAsset,
      liquidGlassDefaultTextureAsset,
      liquidGlassDefaultButtonImageAsset,
    ]);
  });

  it("keeps acceptance coverage valid for every visible entity", () => {
    expect(validateToolcraftAcceptanceCoverage(appSchema, appAcceptance, appTransferMode)).toEqual(
      [],
    );
    expect(appAcceptance.map((entry) => entry.automatedTestName)).toEqual([
      "reference canvas size matches liquid glass renderer",
      "reference control mapping preserves liquid glass output",
      "reference renderer state preserves liquid glass lifecycle",
      "canvas aspect ratio changes glass output size",
      "canvas width changes glass output size",
      "canvas height changes glass output size",
      "resolution scale changes preview backing pixels",
      "settings transfer exports and imports liquid glass settings",
      "persistence restores liquid glass settings after reload",
      "source image upload clear and reset update liquid glass media",
      "source saturation changes liquid glass output",
      "glass shape changes rendered output",
      "glass width changes rendered output",
      "glass height changes rendered output",
      "glass radius changes rendered output",
      "glass center vector changes rendered output",
      "glass direct canvas drag changes rendered output",
      "glass opacity changes rendered output",
      "glass shadow include changes rendered output",
      "glass shadow offset changes rendered output",
      "glass shadow color changes rendered output",
      "glass shadow blur changes rendered output",
      "glass text include changes rendered output",
      "glass text drag target changes canvas behavior",
      "glass text offset changes rendered output",
      "glass text content changes rendered output",
      "glass text style changes rendered output",
      "glass text blend mode changes rendered output",
      "glass text horizontal alignment changes rendered output",
      "glass text vertical alignment changes rendered output",
      "button image upload clear and reset update glass content",
      "button image blend mode changes rendered output",
      "button image position changes rendered output",
      "button image scale changes rendered output",
      "texture mode changes glass surface overlay",
      "texture pattern changes glass surface overlay",
      "texture image upload clear and reset update glass overlay",
      "texture blend mode changes glass surface overlay",
      "texture opacity changes glass surface overlay",
      "strength changes refraction output",
      "depth changes refraction output",
      "curvature changes refraction output",
      "fisheye changes refraction output",
      "aberration changes refraction output",
      "splay changes refraction output",
      "edge bend changes rendered output",
      "edge width changes rendered output",
      "frost changes rendered output",
      "brightness changes rendered output",
      "murkiness changes rendered output",
      "specular changes highlight output",
      "sheen changes highlight output",
      "sheen thickness changes highlight output",
      "sheen angle changes highlight output",
      "glow changes highlight output",
      "glow spread changes highlight output",
      "include background changes preview and png output",
      "background color changes preview and png output",
      "image format changes exported file type",
      "image resolution changes exported dimensions",
      "export png outputs liquid glass bytes",
      "toolbar zoom and center keep liquid glass viewport stable",
    ]);
  });

  it("backs every performance scenario with an app-test name", () => {
    expect(appPerformance.rendererStrategy).toBe("webgl");
    expect(appPerformance.rendererWorkload).toBe("pixel-output");
    expect(appPerformance.scenarios.map((scenario) => scenario.automatedTestName)).toEqual([
      "perf: stress preview render stays within liquid glass budget",
      "perf: canvas-aspect-ratio workload change stays responsive",
      "perf: canvas-width workload change stays responsive",
      "perf: canvas-height workload change stays responsive",
      "perf: canvas-render-scale workload stays responsive",
      "perf: texture-mode workload change stays responsive",
      "perf: texture-preset workload change stays responsive",
      "perf: text-style workload change stays responsive",
      "perf: glass-shape workload change stays responsive",
      "perf: glass-width workload stays responsive",
      "perf: glass-height workload stays responsive",
      "perf: glass-radius workload stays responsive",
      "perf: glass-depth workload stays responsive",
      "perf: glass-curvature workload stays responsive",
      "perf: glass-splay workload stays responsive",
      "perf: glass-bend workload stays responsive",
      "perf: glass-bend-width workload stays responsive",
      "perf: glass-frost workload stays responsive",
      "perf: glass-sheen workload stays responsive",
      "perf: glass-sheen-width workload stays responsive",
      "perf: glass-sheen-angle workload stays responsive",
      "perf: glass-glow workload stays responsive",
      "perf: glass-glow-spread workload stays responsive",
      "perf: shadow-blur workload stays responsive",
      "perf: image-resolution workload change stays responsive",
      "perf: runtime-settings-transfer change stays responsive",
      "perf: source-saturation drag stays responsive",
      "perf: glass-center change stays responsive",
      "perf: glass-opacity drag stays responsive",
      "perf: shadow-enabled change stays responsive",
      "perf: shadow-offset change stays responsive",
      "perf: shadow-color change stays responsive",
      "perf: texture-blend-mode change stays responsive",
      "perf: texture-opacity drag stays responsive",
      "perf: button-image-blend-mode change stays responsive",
      "perf: button-image-position change stays responsive",
      "perf: button-image-scale drag stays responsive",
      "perf: text-enabled change stays responsive",
      "perf: text-drag-target change stays responsive",
      "perf: text-content change stays responsive",
      "perf: text-blend-mode change stays responsive",
      "perf: text-align-x change stays responsive",
      "perf: text-align-y change stays responsive",
      "perf: text-offset change stays responsive",
      "perf: glass-strength drag stays responsive",
      "perf: glass-fisheye drag stays responsive",
      "perf: glass-dispersion drag stays responsive",
      "perf: glass-brightness drag stays responsive",
      "perf: glass-murkiness drag stays responsive",
      "perf: glass-specular drag stays responsive",
      "perf: include-background change stays responsive",
      "perf: background-color change stays responsive",
      "perf: image-format change stays responsive",
      "perf: glass-center canvas drag stays responsive",
      "perf: text-offset canvas drag stays responsive",
      "perf: source image media import stays responsive",
      "perf: button image media import stays responsive",
      "perf: texture image media import stays responsive",
      "perf: image export stays within liquid glass budget",
      "perf: liquid glass viewport stays stable",
      "perf: liquid glass zoom stress stays responsive",
    ]);
  });
});
