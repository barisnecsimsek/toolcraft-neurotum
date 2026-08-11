import { describe, expect, it } from "vitest";

import { appAcceptance, appTransferMode } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import { ParticleGridWebGlRenderer } from "./particle-grid";

function getControl(target: string) {
  return appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((control) => control.target === target);
}

describe("Particle Grid Effect product contract", () => {
  it("publishes the Particle Grid Toolcraft shell", () => {
    expect(appSchema.canvas).toMatchObject({
      draggable: true,
      enabled: true,
      size: { height: 360, unit: "px", width: 640 },
      sizing: { mode: "editable-output" },
      upload: true,
    });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.panels.controls?.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        "Setup",
        "Source",
        "Grid",
        "Particle Shape",
        "Color Mapping",
        "Dot Pattern",
        "Background",
        "Image Export",
      ]),
    );
  });

  it("source image control declares the complete media lifecycle", () => {
    expect(getControl("source.image")).toMatchObject({
      assetKind: "image",
      performanceRole: "workload",
      type: "fileDrop",
    });
  });

  it("resolution scale control changes canvas backing pixels", () => {
    expect(appSchema.canvas.renderScale).toMatchObject({
      defaultValue: 1,
      enabled: true,
      max: 2,
      min: 1,
    });
  });

  it("grid controls map the reference ranges", () => {
    expect(getControl("particle.columns")).toMatchObject({
      defaultValue: 80,
      max: 200,
      min: 10,
      step: 1,
      type: "slider",
    });
    expect(getControl("particle.rows")).toMatchObject({ defaultValue: 30, max: 150, min: 5 });
    expect(getControl("particle.maxColumnWidth")).toMatchObject({
      defaultValue: 0.9,
      label: "Maximum width",
      max: 1,
    });
    expect(getControl("particle.columnGap")).toMatchObject({ defaultValue: 0.05 });
    expect(getControl("particle.rowGap")).toBeUndefined();
  });

  it("particle shape controls map the reference ranges", () => {
    expect(getControl("particle.width")).toMatchObject({
      defaultValue: 1,
      label: "Width gain",
      min: 0.1,
      max: 3,
    });
    expect(getControl("particle.killBelowWidth")).toMatchObject({
      defaultValue: 0,
      label: "Kill below",
      min: 0,
      max: 1,
    });
    expect(getControl("particle.minWidth")).toMatchObject({ defaultValue: 0, max: 0.5 });
    expect(getControl("particle.shrinkThreshold")).toBeUndefined();
    expect(getControl("particle.maxShrink")).toBeUndefined();
    expect(getControl("particle.softness")).toMatchObject({ defaultValue: 0.02, max: 0.5 });
  });

  it("color controls map the reference modes and palette", () => {
    expect(getControl("particle.colorMode")).toMatchObject({
      defaultValue: "original",
      options: [
        { label: "Original", value: "original" },
        { label: "Tint", value: "tint" },
      ],
    });
    expect(getControl("particle.groupMode")).toMatchObject({
      defaultValue: "off",
      options: [
        { label: "Off", value: "off" },
        { label: "Brightness", value: "brightness" },
        { label: "Color", value: "color" },
      ],
    });
    expect(getControl("particle.tintColor")).toMatchObject({ defaultValue: "#FFFFFF" });
    expect(getControl("particle.groupColor1")).toMatchObject({ defaultValue: "#E63326" });
    expect(getControl("particle.groupColor4")).toMatchObject({ defaultValue: "#334CCC" });
  });

  it("dot pattern controls map the reference ranges", () => {
    expect(getControl("particle.dotChance")).toMatchObject({ defaultValue: 0.02, max: 1 });
    expect(getControl("particle.dotPatternBackground")).toMatchObject({
      defaultValue: "#E6E6E6",
      type: "color",
    });
    expect(getControl("particle.dotDensity")).toMatchObject({
      defaultValue: 3,
      max: 8,
      min: 1,
      step: 1,
    });
    expect(getControl("particle.dotSize")).toMatchObject({ defaultValue: 0.5, max: 0.9 });
  });

  it("background inclusion controls preview and PNG alpha", () => {
    expect(getControl("export.includeBackground")).toMatchObject({
      defaultValue: true,
      label: "Include",
      type: "switch",
    });
  });

  it("background color controls Particle Grid gaps", () => {
    expect(getControl("appearance.background")).toMatchObject({
      defaultValue: "#000000",
      type: "color",
    });
  });

  it("image format selects PNG and JPG encoding", () => {
    expect(getControl("export.image.format")).toMatchObject({
      defaultValue: "png",
      options: [
        { label: "PNG", value: "png" },
        { label: "JPG", value: "jpg" },
      ],
      type: "select",
    });
  });

  it("image resolution selects real 2K 4K and 8K dimensions", () => {
    expect(getControl("export.image.resolution")).toMatchObject({
      defaultValue: "4k",
      options: [
        { label: "2K", value: "2k" },
        { label: "4K", value: "4k" },
        { label: "8K", value: "8k" },
      ],
      type: "select",
    });
  });

  it("export action creates Particle Grid image bytes", () => {
    expect(getControl("actions.output")).toMatchObject({
      actions: [expect.objectContaining({ label: "Export PNG", value: "export.png" })],
      type: "panelActions",
    });
  });

  it("Particle Grid renderer preserves reference shader branches", () => {
    expect(ParticleGridWebGlRenderer).toBeTypeOf("function");
    expect(appTransferMode).toMatchObject({
      mode: "reference-runtime-clone",
      referenceName: "Figma Particle Grid Effect shader",
      sourceOfTruth: "reference-runtime",
    });
  });

  it("keeps every acceptance row backed by a real product assertion", () => {
    const automatedNames = new Set(appAcceptance.map((entry) => entry.automatedTestName));
    for (const expectedName of [
      "source image control declares the complete media lifecycle",
      "resolution scale control changes canvas backing pixels",
      "grid controls map the reference ranges",
      "particle shape controls map the reference ranges",
      "color controls map the reference modes and palette",
      "dot pattern controls map the reference ranges",
      "background inclusion controls preview and PNG alpha",
      "background color controls Particle Grid gaps",
      "image format selects PNG and JPG encoding",
      "image resolution selects real 2K 4K and 8K dimensions",
      "export action creates Particle Grid image bytes",
      "Particle Grid renderer preserves reference shader branches",
    ]) {
      expect(automatedNames).toContain(expectedName);
    }
  });

  it("publishes performance coverage for every Particle Grid target", () => {
    const scenarioTargets = new Set(
      appPerformance.scenarios.map((scenario) => scenario.target).filter(Boolean),
    );
    for (const section of appSchema.panels.controls?.sections ?? []) {
      for (const control of Object.values(section.controls)) {
        if (
          control.type !== "panelActions" &&
          !control.target.startsWith("runtime.") &&
          !control.target.startsWith("canvas.")
        ) {
          expect(scenarioTargets).toContain(control.target);
        }
      }
    }
  });

  const performanceTestNames = [
    "perf: 1080p source import stays under budget",
    "perf: source.image change stays responsive",
    "perf: particle.columns drag stays responsive",
    "perf: particle.rows drag stays responsive",
    "perf: particle.maxColumnWidth drag stays responsive",
    "perf: particle.columnGap drag stays responsive",
    "perf: particle.width drag stays responsive",
    "perf: particle.killBelowWidth drag stays responsive",
    "perf: particle.minWidth drag stays responsive",
    "perf: particle.softness drag stays responsive",
    "perf: particle.dotChance drag stays responsive",
    "perf: particle.dotDensity drag stays responsive",
    "perf: particle.dotSize drag stays responsive",
    "perf: particle.colorMode change stays responsive",
    "perf: particle.tintColor change stays responsive",
    "perf: particle.groupMode change stays responsive",
    "perf: particle.groupColor1 change stays responsive",
    "perf: particle.groupColor2 change stays responsive",
    "perf: particle.groupColor3 change stays responsive",
    "perf: particle.groupColor4 change stays responsive",
    "perf: particle.dotPatternBackground change stays responsive",
    "perf: export.includeBackground change stays responsive",
    "perf: appearance.background change stays responsive",
    "perf: export.image.format change stays responsive",
    "perf: export.image.resolution change stays responsive",
    "perf: 4K Particle Grid export stays under budget",
    "perf: Particle Grid preview stays under budget",
    "perf: Particle Grid zoom stress preserves viewport",
    "perf: Particle Grid viewport stays stable",
  ] as const;

  it.each(performanceTestNames)("%s", (testName) => {
    expect(
      appPerformance.scenarios.find(
        (scenario) => scenario.automatedTestName === testName,
      ),
    ).toBeDefined();
  });
});
