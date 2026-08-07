import type { ToolcraftDefaultMediaAssetSchema } from "@/toolcraft/runtime";

const assetRoot = `${import.meta.env.BASE_URL}assets/liquid-metal-default`;

export const liquidMetalDefaultStickerIds = {
  blueFlower: "liquid-metal-default-sticker-blue-flower",
  clickClub: "liquid-metal-default-sticker-click-club",
  fastMode: "liquid-metal-default-sticker-fast-mode",
  go: "liquid-metal-default-sticker-go",
  keepItMoving: "liquid-metal-default-sticker-keep-it-moving",
  pizza: "liquid-metal-default-sticker-pizza",
  playLoud: "liquid-metal-default-sticker-play-loud",
  stickIt: "liquid-metal-default-sticker-stick-it",
  wow: "liquid-metal-default-sticker-wow",
  yellowSmileStar: "liquid-metal-default-sticker-yellow-smile-star",
} as const;

const defaultModel: ToolcraftDefaultMediaAssetSchema = {
  assetKind: "file",
  dataUrl: `${assetRoot}/A.obj`,
  fileName: "A.obj",
  id: "liquid-metal-default-model",
  layerId: "liquid-metal-default-model-layer",
  layerName: "A",
  mimeType: "text/plain",
  sourceTarget: "media.model",
};

const defaultScratchMask: ToolcraftDefaultMediaAssetSchema = {
  assetKind: "image",
  dataUrl: `${assetRoot}/noise-scratches-black-background.jpg`,
  fileName: "Noise Scratches Black Background.jpg",
  id: "liquid-metal-default-scratch-mask",
  layerId: "liquid-metal-default-scratch-mask-layer",
  layerName: "Brushed scratches",
  mimeType: "image/jpeg",
  size: { height: 3000, unit: "px", width: 5250 },
  sourceTarget: "media.scratches",
};

const defaultStickers: readonly ToolcraftDefaultMediaAssetSchema[] = [
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/12_yellow_smile_star.png`,
    fileName: "12_yellow_smile_star.png",
    id: liquidMetalDefaultStickerIds.yellowSmileStar,
    layerId: "liquid-metal-default-sticker-yellow-smile-star-layer",
    layerName: "Yellow smile star",
    mimeType: "image/png",
    size: { height: 544, unit: "px", width: 552 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/04_click_club.png`,
    fileName: "04_click_club.png",
    id: liquidMetalDefaultStickerIds.clickClub,
    layerId: "liquid-metal-default-sticker-click-club-layer",
    layerName: "Click club",
    mimeType: "image/png",
    size: { height: 868, unit: "px", width: 900 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/37_pizza.png`,
    fileName: "37_pizza.png",
    id: liquidMetalDefaultStickerIds.pizza,
    layerId: "liquid-metal-default-sticker-pizza-layer",
    layerName: "Pizza",
    mimeType: "image/png",
    size: { height: 912, unit: "px", width: 784 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/08_fast_mode.png`,
    fileName: "08_fast_mode.png",
    id: liquidMetalDefaultStickerIds.fastMode,
    layerId: "liquid-metal-default-sticker-fast-mode-layer",
    layerName: "Fast mode",
    mimeType: "image/png",
    size: { height: 840, unit: "px", width: 1132 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/19_keep_it_moving.png`,
    fileName: "19_keep_it_moving.png",
    id: liquidMetalDefaultStickerIds.keepItMoving,
    layerId: "liquid-metal-default-sticker-keep-it-moving-layer",
    layerName: "Keep it moving",
    mimeType: "image/png",
    size: { height: 620, unit: "px", width: 840 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/06_wow.png`,
    fileName: "06_wow.png",
    id: liquidMetalDefaultStickerIds.wow,
    layerId: "liquid-metal-default-sticker-wow-layer",
    layerName: "Wow",
    mimeType: "image/png",
    size: { height: 788, unit: "px", width: 1152 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/33_play_loud.png`,
    fileName: "33_play_loud.png",
    id: liquidMetalDefaultStickerIds.playLoud,
    layerId: "liquid-metal-default-sticker-play-loud-layer",
    layerName: "Play loud",
    mimeType: "image/png",
    size: { height: 1016, unit: "px", width: 1408 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/14_go.png`,
    fileName: "14_go.png",
    id: liquidMetalDefaultStickerIds.go,
    layerId: "liquid-metal-default-sticker-go-layer",
    layerName: "Go",
    mimeType: "image/png",
    size: { height: 596, unit: "px", width: 744 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/50_blue_flower.png`,
    fileName: "50_blue_flower.png",
    id: liquidMetalDefaultStickerIds.blueFlower,
    layerId: "liquid-metal-default-sticker-blue-flower-layer",
    layerName: "Blue flower",
    mimeType: "image/png",
    size: { height: 608, unit: "px", width: 600 },
    sourceTarget: "media.stickers",
  },
  {
    assetKind: "image",
    dataUrl: `${assetRoot}/15_stick_it.png`,
    fileName: "15_stick_it.png",
    id: liquidMetalDefaultStickerIds.stickIt,
    layerId: "liquid-metal-default-sticker-stick-it-layer",
    layerName: "Stick it",
    mimeType: "image/png",
    size: { height: 780, unit: "px", width: 892 },
    sourceTarget: "media.stickers",
  },
];

export const liquidMetalDefaultMediaAssets = [
  defaultModel,
  defaultScratchMask,
  ...defaultStickers,
] satisfies readonly ToolcraftDefaultMediaAssetSchema[];

/**
 * Raycast seeds in normalized device coordinates, reconstructed from the
 * authored reference frame. The normal sticker placement map remains the
 * source of truth after the first projection, so every sticker stays editable.
 */
export type LiquidMetalDefaultStickerSeed = {
  ndc: readonly [x: number, y: number];
  rotationDegrees: number;
  scale: number;
};

const authoredDefaultStickerScale = 0.82;

const liquidMetalDefaultStickerSeeds: Readonly<
  Record<string, LiquidMetalDefaultStickerSeed>
> = {
  [liquidMetalDefaultStickerIds.blueFlower]: {
    ndc: [0.2, 0.19],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.clickClub]: {
    ndc: [-0.34, -0.25],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.fastMode]: {
    ndc: [-0.23, -0.54],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.go]: {
    ndc: [-0.15, 0.55],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.keepItMoving]: {
    ndc: [-0.11, -0.07],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.pizza]: {
    ndc: [-0.37, -0.56],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.playLoud]: {
    ndc: [-0.13, 0.26],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.stickIt]: {
    ndc: [0.07, -0.33],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.wow]: {
    ndc: [-0.28, 0.05],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
  [liquidMetalDefaultStickerIds.yellowSmileStar]: {
    ndc: [-0.07, 0.03],
    rotationDegrees: 0,
    scale: authoredDefaultStickerScale,
  },
};

export function getLiquidMetalDefaultStickerSeed(
  assetId: string,
): LiquidMetalDefaultStickerSeed | undefined {
  return liquidMetalDefaultStickerSeeds[assetId];
}
