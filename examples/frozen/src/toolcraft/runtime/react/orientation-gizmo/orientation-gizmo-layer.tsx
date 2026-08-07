"use client";

import * as React from "react";
import type { ControlChangeMeta } from "@/toolcraft/ui";

import type { ToolcraftControlSchema } from "../../schema/types";
import type { ToolcraftStoreDependency } from "../../state/toolcraft-external-store-dependencies";
import type { ToolcraftState } from "../../state/types";
import { useToolcraftDependencySelector } from "../app-shell/toolcraft-selectors";
import { useToolcraftStore } from "../app-shell/toolcraft-store-context";
import {
  getToolcraftControlVisibilityTargets,
  getToolcraftSectionVisibilityTargets,
} from "../controls-panel/conditions/control-conditions";
import { ToolcraftOrientationGizmo } from "./orientation-gizmo";
import { readToolcraftOrientationPose } from "./orientation-gizmo-math";
import {
  getToolcraftOrientationControlEntries,
  resolveToolcraftOrientationControl,
  type ToolcraftOrientationControlEntry,
} from "./orientation-gizmo-selection";

type OrientationSelection = {
  control: ToolcraftControlSchema | null;
  id: string | null;
  value: unknown;
};

function orientationSelectionsEqual(
  previous: OrientationSelection,
  next: OrientationSelection,
): boolean {
  return (
    previous.control === next.control &&
    previous.id === next.id &&
    Object.is(previous.value, next.value)
  );
}

function getOrientationDependencies(
  entries: readonly ToolcraftOrientationControlEntry[],
): ToolcraftStoreDependency[] {
  const targets = new Set<string>();

  for (const { control, section } of entries) {
    targets.add(control.target);
    for (const target of getToolcraftControlVisibilityTargets(control)) {
      targets.add(target);
    }
    for (const target of getToolcraftSectionVisibilityTargets(section)) {
      targets.add(target);
    }
  }

  return [...targets].map((target) => ({ kind: "value", target }) as const);
}

export function ToolcraftOrientationGizmoLayer(): React.JSX.Element | null {
  const store = useToolcraftStore();
  const entries = React.useMemo(
    () =>
      getToolcraftOrientationControlEntries(
        store.getCommittedState().schema.panels.controls?.sections ?? [],
      ),
    [store],
  );
  const dependencies = React.useMemo(
    () => getOrientationDependencies(entries),
    [entries],
  );
  const selection = useToolcraftDependencySelector(
    React.useCallback(
      (state: ToolcraftState): OrientationSelection => {
        const entry = resolveToolcraftOrientationControl(state, entries);

        return entry
          ? {
              control: entry.control,
              id: entry.id,
              value: state.values[entry.control.target],
            }
          : { control: null, id: null, value: undefined };
      },
      [entries],
    ),
    orientationSelectionsEqual,
    dependencies,
  );

  if (!selection.control || !selection.id) {
    return null;
  }

  const control = selection.control;
  const commit = (value: unknown, meta?: ControlChangeMeta): void => {
    store.dispatch({
      history: meta?.history,
      historyGroup: meta?.historyGroup,
      label:
        typeof control.label === "string"
          ? control.label
          : (selection.id ?? "Orientation"),
      target: control.target,
      type: "controls.setValue",
      value,
    });
  };

  return (
    <ToolcraftOrientationGizmo
      defaultValue={readToolcraftOrientationPose(control.defaultValue)}
      onValueChange={commit}
      store={store}
      target={control.target}
      value={selection.value}
    />
  );
}
