"use client";

import * as React from "react";
import { Panel, type ControlChangeMeta } from "@/toolcraft/ui";

import type {
  ToolcraftControlSectionSchema,
  ToolcraftControlSchema,
  ToolcraftControlsPanelSchema,
} from "../../schema/types";
import {
  getToolcraftHistorySourceGeneration,
  type ToolcraftStoreDependency,
} from "../../state/toolcraft-external-store-dependencies";
import { getToolcraftControlsResetHistorySource } from "../../state/history-patch-metadata";
import type {
  ToolcraftCommand,
  ToolcraftPanelState,
  ToolcraftState,
} from "../../state/types";
import { PanelContainer } from "../panel-host/panel-host";
import type {
  PanelPlacement,
  PanelStateChange,
} from "../panel-host/panel-host-types";
import { useToolcraftDependencySelector } from "../app-shell/toolcraft-selectors";
import { useToolcraftStore } from "../app-shell/toolcraft-store-context";
import { useToolcraftDispatch } from "../app-shell/use-toolcraft";
import {
  type ToolcraftPanelActionHandler,
  useControlsPanelActions,
} from "./actions/controls-panel-actions";
import type { ToolcraftControlRendererMap } from "./control-renderers";
import {
  getToolcraftControlVisibilityTargets,
  getToolcraftSectionVisibilityTargets,
  isToolcraftControlVisible,
  isToolcraftSectionVisible,
} from "./conditions/control-conditions";
import { getControlsPanelTargetDependencies } from "./conditions/control-condition-dependencies";
import {
  getControlsPanelSectionCollapseKey,
  getControlsPanelSectionCollapseStorageKey,
  readControlsPanelCollapsedSections,
  writeControlsPanelCollapsedSections,
} from "./layout/controls-panel-collapse-storage";
import type { ControlsPanelSetControlValue } from "./layout/controls-panel-control-group";
import {
  type ControlEntry,
  countControlsByType,
  getControlsRecord,
  isControlsPanelRenderableControl,
} from "./layout/controls-panel-layout";
import { ControlsPanelSection } from "./layout/controls-panel-section";

export type {
  ToolcraftPanelActionContext,
  ToolcraftPanelActionHandler,
} from "./actions/controls-panel-actions";

export type ControlsPanelProps = {
  className?: string;
  controlRenderers?: ToolcraftControlRendererMap;
  framed?: boolean;
  onPanelAction?: ToolcraftPanelActionHandler;
  onPanelStateChange?: PanelStateChange;
  panelPlacement?: PanelPlacement;
  panelState?: ToolcraftPanelState;
};

type VisibleSection = {
  entries: readonly ControlEntry[];
  section: ToolcraftControlSectionSchema;
};

type ControlsPanelSelection = {
  controlsResetKey: number;
  keyframeControlsEnabled: boolean;
  vectorPadShape: "compact" | "square";
  visibleSections: readonly VisibleSection[];
};

function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

function entriesEqual(
  previous: readonly ControlEntry[],
  next: readonly ControlEntry[],
): boolean {
  return (
    previous.length === next.length &&
    previous.every(
      ([id, control], index) =>
        id === next[index]?.[0] && Object.is(control, next[index]?.[1]),
    )
  );
}

function panelSelectionsEqual(
  previous: ControlsPanelSelection,
  next: ControlsPanelSelection,
): boolean {
  return (
    previous.controlsResetKey === next.controlsResetKey &&
    previous.keyframeControlsEnabled === next.keyframeControlsEnabled &&
    previous.vectorPadShape === next.vectorPadShape &&
    previous.visibleSections.length === next.visibleSections.length &&
    previous.visibleSections.every(
      (visibleSection, index) =>
        visibleSection.section === next.visibleSections[index]?.section &&
        entriesEqual(
          visibleSection.entries,
          next.visibleSections[index]?.entries ?? [],
        ),
    )
  );
}

function getPanelDependencies({
  controlsPanel,
  keyframesSupported,
}: {
  controlsPanel: ToolcraftControlsPanelSchema | undefined;
  keyframesSupported: boolean;
}): ToolcraftStoreDependency[] {
  const visibilityTargets =
    controlsPanel?.sections.flatMap((section) => [
      ...getToolcraftSectionVisibilityTargets(section),
      ...Object.values(section.controls).flatMap((control) =>
        getToolcraftControlVisibilityTargets(control),
      ),
    ]) ?? [];

  return [
    {
      kind: "history.source",
      source: getToolcraftControlsResetHistorySource(),
    },
    ...(keyframesSupported ? [{ kind: "timeline.expanded" } as const] : []),
    ...getControlsPanelTargetDependencies(visibilityTargets),
  ];
}

function selectControlsPanel(
  state: ToolcraftState,
  controlsPanel: ToolcraftControlsPanelSchema | undefined,
  keyframesSupported: boolean,
): ControlsPanelSelection {
  const visibleSections =
    controlsPanel?.sections
      .map(
        (section): VisibleSection => ({
          entries: Object.entries(section.controls).filter(([, control]) =>
            isToolcraftControlVisible(state, control),
          ),
          section,
        }),
      )
      .filter(
        ({ entries, section }) =>
          entries.some(([, control]) =>
            isControlsPanelRenderableControl(control),
          ) && isToolcraftSectionVisible(state, section),
      ) ?? [];
  const visibleControlsPanelSections = visibleSections.map(
    ({ entries, section }) => ({
      ...section,
      controls: getControlsRecord(entries),
    }),
  );
  const vectorControlCount = countControlsByType(
    visibleControlsPanelSections,
    "vector",
  );

  return {
    controlsResetKey: getToolcraftHistorySourceGeneration(
      state.history,
      getToolcraftControlsResetHistorySource(),
    ),
    keyframeControlsEnabled: keyframesSupported && state.timeline.expanded,
    vectorPadShape: vectorControlCount === 1 ? "square" : "compact",
    visibleSections,
  };
}

export function ControlsPanel({
  className,
  controlRenderers,
  framed = true,
  onPanelAction,
  onPanelStateChange,
  panelPlacement,
  panelState,
}: ControlsPanelProps): React.JSX.Element | null {
  const dispatch = useToolcraftDispatch();
  const store = useToolcraftStore();
  const schema = store.getCommittedState().schema;
  const controlsPanel = schema.panels.controls;
  const keyframesSupported =
    schema.assembly.capabilities.includes("timeline.keyframes");
  const dependencies = React.useMemo(
    () => getPanelDependencies({ controlsPanel, keyframesSupported }),
    [controlsPanel, keyframesSupported],
  );
  const selection = useToolcraftDependencySelector(
    React.useCallback(
      (state: ToolcraftState) =>
        selectControlsPanel(state, controlsPanel, keyframesSupported),
      [controlsPanel, keyframesSupported],
    ),
    panelSelectionsEqual,
    dependencies,
  );
  const { runAction, stickyFooterActive, stickyFooterProgress } =
    useControlsPanelActions({
      dispatch,
      getState: store.getState,
      onPanelAction,
    });
  const runActionRef = React.useRef(runAction);
  runActionRef.current = runAction;
  const stableRunAction = React.useCallback<typeof runAction>(
    (action, options) => {
      runActionRef.current(action, options);
    },
    [],
  );
  const sectionCollapseStorageKey = React.useMemo(
    () => getControlsPanelSectionCollapseStorageKey(schema),
    [schema],
  );
  const [collapsedSectionByKey, setCollapsedSectionByKey] = React.useState<
    Record<string, boolean>
  >(() => readControlsPanelCollapsedSections(sectionCollapseStorageKey));

  React.useEffect(() => {
    setCollapsedSectionByKey(
      readControlsPanelCollapsedSections(sectionCollapseStorageKey),
    );
  }, [sectionCollapseStorageKey]);

  const dispatchCommand = React.useCallback(
    (command: ToolcraftCommand): void => {
      dispatch(command);
    },
    [dispatch],
  );
  const setControlValue = React.useCallback<ControlsPanelSetControlValue>(
    (target, value, label, meta?: ControlChangeMeta): void => {
      dispatchCommand({
        history: meta?.history,
        historyGroup: meta?.historyGroup,
        label,
        target,
        type: "controls.setValue",
        value,
      });
    },
    [dispatchCommand],
  );
  const handleSectionCollapsedChange = React.useCallback(
    (sectionCollapseKey: string, collapsed: boolean): void => {
      setCollapsedSectionByKey((current) => {
        const next = { ...current, [sectionCollapseKey]: collapsed };

        writeControlsPanelCollapsedSections(sectionCollapseStorageKey, next);
        return next;
      });
    },
    [sectionCollapseStorageKey],
  );

  if (!controlsPanel) {
    return null;
  }

  const placement = panelPlacement ?? (framed ? "frame" : "surface");
  const panel = (
    <Panel
      className={cn(
        "shrink-0",
        placement === "frame" && "max-h-none",
        className,
      )}
      collapsed={panelState?.collapsed}
      contentTransitionSuppressionKey={
        selection.keyframeControlsEnabled ? "keyframes" : "plain"
      }
      key={selection.controlsResetKey}
      onCollapsedChange={(collapsed) => onPanelStateChange?.({ collapsed })}
      onResetControls={() => dispatchCommand({ type: "controls.reset" })}
      stickyFooterActive={stickyFooterActive}
      stickyFooterProgress={stickyFooterProgress}
      title={controlsPanel.title}
    >
      {selection.visibleSections.map(({ entries, section }, sectionIndex) => {
        const sectionCollapseKey = getControlsPanelSectionCollapseKey({
          entries,
          section,
          sectionIndex,
        });

        return (
          <ControlsPanelSection
            data-toolcraft-panel-section=""
            actionGroup={section.actionGroup}
            collapsed={collapsedSectionByKey[sectionCollapseKey] === true}
            controlRenderers={controlRenderers}
            dispatch={dispatch}
            dispatchCommand={dispatchCommand}
            entries={entries}
            key={`${section.title ?? "section"}-${sectionIndex}`}
            keyframesSupported={keyframesSupported}
            onCollapsedChange={handleSectionCollapsedChange}
            runAction={stableRunAction}
            section={section}
            sectionCollapseKey={sectionCollapseKey}
            setControlValue={setControlValue}
            vectorPadShape={selection.vectorPadShape}
          />
        );
      })}
    </Panel>
  );

  if (placement === "surface") {
    return panel;
  }

  return (
    <PanelContainer
      onPanelStateChange={onPanelStateChange}
      panelState={panelState}
      panelType="controls"
      placement={placement}
    >
      {panel}
    </PanelContainer>
  );
}
