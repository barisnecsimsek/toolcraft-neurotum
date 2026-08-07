export const frozenMeltUniformGlsl = /* glsl */ `
  precision highp sampler3D;
  uniform sampler3D uFrozenMeltMap;
  uniform float uFrozenMeltEnabled;
  uniform float uFrozenMeltExtent;
  uniform float uFrozenMeltStructure;
`;

export const frozenMeltFunctionGlsl = /* glsl */ `
  float frozenLocalMeltMask(vec3 effectPosition) {
    if (uFrozenMeltEnabled < 0.5) return 0.0;
    vec3 fieldUv = effectPosition / (uFrozenMeltExtent * 2.0) + 0.5;
    if (
      any(lessThan(fieldUv, vec3(0.0))) ||
      any(greaterThan(fieldUv, vec3(1.0)))
    ) return 0.0;
    float temperature = texture(uFrozenMeltMap, fieldUv).r;
    float broadStructure = frozenValueNoise(
      effectPosition * 17.0 + vec3(3.7, 11.9, 5.2)
    );
    float fineStructure = frozenValueNoise(
      effectPosition * 61.0 + vec3(19.3, 2.1, 37.7)
    );
    float structure = broadStructure * 0.68 + fineStructure * 0.32;
    float threshold = 0.36 +
      (structure - 0.5) * uFrozenMeltStructure * 0.5;
    float softness = mix(0.17, 0.055, uFrozenMeltStructure);
    return smoothstep(
      threshold - softness,
      threshold + softness,
      temperature
    );
  }
`;
