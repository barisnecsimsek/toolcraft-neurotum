import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

export type LoadedLiquidMetalModel = {
  object: THREE.Group;
  sourceLabel: string;
  triangleCount: number;
};

export function getLiquidMetalModelExtension(asset: ToolcraftMediaAsset): string {
  return /\.([a-z0-9]+)$/iu.exec(asset.fileName)?.[1]?.toLowerCase() ?? "";
}

async function readAsset(asset: ToolcraftMediaAsset): Promise<{
  arrayBuffer: ArrayBuffer;
  text: string;
}> {
  const response = await fetch(asset.dataUrl);

  if (!response.ok && !asset.dataUrl.startsWith("data:") && !asset.dataUrl.startsWith("blob:")) {
    throw new Error(`Could not read ${asset.fileName}.`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    arrayBuffer,
    text: new TextDecoder().decode(arrayBuffer),
  };
}

function parseGltf(
  arrayBuffer: ArrayBuffer,
  text: string,
  extension: string,
): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  const source: ArrayBuffer | string = extension === "gltf" ? text : arrayBuffer;

  return new Promise((resolve, reject) => {
    loader.parse(source, "", (gltf) => resolve(gltf.scene), reject);
  });
}

async function parseModelObject(asset: ToolcraftMediaAsset): Promise<THREE.Object3D> {
  const extension = getLiquidMetalModelExtension(asset);
  const { arrayBuffer, text } = await readAsset(asset);

  if (extension === "obj") {
    return new OBJLoader().parse(text);
  }

  if (extension === "stl") {
    const geometry = new STLLoader().parse(arrayBuffer);
    const mesh = new THREE.Mesh(geometry);
    const group = new THREE.Group();

    group.add(mesh);
    return group;
  }

  if (extension === "glb" || extension === "gltf") {
    return parseGltf(arrayBuffer, text, extension);
  }

  throw new Error(
    `Unsupported model format for ${asset.fileName}. Use GLB, self-contained GLTF, OBJ, or STL.`,
  );
}

function getTriangleCount(object: THREE.Object3D): number {
  let triangleCount = 0;

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }

    const index = mesh.geometry.getIndex();
    const position = mesh.geometry.getAttribute("position");

    triangleCount += Math.floor((index?.count ?? position?.count ?? 0) / 3);
  });

  return triangleCount;
}

function normalizeModel(object: THREE.Object3D): THREE.Group {
  object.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(object);

  if (bounds.isEmpty()) {
    throw new Error("The uploaded model has no renderable geometry.");
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const dominantSize = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(dominantSize) || dominantSize <= 0) {
    throw new Error("The uploaded model has invalid bounds.");
  }

  const centered = new THREE.Group();
  const normalized = new THREE.Group();

  centered.add(object);
  centered.position.copy(center).multiplyScalar(-1);
  normalized.add(centered);
  normalized.scale.setScalar(2.6 / dominantSize);
  normalized.updateMatrixWorld(true);

  return normalized;
}

export async function loadLiquidMetalModel(
  asset: ToolcraftMediaAsset,
): Promise<LoadedLiquidMetalModel> {
  const parsed = await parseModelObject(asset);
  const triangleCount = getTriangleCount(parsed);

  if (triangleCount === 0) {
    throw new Error("The uploaded model has no mesh triangles.");
  }

  return {
    object: normalizeModel(parsed),
    sourceLabel: asset.fileName,
    triangleCount,
  };
}

export function disposeLiquidMetalModel(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.geometry?.dispose();

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    materials.forEach((material) => {
      if (!material?.userData.toolcraftLiquidMetalManaged) {
        material?.dispose();
      }
    });
  });
}
