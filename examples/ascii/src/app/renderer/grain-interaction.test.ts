import { describe, expect, it } from "vitest";

import { shouldSuspendGrainForPointerGesture } from "./grain-interaction";

const baseGesture = {
  button: 0,
  ctrlKey: false,
  isEffectsCanvas: false,
  isOrientationGizmo: false,
  metaKey: false,
  shiftKey: false,
};

describe("Film Grain pointer interaction scheduling", () => {
  it("keeps Grain running during direct model orbit", () => {
    expect(
      shouldSuspendGrainForPointerGesture({
        ...baseGesture,
        isEffectsCanvas: true,
      }),
    ).toBe(false);
  });

  it("keeps Grain running during orientation-gizmo orbit", () => {
    expect(
      shouldSuspendGrainForPointerGesture({
        ...baseGesture,
        isOrientationGizmo: true,
      }),
    ).toBe(false);
  });

  it("suspends Grain for blank-viewport pan", () => {
    expect(shouldSuspendGrainForPointerGesture(baseGesture)).toBe(true);
  });

  it.each(["shiftKey", "ctrlKey", "metaKey"] as const)(
    "suspends Grain when %s hands a product-canvas drag to the viewport",
    (modifier) => {
      expect(
        shouldSuspendGrainForPointerGesture({
          ...baseGesture,
          isEffectsCanvas: true,
          [modifier]: true,
        }),
      ).toBe(true);
    },
  );

  it("does not suspend for pointer buttons ignored by viewport dragging", () => {
    expect(
      shouldSuspendGrainForPointerGesture({
        ...baseGesture,
        button: 2,
      }),
    ).toBe(false);
  });
});
