import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    draggable: true,
    enabled: true,
    renderScale: {
      defaultValue: 2,
      enabled: true,
      max: 2,
      min: 1,
      step: 0.25,
    },
    size: { height: 1080, unit: "px", width: 1920 },
    sizing: { mode: "editable-output" },
    upload: true,
  },
  export: {
    png: {
      background: "include",
    },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            sourceUpload: {
              accept: "image/*",
              assetKind: "image",
              defaultValue: null,
              label: "Image",
              orderRole: "primary",
              performanceReason:
                "Uploaded image dimensions affect texture upload and preview/export source cost.",
              performanceRole: "responsiveness",
              target: "source.upload",
              type: "fileDrop",
            },
          },
          layout: "standalone",
          title: "Source",
        },
        {
          controls: {
            sourceSaturation: {
              defaultValue: 1.08,
              label: "Saturation",
              max: 1.6,
              min: 0.4,
              orderRole: "color",
              performanceReason:
                "Changes source color treatment before the shader samples it.",
              performanceRole: "responsiveness",
              step: 0.02,
              target: "source.saturation",
              type: "slider",
            },
          },
          title: "Source Texture",
        },
        {
          controls: {
            glassShape: {
              defaultValue: "circle",
              label: "Shape",
              options: [
                { label: "Rounded", value: "rounded" },
                { label: "Pill", value: "pill" },
                { label: "Circle", value: "circle" },
                { label: "Square", value: "square" },
              ],
              orderRole: "primary",
              performanceReason:
                "Changes how width, height, and radius resolve before map generation.",
              performanceRole: "workload",
              target: "glass.shape",
              type: "select",
            },
            glassWidth: {
              defaultValue: 459,
              label: "Width",
              max: 960,
              min: 96,
              orderRole: "spatial",
              performanceReason:
                "Lens width changes the SDF map aspect and WebGL lens bounds.",
              performanceRole: "workload",
              step: 1,
              target: "glass.width",
              type: "slider",
              unit: "px",
            },
            glassHeight: {
              defaultValue: 360,
              label: "Height",
              max: 720,
              min: 96,
              orderRole: "spatial",
              performanceReason:
                "Lens height changes the SDF map aspect and WebGL lens bounds.",
              performanceRole: "workload",
              step: 1,
              target: "glass.height",
              type: "slider",
              unit: "px",
            },
            glassRadius: {
              defaultValue: 230,
              label: "Radius",
              max: 360,
              min: 0,
              orderRole: "spatial",
              performanceReason:
                "Corner radius changes the rounded-rect SDF and shader silhouette.",
              performanceRole: "workload",
              step: 1,
              target: "glass.radius",
              type: "slider",
              unit: "px",
            },
          },
          title: "Glass Shape",
        },
        {
          controls: {
            glassCenter: {
              coordinateMode: "screen",
              defaultValue: {
                x: 0,
                y: 0,
              },
              label: "Center",
              orderRole: "spatial",
              performanceReason:
                "Moves the lens through WebGL uniforms without regenerating the source.",
              performanceRole: "responsiveness",
              target: "glass.center",
              type: "vector",
              xLabel: "X",
              yLabel: "Y",
            },
          },
          title: "Center",
        },
        {
          controls: {
            glassOpacity: {
              defaultValue: 1,
              label: "Opacity",
              max: 1,
              min: 0.05,
              orderRole: "strength",
              performanceReason:
                "Updates the lens blend uniform without changing shader workload.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "glass.opacity",
              type: "slider",
            },
          },
          title: "Glass Blend",
        },
        {
          controls: {
            shadowEnabled: {
              defaultValue: true,
              label: "Include",
              orderRole: "mode",
              performanceReason:
                "Toggles the shadow branch in the WebGL lens composite without rebuilding glass maps.",
              performanceRole: "responsiveness",
              target: "shadow.enabled",
              type: "switch",
            },
            shadowOffset: {
              coordinateMode: "screen",
              defaultValue: { x: 0, y: 0.14 },
              label: "Offset",
              orderRole: "spatial",
              performanceReason:
                "Moves the shader shadow silhouette through uniforms while preserving source and displacement caches.",
              performanceRole: "responsiveness",
              target: "shadow.offset",
              type: "vector",
              xLabel: "X",
              yLabel: "Y",
            },
            shadowColor: {
              defaultValue: { hex: "#2E214A", opacity: 60 },
              label: "Color",
              orderRole: "color",
              performanceReason:
                "Changes shadow color and alpha uniforms inside the glass composite pass.",
              performanceRole: "responsiveness",
              target: "shadow.color",
              type: "colorOpacity",
            },
            shadowBlur: {
              defaultValue: 59,
              label: "Blur",
              max: 140,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Expands the WebGL shadow softness and lens scissor padding during preview and export.",
              performanceRole: "workload",
              step: 1,
              target: "shadow.blur",
              type: "slider",
              unit: "px",
            },
          },
          layout: "standalone",
          title: "Glass Shadow",
        },
        {
          controls: {
            textEnabled: {
              defaultValue: false,
              label: "Include",
              orderRole: "mode",
              performanceReason:
                "Toggles the glass-centered text texture without changing the lens map.",
              performanceRole: "responsiveness",
              target: "text.enabled",
              type: "switch",
            },
            textDragTarget: {
              defaultValue: "glass",
              label: false,
              options: [
                { label: "Glass", value: "glass" },
                { label: "Text", value: "text" },
              ],
              orderRole: "mode",
              performanceReason:
                "Switches the canvas drag target between moving the glass lens and moving the glass text.",
              performanceRole: "responsiveness",
              target: "text.dragTarget",
              type: "select",
              visibleWhen: { equals: true, target: "text.enabled" },
            },
            textBlendMode: {
              defaultValue: "overlay",
              description:
                "Uses the Style color as the blend source; pure white can make Screen match Normal.",
              label: "Text Blend",
              options: [
                { label: "Normal", value: "normal" },
                { label: "Multiply", value: "multiply" },
                { label: "Screen", value: "screen" },
                { label: "Overlay", value: "overlay" },
                { label: "Soft Light", value: "soft-light" },
              ],
              orderRole: "mode",
              performanceReason:
                "Updates the text compositing uniform inside the glass mask.",
              performanceRole: "responsiveness",
              target: "text.blendMode",
              type: "select",
              visibleWhen: { equals: true, target: "text.enabled" },
            },
            textAlignX: {
              defaultValue: "center",
              label: "Horizontal",
              options: [
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ],
              orderRole: "spatial",
              performanceReason:
                "Redraws text placement within the cached glass-local text texture.",
              performanceRole: "responsiveness",
              target: "text.alignX",
              type: "select",
              visibleWhen: { equals: true, target: "text.enabled" },
            },
            textAlignY: {
              defaultValue: "middle",
              label: "Vertical",
              options: [
                { label: "Top", value: "top" },
                { label: "Center", value: "middle" },
                { label: "Bottom", value: "bottom" },
              ],
              orderRole: "spatial",
              performanceReason:
                "Redraws text vertical placement within the cached glass-local text texture.",
              performanceRole: "responsiveness",
              target: "text.alignY",
              type: "select",
              visibleWhen: { equals: true, target: "text.enabled" },
            },
            textOffset: {
              coordinateMode: "screen",
              defaultValue: { x: 0, y: -0.15 },
              label: "Offset",
              orderRole: "spatial",
              performanceReason:
                "Moves the cached text frame inside the glass mask without changing source pixels.",
              performanceRole: "responsiveness",
              target: "text.offset",
              type: "vector",
              visibleWhen: { equals: true, target: "text.enabled" },
              xLabel: "X",
              yLabel: "Y",
            },
            textContent: {
              defaultValue: "Glass",
              label: "Text",
              orderRole: "primary",
              performanceReason:
                "Redraws the cached text texture that is sampled inside the lens.",
              performanceRole: "responsiveness",
              target: "text.content",
              type: "text",
              visibleWhen: { equals: true, target: "text.enabled" },
            },
            textStyle: {
              defaultValue: {
                color: "#FFFFFF",
                fontId: "inter",
                fontSize: 80,
                fontWeight: "600",
                letterSpacing: "tight",
                lineHeight: "tight",
                opacity: 100,
                textCase: "original",
              },
              label: "Style",
              orderRole: "color",
              performanceReason:
                "FontPicker redraws the cached text texture for typography, color, opacity, letter spacing, and line height.",
              performanceRole: "workload",
              target: "text.style",
              type: "fontPicker",
              visibleWhen: { equals: true, target: "text.enabled" },
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["textEnabled", "textDragTarget"],
              layout: "inline",
            },
            {
              columns: 2,
              controls: ["textAlignX", "textAlignY"],
              layout: "inline",
            },
          ],
          layout: "standalone",
          title: "Glass Text",
        },
        {
          controls: {
            buttonImageUpload: {
              accept: "image/*",
              assetKind: "image",
              defaultValue: null,
              label: "Image",
              orderRole: "input",
              performanceReason:
                "Uploaded button image dimensions affect decode and the glass-local image frame.",
              performanceRole: "responsiveness",
              target: "buttonImage.upload",
              type: "fileDrop",
            },
            buttonImageBlendMode: {
              defaultValue: "overlay",
              label: "Blend",
              options: [
                { label: "Normal", value: "normal" },
                { label: "Multiply", value: "multiply" },
                { label: "Screen", value: "screen" },
                { label: "Overlay", value: "overlay" },
                { label: "Soft Light", value: "soft-light" },
              ],
              orderRole: "mode",
              performanceReason:
                "Updates the button image compositing uniform inside the glass mask without redrawing image pixels.",
              performanceRole: "responsiveness",
              target: "buttonImage.blendMode",
              type: "select",
            },
            buttonImageOffset: {
              coordinateMode: "screen",
              defaultValue: { x: 0.07, y: 0.01 },
              label: "Position",
              orderRole: "spatial",
              performanceReason:
                "Moves the cached button image inside the glass mask without touching source pixels.",
              performanceRole: "responsiveness",
              target: "buttonImage.offset",
              type: "vector",
              xLabel: "X",
              yLabel: "Y",
            },
            buttonImageScale: {
              defaultValue: 0.71,
              label: "Scale",
              max: 3,
              min: 0.2,
              orderRole: "spatial",
              performanceReason:
                "Scales the cached button image frame while preserving the glass shader pipeline.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "buttonImage.scale",
              type: "slider",
            },
          },
          layout: "standalone",
          title: "Button Image",
        },
        {
          controls: {
            textureMode: {
              defaultValue: "image",
              label: "Texture",
              options: [
                { label: "Off", value: "off" },
                { label: "Preset", value: "preset" },
                { label: "Image", value: "image" },
              ],
              orderRole: "mode",
              performanceReason:
                "Switches texture compositing off, to a generated overlay, or to uploaded media.",
              performanceRole: "workload",
              target: "texture.mode",
              type: "segmented",
            },
            texturePreset: {
              defaultValue: "grain",
              label: "Pattern",
              options: [
                { label: "Grain", value: "grain" },
                { label: "Brushed", value: "brushed" },
                { label: "Speckle", value: "speckle" },
                { label: "Etched", value: "etched" },
              ],
              orderRole: "mode",
              performanceReason:
                "Redraws the generated overlay texture sampled inside the lens.",
              performanceRole: "workload",
              target: "texture.preset",
              type: "select",
              visibleWhen: { equals: "preset", target: "texture.mode" },
            },
            textureUpload: {
              accept: "image/*",
              assetKind: "image",
              defaultValue: null,
              label: "Texture Image",
              orderRole: "primary",
              performanceReason:
                "Uploaded overlay image dimensions affect texture decode and GPU upload.",
              performanceRole: "responsiveness",
              target: "texture.upload",
              type: "fileDrop",
              visibleWhen: { equals: "image", target: "texture.mode" },
            },
            textureBlendMode: {
              defaultValue: "screen",
              label: "Blend",
              options: [
                { label: "Normal", value: "normal" },
                { label: "Multiply", value: "multiply" },
                { label: "Screen", value: "screen" },
                { label: "Overlay", value: "overlay" },
                { label: "Soft Light", value: "soft-light" },
              ],
              orderRole: "primary",
              performanceReason:
                "Updates the texture blend-mode shader uniform without rebuilding source pixels.",
              performanceRole: "responsiveness",
              target: "texture.blendMode",
              type: "select",
              visibleWhen: { notEquals: "off", target: "texture.mode" },
            },
            textureOpacity: {
              defaultValue: 0.9,
              label: "Texture Opacity",
              max: 1,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Updates the texture alpha shader uniform during slider drag.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "texture.opacity",
              type: "slider",
              visibleWhen: { notEquals: "off", target: "texture.mode" },
            },
          },
          layout: "standalone",
          title: "Glass Texture",
        },
        {
          controls: {
            glassStrength: {
              defaultValue: 0.15,
              description:
                "Matches the reference displacement strength before the RGB split.",
              label: "Strength",
              max: 0.3,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes shader displacement scale and visible refraction intensity.",
              performanceRole: "responsiveness",
              step: 0.005,
              target: "glass.strength",
              type: "slider",
            },
            glassDepth: {
              defaultValue: 0.17,
              label: "Depth",
              max: 1,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes how far the SDF refraction reaches into the lens.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.depth",
              type: "slider",
            },
            glassCurvature: {
              defaultValue: 0.64,
              label: "Curvature",
              max: 1,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes dome constants used by the SDF displacement map.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.curvature",
              type: "slider",
            },
            glassFisheye: {
              defaultValue: 0.28,
              description:
                "Adds extra center magnification on top of the reference dome while preserving the same map pipeline.",
              label: "Fisheye",
              max: 1,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes the shader lens displacement curve through a uniform.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "glass.fisheye",
              type: "slider",
            },
            glassDispersion: {
              defaultValue: 2,
              label: "Aberration",
              max: 2,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes chromatic RGB split offsets inside the glass shader.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "glass.dispersion",
              type: "slider",
            },
            glassSplay: {
              defaultValue: 0.24,
              label: "Splay",
              max: 1,
              min: 0,
              orderRole: "advanced",
              performanceReason:
                "Changes corner displacement direction in the SDF map.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.splay",
              type: "slider",
            },
          },
          title: "Refraction",
        },
        {
          controls: {
            glassBend: {
              defaultValue: 0.6,
              label: "Bend",
              max: 1,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes the reference meniscus band inside the displacement map.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.bend",
              type: "slider",
            },
            glassBendWidth: {
              defaultValue: 0.21,
              label: "Edge Width",
              max: 0.4,
              min: 0.04,
              orderRole: "detail",
              performanceReason:
                "Changes the rim band width used by map generation.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.bendWidth",
              type: "slider",
            },
          },
          title: "Edge",
        },
        {
          controls: {
            glassFrost: {
              defaultValue: 1.5,
              label: "Frost",
              max: 14,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Controls the WebGL frost blur prepass and shader mix.",
              performanceRole: "workload",
              step: 0.25,
              target: "glass.frost",
              type: "slider",
              unit: "px",
            },
            glassBrightness: {
              defaultValue: 0,
              label: "Brightness",
              max: 0.7,
              min: -0.5,
              orderRole: "detail",
              performanceReason:
                "Changes the shader veil uniform over the lens.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "glass.brightness",
              type: "slider",
            },
            glassMurkiness: {
              defaultValue: 0.1,
              description:
                "Milky opacity blended inside the lens after refraction.",
              label: "Murkiness",
              max: 0.8,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Changes a shader veil uniform and product output opacity.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "glass.murkiness",
              type: "slider",
            },
          },
          title: "Surface",
        },
        {
          controls: {
            glassSpecular: {
              defaultValue: 1.67,
              label: "Specular",
              max: 2.5,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Scales the reference B-channel specular lift in the shader.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "glass.specular",
              type: "slider",
            },
            glassSheen: {
              defaultValue: 1.1,
              label: "Sheen",
              max: 2,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Changes directional highlight intensity in map generation.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.sheen",
              type: "slider",
            },
            glassSheenWidth: {
              defaultValue: 5.5,
              label: "Thickness",
              max: 10,
              min: 1,
              orderRole: "detail",
              performanceReason:
                "Changes highlight band thickness in map generation.",
              performanceRole: "workload",
              step: 0.5,
              target: "glass.sheenWidth",
              type: "slider",
              unit: "px",
            },
            glassSheenAngle: {
              defaultValue: 53,
              label: "Angle",
              max: 180,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Changes directional specular projection in map generation.",
              performanceRole: "workload",
              step: 1,
              target: "glass.sheenAngle",
              type: "slider",
              unit: "°",
            },
            glassGlow: {
              defaultValue: 0.5,
              label: "Glow",
              max: 1,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Changes inner glow intensity encoded in the displacement map.",
              performanceRole: "workload",
              step: 0.01,
              target: "glass.glow",
              type: "slider",
            },
            glassGlowSpread: {
              defaultValue: 1,
              label: "Spread",
              max: 2,
              min: 0.2,
              orderRole: "detail",
              performanceReason:
                "Changes inner glow reach encoded in the displacement map.",
              performanceRole: "workload",
              step: 0.05,
              target: "glass.glowSpread",
              type: "slider",
            },
          },
          title: "Highlights",
        },
        {
          controls: {
            includeBackground: {
              defaultValue: true,
              description:
                "Hides the product background in preview and PNG when off.",
              label: "Include",
              orderRole: "color",
              performanceReason:
                "Toggles product background compositing while keeping the Toolcraft canvas backing visible.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            background: {
              defaultValue: { hex: "#090A0F" },
              label: false,
              orderRole: "color",
              performanceReason:
                "Changes the renderer-owned output background color.",
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
          title: "Background",
        },
        {
          controls: {
            imageFormat: {
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              orderRole: "action",
              performanceReason:
                "Changes the final handoff format after rendering the same pixels.",
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
              orderRole: "action",
              performanceReason:
                "Changes PNG export pixel dimensions through the Toolcraft export helper.",
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
          title: "Image Export",
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
              defaultValue: null,
              label: false,
              orderRole: "action",
              performanceReason:
                "Runs product PNG export through the route-level panel action handler.",
              performanceRole: "responsiveness",
              target: "panel.actions",
              type: "panelActions",
            },
          },
        },
      ],
      title: "Liquid Glass",
    },
  },
  persistence: {
    include: ["values", "canvas", "panels"],
    key: "toolcraft:liquid-glass:state:v7",
    storage: "localStorage",
    version: 7,
  },
  settingsTransfer: {
    appId: "liquid-glass",
    enabled: "auto",
    fileName: "liquid-glass-settings.json",
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
