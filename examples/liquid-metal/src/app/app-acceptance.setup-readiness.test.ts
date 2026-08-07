import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  type ToolcraftComponentAcceptance,
  appProductReadiness,
  appTransferMode,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appSchema } from "./app-schema";
import { makeControlAcceptance } from "./app-acceptance.test-utils";
import { schemaHasProductSurface } from "./app-acceptance.schema-test-utils";

const appDir = dirname(fileURLToPath(import.meta.url));
const projectDir = join(appDir, "../..");

function createMandatorySetupSchema(settingsTransfer: false | "auto" = false) {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      controls: {
        sections: [
          {
            controls: Object.fromEntries(
              Array.from({ length: 12 }, (_, index) => [
                `control${index}`,
                {
                  defaultValue: index,
                  label: `Control ${index + 1}`,
                  orderRole: "detail",
                  target: `settings.control${index}`,
                  type: "slider",
                },
              ]),
            ),
            title: "Transform",
          },
        ],
        title: "Complex Settings",
      },
    },
    settingsTransfer,
  });
}

function createMandatorySetupAcceptance() {
  return Array.from({ length: 12 }, (_, index) =>
    makeControlAcceptance(`settings.control${index}`, "slider"),
  );
}

function createMandatorySetupWithCanvasSizeSchema() {
  return defineToolcraft({
    canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
    panels: {
      controls: {
        sections: [
          {
            controls: Object.fromEntries(
              Array.from({ length: 10 }, (_, index) => [
                `control${index}`,
                {
                  defaultValue: index,
                  label: `Control ${index + 1}`,
                  orderRole: "detail",
                  target: `settings.control${index}`,
                  type: "slider",
                },
              ]),
            ),
            title: "Transform",
          },
        ],
        title: "Runtime Setup Settings",
      },
    },
    settingsTransfer: false,
  });
}

function createMandatorySetupWithCanvasSizeAcceptance() {
  return [
    makeControlAcceptance("canvas.size.width", "text"),
    makeControlAcceptance("canvas.size.height", "text"),
    ...Array.from({ length: 10 }, (_, index) =>
      makeControlAcceptance(`settings.control${index}`, "slider"),
    ),
  ];
}

function isNeutralTemplateProject(): boolean {
  return new Set(["starter", "toolcraft-template"]).has(basename(projectDir));
}

describe("Toolcraft starter setup and readiness acceptance coverage", () => {
  it("rejects generated apps without the mandatory runtime setup controls panel", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {},
    });

    expect(validateToolcraftAcceptanceCoverage(schema, [])).toEqual(
      expect.arrayContaining([
        "Generated Toolcraft apps must define a controls panel so the mandatory runtime Setup section is visible.",
      ]),
    );
  });

  it("does not require app-authored settings transfer because setup controls are runtime-mandatory", () => {
    const complexSchema = createMandatorySetupSchema(false);

    expect(
      validateToolcraftAcceptanceCoverage(
        complexSchema,
        createMandatorySetupAcceptance(),
      ),
    ).toEqual([]);
  });

  it("accepts small schemas because settings transfer setup is runtime-mandatory", () => {
    const smallSchema = createMandatorySetupWithCanvasSizeSchema();
    const errors = validateToolcraftAcceptanceCoverage(
      smallSchema,
      createMandatorySetupWithCanvasSizeAcceptance(),
    );

    expect(errors).toEqual([]);
  });

  it("passes complex schemas with auto settings transfer enabled", () => {
    const complexSchema = createMandatorySetupSchema("auto");
    const acceptance: ToolcraftComponentAcceptance[] = [
      {
        automated: true,
        automatedTestName: "settings transfer exports and imports complex settings",
        browser: true,
        browserTestName: "browser: settings transfer exports and imports complex settings",
        componentType: "settingsTransfer",
        evidence: "persistence-state",
        expectedObservable:
          "Export Settings downloads app-scoped JSON and Import Settings restores edited controls.",
        fixture: "settings transfer complex fixture",
        id: "settings.transfer",
        kind: "control",
        target: "runtime.settingsTransfer",
        userAction:
          "Change one complex setting, export settings, change it again, import the JSON, and observe the restored value.",
      },
      ...createMandatorySetupAcceptance(),
    ];

    expect(validateToolcraftAcceptanceCoverage(complexSchema, acceptance)).toEqual([]);
  });

  it("rejects app-authored controls that try to own runtime setup targets", () => {
    const schema = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
        size: { height: 1080, unit: "px", width: 1920 },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                manualWidth: {
                  defaultValue: 1200,
                  label: "Width",
                  target: "canvas.size.width",
                  type: "text",
                },
                manualRenderScale: {
                  defaultValue: 1,
                  label: "Scale",
                  max: 2,
                  min: 1,
                  target: "canvas.renderScale",
                  type: "slider",
                },
                manualTimeline: {
                  defaultValue: true,
                  label: "Timeline",
                  target: "panels.timeline.extended",
                  type: "switch",
                },
              },
              title: "Runtime Duplicates",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(validateToolcraftAcceptanceCoverage(schema, [])).toEqual(
      expect.arrayContaining([
        'Runtime Setup must not include the Timeline switch unless panels.timeline is enabled.',
        'Runtime Duplicates / manualWidth uses runtime Setup target "canvas.size.width". Runtime Setup owns Export Settings, Import Settings, Aspect ratio, Canvas width, Canvas height, Resolution scale, and Timeline; do not declare these controls in app-authored sections.',
        'Runtime Duplicates / manualRenderScale uses runtime Setup target "canvas.renderScale". Runtime Setup owns Export Settings, Import Settings, Aspect ratio, Canvas width, Canvas height, Resolution scale, and Timeline; do not declare these controls in app-authored sections.',
        'Runtime Duplicates / manualTimeline uses runtime Setup target "panels.timeline.extended". Runtime Setup owns Export Settings, Import Settings, Aspect ratio, Canvas width, Canvas height, Resolution scale, and Timeline; do not declare these controls in app-authored sections.',
      ]),
    );
  });

  it("declares the generated product transfer mode", () => {
    expect(appTransferMode).toMatchObject({
      animationIntent: { mode: "timeline-playback" },
      mode: "reference-runtime-clone",
      sourceOfTruth: "reference-runtime",
    });
  });

  it("allows neutral readiness only for the source starter/template folder", () => {
    if (appProductReadiness.mode === "product") {
      expect(appProductReadiness.productName.trim()).not.toBe("");
      expect(appProductReadiness.productSummary.trim()).not.toBe("");
      expect(appProductReadiness.requestedBehavior.trim()).not.toBe("");
      expect(
        schemaHasProductSurface(),
        "Product readiness requires product surface: controls, layers, timeline, canvasContent, or acceptance coverage.",
      ).toBe(true);
      expect(
        appSchema.panels.controls,
        "Generated product apps must define a controls panel so runtime Setup, product controls, background, export settings, and sticky export actions are visible.",
      ).toBeTruthy();
      expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
      return;
    }

    expect(appProductReadiness.reason.trim()).not.toBe("");
    expect(
      isNeutralTemplateProject(),
      "Renamed/generated product folders must switch product readiness from starter to product so an empty template cannot pass as an implemented app.",
    ).toBe(true);
    expect(
      schemaHasProductSurface(),
      "Neutral starter readiness must not be used after adding product controls, timeline, layers, canvasContent, or acceptance coverage.",
    ).toBe(false);
  });
});
