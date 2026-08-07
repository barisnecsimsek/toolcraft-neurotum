import * as THREE from "three";

export type OrbitPose = {
  position: [number, number, number];
  up: [number, number, number];
};

export type OrbitAxis = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

export type OrbitAxisProjection = {
  axis: OrbitAxis;
  depth: number;
  isFrontFacing: boolean;
  x: number;
  y: number;
};

export const DEFAULT_ORBIT_POSE: OrbitPose = {
  position: [
    -10.643732408946478,
    -8.324759208134255,
    18.661533323242054,
  ],
  up: [0, 1, 0],
};

export const ORBIT_AXES: readonly OrbitAxis[] = [
  "+x",
  "-x",
  "+y",
  "-y",
  "+z",
  "-z",
];

const TARGET = new THREE.Vector3(0, 0, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const MIN_LENGTH_SQUARED = 1e-12;
const POLAR_EPSILON = 1e-6;
const MIN_GIZMO_LOCAL_Z = 1e-4;

const AXIS_VECTORS: Record<OrbitAxis, THREE.Vector3> = {
  "+x": new THREE.Vector3(1, 0, 0),
  "-x": new THREE.Vector3(-1, 0, 0),
  "+y": new THREE.Vector3(0, 1, 0),
  "-y": new THREE.Vector3(0, -1, 0),
  "+z": new THREE.Vector3(0, 0, 1),
  "-z": new THREE.Vector3(0, 0, -1),
};

function clonePose(pose: OrbitPose): OrbitPose {
  return {
    position: [...pose.position],
    up: [...pose.up],
  };
}

function readFiniteTuple(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (!value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    return null;
  }
  return [value[0], value[1], value[2]];
}

function isUsablePose(pose: OrbitPose) {
  const position = new THREE.Vector3(...pose.position);
  const up = new THREE.Vector3(...pose.up);
  if (
    position.lengthSq() <= MIN_LENGTH_SQUARED ||
    up.lengthSq() <= MIN_LENGTH_SQUARED
  ) {
    return false;
  }

  // A camera cannot construct a stable basis when its up vector and view
  // direction are parallel.
  return new THREE.Vector3()
    .crossVectors(up, position)
    .lengthSq() > MIN_LENGTH_SQUARED;
}

/**
 * Reads an orbit pose from persisted or external state without leaking mutable
 * tuple references. Invalid or degenerate values resolve to the supplied
 * fallback pose.
 */
export function readOrbitPose(
  value: unknown,
  fallback: OrbitPose = DEFAULT_ORBIT_POSE,
): OrbitPose {
  const safeFallback = isUsablePose(fallback)
    ? fallback
    : DEFAULT_ORBIT_POSE;

  if (!value || typeof value !== "object") return clonePose(safeFallback);

  const record = value as Record<string, unknown>;
  const position = readFiniteTuple(record.position);
  const up = readFiniteTuple(record.up);
  if (!position || !up) return clonePose(safeFallback);

  const pose = { position, up };
  return isUsablePose(pose) ? clonePose(pose) : clonePose(safeFallback);
}

export function getOrbitRadius(pose: OrbitPose) {
  return new THREE.Vector3(...pose.position).distanceTo(TARGET);
}

/**
 * Applies the same spherical deltas as a perspective orbit controller with a
 * rotate speed of 0.5. The camera remains aimed at the origin and its authored
 * up vector remains fixed during free orbiting.
 */
export function orbitPoseFromPointerDelta(
  poseValue: OrbitPose,
  deltaX: number,
  deltaY: number,
  viewportHeight: number,
): OrbitPose {
  const pose = readOrbitPose(poseValue);
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
  const alignUpToY = new THREE.Quaternion().setFromUnitVectors(up, WORLD_UP);
  const restoreAuthoredUp = alignUpToY.clone().invert();
  const offset = position.clone().applyQuaternion(alignUpToY);
  const spherical = new THREE.Spherical().setFromVector3(offset);

  spherical.theta -= (Math.PI * deltaX) / viewportHeight;
  spherical.phi -= (Math.PI * deltaY) / viewportHeight;
  spherical.phi = Math.max(
    POLAR_EPSILON,
    Math.min(Math.PI - POLAR_EPSILON, spherical.phi),
  );

  position.setFromSpherical(spherical).applyQuaternion(restoreAuthoredUp);

  return {
    position: position.toArray(),
    up: up.toArray(),
  };
}

/**
 * Rotates the camera so a grabbed world-axis endpoint projects directly to the
 * pointer on the orientation sphere. The starting front/rear hemisphere stays
 * stable for the duration of the gesture.
 */
export function orbitPoseFromGizmoPointer(
  poseValue: OrbitPose,
  axis: OrbitAxis,
  pointerX: number,
  pointerY: number,
  center: number,
  reach: number,
  cameraLocalZSign: -1 | 1,
): OrbitPose {
  const pose = readOrbitPose(poseValue);
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
  const maxRadialLength = Math.sqrt(1 - MIN_GIZMO_LOCAL_Z ** 2);
  if (radialLength > maxRadialLength) {
    const radialScale = maxRadialLength / radialLength;
    localX *= radialScale;
    localY *= radialScale;
  }

  const targetLocalAxis = new THREE.Vector3(
    localX,
    localY,
    cameraLocalZSign *
      Math.sqrt(
        Math.max(
          MIN_GIZMO_LOCAL_Z ** 2,
          1 - localX * localX - localY * localY,
        ),
      ),
  ).normalize();
  const cameraQuaternion = getOrbitCameraQuaternion(pose);
  const currentLocalAxis = AXIS_VECTORS[axis]
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
  const radius = getOrbitRadius(pose);

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

/** Returns the camera-local rotation for a pose aimed at the origin. */
export function getOrbitCameraQuaternion(poseValue: OrbitPose) {
  const pose = readOrbitPose(poseValue);
  const rotation = new THREE.Matrix4().lookAt(
    new THREE.Vector3(...pose.position),
    TARGET,
    new THREE.Vector3(...pose.up).normalize(),
  );
  return new THREE.Quaternion().setFromRotationMatrix(rotation).normalize();
}

/** Projects all six world axes into a compact camera-orientation display. */
export function projectOrbitAxes(
  pose: OrbitPose,
  center = 35,
  reach = 24.5,
): OrbitAxisProjection[] {
  const cameraQuaternion = getOrbitCameraQuaternion(pose);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);

  return ORBIT_AXES.map((axis) => {
    const vector = AXIS_VECTORS[axis];
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

/** Creates an orthographic axis view while preserving camera distance. */
export function snapOrbitPose(
  poseValue: OrbitPose,
  axis: OrbitAxis,
): OrbitPose {
  const radius = getOrbitRadius(readOrbitPose(poseValue));
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

export function easeInOutQuad(progress: number) {
  const value = Math.max(0, Math.min(1, progress));
  return value < 0.5
    ? 2 * value * value
    : 1 - Math.pow(-2 * value + 2, 2) / 2;
}
