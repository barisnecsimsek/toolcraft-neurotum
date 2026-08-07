import * as THREE from "three";
import { expect, test } from "vitest";

import {
  disposeFrozenModel,
  frozenSourceTriangleLimit,
  prepareFrozenObject,
} from "./frozen-model";

function createTriangleObject(triangleCount: number): THREE.Group {
  const positions = new Float32Array(triangleCount * 9);
  for (let index = 0; index < triangleCount; index += 1) {
    const offset = index * 9;
    const x = (index % 200) * 0.006;
    const z = Math.floor(index / 200) * 0.006;
    positions.set(
      [x, 0, z, x, 0, z + 0.004, x + 0.004, 0, z],
      offset,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry));
  return group;
}

test("accepts the Night King triangle magnitude below the 30000 source limit", () => {
  expect(frozenSourceTriangleLimit).toBe(30_000);
  const prepared = prepareFrozenObject(createTriangleObject(8_550), {
    seed: "night-king-boundary",
    sourceId: "night-king.obj",
    sourceKind: "model",
    sourceLabel: "Night King",
  });

  try {
    expect(prepared.triangleCount).toBe(8_550);
  } finally {
    disposeFrozenModel(prepared);
  }
});

test("rejects source geometry above 30000 triangles before sampling", () => {
  const object = createTriangleObject(30_001);
  expect(() =>
    prepareFrozenObject(object, {
      seed: "over-limit",
      sourceId: "over-limit.obj",
      sourceKind: "model",
      sourceLabel: "Over limit",
    }),
  ).toThrow("The source has 30,001 triangles; the interactive limit is 30,000.");
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).geometry.dispose();
  });
});
