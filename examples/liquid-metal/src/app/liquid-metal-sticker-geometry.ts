import * as THREE from "three";

type StickerSurfaceNeighbor = {
  edgeKeys: [string, string];
  triangle: StickerSurfaceTriangle;
};

type StickerSurfaceTriangle = {
  faceIndex: number;
  faceNormal: THREE.Vector3;
  neighbors: StickerSurfaceNeighbor[];
  normals: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  positions: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  vertexKeys: [string, string, string];
};

export type LiquidMetalStickerSurfaceMesh = {
  meshIndex: number;
  triangles: StickerSurfaceTriangle[];
  trianglesByFaceIndex: Map<number, StickerSurfaceTriangle>;
};

export type LiquidMetalWrappedStickerGeometry = {
  geometry: THREE.BufferGeometry;
  seedFaceIndex: number;
  seedMeshIndex: number;
  surfaceTriangleCount: number;
};

type StickerChartVertex = {
  chart: THREE.Vector2;
  normal: THREE.Vector3;
  position: THREE.Vector3;
};

type StickerChartEntry = {
  chart: [THREE.Vector2, THREE.Vector2, THREE.Vector2];
  cost: number;
  triangle: StickerSurfaceTriangle;
};

type StickerEdgeOwner = {
  edgeKeys: [string, string];
  triangle: StickerSurfaceTriangle;
};

const stickerSurfaceVertexPrecision = 100_000;
const stickerSurfaceMaxFoldAngle = THREE.MathUtils.degToRad(170);
const stickerSurfaceMinFoldDot = Math.cos(stickerSurfaceMaxFoldAngle);
const stickerSurfaceMaxVisitedTriangles = 12_000;
const stickerSurfaceChartEpsilon = 1e-7;
const stickerSurfaceMinimumUnfoldEdgeLength = 1e-7;
const stickerSurfaceMinimumNormalLengthSquared = 1e-12;
const stickerSurfaceRelativeAreaSquaredEpsilon = 1e-12;

function getStickerSurfaceVertexKey(position: THREE.Vector3): string {
  return `${Math.round(position.x * stickerSurfaceVertexPrecision)},${Math.round(position.y * stickerSurfaceVertexPrecision)},${Math.round(position.z * stickerSurfaceVertexPrecision)}`;
}

function getStickerSurfaceEdgeKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function getTriangleVertexIndex(
  triangle: StickerSurfaceTriangle,
  key: string,
): number {
  return triangle.vertexKeys.findIndex((candidate) => candidate === key);
}

function getThirdTriangleVertexIndex(left: number, right: number): number {
  return [0, 1, 2].find((index) => index !== left && index !== right) ?? -1;
}

function getTriangleChartCenter(
  chart: readonly THREE.Vector2[],
): THREE.Vector2 {
  return new THREE.Vector2()
    .copy(chart[0]!)
    .add(chart[1]!)
    .add(chart[2]!)
    .multiplyScalar(1 / 3);
}

function getTriangleChartDistanceToOrigin(
  chart: readonly THREE.Vector2[],
): number {
  const [pointA, pointB, pointC] = chart as readonly [
    THREE.Vector2,
    THREE.Vector2,
    THREE.Vector2,
  ];
  const sign = (left: THREE.Vector2, right: THREE.Vector2): number =>
    left.x * right.y - left.y * right.x;
  const crossA = sign(
    new THREE.Vector2().subVectors(pointB, pointA),
    pointA.clone().multiplyScalar(-1),
  );
  const crossB = sign(
    new THREE.Vector2().subVectors(pointC, pointB),
    pointB.clone().multiplyScalar(-1),
  );
  const crossC = sign(
    new THREE.Vector2().subVectors(pointA, pointC),
    pointC.clone().multiplyScalar(-1),
  );
  const containsOrigin =
    (crossA >= -stickerSurfaceChartEpsilon &&
      crossB >= -stickerSurfaceChartEpsilon &&
      crossC >= -stickerSurfaceChartEpsilon) ||
    (crossA <= stickerSurfaceChartEpsilon &&
      crossB <= stickerSurfaceChartEpsilon &&
      crossC <= stickerSurfaceChartEpsilon);

  if (containsOrigin) return 0;

  const distanceToSegment = (
    start: THREE.Vector2,
    end: THREE.Vector2,
  ): number => {
    const segment = new THREE.Vector2().subVectors(end, start);
    const lengthSquared = segment.lengthSq();

    if (lengthSquared <= stickerSurfaceChartEpsilon) return start.length();

    const t = THREE.MathUtils.clamp(-start.dot(segment) / lengthSquared, 0, 1);
    return start.clone().addScaledVector(segment, t).length();
  };

  return Math.min(
    distanceToSegment(pointA, pointB),
    distanceToSegment(pointB, pointC),
    distanceToSegment(pointC, pointA),
  );
}

function unfoldStickerNeighbor(
  current: StickerChartEntry,
  neighbor: StickerSurfaceNeighbor,
): [THREE.Vector2, THREE.Vector2, THREE.Vector2] | null {
  if (
    current.triangle.faceNormal.dot(neighbor.triangle.faceNormal) <
    stickerSurfaceMinFoldDot
  ) {
    return null;
  }

  const [leftKey, rightKey] = neighbor.edgeKeys;
  const currentLeft = getTriangleVertexIndex(current.triangle, leftKey);
  const currentRight = getTriangleVertexIndex(current.triangle, rightKey);
  const neighborLeft = getTriangleVertexIndex(neighbor.triangle, leftKey);
  const neighborRight = getTriangleVertexIndex(neighbor.triangle, rightKey);
  const currentThird = getThirdTriangleVertexIndex(currentLeft, currentRight);
  const neighborThird = getThirdTriangleVertexIndex(
    neighborLeft,
    neighborRight,
  );

  if (
    currentLeft < 0 ||
    currentRight < 0 ||
    neighborLeft < 0 ||
    neighborRight < 0 ||
    currentThird < 0 ||
    neighborThird < 0
  ) {
    return null;
  }

  const leftChart = current.chart[currentLeft];
  const rightChart = current.chart[currentRight];
  const currentThirdChart = current.chart[currentThird];
  const edge = new THREE.Vector2().subVectors(rightChart, leftChart);
  const edgeLength = edge.length();

  if (edgeLength <= stickerSurfaceMinimumUnfoldEdgeLength) return null;

  const edgeDirection = edge.multiplyScalar(1 / edgeLength);
  const edgePerpendicular = new THREE.Vector2(
    -edgeDirection.y,
    edgeDirection.x,
  );
  const neighborThirdPosition = neighbor.triangle.positions[neighborThird];
  const leftPosition = neighbor.triangle.positions[neighborLeft];
  const rightPosition = neighbor.triangle.positions[neighborRight];
  const leftDistance = neighborThirdPosition.distanceTo(leftPosition);
  const rightDistance = neighborThirdPosition.distanceTo(rightPosition);
  const distanceAlongEdge =
    (leftDistance * leftDistance -
      rightDistance * rightDistance +
      edgeLength * edgeLength) /
    (2 * edgeLength);
  const distanceFromEdge = Math.sqrt(
    Math.max(
      0,
      leftDistance * leftDistance - distanceAlongEdge * distanceAlongEdge,
    ),
  );
  const currentSide = Math.sign(
    edge.x * (currentThirdChart.y - leftChart.y) -
      edge.y * (currentThirdChart.x - leftChart.x),
  );
  const neighborSide = currentSide === 0 ? 1 : -currentSide;
  const unfoldedThird = leftChart
    .clone()
    .addScaledVector(edgeDirection, distanceAlongEdge)
    .addScaledVector(edgePerpendicular, distanceFromEdge * neighborSide);
  const chart = [
    new THREE.Vector2(),
    new THREE.Vector2(),
    new THREE.Vector2(),
  ] as [THREE.Vector2, THREE.Vector2, THREE.Vector2];

  chart[neighborLeft].copy(leftChart);
  chart[neighborRight].copy(rightChart);
  chart[neighborThird].copy(unfoldedThird);
  return chart;
}

function interpolateStickerChartVertex(
  start: StickerChartVertex,
  end: StickerChartVertex,
  t: number,
): StickerChartVertex {
  return {
    chart: start.chart.clone().lerp(end.chart, t),
    normal: start.normal.clone().lerp(end.normal, t).normalize(),
    position: start.position.clone().lerp(end.position, t),
  };
}

function clipStickerChartPolygon(
  input: StickerChartVertex[],
  axis: "x" | "y",
  boundary: number,
  keepGreater: boolean,
): StickerChartVertex[] {
  if (input.length === 0) return [];

  const output: StickerChartVertex[] = [];
  let previous = input[input.length - 1]!;
  let previousValue = previous.chart[axis];
  let previousInside = keepGreater
    ? previousValue >= boundary - stickerSurfaceChartEpsilon
    : previousValue <= boundary + stickerSurfaceChartEpsilon;

  for (const current of input) {
    const currentValue = current.chart[axis];
    const currentInside = keepGreater
      ? currentValue >= boundary - stickerSurfaceChartEpsilon
      : currentValue <= boundary + stickerSurfaceChartEpsilon;

    if (currentInside !== previousInside) {
      const denominator = currentValue - previousValue;
      const t =
        Math.abs(denominator) <= stickerSurfaceChartEpsilon
          ? 0
          : THREE.MathUtils.clamp(
              (boundary - previousValue) / denominator,
              0,
              1,
            );

      output.push(interpolateStickerChartVertex(previous, current, t));
    }

    if (currentInside) output.push(current);

    previous = current;
    previousValue = currentValue;
    previousInside = currentInside;
  }

  return output;
}

function clipStickerTriangleToFootprint(
  triangle: StickerSurfaceTriangle,
  chart: [THREE.Vector2, THREE.Vector2, THREE.Vector2],
  halfWidth: number,
  halfHeight: number,
): StickerChartVertex[] {
  let polygon = triangle.positions.map((position, index) => ({
    chart: chart[index]!.clone(),
    normal: triangle.normals[index]!.clone(),
    position: position.clone(),
  }));

  polygon = clipStickerChartPolygon(polygon, "x", -halfWidth, true);
  polygon = clipStickerChartPolygon(polygon, "x", halfWidth, false);
  polygon = clipStickerChartPolygon(polygon, "y", -halfHeight, true);
  polygon = clipStickerChartPolygon(polygon, "y", halfHeight, false);
  return polygon;
}

function resolveStickerSurfaceSeed(
  surfaceMeshes: readonly LiquidMetalStickerSurfaceMesh[],
  anchor: THREE.Vector3,
  placementNormal: THREE.Vector3,
  seedMeshIndex?: number,
  seedFaceIndex?: number,
): {
  mesh: LiquidMetalStickerSurfaceMesh;
  triangle: StickerSurfaceTriangle;
} | null {
  if (Number.isInteger(seedMeshIndex) && Number.isInteger(seedFaceIndex)) {
    const mesh = surfaceMeshes.find(
      (candidate) => candidate.meshIndex === seedMeshIndex,
    );
    const triangle = mesh?.trianglesByFaceIndex.get(seedFaceIndex!);

    if (mesh && triangle) return { mesh, triangle };
  }

  const closestPoint = new THREE.Vector3();
  const threeTriangle = new THREE.Triangle();
  let best:
    | {
        alignment: number;
        distanceSquared: number;
        mesh: LiquidMetalStickerSurfaceMesh;
        triangle: StickerSurfaceTriangle;
      }
    | undefined;

  for (const mesh of surfaceMeshes) {
    for (const triangle of mesh.triangles) {
      threeTriangle.set(...triangle.positions);
      threeTriangle.closestPointToPoint(anchor, closestPoint);
      const distanceSquared = closestPoint.distanceToSquared(anchor);
      const alignment = triangle.faceNormal.dot(placementNormal);

      if (
        !best ||
        distanceSquared < best.distanceSquared - 1e-10 ||
        (Math.abs(distanceSquared - best.distanceSquared) <= 1e-10 &&
          alignment > best.alignment)
      ) {
        best = { alignment, distanceSquared, mesh, triangle };
      }
    }
  }

  return best ? { mesh: best.mesh, triangle: best.triangle } : null;
}

export function buildLiquidMetalStickerSurfaceMeshes(
  meshes: readonly THREE.Mesh[],
): LiquidMetalStickerSurfaceMesh[] {
  return meshes.map((mesh, meshIndex) => {
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const index = geometry.getIndex();
    const indexCount = index?.count ?? positions?.count ?? 0;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const triangles: StickerSurfaceTriangle[] = [];
    const trianglesByFaceIndex = new Map<number, StickerSurfaceTriangle>();
    const edgeOwners = new Map<string, StickerEdgeOwner[]>();

    if (!positions) {
      return { meshIndex, triangles, trianglesByFaceIndex };
    }

    for (let offset = 0; offset + 2 < indexCount; offset += 3) {
      const faceIndex = Math.floor(offset / 3);
      const vertexIndices = [0, 1, 2].map((vertexOffset) =>
        index ? index.getX(offset + vertexOffset) : offset + vertexOffset,
      );
      const trianglePositions = vertexIndices.map((vertexIndex) =>
        new THREE.Vector3()
          .fromBufferAttribute(positions, vertexIndex)
          .applyMatrix4(mesh.matrixWorld),
      ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
      const edgeA = new THREE.Vector3().subVectors(
        trianglePositions[1],
        trianglePositions[0],
      );
      const edgeB = new THREE.Vector3().subVectors(
        trianglePositions[2],
        trianglePositions[0],
      );
      const edgeC = new THREE.Vector3().subVectors(
        trianglePositions[2],
        trianglePositions[1],
      );
      const faceNormal = new THREE.Vector3().crossVectors(edgeA, edgeB);
      const maximumEdgeLengthSquared = Math.max(
        edgeA.lengthSq(),
        edgeB.lengthSq(),
        edgeC.lengthSq(),
      );
      const maximumAreaScaleSquared =
        maximumEdgeLengthSquared * maximumEdgeLengthSquared;

      if (
        !Number.isFinite(maximumAreaScaleSquared) ||
        maximumAreaScaleSquared <= Number.EPSILON ||
        faceNormal.lengthSq() <=
          maximumAreaScaleSquared * stickerSurfaceRelativeAreaSquaredEpsilon
      ) {
        continue;
      }

      faceNormal.normalize();
      const triangleNormals = vertexIndices.map((vertexIndex) => {
        if (!normals) return faceNormal.clone();

        const normal = new THREE.Vector3()
          .fromBufferAttribute(normals, vertexIndex)
          .applyNormalMatrix(normalMatrix);

        return normal.lengthSq() > stickerSurfaceMinimumNormalLengthSquared
          ? normal.normalize()
          : faceNormal.clone();
      }) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
      const vertexKeys = trianglePositions.map(getStickerSurfaceVertexKey) as [
        string,
        string,
        string,
      ];
      const triangle: StickerSurfaceTriangle = {
        faceIndex,
        faceNormal,
        neighbors: [],
        normals: triangleNormals,
        positions: trianglePositions,
        vertexKeys,
      };

      triangles.push(triangle);
      trianglesByFaceIndex.set(faceIndex, triangle);

      for (const [left, right] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ] as const) {
        const edgeKeys: [string, string] = [
          vertexKeys[left],
          vertexKeys[right],
        ];
        const edgeKey = getStickerSurfaceEdgeKey(...edgeKeys);
        const owners = edgeOwners.get(edgeKey) ?? [];

        owners.push({ edgeKeys, triangle });
        edgeOwners.set(edgeKey, owners);
      }
    }

    edgeOwners.forEach((owners) => {
      if (owners.length !== 2) return;

      const [left, right] = owners as [StickerEdgeOwner, StickerEdgeOwner];
      const edgeKeys: [string, string] = [left.edgeKeys[0], left.edgeKeys[1]];

      left.triangle.neighbors.push({ edgeKeys, triangle: right.triangle });
      right.triangle.neighbors.push({ edgeKeys, triangle: left.triangle });
    });

    return { meshIndex, triangles, trianglesByFaceIndex };
  });
}

export function createLiquidMetalWrappedStickerGeometry({
  anchor,
  placementNormal,
  rotationDegrees,
  seedFaceIndex,
  seedMeshIndex,
  size,
  surfaceMeshes,
}: {
  anchor: THREE.Vector3;
  placementNormal: THREE.Vector3;
  rotationDegrees: number;
  seedFaceIndex?: number;
  seedMeshIndex?: number;
  size: THREE.Vector2;
  surfaceMeshes: readonly LiquidMetalStickerSurfaceMesh[];
}): LiquidMetalWrappedStickerGeometry | null {
  const resolvedSeed = resolveStickerSurfaceSeed(
    surfaceMeshes,
    anchor,
    placementNormal,
    seedMeshIndex,
    seedFaceIndex,
  );

  if (!resolvedSeed || size.x <= 0 || size.y <= 0) return null;

  const helper = new THREE.Object3D();
  const normal = placementNormal.clone().normalize();

  helper.position.copy(anchor);
  helper.lookAt(anchor.clone().add(normal));
  helper.rotateZ(THREE.MathUtils.degToRad(rotationDegrees));
  const tangentX = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(helper.quaternion)
    .normalize();
  const tangentY = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(helper.quaternion)
    .normalize();
  const seedChart = resolvedSeed.triangle.positions.map((position) => {
    const relative = new THREE.Vector3().subVectors(position, anchor);

    return new THREE.Vector2(relative.dot(tangentX), relative.dot(tangentY));
  }) as [THREE.Vector2, THREE.Vector2, THREE.Vector2];
  const pending: StickerChartEntry[] = [
    { chart: seedChart, cost: 0, triangle: resolvedSeed.triangle },
  ];
  const bestCosts = new Map<StickerSurfaceTriangle, number>([
    [resolvedSeed.triangle, 0],
  ]);
  const settled = new Map<StickerSurfaceTriangle, StickerChartEntry>();
  const halfWidth = size.x * 0.5;
  const halfHeight = size.y * 0.5;
  const footprintRadius = Math.hypot(halfWidth, halfHeight);
  const traversalRadius = footprintRadius + stickerSurfaceChartEpsilon;

  while (
    pending.length > 0 &&
    settled.size < stickerSurfaceMaxVisitedTriangles
  ) {
    pending.sort((left, right) => left.cost - right.cost);
    const current = pending.shift()!;

    if (
      settled.has(current.triangle) ||
      current.cost >
        (bestCosts.get(current.triangle) ?? Number.POSITIVE_INFINITY)
    ) {
      continue;
    }

    settled.set(current.triangle, current);

    for (const neighbor of current.triangle.neighbors) {
      if (settled.has(neighbor.triangle)) continue;

      const chart = unfoldStickerNeighbor(current, neighbor);

      if (!chart || getTriangleChartDistanceToOrigin(chart) > traversalRadius) {
        continue;
      }

      const currentCenter = getTriangleChartCenter(current.chart);
      const neighborCenter = getTriangleChartCenter(chart);
      const cost = current.cost + currentCenter.distanceTo(neighborCenter);

      const bestCost = bestCosts.get(neighbor.triangle);

      if (bestCost !== undefined && bestCost <= cost) continue;

      bestCosts.set(neighbor.triangle, cost);
      pending.push({ chart, cost, triangle: neighbor.triangle });
    }
  }

  const positionValues: number[] = [];
  const normalValues: number[] = [];
  const uvValues: number[] = [];

  settled.forEach(({ chart, triangle }) => {
    const polygon = clipStickerTriangleToFootprint(
      triangle,
      chart,
      halfWidth,
      halfHeight,
    );

    if (polygon.length < 3) return;

    for (let index = 1; index + 1 < polygon.length; index += 1) {
      for (const vertex of [
        polygon[0]!,
        polygon[index]!,
        polygon[index + 1]!,
      ]) {
        positionValues.push(
          vertex.position.x,
          vertex.position.y,
          vertex.position.z,
        );
        normalValues.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
        uvValues.push(
          0.5 + vertex.chart.x / size.x,
          0.5 + vertex.chart.y / size.y,
        );
      }
    }
  });

  if (positionValues.length === 0) return null;

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positionValues, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normalValues, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvValues, 2).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return {
    geometry,
    seedFaceIndex: resolvedSeed.triangle.faceIndex,
    seedMeshIndex: resolvedSeed.mesh.meshIndex,
    surfaceTriangleCount: settled.size,
  };
}
