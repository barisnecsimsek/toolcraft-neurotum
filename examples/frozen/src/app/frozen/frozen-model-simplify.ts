import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function geometryTriangles(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  return Math.floor((geometry.getIndex()?.count ?? position?.count ?? 0) / 3);
}

export function countFrozenObjectTriangles(object: THREE.Object3D): number {
  let triangles = 0;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) triangles += geometryTriangles(mesh.geometry);
  });
  return triangles;
}

function canSimplifyMesh(
  mesh: THREE.Mesh,
  geometryReferences: ReadonlyMap<THREE.BufferGeometry, number>,
): boolean {
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) return false;
  if ((geometryReferences.get(mesh.geometry) ?? 0) > 1) return false;
  if (Array.isArray(mesh.material) && mesh.material.length > 1) return false;
  if (Object.keys(mesh.geometry.morphAttributes).length > 0) return false;
  return geometryTriangles(mesh.geometry) >= 64;
}

function contiguousPositions(attribute: THREE.BufferAttribute): Float32Array {
  if (
    attribute.itemSize === 3 &&
    attribute.array instanceof Float32Array
  ) {
    return attribute.array;
  }
  const positions = new Float32Array(attribute.count * 3);
  for (let index = 0; index < attribute.count; index += 1) {
    positions[index * 3] = attribute.getX(index);
    positions[index * 3 + 1] = attribute.getY(index);
    positions[index * 3 + 2] = attribute.getZ(index);
  }
  return positions;
}

async function simplifyGeometry(
  geometry: THREE.BufferGeometry,
  targetTriangles: number,
): Promise<THREE.BufferGeometry> {
  const sourceTriangles = geometryTriangles(geometry);
  if (targetTriangles >= sourceTriangles) return geometry;
  const merged = mergeVertices(geometry.clone());
  const position = merged.getAttribute("position") as THREE.BufferAttribute | undefined;
  const sourceIndex = merged.getIndex();
  if (!position || !sourceIndex || position.count <= 4) {
    merged.dispose();
    return geometry;
  }
  await MeshoptSimplifier.ready;
  const targetIndexCount = Math.max(
    12,
    Math.min(sourceIndex.count, Math.floor(targetTriangles) * 3),
  );
  const [simplifiedIndex] = MeshoptSimplifier.simplify(
    new Uint32Array(sourceIndex.array),
    contiguousPositions(position),
    3,
    targetIndexCount,
    0.05,
    ["Permissive"],
  );
  if (simplifiedIndex.length >= sourceIndex.count) {
    merged.dispose();
    return geometry;
  }
  merged.setIndex(new THREE.BufferAttribute(simplifiedIndex, 1));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export type FrozenSimplificationResult = Readonly<{
  renderedTriangleCount: number;
  sourceTriangleCount: number;
}>;

export async function simplifyFrozenObject(
  object: THREE.Object3D,
  triangleBudget: number,
): Promise<FrozenSimplificationResult> {
  const sourceTriangleCount = countFrozenObjectTriangles(object);
  const boundedBudget = Math.max(1, Math.floor(triangleBudget));
  if (sourceTriangleCount <= boundedBudget) {
    return { renderedTriangleCount: sourceTriangleCount, sourceTriangleCount };
  }

  const geometryReferences = new Map<THREE.BufferGeometry, number>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    geometryReferences.set(
      mesh.geometry,
      (geometryReferences.get(mesh.geometry) ?? 0) + 1,
    );
  });
  const eligible: THREE.Mesh[] = [];
  let fixedTriangles = 0;
  let eligibleTriangles = 0;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const triangles = geometryTriangles(mesh.geometry);
    if (canSimplifyMesh(mesh, geometryReferences)) {
      eligible.push(mesh);
      eligibleTriangles += triangles;
    } else {
      fixedTriangles += triangles;
    }
  });
  const eligibleBudget = Math.max(4 * eligible.length, boundedBudget - fixedTriangles);
  if (eligible.length === 0 || eligibleBudget >= eligibleTriangles) {
    return { renderedTriangleCount: sourceTriangleCount, sourceTriangleCount };
  }

  let remainingBudget = eligibleBudget;
  let remainingTriangles = eligibleTriangles;
  for (const mesh of eligible) {
    const sourceTriangles = geometryTriangles(mesh.geometry);
    const targetTriangles = Math.max(
      4,
      Math.min(
        sourceTriangles,
        Math.round((sourceTriangles / remainingTriangles) * remainingBudget),
      ),
    );
    const previous = mesh.geometry;
    const simplified = await simplifyGeometry(previous, targetTriangles);
    if (simplified !== previous) {
      mesh.geometry = simplified;
      previous.dispose();
    }
    const renderedTriangles = geometryTriangles(mesh.geometry);
    remainingBudget = Math.max(0, remainingBudget - renderedTriangles);
    remainingTriangles = Math.max(0, remainingTriangles - sourceTriangles);
  }

  return {
    renderedTriangleCount: countFrozenObjectTriangles(object),
    sourceTriangleCount,
  };
}
