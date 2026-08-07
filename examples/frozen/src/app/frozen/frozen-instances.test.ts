import { expect, test } from "vitest";

import { createToolcraftState } from "@/toolcraft/runtime";

import { appSchema } from "../app-schema";
import { getFrozenCrystalFootprintScale } from "./frozen-instances";
import { getFrozenSceneSettings } from "./frozen-values";

function settingsWith(values: Readonly<Record<string, unknown>>) {
  const state = createToolcraftState(appSchema);
  return getFrozenSceneSettings({
    ...state,
    values: { ...state.values, ...values },
  });
}

test("icicle controls preserve exact zero geometry inputs", () => {
  expect(settingsWith({ "ice.icicleDensity": 0 }).icicles.density).toBe(0);
  expect(settingsWith({ "ice.icicleLength": 0 }).icicles.length).toBe(0);
  expect(settingsWith({ "ice.icicleRadius": 0 }).icicles.radius).toBe(0);
});

test("icicle density maps the slider to geometry-relative coverage", () => {
  expect(settingsWith({ "ice.icicleDensity": 1 }).icicles.density).toBe(0.01);
  expect(settingsWith({ "ice.icicleDensity": 100 }).icicles.density).toBe(1);
});

test("full crystal coverage closes the geometry-derived sample footprint", () => {
  const sparse = getFrozenCrystalFootprintScale(12, 12_000, 0.45, 0.42);
  const full = getFrozenCrystalFootprintScale(12, 12_000, 1, 0.42);
  const largerSurface = getFrozenCrystalFootprintScale(48, 12_000, 1, 0.42);
  expect(full).toBeGreaterThan(sparse * 2);
  expect(largerSurface).toBeCloseTo(full * 2);
  expect(getFrozenCrystalFootprintScale(12, 12_000, 0, 0.42)).toBe(0);
});
