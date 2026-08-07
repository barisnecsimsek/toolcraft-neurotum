"use client";

import type { ReactElement, ReactNode } from "react";
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  CopySimpleIcon,
  DownloadSimpleIcon,
  EraserIcon,
  ExportIcon,
  MagicWandIcon,
  ShuffleIcon,
} from "@phosphor-icons/react";

import { Button, Field } from "../../primitives";
import { ControlFieldLabel } from "../../control-layout";

export type ActionControlIconName =
  | "check"
  | "copy"
  | "download"
  | "download-simple"
  | "eraser"
  | "export"
  | "rotate-ccw"
  | "shuffle"
  | "wand-sparkles";

const actionIconComponents = {
  check: CheckIcon,
  copy: CopySimpleIcon,
  download: DownloadSimpleIcon,
  "download-simple": DownloadSimpleIcon,
  eraser: EraserIcon,
  export: ExportIcon,
  "rotate-ccw": ArrowCounterClockwiseIcon,
  shuffle: ShuffleIcon,
  "wand-sparkles": MagicWandIcon,
} as const;

export type ActionControlObjectOption = {
  children?: ReactNode;
  label?: string;
  value: string;
  icon?: ActionControlIconName | ReactElement;
};

export type ActionControlOption = string | ActionControlObjectOption;

function getActionValue(action: ActionControlOption): string {
  return typeof action === "string" ? action : action.value;
}

function getActionContent(action: ActionControlOption): ReactNode {
  if (typeof action === "string") {
    return action;
  }

  return action.children ?? action.label ?? action.value;
}

function getActionIcon(action: ActionControlOption): ReactNode {
  if (typeof action === "string" || action.icon == null) {
    return null;
  }

  if (typeof action.icon !== "string") {
    return action.icon;
  }

  const Icon = actionIconComponents[action.icon];

  return <Icon data-icon="inline-start" />;
}

function getActionAriaLabel(
  action: ActionControlOption,
  content: ReactNode,
): string | undefined {
  if (typeof content === "string") {
    return undefined;
  }

  return typeof action === "string" ? action : (action.label ?? action.value);
}

export type ActionsControlProps = {
  actions: readonly ActionControlOption[];
  name: string;
  onAction?: (value: string) => void;
  showLabel?: boolean;
};

export function ActionsControl({
  actions,
  name,
  onAction,
  showLabel = true,
}: ActionsControlProps): React.JSX.Element {
  return (
    <Field
      aria-label={showLabel ? undefined : name}
      className="h-fit min-w-0 flex-wrap items-center justify-between gap-y-2!"
      data-slot="actions-control"
      orientation="horizontal"
    >
      {showLabel ? (
        <ControlFieldLabel className="min-w-0" textClassName="min-w-0 truncate">
          {name}
        </ControlFieldLabel>
      ) : null}
      <div
        className="flex max-w-full shrink-0 flex-wrap items-center justify-start gap-1.5"
        data-slot="actions-control-buttons"
      >
        {actions.map((action) => {
          const actionContent = getActionContent(action);
          const actionValue = getActionValue(action);

          return (
            <Button
              aria-label={getActionAriaLabel(action, actionContent)}
              key={actionValue}
              onClick={() => onAction?.(actionValue)}
              size="sm"
              type="button"
              variant="outline"
            >
              {getActionIcon(action)}
              {actionContent}
            </Button>
          );
        })}
      </div>
    </Field>
  );
}
