import { expect, test } from "vitest";

import { createToolcraftState } from "@/toolcraft/runtime";

import { appSchema } from "../app-schema";
import {
  getFrozenModelExposureMultiplier,
  getFrozenSceneSettings,
} from "./frozen-values";

function control(target: string) {
  return appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((candidate) => candidate.target === target);
}

test("source.modelExposure changes model brightness", () => {
  const state = createToolcraftState(appSchema);
  const dark = getFrozenSceneSettings({
    ...state,
    values: { ...state.values, "source.modelExposure": -2 },
  });
  const bright = getFrozenSceneSettings({
    ...state,
    values: { ...state.values, "source.modelExposure": 2 },
  });

  expect(control("source.modelExposure")).toMatchObject({
    defaultValue: -1.1,
    max: 3,
    min: -3,
    step: 0.1,
    type: "slider",
    unit: "EV",
    visibleWhen: { equals: "model", target: "source.mode" },
  });
  expect(dark.sourceMaterial.exposure).toBe(-2);
  expect(bright.sourceMaterial.exposure).toBe(2);
  expect(getFrozenModelExposureMultiplier(dark.sourceMaterial.exposure)).toBe(
    0.25,
  );
  expect(getFrozenModelExposureMultiplier(bright.sourceMaterial.exposure)).toBe(
    4,
  );
});
