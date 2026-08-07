export const frozenValueNoiseGlsl = /* glsl */ `
  float frozenHash31(vec3 point) {
    point = fract(point * 0.1031);
    point += dot(point, point.yzx + 33.33);
    return fract((point.x + point.y) * point.z);
  }

  float frozenValueNoise(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float n000 = frozenHash31(cell + vec3(0.0, 0.0, 0.0));
    float n100 = frozenHash31(cell + vec3(1.0, 0.0, 0.0));
    float n010 = frozenHash31(cell + vec3(0.0, 1.0, 0.0));
    float n110 = frozenHash31(cell + vec3(1.0, 1.0, 0.0));
    float n001 = frozenHash31(cell + vec3(0.0, 0.0, 1.0));
    float n101 = frozenHash31(cell + vec3(1.0, 0.0, 1.0));
    float n011 = frozenHash31(cell + vec3(0.0, 1.0, 1.0));
    float n111 = frozenHash31(cell + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, local.x), mix(n010, n110, local.x), local.y),
      mix(mix(n001, n101, local.x), mix(n011, n111, local.x), local.y),
      local.z
    );
  }
`;
