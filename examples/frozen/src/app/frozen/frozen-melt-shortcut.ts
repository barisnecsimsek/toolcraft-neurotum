import * as React from "react";

import {
  useToolcraftDispatch,
  useToolcraftValue,
} from "@/toolcraft/runtime/react";

type KeyboardTarget = EventTarget & {
  closest?: (selector: string) => Element | null;
  isContentEditable?: boolean;
  tagName?: string;
};

export type FrozenMeltShortcutEvent = Pick<
  KeyboardEvent,
  | "altKey"
  | "code"
  | "ctrlKey"
  | "defaultPrevented"
  | "isComposing"
  | "key"
  | "metaKey"
  | "repeat"
  | "shiftKey"
  | "target"
>;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;

  const candidate = target as KeyboardTarget;
  const tagName = candidate.tagName?.toUpperCase();
  if (
    tagName === "INPUT" ||
    tagName === "SELECT" ||
    tagName === "TEXTAREA"
  ) {
    return true;
  }
  if (candidate.isContentEditable) return true;

  const editableAncestor = candidate.closest?.("[contenteditable]");
  return (
    editableAncestor !== null &&
    editableAncestor !== undefined &&
    editableAncestor.getAttribute("contenteditable") !== "false"
  );
}

export function isFrozenMeltShortcutEvent(
  event: FrozenMeltShortcutEvent,
): boolean {
  return (
    event.code === "KeyM" &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.metaKey &&
    !event.repeat &&
    !event.shiftKey &&
    !isEditableKeyboardTarget(event.target)
  );
}

export function useFrozenMeltShortcut(): void {
  const dispatch = useToolcraftDispatch();
  const enabled = Boolean(useToolcraftValue("melt.enabled"));

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isFrozenMeltShortcutEvent(event)) return;

      event.preventDefault();
      dispatch({
        label: enabled ? "Disable Melt Brush" : "Enable Melt Brush",
        target: "melt.enabled",
        type: "controls.setValue",
        value: !enabled,
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, enabled]);
}
