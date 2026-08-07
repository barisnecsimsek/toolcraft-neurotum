import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import {
  appProductReadiness,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import {
  textLooksLikePngExport,
  textLooksLikeVideoExport,
} from "./app-acceptance.export-test-utils";
import {
  getControlOptionValues,
  getSchemaBackgroundControlTargets,
  getSchemaImageExportSection,
  getSchemaPanelActionSearchTexts,
  getSchemaVideoExportSection,
  getSectionControlByTarget,
  getSectionControlIdByTarget,
  schemaHasAnimatedProductOutput,
  schemaHasProductSurface,
} from "./app-acceptance.schema-test-utils";
import {
  getProductImplementationSource,
  getProductRuntimeImplementationSource,
  readBrowserTestSources,
  sourceHandlesVideoRecorderOrEncoderErrors,
  sourceHasCaptureStreamBeforeCanvasSizing,
  sourceHasCustomMovOrProResEncoder,
  sourceHasImageExportDimensionCoverage,
  sourceHasUnsafeVideoLongEdgeSizing,
  sourceHasVideoCapabilityCheck,
  sourceHasVideoDimensionMetadataCoverage,
  sourceHasVideoDurationMetadataCoverage,
  sourcePassesImageResolutionToPngExport,
  sourceUsesVideoExportSizeHelper,
} from "./app-acceptance.source-test-utils";

describe("Toolcraft output export acceptance contract", () => {
  it("requires product output apps to expose export actions in the sticky footer", () => {
    if (appProductReadiness.mode !== "product" && !schemaHasProductSurface()) {
      return;
    }

    const panelActionTexts = getSchemaPanelActionSearchTexts();
    const browserTestSources = readBrowserTestSources();
    const productImplementationSource = getProductImplementationSource();
    const productRuntimeImplementationSource = getProductRuntimeImplementationSource();
    const backgroundColorTargets = getSchemaBackgroundControlTargets(new Set(["color"]));
    const backgroundToggleTargets = getSchemaBackgroundControlTargets(
      new Set(["checkbox", "select", "segmented", "switch"]),
    );

    expect(
      panelActionTexts.length,
      "Product apps must define panelActions in the controls panel sticky footer.",
    ).toBeGreaterThan(0);
    expect(
      panelActionTexts.some(textLooksLikePngExport),
      "Every product app must expose Export PNG or Download PNG through panelActions.",
    ).toBe(true);
    expect(
      productImplementationSource,
      "PNG export must use createToolcraftPngExportCanvas so background transparency and retina sizing follow the standard runtime contract.",
    ).toMatch(/\bcreateToolcraftPngExportCanvas\b/);
    expect(
      productImplementationSource,
      "PNG export must pass includeBackground from runtime state to createToolcraftPngExportCanvas; do not hardcode PNG transparency or background inclusion in schema only.",
    ).toMatch(/\bcreateToolcraftPngExportCanvas\s*\(\s*\{[\s\S]*\bincludeBackground\s*:/);
    expect(
      productRuntimeImplementationSource,
      "Live preview must read include-background state through shouldIncludeToolcraftPreviewBackground(state) so turning Include off hides the product preview background without affecting video export.",
    ).toMatch(/\bshouldIncludeToolcraftPreviewBackground\b/);
    expect(
      backgroundColorTargets.length,
      "Every product app with Export PNG must expose a user-facing background color control.",
    ).toBeGreaterThan(0);
    expect(
      backgroundToggleTargets.length,
      'Every product app with Export PNG must expose export.includeBackground in the required "Background" section as a Switch labeled "Include".',
    ).toBeGreaterThan(0);

    for (const target of backgroundColorTargets) {
      expect(
        productRuntimeImplementationSource,
        `Runtime renderer/export code must read ${target}; declaring the control in schema is not enough.`,
      ).toContain(target);
    }

    expect(
      productRuntimeImplementationSource,
      `Runtime renderer/export code must read ${backgroundToggleTargets.join(", ")} through shouldIncludeToolcraftPreviewBackground(state); declaring the control in schema is not enough.`,
    ).toMatch(/\bshouldIncludeToolcraftPreviewBackground\b|\bexport\.includeBackground\b/);

    const imageExportSection = getSchemaImageExportSection();
    const imageFormatControl = getSectionControlByTarget(
      imageExportSection,
      "export.image.format",
    );
    const imageResolutionControl = getSectionControlByTarget(
      imageExportSection,
      "export.image.resolution",
    );
    const imageFormatOptionValues = getControlOptionValues(imageFormatControl);
    const imageResolutionOptionValues = getControlOptionValues(imageResolutionControl);
    const imageFormatControlId = getSectionControlIdByTarget(
      imageExportSection,
      "export.image.format",
    );
    const imageResolutionControlId = getSectionControlIdByTarget(
      imageExportSection,
      "export.image.resolution",
    );
    const imageExportHasInlinePair =
      imageFormatControlId === undefined || imageResolutionControlId === undefined
        ? false
        : imageExportSection?.layoutGroups?.some(
            (group) =>
              group.layout === "inline" &&
              group.columns === 2 &&
              group.controls.includes(imageFormatControlId) &&
              group.controls.includes(imageResolutionControlId),
          ) === true;

    expect(
      imageExportSection,
      'Apps with Export PNG must expose image settings in a separate controls section titled "Image Export".',
    ).toBeDefined();
    expect(
      imageFormatControl,
      'The separate "Image Export" section must include a format control with target "export.image.format".',
    ).toBeDefined();
    expect(
      imageFormatControl?.type,
      "Image Export format must use the same Select/dropdown structure as Video Export.",
    ).toBe("select");
    expect(
      imageFormatOptionValues,
      'Image format options must include "png" and "jpg".',
    ).toEqual(expect.arrayContaining(["png", "jpg"]));
    expect(
      imageFormatControl?.defaultValue,
      'Image format must default to "png".',
    ).toBe("png");
    expect(
      imageResolutionControl,
      'The separate "Image Export" section must include a resolution control with target "export.image.resolution".',
    ).toBeDefined();
    expect(
      imageResolutionControl?.type,
      "Image Export resolution must use the same Select/dropdown structure as Video Export.",
    ).toBe("select");
    expect(
      imageResolutionOptionValues,
      'Image resolution options must include "2k", "4k", and "8k".',
    ).toEqual(expect.arrayContaining(["2k", "4k", "8k"]));
    expect(
      imageResolutionControl?.defaultValue,
      'Image resolution must default to "4k".',
    ).toBe("4k");
    expect(
      imageExportHasInlinePair,
      "Image Export format and resolution must render as a compact inline pair.",
    ).toBe(true);
    expect(
      productRuntimeImplementationSource,
      'Image export implementation must read "export.image.format" from runtime state; declaring the control is not enough.',
    ).toContain("export.image.format");
    expect(
      productRuntimeImplementationSource,
      'Image export implementation must read "export.image.resolution" from runtime state; declaring the control is not enough.',
    ).toContain("export.image.resolution");
    expect(
      sourcePassesImageResolutionToPngExport(productImplementationSource),
      "Image export must pass the selected image resolution to createToolcraftPngExportCanvas so 2K/4K/8K change the actual exported pixel dimensions.",
    ).toBe(true);
    expect(
      sourceHasImageExportDimensionCoverage(browserTestSources),
      "Image export browser coverage must decode the exported image and assert actual width/height for selected 2K/4K/8K resolution. Blob size or a clicked button alone does not prove export dimensions.",
    ).toBe(true);

    if (!schemaHasAnimatedProductOutput()) {
      return;
    }

    const videoExportSection = getSchemaVideoExportSection();
    const videoFormatControl = getSectionControlByTarget(
      videoExportSection,
      "export.video.format",
    );
    const videoResolutionControl = getSectionControlByTarget(
      videoExportSection,
      "export.video.resolution",
    );
    const videoFormatOptionValues = getControlOptionValues(videoFormatControl);
    const videoResolutionOptionValues = getControlOptionValues(videoResolutionControl);
    const hasMovOrProResFormat = videoFormatOptionValues.some((value) =>
      /\b(mov|prores)\b/i.test(value),
    );

    expect(
      panelActionTexts.some(textLooksLikeVideoExport),
      "Animated product apps must expose Export Video through panelActions in addition to Export PNG.",
    ).toBe(true);
    expect(
      panelActionTexts.length,
      "Animated product apps need separate footer delivery actions for Export Video and Export PNG.",
    ).toBeGreaterThanOrEqual(2);
    expect(
      productImplementationSource,
      "Video export must use getToolcraftVideoExportSize so current and 4K dimensions follow the standard encoder-safe export contract.",
    ).toMatch(/\bgetToolcraftVideoExportSize\b/);
    expect(
      sourceUsesVideoExportSizeHelper(productImplementationSource),
      "Video export must use getToolcraftVideoExportSize instead of custom video dimension math.",
    ).toBe(true);
    expect(
      sourceHasUnsafeVideoLongEdgeSizing(productImplementationSource),
      "Video export must not use PNG-style 4096px long-edge sizing for 4K video; getToolcraftVideoExportSize fits inside 3840x2160.",
    ).toBe(false);
    expect(
      sourceHasCaptureStreamBeforeCanvasSizing(productImplementationSource),
      "When using captureStream, video export must set canvas width/height before captureStream/MediaRecorder setup.",
    ).toBe(false);
    expect(
      sourceHandlesVideoRecorderOrEncoderErrors(productImplementationSource),
      "Video export must reject MediaRecorder/VideoEncoder errors instead of returning corrupt video blobs.",
    ).toBe(true);
    expect(
      productImplementationSource,
      "Video export must use shouldIncludeToolcraftExportBackground so PNG transparency does not remove the video background.",
    ).toMatch(/\bshouldIncludeToolcraftExportBackground\b/);
    expect(
      videoExportSection,
      'Animated product apps with Export Video must expose video settings in a separate controls section titled "Video Export".',
    ).toBeDefined();
    expect(
      videoFormatControl,
      'The separate "Video Export" section must include a format control with target "export.video.format".',
    ).toBeDefined();
    expect(
      ["select", "segmented"],
      "Video format must be a Select or Segmented control so the user chooses a supported container instead of typing a freeform value.",
    ).toContain(videoFormatControl?.type);
    expect(
      videoFormatOptionValues,
      'Video format options must include safe browser baseline choices: "webm" and "mp4".',
    ).toEqual(expect.arrayContaining(["webm", "mp4"]));
    expect(
      videoResolutionControl,
      'The separate "Video Export" section must include a resolution control with target "export.video.resolution".',
    ).toBeDefined();
    expect(
      ["select"],
      "Video resolution must be a Select control with explicit output-size choices.",
    ).toContain(videoResolutionControl?.type);
    expect(
      videoResolutionOptionValues,
      'Video resolution options must include "current" and "4k".',
    ).toEqual(expect.arrayContaining(["current", "4k"]));
    expect(
      videoResolutionControl?.defaultValue,
      'Video resolution must default to "current".',
    ).toBe("current");
    expect(
      videoFormatControl?.defaultValue,
      'Video format must default to "mp4".',
    ).toBe("mp4");
    const videoFormatControlId = getSectionControlIdByTarget(
      videoExportSection,
      "export.video.format",
    );
    const videoResolutionControlId = getSectionControlIdByTarget(
      videoExportSection,
      "export.video.resolution",
    );
    const videoExportHasInlinePair =
      videoFormatControlId === undefined || videoResolutionControlId === undefined
        ? false
        : videoExportSection?.layoutGroups?.some(
            (group) =>
              group.layout === "inline" &&
              group.controls.includes(videoFormatControlId) &&
              group.controls.includes(videoResolutionControlId),
          ) === true;

    expect(
      videoExportHasInlinePair,
      "Video Export format and resolution must render as a compact inline pair unless a documented fit fallback is used.",
    ).toBe(true);
    expect(
      sourceHasVideoCapabilityCheck(productImplementationSource),
      "Video export must check the supported MIME/container through MediaRecorder.isTypeSupported or an explicit encoder/transcoder capability check.",
    ).toBe(true);
    expect(
      productRuntimeImplementationSource,
      'Video export implementation must read "export.video.format" from runtime state; declaring the control is not enough.',
    ).toContain("export.video.format");
    expect(
      productRuntimeImplementationSource,
      'Video export implementation must read "export.video.resolution" from runtime state; declaring the control is not enough.',
    ).toContain("export.video.resolution");
    expect(
      sourceHasVideoDurationMetadataCoverage(browserTestSources),
      "Video export browser coverage must load the exported blob as a <video>, wait for loadedmetadata, and compare video.duration with the edited timeline duration. blobSize/blobType checks alone do not prove timeline-length export.",
    ).toBe(true);
    expect(
      sourceHasVideoDimensionMetadataCoverage(browserTestSources),
      "Video export browser coverage must load exported video metadata and assert video.videoWidth/video.videoHeight for both Current and 4K resolution paths. Blob size or selected control values alone do not prove conversion dimensions.",
    ).toBe(true);
    if (hasMovOrProResFormat) {
      expect(
        sourceHasCustomMovOrProResEncoder(productImplementationSource),
        "MOV or ProRes are not baseline browser MediaRecorder outputs; they require a custom encoder/transcoder path.",
      ).toBe(true);
    }
  });

  it("rejects reset actions in sticky footer panelActions", () => {
    const schemaWithFooterReset = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      command: "controls.reset",
                      icon: "rotate-ccw",
                      label: "Reset",
                      value: "reset",
                    },
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
      validateToolcraftAcceptanceCoverage(schemaWithFooterReset, [
        {
          actionCoverage: ["reset", "export.png"],
          automated: true,
          automatedTestName: "footer actions reset and export output",
          browser: true,
          browserTestName: "browser: footer actions reset and export output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable: "Footer actions reset controls and export output.",
          fixture: "footer actions fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction: "Click Reset and Export PNG.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not include Reset footer actions (reset)"),
      ]),
    );
  });
});
