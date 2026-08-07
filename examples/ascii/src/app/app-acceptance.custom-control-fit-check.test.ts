import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateToolcraftAcceptanceCoverage } from "./app-acceptance";

describe("starter acceptance custom control built-in fit contract", () => {
  it("rejects custom controls with invalid built-in fit checks", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "glyph ramp changes output",
          browser: true,
          browserTestName: "browser: glyph ramp changes output",
          builtInFitCheck: {
            checkedBuiltIns: ["imaginaryPicker" as never],
            closestBuiltIn: "glyphRamp" as never,
            productObservable:
              "Ordering uploaded glyphs changes the rendered glyph ramp output.",
            whyInsufficient:
              "The built-in controls cannot upload, preview, reorder, and remove a density-ordered glyph set in one runtime value.",
          },
          componentType: "glyphRamp",
          customControlCoverage: [
            "built-in-gap",
            "kit-primitives",
            "minimal-ui",
            "product-output",
            "runtime-state",
          ],
          evidence: "product-output",
          expectedObservable:
            "Choosing and ordering glyphs changes the rendered product output.",
          fixture: "glyph ramp fixture",
          id: "glyph.ramp",
          kind: "control",
          target: "glyph.ramp",
          userAction: "Upload, reorder, and remove glyphs.",
        },
      ]),
    ).toEqual([
      "Glyphs / glyphRamp (glyph.ramp) builtInFitCheck.checkedBuiltIns contains unknown built-in controls: imaginaryPicker.",
      'Glyphs / glyphRamp (glyph.ramp) builtInFitCheck.closestBuiltIn must be one of the checked built-ins or "none".',
      "Glyphs / glyphRamp (glyph.ramp) builtInFitCheck.checkedBuiltIns must include collectionActions when the custom control owns a growable, removable, selectable, or reorderable runtime item set.",
      "Glyphs / glyphRamp (glyph.ramp) builtInFitCheck.checkedBuiltIns must include actions when the custom control exposes local command buttons such as add, remove, delete, duplicate, sort, normalize, or clear.",
    ]);
  });

  it("rejects custom controls justified only by visual chrome", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shapeButtons: {
                  defaultValue: "rect",
                  label: "Shape",
                  orderRole: "style",
                  target: "shape.kind",
                  type: "shapeButtons",
                } as never,
              },
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "shape buttons change output",
          browser: true,
          browserTestName: "browser: shape buttons change output",
          builtInFitCheck: {
            checkedBuiltIns: ["actions", "segmented", "select"],
            closestBuiltIn: "segmented",
            productObservable:
              "Choosing a shape changes the rendered product geometry.",
            whyInsufficient:
              "The custom control uses icon buttons and a compact visual layout.",
          },
          componentType: "shapeButtons",
          customControlCoverage: [
            "built-in-gap",
            "kit-primitives",
            "minimal-ui",
            "product-output",
            "runtime-state",
          ],
          evidence: "product-output",
          expectedObservable:
            "Choosing rectangle, circle, or triangle changes the rendered output.",
          fixture: "shape fixture",
          id: "shape.kind",
          kind: "control",
          target: "shape.kind",
          userAction: "Choose each shape icon button.",
        },
      ]),
    ).toEqual([
      "Shape / shapeButtons (shape.kind) builtInFitCheck.whyInsufficient cannot justify a custom control only with icons, layout, styling, or custom buttons; name the product interaction or value model that built-ins cannot express.",
    ]);
  });
});
