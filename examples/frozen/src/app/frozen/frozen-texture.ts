import * as THREE from "three";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

export const frozenScratchMaximumEdge = 2_048;

export type FrozenPreparedScratch = Readonly<{
  height: number;
  sourceId: string;
  sourceLabel: string;
  texture: THREE.DataTexture;
  width: number;
}>;

type DecodedImage = Readonly<{
  close: () => void;
  height: number;
  source: CanvasImageSource;
  width: number;
}>;

export function createFrozenLuminanceBytes(
  rgba: Uint8ClampedArray,
): Uint8Array {
  if (rgba.length % 4 !== 0) {
    throw new Error("Scratch image pixels must contain complete RGBA values.");
  }
  const luminance = new Uint8Array(rgba.length / 4);
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < rgba.length; sourceIndex += 4) {
    const alpha = rgba[sourceIndex + 3] / 255;
    const value =
      rgba[sourceIndex] * 0.2126 +
      rgba[sourceIndex + 1] * 0.7152 +
      rgba[sourceIndex + 2] * 0.0722;
    luminance[targetIndex] = Math.round(value * alpha);
    targetIndex += 1;
  }
  return luminance;
}

export function getFrozenScratchSize(
  width: number,
  height: number,
  maximumEdge = frozenScratchMaximumEdge,
): Readonly<{ height: number; width: number }> {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("The scratch image has invalid dimensions.");
  }
  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function loadHtmlImage(dataUrl: string): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      resolve({
        close: () => undefined,
        height: image.naturalHeight,
        source: image,
        width: image.naturalWidth,
      });
    };
    image.onerror = () => reject(new Error("Could not decode the scratch image."));
    image.src = dataUrl;
  });
}

async function decodeImage(asset: ToolcraftMediaAsset): Promise<DecodedImage> {
  if (typeof createImageBitmap !== "function") return loadHtmlImage(asset.dataUrl);
  const response = await fetch(asset.dataUrl);
  if (!response.ok && !/^(?:blob|data):/u.test(asset.dataUrl)) {
    throw new Error(`Could not read ${asset.fileName}.`);
  }
  const bitmap = await createImageBitmap(await response.blob());
  return {
    close: () => bitmap.close(),
    height: bitmap.height,
    source: bitmap,
    width: bitmap.width,
  };
}

export async function prepareFrozenScratchTexture(
  asset: ToolcraftMediaAsset,
): Promise<FrozenPreparedScratch> {
  const decoded = await decodeImage(asset);
  try {
    const size = getFrozenScratchSize(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not prepare a canvas for the scratch image.");
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    const pixels = context.getImageData(0, 0, size.width, size.height).data;
    const texture = new THREE.DataTexture(
      createFrozenLuminanceBytes(pixels),
      size.width,
      size.height,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return {
      ...size,
      sourceId: `${asset.id}:${asset.fileName}`,
      sourceLabel: asset.fileName,
      texture,
    };
  } finally {
    decoded.close();
  }
}

export function disposeFrozenScratch(scratch: FrozenPreparedScratch): void {
  scratch.texture.dispose();
}
