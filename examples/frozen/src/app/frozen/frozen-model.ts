import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import { importFrozenModel } from "./frozen-model-import";
import {
  countFrozenObjectTriangles,
  simplifyFrozenObject,
} from "./frozen-model-simplify";

export const frozenSourceTriangleLimit = 30_000;
export const frozenModelTriangleBudgetDefault = 30_000;
export const frozenModelTriangleBudgetMinimum = 3_000;
export const frozenCrystalSampleLimit = 48_000;
export const frozenIcicleSampleLimit = 12_000;

const frozenCrystalMinimumSamples = 12_000;
const frozenCrystalSamplesPerArea = 2_500;
const frozenIcicleMinimumSamples = 2_400;
const frozenIcicleSamplesPerArea = 600;

export type FrozenSurfaceSamples = Readonly<{
  normals: Float32Array;
  positions: Float32Array;
}>;

export type FrozenPreparedModel = Readonly<{
  bounds: Readonly<{ maxY: number; minY: number }>;
  crystalSamples: FrozenSurfaceSamples;
  icicleSamples: FrozenSurfaceSamples;
  imageGeometry?: Readonly<{
    aspect: number;
    bevel: number;
    bevelRadius: number;
    cornerRadius: number;
    cornerRoundness: number;
    depth: number;
    thickness: number;
  }>;
  materialCount: number;
  object: THREE.Group;
  sourceKind: "image" | "model";
  surfaceArea: number;
  sourceId: string;
  sourceLabel: string;
  sourceTriangleCount: number;
  textureCount: number;
  triangleCount: number;
}>;

type SamplerRecord = Readonly<{
  cumulativeArea: number;
  sampler: MeshSurfaceSampler;
}>;

type DeterministicMeshSurfaceSampler = MeshSurfaceSampler & {
  setRandomGenerator: (random: () => number) => MeshSurfaceSampler;
};

function boundedCoverageSampleCount(
  surfaceArea: number,
  samplesPerArea: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(surfaceArea) || surfaceArea <= 0) return minimum;
  return THREE.MathUtils.clamp(
    Math.ceil(surfaceArea * samplesPerArea),
    minimum,
    maximum,
  );
}

export function getFrozenCrystalSampleCount(surfaceArea: number): number {
  return boundedCoverageSampleCount(
    surfaceArea,
    frozenCrystalSamplesPerArea,
    frozenCrystalMinimumSamples,
    frozenCrystalSampleLimit,
  );
}

export function getFrozenIcicleSampleCount(surfaceArea: number): number {
  return boundedCoverageSampleCount(
    surfaceArea,
    frozenIcicleSamplesPerArea,
    frozenIcicleMinimumSamples,
    frozenIcicleSampleLimit,
  );
}

function normalizeModel(object: THREE.Object3D): THREE.Group {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) throw new Error("The uploaded model has no renderable geometry.");
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const dominantSize = Math.max(size.x, size.y, size.z);
  const boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
  if (!Number.isFinite(dominantSize) || dominantSize <= 0) {
    throw new Error("The uploaded model has invalid bounds.");
  }
  if (!Number.isFinite(boundingSphere.radius) || boundingSphere.radius <= 0) {
    throw new Error("The uploaded model has invalid bounding volume.");
  }

  const centered = new THREE.Group();
  centered.add(object);
  centered.position.copy(center).multiplyScalar(-1);
  const normalized = new THREE.Group();
  normalized.add(centered);
  normalized.scale.setScalar(1.08 / boundingSphere.radius);
  normalized.updateMatrixWorld(true);
  return normalized;
}

function applyFallbackMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const previous = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    previous.forEach((material) => material?.dispose());
    mesh.material = new THREE.MeshStandardMaterial({
      color: 0x36414b,
      envMapIntensity: 1,
      metalness: 0.08,
      roughness: 0.28,
    });
  });
}

function seededRandom(seedText: string): () => number {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getMaterialStats(object: THREE.Object3D): Readonly<{
  materialCount: number;
  textureCount: number;
}> {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    meshMaterials.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material).forEach((value) => {
        const texture = value as THREE.Texture;
        if (texture?.isTexture) textures.add(texture);
      });
    });
  });
  return { materialCount: materials.size, textureCount: textures.size };
}

function samplerArea(sampler: MeshSurfaceSampler): number {
  const distribution = sampler.distribution;
  return distribution?.[distribution.length - 1] ?? 0;
}

function buildSamplerRecords(
  object: THREE.Object3D,
  random: () => number,
): { all: SamplerRecord[]; downward: SamplerRecord[]; temporary: THREE.BufferGeometry[] } {
  const all: SamplerRecord[] = [];
  const downward: SamplerRecord[] = [];
  const temporary: THREE.BufferGeometry[] = [];
  let allArea = 0;
  let downwardArea = 0;

  object.updateMatrixWorld(true);
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry?.getAttribute("position")) return;
    const cloned = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    cloned.applyMatrix4(mesh.matrixWorld);
    if (!cloned.getAttribute("normal")) cloned.computeVertexNormals();
    temporary.push(cloned);

    const sampleMesh = new THREE.Mesh(cloned);
    const surfaceSampler = new MeshSurfaceSampler(sampleMesh);
    (surfaceSampler as DeterministicMeshSurfaceSampler).setRandomGenerator(random);
    surfaceSampler.build();
    const surfaceArea = samplerArea(surfaceSampler);
    if (surfaceArea > 0) {
      allArea += surfaceArea;
      all.push({ cumulativeArea: allArea, sampler: surfaceSampler });
    }

    const normals = cloned.getAttribute("normal");
    const weights = new Float32Array(normals.count);
    for (let index = 0; index < normals.count; index += 1) {
      weights[index] = Math.max(0, -normals.getY(index) - 0.12);
    }
    cloned.setAttribute("downwardWeight", new THREE.BufferAttribute(weights, 1));
    const downwardSampler = new MeshSurfaceSampler(sampleMesh).setWeightAttribute(
      "downwardWeight",
    );
    (downwardSampler as DeterministicMeshSurfaceSampler).setRandomGenerator(random);
    downwardSampler.build();
    const area = samplerArea(downwardSampler);
    if (area > 0) {
      downwardArea += area;
      downward.push({ cumulativeArea: downwardArea, sampler: downwardSampler });
    }
  });

  return { all, downward, temporary };
}

function sampleSurface(
  records: readonly SamplerRecord[],
  count: number,
  random: () => number,
): FrozenSurfaceSamples {
  if (records.length === 0) throw new Error("The uploaded model has no sampleable surface.");
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const totalArea = records[records.length - 1].cumulativeArea;
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
    const targetArea = random() * totalArea;
    let low = 0;
    let high = records.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (targetArea < records[middle].cumulativeArea) high = middle;
      else low = middle + 1;
    }
    records[low].sampler.sample(position, normal);
    position.toArray(positions, sampleIndex * 3);
    normal.normalize().toArray(normals, sampleIndex * 3);
  }
  return { normals, positions };
}

function mergeSurfaceSamples(
  first: FrozenSurfaceSamples,
  second: FrozenSurfaceSamples,
): FrozenSurfaceSamples {
  const positions = new Float32Array(
    first.positions.length + second.positions.length,
  );
  const normals = new Float32Array(first.normals.length + second.normals.length);
  positions.set(first.positions);
  positions.set(second.positions, first.positions.length);
  normals.set(first.normals);
  normals.set(second.normals, first.normals.length);
  return { normals, positions };
}

function sampleImageIcicleSurface(
  records: ReturnType<typeof buildSamplerRecords>,
  count: number,
  random: () => number,
): FrozenSurfaceSamples {
  if (records.downward.length === 0) {
    return sampleSurface(records.all, count, random);
  }
  const hangingCount = Math.round(count * 0.72);
  return mergeSurfaceSamples(
    sampleSurface(records.downward, hangingCount, random),
    sampleSurface(records.all, count - hangingCount, random),
  );
}

function totalSamplerArea(records: readonly SamplerRecord[]): number {
  return records[records.length - 1]?.cumulativeArea ?? 0;
}

type FrozenObjectPreparation = Readonly<{
  imageGeometry?: FrozenPreparedModel["imageGeometry"];
  seed: string;
  sourceId: string;
  sourceKind: FrozenPreparedModel["sourceKind"];
  sourceLabel: string;
  sourceTriangleCount?: number;
}>;

export function prepareFrozenObject(
  object: THREE.Object3D,
  preparation: FrozenObjectPreparation,
): FrozenPreparedModel {
  const triangleCount = countFrozenObjectTriangles(object);
  const sourceTriangleCount = preparation.sourceTriangleCount ?? triangleCount;
  if (triangleCount === 0) throw new Error("The uploaded source has no mesh triangles.");
  if (sourceTriangleCount > frozenSourceTriangleLimit) {
    throw new Error(
      `The source has ${sourceTriangleCount.toLocaleString()} triangles; the interactive limit is ${frozenSourceTriangleLimit.toLocaleString()}.`,
    );
  }

  const normalized = normalizeModel(object);
  const materialStats = getMaterialStats(normalized);
  const bounds = new THREE.Box3().setFromObject(normalized);
  const random = seededRandom(`${preparation.seed}:${triangleCount}`);
  const records = buildSamplerRecords(normalized, random);
  try {
    const surfaceArea = totalSamplerArea(records.all);
    const icicleCount = getFrozenIcicleSampleCount(surfaceArea);
    const icicleSamples = preparation.sourceKind === "image"
      ? sampleImageIcicleSurface(records, icicleCount, random)
      : sampleSurface(
          records.downward.length > 0 ? records.downward : records.all,
          icicleCount,
          random,
        );
    return {
      bounds: { maxY: bounds.max.y, minY: bounds.min.y },
      crystalSamples: sampleSurface(
        records.all,
        getFrozenCrystalSampleCount(surfaceArea),
        random,
      ),
      icicleSamples,
      ...(preparation.imageGeometry
        ? { imageGeometry: preparation.imageGeometry }
        : {}),
      ...materialStats,
      object: normalized,
      sourceId: preparation.sourceId,
      sourceKind: preparation.sourceKind,
      sourceLabel: preparation.sourceLabel,
      sourceTriangleCount,
      surfaceArea,
      triangleCount,
    };
  } finally {
    records.temporary.forEach((geometry) => geometry.dispose());
  }
}

export async function loadFrozenModel(
  asset: ToolcraftMediaAsset,
  triangleBudget = frozenSourceTriangleLimit,
): Promise<FrozenPreparedModel> {
  const imported = await importFrozenModel(asset);
  try {
    const sourceTriangleCount = countFrozenObjectTriangles(imported.object);
    if (sourceTriangleCount > frozenSourceTriangleLimit) {
      throw new Error(
        `The source has ${sourceTriangleCount.toLocaleString()} triangles; the interactive limit is ${frozenSourceTriangleLimit.toLocaleString()}.`,
      );
    }
    if (!imported.usesSourceMaterials) applyFallbackMaterials(imported.object);
    const simplified = await simplifyFrozenObject(imported.object, triangleBudget);
    const prepared = prepareFrozenObject(imported.object, {
      seed: `${asset.id}:${asset.fileName}`,
      sourceId: `${asset.id}:${asset.fileName}:budget-${triangleBudget}`,
      sourceKind: "model",
      sourceLabel: asset.fileName,
      sourceTriangleCount: simplified.sourceTriangleCount,
    });
    prepared.object.userData.frozenResourceUrls = imported.resourceUrls;
    return prepared;
  } catch (error) {
    imported.resourceUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

export function disposeFrozenModel(model: FrozenPreparedModel): void {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  model.object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    meshMaterials.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material).forEach((value) => {
        const texture = value as THREE.Texture;
        if (texture?.isTexture && texture.userData.frozenSharedSource !== true) {
          textures.add(texture);
        }
      });
    });
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  const resourceUrls = model.object.userData.frozenResourceUrls;
  if (Array.isArray(resourceUrls)) {
    resourceUrls.forEach((url) => {
      if (typeof url === "string") URL.revokeObjectURL(url);
    });
  }
}
