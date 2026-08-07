import * as THREE from "three";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import {
  prepareFrozenObject,
  type FrozenPreparedModel,
} from "./frozen-model";

export const frozenSourceImageMaximumEdge = 2_048;

export type FrozenPreparedImage = Readonly<{
  height: number;
  sourceId: string;
  sourceLabel: string;
  texture: THREE.Texture;
  width: number;
}>;

export type FrozenImageGeometrySettings = Readonly<{
  bevel: number;
  cornerRadius: number;
  thickness: number;
}>;

export type FrozenImageSlabGeometry = Readonly<{
  aspect: number;
  bevel: number;
  bevelRadius: number;
  cornerRadius: number;
  cornerRoundness: number;
  depth: number;
  height: number;
  thickness: number;
  width: number;
}>;

type DecodedImage = Readonly<{
  close: () => void;
  height: number;
  source: CanvasImageSource;
  width: number;
}>;

function clampUnit(value: number): number {
  return THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

export function getFrozenSourceImageSize(
  width: number,
  height: number,
  maximumEdge = frozenSourceImageMaximumEdge,
): Readonly<{ height: number; width: number }> {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("The source image has invalid dimensions.");
  }
  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

export function getFrozenImageSlabGeometry(
  imageWidth: number,
  imageHeight: number,
  settings: FrozenImageGeometrySettings,
): FrozenImageSlabGeometry {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    throw new Error("The source image has invalid dimensions.");
  }
  const aspect = imageWidth / imageHeight;
  const width = aspect >= 1 ? 2 : 2 * aspect;
  const height = aspect >= 1 ? 2 / aspect : 2;
  const shortFace = Math.min(width, height);
  const thickness = clampUnit(settings.thickness);
  const bevel = clampUnit(settings.bevel);
  const cornerRoundness = clampUnit(settings.cornerRadius);
  const depth = shortFace * THREE.MathUtils.lerp(0.04, 0.62, thickness);
  const maximumRadius = Math.min(width, height, depth) * 0.5 * 0.96;
  return {
    aspect,
    bevel,
    bevelRadius: maximumRadius * bevel,
    cornerRadius: shortFace * 0.5 * 0.995 * cornerRoundness,
    cornerRoundness,
    depth,
    height,
    thickness,
    width,
  };
}

function createRoundedRectangleShape(
  width: number,
  height: number,
  radius: number,
): THREE.Shape {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const safeRadius = THREE.MathUtils.clamp(
    radius,
    0,
    Math.min(halfWidth, halfHeight) * 0.999,
  );
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + safeRadius, -halfHeight);
  shape.lineTo(halfWidth - safeRadius, -halfHeight);
  shape.quadraticCurveTo(
    halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight + safeRadius,
  );
  shape.lineTo(halfWidth, halfHeight - safeRadius);
  shape.quadraticCurveTo(
    halfWidth,
    halfHeight,
    halfWidth - safeRadius,
    halfHeight,
  );
  shape.lineTo(-halfWidth + safeRadius, halfHeight);
  shape.quadraticCurveTo(
    -halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight - safeRadius,
  );
  shape.lineTo(-halfWidth, -halfHeight + safeRadius);
  shape.quadraticCurveTo(
    -halfWidth,
    -halfHeight,
    -halfWidth + safeRadius,
    -halfHeight,
  );
  return shape;
}

export function createFrozenImageCardGeometry(
  slab: FrozenImageSlabGeometry,
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(
    createRoundedRectangleShape(slab.width, slab.height, slab.cornerRadius),
    {
      bevelEnabled: slab.bevelRadius > 0.000_001,
      bevelSegments: 3,
      bevelSize: slab.bevelRadius,
      bevelThickness: Math.min(slab.bevelRadius, slab.depth * 0.48),
      curveSegments: 8,
      depth: slab.depth,
      steps: 1,
    },
  );
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) throw new Error("Could not measure the rounded image geometry.");
  const size = bounds.getSize(new THREE.Vector3());
  geometry.scale(
    slab.width / Math.max(size.x, Number.EPSILON),
    slab.height / Math.max(size.y, Number.EPSILON),
    slab.depth / Math.max(size.z, Number.EPSILON),
  );
  geometry.center();

  const positions = geometry.getAttribute("position");
  const uv = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    uv[index * 2] = THREE.MathUtils.clamp(
      positions.getX(index) / slab.width + 0.5,
      0,
      1,
    );
    uv[index * 2 + 1] = THREE.MathUtils.clamp(
      positions.getY(index) / slab.height + 0.5,
      0,
      1,
    );
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function loadHtmlImage(dataUrl: string): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () =>
      resolve({
        close: () => undefined,
        height: image.naturalHeight,
        source: image,
        width: image.naturalWidth,
      });
    image.onerror = () => reject(new Error("Could not decode the source image."));
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

function normalizedRotation(asset: ToolcraftMediaAsset): 0 | 90 | 180 | 270 {
  const rotation = asset.transform?.rotationDeg ?? 0;
  return rotation === 90 || rotation === 180 || rotation === 270 ? rotation : 0;
}

export async function prepareFrozenSourceImage(
  asset: ToolcraftMediaAsset,
): Promise<FrozenPreparedImage> {
  const decoded = await decodeImage(asset);
  try {
    const size = getFrozenSourceImageSize(decoded.width, decoded.height);
    const rotation = normalizedRotation(asset);
    const swapsAxes = rotation === 90 || rotation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swapsAxes ? size.height : size.width;
    canvas.height = swapsAxes ? size.width : size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare a canvas for the source image.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(THREE.MathUtils.degToRad(rotation));
    context.scale(
      asset.transform?.flipHorizontal ? -1 : 1,
      asset.transform?.flipVertical ? -1 : 1,
    );
    context.drawImage(
      decoded.source,
      -size.width / 2,
      -size.height / 2,
      size.width,
      size.height,
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.userData.frozenSharedSource = true;
    texture.needsUpdate = true;
    const transformToken = JSON.stringify(asset.transform ?? {});
    return {
      height: canvas.height,
      sourceId: `${asset.id}:${asset.fileName}:${transformToken}`,
      sourceLabel: asset.fileName,
      texture,
      width: canvas.width,
    };
  } finally {
    decoded.close();
  }
}

export function createFrozenImageModel(
  image: FrozenPreparedImage,
  settings: FrozenImageGeometrySettings,
): FrozenPreparedModel {
  const slab = getFrozenImageSlabGeometry(image.width, image.height, settings);
  const geometry = createFrozenImageCardGeometry(slab);
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: "#263B49",
    envMapIntensity: 1,
    metalness: 0.02,
    roughness: 0.32,
  });
  const imageMaterial = new THREE.MeshBasicMaterial({
    alphaTest: 0.01,
    map: image.texture,
    toneMapped: false,
    transparent: true,
  });
  imageMaterial.userData.frozenPreserveSourceColor = true;
  const mesh = new THREE.Mesh(geometry, [imageMaterial, edgeMaterial]);
  const object = new THREE.Group();
  object.add(mesh);
  return prepareFrozenObject(object, {
    imageGeometry: {
      aspect: slab.aspect,
      bevel: slab.bevel,
      bevelRadius: slab.bevelRadius,
      cornerRadius: slab.cornerRadius,
      cornerRoundness: slab.cornerRoundness,
      depth: slab.depth,
      thickness: slab.thickness,
    },
    seed: `${image.sourceId}:${slab.thickness}:${slab.bevel}:${slab.cornerRoundness}`,
    sourceId: `${image.sourceId}:t${slab.thickness}:b${slab.bevel}:r${slab.cornerRoundness}`,
    sourceKind: "image",
    sourceLabel: image.sourceLabel,
  });
}

export function disposeFrozenSourceImage(image: FrozenPreparedImage): void {
  image.texture.dispose();
}
