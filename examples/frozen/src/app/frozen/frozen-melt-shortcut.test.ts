import { expect, test } from "vitest";

import {
  isFrozenMeltShortcutEvent,
  type FrozenMeltShortcutEvent,
} from "./frozen-melt-shortcut";

function meltShortcutEvent(
  overrides: Partial<FrozenMeltShortcutEvent> = {},
): FrozenMeltShortcutEvent {
  return {
    altKey: false,
    code: "KeyM",
    ctrlKey: false,
    defaultPrevented: false,
    isComposing: false,
    key: "m",
    metaKey: false,
    repeat: false,
    shiftKey: false,
    target: null,
    ...overrides,
  };
}

test("physical KeyM toggles Melt Brush independently of keyboard layout", () => {
  expect(isFrozenMeltShortcutEvent(meltShortcutEvent())).toBe(true);
  expect(
    isFrozenMeltShortcutEvent(
      meltShortcutEvent({ key: "ь" }),
    ),
  ).toBe(true);
  expect(
    isFrozenMeltShortcutEvent(meltShortcutEvent({ code: "KeyN" })),
  ).toBe(false);
});

test("Melt Brush shortcut ignores modified, repeated, and composing keys", () => {
  for (const overrides of [
    { altKey: true },
    { ctrlKey: true },
    { defaultPrevented: true },
    { isComposing: true },
    { metaKey: true },
    { repeat: true },
    { shiftKey: true },
  ]) {
    expect(isFrozenMeltShortcutEvent(meltShortcutEvent(overrides))).toBe(false);
  }
});

test("Melt Brush shortcut ignores editable controls", () => {
  for (const tagName of ["INPUT", "SELECT", "TEXTAREA"]) {
    expect(
      isFrozenMeltShortcutEvent(
        meltShortcutEvent({
          target: { tagName } as unknown as EventTarget,
        }),
      ),
    ).toBe(false);
  }

  expect(
    isFrozenMeltShortcutEvent(
      meltShortcutEvent({
        target: {
          isContentEditable: true,
          tagName: "DIV",
        } as unknown as EventTarget,
      }),
    ),
  ).toBe(false);
});
