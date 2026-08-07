import { expect, test } from "vitest";

import { createToolcraftState } from "@/toolcraft/runtime";

import { appSchema } from "../app-schema";
import {
  getFrozenSceneSettings,
  getFrozenSettingsToken,
  shouldCoolFrozenMelt,
} from "./frozen-values";

function control(target: string) {
  return appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((candidate) => candidate.target === target);
}

test("melt.enabled locks model orbit and reveals brush settings", () => {
  expect(control("melt.enabled")).toMatchObject({
    defaultValue: true,
    type: "switch",
  });
  for (const target of [
    "melt.heat",
    "melt.radius",
    "melt.structure",
    "melt.refreeze",
    "melt.refreezeMode",
    "melt.action",
  ]) {
    expect(control(target)?.visibleWhen).toEqual({
      equals: true,
      target: "melt.enabled",
    });
  }
  expect(control("scene.orientation")?.visibleWhen).toEqual({
    equals: false,
    target: "melt.enabled",
  });
});

test("melt.refreezeMode changes cooling start time", () => {
  const state = createToolcraftState(appSchema);
  const baseline = getFrozenSceneSettings(state);
  const duringStroke = getFrozenSceneSettings({
    ...state,
    values: { ...state.values, "melt.refreezeMode": "during-stroke" },
  });

  expect(control("melt.refreezeMode")).toMatchObject({
    defaultValue: "after-release",
    options: [
      { label: "Drawing", value: "during-stroke" },
      { label: "Release", value: "after-release" },
    ],
    type: "segmented",
  });
  expect(baseline.melt.refreezeMode).toBe("after-release");
  expect(duringStroke.melt.refreezeMode).toBe("during-stroke");
  expect(shouldCoolFrozenMelt("after-release", true)).toBe(false);
  expect(shouldCoolFrozenMelt("after-release", false)).toBe(true);
  expect(shouldCoolFrozenMelt("during-stroke", true)).toBe(true);
});

test("melt.structure changes thermal edge breakup", () => {
  const state = createToolcraftState(appSchema);
  const baseline = getFrozenSceneSettings(state);
  const changed = getFrozenSceneSettings({
    ...state,
    values: { ...state.values, "melt.structure": 0 },
  });
  expect(baseline.melt.structure).toBe(0.83);
  expect(changed.melt.structure).toBe(0);
  expect(getFrozenSettingsToken(changed)).not.toBe(
    getFrozenSettingsToken(baseline),
  );
});
