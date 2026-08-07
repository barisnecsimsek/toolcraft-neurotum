import { describe, expect, it } from "vitest";

import { getToolcraftControlOrderTargets } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  BRICK_MOSAIC_SHUFFLE_RADIUS,
  getBrickMosaicChaosPermutation,
  getBrickMosaicLocalPermutation,
  getBrickMosaicSettings,
} from "./brick-mosaic-render";
import {
  brickMosaicStartupCanvasSize,
  brickMosaicStartupValues,
} from "./brick-mosaic-startup-preset";

describe("appSchema", () => {
  it("publishes the Brick Mosaic Toolcraft product contract", () => {
    expect(appSchema.canvas.draggable).toBe(true);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.renderScale.enabled).toBe(true);
    expect(appSchema.canvas.size).toEqual(brickMosaicStartupCanvasSize);
    expect(appSchema.canvas.sizing).toEqual({ mode: "intrinsic-media" });
    expect(appSchema.canvas.upload).toBe(true);
    expect(appSchema.panels.controls?.title).toBe("Brick Mosaic");
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
    expect(appSchema.settingsTransfer.enabled).toBe(true);
    expect(appSchema.persistence.storage).toBe("localStorage");
    if (appSchema.persistence.storage !== "localStorage") {
      throw new Error("Brick Mosaic should persist app state in localStorage.");
    }
    expect(appSchema.persistence.include).toEqual(["values", "canvas", "panels"]);
  });

  it("orders brick mosaic controls by workflow and entity", () => {
    expect(getToolcraftControlOrderTargets(appSchema)).toEqual([
      "runtime.settingsTransfer",
      "canvas.renderScale",
      "media.source",
      "brick.detail",
      "brick.scale",
      "brick.chaos",
      "brick.gap",
      "brick.rounding",
      "brick.edgeDepth",
      "stud.include",
      "stud.diameter",
      "stud.height",
      "stud.highlight",
      "tone.monochrome",
      "tone.posterize",
      "tone.saturation",
      "tone.contrast",
      "tone.brightness",
      "lighting.direction",
      "lighting.shadow",
      "export.includeBackground",
      "appearance.background",
      "export.image.format",
      "export.image.resolution",
    ]);
  });

  it("declares required image export and background controls", () => {
    const sections = appSchema.panels.controls?.sections ?? [];
    const backgroundSection = sections.find((section) => section.title === "Background");
    const imageExportSection = sections.find((section) => section.title === "Image Export");

    expect(backgroundSection?.layoutGroups).toContainEqual({
      columns: 2,
      controls: ["includeBackground", "background"],
      layout: "inline",
    });
    expect(backgroundSection?.controls.includeBackground.target).toBe("export.includeBackground");
    expect(backgroundSection?.controls.background.target).toBe("appearance.background");
    expect(imageExportSection?.controls.imageFormat.type).toBe("select");
    expect(imageExportSection?.controls.imageResolution.defaultValue).toBe("4k");
  });

  it("startup preset loads requested image and settings", () => {
    const controls = appSchema.panels.controls?.sections.flatMap((section) =>
      Object.values(section.controls),
    );
    const defaultByTarget = new Map(
      controls?.map((control) => [control.target, control.defaultValue]) ?? [],
    );

    expect(appSchema.canvas.size).toEqual(brickMosaicStartupCanvasSize);
    expect(defaultByTarget.get("brick.detail")).toBe(brickMosaicStartupValues["brick.detail"]);
    expect(defaultByTarget.get("brick.scale")).toBe(brickMosaicStartupValues["brick.scale"]);
    expect(defaultByTarget.get("brick.chaos")).toBe(brickMosaicStartupValues["brick.chaos"]);
    expect(defaultByTarget.get("brick.gap")).toBe(brickMosaicStartupValues["brick.gap"]);
    expect(defaultByTarget.get("brick.rounding")).toBe(brickMosaicStartupValues["brick.rounding"]);
    expect(defaultByTarget.get("brick.edgeDepth")).toBe(brickMosaicStartupValues["brick.edgeDepth"]);
    expect(defaultByTarget.get("appearance.background")).toEqual(
      brickMosaicStartupValues["appearance.background"],
    );
  });

  it("brick mosaic product controls change output", () => {
    const settings = getBrickMosaicSettings({
      canvas: { offset: { x: 0, y: 0 }, size: { height: 600, unit: "px", width: 800 }, zoom: 100 },
      defaults: {},
      history: { redo: [], undo: [] },
      layers: [],
      mediaAssets: [],
      panels: {
        controls: { offset: { x: 0, y: 0 } },
        layers: { offset: { x: 0, y: 0 } },
        timeline: { offset: { x: 0, y: 0 } },
        toolbar: { offset: { x: 0, y: 0 } },
      },
      schema: appSchema,
      selectedLayerId: null,
      timeline: {
        currentTimeSeconds: 0,
        durationSeconds: 8,
        expanded: false,
        isLooping: true,
        isPlaying: false,
        keyframeGroups: [],
        selectedKeyframeId: null,
      },
      values: {
        "appearance.background": { hex: "#112233" },
        "brick.chaos": 65,
        "brick.detail": 80,
        "brick.edgeDepth": 55,
        "brick.gap": 2,
        "brick.rounding": 18,
        "brick.scale": 0.75,
        "lighting.direction": { x: 0.5, y: -0.75 },
        "lighting.shadow": 60,
        "stud.diameter": 70,
        "stud.height": 30,
        "stud.highlight": 80,
        "stud.include": false,
        "tone.brightness": 115,
        "tone.contrast": 125,
        "tone.monochrome": true,
        "tone.posterize": 6,
        "tone.saturation": 40,
      },
    });

    expect(settings.background).toBe("#112233");
    expect(settings.brick.chaos).toBe(0.65);
    expect(settings.brick.detail).toBe(80);
    expect(settings.brick.scale).toBe(0.75);
    expect(settings.studs.include).toBe(false);
    expect(settings.tone.monochrome).toBe(true);
    expect(settings.lighting.direction.x).toBeGreaterThan(0);
    expect(settings.lighting.direction.y).toBeLessThan(0);
  });

  it("brick scale interaction locally swaps without duplicates", () => {
    const columns = 13;
    const rows = 9;
    const permutation = getBrickMosaicLocalPermutation(columns, rows, 4);
    const changedSeed = getBrickMosaicLocalPermutation(columns, rows, 5);

    expect(permutation).toHaveLength(columns * rows);
    expect(new Set(permutation).size).toBe(columns * rows);
    expect(permutation).not.toEqual(changedSeed);

    let movedCount = 0;

    permutation.forEach((sourceIndex, slotIndex) => {
      expect(permutation[sourceIndex]).toBe(slotIndex);

      const deltaX = (sourceIndex % columns) - (slotIndex % columns);
      const deltaY = Math.floor(sourceIndex / columns) - Math.floor(slotIndex / columns);
      const distance = Math.hypot(deltaX, deltaY);

      expect(distance).toBeLessThanOrEqual(BRICK_MOSAIC_SHUFFLE_RADIUS);

      if (sourceIndex !== slotIndex) {
        movedCount += 1;
      }
    });

    expect(movedCount).toBeGreaterThan(0);
  });

  it("brick chaos permutation grows with intensity", () => {
    const columns = 40;
    const rows = 30;
    const identity = getBrickMosaicChaosPermutation(columns, rows, 0);
    const lowChaos = getBrickMosaicChaosPermutation(columns, rows, 0.2);
    const highChaos = getBrickMosaicChaosPermutation(columns, rows, 1);
    const repeatedHighChaos = getBrickMosaicChaosPermutation(columns, rows, 1);

    expect(identity).toEqual(Array.from({ length: columns * rows }, (_, index) => index));
    expect(highChaos).toEqual(repeatedHighChaos);
    expect(new Set(lowChaos).size).toBe(columns * rows);
    expect(new Set(highChaos).size).toBe(columns * rows);

    const measure = (permutation: readonly number[]) => {
      let maxDistance = 0;
      let movedCount = 0;

      permutation.forEach((sourceIndex, slotIndex) => {
        expect(permutation[sourceIndex]).toBe(slotIndex);

        if (sourceIndex === slotIndex) {
          return;
        }

        movedCount += 1;
        maxDistance = Math.max(
          maxDistance,
          Math.hypot(
            (sourceIndex % columns) - (slotIndex % columns),
            Math.floor(sourceIndex / columns) - Math.floor(slotIndex / columns),
          ),
        );
      });

      return { maxDistance, movedCount };
    };

    const lowMeasure = measure(lowChaos);
    const highMeasure = measure(highChaos);

    expect(highMeasure.movedCount).toBeGreaterThan(lowMeasure.movedCount);
    expect(highMeasure.movedCount).toBeGreaterThan(columns * rows * 0.8);
    expect(highMeasure.maxDistance).toBeGreaterThan(lowMeasure.maxDistance);
  });

  it("settings transfer exports and imports brick mosaic settings", () => {
    expect(appSchema.settingsTransfer.enabled).toBe(true);
    expect(appSchema.settingsTransfer.fileName).toMatch(/brick-mosaic|bricks-test/);
  });

  it("resolution scale changes brick mosaic backing pixels", () => {
    const renderScaleControl = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.target === "canvas.renderScale");

    expect(renderScaleControl?.performanceRole).toBe("workload");
    expect(renderScaleControl?.defaultValue).toBe(2);
  });

  it("source image import and clear update brick mosaic output", () => {
    const sourceControl = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.target === "media.source");

    expect(sourceControl?.type).toBe("fileDrop");
    expect(sourceControl?.accept).toContain("image/png");
  });

  it("background include controls png transparency", () => {
    expect(appSchema.export.png.background).toBe("include");
  });

  it("image export format changes encoded output", () => {
    const imageFormat = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.target === "export.image.format");

    expect(imageFormat?.options?.map((option) => option.value)).toEqual(["png", "jpg"]);
  });

  it("image export resolution changes encoded dimensions", () => {
    const imageResolution = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.target === "export.image.resolution");

    expect(imageResolution?.options?.map((option) => option.value)).toEqual(["2k", "4k", "8k"]);
  });

  it("exports brick mosaic image output", () => {
    const actionControl = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.target === "export.actions");

    expect(actionControl?.actions?.map((action) => (typeof action === "string" ? action : action.value))).toEqual([
      "export-png",
    ]);
  });

  it("brick mosaic persistence restores settings after reload", () => {
    expect(appSchema.persistence.storage).toBe("localStorage");
    if (appSchema.persistence.storage !== "localStorage") {
      throw new Error("Brick Mosaic should persist app state in localStorage.");
    }
    expect(appSchema.persistence.key).toBe("toolcraft:brick-mosaic:state:v3");
    expect(appSchema.persistence.version).toBe(3);
  });

  it("brick mosaic renderer maps controls to pixels", () => {
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.rendererStrategy).toBe("canvas-2d");
  });

  it("toolbar viewport controls keep brick mosaic stable", () => {
    expect(appSchema.assembly.commands).toEqual(
      expect.arrayContaining(["canvas.center", "canvas.zoomIn", "canvas.zoomOut"]),
    );
  });

  it("brick mosaic responsiveness scenarios are declared", () => {
    expect(appPerformance.scenarios.some((scenario) => scenario.automatedTestName.includes("responsiveness"))).toBe(
      true,
    );
  });

  it("brick mosaic workload scenarios are declared", () => {
    expect(appPerformance.workloadTargets).toEqual(
      expect.arrayContaining(["canvas.renderScale", "brick.detail", "brick.scale"]),
    );
  });

  it("brick mosaic preview render scenario is declared", () => {
    expect(appPerformance.scenarios.some((scenario) => scenario.id === "brick-mosaic-preview-render")).toBe(
      true,
    );
  });

  it("brick mosaic media import scenario is declared", () => {
    expect(appPerformance.scenarios.some((scenario) => scenario.interaction === "media-import")).toBe(
      true,
    );
  });

  it("brick mosaic export copy scenario is declared", () => {
    expect(appPerformance.scenarios.some((scenario) => scenario.interaction === "export-copy")).toBe(
      true,
    );
  });

  it("brick mosaic viewport stability scenario is declared", () => {
    expect(
      appPerformance.scenarios.some((scenario) => scenario.interaction === "viewport-stability"),
    ).toBe(true);
  });

  it("brick mosaic zoom stress scenario is declared", () => {
    expect(
      appPerformance.scenarios.some((scenario) => scenario.interaction === "viewport-zoom-stress"),
    ).toBe(true);
  });
});
