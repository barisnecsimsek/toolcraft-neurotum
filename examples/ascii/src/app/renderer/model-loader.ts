import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import {
  MODEL_SIZE,
  SCENE_PROFILE,
} from "./scene-profile";

function createDefaultModelObject(): THREE.Object3D {
  const profile = SCENE_PROFILE.defaultModel;
  const geometry = new THREE.TorusGeometry(
    profile.radius,
    profile.tube,
    profile.tubeSegments,
    profile.curveSegments,
  );
  const geometryScale =
    profile.normalizedOuterRadius / (profile.radius + profile.tube);
  geometry.scale(geometryScale, geometryScale, geometryScale);

  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.18,
    clearcoatRoughness: 0.3,
    color: 0xf6f8ff,
    envMapIntensity: 1.1,
    metalness: 0.92,
    roughness: 0.48,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.scale.setScalar(profile.meshScale);
  return mesh;
}

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function parseGltf(
  source: ArrayBuffer | string,
): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.parse(
      source,
      "",
      (gltf) => resolve(gltf.scene),
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
    );
  });
}

async function decodeUploadedObject(asset: ToolcraftMediaAsset): Promise<THREE.Object3D> {
  const response = await fetch(asset.dataUrl);
  const extension = extensionOf(asset.fileName);

  if (extension === "obj") {
    return new OBJLoader().parse(await response.text());
  }

  if (extension === "gltf") {
    return parseGltf(await response.text());
  }

  if (extension === "glb" || /gltf-binary/i.test(asset.mimeType)) {
    return parseGltf(await response.arrayBuffer());
  }

  throw new Error(`Unsupported 3D model format: ${asset.fileName}`);
}

function normalizeObject(object: THREE.Object3D): THREE.Group {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const dominantSize = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = MODEL_SIZE / dominantSize;
  const wrapper = new THREE.Group();

  object.position.sub(center);
  object.scale.multiplyScalar(scale);
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
    }
  });
  wrapper.add(object);
  return wrapper;
}

export async function loadEffectsModel(
  asset?: ToolcraftMediaAsset,
): Promise<{ model: THREE.Group; source: "default" | "upload" }> {
  if (!asset) {
    return { model: normalizeObject(createDefaultModelObject()), source: "default" };
  }

  try {
    return { model: normalizeObject(await decodeUploadedObject(asset)), source: "upload" };
  } catch (error) {
    console.error("Unable to decode uploaded 3D model; restoring the built-in model.", error);
    return { model: normalizeObject(createDefaultModelObject()), source: "default" };
  }
}

export function disposeEffectsModel(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }
      material.dispose();
    }
  });
}
