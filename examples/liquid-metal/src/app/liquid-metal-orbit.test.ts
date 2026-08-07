import { describe, expect, it } from "vitest";

import {
  DEFAULT_LIQUID_METAL_ORBIT_POSE,
  easeLiquidMetalOrbitSnap,
  getLiquidMetalOrbitCameraQuaternion,
  getLiquidMetalOrbitPoseFromGizmoPointer,
  getLiquidMetalOrbitPoseFromPointerDelta,
  getLiquidMetalOrbitRadius,
  projectLiquidMetalOrbitAxes,
  readLiquidMetalOrbitPose,
  snapLiquidMetalOrbitPose,
  type LiquidMetalOrbitAxis,
} from "./liquid-metal-orbit";

function expectTupleClose(
  received: [number, number, number],
  expected: [number, number, number],
): void {
  expected.forEach((value, index) => {
    expect(received[index]).toBeCloseTo(value, 10);
  });
}

describe("Liquid Metal orbit camera math", () => {
  it("reads valid poses defensively and rejects malformed or degenerate state", () => {
    const source = { position: [1, 2, 3], up: [0, 1, 0] };
    const read = readLiquidMetalOrbitPose(source);

    expect(read).toEqual(source);
    expect(read).not.toBe(source);
    expect(read.position).not.toBe(source.position);
    expect(read.up).not.toBe(source.up);
    expect(
      readLiquidMetalOrbitPose({ position: [1, 2], up: [0, 1, 0] }),
    ).toEqual(DEFAULT_LIQUID_METAL_ORBIT_POSE);
    expect(
      readLiquidMetalOrbitPose({ position: [0, 2, 0], up: [0, 1, 0] }),
    ).toEqual(DEFAULT_LIQUID_METAL_ORBIT_POSE);
    expect(
      readLiquidMetalOrbitPose({ position: [0, 0, 0], up: [0, 1, 0] }),
    ).toEqual(DEFAULT_LIQUID_METAL_ORBIT_POSE);
  });

  it("preserves radius and authored up during middle-pointer orbit", () => {
    const beforeRadius = getLiquidMetalOrbitRadius(
      DEFAULT_LIQUID_METAL_ORBIT_POSE,
    );
    const result = getLiquidMetalOrbitPoseFromPointerDelta(
      DEFAULT_LIQUID_METAL_ORBIT_POSE,
      72,
      -28,
      720,
    );

    expect(getLiquidMetalOrbitRadius(result)).toBeCloseTo(beforeRadius, 10);
    expectTupleClose(result.up, [0, 1, 0]);
    expect(result.position[0]).toBeLessThan(0);
    expect(result.position[1]).toBeLessThan(
      DEFAULT_LIQUID_METAL_ORBIT_POSE.position[1],
    );
  });

  it("projects a grabbed endpoint directly beneath the gizmo pointer", () => {
    const snapped = snapLiquidMetalOrbitPose(
      DEFAULT_LIQUID_METAL_ORBIT_POSE,
      "+x",
    );
    const result = getLiquidMetalOrbitPoseFromGizmoPointer(
      snapped,
      "+x",
      47,
      43,
      35,
      24.5,
      1,
    );
    const projection = projectLiquidMetalOrbitAxes(result, 35, 24.5).find(
      (item) => item.axis === "+x",
    );

    expect(projection?.x).toBeCloseTo(47, 10);
    expect(projection?.y).toBeCloseTo(43, 10);
    expect(getLiquidMetalOrbitRadius(result)).toBeCloseTo(
      getLiquidMetalOrbitRadius(snapped),
      10,
    );
  });

  it("keeps the captured hemisphere stable at the gizmo boundary", () => {
    for (const cameraLocalZSign of [-1, 1] as const) {
      let pose = DEFAULT_LIQUID_METAL_ORBIT_POSE;

      for (let frame = 0; frame < 30; frame += 1) {
        pose = getLiquidMetalOrbitPoseFromGizmoPointer(
          pose,
          "+z",
          35,
          67,
          35,
          24.5,
          cameraLocalZSign,
        );
        const projection = projectLiquidMetalOrbitAxes(pose, 35, 24.5).find(
          (item) => item.axis === "+z",
        );

        expect(projection).toBeDefined();
        expect(Math.sign(projection?.depth ?? 0)).toBe(-cameraLocalZSign);
        expect(projection?.isFrontFacing).toBe(cameraLocalZSign === 1);
        expect(Math.abs(projection?.depth ?? 0)).toBeGreaterThan(0.00005);
        expect(
          Math.hypot((projection?.x ?? 35) - 35, (projection?.y ?? 35) - 35),
        ).toBeCloseTo(24.5, 5);
      }
    }
  });

  it("clamps pointer orbit away from polar singularities", () => {
    const result = getLiquidMetalOrbitPoseFromPointerDelta(
      DEFAULT_LIQUID_METAL_ORBIT_POSE,
      0,
      1_000_000,
      100,
    );

    expect(Number.isFinite(getLiquidMetalOrbitCameraQuaternion(result).x)).toBe(
      true,
    );
    expect(Math.abs(result.position[1])).toBeCloseTo(
      getLiquidMetalOrbitRadius(DEFAULT_LIQUID_METAL_ORBIT_POSE),
      8,
    );
    expect(Math.hypot(result.position[0], result.position[2])).toBeGreaterThan(
      0,
    );
  });

  it("projects all world axes with source depth/front semantics", () => {
    const projected = projectLiquidMetalOrbitAxes(
      { position: [0, 0, 10], up: [0, 1, 0] },
      35,
      24.5,
    );
    const byAxis = Object.fromEntries(
      projected.map((item) => [item.axis, item]),
    );

    expect(byAxis["+x"]).toMatchObject({ x: 59.5, y: 35, depth: 0 });
    expect(byAxis["-x"]).toMatchObject({ x: 10.5, y: 35, depth: 0 });
    expect(byAxis["+y"]).toMatchObject({ x: 35, y: 10.5, depth: 0 });
    expect(byAxis["-y"]).toMatchObject({ x: 35, y: 59.5, depth: 0 });
    expect(byAxis["+z"].depth).toBeCloseTo(-1, 12);
    expect(byAxis["+z"].isFrontFacing).toBe(true);
    expect(byAxis["-z"].depth).toBeCloseTo(1, 12);
    expect(byAxis["-z"].isFrontFacing).toBe(false);
  });

  it("snaps every axis while preserving the Liquid Metal camera radius", () => {
    const radius = getLiquidMetalOrbitRadius(DEFAULT_LIQUID_METAL_ORBIT_POSE);
    const expectations: Record<
      LiquidMetalOrbitAxis,
      { position: [number, number, number]; up: [number, number, number] }
    > = {
      "+x": { position: [radius, 0, 0], up: [0, 1, 0] },
      "-x": { position: [-radius, 0, 0], up: [0, 1, 0] },
      "+y": { position: [0, radius, 0], up: [0, 0, -1] },
      "-y": { position: [0, -radius, 0], up: [0, 0, 1] },
      "+z": { position: [0, 0, radius], up: [0, 1, 0] },
      "-z": { position: [0, 0, -radius], up: [0, 1, 0] },
    };

    (Object.keys(expectations) as LiquidMetalOrbitAxis[]).forEach((axis) => {
      const snapped = snapLiquidMetalOrbitPose(
        DEFAULT_LIQUID_METAL_ORBIT_POSE,
        axis,
      );

      expectTupleClose(snapped.position, expectations[axis].position);
      expectTupleClose(snapped.up, expectations[axis].up);
      expect(getLiquidMetalOrbitRadius(snapped)).toBeCloseTo(radius, 10);
    });
  });

  it("uses the source clamped quadratic ease-in-out", () => {
    expect(easeLiquidMetalOrbitSnap(-1)).toBe(0);
    expect(easeLiquidMetalOrbitSnap(0)).toBe(0);
    expect(easeLiquidMetalOrbitSnap(0.25)).toBe(0.125);
    expect(easeLiquidMetalOrbitSnap(0.5)).toBe(0.5);
    expect(easeLiquidMetalOrbitSnap(0.75)).toBe(0.875);
    expect(easeLiquidMetalOrbitSnap(1)).toBe(1);
    expect(easeLiquidMetalOrbitSnap(2)).toBe(1);
  });
});
