import * as THREE from "three";

export type LiquidMetalOrbitPose = {
  position: [number, number, number];
  up: [number, number, number];
};

export type LiquidMetalOrbitAxis = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

export type LiquidMetalOrbitAxisProjection = {
  axis: LiquidMetalOrbitAxis;
  depth: number;
  isFrontFacing: boolean;
  x: number;
  y: number;
};

export const DEFAULT_LIQUID_METAL_ORBIT_POSE: LiquidMetalOrbitPose = {
  position: [
    -1.2365748457148928,
    -1.3347790929484664,
    4.224836970105814,
  ],
  up: [0, 1, 0],
};

export const LIQUID_METAL_ORBIT_AXES: readonly LiquidMetalOrbitAxis[] = [
  "+x",
  "-x",
  "+y",
  "-y",
  "+z",
  "-z",
];

const target = new THREE.Vector3(0, 0, 0);
const worldUp = new THREE.Vector3(0, 1, 0);
const minimumLengthSquared = 1e-12;
const minimumGizmoLocalZ = 1e-4;
const polarEpsilon = 1e-6;

const axisVectors: Record<LiquidMetalOrbitAxis, THREE.Vector3> = {
  "+x": new THREE.Vector3(1, 0, 0),
  "-x": new THREE.Vector3(-1, 0, 0),
  "+y": new THREE.Vector3(0, 1, 0),
  "-y": new THREE.Vector3(0, -1, 0),
  "+z": new THREE.Vector3(0, 0, 1),
  "-z": new THREE.Vector3(0, 0, -1),
};

function clonePose(pose: LiquidMetalOrbitPose): LiquidMetalOrbitPose {
  return {
    position: [...pose.position],
    up: [...pose.up],
  };
}

function readFiniteTuple(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (
    !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  ) {
    return null;
  }

  return [value[0], value[1], value[2]];
}

function isUsablePose(pose: LiquidMetalOrbitPose): boolean {
  const position = new THREE.Vector3(...pose.position);
  const up = new THREE.Vector3(...pose.up);

  if (
    position.lengthSq() <= minimumLengthSquared ||
    up.lengthSq() <= minimumLengthSquared
  ) {
    return false;
  }

  return (
    new THREE.Vector3().crossVectors(up, position).lengthSq() >
    minimumLengthSquared
  );
}

export function readLiquidMetalOrbitPose(
  value: unknown,
  fallback: LiquidMetalOrbitPose = DEFAULT_LIQUID_METAL_ORBIT_POSE,
): LiquidMetalOrbitPose {
  const safeFallback = isUsablePose(fallback)
    ? fallback
    : DEFAULT_LIQUID_METAL_ORBIT_POSE;

  if (!value || typeof value !== "object") return clonePose(safeFallback);

  const record = value as Record<string, unknown>;
  const position = readFiniteTuple(record.position);
  const up = readFiniteTuple(record.up);

  if (!position || !up) return clonePose(safeFallback);

  const pose = { position, up };
  return isUsablePose(pose) ? clonePose(pose) : clonePose(safeFallback);
}

export function getLiquidMetalOrbitRadius(pose: LiquidMetalOrbitPose): number {
  return new THREE.Vector3(...pose.position).distanceTo(target);
}

export function getLiquidMetalOrbitPoseFromPointerDelta(
  poseValue: LiquidMetalOrbitPose,
  deltaX: number,
  deltaY: number,
  viewportHeight: number,
): LiquidMetalOrbitPose {
  const pose = readLiquidMetalOrbitPose(poseValue);

  if (
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0
  ) {
    return pose;
  }

  const position = new THREE.Vector3(...pose.position);
  const up = new THREE.Vector3(...pose.up).normalize();
  const alignUpToY = new THREE.Quaternion().setFromUnitVectors(up, worldUp);
  const restoreAuthoredUp = alignUpToY.clone().invert();
  const offset = position.clone().applyQuaternion(alignUpToY);
  const spherical = new THREE.Spherical().setFromVector3(offset);

  spherical.theta -= (Math.PI * deltaX) / viewportHeight;
  spherical.phi -= (Math.PI * deltaY) / viewportHeight;
  spherical.phi = Math.max(
    polarEpsilon,
    Math.min(Math.PI - polarEpsilon, spherical.phi),
  );

  position.setFromSpherical(spherical).applyQuaternion(restoreAuthoredUp);

  return {
    position: position.toArray(),
    up: up.toArray(),
  };
}

export function getLiquidMetalOrbitPoseFromGizmoPointer(
  poseValue: LiquidMetalOrbitPose,
  axis: LiquidMetalOrbitAxis,
  pointerX: number,
  pointerY: number,
  center: number,
  reach: number,
  cameraLocalZSign: -1 | 1,
): LiquidMetalOrbitPose {
  const pose = readLiquidMetalOrbitPose(poseValue);

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
    const radialScale = maximumRadialLength / radialLength;
    localX *= radialScale;
    localY *= radialScale;
  }

  const targetLocalAxis = new THREE.Vector3(
    localX,
    localY,
    cameraLocalZSign *
      Math.sqrt(
        Math.max(
          minimumGizmoLocalZ ** 2,
          1 - localX * localX - localY * localY,
        ),
      ),
  ).normalize();
  const cameraQuaternion = getLiquidMetalOrbitCameraQuaternion(pose);
  const currentLocalAxis = axisVectors[axis]
    .clone()
    .applyQuaternion(cameraQuaternion.clone().invert())
    .normalize();
  const localCorrection = new THREE.Quaternion().setFromUnitVectors(
    targetLocalAxis,
    currentLocalAxis,
  );
  const nextCameraQuaternion = cameraQuaternion
    .clone()
    .multiply(localCorrection)
    .normalize();
  const radius = getLiquidMetalOrbitRadius(pose);

  return {
    position: new THREE.Vector3(0, 0, radius)
      .applyQuaternion(nextCameraQuaternion)
      .toArray(),
    up: new THREE.Vector3(0, 1, 0)
      .applyQuaternion(nextCameraQuaternion)
      .normalize()
      .toArray(),
  };
}

export function getLiquidMetalOrbitCameraQuaternion(
  poseValue: LiquidMetalOrbitPose,
): THREE.Quaternion {
  const pose = readLiquidMetalOrbitPose(poseValue);
  const rotation = new THREE.Matrix4().lookAt(
    new THREE.Vector3(...pose.position),
    target,
    new THREE.Vector3(...pose.up).normalize(),
  );

  return new THREE.Quaternion().setFromRotationMatrix(rotation).normalize();
}

export function projectLiquidMetalOrbitAxes(
  pose: LiquidMetalOrbitPose,
  center = 35,
  reach = 24.5,
): LiquidMetalOrbitAxisProjection[] {
  const cameraQuaternion = getLiquidMetalOrbitCameraQuaternion(pose);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);

  return LIQUID_METAL_ORBIT_AXES.map((axis) => {
    const vector = axisVectors[axis];
    const depth = vector.dot(forward);

    return {
      axis,
      depth,
      isFrontFacing: depth < 0,
      x: center + vector.dot(right) * reach,
      y: center - vector.dot(up) * reach,
    };
  });
}

export function snapLiquidMetalOrbitPose(
  poseValue: LiquidMetalOrbitPose,
  axis: LiquidMetalOrbitAxis,
): LiquidMetalOrbitPose {
  const radius = getLiquidMetalOrbitRadius(readLiquidMetalOrbitPose(poseValue));

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

export function easeLiquidMetalOrbitSnap(progress: number): number {
  const value = Math.max(0, Math.min(1, progress));
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}
