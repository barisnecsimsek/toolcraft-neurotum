import * as THREE from "three";

import { frozenIcicleVertexPrelude } from "./frozen-icicle-shader";
import { getFrozenBoundary } from "./frozen-math";
import {
  frozenMeltFunctionGlsl,
  frozenMeltUniformGlsl,
} from "./frozen-material-melt";
import { frozenMeltFieldExtent } from "./frozen-melt-field";
import {
  createFrozenShaderUniforms as createUniforms,
  type FrozenShaderUniforms,
} from "./frozen-material-uniforms";
import { frozenValueNoiseGlsl } from "./frozen-noise-shader";
import type { FrozenPreparedModel } from "./frozen-model";
import type { FrozenPreparedScratch } from "./frozen-texture";
import {
  getFrozenModelExposureMultiplier,
  type FrozenSceneSettings,
} from "./frozen-values";

type FrozenShader = Readonly<{
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
}>;

type MutableFrozenShader = {
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
};

const materialUniforms = new WeakMap<THREE.Material, FrozenShaderUniforms>();
const iceSurfaceWhite = new THREE.Color("#F4FBFF");

const blendedTransmissionFragment = THREE.ShaderChunk.transmission_fragment.replace(
  "material.transmission = transmission;",
  /* glsl */ `
    float frozenClearTransmission = sqrt(clamp(transmission, 0.0, 1.0));
    material.transmission = mix(
      frozenClearTransmission,
      transmission,
      frozenFrostMask
    );
  `,
);

const maskUniformGlsl = /* glsl */ `
  uniform float uFrozenFrontY;
  uniform float uFrozenHalfBand;
  uniform float uFrozenNoiseAmplitude;
  uniform float uFrozenNoiseScale;
`;

const maskFunctionGlsl = /* glsl */ `
  float frozenBoundaryNoise(vec3 point) {
    return 0.5 +
      sin(dot(point, vec3(1.0, 1.73, 2.41))) * 0.25 +
      sin(dot(point, vec3(-1.37, 2.11, 0.83)) + 1.9) * 0.25;
  }

  float frozenRetainedIceMask(vec3 effectPosition) {
    float disturbedY = effectPosition.y +
      (frozenBoundaryNoise(effectPosition * uFrozenNoiseScale) - 0.5) *
      uFrozenNoiseAmplitude;
    float globalRetainedIce = 1.0 - smoothstep(
      uFrozenFrontY - uFrozenHalfBand,
      uFrozenFrontY + uFrozenHalfBand,
      disturbedY
    );
    return globalRetainedIce * (1.0 - frozenLocalMeltMask(effectPosition));
  }
`;

const scratchUniformGlsl = /* glsl */ `
  uniform sampler2D uFrozenScratchMap;
  uniform float uFrozenScratchEnabled;
  uniform float uFrozenScratchScale;
  uniform float uFrozenScratchRotation;
  uniform vec2 uFrozenScratchOffset;
  uniform float uFrozenScratchInvert;
  uniform float uFrozenScratchContrast;
`;

const scratchFunctionGlsl = /* glsl */ `
  vec2 frozenRotateUv(vec2 point) {
    float sine = sin(uFrozenScratchRotation);
    float cosine = cos(uFrozenScratchRotation);
    return mat2(cosine, -sine, sine, cosine) * point + uFrozenScratchOffset;
  }

  float frozenTextureTriplanar(vec3 point, vec3 normal) {
    vec3 axis = abs(normalize(normal));
    vec3 scaled = point * uFrozenScratchScale;
    vec2 projection = axis.x > axis.y
      ? (axis.x > axis.z ? scaled.yz : scaled.xy)
      : (axis.y > axis.z ? scaled.xz : scaled.xy);
    return texture2D(uFrozenScratchMap, frozenRotateUv(projection)).r;
  }

  float frozenScratchSegment(vec2 point, float density, float seed) {
    vec2 gridPoint = point * density;
    vec2 cell = floor(gridPoint);
    vec2 local = fract(gridPoint) - 0.5;
    float gate = frozenHash31(vec3(cell, seed));
    float angle = frozenHash31(vec3(cell.yx, seed + 3.17)) * 3.14159265;
    vec2 direction = vec2(cos(angle), sin(angle));
    vec2 acrossDirection = vec2(-direction.y, direction.x);
    float offset =
      (frozenHash31(vec3(cell, seed + 8.41)) - 0.5) * 0.34;
    float across = abs(dot(local, acrossDirection) - offset);
    float along = abs(dot(local, direction));
    float halfLength = mix(
      0.1,
      0.43,
      frozenHash31(vec3(cell.yx, seed + 13.7))
    );
    float width = mix(
      0.004,
      0.016,
      frozenHash31(vec3(cell, seed + 21.3))
    );
    float stroke =
      (1.0 - smoothstep(width, width * 2.5, across)) *
      (1.0 - smoothstep(halfLength, halfLength + 0.08, along));
    return stroke * smoothstep(0.64, 0.86, gate);
  }

  float frozenProceduralScratch(vec3 point, vec3 normal) {
    vec3 axis = abs(normalize(normal));
    vec3 scaled = point * uFrozenScratchScale;
    vec2 projection = axis.x > axis.y
      ? (axis.x > axis.z ? scaled.yz : scaled.xy)
      : (axis.y > axis.z ? scaled.xz : scaled.xy);
    vec2 uv = frozenRotateUv(projection);
    float primary = frozenScratchSegment(uv, 0.42, 7.1);
    mat2 secondaryRotation = mat2(0.819, -0.574, 0.574, 0.819);
    float secondary = frozenScratchSegment(
      secondaryRotation * uv,
      0.78,
      19.3
    );
    float frost = pow(
      frozenValueNoise(vec3(uv * 0.075, 4.7)),
      7.0
    ) * 0.08;
    return clamp(max(primary, secondary * 0.66) + frost, 0.0, 1.0);
  }

  float frozenScratchSignal(vec3 point, vec3 normal) {
    float signal = uFrozenScratchEnabled > 0.5
      ? frozenTextureTriplanar(point, normal)
      : frozenProceduralScratch(point, normal);
    signal = mix(signal, 1.0 - signal, uFrozenScratchInvert);
    return clamp((signal - 0.5) * uFrozenScratchContrast + 0.5, 0.0, 1.0);
  }
`;

const materialMaskGlsl = /* glsl */ `
  uniform float uFrozenMaterialMaskCoverage;
  uniform float uFrozenMaterialMaskDistortion;
  uniform float uFrozenMaterialMaskScale;
  uniform float uFrozenMaterialMaskSeed;
  uniform float uFrozenMaterialMaskSoftness;

  vec3 frozenVoronoiHash(vec3 cell) {
    vec3 dotProducts = vec3(
      dot(cell, vec3(127.1, 311.7, 74.7)),
      dot(cell, vec3(269.5, 183.3, 246.1)),
      dot(cell, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(dotProducts + uFrozenMaterialMaskSeed) * 43758.5453);
  }

  float frozenVoronoiFrostMask(vec3 effectPosition) {
    if (uFrozenMaterialMaskCoverage <= 0.0001) return 0.0;
    if (uFrozenMaterialMaskCoverage >= 0.9999) return 1.0;
    vec3 point = effectPosition * uFrozenMaterialMaskScale + vec3(
      uFrozenMaterialMaskSeed * 0.731,
      uFrozenMaterialMaskSeed * 0.417,
      uFrozenMaterialMaskSeed * 0.193
    );
    vec3 baseCell = floor(point - 0.5);
    float nearestDistance = 10.0;
    float secondDistance = 10.0;
    float nearestValue = 0.0;
    float secondValue = 0.0;
    for (int z = 0; z <= 1; z += 1) {
      for (int y = 0; y <= 1; y += 1) {
        for (int x = 0; x <= 1; x += 1) {
          vec3 offset = vec3(float(x), float(y), float(z));
          vec3 cell = baseCell + offset;
          vec3 jitter = mix(
            vec3(0.5),
            frozenVoronoiHash(cell),
            uFrozenMaterialMaskDistortion
          );
          float distanceToCell = length(cell + jitter - point);
          float cellValue = frozenVoronoiHash(cell + vec3(19.7)).x;
          if (distanceToCell < nearestDistance) {
            secondDistance = nearestDistance;
            secondValue = nearestValue;
            nearestDistance = distanceToCell;
            nearestValue = cellValue;
          } else if (distanceToCell < secondDistance) {
            secondDistance = distanceToCell;
            secondValue = cellValue;
          }
        }
      }
    }
    float threshold = 1.0 - uFrozenMaterialMaskCoverage;
    float softness = max(0.002, uFrozenMaterialMaskSoftness * 0.24);
    float nearestMaterial = smoothstep(
      threshold - softness,
      threshold + softness,
      nearestValue
    );
    float secondMaterial = smoothstep(
      threshold - softness,
      threshold + softness,
      secondValue
    );
    float edgeWidth = 0.015 + uFrozenMaterialMaskSoftness * 0.3;
    float cellInterior = smoothstep(
      0.0,
      edgeWidth,
      secondDistance - nearestDistance
    );
    return mix(
      (nearestMaterial + secondMaterial) * 0.5,
      nearestMaterial,
      cellInterior
    );
  }
`;

const iceVertexPrelude = /* glsl */ `
  uniform mat4 uFrozenWorldToEffect;
  uniform float uFrozenShellDisplacement;
  uniform float uFrozenScratchDisplacement;
  ${scratchUniformGlsl}
  ${materialMaskGlsl}
  varying vec3 vFrozenEffectPosition;
  varying vec3 vFrozenMaskPosition;
  varying vec3 vFrozenEffectNormal;
  ${frozenValueNoiseGlsl}
  ${scratchFunctionGlsl}
`;

const sourceVertexPrelude = /* glsl */ `
  uniform mat4 uFrozenWorldToEffect;
  varying vec3 vFrozenEffectPosition;
`;

const iceFragmentPrelude = /* glsl */ `
  ${maskUniformGlsl}
  ${frozenMeltUniformGlsl}
  ${scratchUniformGlsl}
  ${materialMaskGlsl}
  uniform vec3 uFrozenClearColor;
  uniform float uFrozenScratchBump;
  uniform float uFrozenScratchRoughness;
  uniform float uFrozenRoughnessVariation;
  varying vec3 vFrozenEffectPosition;
  varying vec3 vFrozenMaskPosition;
  varying vec3 vFrozenEffectNormal;
  ${frozenValueNoiseGlsl}
  ${frozenMeltFunctionGlsl}
  ${maskFunctionGlsl}
  ${scratchFunctionGlsl}

  vec3 frozenPerturbNormalArb(
    vec3 surfacePosition,
    vec3 surfaceNormal,
    float height,
    float scale
  ) {
    vec3 sigmaX = dFdx(surfacePosition);
    vec3 sigmaY = dFdy(surfacePosition);
    vec3 r1 = cross(sigmaY, surfaceNormal);
    vec3 r2 = cross(surfaceNormal, sigmaX);
    float determinant = dot(sigmaX, r1);
    vec3 gradient = sign(determinant) *
      (dFdx(height) * r1 + dFdy(height) * r2);
    return normalize(abs(determinant) * surfaceNormal - scale * gradient);
  }
`;

const sourceFragmentPrelude = /* glsl */ `
  ${maskUniformGlsl}
  ${frozenMeltUniformGlsl}
  uniform vec3 uFrozenCoreColor;
  uniform float uFrozenSourceExposure;
  varying vec3 vFrozenEffectPosition;
  ${frozenValueNoiseGlsl}
  ${frozenMeltFunctionGlsl}
  ${maskFunctionGlsl}
`;

function augmentSourceShader(
  shader: FrozenShader,
  uniforms: FrozenShaderUniforms,
): void {
  const mutable = shader as MutableFrozenShader;
  attachUniforms(mutable, uniforms);
  mutable.vertexShader = mutable.vertexShader
    .replace("#include <common>", `#include <common>\n${sourceVertexPrelude}`)
    .replace(
      "#include <begin_vertex>",
      /* glsl */ `
        #include <begin_vertex>
        mat4 frozenSourceInstanceMatrix = mat4(1.0);
        #ifdef USE_INSTANCING
          frozenSourceInstanceMatrix = instanceMatrix;
        #endif
        vec4 frozenSourceWorldPosition =
          modelMatrix * frozenSourceInstanceMatrix * vec4(transformed, 1.0);
        vFrozenEffectPosition =
          (uFrozenWorldToEffect * frozenSourceWorldPosition).xyz;
      `,
    );
  mutable.fragmentShader = mutable.fragmentShader
    .replace("#include <common>", `#include <common>\n${sourceFragmentPrelude}`)
    .replace(
      "#include <color_fragment>",
      /* glsl */ `
        #include <color_fragment>
        float frozenCoreMask = frozenRetainedIceMask(vFrozenEffectPosition);
        diffuseColor.rgb = mix(
          diffuseColor.rgb,
          uFrozenCoreColor,
          frozenCoreMask * 0.48
        );
      `,
    )
    .replace(
      "#include <opaque_fragment>",
      /* glsl */ `
        float frozenRevealedSourceMask = 1.0 - clamp(frozenCoreMask, 0.0, 1.0);
        outgoingLight *= mix(
          1.0,
          uFrozenSourceExposure,
          frozenRevealedSourceMask
        );
        #include <opaque_fragment>
      `,
    );
}

function attachUniforms(shader: MutableFrozenShader, uniforms: FrozenShaderUniforms): void {
  Object.assign(shader.uniforms, uniforms);
}

function augmentIceShader(
  shader: FrozenShader,
  uniforms: FrozenShaderUniforms,
  icicleBend: boolean,
): void {
  const mutable = shader as MutableFrozenShader;
  attachUniforms(mutable, uniforms);
  const iciclePositionTransform = icicleBend
    ? /* glsl */ `
        #ifdef USE_INSTANCING
          transformed = frozenDeformIcicle(transformed);
        #endif
      `
    : "";
  mutable.vertexShader = mutable.vertexShader
    .replace(
      "#include <common>",
      `#include <common>\n${iceVertexPrelude}${icicleBend ? frozenIcicleVertexPrelude : ""}`,
    )
    .replace(
      "#include <beginnormal_vertex>",
      /* glsl */ `
        #include <beginnormal_vertex>
        ${icicleBend ? `
          #ifdef USE_INSTANCING
            float frozenNormalProgress = frozenIcicleProgress(position.y);
            vec3 frozenBentTangent = frozenIcicleTangent(
              frozenNormalProgress,
              frozenIcicleRootDirection,
              frozenIcicleBend
            );
            objectNormal = frozenAlignDownToTangent(
              objectNormal,
              frozenBentTangent
            );
          #endif
        ` : ""}
      `,
    )
    .replace(
      "#include <begin_vertex>",
      /* glsl */ `
        #include <begin_vertex>
        ${iciclePositionTransform}
        mat4 frozenInstanceMatrix = mat4(1.0);
        #ifdef USE_INSTANCING
          frozenInstanceMatrix = instanceMatrix;
        #endif
        mat4 frozenWorldMatrix = modelMatrix * frozenInstanceMatrix;
        vec4 frozenBaseWorldPosition = frozenWorldMatrix * vec4(transformed, 1.0);
        mat3 frozenWorldNormalMatrix = transpose(inverse(mat3(frozenWorldMatrix)));
        vec3 frozenBaseWorldNormal = normalize(frozenWorldNormalMatrix * objectNormal);
        vec3 frozenBaseEffectPosition =
          (uFrozenWorldToEffect * frozenBaseWorldPosition).xyz;
        vec4 frozenMaskWorldPosition = frozenBaseWorldPosition;
        #ifdef USE_INSTANCING
          frozenMaskWorldPosition =
            modelMatrix * frozenInstanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #endif
        vec3 frozenBaseEffectNormal = normalize(
          mat3(uFrozenWorldToEffect) * frozenBaseWorldNormal
        );
        float frozenRelief = frozenScratchSignal(
          frozenBaseEffectPosition,
          frozenBaseEffectNormal
        ) - 0.5;
        float frozenVertexFrostMask = frozenVoronoiFrostMask(
          frozenBaseEffectPosition
        );
        transformed += normalize(objectNormal) *
          (
            uFrozenShellDisplacement +
            frozenRelief * uFrozenScratchDisplacement * frozenVertexFrostMask
          );
        vFrozenEffectPosition = frozenBaseEffectPosition;
        vFrozenMaskPosition =
          (uFrozenWorldToEffect * frozenMaskWorldPosition).xyz;
        vFrozenEffectNormal = frozenBaseEffectNormal;
      `,
    );
  mutable.fragmentShader = mutable.fragmentShader
    .replace("#include <common>", `#include <common>\n${iceFragmentPrelude}`)
    .replace(
      "#include <roughnessmap_fragment>",
      /* glsl */ `
        #include <roughnessmap_fragment>
        float frozenIceMask = frozenRetainedIceMask(vFrozenMaskPosition);
        if (frozenIceMask < 0.005) discard;
        float frozenScratchValue = frozenScratchSignal(
          vFrozenEffectPosition,
          vFrozenEffectNormal
        );
        float frozenFrostMask = frozenVoronoiFrostMask(vFrozenMaskPosition);
        float frozenRoughnessNoise = 0.5 +
          sin(dot(vFrozenEffectPosition, vec3(5.0, 8.65, 12.05))) * 0.5;
        float frozenFrostRoughness = clamp(
          roughnessFactor +
          (frozenRoughnessNoise - 0.5) * uFrozenRoughnessVariation +
          (frozenScratchValue - 0.5) * uFrozenScratchRoughness,
          0.02,
          1.0
        );
        float frozenClearRoughness = clamp(
          roughnessFactor * 0.18 + 0.025,
          0.025,
          0.22
        );
        roughnessFactor = mix(
          frozenClearRoughness,
          frozenFrostRoughness,
          frozenFrostMask
        );
        diffuseColor.rgb = mix(
          uFrozenClearColor,
          diffuseColor.rgb,
          frozenFrostMask
        );
      `,
    )
    .replace(
      "#include <normal_fragment_maps>",
      /* glsl */ `
        #include <normal_fragment_maps>
        if (uFrozenScratchBump > 0.0001) {
          normal = frozenPerturbNormalArb(
            -vViewPosition,
            normal,
            frozenScratchValue,
            uFrozenScratchBump * frozenFrostMask
          );
        }
      `,
    )
    .replace("#include <transmission_fragment>", blendedTransmissionFragment)
    .replace(
      "#include <opaque_fragment>",
      /* glsl */ `
        diffuseColor.a *= smoothstep(0.01, 0.3, frozenIceMask);
        #include <opaque_fragment>
      `,
    );
}

export function createFrozenIceMaterial(
  options: Readonly<{ icicleBend?: boolean }> = {},
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    attenuationColor: new THREE.Color("#A7E5FF"),
    attenuationDistance: 1.35,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    color: iceSurfaceWhite.clone(),
    depthWrite: true,
    envMapIntensity: 1.35,
    ior: 1.45,
    metalness: 0,
    opacity: 1,
    roughness: 0.26,
    side: THREE.DoubleSide,
    thickness: 0.22,
    transmission: 0,
    transparent: true,
  });
  const uniforms = createUniforms();
  const icicleBend = options.icicleBend === true;
  materialUniforms.set(material, uniforms);
  material.onBeforeCompile = (shader) =>
    augmentIceShader(shader, uniforms, icicleBend);
  material.customProgramCacheKey = () =>
    `frozen-physical-ice-v12:${icicleBend ? "gravity-bent" : "rigid"}`;
  return material;
}

function augmentSourceMaterial(material: THREE.Material): void {
  if (materialUniforms.has(material)) return;
  const uniforms = createUniforms();
  materialUniforms.set(material, uniforms);
  const previousCompile = material.onBeforeCompile;
  const previousCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    augmentSourceShader(shader, uniforms);
  };
  material.customProgramCacheKey = () =>
    `${previousCacheKey()}:frozen-source-core-v5`;
  material.needsUpdate = true;
}

export function augmentFrozenSourceMaterials(
  object: THREE.Object3D,
): readonly THREE.Material[] {
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    meshMaterials.forEach((material) => {
      if (!material) return;
      if (material.userData.frozenPreserveSourceColor === true) return;
      augmentSourceMaterial(material);
      materials.add(material);
    });
  });
  return [...materials];
}

function updateSharedUniforms(
  material: THREE.Material,
  model: FrozenPreparedModel,
  settings: FrozenSceneSettings,
  scratch: FrozenPreparedScratch | null,
  meltTexture: THREE.Data3DTexture | null,
): FrozenShaderUniforms {
  const uniforms = materialUniforms.get(material);
  if (!uniforms) throw new Error("Frozen shader uniforms were not registered.");
  const boundary = getFrozenBoundary(model, settings);
  uniforms.uFrozenFrontY.value = boundary.frontY;
  uniforms.uFrozenHalfBand.value = boundary.halfBand;
  uniforms.uFrozenNoiseAmplitude.value = boundary.noiseAmplitude;
  uniforms.uFrozenNoiseScale.value = settings.mask.noiseScale;
  uniforms.uFrozenMaterialMaskCoverage.value = settings.materialMask.coverage;
  uniforms.uFrozenMaterialMaskDistortion.value = settings.materialMask.distortion;
  uniforms.uFrozenMaterialMaskScale.value = settings.materialMask.scale;
  uniforms.uFrozenMaterialMaskSeed.value = settings.materialMask.seed;
  uniforms.uFrozenMaterialMaskSoftness.value = settings.materialMask.softness;
  uniforms.uFrozenMeltEnabled.value = meltTexture ? 1 : 0;
  uniforms.uFrozenMeltExtent.value = frozenMeltFieldExtent;
  uniforms.uFrozenMeltMap.value = meltTexture;
  uniforms.uFrozenMeltStructure.value = settings.melt.structure;
  uniforms.uFrozenScratchBump.value = settings.scratch.bump;
  uniforms.uFrozenScratchContrast.value = settings.scratch.contrast;
  uniforms.uFrozenScratchEnabled.value = scratch ? 1 : 0;
  uniforms.uFrozenScratchInvert.value = settings.scratch.invert ? 1 : 0;
  uniforms.uFrozenScratchMap.value = scratch?.texture ?? null;
  uniforms.uFrozenScratchOffset.value.set(
    settings.scratch.offset.x,
    settings.scratch.offset.y,
  );
  uniforms.uFrozenScratchRotation.value = settings.scratch.rotation;
  uniforms.uFrozenScratchRoughness.value = settings.scratch.roughness;
  uniforms.uFrozenScratchScale.value = settings.scratch.scale;
  uniforms.uFrozenSourceExposure.value =
    model.sourceKind === "model"
      ? getFrozenModelExposureMultiplier(settings.sourceMaterial.exposure)
      : 1;
  uniforms.uFrozenRoughnessVariation.value = settings.surface.roughnessVariation;
  uniforms.uFrozenCoreColor.value.set(settings.surface.color);
  uniforms.uFrozenClearColor.value
    .set(settings.surface.color)
    .multiplyScalar(0.62);
  uniforms.uFrozenWorldToEffect.value.identity();
  return uniforms;
}

export function applyFrozenSourceUniforms(
  materials: readonly THREE.Material[],
  _model: FrozenPreparedModel,
  settings: FrozenSceneSettings,
  meltTexture: THREE.Data3DTexture | null = null,
): void {
  materials.forEach((material) => {
    updateSharedUniforms(material, _model, settings, null, meltTexture);
    if ("envMapIntensity" in material) {
      (material as THREE.MeshStandardMaterial).envMapIntensity =
        settings.lighting.environmentIntensity;
    }
  });
}

export function applyFrozenIceMaterial(
  material: THREE.MeshPhysicalMaterial,
  model: FrozenPreparedModel,
  settings: FrozenSceneSettings,
  scratch: FrozenPreparedScratch | null,
  meltTexture: THREE.Data3DTexture | null = null,
  options: Readonly<{
    scratchDisplacement?: number;
    shellDisplacement?: number;
  }> = {},
): void {
  const uniforms = updateSharedUniforms(
    material,
    model,
    settings,
    scratch,
    meltTexture,
  );
  uniforms.uFrozenScratchDisplacement.value = options.scratchDisplacement ?? 0;
  uniforms.uFrozenShellDisplacement.value = options.shellDisplacement ?? 0;
  material.color.set(settings.surface.color).lerp(iceSurfaceWhite, 0.58);
  material.attenuationColor.set(settings.surface.color);
  material.attenuationDistance = 1.35;
  material.clearcoat = 0.35;
  material.clearcoatRoughness = 0.12;
  material.depthWrite = true;
  material.envMapIntensity = settings.lighting.environmentIntensity;
  material.ior = settings.surface.ior;
  material.opacity = 1;
  material.roughness = settings.surface.roughness;
  material.thickness = Math.max(0.06, settings.surface.shellThickness * 3.2);
  material.transmission = settings.surface.transmission;
  material.userData.frozenMaterialBlend = "voronoi-two-lobe";
}
