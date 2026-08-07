import * as THREE from "three";

import {
  applyFrozenIceMaterial,
  applyFrozenSourceUniforms,
  augmentFrozenSourceMaterials,
  createFrozenIceMaterial,
} from "./frozen-material";
import type { FrozenPreparedModel, FrozenSurfaceSamples } from "./frozen-model";
import type { FrozenPreparedScratch } from "./frozen-texture";
import type { FrozenSceneSettings } from "./frozen-values";

const frozenCrystalGeometryRadius = 0.018;

export function getFrozenCrystalFootprintScale(
  surfaceArea: number,
  sampleCapacity: number,
  coverage: number,
  size: number,
): number {
  if (
    !Number.isFinite(surfaceArea) ||
    surfaceArea <= 0 ||
    !Number.isFinite(sampleCapacity) ||
    sampleCapacity <= 0 ||
    coverage <= 0 ||
    size <= 0
  ) {
    return 0;
  }
  const normalizedCoverage = THREE.MathUtils.clamp(coverage, 0, 1);
  const normalizedSize = THREE.MathUtils.clamp(size, 0, 1);
  const cellRadius = Math.sqrt(surfaceArea / (Math.PI * sampleCapacity));
  const closingRamp = THREE.MathUtils.smoothstep(normalizedCoverage, 0.72, 1);
  const overlap = THREE.MathUtils.lerp(0.72, 1.95, closingRamp);
  const authoredSize = 0.25 + normalizedSize * 1.8;
  const coverageSizeFloor = THREE.MathUtils.lerp(
    authoredSize,
    Math.max(1, authoredSize),
    THREE.MathUtils.smoothstep(normalizedCoverage, 0.9, 1),
  );
  return cellRadius * overlap * coverageSizeFloor / frozenCrystalGeometryRadius;
}

export type FrozenEffectResources = {
  crystalGeometry: THREE.BufferGeometry;
  crystalMaterial: THREE.MeshPhysicalMaterial;
  crystals: THREE.InstancedMesh;
  icicleGeometry: THREE.BufferGeometry;
  icicleMaterial: THREE.MeshPhysicalMaterial;
  icicles: THREE.InstancedMesh;
  lastCrystalShape: string;
  lastIcicleShape: string;
  shellGroup: THREE.Group;
  shellMaterial: THREE.MeshPhysicalMaterial;
  sourceMaterials: readonly THREE.Material[];
};

function variation(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

export type FrozenIcicleDirectionMode = "gravity" | "gravity-bent";

export type FrozenImageIcicleProfile = Readonly<{
  bend: number;
  eligible: boolean;
  lengthScale: number;
  region: "hanging" | "upward" | "wall";
}>;

type FrozenImageIcicleProfileInput = Readonly<{
  bounds: FrozenPreparedModel["bounds"];
  normalY: number;
  positionY: number;
  sampleIndex: number;
}>;

const hangingIcicleProfile: FrozenImageIcicleProfile = {
  bend: 0,
  eligible: true,
  lengthScale: 1,
  region: "hanging",
};
const upwardIcicleProfile: FrozenImageIcicleProfile = {
  bend: 0,
  eligible: false,
  lengthScale: 0,
  region: "upward",
};

export function getFrozenImageIcicleProfile({
  bounds,
  normalY,
  positionY,
  sampleIndex,
}: FrozenImageIcicleProfileInput): FrozenImageIcicleProfile {
  const gravityAlignment = THREE.MathUtils.clamp(-normalY, -1, 1);
  if (gravityAlignment < -0.15) return upwardIcicleProfile;
  if (gravityAlignment > 0.45) return hangingIcicleProfile;
  const height = THREE.MathUtils.clamp(
    (positionY - bounds.minY) / Math.max(bounds.maxY - bounds.minY, 1e-6),
    0,
    1,
  );
  const lowerWeight = 1 - THREE.MathUtils.smoothstep(height, 0.18, 0.68);
  const drainageProbability = THREE.MathUtils.lerp(0.08, 0.38, lowerWeight);
  const bendWeight = 1 - THREE.MathUtils.smoothstep(
    gravityAlignment,
    0.05,
    0.45,
  );
  return {
    bend: THREE.MathUtils.lerp(0.68, 1.08, variation(sampleIndex, 53)) *
      Math.max(0.2, bendWeight),
    eligible:
      lowerWeight > 0.03 &&
      variation(sampleIndex, 47) <= drainageProbability,
    lengthScale: THREE.MathUtils.lerp(0.16, 0.48, lowerWeight),
    region: "wall",
  };
}

export function getFrozenIcicleDirectionMode(
  sourceKind: FrozenPreparedModel["sourceKind"],
): FrozenIcicleDirectionMode {
  return sourceKind === "image" ? "gravity-bent" : "gravity";
}

export function isFrozenIcicleSampleEligible(
  sourceKind: FrozenPreparedModel["sourceKind"],
  normalY: number,
  underside: number,
): boolean {
  return sourceKind === "image" ? normalY <= 0.15 : normalY <= -underside;
}

export function setFrozenIcicleDirection(
  target: THREE.Vector3,
  _sourceKind: FrozenPreparedModel["sourceKind"],
  _normal: THREE.Vector3,
): THREE.Vector3 {
  return target.set(0, -1, 0);
}

function createInstancedMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  capacity: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 3;
  return mesh;
}

export function createFrozenCrystalGeometry(): THREE.ConeGeometry {
  const geometry = new THREE.ConeGeometry(0.018, 0.12, 4, 1);
  geometry.translate(0, 0.06, 0);
  return geometry;
}

export function createFrozenIcicleGeometry(
  capacity: number,
): THREE.ConeGeometry {
  const geometry = new THREE.ConeGeometry(0.032, 0.72, 5, 3);
  geometry.rotateZ(Math.PI);
  geometry.translate(0, -0.36, 0);
  geometry.setAttribute(
    "frozenIcicleRootDirection",
    new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3),
  );
  geometry.setAttribute(
    "frozenIcicleBend",
    new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1),
  );
  return geometry;
}

function updateCrystalInstances(
  mesh: THREE.InstancedMesh,
  samples: FrozenSurfaceSamples,
  settings: FrozenSceneSettings["crystals"],
  surfaceArea: number,
): void {
  if (settings.density === 0 || settings.size === 0) {
    mesh.count = 0;
    return;
  }
  const capacity = samples.positions.length / 3;
  const count = Math.min(Math.round(settings.density * capacity), capacity);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const baseRadius = getFrozenCrystalFootprintScale(
    surfaceArea,
    capacity,
    settings.density,
    settings.size,
  );
  const baseLength = settings.size * (0.4 + settings.elongation * 2.2);

  for (let index = 0; index < count; index += 1) {
    position.fromArray(samples.positions, index * 3);
    normal.fromArray(samples.normals, index * 3).normalize();
    quaternion.setFromUnitVectors(up, normal);
    spin.setFromAxisAngle(up, variation(index, 29) * Math.PI * 2);
    quaternion.multiply(spin);
    const radiusVariation = 1 + (variation(index, 3) - 0.5) * settings.variation;
    const lengthVariation = 1 + (variation(index, 7) - 0.5) * settings.variation * 1.4;
    scale.set(
      Math.max(0, baseRadius * radiusVariation),
      Math.max(0, baseLength * lengthVariation),
      Math.max(0, baseRadius * radiusVariation),
    );
    position.addScaledVector(normal, 0.003);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function updateIcicleInstances(
  mesh: THREE.InstancedMesh,
  model: Pick<FrozenPreparedModel, "bounds" | "icicleSamples" | "sourceKind">,
  settings: FrozenSceneSettings["icicles"],
): void {
  const rootDirections = mesh.geometry.getAttribute(
    "frozenIcicleRootDirection",
  ) as THREE.InstancedBufferAttribute;
  const bendFactors = mesh.geometry.getAttribute(
    "frozenIcicleBend",
  ) as THREE.InstancedBufferAttribute;
  const setRegionCounts = (hanging: number, wall: number) => {
    mesh.userData.frozenIcicleHangingCount = hanging;
    mesh.userData.frozenIcicleHorizontalCount = 0;
    mesh.userData.frozenIcicleWallCount = wall;
  };
  if (settings.density === 0 || settings.length === 0 || settings.radius === 0) {
    mesh.count = 0;
    setRegionCounts(0, 0);
    return;
  }
  const samples = model.icicleSamples;
  const capacity = samples.positions.length / 3;
  const profileAt = (sampleIndex: number): FrozenImageIcicleProfile => {
    if (model.sourceKind !== "image") {
      return isFrozenIcicleSampleEligible(
        model.sourceKind,
        samples.normals[sampleIndex * 3 + 1],
        settings.underside,
      )
        ? hangingIcicleProfile
        : upwardIcicleProfile;
    }
    return getFrozenImageIcicleProfile({
      bounds: model.bounds,
      normalY: samples.normals[sampleIndex * 3 + 1],
      positionY: samples.positions[sampleIndex * 3 + 1],
      sampleIndex,
    });
  };
  let eligibleCount = 0;
  for (let sampleIndex = 0; sampleIndex < capacity; sampleIndex += 1) {
    if (profileAt(sampleIndex).eligible) eligibleCount += 1;
  }
  const requestedCount = Math.round(eligibleCount * settings.density);
  if (requestedCount === 0) {
    mesh.count = 0;
    setRegionCounts(0, 0);
    return;
  }
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const normal = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const localDown = new THREE.Vector3(0, -1, 0);
  let instanceIndex = 0;
  const baseRadius = settings.radius * 1.25;
  const baseLength = settings.length * 1.15;
  let hangingCount = 0;
  let wallCount = 0;

  for (
    let sampleIndex = 0;
    sampleIndex < capacity && instanceIndex < requestedCount;
    sampleIndex += 1
  ) {
    const profile = profileAt(sampleIndex);
    if (!profile.eligible) continue;
    position.fromArray(samples.positions, sampleIndex * 3);
    normal.fromArray(samples.normals, sampleIndex * 3).normalize();
    setFrozenIcicleDirection(direction, model.sourceKind, normal);
    quaternion.setFromUnitVectors(localDown, direction);
    const radiusVariation =
      1 + (variation(sampleIndex, 11) - 0.5) * settings.variation;
    const lengthVariation =
      1 + (variation(sampleIndex, 19) - 0.5) * settings.variation * 1.6;
    scale.set(
      Math.max(0, baseRadius * radiusVariation),
      Math.max(0, baseLength * lengthVariation * profile.lengthScale),
      Math.max(0, baseRadius * radiusVariation),
    );
    position.addScaledVector(
      model.sourceKind === "image" ? normal : direction,
      0.003,
    );
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(instanceIndex, matrix);
    rootDirections.setXYZ(instanceIndex, normal.x, normal.y, normal.z);
    bendFactors.setX(instanceIndex, profile.bend);
    if (profile.region === "wall") wallCount += 1;
    else hangingCount += 1;
    instanceIndex += 1;
  }
  mesh.count = instanceIndex;
  setRegionCounts(hangingCount, wallCount);
  mesh.instanceMatrix.needsUpdate = true;
  rootDirections.needsUpdate = true;
  bendFactors.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export function createFrozenEffectResources(
  model: FrozenPreparedModel,
): FrozenEffectResources {
  const shellGroup = new THREE.Group();
  const shellMaterial = createFrozenIceMaterial();
  model.object.updateMatrixWorld(true);
  model.object.traverse((child) => {
    const sourceMesh = child as THREE.Mesh;
    if (!sourceMesh.isMesh || !sourceMesh.geometry) return;
    const shell = new THREE.Mesh(sourceMesh.geometry, shellMaterial);
    shell.matrixAutoUpdate = false;
    shell.matrix.copy(sourceMesh.matrixWorld);
    shell.renderOrder = 2;
    shellGroup.add(shell);
  });

  const crystalGeometry = createFrozenCrystalGeometry();
  const crystalMaterial = createFrozenIceMaterial();
  const crystals = createInstancedMesh(
    crystalGeometry,
    crystalMaterial,
    model.crystalSamples.positions.length / 3,
  );

  const icicleCapacity = model.icicleSamples.positions.length / 3;
  const icicleGeometry = createFrozenIcicleGeometry(icicleCapacity);
  const icicleMaterial = createFrozenIceMaterial({ icicleBend: true });
  const icicles = createInstancedMesh(
    icicleGeometry,
    icicleMaterial,
    icicleCapacity,
  );

  return {
    crystalGeometry,
    crystalMaterial,
    crystals,
    icicleGeometry,
    icicleMaterial,
    icicles,
    lastCrystalShape: "",
    lastIcicleShape: "",
    shellGroup,
    shellMaterial,
    sourceMaterials: augmentFrozenSourceMaterials(model.object),
  };
}

export function updateFrozenEffectResources(
  resources: FrozenEffectResources,
  model: FrozenPreparedModel,
  settings: FrozenSceneSettings,
  scratch: FrozenPreparedScratch | null,
  meltTexture: THREE.Data3DTexture | null,
): void {
  const modelSpan = Math.max(0.001, model.bounds.maxY - model.bounds.minY);
  const crystalShape = JSON.stringify(settings.crystals);
  if (crystalShape !== resources.lastCrystalShape) {
    updateCrystalInstances(
      resources.crystals,
      model.crystalSamples,
      settings.crystals,
      model.surfaceArea,
    );
    resources.lastCrystalShape = crystalShape;
  }
  const icicleShape = JSON.stringify([
    settings.icicles,
    getFrozenIcicleDirectionMode(model.sourceKind),
  ]);
  if (icicleShape !== resources.lastIcicleShape) {
    updateIcicleInstances(resources.icicles, model, settings.icicles);
    resources.lastIcicleShape = icicleShape;
  }

  applyFrozenSourceUniforms(resources.sourceMaterials, model, settings, meltTexture);
  applyFrozenIceMaterial(resources.shellMaterial, model, settings, scratch, meltTexture, {
    scratchDisplacement: modelSpan * settings.scratch.displacement * 0.035,
    shellDisplacement: modelSpan * settings.surface.shellThickness * 0.18,
  });
  applyFrozenIceMaterial(
    resources.crystalMaterial,
    model,
    settings,
    scratch,
    meltTexture,
  );
  applyFrozenIceMaterial(
    resources.icicleMaterial,
    model,
    settings,
    scratch,
    meltTexture,
  );
}

export function disposeFrozenEffectResources(
  resources: FrozenEffectResources,
): void {
  resources.crystalGeometry.dispose();
  resources.crystalMaterial.dispose();
  resources.icicleGeometry.dispose();
  resources.icicleMaterial.dispose();
  resources.shellMaterial.dispose();
}
