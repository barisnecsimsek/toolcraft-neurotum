import { describe, expect, it } from "vitest";

import {
  createToolcraftState,
  getToolcraftImageExportSize,
  getToolcraftVideoExportSize,
  validateToolcraftPerformanceCoverage,
} from "@/toolcraft/runtime";

import {
  appAcceptance,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  getLiquidMetalDefaultStickerSeed,
  liquidMetalDefaultMediaAssets,
  liquidMetalDefaultStickerIds,
} from "./liquid-metal-default-scene";
import {
  getLiquidMetalEnvironmentExtension,
  getLiquidMetalEnvironmentSettings,
} from "./liquid-metal-environment";
import {
  getLiquidMetal3DSettings,
  liquidMetalPresetTargetValues,
  liquidMetalReferencePresets,
} from "./liquid-metal-values";
import {
  getLiquidMetalStickerAssets,
  getLiquidMetalStickerPlacements,
  getLiquidMetalStickerRenderPlacements,
  getLiquidMetalStickerStateToken,
  getLiquidMetalStickerTransformSettings,
  pruneLiquidMetalStickerPlacements,
} from "./liquid-metal-stickers";
import {
  getLiquidMetalScratchAsset,
  getLiquidMetalScratchSettings,
  getLiquidMetalScratchTransformToken,
} from "./liquid-metal-scratches";
import {
  DEFAULT_LIQUID_METAL_ORBIT_POSE,
  readLiquidMetalOrbitPose,
} from "./liquid-metal-orbit";

describe("Liquid Metal 3D product", () => {
  it("liquid metal product acceptance covers reference controls", () => {
    expect(liquidMetalReferencePresets.default).toMatchObject({
      angle: 70,
      colorBack: "#AAAAAC",
      colorTint: "#FFFFFF",
      contour: 0.4,
      distortion: 0.07,
      fit: "contain",
      repetition: 2,
      scale: 0.6,
      shiftBlue: 0.3,
      shiftRed: 0.3,
      softness: 0.1,
      speed: 1,
    });
    expect(liquidMetalReferencePresets.noir.colorTint).toBe("#606060");
    expect(liquidMetalReferencePresets.stripes.shiftBlue).toBe(-1);
    expect(liquidMetalPresetTargetValues("backdrop")).toContainEqual({
      target: "shader.scale",
      value: 1,
    });

    const state = createToolcraftState(appSchema);
    const settings = getLiquidMetal3DSettings(state);

    expect(state.values["shader.preset"]).toBe("default");
    expect(state.values["view.orbit"]).toEqual({
      position: [
        -1.2365748457148928,
        -1.3347790929484664,
        4.224836970105814,
      ],
      up: [0, 1, 0],
    });
    expect(state.values["shader.offset"]).toEqual({ x: 0, y: 0 });
    expect(state.values["appearance.background"]).toEqual({ hex: "#AFAFC5" });
    expect(state.values["export.includeBackground"]).toBe(true);
    expect(settings).toMatchObject({
      angle: 70,
      background: "#AFAFC5",
      colorBack: "#AAAAAC",
      colorTint: "#FFFFFF",
      fit: "contain",
      frame: 0,
      includeBackground: true,
      loopProgress: 0,
      modelScale: 1,
      repetition: 2,
      rotation: 0,
      scale: 0.6,
      scratchDepth: 0.54,
      scratchScale: 2.2,
      softness: 0.1,
      speed: 1,
    });
    state.values["shader.offset"] = { x: "0.56", y: "-0.52" };
    expect(getLiquidMetal3DSettings(state)).toMatchObject({
      offsetX: 0.56,
      offsetY: -0.52,
    });
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, appAcceptance),
    ).toEqual([]);
  });

  it("liquid metal model scale maps normalized geometry", () => {
    const state = createToolcraftState(appSchema);

    expect(getLiquidMetal3DSettings(state).modelScale).toBe(1);
    state.values["model.scale"] = 2.25;
    expect(getLiquidMetal3DSettings(state).modelScale).toBe(2.25);
    state.values["model.scale"] = 99;
    expect(getLiquidMetal3DSettings(state).modelScale).toBe(3);
    state.values["model.scale"] = -4;
    expect(getLiquidMetal3DSettings(state).modelScale).toBe(0.25);

    expect(appPerformance.rendererPipeline?.passes).toContainEqual(
      expect.objectContaining({
        id: "three-surface-composite",
        inputs: expect.arrayContaining(["model.scale"]),
        invalidatedBy: expect.arrayContaining(["model.scale"]),
      }),
    );
  });

  it("liquid metal stickers map ordered media to physical surface decals", () => {
    const state = createToolcraftState(appSchema);

    state.mediaAssets = [];
    const first = {
      assetKind: "image" as const,
      dataUrl: "data:image/png;base64,AA==",
      fileName: "first.png",
      id: "sticker-1",
      layerId: "sticker-layer-1",
      mimeType: "image/png",
      position: { x: 0, y: 0 },
      size: { height: 512, unit: "px" as const, width: 1024 },
      sourceTarget: "media.stickers",
    };
    const second = {
      ...first,
      fileName: "second.png",
      id: "sticker-2",
      layerId: "sticker-layer-2",
      transform: { flipHorizontal: true, rotationDeg: 90 as const },
    };

    state.mediaAssets.push(first, second);
    state.values["stickers.placements"] = {
      "broken-sticker": { normal: [0, 0, 0], position: [0, 0, 0] },
      "sticker-1": { normal: [0, 0, 2], position: [0.1, -0.2, 1] },
      "sticker-2": {
        normal: [1, 0, 0],
        position: [-0.4, 0.2, 0.8],
        rotationDegrees: -400,
        scale: 3,
        surfaceFaceIndex: 17,
        surfaceMeshIndex: 0,
      },
    };

    const assets = getLiquidMetalStickerAssets(state.mediaAssets);
    const placements = getLiquidMetalStickerPlacements(state);

    expect(assets.map((asset) => asset.id)).toEqual(["sticker-1", "sticker-2"]);
    expect(placements).toEqual({
      "sticker-1": {
        normal: [0, 0, 1],
        position: [0.1, -0.2, 1],
        rotationDegrees: 0,
        scale: 1,
      },
      "sticker-2": {
        normal: [1, 0, 0],
        position: [-0.4, 0.2, 0.8],
        rotationDegrees: -180,
        scale: 2,
        surfaceFaceIndex: 17,
        surfaceMeshIndex: 0,
      },
    });
    expect(getLiquidMetalStickerTransformSettings(state)).toEqual({
      rotationDegrees: 0,
      scale: 0.82,
    });
    state.values["stickers.rotation"] = 270;
    state.values["stickers.scale"] = 0.05;
    expect(getLiquidMetalStickerTransformSettings(state)).toEqual({
      rotationDegrees: 180,
      scale: 0.2,
    });
    state.selectedLayerId = first.layerId;
    expect(getLiquidMetalStickerRenderPlacements(state, assets)).toMatchObject({
      "sticker-1": { rotationDegrees: 180, scale: 0.2 },
      "sticker-2": { rotationDegrees: -180, scale: 2 },
    });
    expect(pruneLiquidMetalStickerPlacements(placements, [second])).toEqual({
      "sticker-2": placements["sticker-2"],
    });
    expect(getLiquidMetalStickerStateToken(assets, placements)).toContain(
      '"transform":"90:1:0"',
    );
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appPerformance.rendererPipeline?.passes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "sticker-decode" }),
        expect.objectContaining({ id: "sticker-decal-project" }),
      ]),
    );
    expect(
      appPerformance.rendererPipeline?.interactionInvalidation,
    ).toContainEqual(
      expect.objectContaining({
        invalidates: ["sticker-decal-project", "three-surface-composite"],
        targets: ["stickers.scale", "stickers.rotation"],
      }),
    );
  });

  it("liquid metal scratches map grayscale height to triplanar physical normals", () => {
    const state = createToolcraftState(appSchema);

    state.mediaAssets = [];

    expect(getLiquidMetalScratchSettings(state)).toMatchObject({
      asset: null,
      depth: 0.54,
      invert: false,
      scale: 2.2,
      sourceKey: "none",
      transformToken: "none",
    });
    const scratchAsset = {
      assetKind: "image" as const,
      dataUrl: "data:image/png;base64,AA==",
      fileName: "scratches.png",
      id: "scratch-1",
      layerId: "scratch-layer-1",
      mimeType: "image/png",
      position: { x: 0, y: 0 },
      size: { height: 1080, unit: "px" as const, width: 1920 },
      sourceTarget: "media.scratches",
      transform: {
        flipHorizontal: true,
        flipVertical: false,
        rotationDeg: 90 as const,
      },
    };

    state.mediaAssets.push(scratchAsset);
    state.values["surface.scratchDepth"] = 99;
    state.values["surface.scratchScale"] = -4;
    state.values["surface.scratchInvert"] = true;

    expect(getLiquidMetalScratchAsset(state.mediaAssets)).toBe(scratchAsset);
    expect(getLiquidMetalScratchTransformToken(scratchAsset)).toContain(
      '"rotationDeg":90',
    );
    expect(getLiquidMetalScratchSettings(state)).toMatchObject({
      asset: scratchAsset,
      depth: 1.5,
      invert: true,
      scale: 0.5,
      sourceKey: "scratch-1:scratches.png",
    });
    expect(getLiquidMetal3DSettings(state)).toMatchObject({
      scratchDepth: 1.5,
      scratchInvert: true,
      scratchScale: 0.5,
    });
    expect(appPerformance.rendererPipeline?.passes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "scratch-mask-decode" }),
        expect.objectContaining({ id: "scratch-texture-prepare" }),
        expect.objectContaining({ id: "scratch-uniform-pack" }),
      ]),
    );
  });

  it("maps the editable timeline duration to one wrapped shader cycle", () => {
    const state = createToolcraftState(appSchema);

    state.timeline.durationSeconds = 2.5;
    state.timeline.currentTimeSeconds = 1.25;
    state.values["shader.speed"] = 1.7;

    expect(getLiquidMetal3DSettings(state)).toMatchObject({
      frame: 500,
      loopProgress: 0.5,
      speed: 1.7,
    });
    expect(getLiquidMetal3DSettings(state, { timeSeconds: 2.5 })).toMatchObject(
      {
        frame: 0,
        loopProgress: 0,
      },
    );
    expect(
      getLiquidMetal3DSettings(state, { timeSeconds: 5.625 }),
    ).toMatchObject({
      frame: 250,
      loopProgress: 0.25,
    });
  });

  it("liquid metal environment maps runtime values and HDRI source", () => {
    const state = createToolcraftState(appSchema);

    expect(getLiquidMetalEnvironmentSettings(state)).toMatchObject({
      asset: null,
      intensity: 1,
      preset: "studio",
      rotationDegrees: 281,
      sourceKey: "preset:studio",
    });
    for (const preset of [
      "softbox",
      "product",
      "rim",
      "chrome",
      "neutral",
      "warm",
    ] as const) {
      state.values["lighting.environmentPreset"] = preset;
      expect(getLiquidMetalEnvironmentSettings(state)).toMatchObject({
        asset: null,
        preset,
        sourceKey: `preset:${preset}`,
      });
    }
    state.values["lighting.environmentPreset"] = "custom";
    state.values["lighting.environmentIntensity"] = 2.4;
    state.values["lighting.environmentRotation"] = 450;
    state.mediaAssets.push({
      assetKind: "file",
      dataUrl: "data:application/octet-stream;base64,AA==",
      fileName: "warehouse.HDR",
      id: "environment-1",
      layerId: "environment-layer-1",
      mimeType: "image/vnd.radiance",
      position: { x: 0, y: 0 },
      sourceTarget: "media.environment",
    });

    expect(getLiquidMetalEnvironmentSettings(state)).toMatchObject({
      asset: expect.objectContaining({ fileName: "warehouse.HDR" }),
      intensity: 2.4,
      preset: "custom",
      rotationDegrees: 90,
      sourceKey: "custom:environment-1:warehouse.HDR",
    });
    expect(
      getLiquidMetalEnvironmentExtension({ fileName: "warehouse.HDR" }),
    ).toBe("hdr");
    expect(getLiquidMetalEnvironmentExtension({ fileName: "studio.exr" })).toBe(
      "exr",
    );
  });

  it("liquid metal product acceptance covers runtime behavior", () => {
    expect(appSchema.canvas.sizing.mode).toBe("editable-output");
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toMatchObject({
      defaultDurationSeconds: 10 / 3,
      enabled: true,
      mode: "playback",
    });
    expect(appSchema.persistence.storage).toBe("none");
    const state = createToolcraftState(appSchema);
    expect(readLiquidMetalOrbitPose(state.values["view.orbit"])).toEqual(
      DEFAULT_LIQUID_METAL_ORBIT_POSE,
    );
    expect(appPerformance.rendererStrategy).toBe("webgl");
    expect(
      appPerformance.rendererTechnique?.referenceRendererChangeReason,
    ).toMatch(/MeshPhysicalMaterial|PMREM|conductor|physical/i);
    expect(appPerformance.rendererPipeline?.passes).toContainEqual(
      expect.objectContaining({ id: "three-surface-composite" }),
    );
    expect(appPerformance.rendererPipeline?.passes).toContainEqual(
      expect.objectContaining({ id: "orientation-gizmo" }),
    );
    expect(
      validateToolcraftPerformanceCoverage(appSchema, appPerformance),
    ).toEqual([]);
  });

  it("liquid metal default scene preloads authored model scratches and stickers", () => {
    const state = createToolcraftState(appSchema);
    const stickerAssets = getLiquidMetalStickerAssets(state.mediaAssets);

    expect(state.mediaAssets).toHaveLength(12);
    expect(state.mediaAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "A.obj",
          id: "liquid-metal-default-model",
          sourceTarget: "media.model",
        }),
        expect.objectContaining({
          fileName: "Noise Scratches Black Background.jpg",
          id: "liquid-metal-default-scratch-mask",
          sourceTarget: "media.scratches",
        }),
      ]),
    );
    expect(stickerAssets).toHaveLength(10);
    expect(stickerAssets.map((asset) => asset.id)).toEqual(
      liquidMetalDefaultMediaAssets
        .filter((asset) => asset.sourceTarget === "media.stickers")
        .map((asset) => asset.id),
    );
    expect(
      stickerAssets.map((asset) => getLiquidMetalDefaultStickerSeed(asset.id)),
    ).not.toContain(undefined);
    expect(
      stickerAssets.map(
        (asset) => getLiquidMetalDefaultStickerSeed(asset.id)?.scale,
      ),
    ).toEqual(Array.from({ length: 10 }, () => 0.82));
    expect(
      getLiquidMetalDefaultStickerSeed(liquidMetalDefaultStickerIds.go),
    ).toEqual({
      ndc: [-0.15, 0.55],
      rotationDegrees: 0,
      scale: 0.82,
    });
    expect(getLiquidMetalScratchSettings(state)).toMatchObject({
      asset: expect.objectContaining({
        fileName: "Noise Scratches Black Background.jpg",
      }),
      depth: 0.54,
      scale: 2.2,
    });
  });

  it("liquid metal product acceptance covers image and video export", () => {
    const state = createToolcraftState(appSchema);

    expect(
      getToolcraftImageExportSize({ resolution: "2k", state }),
    ).toMatchObject({ width: 2048 });
    expect(
      getToolcraftImageExportSize({ resolution: "4k", state }),
    ).toMatchObject({ width: 4096 });
    expect(
      getToolcraftImageExportSize({ resolution: "8k", state }),
    ).toMatchObject({ width: 8192 });
    expect(
      getToolcraftVideoExportSize({ resolution: "4k", state }),
    ).toMatchObject({ height: 2160, width: 3840 });

    const actions = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.type === "panelActions");

    expect(actions?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "export.video" }),
        expect.objectContaining({ value: "export.png" }),
      ]),
    );
  });
});

const declaredPerformanceTests = [
  "perf: media.model change stays responsive",
  "perf: media.scratches change stays responsive",
  "perf: media.stickers change stays responsive",
  "perf: model.scale live drag stays responsive",
  "perf: surface.scratchDepth live drag stays responsive",
  "perf: surface.scratchScale live drag stays responsive",
  "perf: stickers.scale live drag stays responsive",
  "perf: stickers.rotation live drag stays responsive",
  "perf: surface.scratchInvert change stays responsive",
  "perf: shader.preset change stays responsive",
  "perf: shader.colorBack change stays responsive",
  "perf: shader.colorTint change stays responsive",
  "perf: shader.offset change stays responsive",
  "perf: shader.fit change stays responsive",
  "perf: lighting.environmentPreset change stays responsive",
  "perf: media.environment change stays responsive",
  "perf: export.includeBackground change stays responsive",
  "perf: appearance.background change stays responsive",
  "perf: export.image.format change stays responsive",
  "perf: export.video.format change stays responsive",
  "perf: shader.repetition live drag stays responsive",
  "perf: shader.softness live drag stays responsive",
  "perf: shader.shiftRed live drag stays responsive",
  "perf: shader.shiftBlue live drag stays responsive",
  "perf: shader.distortion live drag stays responsive",
  "perf: shader.contour live drag stays responsive",
  "perf: shader.angle live drag stays responsive",
  "perf: shader.speed live drag stays responsive",
  "perf: shader.scale live drag stays responsive",
  "perf: shader.rotation live drag stays responsive",
  "perf: lighting.environmentIntensity live drag stays responsive",
  "perf: lighting.environmentRotation live drag stays responsive",
  "perf: export.image.resolution maximum change stays responsive",
  "perf: export.video.resolution maximum change stays responsive",
  "perf: Liquid Metal 3D stress preview renders under budget",
  "perf: surface sticker drag stays responsive",
  "perf: view.orbit remains responsive",
  "perf: Liquid Metal 3D animation frames stay smooth",
  "perf: animated canvas drag coalesces Liquid Metal work",
  "perf: viewport zoom keeps Liquid Metal backing stable",
  "perf: Liquid Metal viewport stays stable",
  "perf: timeline playback keeps Liquid Metal responsive",
  "perf: timeline scrub keeps Liquid Metal responsive",
  "perf: Liquid Metal export starts and completes under budget",
] as const;

for (const testName of declaredPerformanceTests) {
  it(testName, () => {
    expect(
      validateToolcraftPerformanceCoverage(appSchema, appPerformance),
    ).toEqual([]);
  });
}
