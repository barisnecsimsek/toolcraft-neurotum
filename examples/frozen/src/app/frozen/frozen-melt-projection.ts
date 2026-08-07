import * as THREE from "three";

export type FrozenMeltProjectionCandidate = Readonly<{
  distancePixels: number;
  x: number;
  y: number;
}>;

export type FrozenMeltProjection = Float32Array;

const projectedTriangleStride = 6;
const candidateLimit = 8;
const edgeNudge = 0.002;

function getVertexIndex(
  geometry: THREE.BufferGeometry,
  triangleOffset: number,
): number {
  return geometry.index?.getX(triangleOffset) ?? triangleOffset;
}

export function createFrozenMeltProjection(
  object: THREE.Object3D,
  camera: THREE.Camera,
): FrozenMeltProjection {
  const projected: number[] = [];
  const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position");
    if (!position) return;
    const triangleCount = Math.floor((geometry.index?.count ?? position.count) / 3);
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      for (let vertex = 0; vertex < 3; vertex += 1) {
        const offset = triangle * 3 + vertex;
        mesh
          .getVertexPosition(getVertexIndex(geometry, offset), vertices[vertex])
          .applyMatrix4(mesh.matrixWorld)
          .project(camera);
      }
      if (vertices.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
        continue;
      }
      projected.push(
        vertices[0].x,
        vertices[0].y,
        vertices[1].x,
        vertices[1].y,
        vertices[2].x,
        vertices[2].y,
      );
    }
  });
  return new Float32Array(projected);
}

function closestPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Readonly<{ x: number; y: number }> {
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy;
  const amount = denominator <= Number.EPSILON
    ? 0
    : THREE.MathUtils.clamp(((px - ax) * dx + (py - ay) * dy) / denominator, 0, 1);
  return { x: ax + dx * amount, y: ay + dy * amount };
}

function triangleContainsPoint(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const cross = (x1: number, y1: number, x2: number, y2: number) =>
    (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const first = cross(ax, ay, bx, by);
  const second = cross(bx, by, cx, cy);
  const third = cross(cx, cy, ax, ay);
  return !(
    (first < 0 || second < 0 || third < 0) &&
    (first > 0 || second > 0 || third > 0)
  );
}

function closestPointOnTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): Readonly<{ x: number; y: number }> {
  if (triangleContainsPoint(px, py, ax, ay, bx, by, cx, cy)) {
    return { x: px, y: py };
  }
  const edges = [
    closestPointOnSegment(px, py, ax, ay, bx, by),
    closestPointOnSegment(px, py, bx, by, cx, cy),
    closestPointOnSegment(px, py, cx, cy, ax, ay),
  ];
  return edges.reduce((nearest, candidate) => {
    const nearestDistance = (nearest.x - px) ** 2 + (nearest.y - py) ** 2;
    const candidateDistance = (candidate.x - px) ** 2 + (candidate.y - py) ** 2;
    return candidateDistance < nearestDistance ? candidate : nearest;
  });
}

export function findFrozenMeltProjectionCandidates(
  projection: FrozenMeltProjection,
  pointer: THREE.Vector2,
  viewportWidth: number,
  viewportHeight: number,
): readonly FrozenMeltProjectionCandidate[] {
  const candidates: FrozenMeltProjectionCandidate[] = [];
  for (let offset = 0; offset < projection.length; offset += projectedTriangleStride) {
    const ax = projection[offset];
    const ay = projection[offset + 1];
    const bx = projection[offset + 2];
    const by = projection[offset + 3];
    const cx = projection[offset + 4];
    const cy = projection[offset + 5];
    const closest = closestPointOnTriangle(
      pointer.x,
      pointer.y,
      ax,
      ay,
      bx,
      by,
      cx,
      cy,
    );
    const distancePixels = Math.hypot(
      (closest.x - pointer.x) * viewportWidth * 0.5,
      (closest.y - pointer.y) * viewportHeight * 0.5,
    );
    const centroidX = (ax + bx + cx) / 3;
    const centroidY = (ay + by + cy) / 3;
    const candidate = {
      distancePixels,
      x: THREE.MathUtils.lerp(closest.x, centroidX, edgeNudge),
      y: THREE.MathUtils.lerp(closest.y, centroidY, edgeNudge),
    };
    if (
      candidates.some(
        (existing) =>
          Math.abs(existing.x - candidate.x) < 1e-5 &&
          Math.abs(existing.y - candidate.y) < 1e-5,
      )
    ) {
      continue;
    }
    const insertion = candidates.findIndex(
      (existing) => candidate.distancePixels < existing.distancePixels,
    );
    if (insertion < 0) candidates.push(candidate);
    else candidates.splice(insertion, 0, candidate);
    if (candidates.length > candidateLimit) candidates.pop();
  }
  return candidates;
}
