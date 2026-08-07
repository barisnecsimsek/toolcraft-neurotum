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
    expect(getToolcraftControlOrderTargets(appSchema)).toEqual([
      "media.model",
      "model.scale",
      "view.orbit",
      "media.scratches",
      "surface.scratchDepth",
      "surface.scratchScale",
      "surface.scratchInvert",
      "media.stickers",
      "stickers.scale",
      "stickers.rotation",
      "shader.preset",
      "shader.colorBack",
      "shader.colorTint",
      "shader.repetition",
      "shader.softness",
      "shader.shiftRed",
      "shader.shiftBlue",
      "shader.distortion",
      "shader.contour",
      "shader.angle",
      "shader.speed",
      "shader.scale",
      "shader.rotation",
      "shader.fit",
      "shader.offset",
      "lighting.environmentPreset",
      "media.environment",
      "lighting.environmentIntensity",
      "lighting.environmentRotation",
      "export.includeBackground",
      "appearance.background",
      "export.image.format",
      "export.image.resolution",
      "export.video.format",
      "export.video.resolution",
    ]);
  });
});
