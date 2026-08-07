import { defineToolcraft } from "@/toolcraft/runtime";

import { DEFAULT_LIQUID_METAL_ORBIT_POSE } from "./liquid-metal-orbit";
import { liquidMetalDefaultMediaAssets } from "./liquid-metal-default-scene";

const shaderResponsiveness = (reason: string) => ({
  performanceReason: reason,
  performanceRole: "responsiveness" as const,
});

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    size: { height: 1080, unit: "px", width: 1920 },
    sizing: { mode: "editable-output" },
    upload: true,
  },
  export: {
    png: { background: "include" },
  },
  media: {
    defaultAssets: liquidMetalDefaultMediaAssets,
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            modelFile: {
              accept:
                ".glb,.gltf,.obj,.stl,model/gltf-binary,model/gltf+json,text/plain,application/octet-stream",
              assetKind: "file",
              defaultValue: null,
              description:
                "GLB, self-contained GLTF, OBJ, or STL. The model geometry replaces Paper's 2D image mask.",
              label: "Model",
              orderRole: "input",
              performanceReason:
                "Import parses and normalizes the uploaded model before GPU rendering.",
              performanceRole: "responsiveness",
              target: "media.model",
              type: "fileDrop",
            },
          },
          title: "Model",
        },
        {
          controls: {
            modelScale: {
              defaultValue: 1,
              description:
                "Scales the normalized 3D model without changing the Liquid Metal pattern scale.",
              label: "Model scale",
              max: 3,
              min: 0.25,
              orderRole: "detail",
              performanceReason:
                "Changes the model's covered pixel area while reusing decoded and normalized geometry.",
              performanceRole: "workload",
              step: 0.01,
              target: "model.scale",
              type: "slider",
            },
            orientation: {
              defaultValue: DEFAULT_LIQUID_METAL_ORBIT_POSE,
              description:
                "Click an axis to snap, or drag any axis point directly around the orientation sphere.",
              keyframeable: false,
              label: false,
              orderRole: "detail",
              performanceReason:
                "Camera-pose changes redraw the gizmo and current GPU scene without rebuilding model, environment, scratch, or sticker resources.",
              performanceRole: "responsiveness",
              target: "view.orbit",
              type: "orientationGizmo",
            },
          },
          title: "Model Size",
        },
        {
          controls: {
            scratchMask: {
              accept: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
              assetKind: "image",
              defaultValue: null,
              description:
                "Grayscale height mask projected without model UVs. Black is recessed and white is raised; rotate or flip the image to change scratch direction.",
              label: "Scratch mask",
              orderRole: "input",
              performanceReason:
                "Import decodes one production-size grayscale image and uploads one cached GPU texture.",
              performanceRole: "responsiveness",
              target: "media.scratches",
              type: "fileDrop",
            },
          },
          title: "Scratch Mask",
        },
        {
          controls: {
            scratchDepth: {
              defaultValue: 0.54,
              description:
                "Perturbs the physical shading normal so scratches bend HDRI reflections without changing the model silhouette.",
              label: "Depth",
              max: 1.5,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Updates one normal-perturbation uniform without decoding the mask or rebuilding geometry.",
              performanceRole: "responsiveness",
              step: 0.01,
              target: "surface.scratchDepth",
              type: "slider",
            },
            scratchScale: {
              defaultValue: 2.2,
              description:
                "Controls object-space triplanar repetition; the mask stays attached while the model rotates and scales.",
              label: "Scratch scale",
              max: 20,
              min: 0.5,
              orderRole: "detail",
              performanceReason:
                "Maximum object-space frequency is tested with a production-size mask and 2x preview backing, even though the shader keeps a fixed sample count.",
              performanceRole: "workload",
              step: 0.1,
              target: "surface.scratchScale",
              type: "slider",
            },
            scratchInvert: {
              defaultValue: false,
              description:
                "Switches between black-as-groove and white-as-groove source conventions.",
              label: "Invert",
              orderRole: "detail",
              performanceReason:
                "Flips height polarity through one shader uniform without changing texture data.",
              performanceRole: "responsiveness",
              target: "surface.scratchInvert",
              type: "switch",
            },
          },
          title: "Surface Scratches",
        },
        {
          controls: {
            stickers: {
              accept: ".png,image/png",
              assetKind: "image",
              defaultValue: [],
              description:
                "Upload transparent PNG stickers. New stickers appear above earlier ones; drag thumbnails to reorder the stack, then drag a sticker directly on the model.",
              label: "PNG stickers",
              multiple: true,
              orderRole: "input",
              performanceReason:
                "Import decodes PNG pixels and projects ordered decal geometry across the uploaded model.",
              performanceRole: "responsiveness",
              target: "media.stickers",
              type: "fileDrop",
            },
          },
          title: "Stickers",
        },
        {
          controls: {
            stickerScale: {
              defaultValue: 0.82,
              description:
                "Resizes the selected sticker on its current surface island. With no selection, sets the size of the next imported sticker.",
              label: "Sticker scale",
              max: 2,
              min: 0.2,
              orderRole: "detail",
              performanceReason:
                "Changes the decal projector footprint and rebuilds only the selected sticker's clipped surface geometry.",
              performanceRole: "workload",
              step: 0.01,
              target: "stickers.scale",
              type: "slider",
            },
            stickerRotation: {
              defaultValue: 0,
              description:
                "Rotates the selected decal continuously in its local surface plane; this is independent of the file thumbnail's 90-degree image transform.",
              label: "Sticker rotation",
              max: 180,
              min: -180,
              orderRole: "detail",
              performanceReason:
                "Rotates and reprojects only the selected sticker without decoding its PNG or rebuilding the model.",
              performanceRole: "responsiveness",
              step: 1,
              target: "stickers.rotation",
              type: "slider",
              unit: "°",
            },
          },
          title: "Sticker Transform",
        },
        {
          controls: {
            presets: {
              actions: [
                { label: "Default", value: "preset.default" },
                { label: "Noir", value: "preset.noir" },
                { label: "Backdrop", value: "preset.backdrop" },
                { label: "Stripes", value: "preset.stripes" },
              ],
              defaultValue: "default",
              label: false,
              orderRole: "action",
              performanceReason:
                "Presets batch-update the same Paper uniforms used by individual controls.",
              performanceRole: "responsiveness",
              target: "shader.preset",
              type: "actions",
            },
          },
          title: "Presets",
        },
        {
          controls: {
            colorBack: {
              defaultValue: { hex: "#AAAAAC" },
              label: "Background",
              orderRole: "color",
              target: "shader.colorBack",
              type: "color",
              ...shaderResponsiveness(
                "Paper colorBack updates the exact Liquid Metal background/base uniform.",
              ),
            },
            colorTint: {
              defaultValue: { hex: "#FFFFFF" },
              label: "Tint",
              orderRole: "color",
              target: "shader.colorTint",
              type: "color",
              ...shaderResponsiveness(
                "Paper colorTint updates the exact color-burn tint uniform.",
              ),
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["colorBack", "colorTint"],
              layout: "inline",
            },
          ],
          title: "Metal Color",
        },
        {
          controls: {
            repetition: {
              defaultValue: 2,
              description: "Density of Paper's moving stripe pattern.",
              label: "Repetition",
              max: 10,
              min: 1,
              orderRole: "detail",
              step: 0.1,
              target: "shader.repetition",
              type: "slider",
              ...shaderResponsiveness(
                "Updates Paper's u_repetition uniform only.",
              ),
            },
            softness: {
              defaultValue: 0.1,
              description: "0 is a hard edge; 1 is a smooth gradient.",
              label: "Softness",
              max: 1,
              min: 0,
              orderRole: "detail",
              step: 0.01,
              target: "shader.softness",
              type: "slider",
              ...shaderResponsiveness(
                "Updates Paper's u_softness uniform only.",
              ),
            },
            shiftRed: {
              defaultValue: 0.3,
              label: "Red shift",
              max: 1,
              min: -1,
              orderRole: "detail",
              step: 0.01,
              target: "shader.shiftRed",
              type: "slider",
              ...shaderResponsiveness(
                "Updates Paper's red-channel dispersion uniform.",
              ),
            },
            shiftBlue: {
              defaultValue: 0.3,
              label: "Blue shift",
              max: 1,
              min: -1,
              orderRole: "detail",
              step: 0.01,
              target: "shader.shiftBlue",
              type: "slider",
              ...shaderResponsiveness(
                "Updates Paper's blue-channel dispersion uniform.",
              ),
            },
            distortion: {
              defaultValue: 0.07,
              description: "Noise distortion over the stripe pattern.",
              label: "Distortion",
              max: 1,
              min: 0,
              orderRole: "detail",
              step: 0.01,
              target: "shader.distortion",
              type: "slider",
              ...shaderResponsiveness(
                "Updates Paper's u_distortion uniform only.",
              ),
            },
            contour: {
              defaultValue: 0.4,
              description:
                "Strength of the distortion near the model silhouette.",
              label: "Contour",
              max: 1,
              min: 0,
              orderRole: "detail",
              step: 0.01,
              target: "shader.contour",
              type: "slider",
              ...shaderResponsiveness(
                "Updates Paper's u_contour uniform only.",
              ),
            },
            angle: {
              defaultValue: 70,
              description: "Direction of the animated stripe pattern.",
              label: "Angle",
              max: 360,
              min: 0,
              orderRole: "detail",
              step: 1,
              target: "shader.angle",
              type: "slider",
              unit: "°",
              ...shaderResponsiveness("Updates Paper's u_angle uniform only."),
            },
          },
          title: "Metal Pattern",
        },
        {
          controls: {
            speed: {
              defaultValue: 1,
              description:
                "Paper animation speed; 0 holds the current shader frame.",
              label: "Speed",
              max: 4,
              min: 0,
              orderRole: "detail",
              step: 0.01,
              target: "shader.speed",
              type: "slider",
              ...shaderResponsiveness(
                "Scales deterministic Paper frame time without rebuilding programs.",
              ),
            },
            scale: {
              defaultValue: 0.6,
              label: "Scale",
              max: 4,
              min: 0.2,
              orderRole: "detail",
              step: 0.01,
              target: "shader.scale",
              type: "slider",
              performanceReason:
                "Scale is classified as workload-sensitive by the contract and is tested at its full Paper range, although implementation updates one uniform.",
              performanceRole: "workload",
            },
            rotation: {
              defaultValue: 0,
              label: "Rotation",
              max: 360,
              min: 0,
              orderRole: "detail",
              step: 1,
              target: "shader.rotation",
              type: "slider",
              unit: "°",
              ...shaderResponsiveness(
                "Updates Paper's u_rotation uniform only.",
              ),
            },
            fit: {
              defaultValue: "contain",
              label: "Fit",
              options: [
                { label: "Contain", value: "contain" },
                { label: "Cover", value: "cover" },
              ],
              orderRole: "detail",
              target: "shader.fit",
              type: "select",
              ...shaderResponsiveness(
                "Updates Paper's exact fit-mode uniform.",
              ),
            },
            offset: {
              coordinateMode: "screen",
              defaultValue: { x: 0, y: 0 },
              description:
                "Paper offsetX and offsetY on the projected shader field.",
              label: "Offset",
              max: 1,
              min: -1,
              orderRole: "detail",
              step: 0.01,
              target: "shader.offset",
              type: "vector",
              ...shaderResponsiveness(
                "Updates Paper's u_offsetX and u_offsetY uniforms only.",
              ),
            },
          },
          title: "Projection",
        },
        {
          controls: {
            environmentPreset: {
              defaultValue: "studio",
              description:
                "Chooses the image-based lighting reflected by the metallic surface.",
              label: "Source",
              options: [
                { label: "Studio", value: "studio" },
                { label: "Softbox", value: "softbox" },
                { label: "Product", value: "product" },
                { label: "Rim", value: "rim" },
                { label: "Chrome", value: "chrome" },
                { label: "Neutral", value: "neutral" },
                { label: "Warm", value: "warm" },
                { label: "Custom HDRI", value: "custom" },
              ],
              orderRole: "mode",
              performanceReason:
                "Changing source prepares and caches one IBL texture while keeping model and material resources cached.",
              performanceRole: "responsiveness",
              target: "lighting.environmentPreset",
              type: "select",
            },
            environmentFile: {
              accept: ".hdr,.exr,image/vnd.radiance,application/octet-stream",
              assetKind: "file",
              defaultValue: null,
              description:
                "Equirectangular Radiance HDR or OpenEXR. Without a file, Custom HDRI falls back to Studio.",
              label: "HDRI",
              orderRole: "detail",
              performanceReason:
                "Import decodes a high-dynamic-range image and prefilters it once for PBR reflections.",
              performanceRole: "responsiveness",
              target: "media.environment",
              type: "fileDrop",
              visibleWhen: {
                equals: "custom",
                target: "lighting.environmentPreset",
              },
            },
            environmentIntensity: {
              defaultValue: 1,
              description:
                "Brightness of the environment lighting and reflections.",
              label: "Intensity",
              max: 3,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Updates scene environmentIntensity without rebuilding PMREM or material programs.",
              performanceRole: "responsiveness",
              step: 0.05,
              target: "lighting.environmentIntensity",
              type: "slider",
            },
            environmentRotation: {
              defaultValue: 281,
              description:
                "Rotates the reflected environment around the model.",
              label: "Environment rotation",
              max: 360,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Updates scene environmentRotation without rebuilding PMREM or geometry.",
              performanceRole: "responsiveness",
              step: 1,
              target: "lighting.environmentRotation",
              type: "slider",
              unit: "°",
            },
          },
          title: "Environment",
        },
        {
          controls: {
            includeBackground: {
              defaultValue: true,
              label: "Include",
              orderRole: "primary",
              target: "export.includeBackground",
              type: "switch",
              ...shaderResponsiveness(
                "Controls live scene background and PNG alpha without changing video background.",
              ),
            },
            background: {
              defaultValue: { hex: "#AFAFC5" },
              label: false,
              orderRole: "color",
              target: "appearance.background",
              type: "color",
              ...shaderResponsiveness(
                "Updates the Three.js scene clear color only.",
              ),
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
              orderRole: "mode",
              performanceReason: "Changes final image encoding only.",
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
              orderRole: "detail",
              performanceReason:
                "Changes Paper and Three.js export backing dimensions up to an 8K long edge.",
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
          controls: {
            videoFormat: {
              defaultValue: "mp4",
              label: "Format",
              options: [
                { label: "MP4", value: "mp4" },
                { label: "WebM", value: "webm" },
              ],
              orderRole: "mode",
              performanceReason:
                "Changes the requested MediaRecorder container only.",
              performanceRole: "responsiveness",
              target: "export.video.format",
              type: "select",
            },
            videoResolution: {
              defaultValue: "current",
              label: "Resolution",
              options: [
                { label: "Current", value: "current" },
                { label: "4K", value: "4k" },
              ],
              orderRole: "detail",
              performanceReason:
                "Changes real-time Paper and Three.js video render dimensions.",
              performanceRole: "workload",
              target: "export.video.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["videoFormat", "videoResolution"],
              layout: "inline",
            },
          ],
          title: "Video Export",
        },
        {
          controls: {
            actions: {
              actions: [
                {
                  icon: "upload-simple",
                  label: "Export Video",
                  value: "export.video",
                },
                {
                  icon: "upload-simple",
                  label: "Export PNG",
                  value: "export.png",
                  variant: "outline",
                },
              ],
              target: "export.actions",
              type: "panelActions",
            },
          },
          title: "Export",
        },
      ],
      title: "Liquid Metal 3D",
    },
    timeline: {
      defaultDurationSeconds: 10 / 3,
      enabled: true,
      mode: "playback",
    },
  },
  persistence: { storage: "none" },
  settingsTransfer: "auto",
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});

export const appSchemaWithoutDefaultMedia = {
  ...appSchema,
  media: { defaultAssets: [] },
};
