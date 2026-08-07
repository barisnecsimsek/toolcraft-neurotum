import { describe, expect, it } from "vitest";

import {
  appAcceptance,
  appProductReadiness,
  appTransferMode,
  getToolcraftControlOrderTargets,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("Liquid Metal 3D app schema", () => {
  it("publishes the complete Toolcraft product contract", () => {
    expect(appProductReadiness).toMatchObject({
      mode: "product",
      productName: "Liquid Metal 3D",
    });
    expect(appTransferMode).toMatchObject({
      animationIntent: { mode: "timeline-playback" },
      mode: "reference-runtime-clone",
      referenceName:
        "Paper Design Liquid Metal 0.0.77 + ASCII Tool orientation gizmo",
      sourceOfTruth: "reference-runtime",
    });
    expect(appSchema.canvas).toMatchObject({
      enabled: true,
      renderScale: { enabled: true },
      size: { height: 1080, width: 1920 },
      sizing: { mode: "editable-output" },
      upload: true,
    });
    expect(appSchema.panels.controls?.title).toBe("Liquid Metal 3D");
    expect(appSchema.panels.timeline).toMatchObject({ enabled: true, mode: "playback" });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.toolbar).toEqual({ history: true, radar: true, theme: true, zoom: true });
  });

  it("keeps controls grouped by the approved product workflow", () => {
    expect(appSchema.panels.controls?.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Model",
      "Model Size",
      "Scratch Mask",
      "Surface Scratches",
      "Stickers",
      "Sticker Transform",
      "Presets",
      "Metal Color",
      "Metal Pattern",
      "Projection",
      "Offset",
      "Environment",
      "Background",
      "Image Export",
      "Video Export",
      "Export",
    ]);
    expect(getToolcraftControlOrderTargets(appSchema)).toEqual(
      expect.arrayContaining([
        "media.model",
        "model.scale",
        "view.orbit",
        "media.scratches",
        "surface.scratchDepth",
        "surface.scratchScale",
        "surface.scratchInvert",
        "media.stickers",
        "stickers.scale",
        "stickers.rotation",
        "shader.preset",
        "shader.colorBack",
        "shader.colorTint",
        "shader.repetition",
        "shader.offset",
        "lighting.environmentPreset",
        "media.environment",
        "lighting.environmentIntensity",
        "lighting.environmentRotation",
        "export.includeBackground",
        "appearance.background",
        "export.image.format",
        "export.image.resolution",
        "export.video.format",
        "export.video.resolution",
      ]),
    );
  });

  it("validates product acceptance and performance coverage", () => {
    expect(validateToolcraftAcceptanceCoverage()).toEqual([]);
    expect(appAcceptance.length).toBeGreaterThan(20);
    expect(appPerformance.scenarios.length).toBe(44);
    expect(appPerformance.workloadTargets).toEqual([
      "model.scale",
      "surface.scratchScale",
      "stickers.scale",
      "shader.scale",
      "export.image.resolution",
      "export.video.resolution",
    ]);
  });
});
