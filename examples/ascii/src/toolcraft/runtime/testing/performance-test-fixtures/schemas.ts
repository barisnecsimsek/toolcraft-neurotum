import { defineToolcraft } from "../../schema/define-toolcraft";

export const testSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            density: {
              defaultValue: 4,
              label: "Density",
              max: 12,
              min: 1,
              performanceReason: "Density changes the amount of rendered output.",
              performanceRole: "workload",
              target: "render.density",
              type: "slider",
            },
            mode: {
              defaultValue: "soft",
              label: "Mode",
              options: [
                { label: "Soft", value: "soft" },
                { label: "Sharp", value: "sharp" },
              ],
              performanceReason: "Mode changes rendering branches but not workload size.",
              performanceRole: "responsiveness",
              target: "render.mode",
              type: "select",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

export const ordinarySliderSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            opacity: {
              defaultValue: 50,
              label: "Opacity",
              max: 100,
              min: 0,
              performanceReason: "Opacity changes a lightweight uniform value.",
              performanceRole: "responsiveness",
              target: "render.opacity",
              type: "slider",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

export const rangeSliderSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            band: {
              defaultValue: [20, 80],
              label: "Band",
              max: 100,
              min: 0,
              performanceReason: "Band changes a lightweight bounded interval.",
              performanceRole: "responsiveness",
              target: "render.band",
              type: "rangeSlider",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

export const largeTextSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            content: {
              defaultValue: "",
              label: "Content",
              performanceReason: "Content length changes text layout and renderer workload.",
              performanceRole: "workload",
              target: "product.content",
              type: "code",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

export const mediaUploadSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
    upload: true,
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            source: {
              defaultValue: null,
              label: "Source image",
              performanceReason: "Uploaded media dimensions change renderer workload.",
              performanceRole: "responsiveness",
              target: "source.image",
              type: "fileDrop",
            },
          },
          title: "Source",
        },
      ],
      title: "Runtime Controls",
    },
  },
});
