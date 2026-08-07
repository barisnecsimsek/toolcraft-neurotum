import { defineToolcraft } from "@/toolcraft/runtime";

import { brickMosaicStartupCanvasSize, brickMosaicStartupValues } from "./brick-mosaic-startup-preset";

const brickMosaicSchema = defineToolcraft({
  export: {
    png: {
      background: "include",
    },
  },
  canvas: {
    enabled: true,
    renderScale: true,
    size: brickMosaicStartupCanvasSize,
    sizing: { mode: "intrinsic-media" },
    upload: true,
  },
  panels: {
    controls: {
      title: "Brick Mosaic",
      sections: [
        {
          title: "Source Image",
          controls: {
            sourceImage: {
              accept: "image/png,image/jpeg,image/webp,image/svg+xml",
              defaultValue: null,
              label: "Image",
              orderRole: "input",
              performanceReason:
                "Importing media decodes one source image and refreshes the brick preview.",
              performanceRole: "responsiveness",
              target: "media.source",
              type: "fileDrop",
            },
          },
        },
        {
          title: "Brick Grid",
          controls: {
            detail: {
              defaultValue: brickMosaicStartupValues["brick.detail"],
              description:
                "Sets the target number of bricks across the long edge before Scale is applied.",
              label: "Detail",
              max: 96,
              min: 12,
              orderRole: "primary",
              performanceReason:
                "Higher detail increases brick count and pixel sampling work.",
              performanceRole: "workload",
              step: 1,
              target: "brick.detail",
              type: "slider",
              unit: "cols",
            },
            scale: {
              defaultValue: brickMosaicStartupValues["brick.scale"],
              description:
                "Larger scale makes bricks bigger and lowers the grid count; smaller scale adds more bricks.",
              label: "Scale",
              max: 1.5,
              min: 0.6,
              orderRole: "primary",
              performanceReason:
                "Scale changes the effective brick count and renderer workload.",
              performanceRole: "workload",
              step: 0.05,
              target: "brick.scale",
              type: "slider",
              unit: "x",
            },
            chaos: {
              defaultValue: brickMosaicStartupValues["brick.chaos"],
              description:
                "Swaps a growing share of bricks across a wider local radius; 0 keeps the image intact.",
              label: "Chaos",
              max: 100,
              min: 0,
              orderRole: "spatial",
              performanceReason:
                "Chaos changes deterministic source-cell mapping while preserving the same brick count.",
              performanceRole: "responsiveness",
              step: 1,
              target: "brick.chaos",
              type: "slider",
              unit: "%",
            },
            gap: {
              defaultValue: brickMosaicStartupValues["brick.gap"],
              label: "Gap",
              max: 8,
              min: 0,
              orderRole: "spatial",
              performanceReason:
                "Gap changes brick spacing while keeping the grid workload stable.",
              performanceRole: "responsiveness",
              step: 0.25,
              target: "brick.gap",
              type: "slider",
              unit: "px",
            },
            rounding: {
              defaultValue: brickMosaicStartupValues["brick.rounding"],
              label: "Corners",
              max: 36,
              min: 0,
              orderRole: "spatial",
              performanceReason:
                "Radius changes brick corner drawing without changing primitive count.",
              performanceRole: "responsiveness",
              step: 1,
              target: "brick.rounding",
              type: "slider",
              unit: "%",
            },
            edgeDepth: {
              defaultValue: brickMosaicStartupValues["brick.edgeDepth"],
              label: "Bevel",
              max: 80,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Bevel adjusts per-brick shading strength without changing workload.",
              performanceRole: "responsiveness",
              step: 1,
              target: "brick.edgeDepth",
              type: "slider",
              unit: "%",
            },
          },
        },
        {
          title: "Studs",
          controls: {
            studs: {
              defaultValue: brickMosaicStartupValues["stud.include"],
              label: "Include",
              orderRole: "mode",
              performanceReason:
                "The switch toggles stud drawing but does not change grid density.",
              performanceRole: "responsiveness",
              target: "stud.include",
              type: "switch",
            },
            studDiameter: {
              defaultValue: brickMosaicStartupValues["stud.diameter"],
              label: "Diameter",
              max: 86,
              min: 20,
              orderRole: "spatial",
              performanceReason:
                "Diameter changes stud geometry while preserving one stud per brick.",
              performanceRole: "responsiveness",
              step: 1,
              target: "stud.diameter",
              type: "slider",
              unit: "%",
            },
            studHeight: {
              defaultValue: brickMosaicStartupValues["stud.height"],
              label: "Height",
              max: 90,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Height changes stud relief shading while preserving primitive count.",
              performanceRole: "responsiveness",
              step: 1,
              target: "stud.height",
              type: "slider",
              unit: "%",
            },
            studHighlight: {
              defaultValue: brickMosaicStartupValues["stud.highlight"],
              label: "Shine",
              max: 100,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Shine changes highlight opacity without changing renderer workload.",
              performanceRole: "responsiveness",
              step: 1,
              target: "stud.highlight",
              type: "slider",
              unit: "%",
            },
          },
        },
        {
          title: "Tone",
          controls: {
            monochrome: {
              defaultValue: brickMosaicStartupValues["tone.monochrome"],
              label: "Mono",
              orderRole: "mode",
              performanceReason:
                "Monochrome changes color conversion without changing grid density.",
              performanceRole: "responsiveness",
              target: "tone.monochrome",
              type: "switch",
            },
            posterize: {
              defaultValue: brickMosaicStartupValues["tone.posterize"],
              description: "Limits each color channel to broad brick-like steps; 0 keeps smooth color.",
              label: "Posterize",
              max: 8,
              markerCount: 9,
              min: 0,
              orderRole: "mode",
              performanceReason:
                "Posterize changes color quantization without changing renderer workload.",
              performanceRole: "responsiveness",
              step: 1,
              target: "tone.posterize",
              type: "slider",
              variant: "discrete",
            },
            saturation: {
              defaultValue: brickMosaicStartupValues["tone.saturation"],
              label: "Saturation",
              max: 180,
              min: 0,
              orderRole: "color",
              performanceReason:
                "Saturation changes color math only.",
              performanceRole: "responsiveness",
              step: 1,
              target: "tone.saturation",
              type: "slider",
              unit: "%",
            },
            contrast: {
              defaultValue: brickMosaicStartupValues["tone.contrast"],
              label: "Contrast",
              max: 180,
              min: 40,
              orderRole: "color",
              performanceReason:
                "Contrast changes color math only.",
              performanceRole: "responsiveness",
              step: 1,
              target: "tone.contrast",
              type: "slider",
              unit: "%",
            },
            brightness: {
              defaultValue: brickMosaicStartupValues["tone.brightness"],
              label: "Brightness",
              max: 160,
              min: 50,
              orderRole: "color",
              performanceReason:
                "Brightness changes color math only.",
              performanceRole: "responsiveness",
              step: 1,
              target: "tone.brightness",
              type: "slider",
              unit: "%",
            },
          },
        },
        {
          title: "Lighting",
          controls: {
            direction: {
              defaultValue: brickMosaicStartupValues["lighting.direction"],
              label: "Direction",
              orderRole: "spatial",
              performanceReason:
                "Direction changes lighting vectors without changing primitive count.",
              performanceRole: "responsiveness",
              target: "lighting.direction",
              type: "vector",
              xLabel: "X",
              yLabel: "Y",
            },
            shadow: {
              defaultValue: brickMosaicStartupValues["lighting.shadow"],
              label: "Shadow",
              max: 80,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Shadow changes relief opacity without changing renderer workload.",
              performanceRole: "responsiveness",
              step: 1,
              target: "lighting.shadow",
              type: "slider",
              unit: "%",
            },
          },
        },
        {
          title: "Background",
          controls: {
            includeBackground: {
              defaultValue: true,
              label: "Include",
              orderRole: "mode",
              performanceReason:
                "Background inclusion changes live preview product background and PNG alpha.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            background: {
              defaultValue: brickMosaicStartupValues["appearance.background"],
              label: false,
              orderRole: "color",
              performanceReason:
                "Background color changes fill color without changing renderer workload.",
              performanceRole: "responsiveness",
              target: "appearance.background",
              type: "color",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["includeBackground", "background"],
              layout: "inline",
            },
          ],
        },
        {
          title: "Image Export",
          controls: {
            imageFormat: {
              defaultValue: brickMosaicStartupValues["export.image.format"],
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              orderRole: "mode",
              performanceReason:
                "Format changes export encoding, not preview workload.",
              performanceRole: "responsiveness",
              target: "export.image.format",
              type: "select",
            },
            imageResolution: {
              defaultValue: brickMosaicStartupValues["export.image.resolution"],
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              orderRole: "mode",
              performanceReason:
                "Higher export resolution increases PNG render and encoding work.",
              performanceRole: "workload",
              target: "export.image.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["imageFormat", "imageResolution"],
              layout: "inline",
            },
          ],
        },
        {
          actionGroup: "primary",
          controls: {
            exportActions: {
              actions: [
                {
                  icon: "download",
                  label: "Export PNG",
                  value: "export-png",
                  variant: "default",
                },
              ],
              orderRole: "action",
              target: "export.actions",
              type: "panelActions",
            },
          },
          title: "Export",
        },
      ],
    },
  },
  persistence: {
    include: ["values", "canvas", "panels"],
    key: "toolcraft:brick-mosaic:state:v3",
    storage: "localStorage",
    version: 3,
  },
  settingsTransfer: "auto",
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});

const settingsTransferControl = brickMosaicSchema.panels.controls?.sections
  .flatMap((section) => Object.values(section.controls))
  .find((control) => control.target === "runtime.settingsTransfer");

if (settingsTransferControl) {
  settingsTransferControl.performanceReason =
    "Settings transfer imports and exports JSON presets without changing renderer workload.";
  settingsTransferControl.performanceRole = "responsiveness";
}

export const appSchema = brickMosaicSchema;
