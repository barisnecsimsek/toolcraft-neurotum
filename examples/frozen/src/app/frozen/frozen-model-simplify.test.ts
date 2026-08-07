import * as THREE from "three";
import { expect, test } from "vitest";

import {
  countFrozenObjectTriangles,
  simplifyFrozenObject,
} from "./frozen-model-simplify";

test("mesh simplification lowers triangles while retaining texture attributes", async () => {
  const geometry = new THREE.TorusKnotGeometry(1, 0.28, 96, 12);
  const object = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  object.add(mesh);
  const before = countFrozenObjectTriangles(object);
  const result = await simplifyFrozenObject(object, 900);

  try {
    expect(result.sourceTriangleCount).toBe(before);
    expect(result.renderedTriangleCount).toBeLessThan(before);
    expect(result.renderedTriangleCount).toBeLessThanOrEqual(1_100);
    expect(mesh.geometry.getAttribute("uv")).toBeDefined();
    expect(mesh.geometry.getAttribute("normal")).toBeDefined();
  } finally {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
});

test("mesh simplification keeps geometry already inside its budget", async () => {
  const geometry = new THREE.BoxGeometry();
  const object = new THREE.Group();
  object.add(new THREE.Mesh(geometry));
  const result = await simplifyFrozenObject(object, 3_000);
  expect(result).toEqual({ renderedTriangleCount: 12, sourceTriangleCount: 12 });
  geometry.dispose();
});
