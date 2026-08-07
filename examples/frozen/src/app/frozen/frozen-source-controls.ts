import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

import { frozenDefaultSceneValues } from "./frozen-default-scene";
import {
  frozenModelTriangleBudgetMinimum,
  frozenSourceTriangleLimit,
} from "./frozen-model";

const modelVisibleWhen = { equals: "model", target: "source.mode" } as const;
const imageVisibleWhen = { equals: "image", target: "source.mode" } as const;

export const frozenSourceControlSection = {
  controls: {
    sourceMode: {
      defaultValue: frozenDefaultSceneValues["source.mode"],
      description: "Chooses an uploaded 3D mesh or a volumetric image slab.",
      label: "Type",
      options: [
        { label: "3D", value: "model" },
        { label: "Image", value: "image" },
      ],
      orderRole: "mode",
      performanceReason: "Switches between independently prepared source branches.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      target: "source.mode",
      type: "segmented",
    },
    modelFile: {
      accept:
        ".glb,.obj,.stl,.zip,model/gltf-binary,model/stl,text/plain,application/zip,application/x-zip-compressed,application/octet-stream",
      assetKind: "file",
      defaultValue: null,
      description:
        "Loads a textured GLB or a ZIP containing glTF/OBJ, material files, and textures. OBJ and STL without materials use a neutral fallback.",
      label: "Model package",
      orderRole: "input",
      performanceReason: "Import prepares source geometry bounded at 30,000 triangles once.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      target: "source.model",
      type: "fileDrop",
      visibleWhen: modelVisibleWhen,
    },
    modelTriangleBudget: {
      defaultValue: frozenDefaultSceneValues["source.modelTriangleBudget"],
      description:
        "Simplifies larger static meshes while preserving UVs and normals; set 30,000 to keep every accepted source triangle.",
      label: "Mesh budget",
      max: frozenSourceTriangleLimit,
      min: frozenModelTriangleBudgetMinimum,
      orderRole: "input",
      performanceReason:
        "Bounds source geometry reused by preview, Melt Brush projection, and export.",
      performanceRole: "workload",
      semanticGroup: "active-source",
      sliderValueKind: "continuous",
      step: 1_000,
      target: "source.modelTriangleBudget",
      type: "slider",
      visibleWhen: modelVisibleWhen,
    },
    modelExposure: {
      defaultValue: frozenDefaultSceneValues["source.modelExposure"],
      description:
        "Scales the final model and texture radiance before ACES tone mapping without changing the ice.",
      label: "Exposure",
      max: 3,
      min: -3,
      orderRole: "detail",
      performanceReason:
        "Updates one fixed-cost retained source-material uniform without rebuilding geometry or textures.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      sliderValueKind: "continuous",
      step: 0.1,
      target: "source.modelExposure",
      type: "slider",
      unit: "EV",
      visibleWhen: modelVisibleWhen,
    },
    imageFile: {
      accept:
        "image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif",
      assetKind: "image",
      defaultValue: null,
      description:
        "Builds a rounded volumetric slab with the transformed image on both faces.",
      label: "Image",
      orderRole: "input",
      performanceReason: "Import decodes one bounded color texture per source image.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      target: "source.image",
      type: "fileDrop",
      visibleWhen: imageVisibleWhen,
    },
    imageThickness: {
      defaultValue: frozenDefaultSceneValues["source.imageThickness"],
      description: "Sets real slab depth relative to its shorter image edge.",
      label: "Thickness",
      max: 100,
      min: 1,
      performanceReason: "Rebuilds a bounded rounded slab and deterministic surface samples.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      sliderValueKind: "continuous",
      step: 1,
      target: "source.imageThickness",
      type: "slider",
      unit: "%",
      visibleWhen: imageVisibleWhen,
    },
    imageCornerRadius: {
      defaultValue: frozenDefaultSceneValues["source.imageCornerRadius"],
      description: "Rounds the image and slab silhouette together, independently from thickness.",
      label: "Round corners",
      max: 100,
      min: 0,
      performanceReason: "Rebuilds fixed-detail rounded extrusion and surface samples.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      sliderValueKind: "continuous",
      step: 1,
      target: "source.imageCornerRadius",
      type: "slider",
      unit: "%",
      visibleWhen: imageVisibleWhen,
    },
    imageBevel: {
      defaultValue: frozenDefaultSceneValues["source.imageBevel"],
      description: "Rounds the physical transition between the image face and side wall.",
      label: "Bevel",
      max: 100,
      min: 0,
      performanceReason: "Rebuilds fixed-detail extrusion bevels and surface samples.",
      performanceRole: "responsiveness",
      semanticGroup: "active-source",
      sliderValueKind: "continuous",
      step: 1,
      target: "source.imageBevel",
      type: "slider",
      unit: "%",
      visibleWhen: imageVisibleWhen,
    },
  },
  title: "Source",
} satisfies ToolcraftControlSectionSchema;
