import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the base Toolcraft template app contract for AI assembly", () => {
    expect(appSchema.canvas.draggable).toBe(true);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(true);
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.controls?.sections[0]?.controls.settingsTransfer).toMatchObject({
      target: "runtime.settingsTransfer",
      type: "settingsTransfer",
    });
    expect(appSchema.panels.controls?.sections[0]?.controls.canvasAspectRatio).toMatchObject({
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(appSchema.panels.controls?.sections[0]?.controls.canvasWidth).toMatchObject({
      target: "canvas.size.width",
      type: "text",
    });
    expect(appSchema.panels.controls?.sections[0]?.controls.canvasHeight).toMatchObject({
      target: "canvas.size.height",
      type: "text",
    });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
    expect(appSchema.assembly.components).toEqual([
      "canvas",
      "controlsPanel",
      "toolbar",
    ]);
    expect(appSchema.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "canvas.draggable",
        "canvas.editableSize",
        "canvas.upload",
        "controls.defaults",
        "controls.panel",
        "toolbar.history",
        "toolbar.radar",
        "toolbar.theme",
        "toolbar.zoom",
      ]),
    );
    expect(appSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(appSchema.assembly.commands).toEqual(
      expect.arrayContaining([
        "canvas.center",
        "canvas.setSize",
        "canvas.setViewport",
        "canvas.zoomIn",
        "controls.reset",
        "controls.setValue",
        "history.undo",
        "media.delete",
        "media.import",
      ]),
    );
    expect(appSchema.assembly.commands).not.toContain("timeline.setCurrentTime");
  });

  it("publishes the Frozen product controls without layers or timeline", () => {
    const productSections =
      appSchema.panels.controls?.sections.filter((section) => section.title !== "Setup") ??
      [];

    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(productSections.map((section) => section.title)).toEqual([
      "Source",
      "Thaw Front",
      "Melt Brush",
      "Ice Geometry",
      "Ice Surface",
      "Material Mask",
      "Scratch map",
      "Surface Relief",
      "Offset",
      "Lighting",
      "Background",
      "Image Export",
      "Export",
    ]);
    expect(
      productSections.flatMap((section) =>
        Object.values(section.controls).map((control) => control.target),
      ),
    ).toEqual(
      expect.arrayContaining([
        "source.mode",
        "source.model",
        "source.image",
        "source.imageThickness",
        "source.imageCornerRadius",
        "source.imageBevel",
        "source.modelExposure",
        "scene.orientation",
        "effect.progress",
        "melt.enabled",
        "melt.heat",
        "melt.radius",
        "melt.structure",
        "melt.refreeze",
        "melt.refreezeMode",
        "melt.action",
        "ice.crystalDensity",
        "ice.materialMaskCoverage",
        "ice.icicleRadius",
        "ice.ior",
        "source.scratchTexture",
        "scratch.displacement",
        "lighting.environmentIntensity",
        "export.image.resolution",
        "actions.output",
      ]),
    );
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
  });

  it("does not imply timeline behavior before a product needs it", () => {
    expect(appSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(appSchema.assembly.commands).not.toContain("timeline.toggleControlKeyframes");
    expect(appSchema.assembly.commands).not.toContain("timeline.moveKeyframe");
  });

  it("declares bounded Frozen performance paths", () => {
    expect(appPerformance.scenarios).toHaveLength(14);
    expect(
      appPerformance.workloadEnvelope.dimensions.map((dimension) => dimension.id),
    ).toEqual([
      "source-triangles",
      "model-render-triangles",
      "scratch-texture-pixels",
      "source-image-pixels",
      "surface-crystal-coverage",
      "icicle-coverage",
      "physical-transmission",
      "preview-render-scale",
      "export-width-px",
    ]);
  });
});
