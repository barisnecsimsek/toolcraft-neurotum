import * as THREE from "three";
import { expect, test } from "vitest";

import {
  createFrozenCrystalGeometry,
  createFrozenIcicleGeometry,
} from "./frozen-instances";

function triangleCount(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  return Math.floor((geometry.getIndex()?.count ?? position.count) / 3);
}

test("generated ice uses bounded low-poly primitives without reducing capacity", () => {
  const crystal = createFrozenCrystalGeometry();
  const icicle = createFrozenIcicleGeometry(12_000);
  try {
    expect(triangleCount(crystal)).toBeLessThanOrEqual(8);
    expect(triangleCount(icicle)).toBeLessThanOrEqual(35);
    expect(
      (icicle.getAttribute(
        "frozenIcicleRootDirection",
      ) as THREE.InstancedBufferAttribute).count,
    ).toBe(12_000);
    expect(
      (icicle.getAttribute(
        "frozenIcicleBend",
      ) as THREE.InstancedBufferAttribute).count,
    ).toBe(12_000);
  } finally {
    crystal.dispose();
    icicle.dispose();
  }
});

