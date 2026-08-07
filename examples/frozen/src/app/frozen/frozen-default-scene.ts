import type { ToolcraftDefaultMediaAssetSchema } from "@/toolcraft/runtime";

export function createFrozenDefaultSceneAssetUrl(
  baseUrl: string,
  fileName: string,
): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}frozen/default-scene/${fileName}`;
}

const modelPackageUrl = createFrozenDefaultSceneAssetUrl(
  import.meta.env.BASE_URL,
  "night-king-optimized-28k.zip",
);
const scratchTextureUrl = createFrozenDefaultSceneAssetUrl(
  import.meta.env.BASE_URL,
  "black-painted-wall-texture.jpg",
);

export const frozenDefaultSceneValues = {
  "canvas.renderScale": 1,
  "effect.noiseScale": 4,
  "effect.progress": 20,
  "effect.transition": 7,
  "effect.turbulence": 30,
  "export.image.format": "png",
  "export.image.resolution": "4k",
  "export.includeBackground": true,
  "ice.color": "#C5EFFF",
  "ice.crystalDensity": 98,
  "ice.crystalElongation": 29,
  "ice.crystalSize": 25,
  "ice.crystalVariation": 75,
  "ice.icicleDensity": 12,
  "ice.icicleLength": 13,
  "ice.icicleRadius": 31,
  "ice.icicleUnderside": 92,
  "ice.icicleVariation": 87,
  "ice.ior": 1.34,
  "ice.materialMaskCoverage": 67,
  "ice.materialMaskDistortion": 34,
  "ice.materialMaskScale": 5.8,
  "ice.materialMaskSeed": 36,
  "ice.materialMaskSoftness": 40,
  "ice.roughness": 38,
  "ice.roughnessVariation": 92,
  "ice.shellThickness": 9.75,
  "ice.transmission": 93,
  "lighting.environmentIntensity": 136,
  "lighting.environmentRotation": 33,
  "lighting.exposure": 105,
  "melt.enabled": true,
  "melt.heat": 77,
  "melt.radius": 16,
  "melt.refreeze": 56,
  "melt.refreezeMode": "after-release",
  "melt.structure": 83,
  "scene.background": "#242C32",
  "scene.orientation": {
    position: [
      4.436554836261477,
      -1.5168098929019802,
      -1.736740894214099,
    ],
    up: [
      0.17300486101933185,
      0.9835060743158414,
      -0.05277423469387755,
    ],
  },
  "scratch.bump": 5,
  "scratch.contrast": 115,
  "scratch.displacement": 10,
  "scratch.invert": false,
  "scratch.offset": { x: "-0.53", y: "-0.14" },
  "scratch.rotation": -39,
  "scratch.roughness": 55,
  "scratch.scale": 52,
  "source.imageBevel": 16,
  "source.imageCornerRadius": 18,
  "source.imageThickness": 18,
  "source.mode": "model",
  "source.modelExposure": -1.1,
  "source.modelTriangleBudget": 30_000,
} as const;

export const frozenDefaultMediaAssets = [
  {
    assetKind: "file",
    dataUrl: modelPackageUrl,
    fileName: "Night King optimized 28k.zip",
    id: "frozen-default-night-king",
    mimeType: "application/zip",
    sourceTarget: "source.model",
  },
  {
    assetKind: "file",
    dataUrl: scratchTextureUrl,
    fileName: "Black Painted Wall Texture.jpg",
    id: "frozen-default-scratch-texture",
    mimeType: "image/jpeg",
    sourceTarget: "source.scratchTexture",
  },
] satisfies readonly ToolcraftDefaultMediaAssetSchema[];
