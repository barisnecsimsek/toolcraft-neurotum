export const SCENE_PROFILE = {
  camera: {
    far: 200,
    fov: 18,
    near: 0.1,
    position: [0, 0.12, 20.5],
  },
  directionalLight: {
    intensity: 1.15,
    position: [-3.2, 7.5, 5.8],
  },
  environment: {
    intensity: 1.1,
  },
  defaultModel: {
    curveSegments: 128,
    meshScale: 1.08,
    normalizedOuterRadius: 1.62,
    radius: 1.45,
    tube: 0.52,
    tubeSegments: 48,
  },
} as const;

export const MODEL_SIZE =
  SCENE_PROFILE.defaultModel.normalizedOuterRadius *
  SCENE_PROFILE.defaultModel.meshScale *
  2;
