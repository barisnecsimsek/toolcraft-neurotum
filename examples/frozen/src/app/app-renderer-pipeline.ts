import {
  registerToolcraftRendererPipeline,
  type ToolcraftRendererPipelinePassContract,
} from "@/toolcraft/runtime";

import type { FrozenPreparedModel } from "./frozen/frozen-model";
import type { FrozenPreparedImage } from "./frozen/frozen-image-model";
import type { FrozenPreparedScratch } from "./frozen/frozen-texture";

export type FrozenPreviewResult = Readonly<{
  rendered: boolean;
  signature: string;
}>;

type FrozenRendererPasses = {
  "camera-render": ToolcraftRendererPipelinePassContract<FrozenPreviewResult>;
  "image-decode": ToolcraftRendererPipelinePassContract<FrozenPreparedImage | null>;
  "image-export": ToolcraftRendererPipelinePassContract<void>;
  "image-model-prepare": ToolcraftRendererPipelinePassContract<FrozenPreparedModel | null>;
  "model-prepare": ToolcraftRendererPipelinePassContract<FrozenPreparedModel | null>;
  "preview-render": ToolcraftRendererPipelinePassContract<FrozenPreviewResult>;
  "scratch-prepare": ToolcraftRendererPipelinePassContract<FrozenPreparedScratch | null>;
};

export const imageGeometrySliderTargets = [
  "source.imageThickness",
  "source.imageCornerRadius",
  "source.imageBevel",
] as const;

export const modelGeometrySliderTargets = [
  "source.modelTriangleBudget",
] as const;

export const previewSliderTargets = [
  "effect.progress",
  "effect.transition",
  "effect.noiseScale",
  "effect.turbulence",
  "ice.shellThickness",
  "ice.crystalDensity",
  "ice.crystalSize",
  "ice.crystalElongation",
  "ice.crystalVariation",
  "ice.icicleDensity",
  "ice.icicleLength",
  "ice.icicleRadius",
  "ice.icicleVariation",
  "ice.icicleUnderside",
  "ice.transmission",
  "ice.ior",
  "ice.roughness",
  "ice.roughnessVariation",
  "ice.materialMaskCoverage",
  "ice.materialMaskScale",
  "ice.materialMaskSoftness",
  "ice.materialMaskDistortion",
  "ice.materialMaskSeed",
  "scratch.scale",
  "scratch.rotation",
  "scratch.contrast",
  "scratch.displacement",
  "scratch.bump",
  "scratch.roughness",
  "lighting.environmentIntensity",
  "lighting.environmentRotation",
  "lighting.exposure",
  "melt.heat",
  "melt.radius",
  "melt.refreeze",
  "melt.structure",
  "source.modelExposure",
  "canvas.renderScale",
] as const;

export const previewChangeTargets = [
  "source.mode",
  "ice.color",
  "scratch.offset",
  "scratch.invert",
  "export.includeBackground",
  "scene.background",
  "canvas.aspectRatio",
  "canvas.size.width",
  "canvas.size.height",
  "melt.enabled",
  "melt.refreezeMode",
] as const;

export const previewInputs = [
  "source.model",
  ...modelGeometrySliderTargets,
  "source.image",
  ...imageGeometrySliderTargets,
  "source.scratchTexture",
  "melt.temperatureField",
  ...previewSliderTargets,
  ...previewChangeTargets,
] as const;

export const exportInputs = [
  ...previewInputs,
  "scene.orientation",
  "export.image.format",
  "export.image.resolution",
] as const;

export const appRendererPipelineRegistration =
  registerToolcraftRendererPipeline<FrozenRendererPasses>()({
    interactionInvalidation: [
      {
        interaction: "media-import",
        invalidates: ["model-prepare", "preview-render"],
        targets: ["source.model"],
      },
      {
        interaction: "media-import",
        invalidates: ["image-decode", "image-model-prepare", "preview-render"],
        mustNotInvalidate: ["model-prepare"],
        targets: ["source.image"],
      },
      {
        interaction: "media-import",
        invalidates: ["scratch-prepare", "preview-render"],
        mustNotInvalidate: ["model-prepare"],
        targets: ["source.scratchTexture"],
      },
      {
        interaction: "control-drag",
        invalidates: ["preview-render"],
        targets: previewSliderTargets,
      },
      {
        interaction: "control-drag",
        invalidates: ["model-prepare", "preview-render"],
        mustNotInvalidate: ["image-decode", "image-model-prepare"],
        targets: modelGeometrySliderTargets,
      },
      {
        interaction: "control-drag",
        invalidates: ["image-model-prepare", "preview-render"],
        mustNotInvalidate: ["image-decode", "model-prepare"],
        targets: imageGeometrySliderTargets,
      },
      {
        interaction: "control-change",
        invalidates: ["preview-render"],
        targets: previewChangeTargets,
      },
      {
        interaction: "control-change",
        invalidates: ["preview-render"],
        mustNotInvalidate: ["model-prepare", "image-model-prepare"],
        targets: ["melt.action"],
      },
      {
        interaction: "mask-drag",
        invalidates: ["preview-render"],
        mustNotInvalidate: [
          "model-prepare",
          "image-decode",
          "image-model-prepare",
          "scratch-prepare",
        ],
        targets: ["melt.temperatureField"],
      },
      {
        interaction: "animation-frame",
        invalidates: ["preview-render"],
        mustNotInvalidate: [
          "model-prepare",
          "image-decode",
          "image-model-prepare",
          "scratch-prepare",
        ],
        targets: ["melt.temperatureField"],
      },
      {
        interaction: "control-change",
        invalidates: [],
        mustNotInvalidate: ["model-prepare", "preview-render"],
        targets: ["export.image.format", "export.image.resolution"],
      },
      {
        interaction: "viewport-drag",
        invalidates: ["camera-render"],
        mustNotInvalidate: ["model-prepare", "preview-render"],
        targets: ["scene.orientation"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: ["model-prepare", "preview-render", "image-export"],
        targets: ["canvas.viewport.offset"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["model-prepare", "preview-render", "image-export"],
        targets: ["canvas.viewport.zoom"],
      },
      {
        interaction: "export",
        invalidates: ["image-export"],
        targets: [
          "actions.output",
          "export.image.format",
          "export.image.resolution",
        ],
      },
    ],
    passes: [
      {
        cacheKey: ["source.model", "source.modelTriangleBudget"],
        cost: {
          dimensions: ["source-triangles"],
          frequency: "discrete",
          relationship: "linear",
        },
        id: "model-prepare",
        inputs: ["source.model", "source.modelTriangleBudget"],
        invalidatedBy: ["source.model", "source.modelTriangleBudget"],
        kind: "preprocess",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "source",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["source.image"],
        cost: {
          dimensions: ["source-image-pixels"],
          frequency: "discrete",
          relationship: "linear",
        },
        id: "image-decode",
        inputs: ["source.image"],
        invalidatedBy: ["source.image"],
        kind: "preprocess",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "source",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: [
          "source.image",
          "source.imageThickness",
          "source.imageCornerRadius",
          "source.imageBevel",
        ],
        cost: {
          dimensions: [],
          frequency: "frame",
          relationship: "constant",
        },
        id: "image-model-prepare",
        inputs: [
          "source.image",
          "source.imageThickness",
          "source.imageCornerRadius",
          "source.imageBevel",
        ],
        invalidatedBy: [
          "source.image",
          "source.imageThickness",
          "source.imageCornerRadius",
          "source.imageBevel",
        ],
        kind: "vector-build",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "source",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["source.scratchTexture"],
        cost: {
          dimensions: ["scratch-texture-pixels"],
          frequency: "discrete",
          relationship: "linear",
        },
        id: "scratch-prepare",
        inputs: ["source.scratchTexture"],
        invalidatedBy: ["source.scratchTexture"],
        kind: "preprocess",
        lifecycle: { cache: "memoized", resourceScope: "source" },
        output: "source",
        quality: "full",
        runsOn: "main",
      },
      {
        cost: {
          dimensions: [
            "model-render-triangles",
            "surface-crystal-coverage",
            "icicle-coverage",
            "physical-transmission",
            "preview-render-scale",
          ],
          frequency: "interaction",
          relationship: "product",
        },
        id: "preview-render",
        inputs: previewInputs,
        invalidatedBy: previewInputs,
        kind: "handles",
        lifecycle: { cache: "none", resourceScope: "interaction" },
        output: "preview",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: [
            "model-render-triangles",
            "surface-crystal-coverage",
            "icicle-coverage",
            "physical-transmission",
            "preview-render-scale",
          ],
          frequency: "interaction",
          relationship: "product",
        },
        id: "camera-render",
        inputs: ["source.model", "scene.orientation"],
        invalidatedBy: ["source.model", "scene.orientation"],
        kind: "handles",
        lifecycle: { cache: "none", resourceScope: "interaction" },
        output: "preview",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: [
            "model-render-triangles",
            "surface-crystal-coverage",
            "icicle-coverage",
            "physical-transmission",
            "export-width-px",
          ],
          frequency: "batch",
          relationship: "product",
        },
        id: "image-export",
        inputs: exportInputs,
        invalidatedBy: exportInputs,
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
    runtimeId: "frozen-webgl-renderer-v17",
  });

export const imageExportPass =
  appRendererPipelineRegistration.getPass("image-export");
export const imageDecodePass =
  appRendererPipelineRegistration.getPass("image-decode");
export const imageModelPreparePass =
  appRendererPipelineRegistration.getPass("image-model-prepare");
export const cameraRenderPass =
  appRendererPipelineRegistration.getPass("camera-render");
export const modelPreparePass =
  appRendererPipelineRegistration.getPass("model-prepare");
export const previewRenderPass =
  appRendererPipelineRegistration.getPass("preview-render");
export const scratchPreparePass =
  appRendererPipelineRegistration.getPass("scratch-prepare");
