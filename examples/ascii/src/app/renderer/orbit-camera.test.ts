import { describe, expect, it } from "vitest";

import {
  DEFAULT_ORBIT_POSE,
  easeInOutQuad,
  getOrbitCameraQuaternion,
  getOrbitRadius,
  orbitPoseFromGizmoPointer,
  orbitPoseFromPointerDelta,
  projectOrbitAxes,
  readOrbitPose,
  snapOrbitPose,
  type OrbitAxis,
} from "./orbit-camera";

function expectTupleClose(
  received: [number, number, number],
  expected: [number, number, number],
) {
  expected.forEach((value, index) => {
    expect(received[index]).toBeCloseTo(value, 10);
  });
}

describe("orbit camera math", () => {
  it("reads valid poses defensively and falls back for malformed or degenerate state", () => {
    const source = { position: [1, 2, 3], up: [0, 1, 0] };
    const read = readOrbitPose(source);
    expect(read).toEqual(source);
    expect(read).not.toBe(source);
    expect(read.position).not.toBe(source.position);
    expect(read.up).not.toBe(source.up);

    expect(readOrbitPose({ position: [1, 2], up: [0, 1, 0] })).toEqual(
      DEFAULT_ORBIT_POSE,
    );
    expect(readOrbitPose({ position: [0, 2, 0], up: [0, 1, 0] })).toEqual(
      DEFAULT_ORBIT_POSE,
    );
    expect(readOrbitPose({ position: [0, 0, 0], up: [0, 1, 0] })).toEqual(
      DEFAULT_ORBIT_POSE,
    );
  });

  it("preserves radius and authored up during free pointer orbit", () => {
    const beforeRadius = getOrbitRadius(DEFAULT_ORBIT_POSE);
    const result = orbitPoseFromPointerDelta(
      DEFAULT_ORBIT_POSE,
      72,
      -28,
      720,
    );

    expect(getOrbitRadius(result)).toBeCloseTo(beforeRadius, 10);
    expectTupleClose(result.up, [0, 1, 0]);
    expect(result.position[0]).toBeLessThan(0);
    expect(result.position[1]).toBeLessThan(DEFAULT_ORBIT_POSE.position[1]);
  });

  it("changes both off-axis components during a diagonal point drag", () => {
    const snapped = snapOrbitPose(DEFAULT_ORBIT_POSE, "+x");
    const result = orbitPoseFromPointerDelta(snapped, 18, 18, 720);

    expect(getOrbitRadius(result)).toBeCloseTo(getOrbitRadius(snapped), 10);
    expectTupleClose(result.up, [0, 1, 0]);
    expect(Math.abs(result.position[1])).toBeGreaterThan(0.1);
    expect(Math.abs(result.position[2])).toBeGreaterThan(0.1);
  });

  it("projects a grabbed axis point directly beneath the gizmo pointer", () => {
    const snapped = snapOrbitPose(DEFAULT_ORBIT_POSE, "+x");
    const result = orbitPoseFromGizmoPointer(
      snapped,
      "+x",
      47,
      43,
      35,
      24.5,
      1,
    );
    const projection = projectOrbitAxes(result, 35, 24.5).find(
      (item) => item.axis === "+x",
    );

    expect(projection?.x).toBeCloseTo(47, 10);
    expect(projection?.y).toBeCloseTo(43, 10);
    expect(getOrbitRadius(result)).toBeCloseTo(getOrbitRadius(snapped), 10);
  });

  it("keeps the captured hemisphere stable at the gizmo boundary", () => {
    for (const cameraLocalZSign of [-1, 1] as const) {
      let pose = DEFAULT_ORBIT_POSE;

      for (let frame = 0; frame < 30; frame += 1) {
        pose = orbitPoseFromGizmoPointer(
          pose,
          "+z",
          35,
          67,
          35,
          24.5,
          cameraLocalZSign,
        );
        const projection = projectOrbitAxes(pose, 35, 24.5).find(
          (item) => item.axis === "+z",
        );

        expect(projection).toBeDefined();
        expect(Math.sign(projection?.depth ?? 0)).toBe(-cameraLocalZSign);
        expect(projection?.isFrontFacing).toBe(cameraLocalZSign === 1);
        expect(Math.abs(projection?.depth ?? 0)).toBeGreaterThan(0.00005);
        expect(
          Math.hypot(
            (projection?.x ?? 35) - 35,
            (projection?.y ?? 35) - 35,
          ),
        ).toBeCloseTo(24.5, 5);
      }
    }
  });

  it("clamps pointer orbit away from polar singularities", () => {
    const result = orbitPoseFromPointerDelta(
      DEFAULT_ORBIT_POSE,
      0,
      1_000_000,
      100,
    );
    expect(Number.isFinite(getOrbitCameraQuaternion(result).x)).toBe(true);
    expect(Math.abs(result.position[1])).toBeCloseTo(
      getOrbitRadius(DEFAULT_ORBIT_POSE),
      8,
    );
    expect(Math.hypot(result.position[0], result.position[2])).toBeGreaterThan(0);
  });

  it("projects world axes using the camera basis and marks front-facing depth", () => {
    const projected = projectOrbitAxes(
      { position: [0, 0, 10], up: [0, 1, 0] },
      35,
      24.5,
    );
    const byAxis = Object.fromEntries(projected.map((item) => [item.axis, item]));

    expect(byAxis["+x"]).toMatchObject({ x: 59.5, y: 35, depth: 0 });
    expect(byAxis["-x"]).toMatchObject({ x: 10.5, y: 35, depth: 0 });
    expect(byAxis["+y"]).toMatchObject({ x: 35, y: 10.5, depth: 0 });
    expect(byAxis["-y"]).toMatchObject({ x: 35, y: 59.5, depth: 0 });
    expect(byAxis["+z"].x).toBeCloseTo(35, 12);
    expect(byAxis["+z"].y).toBeCloseTo(35, 12);
    expect(byAxis["+z"].depth).toBeCloseTo(-1, 12);
    expect(byAxis["+z"].isFrontFacing).toBe(true);
    expect(byAxis["-z"].depth).toBeCloseTo(1, 12);
    expect(byAxis["-z"].isFrontFacing).toBe(false);
  });

  it("snaps every axis to its exact position and up while preserving radius", () => {
    const radius = getOrbitRadius(DEFAULT_ORBIT_POSE);
    const expectations: Record<
      OrbitAxis,
      { position: [number, number, number]; up: [number, number, number] }
    > = {
      "+x": { position: [radius, 0, 0], up: [0, 1, 0] },
      "-x": { position: [-radius, 0, 0], up: [0, 1, 0] },
      "+y": { position: [0, radius, 0], up: [0, 0, -1] },
      "-y": { position: [0, -radius, 0], up: [0, 0, 1] },
      "+z": { position: [0, 0, radius], up: [0, 1, 0] },
      "-z": { position: [0, 0, -radius], up: [0, 1, 0] },
    };

    (Object.keys(expectations) as OrbitAxis[]).forEach((axis) => {
      const snapped = snapOrbitPose(DEFAULT_ORBIT_POSE, axis);
      expectTupleClose(snapped.position, expectations[axis].position);
      expectTupleClose(snapped.up, expectations[axis].up);
      expect(getOrbitRadius(snapped)).toBeCloseTo(radius, 10);
    });
  });

  it("uses clamped quadratic ease-in-out", () => {
    expect(easeInOutQuad(-1)).toBe(0);
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(0.25)).toBe(0.125);
    expect(easeInOutQuad(0.5)).toBe(0.5);
    expect(easeInOutQuad(0.75)).toBe(0.875);
    expect(easeInOutQuad(1)).toBe(1);
    expect(easeInOutQuad(2)).toBe(1);
  });
});
