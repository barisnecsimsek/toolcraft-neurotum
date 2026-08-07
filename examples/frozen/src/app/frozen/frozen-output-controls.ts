import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import { frozenDefaultSceneValues } from "./frozen-default-scene";

const responsive = (reason: string) => ({
  performanceReason: reason,
  performanceRole: "responsiveness" as const,
});

const backgroundSection = {
  controls: {
    includeBackground: {
      defaultValue: frozenDefaultSceneValues["export.includeBackground"],
      description: "Includes the selected background in preview and export.",
      label: "Include",
      orderRole: "detail",
      ...responsive("Updates clear alpha and export compositing."),
      target: "export.includeBackground",
      type: "switch",
    },
    background: {
      defaultValue: frozenDefaultSceneValues["scene.background"],
      label: false,
      orderRole: "detail",
      ...responsive("Updates preview and export clear color."),
      target: "scene.background",
      type: "color",
    },
  },
  layoutGroups: [
    { columns: 2, controls: ["includeBackground", "background"], layout: "inline" },
  ],
  title: "Background",
} satisfies ToolcraftControlSectionSchema;

const imageExportSection = {
  controls: {
    imageFormat: {
      defaultValue: frozenDefaultSceneValues["export.image.format"],
      label: "Format",
      options: [
        { label: "PNG", value: "png" },
        { label: "JPG", value: "jpg" },
      ],
      orderRole: "input",
      ...responsive("Changes encoding without invalidating preview."),
      target: "export.image.format",
      type: "select",
    },
    imageResolution: {
      defaultValue: frozenDefaultSceneValues["export.image.resolution"],
      label: "Resolution",
      options: [
        { label: "2K", value: "2k" },
        { label: "4K", value: "4k" },
        { label: "8K", value: "8k" },
      ],
      orderRole: "input",
      performanceReason: "Output pixels drive quadratic render and encoding work.",
      performanceRole: "workload",
      target: "export.image.resolution",
      type: "select",
    },
  },
  layoutGroups: [
    { columns: 2, controls: ["imageFormat", "imageResolution"], layout: "inline" },
  ],
  title: "Image Export",
} satisfies ToolcraftControlSectionSchema;

const actionsSection = {
  actionGroup: "secondary",
  controls: {
    outputActions: {
      actions: [
        {
          icon: "upload-simple",
          label: "Export PNG",
          role: "export-image",
          value: "export.png",
        },
      ],
      target: "actions.output",
      type: "panelActions",
    },
  },
  title: "Export",
} satisfies ToolcraftControlSectionSchema;

export const frozenOutputControlSections = [
  backgroundSection,
  imageExportSection,
  actionsSection,
] satisfies readonly ToolcraftControlSectionSchema[];
