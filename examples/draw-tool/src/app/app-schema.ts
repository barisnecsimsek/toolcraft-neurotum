import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    size: { height: 1080, unit: "px", width: 1920 },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  export: {
    png: {
      background: "include",
    },
  },
  panels: {
    controls: {
      title: "Suminagashi Controls",
      sections: [
        {
          title: "Ink",
          controls: {
            inkPalette: {
              defaultValue: { family: "Amber", shade: "500" },
              description:
                "The selected family and shade are the default brush color for the next stroke.",
              label: "Palette",
              orderRole: "color",
              performanceReason:
                "Changing the palette updates uniforms and future splats without resizing the simulation.",
              performanceRole: "responsiveness",
              target: "ink.palette",
              type: "palette",
            },
          },
        },
        {
          title: "Brush",
          controls: {
            brushSize: {
              defaultValue: 28,
              label: "Size",
              max: 72,
              min: 6,
              orderRole: "primary",
              performanceReason:
                "Brush size changes splat radius uniforms for future strokes without rebuilding framebuffers.",
              performanceRole: "workload",
              step: 1,
              target: "brush.size",
              type: "slider",
              unit: "px",
            },
            brushLoad: {
              defaultValue: 100,
              label: "Load",
              max: 180,
              min: 20,
              orderRole: "strength",
              performanceReason:
                "Brush load changes pigment absorption strength for future strokes only.",
              performanceRole: "responsiveness",
              step: 5,
              target: "brush.load",
              type: "slider",
              unit: "%",
            },
            brushWetness: {
              defaultValue: 70,
              label: "Wetness",
              max: 100,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Wetness changes the immediate in-stroke advection amount without changing pass count.",
              performanceRole: "responsiveness",
              step: 5,
              target: "brush.wetness",
              type: "slider",
              unit: "%",
            },
            brushSettle: {
              defaultValue: 100,
              description:
                "Controls how long released strokes keep running the full fluid solver before drying static.",
              label: "Settle",
              max: 200,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Settle changes how long post-release full-solver batches continue before freeze.",
              performanceRole: "workload",
              step: 5,
              target: "brush.settle",
              type: "slider",
              unit: "%",
            },
            brushTaper: {
              defaultValue: 100,
              description:
                "Controls how smoothly released flow fades out; higher values create a longer stop.",
              label: "Taper",
              max: 200,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Taper changes the post-release velocity fade window without rebuilding simulation resources.",
              performanceRole: "workload",
              step: 5,
              target: "brush.taper",
              type: "slider",
              unit: "%",
            },
            brushFlow: {
              defaultValue: 100,
              label: "Flow",
              max: 180,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Flow changes brush-driven velocity strength for future strokes without resizing simulation resources.",
              performanceRole: "responsiveness",
              step: 5,
              target: "brush.flow",
              type: "slider",
              unit: "%",
            },
          },
        },
        {
          title: "Flow",
          controls: {
            autoFlow: {
              defaultValue: false,
              label: "Auto",
              orderRole: "primary",
              performanceReason:
                "Auto optionally enables idle drops and stirring cadence without changing simulation resolution.",
              performanceRole: "responsiveness",
              target: "flow.auto",
              type: "switch",
            },
            clear: {
              actions: [{ icon: "eraser", label: "Clear", value: "clear" }],
              defaultValue: 0,
              label: false,
              orderRole: "action",
              performanceReason:
                "Clear fades the active dye framebuffer without resizing simulation resources.",
              performanceRole: "responsiveness",
              target: "flow.clearSignal",
              type: "actions",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["autoFlow", "clear"],
              layout: "inline",
            },
          ],
        },
        {
          title: "Paper",
          controls: {
            paperTexture: {
              defaultValue: false,
              description:
                "Adds procedural paper grain to the flat paper color.",
              label: "Texture",
              orderRole: "primary",
              performanceReason:
                "Texture toggles display shader uniforms without rebuilding framebuffers.",
              performanceRole: "responsiveness",
              target: "paper.texture.enabled",
              type: "switch",
            },
            paperGrain: {
              defaultValue: 35,
              disabledWhen: { equals: false, target: "paper.texture.enabled" },
              label: "Grain",
              max: 100,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Grain updates a display shader uniform without changing pass count.",
              performanceRole: "responsiveness",
              step: 5,
              target: "paper.texture.grain",
              type: "slider",
              unit: "%",
            },
            paperScale: {
              defaultValue: 100,
              disabledWhen: { equals: false, target: "paper.texture.enabled" },
              label: "Scale",
              max: 220,
              min: 50,
              orderRole: "detail",
              performanceReason:
                "Scale updates procedural texture frequency in the display shader only.",
              performanceRole: "workload",
              step: 5,
              target: "paper.texture.scale",
              type: "slider",
              unit: "%",
            },
            paperFiber: {
              defaultValue: 45,
              disabledWhen: { equals: false, target: "paper.texture.enabled" },
              label: "Fiber",
              max: 100,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Fiber updates directional paper streak strength in the display shader only.",
              performanceRole: "responsiveness",
              step: 5,
              target: "paper.texture.fiber",
              type: "slider",
              unit: "%",
            },
            paperMottle: {
              defaultValue: 30,
              disabledWhen: { equals: false, target: "paper.texture.enabled" },
              label: "Mottle",
              max: 100,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Mottle updates low-frequency paper variation in the display shader only.",
              performanceRole: "responsiveness",
              step: 5,
              target: "paper.texture.mottle",
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
              orderRole: "primary",
              performanceReason:
                "Background inclusion changes preview alpha and export compositing only.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            paper: {
              defaultValue: { hex: "#efeae0" },
              label: false,
              orderRole: "color",
              performanceReason:
                "The paper color is a display uniform and does not change simulation workload.",
              performanceRole: "responsiveness",
              target: "appearance.background",
              type: "color",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["includeBackground", "paper"],
              layout: "inline",
            },
          ],
        },
        {
          title: "Image Export",
          controls: {
            imageFormat: {
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              orderRole: "mode",
              performanceReason:
                "Image format changes export encoding only after the user exports.",
              performanceRole: "responsiveness",
              target: "export.image.format",
              type: "select",
            },
            imageResolution: {
              defaultValue: "4k",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              orderRole: "mode",
              performanceReason:
                "Image resolution changes export pixel dimensions and export work.",
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
            export: {
              actions: [
                {
                  icon: "download",
                  label: "Export PNG",
                  value: "export-image",
                },
              ],
              defaultValue: null,
              orderRole: "action",
              target: "export.action",
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
    key: "toolcraft:suminagashi-draw:state:v4",
    storage: "localStorage",
    version: 4,
  },
  settingsTransfer: false,
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
