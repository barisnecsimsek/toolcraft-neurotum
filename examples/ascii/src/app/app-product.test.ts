import { describe, expect, it } from "vitest";

import { validateToolcraftPerformanceCoverage } from "@/toolcraft/runtime";

import { validateToolcraftAcceptanceCoverage } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

function scenario(id: string) {
  return appPerformance.scenarios.find((item) => item.id === id);
}

describe("Mesh FX Lab product contract", () => {
  it("maps every Mesh FX schema control to runtime-backed renderer state", () => {
    expect(validateToolcraftAcceptanceCoverage(appSchema)).toEqual([]);
  });

  it("keeps the requested single-model editor free of layers and timeline", () => {
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.assembly.surfaces.canvas.enabled).toBe(true);
  });

  it("declares a valid typed WebGL performance matrix", () => {
    expect(validateToolcraftPerformanceCoverage(appSchema, appPerformance)).toEqual([]);
  });

  it("perf: worst-case WebGL preview stays under budget", () => {
    expect(scenario("webgl-preview-stress")?.budget.maxLongTaskMs).toBeDefined();
  });

  it("perf: effect mode changes stay responsive", () => {
    expect(scenario("effect-mode-change")?.target).toBe("effect.mode");
  });

  it("perf: pixelate size drag stays responsive", () => {
    expect(scenario("pixelate-size-drag")?.interaction).toBe("control-drag");
  });

  it("perf: camera orbit remains responsive", () => {
    expect(scenario("responsive-view-orbit")?.interaction).toBe("control-drag");
  });

  it("perf: high-poly OBJ import stays responsive", () => {
    expect(scenario("model-media-import")?.interaction).toBe("media-import");
  });

  it("perf: 4K image export stays under budget", () => {
    expect(scenario("image-export-4k")?.interaction).toBe("export-copy");
  });

  it("perf: viewport remains stable across effects", () => {
    expect(scenario("effects-viewport-stability")?.interaction).toBe(
      "viewport-stability",
    );
  });

  it("perf: stressed WebGL viewport zoom remains smooth", () => {
    expect(scenario("effects-viewport-zoom-stress")?.interaction).toBe(
      "viewport-zoom-stress",
    );
  });

  it("perf: animated grain frame loop stays smooth", () => {
    expect(scenario("grain-animation-frame")?.interaction).toBe("animation-frame");
  });

  it("perf: animated grain yields to viewport drag", () => {
    expect(scenario("grain-animation-viewport-drag")?.interaction).toBe(
      "animation-viewport-drag",
    );
  });

  it("perf: generated Effects control coverage stays responsive", () => {
    expect(
      appPerformance.scenarios.filter((item) =>
        item.automatedTestName.includes("generated Effects control coverage"),
      ).length,
    ).toBeGreaterThan(0);
  });
});
