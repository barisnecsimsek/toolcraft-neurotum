import * as THREE from "three";

import { frozenMeltFieldExtent } from "./frozen-melt-field";

export type FrozenShaderUniforms = Readonly<{
  uFrozenClearColor: THREE.IUniform<THREE.Color>;
  uFrozenCoreColor: THREE.IUniform<THREE.Color>;
  uFrozenFrontY: THREE.IUniform<number>;
  uFrozenHalfBand: THREE.IUniform<number>;
  uFrozenMaterialMaskCoverage: THREE.IUniform<number>;
  uFrozenMaterialMaskDistortion: THREE.IUniform<number>;
  uFrozenMaterialMaskScale: THREE.IUniform<number>;
  uFrozenMaterialMaskSeed: THREE.IUniform<number>;
  uFrozenMaterialMaskSoftness: THREE.IUniform<number>;
  uFrozenMeltEnabled: THREE.IUniform<number>;
  uFrozenMeltExtent: THREE.IUniform<number>;
  uFrozenMeltMap: THREE.IUniform<THREE.Data3DTexture | null>;
  uFrozenMeltStructure: THREE.IUniform<number>;
  uFrozenNoiseAmplitude: THREE.IUniform<number>;
  uFrozenNoiseScale: THREE.IUniform<number>;
  uFrozenRoughnessVariation: THREE.IUniform<number>;
  uFrozenScratchBump: THREE.IUniform<number>;
  uFrozenScratchContrast: THREE.IUniform<number>;
  uFrozenScratchDisplacement: THREE.IUniform<number>;
  uFrozenScratchEnabled: THREE.IUniform<number>;
  uFrozenScratchInvert: THREE.IUniform<number>;
  uFrozenScratchMap: THREE.IUniform<THREE.Texture | null>;
  uFrozenScratchOffset: THREE.IUniform<THREE.Vector2>;
  uFrozenScratchRotation: THREE.IUniform<number>;
  uFrozenScratchRoughness: THREE.IUniform<number>;
  uFrozenScratchScale: THREE.IUniform<number>;
  uFrozenShellDisplacement: THREE.IUniform<number>;
  uFrozenSourceExposure: THREE.IUniform<number>;
  uFrozenWorldToEffect: THREE.IUniform<THREE.Matrix4>;
}>;

export function createFrozenShaderUniforms(): FrozenShaderUniforms {
  return {
    uFrozenClearColor: { value: new THREE.Color("#87CBE8") },
    uFrozenCoreColor: { value: new THREE.Color("#C5EFFF") },
    uFrozenFrontY: { value: 1.3 },
    uFrozenHalfBand: { value: 0.1 },
    uFrozenMaterialMaskCoverage: { value: 0.55 },
    uFrozenMaterialMaskDistortion: { value: 0.65 },
    uFrozenMaterialMaskScale: { value: 5 },
    uFrozenMaterialMaskSeed: { value: 17 },
    uFrozenMaterialMaskSoftness: { value: 0.18 },
    uFrozenMeltEnabled: { value: 0 },
    uFrozenMeltExtent: { value: frozenMeltFieldExtent },
    uFrozenMeltMap: { value: null },
    uFrozenMeltStructure: { value: 0.64 },
    uFrozenNoiseAmplitude: { value: 0.18 },
    uFrozenNoiseScale: { value: 3.5 },
    uFrozenRoughnessVariation: { value: 0.38 },
    uFrozenScratchBump: { value: 0.32 },
    uFrozenScratchContrast: { value: 1.2 },
    uFrozenScratchDisplacement: { value: 0 },
    uFrozenScratchEnabled: { value: 0 },
    uFrozenScratchInvert: { value: 0 },
    uFrozenScratchMap: { value: null },
    uFrozenScratchOffset: { value: new THREE.Vector2() },
    uFrozenScratchRotation: { value: 0 },
    uFrozenScratchRoughness: { value: 0.3 },
    uFrozenScratchScale: { value: 50 },
    uFrozenShellDisplacement: { value: 0 },
    uFrozenSourceExposure: { value: 1 },
    uFrozenWorldToEffect: { value: new THREE.Matrix4() },
  };
}
