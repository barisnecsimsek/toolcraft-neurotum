export function createMeasuredWebglEvidence(scenarioId = "text-preview-render") {
  return [
    {
      alternativeStrategy: "webgl" as const,
      decision:
        "Canvas 2D remains selected because cached CPU rendering stayed within budget for this product fixture while preserving export parity.",
      fixture: "large product stress fixture at render scale 2",
      measuredResult:
        "WebGL comparison: maxFrameGapMs 72, maxLongTaskMs 64; Canvas 2D comparison: maxFrameGapMs 68, maxLongTaskMs 58.",
      scenarioId,
    },
  ];
}

export function createTextRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["text-layout"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["text-layout"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["text-layout"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["product.content", "render.density", "render.mode"],
        id: "text-layout",
        inputs: ["product.content", "render.density", "render.mode"],
        invalidatedBy: ["product.content", "render.density", "render.mode"],
        kind: "text-layout",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
    ],
  } as const;
}

export function createAnimatedVectorRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["vector-build"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["vector-build"],
        targets: ["render.mode"],
      },
      {
        interaction: "animation-frame",
        invalidates: ["animation-composite"],
        mustNotInvalidate: ["vector-build"],
        targets: ["animation.time"],
      },
      {
        interaction: "timeline-playback",
        invalidates: ["animation-composite"],
        mustNotInvalidate: ["vector-build"],
        targets: ["timeline.currentTime"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: ["animation-composite"],
        mustNotInvalidate: ["vector-build"],
        targets: ["timeline.currentTime"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: ["vector-build", "animation-composite"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["vector-build", "animation-composite"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        id: "vector-build",
        inputs: ["render.density", "render.mode"],
        invalidatedBy: ["render.density", "render.mode"],
        kind: "vector-build",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["vector-build", "animation.time", "timeline.currentTime"],
        id: "animation-composite",
        inputs: ["vector-build", "animation.time", "timeline.currentTime"],
        invalidatedBy: ["animation.time", "timeline.currentTime"],
        kind: "composite",
        output: "preview",
        quality: "preview",
        runsOn: "main",
      },
    ],
  } as const;
}

export function createDenseCanvasPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["dense-background", "export-composite"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["export-composite"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["dense-background", "export-composite"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "export",
        invalidates: ["export-composite"],
        mustNotInvalidate: ["dense-background"],
        targets: ["export.image.resolution"],
      },
    ],
    passes: [
      {
        cacheKey: ["render.density", "canvas.size", "canvas.renderScale"],
        id: "dense-background",
        inputs: ["render.density", "canvas.size", "canvas.renderScale"],
        invalidatedBy: ["render.density", "canvas.size", "canvas.renderScale"],
        kind: "rasterize",
        output: "preview",
        quality: "retina",
        runsOn: "worker",
      },
      {
        id: "semantic-foreground",
        inputs: ["product.geometry"],
        invalidatedBy: ["product.geometry"],
        kind: "vector-build",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["dense-background", "semantic-foreground", "export.image.resolution"],
        id: "export-composite",
        inputs: ["dense-background", "semantic-foreground", "export.image.resolution"],
        invalidatedBy: ["dense-background", "semantic-foreground", "export.image.resolution"],
        kind: "composite",
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
  } as const;
}

export function createMainThreadCanvasCompositePipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["text-texture", "warp-composite", "optical-composite"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["text-texture", "warp-composite", "optical-composite"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["text-texture", "warp-composite", "optical-composite"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["product.content", "render.density", "canvas.size", "canvas.renderScale"],
        id: "text-texture",
        inputs: ["product.content", "render.density", "canvas.size", "canvas.renderScale"],
        invalidatedBy: ["product.content", "render.density", "canvas.size", "canvas.renderScale"],
        kind: "rasterize",
        output: "intermediate",
        quality: "retina",
        runsOn: "main",
      },
      {
        cacheKey: ["text-texture", "render.density", "canvas.size"],
        id: "warp-composite",
        inputs: ["text-texture", "render.density", "canvas.size"],
        invalidatedBy: ["text-texture", "render.density", "canvas.size"],
        kind: "composite",
        output: "preview",
        quality: "retina",
        runsOn: "main",
      },
      {
        cacheKey: ["warp-composite", "render.mode", "canvas.renderScale"],
        id: "optical-composite",
        inputs: ["warp-composite", "render.mode", "canvas.renderScale"],
        invalidatedBy: ["warp-composite", "render.mode", "canvas.renderScale"],
        kind: "composite",
        output: "preview",
        quality: "retina",
        runsOn: "main",
      },
    ],
  } as const;
}

export function createPixelRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["pixel-transform"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["pixel-transform"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["pixel-transform"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["render.density", "render.mode", "canvas.size", "canvas.renderScale"],
        id: "pixel-transform",
        inputs: ["render.density", "render.mode", "canvas.size", "canvas.renderScale"],
        invalidatedBy: ["render.density", "render.mode", "canvas.size", "canvas.renderScale"],
        kind: "pixel-transform",
        output: "preview",
        quality: "retina",
        runsOn: "worker",
      },
    ],
  } as const;
}

export function createMediaRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "media-import",
        invalidates: ["source-decode", "media-preprocess"],
        targets: ["source.image"],
      },
      {
        interaction: "control-drag",
        invalidates: ["effect-composite"],
        mustNotInvalidate: ["source-decode", "media-preprocess"],
        targets: ["render.density"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["source-decode", "media-preprocess", "effect-composite"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["source.image.id", "source.image.width", "source.image.height"],
        id: "source-decode",
        inputs: ["source.image"],
        invalidatedBy: ["source.image"],
        kind: "decode",
        output: "source",
        quality: "full",
        runsOn: "worker",
      },
      {
        cacheKey: ["source-decode", "source.image.id"],
        id: "media-preprocess",
        inputs: ["source-decode"],
        invalidatedBy: ["source-decode"],
        kind: "preprocess",
        output: "intermediate",
        quality: "full",
        runsOn: "worker-or-gpu",
      },
      {
        cacheKey: ["media-preprocess", "render.density"],
        id: "effect-composite",
        inputs: ["media-preprocess", "render.density"],
        invalidatedBy: ["media-preprocess", "render.density"],
        kind: "composite",
        output: "preview",
        quality: "retina",
        runsOn: "gpu",
      },
    ],
  } as const;
}
