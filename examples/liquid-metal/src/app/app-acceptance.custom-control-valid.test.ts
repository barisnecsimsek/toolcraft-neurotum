import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateToolcraftAcceptanceCoverage } from "./app-acceptance";

describe("starter acceptance valid custom control contract", () => {
  it("accepts custom controls with explicit custom control coverage", () => {
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
            checkedBuiltIns: ["actions", "collectionActions", "fileDrop", "imagePicker", "select"],
            closestBuiltIn: "fileDrop",
            productObservable:
              "Ordering uploaded glyphs changes the rendered glyph ramp output.",
            whyInsufficient:
              "FileDrop imports source files, but it does not provide density ordering, per-glyph preview, reorder, and remove behavior in one runtime value.",
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
    ).toEqual([]);
  });
});
