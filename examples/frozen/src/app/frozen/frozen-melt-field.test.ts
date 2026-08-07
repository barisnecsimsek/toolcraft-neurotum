import * as THREE from "three";
import { expect, test } from "vitest";

import {
  FrozenMeltField,
  getFrozenMeltBrushRadius,
} from "./frozen-melt-field";
import type { FrozenSceneSettings } from "./frozen-values";

function meltSettings(
  overrides: Partial<FrozenSceneSettings["melt"]> = {},
): FrozenSceneSettings["melt"] {
  return {
    enabled: true,
    heat: 0.68,
    radius: 0.24,
    refreeze: 0.28,
    refreezeMode: "after-release",
    structure: 0.64,
    ...overrides,
  };
}

test("melt.heat changes thermal deposition strength", () => {
  const point = new THREE.Vector3(0, 0, 0);
  const low = new FrozenMeltField(24);
  const high = new FrozenMeltField(24);
  try {
    low.deposit(point, meltSettings({ heat: 0.1 }));
    high.deposit(point, meltSettings({ heat: 1 }));
    expect(high.sample(point)).toBeGreaterThan(low.sample(point));
    expect(getFrozenMeltBrushRadius(meltSettings({ heat: 1 }))).toBeGreaterThan(
      getFrozenMeltBrushRadius(meltSettings({ heat: 0.1 })),
    );
  } finally {
    low.dispose();
    high.dispose();
  }
});

test("melt.radius changes geometry brush footprint", () => {
  const small = getFrozenMeltBrushRadius(meltSettings({ radius: 0.05 }));
  const large = getFrozenMeltBrushRadius(meltSettings({ radius: 1 }));
  expect(large).toBeGreaterThan(small * 4);
});

test("melt.paint deposits continuous object-space heat", () => {
  const field = new FrozenMeltField(32);
  try {
    const settings = meltSettings({ heat: 1, radius: 0.18, refreeze: 0 });
    field.deposit(new THREE.Vector3(-0.45, 0, 0), settings);
    field.depositSegment(
      new THREE.Vector3(-0.45, 0, 0),
      new THREE.Vector3(0.45, 0, 0),
      settings,
    );
    expect(field.sample(new THREE.Vector3(-0.2, 0, 0))).toBeGreaterThan(0.15);
    expect(field.sample(new THREE.Vector3(0, 0, 0))).toBeGreaterThan(0.15);
    expect(field.sample(new THREE.Vector3(0.2, 0, 0))).toBeGreaterThan(0.15);
  } finally {
    field.dispose();
  }
});

test("melt.refreeze changes thermal cooling", () => {
  const persistent = new FrozenMeltField(20);
  const cooling = new FrozenMeltField(20);
  const point = new THREE.Vector3();
  try {
    const settings = meltSettings({ heat: 1 });
    persistent.deposit(point, settings);
    cooling.deposit(point, settings);
    const initial = cooling.sample(point);
    expect(persistent.step(1, 0)).toBe(false);
    expect(cooling.step(1, 0.8)).toBe(true);
    expect(persistent.sample(point)).toBeGreaterThanOrEqual(initial - 0.01);
    expect(cooling.sample(point)).toBeLessThan(initial * 0.5);
  } finally {
    persistent.dispose();
    cooling.dispose();
  }
});

test("melt.action clears only the thermal field", () => {
  const field = new FrozenMeltField(16);
  try {
    field.deposit(new THREE.Vector3(), meltSettings({ heat: 1 }));
    expect(field.getMaximum()).toBeGreaterThan(0);
    expect(field.clear()).toBe(true);
    expect(field.getMaximum()).toBe(0);
    expect(field.sample(new THREE.Vector3())).toBe(0);
    expect(field.clear()).toBe(false);
  } finally {
    field.dispose();
  }
});
