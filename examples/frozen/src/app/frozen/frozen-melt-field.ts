import * as THREE from "three";

import type { FrozenSceneSettings } from "./frozen-values";

export const frozenMeltFieldExtent = 1.2;
export const frozenMeltFieldResolution = 48;

type FrozenMeltSettings = FrozenSceneSettings["melt"];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothCompactFalloff(distance: number): number {
  const inner = clamp01(1 - distance * distance);
  return inner * inner;
}

export function getFrozenMeltBrushRadius(settings: FrozenMeltSettings): number {
  const authoredRadius = THREE.MathUtils.lerp(
    0.035,
    0.38,
    Math.pow(clamp01(settings.radius), 0.82),
  );
  return authoredRadius * (1 + clamp01(settings.heat) * 0.28);
}

export class FrozenMeltField {
  readonly resolution: number;
  readonly texture: THREE.Data3DTexture;

  private maximum = 0;
  private scratch: Float32Array;
  private textureValues: Uint8Array;
  private values: Float32Array;

  constructor(resolution = frozenMeltFieldResolution) {
    if (!Number.isInteger(resolution) || resolution < 4) {
      throw new Error("Frozen melt field resolution must be an integer of at least 4.");
    }
    this.resolution = resolution;
    const voxelCount = resolution ** 3;
    this.values = new Float32Array(voxelCount);
    this.scratch = new Float32Array(voxelCount);
    this.textureValues = new Uint8Array(voxelCount);
    this.texture = new THREE.Data3DTexture(
      this.textureValues,
      resolution,
      resolution,
      resolution,
    );
    this.texture.format = THREE.RedFormat;
    this.texture.type = THREE.UnsignedByteType;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.wrapR = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.unpackAlignment = 1;
    this.texture.needsUpdate = true;
  }

  clear(): boolean {
    if (this.maximum <= 0) return false;
    this.values.fill(0);
    this.scratch.fill(0);
    this.textureValues.fill(0);
    this.maximum = 0;
    this.texture.needsUpdate = true;
    return true;
  }

  deposit(point: THREE.Vector3, settings: FrozenMeltSettings): boolean {
    const changed = this.depositValue(point, settings);
    if (changed) this.syncTexture();
    return changed;
  }

  depositSegment(
    from: THREE.Vector3,
    to: THREE.Vector3,
    settings: FrozenMeltSettings,
  ): boolean {
    const distance = from.distanceTo(to);
    const spacing = Math.max(0.012, getFrozenMeltBrushRadius(settings) * 0.28);
    const steps = Math.max(1, Math.ceil(distance / spacing));
    const point = new THREE.Vector3();
    let changed = false;
    for (let step = 1; step <= steps; step += 1) {
      point.lerpVectors(from, to, step / steps);
      changed = this.depositValue(point, settings) || changed;
    }
    if (changed) this.syncTexture();
    return changed;
  }

  private depositValue(point: THREE.Vector3, settings: FrozenMeltSettings): boolean {
    const heat = clamp01(settings.heat);
    if (heat <= 0) return false;
    const radius = getFrozenMeltBrushRadius(settings);
    const resolution = this.resolution;
    const fieldDiameter = frozenMeltFieldExtent * 2;
    const centerX = ((point.x + frozenMeltFieldExtent) / fieldDiameter) * (resolution - 1);
    const centerY = ((point.y + frozenMeltFieldExtent) / fieldDiameter) * (resolution - 1);
    const centerZ = ((point.z + frozenMeltFieldExtent) / fieldDiameter) * (resolution - 1);
    const radiusVoxels = Math.max(1, (radius / fieldDiameter) * (resolution - 1));
    const minX = Math.max(0, Math.floor(centerX - radiusVoxels));
    const maxX = Math.min(resolution - 1, Math.ceil(centerX + radiusVoxels));
    const minY = Math.max(0, Math.floor(centerY - radiusVoxels));
    const maxY = Math.min(resolution - 1, Math.ceil(centerY + radiusVoxels));
    const minZ = Math.max(0, Math.floor(centerZ - radiusVoxels));
    const maxZ = Math.min(resolution - 1, Math.ceil(centerZ + radiusVoxels));
    const energy = 0.24 + heat * 0.76;
    let changed = false;

    for (let z = minZ; z <= maxZ; z += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const dx = (x - centerX) / radiusVoxels;
          const dy = (y - centerY) / radiusVoxels;
          const dz = (z - centerZ) / radiusVoxels;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (distance >= 1) continue;
          const index = this.index(x, y, z);
          const deposit = energy * smoothCompactFalloff(distance);
          const previous = this.values[index];
          const next = 1 - (1 - previous) * (1 - deposit);
          if (next <= previous + 1e-6) continue;
          this.values[index] = next;
          this.maximum = Math.max(this.maximum, next);
          changed = true;
        }
      }
    }
    return changed;
  }

  step(deltaSeconds: number, refreeze: number): boolean {
    const cooling = clamp01(refreeze);
    if (this.maximum <= 1 / 255 || cooling <= 0 || deltaSeconds <= 0) {
      return false;
    }
    const resolution = this.resolution;
    const diffusion = Math.min(0.16, (0.012 + cooling * 0.07) * deltaSeconds * 30);
    const decay = Math.exp(
      -(0.08 + Math.pow(cooling, 1.25) * 2.9) * deltaSeconds,
    );
    let maximum = 0;

    for (let z = 0; z < resolution; z += 1) {
      for (let y = 0; y < resolution; y += 1) {
        for (let x = 0; x < resolution; x += 1) {
          const index = this.index(x, y, z);
          const current = this.values[index];
          let neighbors = 0;
          let neighborSum = 0;
          if (x > 0) {
            neighborSum += this.values[index - 1];
            neighbors += 1;
          }
          if (x + 1 < resolution) {
            neighborSum += this.values[index + 1];
            neighbors += 1;
          }
          if (y > 0) {
            neighborSum += this.values[index - resolution];
            neighbors += 1;
          }
          if (y + 1 < resolution) {
            neighborSum += this.values[index + resolution];
            neighbors += 1;
          }
          const slice = resolution * resolution;
          if (z > 0) {
            neighborSum += this.values[index - slice];
            neighbors += 1;
          }
          if (z + 1 < resolution) {
            neighborSum += this.values[index + slice];
            neighbors += 1;
          }
          const average = neighbors > 0 ? neighborSum / neighbors : current;
          const next = Math.max(0, (current + (average - current) * diffusion) * decay);
          this.scratch[index] = next;
          maximum = Math.max(maximum, next);
        }
      }
    }

    [this.values, this.scratch] = [this.scratch, this.values];
    this.maximum = maximum;
    if (maximum <= 1 / 255) {
      this.clear();
      return true;
    }
    this.syncTexture();
    return true;
  }

  getMaximum(): number {
    return this.maximum;
  }

  sample(point: THREE.Vector3): number {
    const diameter = frozenMeltFieldExtent * 2;
    const x = Math.round(
      clamp01((point.x + frozenMeltFieldExtent) / diameter) *
        (this.resolution - 1),
    );
    const y = Math.round(
      clamp01((point.y + frozenMeltFieldExtent) / diameter) *
        (this.resolution - 1),
    );
    const z = Math.round(
      clamp01((point.z + frozenMeltFieldExtent) / diameter) *
        (this.resolution - 1),
    );
    return this.values[this.index(x, y, z)];
  }

  dispose(): void {
    this.texture.dispose();
  }

  private index(x: number, y: number, z: number): number {
    return x + y * this.resolution + z * this.resolution * this.resolution;
  }

  private syncTexture(): void {
    for (let index = 0; index < this.values.length; index += 1) {
      this.textureValues[index] = Math.round(clamp01(this.values[index]) * 255);
    }
    this.texture.needsUpdate = true;
  }
}
