import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  appAcceptance,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";

function createFixedOutputSchema({
  height = 1080,
  width = 1920,
}: {
  height?: number;
  width?: number;
} = {}) {
  return defineToolcraft({
    canvas: {
      enabled: true,
      size: { height, unit: "px", width },
      sizing: { mode: "fixed-output" },
    },
    panels: {
      controls: {
        sections: [
          {
            controls: {
              prompt: {
                defaultValue: "Describe the effect",
                label: "Prompt",
                orderRole: "input",
                target: "generation.prompt",
                type: "text",
              },
            },
            title: "Generation",
          },
        ],
        title: "Controls",
      },
    },
  });
}

function createIntrinsicMediaUploadSchema() {
  return defineToolcraft({
    canvas: {
      enabled: true,
      sizing: { mode: "intrinsic-media" },
      upload: true,
    },
    panels: {
      controls: {
        sections: [],
        title: "Controls",
      },
    },
  });
}

describe("Toolcraft canvas sizing acceptance coverage", () => {
  it("requires explicit runtime acceptance before locking canvas output size", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createFixedOutputSchema(),
        appAcceptance,
      ),
    ).toEqual(
      expect.arrayContaining([
        'canvas.sizing mode "fixed-output" requires a runtime acceptance entry with canvasSizingCoverage "fixed-output-size" explaining why width and height are intentionally non-editable. Product/output apps must use "editable-output"; user-provided, reference, fixed-format, or base/default sizes belong in canvas.size as editable initial values.',
      ]),
    );
  });

  it("rejects fixed canvas sizing acceptance that only restates a default size", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createFixedOutputSchema(), [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "canvas starts at 1920 by 1080",
          browser: true,
          browserTestName: "browser: canvas starts at 1920 by 1080",
          canvasSizingCoverage: "fixed-output-size",
          componentType: "canvas",
          evidence: "product-output",
          expectedObservable: "The canvas starts at 1920 by 1080.",
          fixture: "canvas default size fixture",
          id: "canvas.sizing",
          kind: "runtime",
          userAction: "Open the app.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'canvas.sizing canvasSizingCoverage "fixed-output-size" must explain why the output dimensions are intentionally fixed for a non-product/internal fixture, not merely initialized from a default size.',
      ]),
    );
  });

  it("rejects fixed canvas sizing justified only by a missing reference size editor", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createFixedOutputSchema(), [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "canvas output remains fixed",
          browser: true,
          browserTestName: "browser: canvas output remains fixed",
          canvasSizingCoverage: "fixed-output-size",
          componentType: "fixed-output canvas",
          evidence: "product-output",
          expectedObservable:
            "The WebGL output remains fixed at 1920x1080 because the reference app has no user-facing output size editor.",
          fixture: "default canvas fixture",
          id: "canvas.sizing",
          kind: "runtime",
          userAction: "Open the app.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "cannot be justified by the reference or previous app lacking a size editor",
        ),
      ]),
    );
  });

  it("rejects fixed canvas sizing for exportable product apps even when reference dimensions are fixed", () => {
    const fixedExportSchema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 900, unit: "px", width: 1440 },
        sizing: { mode: "fixed-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "upload-simple",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(fixedExportSchema, [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "fixed reference size is preserved",
          browser: true,
          browserTestName: "browser: fixed reference size is preserved",
          canvasSizingCoverage: "fixed-output-size",
          componentType: "fixed-output canvas",
          evidence: "product-output",
          expectedObservable:
            "The exported shader canvas remains reference-defined and fixed at 1440x900.",
          fixture: "shader reference fixture",
          id: "canvas.sizing",
          kind: "runtime",
          userAction: "Open the app.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Product/output apps with export actions must use canvas.sizing mode "editable-output" so Aspect ratio, Canvas width, and Canvas height are always available. Put reference, fixed-format, or user-requested dimensions in canvas.size as the initial value instead of hiding size controls with "fixed-output".',
      ]),
    );
  });

  it("requires intrinsic media sizing acceptance for upload apps that let media own canvas size", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        createIntrinsicMediaUploadSchema(),
        appAcceptance,
      ),
    ).toEqual(
      expect.arrayContaining([
        'canvas.sizing mode "intrinsic-media" with upload requires a runtime acceptance entry with canvasSizingCoverage "intrinsic-media-size" proving the app is a true media-viewer/source-native product where imported media natural dimensions intentionally own canvas.size. Uploaded background/source images inside product canvases must use "editable-output" and keep the current canvas size.',
      ]),
    );
  });

  it("accepts explicit intrinsic media sizing when browser coverage proves source-native canvas sizing", () => {
    expect(
      validateToolcraftAcceptanceCoverage(createIntrinsicMediaUploadSchema(), [
        {
          automated: true,
          automatedTestName: "media viewer uses uploaded natural dimensions",
          browser: true,
          browserTestName: "browser: upload source-native image updates canvas.size",
          canvasSizingCoverage: "intrinsic-media-size",
          componentType: "canvas",
          evidence: "media-lifecycle",
          expectedObservable:
            "Uploading a 1400x900 image intentionally changes canvas.size to the image natural dimensions.",
          fixture: "source-native media viewer fixture",
          id: "canvas.intrinsicSizing",
          kind: "runtime",
          userAction: "Upload an image with known natural dimensions.",
        },
      ]),
    ).toEqual([]);
  });
});
