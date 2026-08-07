import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import { DEFAULT_ORBIT_POSE } from "./renderer/orbit-camera";

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

  it("starts with runtime setup followed by product-specific Effects sections", () => {
    const productSections =
      appSchema.panels.controls?.sections.filter((section) => section.title !== "Setup") ??
      [];

    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(productSections.some((section) => section.title === "3D model")).toBe(true);
    expect(productSections.some((section) => section.title === "Model")).toBe(false);
    expect(productSections.some((section) => section.title === "Stylized Effect")).toBe(true);
    expect(productSections.some((section) => section.title === "Image Export")).toBe(true);
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
  });

  it("does not imply timeline behavior before a product needs it", () => {
    expect(appSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(appSchema.assembly.commands).not.toContain("timeline.toggleControlKeyframes");
    expect(appSchema.assembly.commands).not.toContain("timeline.moveKeyframe");
  });

  it("uses the attached settings profile as the fresh-load and reset defaults", () => {
    const defaultsByTarget = Object.fromEntries(
      (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
        Object.values(section.controls).map((control) => [
          control.target,
          control.defaultValue,
        ]),
      ),
    );

    expect(appSchema.canvas.size).toEqual({ height: 1080, unit: "px", width: 1920 });
    expect(appSchema.canvas.renderScale.defaultValue).toBe(2);
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(defaultsByTarget).toMatchObject({
      "bloom.mix": 0.73,
      "bloom.strength": 1.2,
      "chromatic.amount": 0.02,
      "chromatic.enabled": true,
      "dither.colors.preset": "tidepool",
      "dither.pattern": "blue-noise",
      "dither.size": 1,
      "effect.mode": "dither",
      "grain.enabled": true,
      "view.orbit": DEFAULT_ORBIT_POSE,
    });
  });

  it("declares product WebGL performance scenarios", () => {
    expect(appPerformance.rendererStrategy).toBe("webgl");
    expect(appPerformance.scenarios.length).toBeGreaterThan(0);
    expect(appPerformance.workloadTargets).toContain("effect.mode");
  });
});
