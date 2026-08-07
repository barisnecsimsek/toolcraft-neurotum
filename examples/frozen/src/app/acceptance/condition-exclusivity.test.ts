import { describe, expect, it } from "vitest";

import { areToolcraftConditionsProvablyExclusive } from "./condition-exclusivity";

describe("Toolcraft condition exclusivity", () => {
  it("proves disjoint finite value gates", () => {
    expect(
      areToolcraftConditionsProvablyExclusive(
        { equals: "first", target: "model.active" },
        { equals: "second", target: "model.active" },
      ),
    ).toBe(true);
    expect(
      areToolcraftConditionsProvablyExclusive(
        { oneOf: ["first", "second"], target: "model.active" },
        { equals: "second", target: "model.active" },
      ),
    ).toBe(false);
    expect(
      areToolcraftConditionsProvablyExclusive(
        { notEquals: "hidden", target: "model.active" },
        { equals: "second", target: "model.active" },
      ),
    ).toBe(false);
  });

  it("proves non-overlapping numeric intervals without guessing across targets", () => {
    expect(
      areToolcraftConditionsProvablyExclusive(
        { lessThan: 0, target: "model.index" },
        { greaterThanOrEqual: 0, target: "model.index" },
      ),
    ).toBe(true);
    expect(
      areToolcraftConditionsProvablyExclusive(
        { equals: "first", target: "first.mode" },
        { equals: "second", target: "second.mode" },
      ),
    ).toBe(false);
  });
});
