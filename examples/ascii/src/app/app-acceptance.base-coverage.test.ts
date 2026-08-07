import { describe, expect, it } from "vitest";

import {
  getToolcraftControlOrderTargets,
  appAcceptance,
  starterControlSectionInventory,
  appTransferMode,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appSchema } from "./app-schema";
import { schemaHasProductSurface } from "./app-acceptance.schema-test-utils";

describe("Toolcraft starter base acceptance coverage", () => {
  it("requires acceptance coverage for every visible schema control", () => {
    expect(validateToolcraftAcceptanceCoverage(appSchema, appAcceptance)).toEqual([]);
  });

  it("requires generated product apps to publish a control section inventory", () => {
    if (!schemaHasProductSurface()) {
      expect(starterControlSectionInventory).toEqual([]);
      return;
    }

    expect(
      starterControlSectionInventory.length,
      "Product apps must export starterControlSectionInventory so section grouping decisions are machine-checkable.",
    ).toBeGreaterThan(0);
    expect(
      validateToolcraftAcceptanceCoverage(
        appSchema,
        appAcceptance,
        appTransferMode,
        starterControlSectionInventory,
      ),
    ).toEqual([]);
  });

  it("publishes control order targets for app schema tests", () => {
    expect(getToolcraftControlOrderTargets(appSchema)).toEqual(
      expect.arrayContaining([
        "source.model",
        "effect.mode",
        "adjustments.toneMapping",
        "overlay.angle",
        "export.image.resolution",
      ]),
    );
  });
});
