import { expect, test } from "vitest";

import {
  createToolcraftPersistenceSnapshot,
  createToolcraftState,
  getToolcraftImageExportSize,
  parseToolcraftPersistenceSnapshot,
  type ToolcraftInitialState,
  type ToolcraftMediaAsset,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import {
  applyFrozenIceMaterial,
  createFrozenIceMaterial,
} from "./frozen/frozen-material";
import {
  createFrozenDefaultSceneAssetUrl,
  frozenDefaultSceneValues,
} from "./frozen/frozen-default-scene";
import { getFrozenBoundary, getRetainedIceMaskAtHeight } from "./frozen/frozen-math";
import {
  disposeFrozenModel,
  frozenCrystalSampleLimit,
  frozenIcicleSampleLimit,
  getFrozenCrystalSampleCount,
  getFrozenIcicleSampleCount,
  loadFrozenModel,
} from "./frozen/frozen-model";
import {
  getFrozenModelTriangleBudget,
  getFrozenSceneSettings,
  getFrozenSettingsToken,
} from "./frozen/frozen-values";

const tetrahedronObj = [
  "v 0 1 0",
  "v -1 -1 1",
  "v 1 -1 1",
  "v 0 -1 -1",
  "f 1 2 3",
  "f 1 3 4",
  "f 1 4 2",
  "f 2 4 3",
].join("\n");

function modelAsset(): ToolcraftMediaAsset {
  return {
    assetKind: "file",
    dataUrl: `data:text/plain,${encodeURIComponent(tetrahedronObj)}`,
    fileName: "asymmetric-tetrahedron.obj",
    id: "model-fixture",
    layerId: "model-fixture-layer",
    mimeType: "text/plain",
    position: { x: 0, y: 0 },
    sourceTarget: "source.model",
  };
}

function scratchAsset(): ToolcraftMediaAsset {
  return {
    assetKind: "file",
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    fileName: "scratch-map.png",
    id: "scratch-fixture",
    layerId: "scratch-fixture-layer",
    mimeType: "image/png",
    position: { x: 0, y: 0 },
    sourceTarget: "source.scratchTexture",
  };
}

function stateWith(
  values: Readonly<Record<string, unknown>> = {},
  initial: ToolcraftInitialState = {},
): ToolcraftState {
  const state = createToolcraftState(appSchema, initial);
  return { ...state, values: { ...state.values, ...values } };
}

function settingsWith(target: string, value: unknown) {
  return getFrozenSceneSettings(stateWith({ [target]: value }));
}

test("source.modelTriangleBudget changes frozen product output", () => {
  expect(getFrozenModelTriangleBudget(stateWith())).toBe(30_000);
  expect(
    getFrozenModelTriangleBudget(
      stateWith({ "source.modelTriangleBudget": 30_000 }),
    ),
  ).toBe(30_000);
  expect(
    getFrozenModelTriangleBudget(
      stateWith({ "source.modelTriangleBudget": 6_499 }),
    ),
  ).toBe(6_499);
});

function controlOptions(target: string): readonly unknown[] {
  for (const section of appSchema.panels.controls?.sections ?? []) {
    for (const control of Object.values(section.controls)) {
      if (control.target === target && "options" in control) return control.options ?? [];
    }
  }
  return [];
}

test("source model upload clear and reset drive the WebGL scene", async () => {
  const asset = modelAsset();
  const prepared = await loadFrozenModel(asset);
  expect(prepared.triangleCount).toBe(4);
  expect(prepared.surfaceArea).toBeGreaterThan(0);
  expect(prepared.crystalSamples.positions).toHaveLength(
    getFrozenCrystalSampleCount(prepared.surfaceArea) * 3,
  );
  expect(prepared.icicleSamples.positions).toHaveLength(
    getFrozenIcicleSampleCount(prepared.surfaceArea) * 3,
  );
  expect(prepared.crystalSamples.positions.length / 3).toBeGreaterThan(4_000);
  expect(prepared.icicleSamples.positions.length / 3).toBeGreaterThan(100);
  expect(createToolcraftState(appSchema).mediaAssets).toEqual([
    expect.objectContaining({
      fileName: "Night King optimized 28k.zip",
      sourceTarget: "source.model",
    }),
    expect.objectContaining({
      fileName: "Black Painted Wall Texture.jpg",
      sourceTarget: "source.scratchTexture",
    }),
  ]);
  disposeFrozenModel(prepared);
});

test("default scene matches the supplied Frozen settings", () => {
  const state = createToolcraftState(appSchema);
  for (const [target, defaultValue] of Object.entries(frozenDefaultSceneValues)) {
    expect(state.values[target], target).toEqual(defaultValue);
  }
});

test("default scene assets follow the configured public base path", () => {
  expect(
    createFrozenDefaultSceneAssetUrl(
      "/demos/frozen/",
      "night-king-optimized-28k.zip",
    ),
  ).toBe(
    "/demos/frozen/frozen/default-scene/night-king-optimized-28k.zip",
  );
  expect(
    createFrozenDefaultSceneAssetUrl(
      "/demos/frozen/",
      "black-painted-wall-texture.jpg",
    ),
  ).toBe(
    "/demos/frozen/frozen/default-scene/black-painted-wall-texture.jpg",
  );
});

test("source scratch texture drives retained triplanar relief", () => {
  const asset = scratchAsset();
  const state = createToolcraftState(appSchema, { mediaAssets: [asset] });
  const scratchControl = appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((control) => control.target === "source.scratchTexture");
  expect(state.mediaAssets).toContainEqual(asset);
  expect(scratchControl).toMatchObject({ assetKind: "file", type: "fileDrop" });
  expect(String(scratchControl?.accept)).toContain("image/png");
  expect(String(scratchControl?.accept)).toContain("image/jpeg");
  expect(String(scratchControl?.accept)).toContain("image/webp");
});

test("orientation pose changes rendered model and undo resets it", () => {
  const initial = getFrozenSceneSettings(stateWith());
  const rotated = settingsWith("scene.orientation", {
    position: [4, 1, 2],
    up: [0, 1, 0],
  });
  expect(rotated.viewport.orientation).not.toEqual(initial.viewport.orientation);
  expect(getFrozenSettingsToken(rotated)).not.toBe(getFrozenSettingsToken(initial));
  expect(settingsWith("scene.orientation", undefined).viewport.orientation).toEqual(
    initial.viewport.orientation,
  );
});

test("effect.progress changes frozen product output", () => {
  const bounds = { bounds: { maxY: 1.3, minY: -1.3 } };
  const frozen = getFrozenBoundary(bounds, settingsWith("effect.progress", 0));
  const partial = getFrozenBoundary(bounds, settingsWith("effect.progress", 50));
  const thawed = getFrozenBoundary(bounds, settingsWith("effect.progress", 100));
  expect(getRetainedIceMaskAtHeight(1.3, 0.5, frozen)).toBe(1);
  expect(getRetainedIceMaskAtHeight(1.1, 0.5, partial)).toBe(0);
  expect(getRetainedIceMaskAtHeight(-1.1, 0.5, partial)).toBe(1);
  expect(getRetainedIceMaskAtHeight(-1.3, 0.5, thawed)).toBe(0);
});

test("effect.transition changes frozen product output", () => {
  const model = { bounds: { maxY: 1, minY: -1 } };
  const narrow = getFrozenBoundary(model, settingsWith("effect.transition", 1));
  const wide = getFrozenBoundary(model, settingsWith("effect.transition", 30));
  expect(wide.halfBand).toBeGreaterThan(narrow.halfBand);
});

test("effect.noiseScale changes frozen product output", () => {
  expect(settingsWith("effect.noiseScale", 0.5).mask.noiseScale).toBe(0.5);
  expect(settingsWith("effect.noiseScale", 8).mask.noiseScale).toBe(8);
});

test("effect.turbulence changes frozen product output", () => {
  const model = { bounds: { maxY: 1, minY: -1 } };
  const calm = getFrozenBoundary(model, settingsWith("effect.turbulence", 0));
  const rough = getFrozenBoundary(model, settingsWith("effect.turbulence", 40));
  expect(calm.noiseAmplitude).toBe(0);
  expect(rough.noiseAmplitude).toBeCloseTo(0.8);
});

test("ice.shellThickness changes frozen product output", () => {
  expect(settingsWith("ice.shellThickness", 0).surface.shellThickness).toBe(0);
  expect(settingsWith("ice.shellThickness", 12).surface.shellThickness).toBe(0.12);
});

test("ice.crystalDensity changes frozen product output", () => {
  expect(getFrozenSceneSettings(stateWith()).crystals.density).toBe(0.98);
  expect(settingsWith("ice.crystalDensity", 0).crystals.density).toBe(0);
  expect(settingsWith("ice.crystalDensity", 100).crystals.density).toBe(1);
});

test("ice.icicleDensity changes frozen product output", () => {
  expect(settingsWith("ice.icicleDensity", 0).icicles.density).toBe(0);
  expect(settingsWith("ice.icicleDensity", 1).icicles.density).toBe(0.01);
  expect(settingsWith("ice.icicleDensity", 100).icicles.density).toBe(1);
});

test("geometry-relative coverage sample pools are dense and bounded", () => {
  expect(getFrozenCrystalSampleCount(0.001)).toBeGreaterThan(4_000);
  expect(getFrozenCrystalSampleCount(1_000)).toBe(frozenCrystalSampleLimit);
  expect(getFrozenIcicleSampleCount(0.001)).toBeGreaterThan(100);
  expect(getFrozenIcicleSampleCount(1_000)).toBe(frozenIcicleSampleLimit);
});

test("ice.icicleLength changes frozen product output", () => {
  expect(settingsWith("ice.icicleLength", 0).icicles.length).toBe(0);
  expect(settingsWith("ice.icicleLength", 100).icicles.length).toBe(1);
});

test("ice.color changes frozen product output", () => {
  expect(settingsWith("ice.color", "#2455FF").surface.color).toBe("#2455FF");
});

test("ice.transmission changes frozen product output", () => {
  expect(settingsWith("ice.transmission", 0).surface.transmission).toBe(0);
  expect(settingsWith("ice.transmission", 100).surface.transmission).toBe(1);
});

test("physical ice material uses volumetric PBR transmission", async () => {
  const model = await loadFrozenModel(modelAsset());
  const material = createFrozenIceMaterial();
  try {
    const settings = getFrozenSceneSettings(
      stateWith({
        "ice.color": "#8FDFFF",
        "ice.ior": 1.45,
        "ice.shellThickness": 6,
        "ice.transmission": 90,
      }),
    );
    applyFrozenIceMaterial(material, model, settings, null);
    expect(material.transmission).toBeCloseTo(0.9);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
    expect(material.ior).toBeCloseTo(1.45);
    expect(material.thickness).toBeGreaterThan(0);
    expect(material.attenuationDistance).toBeCloseTo(1.35);
    expect(material.attenuationColor.getHexString()).toBe("8fdfff");
  } finally {
    material.dispose();
    disposeFrozenModel(model);
  }
});

test("ice.roughness changes frozen product output", () => {
  expect(settingsWith("ice.roughness", 0).surface.roughness).toBe(0);
  expect(settingsWith("ice.roughness", 100).surface.roughness).toBe(1);
});

test("background inclusion controls preview and PNG transparency", () => {
  expect(settingsWith("export.includeBackground", true).background.include).toBe(true);
  expect(settingsWith("export.includeBackground", false).background.include).toBe(false);
});

test("scene.background changes frozen product output", () => {
  expect(settingsWith("scene.background", "#CC2200").background.color).toBe("#CC2200");
});

test("physical ice parameters preserve Blender-scale values", () => {
  expect(settingsWith("ice.ior", 1.45).surface.ior).toBe(1.45);
  expect(settingsWith("ice.roughnessVariation", 38).surface.roughnessVariation).toBe(
    0.38,
  );
});

test("two-material Voronoi mask preserves exact clear and frost endpoints", () => {
  expect(settingsWith("ice.materialMaskCoverage", 0).materialMask.coverage).toBe(0);
  expect(settingsWith("ice.materialMaskCoverage", 100).materialMask.coverage).toBe(1);
  const settings = getFrozenSceneSettings(
    stateWith({
      "ice.materialMaskDistortion": 75,
      "ice.materialMaskScale": 12.5,
      "ice.materialMaskSeed": 83,
      "ice.materialMaskSoftness": 24,
    }),
  );
  expect(settings.materialMask).toMatchObject({
    distortion: 0.75,
    scale: 12.5,
    seed: 83,
    softness: 0.24,
  });
});

test("scratch controls map to UV-independent relief settings", () => {
  const settings = getFrozenSceneSettings(
    stateWith({
      "scratch.bump": 64,
      "scratch.contrast": 180,
      "scratch.displacement": 10,
      "scratch.invert": true,
      "scratch.offset": { x: 0.25, y: -0.5 },
      "scratch.rotation": 90,
      "scratch.scale": 72,
    }),
  );
  expect(settings.scratch).toMatchObject({
    bump: 0.64,
    contrast: 1.8,
    displacement: 0.1,
    invert: true,
    offset: { x: 0.25, y: -0.5 },
    scale: 72,
  });
  expect(settings.scratch.rotation).toBeCloseTo(Math.PI / 2);
});

test("scratch offset consumes Toolcraft vector string coordinates", () => {
  expect(
    settingsWith("scratch.offset", { x: "0.50", y: "-0.25" }).scratch.offset,
  ).toEqual({ x: 0.5, y: -0.25 });
});

test("HDR lighting and x2 preview settings are bounded", () => {
  const settings = getFrozenSceneSettings(
    stateWith({
      "canvas.renderScale": 2,
      "lighting.environmentIntensity": 150,
      "lighting.environmentRotation": 180,
      "lighting.exposure": 125,
    }),
  );
  expect(settings.viewport.renderScale).toBe(2);
  expect(settings.lighting).toMatchObject({
    environmentIntensity: 1.5,
    exposure: 1.25,
  });
  expect(settings.lighting.environmentRotation).toBeCloseTo(Math.PI);
});

const rendererSettingCases = [
  ["ice.crystalSize", 0],
  ["ice.crystalElongation", 100],
  ["ice.crystalVariation", 0],
  ["ice.icicleRadius", 0],
  ["ice.icicleVariation", 0],
  ["ice.icicleUnderside", 0],
  ["ice.ior", 2],
  ["ice.roughnessVariation", 0],
  ["ice.materialMaskCoverage", 0],
  ["ice.materialMaskScale", 12],
  ["ice.materialMaskSoftness", 0],
  ["ice.materialMaskDistortion", 0],
  ["ice.materialMaskSeed", 83],
  ["scratch.scale", 10],
  ["scratch.rotation", 45],
  ["scratch.contrast", 200],
  ["scratch.displacement", 0],
  ["scratch.bump", 0],
  ["scratch.roughness", 100],
  ["lighting.environmentIntensity", 0],
  ["lighting.environmentRotation", 180],
  ["lighting.exposure", 50],
  ["scratch.invert", true],
  ["scratch.offset", { x: "0.5", y: "-0.5" }],
] as const;

for (const [target, value] of rendererSettingCases) {
  test(`${target} changes frozen product output`, () => {
    const baseline = getFrozenSettingsToken(getFrozenSceneSettings(stateWith()));
    const changed = getFrozenSettingsToken(settingsWith(target, value));
    expect(changed).not.toBe(baseline);
  });
}

test("image export format selects PNG or JPG", () => {
  expect(controlOptions("export.image.format")).toEqual([
    expect.objectContaining({ value: "png" }),
    expect.objectContaining({ value: "jpg" }),
  ]);
});

test("image export resolution changes exported dimensions", () => {
  const state = stateWith();
  expect(getToolcraftImageExportSize({ resolution: "2k", state }).width).toBe(2048);
  expect(getToolcraftImageExportSize({ resolution: "4k", state }).width).toBe(4096);
  expect(getToolcraftImageExportSize({ resolution: "8k", state }).width).toBe(8192);
});

test("export PNG produces frozen product image bytes", () => {
  const state = stateWith({ "export.image.resolution": "4k" });
  const size = getToolcraftImageExportSize({
    resolution: String(state.values["export.image.resolution"]),
    state,
  });
  const action = appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((control) => control.target === "actions.output");
  expect(action).toMatchObject({
    actions: [expect.objectContaining({ value: "export.png" })],
    type: "panelActions",
  });
  expect(size).toMatchObject({ height: 2304, width: 4096 });
});

test("frozen settings restore after browser reload", () => {
  const asset = modelAsset();
  const state = stateWith(
    { "effect.progress": 67, "ice.color": "#44AAFF" },
    { mediaAssets: [asset] },
  );
  const snapshot = createToolcraftPersistenceSnapshot(state, appSchema.persistence);
  const restored = parseToolcraftPersistenceSnapshot(
    appSchema,
    JSON.stringify(snapshot),
  );
  expect(restored?.values).toMatchObject({
    "effect.progress": 67,
    "ice.color": "#44AAFF",
  });
  expect(restored?.mediaAssets).toEqual([asset]);
});
