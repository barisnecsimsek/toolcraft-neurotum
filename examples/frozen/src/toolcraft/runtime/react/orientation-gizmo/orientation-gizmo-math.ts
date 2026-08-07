import {
  ToolcraftOrientationQuaternion,
  applyOrientationQuaternion,
  crossOrientationVectors,
  dotOrientationVectors,
  getOrientationQuaternionFromBasis,
  getOrientationQuaternionFromUnitVectors,
  getOrientationVectorLength,
  normalizeOrientationVector,
  scaleOrientationVector,
  type ToolcraftOrientationVector,
} from "./orientation-quaternion";

export { ToolcraftOrientationQuaternion } from "./orientation-quaternion";

export type ToolcraftOrientationPose = Readonly<{
  position: readonly [number, number, number];
  up: readonly [number, number, number];
}>;

export type ToolcraftOrientationAxis = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

export type ToolcraftOrientationAxisProjection = {
  axis: ToolcraftOrientationAxis;
  depth: number;
  isFrontFacing: boolean;
  x: number;
  y: number;
};

export const DEFAULT_TOOLCRAFT_ORIENTATION_POSE: ToolcraftOrientationPose = {
  position: [0, 0, 5],
  up: [0, 1, 0],
};

export const TOOLCRAFT_ORIENTATION_AXES: readonly ToolcraftOrientationAxis[] = [
  "+x",
  "-x",
  "+y",
  "-y",
  "+z",
  "-z",
];

const worldUp: ToolcraftOrientationVector = [0, 1, 0];
const minimumLengthSquared = 1e-12;
const minimumGizmoLocalZ = 1e-4;
const polarEpsilon = 1e-6;

const axisVectors: Record<
  ToolcraftOrientationAxis,
  ToolcraftOrientationVector
> = {
  "+x": [1, 0, 0],
  "-x": [-1, 0, 0],
  "+y": [0, 1, 0],
  "-y": [0, -1, 0],
  "+z": [0, 0, 1],
  "-z": [0, 0, -1],
};

function clonePose(pose: ToolcraftOrientationPose): ToolcraftOrientationPose {
  return {
    position: [...pose.position],
    up: [...pose.up],
  };
}

function readFiniteTuple(value: unknown): [number, number, number] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  ) {
    return null;
  }

  return [value[0], value[1], value[2]];
}

function isUsablePose(pose: ToolcraftOrientationPose): boolean {
  const positionLength = getOrientationVectorLength(pose.position);
  const upLength = getOrientationVectorLength(pose.up);
  const crossLength = getOrientationVectorLength(
    crossOrientationVectors(pose.up, pose.position),
  );

  return (
    positionLength * positionLength > minimumLengthSquared &&
    upLength * upLength > minimumLengthSquared &&
    crossLength * crossLength > minimumLengthSquared
  );
}

export function readToolcraftOrientationPose(
  value: unknown,
  fallback: ToolcraftOrientationPose = DEFAULT_TOOLCRAFT_ORIENTATION_POSE,
): ToolcraftOrientationPose {
  const safeFallback = isUsablePose(fallback)
    ? fallback
    : DEFAULT_TOOLCRAFT_ORIENTATION_POSE;

  if (!value || typeof value !== "object") {
    return clonePose(safeFallback);
  }

  const record = value as Record<string, unknown>;
  const position = readFiniteTuple(record.position);
  const up = readFiniteTuple(record.up);

  if (!position || !up) {
    return clonePose(safeFallback);
  }

  const pose = { position, up };

  return isUsablePose(pose) ? clonePose(pose) : clonePose(safeFallback);
}

export function getToolcraftOrientationRadius(
  pose: ToolcraftOrientationPose,
): number {
  return getOrientationVectorLength(pose.position);
}

export function getToolcraftOrientationPoseFromPointerDelta(
  poseValue: ToolcraftOrientationPose,
  deltaX: number,
  deltaY: number,
  viewportHeight: number,
): ToolcraftOrientationPose {
  const pose = readToolcraftOrientationPose(poseValue);

  if (
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0
  ) {
    return pose;
  }

  const up = normalizeOrientationVector(pose.up);
  const alignUpToY = getOrientationQuaternionFromUnitVectors(up, worldUp);
  const restoreAuthoredUp = alignUpToY.clone().invert();
  const alignedPosition = applyOrientationQuaternion(pose.position, alignUpToY);
  const radius = getOrientationVectorLength(alignedPosition);
  const theta =
    Math.atan2(alignedPosition[0], alignedPosition[2]) -
    (Math.PI * deltaX) / viewportHeight;
  const currentPhi = Math.acos(
    Math.max(-1, Math.min(1, alignedPosition[1] / radius)),
  );
  const phi = Math.max(
    polarEpsilon,
    Math.min(
      Math.PI - polarEpsilon,
      currentPhi - (Math.PI * deltaY) / viewportHeight,
    ),
  );
  const sinPhiRadius = Math.sin(phi) * radius;
  const nextAlignedPosition: ToolcraftOrientationVector = [
    sinPhiRadius * Math.sin(theta),
    Math.cos(phi) * radius,
    sinPhiRadius * Math.cos(theta),
  ];

  return {
    position: applyOrientationQuaternion(
      nextAlignedPosition,
      restoreAuthoredUp,
    ),
    up,
  };
}

export function getToolcraftOrientationCameraQuaternion(
  poseValue: ToolcraftOrientationPose,
): ToolcraftOrientationQuaternion {
  const pose = readToolcraftOrientationPose(poseValue);
  const back = normalizeOrientationVector(pose.position);
  const right = normalizeOrientationVector(
    crossOrientationVectors(pose.up, back),
  );
  const cameraUp = normalizeOrientationVector(
    crossOrientationVectors(back, right),
  );

  return getOrientationQuaternionFromBasis(right, cameraUp, back);
}

export function getToolcraftOrientationPoseFromGizmoPointer(
  poseValue: ToolcraftOrientationPose,
  axis: ToolcraftOrientationAxis,
  pointerX: number,
  pointerY: number,
  center: number,
  reach: number,
  cameraLocalZSign: -1 | 1,
): ToolcraftOrientationPose {
  const pose = readToolcraftOrientationPose(poseValue);

  if (
    !Number.isFinite(pointerX) ||
    !Number.isFinite(pointerY) ||
    !Number.isFinite(center) ||
    !Number.isFinite(reach) ||
    reach <= 0 ||
    (cameraLocalZSign !== -1 && cameraLocalZSign !== 1)
  ) {
    return pose;
  }

  let localX = (pointerX - center) / reach;
  let localY = (center - pointerY) / reach;
  const radialLength = Math.hypot(localX, localY);
  const maximumRadialLength = Math.sqrt(1 - minimumGizmoLocalZ ** 2);

  if (radialLength > maximumRadialLength) {
    const scale = maximumRadialLength / radialLength;
    localX *= scale;
    localY *= scale;
  }

  const targetLocalAxis = normalizeOrientationVector([
    localX,
    localY,
    cameraLocalZSign *
      Math.sqrt(
        Math.max(
          minimumGizmoLocalZ ** 2,
          1 - localX * localX - localY * localY,
        ),
      ),
  ]);
  const cameraQuaternion = getToolcraftOrientationCameraQuaternion(pose);
  const currentLocalAxis = normalizeOrientationVector(
    applyOrientationQuaternion(
      axisVectors[axis],
      cameraQuaternion.clone().invert(),
    ),
  );
  const localCorrection = getOrientationQuaternionFromUnitVectors(
    targetLocalAxis,
    currentLocalAxis,
  );
  const nextCameraQuaternion = cameraQuaternion
    .clone()
    .multiply(localCorrection)
    .normalize();
  const radius = getToolcraftOrientationRadius(pose);

  return {
    position: applyOrientationQuaternion([0, 0, radius], nextCameraQuaternion),
    up: normalizeOrientationVector(
      applyOrientationQuaternion([0, 1, 0], nextCameraQuaternion),
    ),
  };
}

export function projectToolcraftOrientationAxes(
  poseValue: ToolcraftOrientationPose,
  center = 35,
  reach = 24.5,
): ToolcraftOrientationAxisProjection[] {
  const pose = readToolcraftOrientationPose(poseValue);
  const cameraQuaternion = getToolcraftOrientationCameraQuaternion(pose);
  const right = applyOrientationQuaternion([1, 0, 0], cameraQuaternion);
  const up = applyOrientationQuaternion([0, 1, 0], cameraQuaternion);
  const forward = applyOrientationQuaternion([0, 0, -1], cameraQuaternion);

  return TOOLCRAFT_ORIENTATION_AXES.map((axis) => {
    const vector = axisVectors[axis];
    const depth = dotOrientationVectors(vector, forward);

    return {
      axis,
      depth,
      isFrontFacing: depth < 0,
      x: center + dotOrientationVectors(vector, right) * reach,
      y: center - dotOrientationVectors(vector, up) * reach,
    };
  });
}

export function snapToolcraftOrientationPose(
  poseValue: ToolcraftOrientationPose,
  axis: ToolcraftOrientationAxis,
): ToolcraftOrientationPose {
  const radius = getToolcraftOrientationRadius(
    readToolcraftOrientationPose(poseValue),
  );

  switch (axis) {
    case "+x":
      return { position: [radius, 0, 0], up: [0, 1, 0] };
    case "-x":
      return { position: [-radius, 0, 0], up: [0, 1, 0] };
    case "+y":
      return { position: [0, radius, 0], up: [0, 0, -1] };
    case "-y":
      return { position: [0, -radius, 0], up: [0, 0, 1] };
    case "+z":
      return { position: [0, 0, radius], up: [0, 1, 0] };
    case "-z":
      return { position: [0, 0, -radius], up: [0, 1, 0] };
  }
}

export function easeToolcraftOrientationSnap(progress: number): number {
  const value = Math.max(0, Math.min(1, progress));

  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

export function interpolateToolcraftOrientationPose(
  startValue: ToolcraftOrientationPose,
  endValue: ToolcraftOrientationPose,
  progress: number,
): ToolcraftOrientationPose {
  const start = readToolcraftOrientationPose(startValue);
  const end = readToolcraftOrientationPose(endValue, start);
  const radius = getToolcraftOrientationRadius(start);
  const quaternion = getToolcraftOrientationCameraQuaternion(start).slerp(
    getToolcraftOrientationCameraQuaternion(end),
    Math.max(0, Math.min(1, progress)),
  );

  return {
    position: applyOrientationQuaternion([0, 0, radius], quaternion),
    up: normalizeOrientationVector(
      applyOrientationQuaternion([0, 1, 0], quaternion),
    ),
  };
}
