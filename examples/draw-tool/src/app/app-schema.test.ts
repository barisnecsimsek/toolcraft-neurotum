import { describe, expect, it } from "vitest";

import { appAcceptance, appProductReadiness, appTransferMode } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

function getControlByTarget(target: string) {
  for (const section of appSchema.panels.controls?.sections ?? []) {
    for (const [controlId, control] of Object.entries(section.controls)) {
      if (control.target === target) {
        return { control, controlId, section };
      }
    }
  }

  return undefined;
}

function getAuthoredSection(title: string) {
  return appSchema.panels.controls?.sections.find((section) => section.title === title);
}

describe("appSchema", () => {
  it("publishes the Suminagashi product contract", () => {
    expect(appProductReadiness).toMatchObject({
      mode: "product",
      productName: "Suminagashi Draw",
    });
    expect(appTransferMode).toMatchObject({
      mode: "reference-runtime-clone",
      referenceName: "Suminagashi",
      sourceOfTruth: "reference-runtime",
    });
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.size).toEqual({ height: 1080, unit: "px", width: 1920 });
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.panels.controls?.title).toBe("Suminagashi Controls");
  });

  it("canvas sizing controls drive the WebGL output size", () => {
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(getControlByTarget("canvas.aspectRatio")?.control).toMatchObject({
      label: "Aspect ratio",
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(getControlByTarget("canvas.size.width")?.control).toMatchObject({
      defaultValue: 1920,
      label: "Canvas width",
      target: "canvas.size.width",
      type: "text",
    });
    expect(getControlByTarget("canvas.size.height")?.control).toMatchObject({
      defaultValue: 1080,
      label: "Canvas height",
      target: "canvas.size.height",
      type: "text",
    });
    expect(getControlByTarget("canvas.renderScale")?.control.label).toBe("Resolution scale");
    expect(appPerformance.workloadTargets).toEqual(
      expect.arrayContaining([
        "canvas.aspectRatio",
        "canvas.size.width",
        "canvas.size.height",
        "canvas.renderScale",
      ]),
    );
  });

  it("resolution scale controls WebGL backing pixels", () => {
    expect(getControlByTarget("canvas.renderScale")?.control).toMatchObject({
      label: "Resolution scale",
      target: "canvas.renderScale",
      type: "slider",
    });
  });

  it("does not expose ink mode because palette is always single-source", () => {
    expect(getControlByTarget("ink.mode")).toBeUndefined();
  });

  it("ink palette family and shade affect drawn ink", () => {
    const control = getControlByTarget("ink.palette")?.control;
    const acceptance = appAcceptance.find((entry) => entry.target === "ink.palette");

    expect(control).toMatchObject({
      defaultValue: { family: "Amber", shade: "500" },
      label: "Palette",
      type: "palette",
    });
    expect(acceptance?.controlPartCoverage).toEqual([
      "palette.family",
      "palette.shade",
    ]);
  });

  it("brush size changes stroke thickness", () => {
    expect(getControlByTarget("brush.size")?.control).toMatchObject({
      defaultValue: 28,
      label: "Size",
      max: 72,
      min: 6,
      type: "slider",
      unit: "px",
    });
  });

  it("brush load changes pigment density", () => {
    expect(getControlByTarget("brush.load")?.control).toMatchObject({
      defaultValue: 100,
      label: "Load",
      max: 180,
      min: 20,
      type: "slider",
      unit: "%",
    });
  });

  it("brush wetness changes immediate spread", () => {
    expect(getControlByTarget("brush.wetness")?.control).toMatchObject({
      defaultValue: 70,
      label: "Wetness",
      max: 100,
      min: 0,
      type: "slider",
      unit: "%",
    });
  });

  it("brush settle changes post-release stop timing", () => {
    expect(getControlByTarget("brush.settle")?.control).toMatchObject({
      defaultValue: 100,
      label: "Settle",
      max: 200,
      min: 0,
      type: "slider",
      unit: "%",
    });
  });

  it("brush taper smooths post-release flow stop", () => {
    expect(getControlByTarget("brush.taper")?.control).toMatchObject({
      defaultValue: 100,
      label: "Taper",
      max: 200,
      min: 0,
      type: "slider",
      unit: "%",
    });
  });

  it("brush flow changes water movement strength", () => {
    expect(getControlByTarget("brush.flow")?.control).toMatchObject({
      defaultValue: 100,
      label: "Flow",
      max: 180,
      min: 0,
      type: "slider",
      unit: "%",
    });
  });

  it("auto flow toggles autonomous reference drops", () => {
    expect(getControlByTarget("flow.auto")?.control).toMatchObject({
      defaultValue: false,
      label: "Auto",
      type: "switch",
    });
  });

  it("clear action fades ink to blank", () => {
    const section = getAuthoredSection("Flow");
    const control = getControlByTarget("flow.clearSignal")?.control;

    expect(section?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["autoFlow", "clear"],
        layout: "inline",
      },
    ]);
    expect(control).toMatchObject({
      label: false,
      type: "actions",
    });
    expect(control?.actions).toEqual([
      { icon: "eraser", label: "Clear", value: "clear" },
    ]);
  });

  it("paper texture controls paper surface", () => {
    const section = getAuthoredSection("Paper");

    expect(section?.controls.paperTexture).toMatchObject({
      defaultValue: false,
      label: "Texture",
      target: "paper.texture.enabled",
      type: "switch",
    });
    expect(getControlByTarget("paper.texture.grain")?.control).toMatchObject({
      defaultValue: 35,
      label: "Grain",
      max: 100,
      min: 0,
      type: "slider",
      unit: "%",
    });
    expect(getControlByTarget("paper.texture.scale")?.control).toMatchObject({
      defaultValue: 100,
      label: "Scale",
      max: 220,
      min: 50,
      type: "slider",
      unit: "%",
    });
    expect(getControlByTarget("paper.texture.fiber")?.control).toMatchObject({
      defaultValue: 45,
      label: "Fiber",
      max: 100,
      min: 0,
      type: "slider",
      unit: "%",
    });
    expect(getControlByTarget("paper.texture.mottle")?.control).toMatchObject({
      defaultValue: 30,
      label: "Mottle",
      max: 100,
      min: 0,
      type: "slider",
      unit: "%",
    });
  });

  it("background include controls preview and png alpha", () => {
    const section = getAuthoredSection("Background");
    const authoredSections = appSchema.panels.controls?.sections.map((item) => item.title) ?? [];

    expect(authoredSections).toEqual(
      expect.arrayContaining(["Paper", "Background", "Image Export"]),
    );
    expect(authoredSections.indexOf("Paper")).toBeLessThan(authoredSections.indexOf("Background"));
    expect(authoredSections.indexOf("Background")).toBeLessThan(
      authoredSections.indexOf("Image Export"),
    );
    expect(section?.layoutGroups).toEqual([
      {
        columns: 2,
        controls: ["includeBackground", "paper"],
        layout: "inline",
      },
    ]);
    expect(getControlByTarget("export.includeBackground")?.control).toMatchObject({
      defaultValue: true,
      label: "Include",
      type: "switch",
    });
  });

  it("background color changes flat paper color", () => {
    expect(getControlByTarget("appearance.background")?.control).toMatchObject({
      defaultValue: { hex: "#efeae0" },
      label: false,
      type: "color",
    });
  });

  it("image format controls exported image type", () => {
    expect(getControlByTarget("export.image.format")?.control.options).toEqual([
      { label: "PNG", value: "png" },
      { label: "JPG", value: "jpg" },
    ]);
  });

  it("image resolution controls exported image dimensions", () => {
    expect(getControlByTarget("export.image.resolution")?.control.options).toEqual([
      { label: "2K", value: "2k" },
      { label: "4K", value: "4k" },
      { label: "8K", value: "8k" },
    ]);
  });

  it("does not expose video export controls", () => {
    expect(getControlByTarget("export.video.format")).toBeUndefined();
    expect(getControlByTarget("export.video.resolution")).toBeUndefined();
  });

  it("exports still image output", () => {
    const exportControl = getControlByTarget("export.action")?.control;

    expect(exportControl?.type).toBe("panelActions");
    expect(exportControl?.actions).toEqual([
      {
        icon: "download",
        label: "Export PNG",
        value: "export-image",
      },
    ]);
  });

  it("renderer loop preserves reference state and cadence", () => {
    expect(appPerformance.rendererPipeline?.passes.map((pass) => pass.id)).toEqual(
      expect.arrayContaining(["fluid-step", "display-composite"]),
    );
  });

  it("renderer spreads ink before pointer release", () => {
    expect(appPerformance.rendererPipeline?.passes.map((pass) => pass.id)).toEqual(
      expect.arrayContaining(["ink-splats", "fluid-step"]),
    );
  });

  it("renderer state persists dye and velocity between frames", () => {
    expect(appPerformance.rendererPipeline?.passes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "fluid-step",
          inputs: expect.arrayContaining(["velocity-fbo", "dye-fbo"]),
        }),
      ]),
    );
  });

  it("renderer time progress advances painted simulation", () => {
    expect(appTransferMode.animationIntent).toMatchObject({
      mode: "autonomous",
    });
  });

  it("settings persist after browser reload", () => {
    expect(appSchema.persistence).toEqual({
      include: ["values", "canvas", "panels"],
      key: "toolcraft:suminagashi-draw:state:v4",
      storage: "localStorage",
      version: 4,
    });
    expect(appSchema.settingsTransfer.enabled).toBe(false);
  });

  it("settings transfer is explicitly session-only", () => {
    const entry = appAcceptance.find((item) => item.id === "runtime.settingsTransfer");

    expect(entry).toMatchObject({
      settingsTransferCoverage: "opt-out",
      target: "runtime.settingsTransfer",
    });
  });

  it("declares performance app test coverage names", () => {
    const automatedNames = appPerformance.scenarios.map((scenario) => scenario.automatedTestName);

    expect(automatedNames).toEqual(
      expect.arrayContaining([
        "perf: preview render stays under budget",
        "perf: animation frames stay responsive",
        "perf: render scale drag stays responsive",
        "perf: canvas aspect ratio changes stay responsive",
        "perf: canvas width changes stay responsive",
        "perf: canvas height changes stay responsive",
        "perf: palette changes stay responsive",
        "perf: brush size changes stay responsive",
        "perf: brush load changes stay responsive",
        "perf: brush wetness changes stay responsive",
        "perf: brush settle changes stay responsive",
        "perf: brush taper changes stay responsive",
        "perf: brush flow changes stay responsive",
        "perf: auto flow toggle stays responsive",
        "perf: clear action stays responsive",
        "perf: paper texture toggle stays responsive",
        "perf: paper grain changes stay responsive",
        "perf: paper scale changes stay responsive",
        "perf: paper fiber changes stay responsive",
        "perf: paper mottle changes stay responsive",
        "perf: background include toggle stays responsive",
        "perf: background color changes stay responsive",
        "perf: image format changes stay responsive",
        "perf: image resolution changes stay responsive",
        "perf: export image stays under budget",
        "perf: animation viewport drag remains stable",
        "perf: viewport zoom stress stays responsive",
        "perf: viewport stays stable",
      ]),
    );
  });
});
