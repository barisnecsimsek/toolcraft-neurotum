import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import {
  getLiquidMetalDefaultStickerSeed,
} from "./liquid-metal-default-scene";
import {
  liquidMetalPhysicalEnvironmentApply,
  liquidMetalPhysicalEnvironmentPars,
  liquidMetalPhysicalFragmentApply,
  liquidMetalPhysicalFragmentPars,
  liquidMetalPhysicalVertexApply,
  liquidMetalPhysicalVertexPars,
} from "./liquid-metal-surface-shader";
import {
  getLiquidMetalEnvironmentExtension,
  type LiquidMetalEnvironmentPreset,
  type LiquidMetalEnvironmentSettings,
} from "./liquid-metal-environment";
import type { LiquidMetal3DSettings } from "./liquid-metal-values";
import {
  readLiquidMetalOrbitPose,
  DEFAULT_LIQUID_METAL_ORBIT_POSE,
  type LiquidMetalOrbitPose,
} from "./liquid-metal-orbit";
import {
  liquidMetalStickerRotationDefault,
  liquidMetalStickerScaleDefault,
  type LiquidMetalStickerPlacement,
  type LiquidMetalStickerPlacementMap,
} from "./liquid-metal-stickers";
import {
  buildLiquidMetalStickerSurfaceMeshes,
  createLiquidMetalWrappedStickerGeometry,
  type LiquidMetalStickerSurfaceMesh,
} from "./liquid-metal-sticker-geometry";

export type LiquidMetalSceneRenderOptions = {
  background: string;
  height: number;
  includeBackground: boolean;
  orbitPose: LiquidMetalOrbitPose;
  partialStickerUpdate?: boolean;
  width: number;
};

const liquidMetalModelBaseRotation = { x: -0.18, y: 0.34 } as const;

export type LiquidMetalStickerHit = {
  assetId: string;
  layerId: string;
};

type LiquidMetalStickerEntry = {
  asset: ToolcraftMediaAsset;
  material: THREE.MeshPhysicalMaterial;
  meshes: THREE.Mesh[];
  placement: LiquidMetalStickerPlacement;
  projectionToken: string;
  texture: THREE.Texture;
};

type LiquidMetalUniforms = {
  u_angle: { value: number };
  u_colorBack: { value: THREE.Vector4 };
  u_colorTint: { value: THREE.Vector4 };
  u_contour: { value: number };
  u_distortion: { value: number };
  u_fit: { value: number };
  u_environmentDirect: { value: number };
  u_environmentIntensity: { value: number };
  u_environmentMap: { value: THREE.Texture };
  u_environmentRotation: { value: number };
  u_loopProgress: { value: number };
  u_offset: { value: THREE.Vector2 };
  u_repetition: { value: number };
  u_rotation: { value: number };
  u_scale: { value: number };
  u_scratchDepth: { value: number };
  u_scratchEnabled: { value: number };
  u_scratchInvert: { value: number };
  u_scratchMap: { value: THREE.Texture };
  u_scratchScale: { value: number };
  u_scratchUvTransform: { value: THREE.Matrix3 };
  u_shiftBlue: { value: number };
  u_shiftRed: { value: number };
  u_softness: { value: number };
  u_speed: { value: number };
};

function createLiquidMetalUniforms(): LiquidMetalUniforms {
  const fallbackEnvironment = new THREE.DataTexture(
    new Float32Array([0, 0, 0, 1]),
    1,
    1,
    THREE.RGBAFormat,
    THREE.FloatType,
  );

  fallbackEnvironment.colorSpace = THREE.LinearSRGBColorSpace;
  fallbackEnvironment.needsUpdate = true;
  const fallbackScratch = new THREE.DataTexture(
    new Uint8Array([255]),
    1,
    1,
    THREE.RedFormat,
  );

  fallbackScratch.colorSpace = THREE.NoColorSpace;
  fallbackScratch.wrapS = THREE.RepeatWrapping;
  fallbackScratch.wrapT = THREE.RepeatWrapping;
  fallbackScratch.needsUpdate = true;

  return {
    u_angle: { value: 70 },
    u_colorBack: { value: new THREE.Vector4(0.402, 0.402, 0.412, 1) },
    u_colorTint: { value: new THREE.Vector4(1, 1, 1, 1) },
    u_contour: { value: 0.4 },
    u_distortion: { value: 0.07 },
    u_environmentDirect: { value: 0 },
    u_environmentIntensity: { value: 1.35 },
    u_environmentMap: { value: fallbackEnvironment },
    u_environmentRotation: { value: 0 },
    u_fit: { value: 1 },
    u_loopProgress: { value: 0 },
    u_offset: { value: new THREE.Vector2(0, 0) },
    u_repetition: { value: 2 },
    u_rotation: { value: 0 },
    u_scale: { value: 0.6 },
    u_scratchDepth: { value: 0.35 },
    u_scratchEnabled: { value: 0 },
    u_scratchInvert: { value: 0 },
    u_scratchMap: { value: fallbackScratch },
    u_scratchScale: { value: 6 },
    u_scratchUvTransform: { value: new THREE.Matrix3() },
    u_shiftBlue: { value: 0.3 },
    u_shiftRed: { value: 0.3 },
    u_softness: { value: 0.1 },
    u_speed: { value: 1 },
  };
}

function disposeMaterials(object: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh) return;

    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    meshMaterials.forEach((material) => materials.add(material));
  });

  materials.forEach((material) => material.dispose());
}

function setShaderColor(target: THREE.Vector4, value: string): void {
  const normalized = value.trim();
  const alphaHex = /^#[\da-f]{8}$/iu.test(normalized)
    ? normalized.slice(7, 9)
    : "ff";
  const colorHex = /^#[\da-f]{8}$/iu.test(normalized)
    ? normalized.slice(0, 7)
    : normalized;
  const color = new THREE.Color(colorHex);
  const alpha = Number.parseInt(alphaHex, 16) / 255;

  target.set(color.r, color.g, color.b, Number.isFinite(alpha) ? alpha : 1);
}

type ProceduralEnvironmentPreset = Exclude<
  LiquidMetalEnvironmentPreset,
  "custom" | "studio"
>;

type EnvironmentColor = readonly [red: number, green: number, blue: number];

type EnvironmentPanel = {
  centerU: number;
  centerV: number;
  color: EnvironmentColor;
  strength: number;
  widthU: number;
  widthV: number;
};

type ProceduralEnvironmentRecipe = {
  ambientStrength: number;
  baseColor: EnvironmentColor;
  horizonColor: EnvironmentColor;
  horizonStrength: number;
  panels: readonly EnvironmentPanel[];
};

function getProceduralEnvironmentRecipe(
  preset: ProceduralEnvironmentPreset,
): ProceduralEnvironmentRecipe {
  if (preset === "warm") {
    return {
      ambientStrength: 0.65,
      baseColor: [0.16, 0.075, 0.025],
      horizonColor: [0.16, 0.075, 0.025],
      horizonStrength: 0.65,
      panels: [
        {
          centerU: 0.2,
          centerV: 0.4,
          color: [1, 0.38, 0.08],
          strength: 9,
          widthU: 0.055,
          widthV: 0.16,
        },
        {
          centerU: 0.72,
          centerV: 0.58,
          color: [0.55, 0.12, 0.025],
          strength: 4,
          widthU: 0.095,
          widthV: 0.2,
        },
        {
          centerU: 0.47,
          centerV: 0.12,
          color: [1, 0.56, 0.24],
          strength: 5,
          widthU: 0.13,
          widthV: 0.065,
        },
      ],
    };
  }

  if (preset === "softbox") {
    return {
      ambientStrength: 0.5,
      baseColor: [0.035, 0.045, 0.06],
      horizonColor: [0.16, 0.19, 0.24],
      horizonStrength: 0.55,
      panels: [
        {
          centerU: 0.18,
          centerV: 0.43,
          color: [0.9, 0.96, 1],
          strength: 12,
          widthU: 0.1,
          widthV: 0.23,
        },
        {
          centerU: 0.7,
          centerV: 0.55,
          color: [0.62, 0.72, 0.86],
          strength: 5.5,
          widthU: 0.16,
          widthV: 0.26,
        },
        {
          centerU: 0.48,
          centerV: 0.1,
          color: [0.92, 0.97, 1],
          strength: 7,
          widthU: 0.26,
          widthV: 0.055,
        },
      ],
    };
  }

  if (preset === "product") {
    return {
      ambientStrength: 0.9,
      baseColor: [0.075, 0.08, 0.09],
      horizonColor: [0.24, 0.25, 0.27],
      horizonStrength: 0.9,
      panels: [
        {
          centerU: 0.16,
          centerV: 0.42,
          color: [1, 0.96, 0.9],
          strength: 14,
          widthU: 0.075,
          widthV: 0.21,
        },
        {
          centerU: 0.68,
          centerV: 0.48,
          color: [0.78, 0.88, 1],
          strength: 8,
          widthU: 0.11,
          widthV: 0.24,
        },
        {
          centerU: 0.46,
          centerV: 0.1,
          color: [1, 1, 1],
          strength: 10,
          widthU: 0.2,
          widthV: 0.05,
        },
        {
          centerU: 0.5,
          centerV: 0.76,
          color: [0.5, 0.55, 0.62],
          strength: 3.5,
          widthU: 0.22,
          widthV: 0.09,
        },
      ],
    };
  }

  if (preset === "rim") {
    return {
      ambientStrength: 0.42,
      baseColor: [0.008, 0.012, 0.02],
      horizonColor: [0.035, 0.045, 0.07],
      horizonStrength: 0.35,
      panels: [
        {
          centerU: 0.16,
          centerV: 0.48,
          color: [0.55, 0.72, 1],
          strength: 21,
          widthU: 0.025,
          widthV: 0.31,
        },
        {
          centerU: 0.84,
          centerV: 0.48,
          color: [1, 0.62, 0.34],
          strength: 18,
          widthU: 0.028,
          widthV: 0.31,
        },
        {
          centerU: 0.5,
          centerV: 0.09,
          color: [0.65, 0.72, 0.85],
          strength: 3,
          widthU: 0.18,
          widthV: 0.035,
        },
      ],
    };
  }

  if (preset === "chrome") {
    return {
      ambientStrength: 0.38,
      baseColor: [0.004, 0.006, 0.01],
      horizonColor: [0.05, 0.055, 0.065],
      horizonStrength: 0.3,
      panels: [
        {
          centerU: 0.04,
          centerV: 0.46,
          color: [0.72, 0.82, 1],
          strength: 22,
          widthU: 0.012,
          widthV: 0.34,
        },
        {
          centerU: 0.2,
          centerV: 0.5,
          color: [1, 0.97, 0.9],
          strength: 28,
          widthU: 0.018,
          widthV: 0.3,
        },
        {
          centerU: 0.43,
          centerV: 0.42,
          color: [0.55, 0.66, 0.85],
          strength: 16,
          widthU: 0.011,
          widthV: 0.27,
        },
        {
          centerU: 0.64,
          centerV: 0.52,
          color: [1, 1, 1],
          strength: 25,
          widthU: 0.02,
          widthV: 0.33,
        },
        {
          centerU: 0.88,
          centerV: 0.45,
          color: [0.9, 0.72, 0.55],
          strength: 19,
          widthU: 0.014,
          widthV: 0.29,
        },
        {
          centerU: 0.5,
          centerV: 0.08,
          color: [0.75, 0.82, 0.95],
          strength: 5,
          widthU: 0.28,
          widthV: 0.025,
        },
      ],
    };
  }

  return {
    ambientStrength: 0.65,
    baseColor: [0.055, 0.07, 0.09],
    horizonColor: [0.055, 0.07, 0.09],
    horizonStrength: 0.65,
    panels: [
      {
        centerU: 0.2,
        centerV: 0.4,
        color: [0.72, 0.84, 1],
        strength: 9,
        widthU: 0.055,
        widthV: 0.16,
      },
      {
        centerU: 0.72,
        centerV: 0.58,
        color: [0.36, 0.48, 0.68],
        strength: 4,
        widthU: 0.095,
        widthV: 0.2,
      },
      {
        centerU: 0.47,
        centerV: 0.12,
        color: [1, 0.92, 1.08],
        strength: 5,
        widthU: 0.13,
        widthV: 0.065,
      },
    ],
  };
}

function getWrappedEnvironmentDistance(value: number, center: number): number {
  const distance = Math.abs(value - center);
  return Math.min(distance, 1 - distance);
}

function createProceduralEnvironmentTexture(
  preset: ProceduralEnvironmentPreset,
): THREE.DataTexture {
  const width = 256;
  const height = 128;
  const data = new Float32Array(width * height * 4);
  const recipe = getProceduralEnvironmentRecipe(preset);

  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);

    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const horizon = Math.exp(-Math.pow((v - 0.54) * 5.5, 2));
      const offset = (y * width + x) * 4;
      let red =
        recipe.baseColor[0] * recipe.ambientStrength +
        recipe.horizonColor[0] * recipe.horizonStrength * horizon;
      let green =
        recipe.baseColor[1] * recipe.ambientStrength +
        recipe.horizonColor[1] * recipe.horizonStrength * horizon;
      let blue =
        recipe.baseColor[2] * recipe.ambientStrength +
        recipe.horizonColor[2] * recipe.horizonStrength * horizon;

      for (const panel of recipe.panels) {
        const wrappedU = getWrappedEnvironmentDistance(u, panel.centerU);
        const panelRadiance =
          Math.exp(
            -(
              Math.pow(wrappedU / panel.widthU, 2) +
              Math.pow((v - panel.centerV) / panel.widthV, 2)
            ),
          ) * panel.strength;

        red += panel.color[0] * panelRadiance;
        green += panel.color[1] * panelRadiance;
        blue += panel.color[2] * panelRadiance;
      }

      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 1;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );

  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

type DecodedEnvironmentMessage =
  | { data: ArrayBuffer; height: number; ok: true; width: number }
  | { message: string; ok: false };

function decodeEnvironmentInWorker(
  buffer: ArrayBuffer,
  extension: "exr" | "hdr",
  maxWidth: number,
): Promise<THREE.DataTexture> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./liquid-metal-environment-worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.addEventListener(
      "message",
      (event: MessageEvent<DecodedEnvironmentMessage>) => {
        worker.terminate();

        if (!event.data.ok) {
          reject(new Error(event.data.message));
          return;
        }

        const texture = new THREE.DataTexture(
          new Uint16Array(event.data.data),
          event.data.width,
          event.data.height,
          THREE.RGBAFormat,
          THREE.HalfFloatType,
        );

        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.flipY = false;
        texture.needsUpdate = true;
        resolve(texture);
      },
      { once: true },
    );
    worker.addEventListener(
      "error",
      (event) => {
        worker.terminate();
        reject(new Error(event.message || "Could not decode HDRI."));
      },
      { once: true },
    );
    worker.postMessage({ buffer, extension, maxWidth }, [buffer]);
  });
}

async function loadEnvironmentTexture(
  settings: LiquidMetalEnvironmentSettings,
  maxWidth: number,
): Promise<THREE.DataTexture> {
  const asset = settings.asset;

  if (!asset) {
    throw new Error("Choose a Radiance HDR or OpenEXR environment file.");
  }

  const extension = getLiquidMetalEnvironmentExtension(asset);

  if (extension !== "hdr" && extension !== "exr") {
    throw new Error(
      `Unsupported environment format for ${asset.fileName}. Use Radiance HDR or OpenEXR.`,
    );
  }

  const response = await fetch(asset.dataUrl);

  if (
    !response.ok &&
    !asset.dataUrl.startsWith("data:") &&
    !asset.dataUrl.startsWith("blob:")
  ) {
    throw new Error(`Could not read ${asset.fileName}.`);
  }

  return decodeEnvironmentInWorker(
    await response.arrayBuffer(),
    extension,
    maxWidth,
  );
}

async function loadStickerTexture(
  asset: ToolcraftMediaAsset,
): Promise<THREE.Texture> {
  const response = await fetch(asset.dataUrl);

  if (!response.ok && !asset.dataUrl.startsWith("data:")) {
    throw new Error(`Could not read sticker ${asset.fileName}.`);
  }

  const bitmap = await createImageBitmap(await response.blob(), {
    imageOrientation: "flipY",
    premultiplyAlpha: "none",
  });
  const texture = new THREE.Texture(bitmap);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.center.set(0.5, 0.5);
  texture.userData.toolcraftStickerBitmap = bitmap;
  texture.needsUpdate = true;
  return texture;
}

async function loadScratchTexture(
  asset: ToolcraftMediaAsset,
): Promise<THREE.Texture> {
  const response = await fetch(asset.dataUrl);

  if (!response.ok && !asset.dataUrl.startsWith("data:")) {
    throw new Error(`Could not read scratch mask ${asset.fileName}.`);
  }

  const bitmap = await createImageBitmap(await response.blob(), {
    imageOrientation: "flipY",
    premultiplyAlpha: "none",
  });
  const texture = new THREE.Texture(bitmap);

  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.center.set(0.5, 0.5);
  texture.userData.toolcraftScratchBitmap = bitmap;
  texture.needsUpdate = true;
  return texture;
}

function disposeStickerTexture(texture: THREE.Texture): void {
  const bitmap = texture.userData.toolcraftStickerBitmap;

  if (bitmap instanceof ImageBitmap) {
    bitmap.close();
  }
  texture.dispose();
}

function disposeScratchTexture(texture: THREE.Texture): void {
  const bitmap = texture.userData.toolcraftScratchBitmap;

  if (bitmap instanceof ImageBitmap) {
    bitmap.close();
  }
  texture.dispose();
}

function applyScratchTextureTransform(
  texture: THREE.Texture,
  asset: ToolcraftMediaAsset,
  target: THREE.Matrix3,
): void {
  const transform = asset.transform;

  texture.center.set(0.5, 0.5);
  texture.rotation = -THREE.MathUtils.degToRad(transform?.rotationDeg ?? 0);
  texture.repeat.set(
    transform?.flipHorizontal ? -1 : 1,
    transform?.flipVertical ? -1 : 1,
  );
  texture.updateMatrix();
  target.copy(texture.matrix);
  texture.needsUpdate = true;
}

function applyStickerTextureTransform(
  texture: THREE.Texture,
  asset: ToolcraftMediaAsset,
): void {
  const transform = asset.transform;

  texture.center.set(0.5, 0.5);
  texture.rotation = -THREE.MathUtils.degToRad(transform?.rotationDeg ?? 0);
  texture.repeat.set(
    transform?.flipHorizontal ? -1 : 1,
    transform?.flipVertical ? -1 : 1,
  );
  texture.needsUpdate = true;
}

function getStickerProjectorSize(
  asset: ToolcraftMediaAsset,
  scale: number,
): THREE.Vector2 {
  const rotation = asset.transform?.rotationDeg ?? 0;
  const swapsAxes = rotation === 90 || rotation === 270;
  const sourceWidth = Math.max(1, asset.size?.width ?? 1);
  const sourceHeight = Math.max(1, asset.size?.height ?? 1);
  const width = swapsAxes ? sourceHeight : sourceWidth;
  const height = swapsAxes ? sourceWidth : sourceHeight;
  const aspect = width / height;
  const longEdge = 0.82 * scale;
  const projectedWidth = aspect >= 1 ? longEdge : longEdge * aspect;
  const projectedHeight = aspect >= 1 ? longEdge / aspect : longEdge;

  return new THREE.Vector2(projectedWidth, projectedHeight);
}

function updateStickerGeometryBuffers(
  target: THREE.BufferGeometry,
  source: THREE.BufferGeometry,
): boolean {
  const attributeNames = ["position", "normal", "uv"] as const;

  if (
    !attributeNames.every((attributeName) => {
      const targetAttribute = target.getAttribute(attributeName);
      const sourceAttribute = source.getAttribute(attributeName);

      return (
        targetAttribute &&
        sourceAttribute &&
        targetAttribute.itemSize === sourceAttribute.itemSize &&
        targetAttribute.count === sourceAttribute.count
      );
    })
  ) {
    return false;
  }

  attributeNames.forEach((attributeName) => {
    const targetAttribute = target.getAttribute(attributeName);
    const sourceAttribute = source.getAttribute(attributeName);

    targetAttribute.array.set(sourceAttribute.array);
    targetAttribute.needsUpdate = true;
  });
  target.computeBoundingBox();
  target.computeBoundingSphere();
  source.dispose();
  return true;
}

function getStickerProjectionToken(
  asset: ToolcraftMediaAsset,
  placement: LiquidMetalStickerPlacement,
): string {
  return JSON.stringify({
    normal: placement.normal,
    position: placement.position,
    placementRotation: placement.rotationDegrees,
    placementScale: placement.scale,
    surfaceFaceIndex: placement.surfaceFaceIndex ?? null,
    surfaceMeshIndex: placement.surfaceMeshIndex ?? null,
    rotation: asset.transform?.rotationDeg ?? 0,
    size: asset.size ?? null,
  });
}

export class LiquidMetalSceneRenderer {
  readonly canvas: HTMLCanvasElement;

  private readonly baseModelMeshes: THREE.Mesh[] = [];
  private readonly camera: THREE.PerspectiveCamera;
  private disposed = false;
  private environmentLoadVersion = 0;
  private readonly environmentMaxWidth: number;
  private environmentSourceKey = "preset:studio";
  private readonly environmentTarget: THREE.WebGLRenderTarget;
  private readonly directEnvironmentTextures = new Map<string, THREE.Texture>();
  private height = 0;
  private readonly liquidUniforms: LiquidMetalUniforms;
  private readonly material: THREE.MeshPhysicalMaterial;
  private readonly modelGroup: THREE.Group;
  private readonly ownedEnvironmentTextures = new Set<THREE.Texture>();
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly pendingStickerGeometry = new Set<string>();
  private readonly pendingStickerScissor = new THREE.Box2();
  private requiresFullStickerRender = false;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly scene: THREE.Scene;
  private appliedBackground = "";
  private appliedBackgroundAlpha = -1;
  private appliedColorBack = "";
  private appliedColorTint = "";
  private appliedEnvironmentIntensity = Number.NaN;
  private appliedEnvironmentRotationDegrees = Number.NaN;
  private appliedOrbitPose: LiquidMetalOrbitPose | null = null;
  private scratchAssetId = "";
  private readonly scratchFallbackTexture: THREE.Texture;
  private scratchLoadVersion = 0;
  private scratchTexture: THREE.Texture | null = null;
  private model: THREE.Object3D | null = null;
  private readonly preparedModels = new WeakSet<THREE.Object3D>();
  private readonly stickerEntries = new Map<string, LiquidMetalStickerEntry>();
  private readonly stickerGroup = new THREE.Group();
  private readonly stickerProjectionCache = new Map<
    string,
    THREE.BufferGeometry[]
  >();
  private stickerSurfaceMeshes: LiquidMetalStickerSurfaceMesh[] = [];
  private stickerLoadVersion = 0;
  private width = 0;

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      environmentMaxWidth?: number;
      preserveDrawingBuffer?: boolean;
    } = {},
  ) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(1);
    this.environmentMaxWidth = Math.max(
      256,
      Math.round(options.environmentMaxWidth ?? 512),
    );

    this.scene = new THREE.Scene();
    const roomEnvironment = new RoomEnvironment();

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.environmentTarget = this.pmremGenerator.fromScene(
      roomEnvironment,
      0.015,
    );
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 1.35;
    roomEnvironment.dispose();

    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.01, 100);
    this.camera.position.set(0, 0, 4.6);
    this.camera.lookAt(0, 0, 0);
    this.modelGroup = new THREE.Group();
    this.modelGroup.rotation.set(
      liquidMetalModelBaseRotation.x,
      liquidMetalModelBaseRotation.y,
      0,
    );
    this.stickerGroup.name = "Toolcraft surface stickers";
    this.scene.add(this.modelGroup);

    this.liquidUniforms = createLiquidMetalUniforms();
    this.scratchFallbackTexture = this.liquidUniforms.u_scratchMap.value;
    this.ownedEnvironmentTextures.add(
      this.liquidUniforms.u_environmentMap.value,
    );
    this.material = new THREE.MeshPhysicalMaterial({
      clearcoat: 0,
      color: 0xffffff,
      envMapIntensity: 1.45,
      metalness: 1,
      roughness: 0.12,
      side: THREE.DoubleSide,
    });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.liquidUniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>\n${liquidMetalPhysicalVertexPars}`,
        )
        .replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>\n${liquidMetalPhysicalVertexApply}`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\n${liquidMetalPhysicalFragmentPars}`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>\n${liquidMetalPhysicalFragmentApply}`,
        )
        .replace(
          "#include <lights_fragment_maps>",
          `#include <lights_fragment_maps>\n${liquidMetalPhysicalEnvironmentApply}`,
        );
    };
    this.material.customProgramCacheKey = () =>
      "toolcraft-liquid-metal-physical-v4-triplanar-scratches";
    this.material.userData.toolcraftLiquidMetalManaged = true;

    this.prepare(1, 1);
    this.warmMaterial();
    this.modelGroup.add(this.stickerGroup);
    this.warmStickerMaterial();
  }

  private warmMaterial(): void {
    const warmupGeometry = new THREE.PlaneGeometry(1, 1);
    const warmupMesh = new THREE.Mesh(warmupGeometry, this.material);

    this.modelGroup.add(warmupMesh);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(this.scene, this.camera);
    this.modelGroup.remove(warmupMesh);
    this.renderer.clear();
    warmupGeometry.dispose();
  }

  private createStickerMaterial(
    texture: THREE.Texture,
  ): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      alphaTest: 0.015,
      clearcoat: 0.025,
      clearcoatRoughness: 0.48,
      color: 0x000000,
      depthTest: true,
      depthWrite: false,
      emissive: 0xffffff,
      emissiveIntensity: 1,
      emissiveMap: texture,
      envMapIntensity: 0.18,
      map: texture,
      metalness: 0,
      polygonOffset: true,
      roughness: 0.52,
      side: THREE.DoubleSide,
      specularIntensity: 0.04,
      transparent: true,
    });

    material.toneMapped = false;

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        u_environmentDirect: this.liquidUniforms.u_environmentDirect,
        u_environmentIntensity: this.liquidUniforms.u_environmentIntensity,
        u_environmentMap: this.liquidUniforms.u_environmentMap,
        u_environmentRotation: this.liquidUniforms.u_environmentRotation,
      });
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>\n${liquidMetalPhysicalEnvironmentPars}`,
        )
        .replace(
          "#include <lights_fragment_maps>",
          `#include <lights_fragment_maps>\n${liquidMetalPhysicalEnvironmentApply}`,
        );
    };
    material.customProgramCacheKey = () =>
      "toolcraft-color-stable-surface-sticker-v2-direct-environment";
    material.userData.toolcraftLiquidMetalStickerManaged = true;
    return material;
  }

  private warmStickerMaterial(): void {
    const texture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      THREE.RGBAFormat,
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const material = this.createStickerMaterial(texture);
    const geometry = new THREE.PlaneGeometry(0.1, 0.1);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 0, 0);
    this.modelGroup.add(mesh);
    this.renderer.render(this.scene, this.camera);
    this.modelGroup.remove(mesh);
    this.renderer.clear();
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }

  private disposeStickerEntry(entry: LiquidMetalStickerEntry): void {
    entry.meshes.forEach((mesh) => {
      this.stickerGroup.remove(mesh);
      mesh.geometry.dispose();
    });
    entry.meshes = [];
    entry.material.dispose();
    disposeStickerTexture(entry.texture);
  }

  private clearStickers(): void {
    this.stickerLoadVersion += 1;
    this.pendingStickerGeometry.clear();
    this.stickerEntries.forEach((entry) => this.disposeStickerEntry(entry));
    this.stickerEntries.clear();
    this.stickerGroup.clear();
  }

  private clearStickerProjectionCache(): void {
    this.stickerProjectionCache.forEach((geometries) => {
      geometries.forEach((geometry) => geometry.dispose());
    });
    this.stickerProjectionCache.clear();
  }

  private withCanonicalModelTransform(callback: () => void): void {
    const position = this.modelGroup.position.clone();
    const quaternion = this.modelGroup.quaternion.clone();
    const scale = this.modelGroup.scale.clone();

    this.modelGroup.position.set(0, 0, 0);
    this.modelGroup.quaternion.identity();
    this.modelGroup.scale.set(1, 1, 1);
    this.modelGroup.updateWorldMatrix(true, true);

    try {
      callback();
    } finally {
      this.modelGroup.position.copy(position);
      this.modelGroup.quaternion.copy(quaternion);
      this.modelGroup.scale.copy(scale);
      this.modelGroup.updateWorldMatrix(true, true);
    }
  }

  private rebuildStickerGeometry(
    entry: LiquidMetalStickerEntry,
    useProjectionCache = false,
  ): void {
    const previousMeshes = entry.meshes;
    const previousBounds = this.getStickerScreenBounds(previousMeshes);

    entry.meshes = [];

    if (this.stickerSurfaceMeshes.length === 0) {
      previousMeshes.forEach((mesh) => {
        this.stickerGroup.remove(mesh);
        mesh.geometry.dispose();
      });
      return;
    }

    const position = new THREE.Vector3(...entry.placement.position);
    const normal = new THREE.Vector3(...entry.placement.normal).normalize();
    const size = getStickerProjectorSize(entry.asset, entry.placement.scale);
    let geometries = useProjectionCache
      ? this.stickerProjectionCache.get(entry.projectionToken)
      : undefined;

    if (!geometries) {
      const wrapped = createLiquidMetalWrappedStickerGeometry({
        anchor: position,
        placementNormal: normal,
        rotationDegrees: entry.placement.rotationDegrees,
        seedFaceIndex: entry.placement.surfaceFaceIndex,
        seedMeshIndex: entry.placement.surfaceMeshIndex,
        size,
        surfaceMeshes: this.stickerSurfaceMeshes,
      });

      geometries = wrapped ? [wrapped.geometry] : [];

      if (useProjectionCache && geometries.length > 0) {
        this.stickerProjectionCache.set(entry.projectionToken, geometries);
      }
    }

    geometries.forEach((sourceGeometry, index) => {
      const geometry = useProjectionCache
        ? sourceGeometry.clone()
        : sourceGeometry;
      const previousMesh = previousMeshes[index];

      if (
        previousMesh &&
        updateStickerGeometryBuffers(previousMesh.geometry, geometry)
      ) {
        entry.meshes.push(previousMesh);
        return;
      }

      if (previousMesh) {
        this.stickerGroup.remove(previousMesh);
        previousMesh.geometry.dispose();
      }

      const mesh = new THREE.Mesh(geometry, entry.material);

      mesh.frustumCulled = false;
      mesh.renderOrder = 999 - entry.material.polygonOffsetFactor;
      mesh.userData.toolcraftStickerAssetId = entry.asset.id;
      mesh.userData.toolcraftStickerLayerId = entry.asset.layerId;
      this.stickerGroup.add(mesh);
      entry.meshes.push(mesh);
    });

    previousMeshes.slice(geometries.length).forEach((mesh) => {
      this.stickerGroup.remove(mesh);
      mesh.geometry.dispose();
    });

    const nextBounds = this.getStickerScreenBounds(entry.meshes);

    if (previousBounds) this.pendingStickerScissor.union(previousBounds);
    if (nextBounds) this.pendingStickerScissor.union(nextBounds);
  }

  private getStickerScreenBounds(
    meshes: readonly THREE.Mesh[],
  ): THREE.Box2 | null {
    if (meshes.length === 0 || this.width <= 0 || this.height <= 0) {
      return null;
    }

    const bounds = new THREE.Box2().makeEmpty();
    const corner = new THREE.Vector3();

    for (const mesh of meshes) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();

      const geometryBounds = mesh.geometry.boundingBox;

      if (!geometryBounds || geometryBounds.isEmpty()) continue;

      mesh.updateWorldMatrix(true, false);
      for (const x of [geometryBounds.min.x, geometryBounds.max.x]) {
        for (const y of [geometryBounds.min.y, geometryBounds.max.y]) {
          for (const z of [geometryBounds.min.z, geometryBounds.max.z]) {
            corner
              .set(x, y, z)
              .applyMatrix4(mesh.matrixWorld)
              .project(this.camera);

            if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) {
              continue;
            }

            bounds.expandByPoint(
              new THREE.Vector2(
                (corner.x * 0.5 + 0.5) * this.width,
                (corner.y * 0.5 + 0.5) * this.height,
              ),
            );
          }
        }
      }
    }

    if (bounds.isEmpty()) return null;

    bounds.expandByScalar(10);
    bounds.min.x = THREE.MathUtils.clamp(bounds.min.x, 0, this.width);
    bounds.min.y = THREE.MathUtils.clamp(bounds.min.y, 0, this.height);
    bounds.max.x = THREE.MathUtils.clamp(bounds.max.x, 0, this.width);
    bounds.max.y = THREE.MathUtils.clamp(bounds.max.y, 0, this.height);
    return bounds.isEmpty() ? null : bounds;
  }

  private applyStickerOrder(assets: readonly ToolcraftMediaAsset[]): void {
    assets.forEach((asset, index) => {
      const entry = this.stickerEntries.get(asset.id);

      if (!entry) return;

      const nextOffset = -(index + 1);

      if (
        entry.material.polygonOffsetFactor !== nextOffset ||
        entry.material.polygonOffsetUnits !== nextOffset ||
        entry.meshes.some((mesh) => mesh.renderOrder !== 1000 + index)
      ) {
        this.requiresFullStickerRender = true;
      }

      entry.material.polygonOffsetFactor = nextOffset;
      entry.material.polygonOffsetUnits = nextOffset;
      entry.meshes.forEach((mesh) => {
        mesh.renderOrder = 1000 + index;
      });
    });
  }

  private flushPendingStickerGeometry(): void {
    if (this.pendingStickerGeometry.size === 0) {
      return;
    }

    const pendingIds = [...this.pendingStickerGeometry];

    this.pendingStickerGeometry.clear();
    pendingIds.forEach((assetId) => {
      const entry = this.stickerEntries.get(assetId);

      if (entry) {
        this.rebuildStickerGeometry(entry);
      }
    });
  }

  hasPendingStickerGeometry(): boolean {
    return this.pendingStickerGeometry.size > 0;
  }

  needsFullStickerRender(): boolean {
    return this.requiresFullStickerRender;
  }

  private getNdc(clientX: number, clientY: number): THREE.Vector2 | null {
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private getPlacementFromIntersection(
    intersection: THREE.Intersection<THREE.Object3D>,
    transform: Pick<LiquidMetalStickerPlacement, "rotationDegrees" | "scale">,
  ): LiquidMetalStickerPlacement | null {
    if (!intersection.face) {
      return null;
    }

    const mesh = intersection.object as THREE.Mesh;
    const worldNormal = intersection.face.normal
      .clone()
      .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld))
      .normalize();
    const groupQuaternion = this.modelGroup.getWorldQuaternion(
      new THREE.Quaternion(),
    );
    const localNormal = worldNormal
      .applyQuaternion(groupQuaternion.invert())
      .normalize();
    const localPosition = this.modelGroup.worldToLocal(
      intersection.point.clone(),
    );
    const surfaceMeshIndex = this.baseModelMeshes.indexOf(mesh);
    const surfaceFaceIndex = intersection.faceIndex;

    return {
      normal: localNormal.toArray(),
      position: localPosition.toArray(),
      rotationDegrees: transform.rotationDegrees,
      scale: transform.scale,
      ...(surfaceMeshIndex < 0 ? {} : { surfaceMeshIndex }),
      ...(typeof surfaceFaceIndex === "number" ? { surfaceFaceIndex } : {}),
    };
  }

  private intersectModel(
    ndc: THREE.Vector2,
  ): THREE.Intersection<THREE.Object3D> | undefined {
    if (this.baseModelMeshes.length === 0) {
      return undefined;
    }

    this.modelGroup.updateWorldMatrix(true, true);
    this.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObjects(this.baseModelMeshes, false)[0];
  }

  private raycastModel(
    ndc: THREE.Vector2,
    transform: Pick<LiquidMetalStickerPlacement, "rotationDegrees" | "scale">,
  ): LiquidMetalStickerPlacement | null {
    const intersection = this.intersectModel(ndc);

    return intersection
      ? this.getPlacementFromIntersection(intersection, transform)
      : null;
  }

  private raycastAuthoredDefaultSticker(
    ndc: THREE.Vector2,
    transform: Pick<LiquidMetalStickerPlacement, "rotationDegrees" | "scale">,
  ): LiquidMetalStickerPlacement | null {
    const authoredCamera = new THREE.PerspectiveCamera(36, 16 / 9, 0.01, 100);

    authoredCamera.position.fromArray(DEFAULT_LIQUID_METAL_ORBIT_POSE.position);
    authoredCamera.up.fromArray(DEFAULT_LIQUID_METAL_ORBIT_POSE.up).normalize();
    authoredCamera.lookAt(0, 0, 0);
    authoredCamera.updateProjectionMatrix();
    authoredCamera.updateMatrixWorld(true);
    this.modelGroup.updateWorldMatrix(true, true);
    this.raycaster.setFromCamera(ndc, authoredCamera);
    const intersection = this.raycaster.intersectObjects(
      this.baseModelMeshes,
      false,
    )[0];

    return intersection
      ? this.getPlacementFromIntersection(intersection, transform)
      : null;
  }

  hitTestModel(clientX: number, clientY: number): boolean {
    const ndc = this.getNdc(clientX, clientY);

    return ndc ? Boolean(this.intersectModel(ndc)) : false;
  }

  private getDefaultStickerPlacement(
    transform: Pick<LiquidMetalStickerPlacement, "rotationDegrees" | "scale">,
  ): LiquidMetalStickerPlacement | null {
    const candidates = [
      [0, 0],
      [-0.24, 0],
      [0.24, 0],
      [-0.12, 0],
      [0.12, 0],
      [0, 0.12],
      [0, -0.12],
      [-0.24, 0.08],
      [0.24, 0.08],
    ] as const;

    for (const [x, y] of candidates) {
      const placement = this.raycastModel(new THREE.Vector2(x, y), transform);

      if (placement) return placement;
    }

    return null;
  }

  async setStickers(
    assets: readonly ToolcraftMediaAsset[],
    placements: LiquidMetalStickerPlacementMap,
    defaultTransform: Pick<
      LiquidMetalStickerPlacement,
      "rotationDegrees" | "scale"
    > = {
      rotationDegrees: liquidMetalStickerRotationDefault,
      scale: liquidMetalStickerScaleDefault,
    },
  ): Promise<LiquidMetalStickerPlacementMap> {
    const loadVersion = ++this.stickerLoadVersion;
    const activeIds = new Set(assets.map((asset) => asset.id));

    for (const [id, entry] of this.stickerEntries) {
      if (!activeIds.has(id)) {
        this.requiresFullStickerRender = true;
        this.disposeStickerEntry(entry);
        this.stickerEntries.delete(id);
      }
    }

    if (!this.model) {
      return {};
    }

    const resolvedPlacements: LiquidMetalStickerPlacementMap = {};
    let fallbackPlacement: LiquidMetalStickerPlacement | null | undefined;
    const entriesToLoad: Array<{
      asset: ToolcraftMediaAsset;
      placement: LiquidMetalStickerPlacement;
    }> = [];

    for (const asset of assets) {
      if (this.disposed || loadVersion !== this.stickerLoadVersion) {
        return resolvedPlacements;
      }

      let entry = this.stickerEntries.get(asset.id);

      if (entry && entry.asset.dataUrl !== asset.dataUrl) {
        this.requiresFullStickerRender = true;
        this.disposeStickerEntry(entry);
        this.stickerEntries.delete(asset.id);
        entry = undefined;
      }

      if (!entry) {
        const seed = getLiquidMetalDefaultStickerSeed(asset.id);
        let placement: LiquidMetalStickerPlacement | null | undefined =
          placements[asset.id];

        if (!placement && seed) {
          placement = this.raycastAuthoredDefaultSticker(
            new THREE.Vector2(seed.ndc[0], seed.ndc[1]),
            {
              rotationDegrees: seed.rotationDegrees,
              scale: seed.scale,
            },
          );
        }

        if (!placement) {
          if (fallbackPlacement === undefined) {
            fallbackPlacement = this.getDefaultStickerPlacement(defaultTransform);
          }
          placement = fallbackPlacement ?? undefined;
        }

        if (!placement) {
          continue;
        }

        entriesToLoad.push({ asset, placement });
      }
    }

    const textureResults = await Promise.allSettled(
      entriesToLoad.map(async ({ asset, placement }) => ({
        asset,
        placement,
        texture: await loadStickerTexture(asset),
      })),
    );
    const loadedEntries: Array<{
      asset: ToolcraftMediaAsset;
      placement: LiquidMetalStickerPlacement;
      texture: THREE.Texture;
    }> = [];
    let textureLoadError: unknown;

    textureResults.forEach((result) => {
      if (result.status === "fulfilled") {
        loadedEntries.push(result.value);
      } else if (textureLoadError === undefined) {
        textureLoadError = result.reason;
      }
    });

    if (
      textureLoadError !== undefined ||
      this.disposed ||
      loadVersion !== this.stickerLoadVersion
    ) {
      loadedEntries.forEach(({ texture }) => disposeStickerTexture(texture));

      if (textureLoadError !== undefined) {
        throw textureLoadError;
      }
      return resolvedPlacements;
    }

    loadedEntries.forEach(({ asset, placement, texture }) => {
      this.stickerEntries.set(asset.id, {
        asset,
        material: this.createStickerMaterial(texture),
        meshes: [],
        placement,
        projectionToken: "",
        texture,
      });
      this.requiresFullStickerRender = true;
    });

    for (const asset of assets) {
      const entry = this.stickerEntries.get(asset.id);

      if (!entry) continue;

      if (
        entry.asset.transform?.flipHorizontal !==
          asset.transform?.flipHorizontal ||
        entry.asset.transform?.flipVertical !== asset.transform?.flipVertical
      ) {
        this.requiresFullStickerRender = true;
      }

      entry.asset = asset;
      entry.placement = placements[asset.id] ?? entry.placement;
      applyStickerTextureTransform(entry.texture, asset);
      const projectionToken = getStickerProjectionToken(asset, entry.placement);

      if (entry.projectionToken !== projectionToken) {
        entry.projectionToken = projectionToken;
        this.pendingStickerGeometry.add(asset.id);
      }

      resolvedPlacements[asset.id] = entry.placement;
    }

    this.applyStickerOrder(assets);
    return resolvedPlacements;
  }

  pickSticker(clientX: number, clientY: number): LiquidMetalStickerHit | null {
    const ndc = this.getNdc(clientX, clientY);

    if (!ndc || this.stickerEntries.size === 0) {
      return null;
    }

    this.modelGroup.updateWorldMatrix(true, true);
    this.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(ndc, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.stickerGroup.children,
      false,
    );

    intersections.sort((left, right) => {
      const orderDifference =
        right.object.renderOrder - left.object.renderOrder;

      return orderDifference !== 0
        ? orderDifference
        : left.distance - right.distance;
    });
    const selected = intersections[0]?.object;
    const assetId = selected?.userData.toolcraftStickerAssetId;
    const layerId = selected?.userData.toolcraftStickerLayerId;

    return typeof assetId === "string" && typeof layerId === "string"
      ? { assetId, layerId }
      : null;
  }

  moveStickerAtClient(
    assetId: string,
    clientX: number,
    clientY: number,
  ): LiquidMetalStickerPlacement | null {
    const ndc = this.getNdc(clientX, clientY);
    const entry = this.stickerEntries.get(assetId);

    if (!ndc || !entry) {
      return null;
    }

    const placement = this.raycastModel(ndc, {
      rotationDegrees: entry.placement.rotationDegrees,
      scale: entry.placement.scale,
    });

    if (!placement) {
      return null;
    }

    entry.placement = placement;
    entry.projectionToken = getStickerProjectionToken(entry.asset, placement);
    this.pendingStickerGeometry.add(assetId);
    return placement;
  }

  setStickerTransform(
    assetId: string,
    transform: Pick<LiquidMetalStickerPlacement, "rotationDegrees" | "scale">,
  ): LiquidMetalStickerPlacement | null {
    const entry = this.stickerEntries.get(assetId);

    if (!entry) {
      return null;
    }

    if (
      entry.placement.rotationDegrees === transform.rotationDegrees &&
      entry.placement.scale === transform.scale
    ) {
      return entry.placement;
    }

    entry.placement = { ...entry.placement, ...transform };
    entry.projectionToken = getStickerProjectionToken(
      entry.asset,
      entry.placement,
    );
    this.pendingStickerGeometry.add(assetId);
    return entry.placement;
  }

  setEnvironmentAppearance(
    settings: Pick<
      LiquidMetalEnvironmentSettings,
      "intensity" | "rotationDegrees"
    >,
  ): void {
    if (
      this.appliedEnvironmentIntensity === settings.intensity &&
      this.appliedEnvironmentRotationDegrees === settings.rotationDegrees
    ) {
      return;
    }

    this.appliedEnvironmentIntensity = settings.intensity;
    this.appliedEnvironmentRotationDegrees = settings.rotationDegrees;
    this.scene.environmentIntensity = settings.intensity;
    this.liquidUniforms.u_environmentIntensity.value = settings.intensity;
    this.liquidUniforms.u_environmentRotation.value = THREE.MathUtils.degToRad(
      settings.rotationDegrees,
    );
    this.scene.environmentRotation.set(
      0,
      THREE.MathUtils.degToRad(settings.rotationDegrees),
      0,
    );
  }

  async setEnvironment(
    settings: LiquidMetalEnvironmentSettings,
  ): Promise<void> {
    this.setEnvironmentAppearance(settings);

    const usesCustomAsset = settings.preset === "custom" && settings.asset;
    const sourceKey = usesCustomAsset
      ? settings.sourceKey
      : settings.preset === "custom"
        ? "preset:studio"
        : `preset:${settings.preset}`;

    if (sourceKey === this.environmentSourceKey) {
      return;
    }

    if (sourceKey === "preset:studio") {
      this.environmentSourceKey = sourceKey;
      this.liquidUniforms.u_environmentDirect.value = 0;
      return;
    }

    const cachedTexture = this.directEnvironmentTextures.get(sourceKey);

    if (cachedTexture) {
      this.environmentSourceKey = sourceKey;
      this.liquidUniforms.u_environmentMap.value = cachedTexture;
      this.liquidUniforms.u_environmentDirect.value = 1;
      return;
    }

    const loadVersion = ++this.environmentLoadVersion;
    let nextTexture: THREE.DataTexture | null = null;

    try {
      if (usesCustomAsset) {
        nextTexture = await loadEnvironmentTexture(
          settings,
          this.environmentMaxWidth,
        );
      } else {
        const preset =
          settings.preset === "custom" ? "studio" : settings.preset;

        if (preset === "studio") {
          this.environmentSourceKey = "preset:studio";
          this.liquidUniforms.u_environmentDirect.value = 0;
          return;
        }

        nextTexture = createProceduralEnvironmentTexture(preset);
      }

      if (
        this.disposed ||
        loadVersion !== this.environmentLoadVersion ||
        !nextTexture
      ) {
        nextTexture?.dispose();
        return;
      }

      this.renderer.initTexture(nextTexture);
      this.environmentSourceKey = sourceKey;
      this.directEnvironmentTextures.set(sourceKey, nextTexture);
      this.ownedEnvironmentTextures.add(nextTexture);
      this.liquidUniforms.u_environmentMap.value = nextTexture;
      this.liquidUniforms.u_environmentDirect.value = 1;

      if (sourceKey.startsWith("custom:")) {
        for (const [key, texture] of this.directEnvironmentTextures) {
          if (key.startsWith("custom:") && key !== sourceKey) {
            texture.dispose();
            this.ownedEnvironmentTextures.delete(texture);
            this.directEnvironmentTextures.delete(key);
          }
        }
      }
    } catch (error) {
      nextTexture?.dispose();
      throw error;
    }
  }

  setLiquidMetalSettings(settings: LiquidMetal3DSettings): void {
    const uniforms = this.liquidUniforms;

    if (this.modelGroup.scale.x !== settings.modelScale) {
      this.modelGroup.scale.setScalar(settings.modelScale);
    }

    if (this.appliedColorBack !== settings.colorBack) {
      this.appliedColorBack = settings.colorBack;
      setShaderColor(uniforms.u_colorBack.value, settings.colorBack);
    }
    if (this.appliedColorTint !== settings.colorTint) {
      this.appliedColorTint = settings.colorTint;
      setShaderColor(uniforms.u_colorTint.value, settings.colorTint);
    }
    uniforms.u_repetition.value = settings.repetition;
    uniforms.u_softness.value = settings.softness;
    uniforms.u_shiftRed.value = settings.shiftRed;
    uniforms.u_shiftBlue.value = settings.shiftBlue;
    uniforms.u_distortion.value = settings.distortion;
    uniforms.u_contour.value = settings.contour;
    uniforms.u_angle.value = settings.angle;
    uniforms.u_loopProgress.value = settings.loopProgress;
    uniforms.u_speed.value = settings.speed;
    uniforms.u_scale.value = settings.scale;
    uniforms.u_rotation.value = settings.rotation;
    uniforms.u_scratchDepth.value = settings.scratchDepth;
    uniforms.u_scratchInvert.value = settings.scratchInvert ? 1 : 0;
    uniforms.u_scratchScale.value = settings.scratchScale;
    uniforms.u_fit.value = settings.fit === "cover" ? 2 : 1;
    uniforms.u_offset.value.set(settings.offsetX, settings.offsetY);
  }

  async setScratchMask(asset: ToolcraftMediaAsset | null): Promise<void> {
    const loadVersion = ++this.scratchLoadVersion;

    if (!asset) {
      if (this.scratchTexture) {
        disposeScratchTexture(this.scratchTexture);
      }
      this.scratchTexture = null;
      this.scratchAssetId = "";
      this.liquidUniforms.u_scratchMap.value = this.scratchFallbackTexture;
      this.liquidUniforms.u_scratchUvTransform.value.identity();
      this.liquidUniforms.u_scratchEnabled.value = 0;
      return;
    }

    if (this.scratchTexture && this.scratchAssetId === asset.id) {
      applyScratchTextureTransform(
        this.scratchTexture,
        asset,
        this.liquidUniforms.u_scratchUvTransform.value,
      );
      this.liquidUniforms.u_scratchMap.value = this.scratchTexture;
      this.liquidUniforms.u_scratchEnabled.value = 1;
      return;
    }

    const texture = await loadScratchTexture(asset);

    if (this.disposed || loadVersion !== this.scratchLoadVersion) {
      disposeScratchTexture(texture);
      return;
    }

    if (this.scratchTexture) {
      disposeScratchTexture(this.scratchTexture);
    }
    this.scratchTexture = texture;
    this.scratchAssetId = asset.id;
    applyScratchTextureTransform(
      texture,
      asset,
      this.liquidUniforms.u_scratchUvTransform.value,
    );
    this.liquidUniforms.u_scratchMap.value = texture;
    this.liquidUniforms.u_scratchEnabled.value = 1;
  }

  setModel(
    model: THREE.Object3D | null,
    options: { disposeReplacedMaterials?: boolean } = {},
  ): void {
    this.clearStickers();
    this.clearStickerProjectionCache();
    this.baseModelMeshes.length = 0;
    this.stickerSurfaceMeshes = [];
    this.modelGroup.clear();
    this.model = model;

    if (!model) {
      this.modelGroup.add(this.stickerGroup);
      return;
    }

    if (options.disposeReplacedMaterials && !this.preparedModels.has(model)) {
      disposeMaterials(model);
      this.preparedModels.add(model);
    }

    model.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (!mesh.isMesh) return;

      if (!mesh.geometry.getAttribute("normal")) {
        mesh.geometry.computeVertexNormals();
      }

      mesh.material = this.material;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.baseModelMeshes.push(mesh);
    });

    this.modelGroup.add(model);
    this.modelGroup.add(this.stickerGroup);
    this.withCanonicalModelTransform(() => {
      this.stickerSurfaceMeshes = buildLiquidMetalStickerSurfaceMeshes(
        this.baseModelMeshes,
      );
    });
  }

  hasModel(): boolean {
    return this.model !== null;
  }

  getRenderedStickerCount(): number {
    let renderedStickerCount = 0;

    this.stickerEntries.forEach((entry) => {
      if (entry.meshes.length > 0) renderedStickerCount += 1;
    });

    return renderedStickerCount;
  }

  prepare(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));

    if (this.width === safeWidth && this.height === safeHeight) return;

    this.width = safeWidth;
    this.height = safeHeight;
    this.renderer.setSize(safeWidth, safeHeight, false);
    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
  }

  render({
    background,
    height,
    includeBackground,
    orbitPose,
    partialStickerUpdate = false,
    width,
  }: LiquidMetalSceneRenderOptions): void {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));

    this.prepare(safeWidth, safeHeight);
    const appliedPose = this.appliedOrbitPose;
    const orbitChanged =
      !appliedPose ||
      orbitPose.position.some(
        (value, index) => value !== appliedPose.position[index],
      ) ||
      orbitPose.up.some((value, index) => value !== appliedPose.up[index]);

    if (orbitChanged) {
      const pose = readLiquidMetalOrbitPose(orbitPose);

      this.appliedOrbitPose = pose;
      this.camera.position.fromArray(pose.position);
      this.camera.up.fromArray(pose.up).normalize();
      this.camera.lookAt(0, 0, 0);
      this.camera.updateMatrixWorld(true);
    }

    const backgroundAlpha = includeBackground ? 1 : 0;

    if (
      this.appliedBackground !== background ||
      this.appliedBackgroundAlpha !== backgroundAlpha
    ) {
      this.appliedBackground = background;
      this.appliedBackgroundAlpha = backgroundAlpha;
      this.renderer.setClearColor(background, backgroundAlpha);
    }
    this.pendingStickerScissor.makeEmpty();
    this.flushPendingStickerGeometry();

    if (
      partialStickerUpdate &&
      !this.requiresFullStickerRender &&
      !this.pendingStickerScissor.isEmpty()
    ) {
      const minX = Math.max(0, Math.floor(this.pendingStickerScissor.min.x));
      const minY = Math.max(0, Math.floor(this.pendingStickerScissor.min.y));
      const maxX = Math.min(
        safeWidth,
        Math.ceil(this.pendingStickerScissor.max.x),
      );
      const maxY = Math.min(
        safeHeight,
        Math.ceil(this.pendingStickerScissor.max.y),
      );

      if (maxX > minX && maxY > minY) {
        this.renderer.setScissor(minX, minY, maxX - minX, maxY - minY);
        this.renderer.setScissorTest(true);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setScissorTest(false);
        return;
      }
    }

    this.renderer.setScissorTest(false);
    this.renderer.render(this.scene, this.camera);
    this.requiresFullStickerRender = false;
  }

  dispose(): void {
    this.disposed = true;
    this.environmentLoadVersion += 1;
    this.scratchLoadVersion += 1;
    this.clearStickers();
    this.clearStickerProjectionCache();
    this.baseModelMeshes.length = 0;
    this.stickerSurfaceMeshes = [];
    this.modelGroup.clear();
    this.material.dispose();
    if (this.scratchTexture) {
      disposeScratchTexture(this.scratchTexture);
      this.scratchTexture = null;
    }
    this.scratchFallbackTexture.dispose();
    this.environmentTarget.dispose();
    this.ownedEnvironmentTextures.forEach((texture) => texture.dispose());
    this.ownedEnvironmentTextures.clear();
    this.directEnvironmentTextures.clear();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    this.model = null;
  }
}
