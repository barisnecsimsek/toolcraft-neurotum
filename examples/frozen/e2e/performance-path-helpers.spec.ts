import { expect, test } from "@playwright/test";

import type { ToolcraftPerformancePath } from "@/toolcraft/runtime";

import {
  compileToolcraftPerformancePathAdapterMatrix,
  getToolcraftPerformancePathTestName,
} from "./performance-path-helpers";
import type { ToolcraftPerformancePathAdapter } from "./performance-path-adapter-contract";

const paths = [
  {
    id: "performance-path:b",
    interaction: "control-change",
    invalidates: [],
    profile: "interactive-discrete",
    runsOn: [],
    targets: ["appearance.b"],
    workloadDimensions: [],
  },
  {
    id: "performance-path:a",
    interaction: "control-drag",
    invalidates: ["preview"],
    profile: "interactive-continuous",
    runsOn: ["main"],
    targets: ["appearance.a", "appearance.aEquivalent"],
    workloadDimensions: [],
  },
] as const satisfies readonly ToolcraftPerformancePath[];

function adapter(pathId: string): ToolcraftPerformancePathAdapter {
  return {
    action: async () => undefined,
    observeOutcome: () => pathId,
    pathId,
    prepare: async () => undefined,
  };
}

test("browser perf: path adapter matrix is canonical and deterministic", () => {
  const matrix = compileToolcraftPerformancePathAdapterMatrix(paths, [
    adapter(paths[0].id),
    adapter(paths[1].id),
  ]);

  expect(matrix.map((entry) => entry.path.id)).toEqual([
    "performance-path:a",
    "performance-path:b",
  ]);
  expect(matrix.map((entry) => entry.testName)).toEqual(
    matrix.map((entry) => getToolcraftPerformancePathTestName(entry.path)),
  );
  expect(matrix[0]?.path.targets).toEqual([
    "appearance.a",
    "appearance.aEquivalent",
  ]);
});

test("browser perf: path adapter matrix rejects missing duplicate and orphan adapters", () => {
  expect(() =>
    compileToolcraftPerformancePathAdapterMatrix(paths, [adapter(paths[0].id)]),
  ).toThrow(/missing adapter.*performance-path:a/iu);

  expect(() =>
    compileToolcraftPerformancePathAdapterMatrix(paths, [
      adapter(paths[0].id),
      adapter(paths[0].id),
      adapter(paths[1].id),
    ]),
  ).toThrow(/duplicate adapter.*performance-path:b/iu);

  expect(() =>
    compileToolcraftPerformancePathAdapterMatrix(paths, [
      adapter(paths[0].id),
      adapter(paths[1].id),
      adapter("performance-path:orphan"),
    ]),
  ).toThrow(/orphan adapter.*performance-path:orphan/iu);

  expect(() =>
    compileToolcraftPerformancePathAdapterMatrix(
      [paths[0], paths[0]],
      [adapter(paths[0].id)],
    ),
  ).toThrow(/duplicate canonical path ids/iu);
});

test("browser perf: path adapter matrix enforces outcome and output semantics", () => {
  expect(() =>
    compileToolcraftPerformancePathAdapterMatrix(paths, [
      { ...adapter(paths[0].id), observeOutcome: undefined },
      adapter(paths[1].id),
    ]),
  ).toThrow(/requires an observable product outcome/iu);

  const exportPath = {
    id: "performance-path:export",
    interaction: "export",
    invalidates: ["output"],
    profile: "batch-responsive",
    runsOn: ["main"],
    targets: ["export.image"],
    workloadDimensions: [],
  } as const satisfies ToolcraftPerformancePath;
  expect(() =>
    compileToolcraftPerformancePathAdapterMatrix(
      [exportPath],
      [adapter(exportPath.id)],
    ),
  ).toThrow(/requires a protected output completion adapter/iu);
});
