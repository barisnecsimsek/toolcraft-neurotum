import { expect, test } from "vitest";
import * as THREE from "three";

import { findFrozenMeltProjectionCandidates } from "./frozen-melt-projection";

test("melt.edgeOverlap finds a partial projected brush intersection", () => {
  const triangle = new Float32Array([
    -0.5, -0.5,
    0.5, -0.5,
    0, 0.5,
  ]);
  const pointer = new THREE.Vector2(0.62, 0);
  const [candidate] = findFrozenMeltProjectionCandidates(
    triangle,
    pointer,
    1000,
    500,
  );

  expect(candidate).toBeDefined();
  expect(candidate.distancePixels).toBeGreaterThan(0);
  expect(candidate.distancePixels).toBeLessThan(200);
  expect(candidate.x).toBeLessThan(pointer.x);
  expect(pointer.x).toBe(0.62);
});
