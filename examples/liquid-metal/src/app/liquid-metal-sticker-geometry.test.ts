import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  buildLiquidMetalStickerSurfaceMeshes,
  createLiquidMetalWrappedStickerGeometry,
} from "./liquid-metal-sticker-geometry";

function createFoldedSurfaceMesh({
  disconnected = false,
  nonManifold = false,
}: {
  disconnected?: boolean;
  nonManifold?: boolean;
} = {}): THREE.Mesh {
  const positions = [-1, -1, 0, 0, -1, 0, 0, 1, 0, -1, 1, 0, 0, -1, 1, 0, 1, 1];
  const indices = [0, 1, 2, 0, 2, 3, 1, 4, 5, 1, 5, 2];

  if (disconnected) {
    positions.push(0.08, -1, 0.08, 0.08, 1, 0.08, 0.08, 0, 1);
    indices.push(6, 7, 8);
  }

  if (nonManifold) {
    positions.push(0.6, 0, 0.25);
    indices.push(1, 2, positions.length / 3 - 1);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry);

  mesh.updateMatrixWorld(true);
  return mesh;
}

function createFoldedSticker(
  mesh: THREE.Mesh,
  {
    rotationDegrees = 0,
    size = new THREE.Vector2(0.5, 0.5),
  }: { rotationDegrees?: number; size?: THREE.Vector2 } = {},
) {
  return createLiquidMetalWrappedStickerGeometry({
    anchor: new THREE.Vector3(-0.1, 0.4, 0),
    placementNormal: new THREE.Vector3(0, 0, 1),
    rotationDegrees,
    seedFaceIndex: 0,
    seedMeshIndex: 0,
    size,
    surfaceMeshes: buildLiquidMetalStickerSurfaceMeshes([mesh]),
  });
}

function readGeometryAxis(
  geometry: THREE.BufferGeometry,
  attributeName: "position" | "uv",
  axis: "x" | "y" | "z",
): number[] {
  const attribute = geometry.getAttribute(attributeName);
  const getter =
    axis === "x"
      ? (index: number) => attribute.getX(index)
      : axis === "y"
        ? (index: number) => attribute.getY(index)
        : (index: number) => attribute.getZ(index);

  return Array.from({ length: attribute.count }, (_, index) => getter(index));
}

describe("Liquid Metal wrapped sticker surface chart", () => {
  it("keeps uniformly small valid triangles in the sticker topology", () => {
    const mesh = createFoldedSurfaceMesh();

    mesh.scale.setScalar(0.001);
    mesh.updateMatrixWorld(true);
    const surfaceMeshes = buildLiquidMetalStickerSurfaceMeshes([mesh]);
    const wrapped = createLiquidMetalWrappedStickerGeometry({
      anchor: new THREE.Vector3(-0.0001, 0.0004, 0),
      placementNormal: new THREE.Vector3(0, 0, 1),
      rotationDegrees: 0,
      seedFaceIndex: 0,
      seedMeshIndex: 0,
      size: new THREE.Vector2(0.0005, 0.0005),
      surfaceMeshes,
    });

    expect(surfaceMeshes[0]?.triangles).toHaveLength(4);
    expect(wrapped).not.toBeNull();
    expect(
      Math.max(...readGeometryAxis(wrapped!.geometry, "position", "z")),
    ).toBeGreaterThan(0.00001);
  });

  it("still excludes an exactly collinear triangle", () => {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 2, 0, 0], 3),
    );
    const mesh = new THREE.Mesh(geometry);

    mesh.updateMatrixWorld(true);
    expect(
      buildLiquidMetalStickerSurfaceMeshes([mesh])[0]?.triangles,
    ).toHaveLength(0);
  });

  it("unfolds a 90-degree connected face with continuous non-degenerate UVs", () => {
    const wrapped = createFoldedSticker(createFoldedSurfaceMesh());

    expect(wrapped).not.toBeNull();
    const geometry = wrapped!.geometry;
    const positions = geometry.getAttribute("position");
    const uvs = geometry.getAttribute("uv");
    const seamUValues: number[] = [];
    let frontVertexCount = 0;
    let sideVertexCount = 0;
    let sideTriangleUvRange = 0;

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);

      if (Math.abs(z) < 1e-5 && x < -1e-4) frontVertexCount += 1;
      if (z > 1e-4) {
        sideVertexCount += 1;
      }
      if (Math.abs(x) < 1e-5 && Math.abs(z) < 1e-5) {
        seamUValues.push(uvs.getX(index));
      }
    }

    for (let index = 0; index + 2 < positions.count; index += 3) {
      const triangleX = [0, 1, 2].map((offset) =>
        positions.getX(index + offset),
      );
      const triangleZ = [0, 1, 2].map((offset) =>
        positions.getZ(index + offset),
      );

      if (
        triangleX.every((value) => Math.abs(value) < 1e-5) &&
        Math.max(...triangleZ) > 1e-4
      ) {
        const triangleU = [0, 1, 2].map((offset) => uvs.getX(index + offset));

        sideTriangleUvRange = Math.max(
          sideTriangleUvRange,
          Math.max(...triangleU) - Math.min(...triangleU),
        );
      }
    }

    expect(frontVertexCount).toBeGreaterThan(0);
    expect(sideVertexCount).toBeGreaterThan(0);
    expect(sideTriangleUvRange).toBeGreaterThan(0.1);
    expect(seamUValues.length).toBeGreaterThan(1);
    expect(Math.max(...seamUValues) - Math.min(...seamUValues)).toBeLessThan(
      1e-5,
    );
    expect(
      Math.min(...readGeometryAxis(geometry, "uv", "x")),
    ).toBeGreaterThanOrEqual(-1e-5);
    expect(
      Math.max(...readGeometryAxis(geometry, "uv", "x")),
    ).toBeLessThanOrEqual(1.00001);
  });

  it("does not jump to a nearby disconnected surface", () => {
    const wrapped = createFoldedSticker(
      createFoldedSurfaceMesh({ disconnected: true }),
    );

    expect(wrapped).not.toBeNull();
    const positions = wrapped!.geometry.getAttribute("position");

    for (let index = 0; index < positions.count; index += 1) {
      expect(
        Math.abs(positions.getX(index) - 0.08) < 1e-4 &&
          Math.abs(positions.getZ(index) - 0.08) < 1e-4,
      ).toBe(false);
    }
  });

  it("stops at a non-manifold edge instead of choosing an arbitrary face", () => {
    const wrapped = createFoldedSticker(
      createFoldedSurfaceMesh({ nonManifold: true }),
    );

    expect(wrapped).not.toBeNull();
    const zValues = readGeometryAxis(wrapped!.geometry, "position", "z");

    expect(Math.max(...zValues)).toBeLessThan(1e-5);
  });

  it("keeps scale and in-plane rotation in the unfolded chart", () => {
    const mesh = createFoldedSurfaceMesh();
    const small = createFoldedSticker(mesh, {
      size: new THREE.Vector2(0.32, 0.24),
    });
    const large = createFoldedSticker(mesh, {
      size: new THREE.Vector2(0.72, 0.54),
    });
    const rotated = createFoldedSticker(mesh, {
      rotationDegrees: 90,
      size: new THREE.Vector2(0.72, 0.54),
    });

    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(rotated).not.toBeNull();
    const maxSmallSideDepth = Math.max(
      ...readGeometryAxis(small!.geometry, "position", "z"),
    );
    const maxLargeSideDepth = Math.max(
      ...readGeometryAxis(large!.geometry, "position", "z"),
    );
    const largeUv = Array.from(
      large!.geometry.getAttribute("uv").array as ArrayLike<number>,
    );
    const rotatedUv = Array.from(
      rotated!.geometry.getAttribute("uv").array as ArrayLike<number>,
    );

    expect(maxLargeSideDepth).toBeGreaterThan(maxSmallSideDepth + 0.1);
    expect(rotatedUv).not.toEqual(largeUv);
  });
});
