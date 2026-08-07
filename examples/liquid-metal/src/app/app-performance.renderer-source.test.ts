import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";
import {
  appPerformanceHasInteractionInvalidation,
  appPerformanceHasRenderPipelinePass,
  browserPerfContractRequiresRenderScaleBackingPixels,
  browserTestsAssertNativePreviewResolution,
  sourceCreatesWebGlContextInComponentRender,
  sourceMayUploadTextureFromTimelineDrivenEffect,
  sourceResyncsTimelineDurationFromRuntimeDuration,
  sourceUsesAnimationFrameWithoutCleanup,
  sourceUsesCpuPixelLoop,
  sourceUsesDirectStorageApi,
  sourceUsesGpuRenderer,
  sourceUsesLowResolutionPreviewUpscale,
  sourceUsesWebGlLifecycleGuard,
} from "./app-performance-test-utils";

function readLiquidMetalRendererSources(): string {
  return [
    "./liquid-metal-export.ts",
    "./liquid-metal-renderer.tsx",
    "./liquid-metal-scene.ts",
    "./liquid-metal-sticker-geometry.ts",
    "./liquid-metal-scratches.ts",
    "./liquid-metal-environment-worker.ts",
    "./liquid-metal-surface-shader.ts",
  ]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
    .join("\n");
}

describe("Toolcraft starter renderer source performance contract", () => {
  it("applies model scale to the shared normalized model group", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain(
      "this.modelGroup.scale.setScalar(settings.modelScale)",
    );
  });

  it("requires Liquid Metal to respond to 3D surface form instead of screen-space masking", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).not.toContain("gl_FragCoord");
    expect(source).toContain("vLiquidWorldPosition");
    expect(source).toContain("inverseTransformDirection(normal, viewMatrix)");
    expect(source).toContain("vViewPosition");
    expect(source).toMatch(/reflect\s*\(/);
    expect(source).toContain("getLiquidMetalSurfaceUv");
    expect(source).toContain("fresnel");
  });

  it("requires Liquid Metal to execute procedurally on every mesh fragment", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).not.toContain("CanvasTexture");
    expect(source).not.toContain("sampler2D uLiquidTexture");
    expect(source).not.toContain("texture2D(uLiquidTexture");
    expect(source).toContain("getLiquidMetalSurfaceUv");
    expect(source).toContain("getColorChanges");
    expect(source).toContain("snoise");
    for (const uniform of [
      "u_repetition",
      "u_softness",
      "u_shiftRed",
      "u_shiftBlue",
      "u_distortion",
      "u_contour",
      "u_angle",
      "u_loopProgress",
      "u_speed",
    ]) {
      expect(source).toContain(uniform);
    }
  });

  it("requires one seamless forward loop phase for color and physical normals", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("getForwardLoopPhase");
    expect(source).toContain("getLoopingSnoise");
    expect(source).toContain("previousCycle");
    expect(source).toContain("phase * phase * (3.0 - 2.0 * phase)");
    expect(source).toContain("getRippledWorldNormal");
    expect(source).not.toContain("snoise(uv - time)");
    expect(source).not.toContain("u_time");
  });

  it("requires a non-tiled matcap projection instead of dominant-axis box tiles", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("vViewPosition");
    expect(source).toContain("getLiquidMetalMatcapUv");
    expect(source).toContain("rippledWorldNormal");
    expect(source).toContain("matcapX");
    expect(source).toContain("matcapY");
    expect(source).not.toContain("projectedPosition");
    expect(source).not.toContain("axis.x >= axis.y");
    expect(source).not.toContain("return fract(uv)");
  });

  it("requires physically based metal and prefiltered environment reflections", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("MeshPhysicalMaterial");
    expect(source).toContain("RoomEnvironment");
    expect(source).toContain("PMREMGenerator");
    expect(source).toContain("ACESFilmicToneMapping");
    expect(source).toMatch(/metalness:\s*1/);
    expect(source).toMatch(/roughness:\s*0\.[01]/);
    expect(source).toContain("onBeforeCompile");
    expect(source).toContain("roughnessFactor");
    expect(source).toContain("metalnessFactor");
    expect(source).toContain("normal = rippledViewNormal");
    expect(source).not.toContain("new THREE.ShaderMaterial");
  });

  it("requires editable procedural and HDRI environments with worker decode and direct PBR radiance", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("HDRLoader");
    expect(source).toContain("EXRLoader");
    expect(source).toContain("decodeEnvironmentInWorker");
    expect(source).toContain("liquidMetalPhysicalEnvironmentApply");
    expect(source).toContain("u_environmentMap");
    expect(source).toContain("initTexture");
    expect(source).toContain("setEnvironmentAppearance");
    expect(source).toContain("environmentRotation");
    expect(source).toContain("environmentLoadVersion");
    expect(source).toContain("directEnvironmentTextures");
    expect(source).toContain("cachedTexture");
    expect(source).toContain("getProceduralEnvironmentRecipe");
    expect(source).toContain("getWrappedEnvironmentDistance");
    for (const preset of ["softbox", "product", "rim", "chrome"]) {
      expect(source).toContain(`preset === \"${preset}\"`);
    }
    expect(source).toContain("texture.dispose()");
    expect(source).toContain("pmremGenerator.dispose()");
  });

  it("requires PNG stickers to use ordered color-stable physical decals", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("rebuildStickerGeometry");
    expect(source).toContain("raycastModel");
    expect(source).toContain("pickSticker");
    expect(source).toContain("moveStickerAtClient");
    expect(source).toContain("buildLiquidMetalStickerSurfaceMeshes");
    expect(source).toContain("createLiquidMetalWrappedStickerGeometry");
    expect(source).toContain("unfoldStickerNeighbor");
    expect(source).toContain("clipStickerTriangleToFootprint");
    expect(source).toContain("stickerSurfaceRelativeAreaSquaredEpsilon");
    expect(source).toContain("maximumAreaScaleSquared");
    expect(source).toContain("owners.length !== 2");
    expect(source).toContain("surfaceFaceIndex");
    expect(source).toContain("surfaceMeshIndex");
    expect(source).not.toContain("DecalGeometry");
    expect(source).not.toContain("stickerSurfaceNormalThreshold");
    expect(source).toContain("placement.rotationDegrees");
    expect(source).toContain("placement.scale");
    expect(source).toContain("helper.rotateZ");
    expect(source).toContain("setStickerTransform");
    expect(source).toContain("pendingStickerGeometry");
    expect(source).toContain("pendingStickerScissor");
    expect(source).toContain("updateStickerGeometryBuffers");
    expect(source).toContain("needsFullStickerRender");
    expect(source).toContain("partialStickerUpdate");
    expect(source).toContain("setScissor");
    expect(source).toContain("preserveDrawingBuffer: true");
    expect(source).toContain("signature !== lastSignature");
    expect(source).toContain("isLiquidMetalPreviewFrameDue");
    expect(source).toContain("advanceLiquidMetalPreviewDeadline");
    expect(source).toContain("stickerTransformCommitTimeoutRef");
    expect(source).toContain("Promise.allSettled");
    expect(source).toContain("entriesToLoad.map");
    expect(source).toContain("loadedEntries.forEach");
    expect(source).toContain("disposeStickerTexture(texture)");
    expect(source).not.toContain(
      "const texture = await loadStickerTexture(asset)",
    );
    expect(source).toContain("stickerGroup");
    expect(source).toContain("polygonOffsetFactor");
    expect(source).toContain("renderOrder = 1000 + index");
    expect(source).toContain("MeshPhysicalMaterial");
    expect(source).toContain("liquidMetalPhysicalEnvironmentPars");
    expect(source).toContain("liquidMetalPhysicalEnvironmentApply");
    expect(source).toContain("depthWrite: false");
    expect(source).toContain("emissive: 0xffffff");
    expect(source).toContain("emissiveMap: texture");
    expect(source).toContain("metalness: 0");
    expect(source).toContain("specularIntensity: 0.04");
    expect(source).toContain("material.toneMapped = false");
    expect(source).not.toContain("CSS2DRenderer");
    expect(source).not.toContain("SpriteMaterial");
  });

  it("routes plain-left model hits to orbit while leaving empty canvas and middle drag to the viewport", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("hitTestModel");
    expect(source).toContain("isPlainLeftButton");
    expect(source).toMatch(
      /pickSticker[\s\S]*hitTestModel[\s\S]*mode:\s*"orbit"/,
    );
    expect(source).not.toContain("event.button !== 1");
  });

  it("requires grayscale scratches to perturb object-space triplanar physical normals", () => {
    const source = readLiquidMetalRendererSources();

    expect(source).toContain("vLiquidObjectPosition");
    expect(source).toContain("vLiquidObjectNormal");
    expect(source).toContain("getTriplanarScratchHeight");
    expect(source).toContain("scaledPosition.yz");
    expect(source).toContain("scaledPosition.zx");
    expect(source).toContain("scaledPosition.xy");
    expect(source).toContain("perturbScratchNormalArb");
    expect(source).toContain("dFdx(scratchHeight)");
    expect(source).toContain("dFdy(scratchHeight)");
    expect(source).toContain("normalize(vLiquidObjectNormal)");
    expect(source).toContain("THREE.NoColorSpace");
    expect(source).toContain("THREE.RepeatWrapping");
    expect(source).toContain("setScratchMask");
    expect(source).toContain("getLiquidMetalScratchAsset(state.mediaAssets)");
    expect(source).toContain(
      "getLiquidMetalScratchAsset(context.state.mediaAssets)",
    );
    expect(source).not.toContain("normalMap: texture");
  });

  it("detects low-resolution preview upscale code paths", () => {
    expect(
      sourceUsesLowResolutionPreviewUpscale(`
        const maxPreviewPixels = 1_250_000;
        const previewScale = Math.sqrt(maxPreviewPixels / (outputWidth * outputHeight));
        previewContext.drawImage(offscreenCanvas, 0, 0, outputWidth, outputHeight);
      `),
    ).toBe(true);

    expect(
      sourceUsesLowResolutionPreviewUpscale(`
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        drawAsciiTextToCanvas({ canvas, text });
      `),
    ).toBe(false);
  });

  it("rejects low-resolution preview upscale for text and vector output renderers", () => {
    if (
      appPerformance.rendererWorkload !== "text-output" &&
      appPerformance.rendererWorkload !== "vector-output"
    ) {
      return;
    }

    expect(
      sourceUsesLowResolutionPreviewUpscale(),
      "Text/vector product previews must preserve native output fidelity. Do not render a low-resolution preview canvas/texture and upscale it to state.canvas.size; optimize layout/drawing instead.",
    ).toBe(false);
  });

  it("requires text and vector output browser tests to prove native preview resolution", () => {
    if (
      !appPerformance.usesCustomRenderer ||
      (appPerformance.rendererWorkload !== "text-output" &&
        appPerformance.rendererWorkload !== "vector-output")
    ) {
      return;
    }

    expect(
      browserTestsAssertNativePreviewResolution(),
      "Text/vector custom renderers must have a browser test proving visible preview dimensions match product output dimensions so low-resolution upscale cannot pass unnoticed.",
    ).toBe(true);
  });

  it("requires render scale scenarios to prove backing canvas pixels in browser performance tests", () => {
    expect(
      browserPerfContractRequiresRenderScaleBackingPixels(),
      "Browser performance contract must require renderScale scenarios to assert backing canvas pixels, not only state or labels.",
    ).toBe(true);
  });

  it("requires procedural pixel-loop renderers to use a GPU strategy", () => {
    if (!sourceUsesCpuPixelLoop()) {
      return;
    }

    expect(
      appPerformance.rendererWorkload,
      "Procedural ImageData/getImageData/putImageData renderers must be classified as pixel-output.",
    ).toBe("pixel-output");
    expect(
      appPerformance.rendererStrategy,
      "Procedural ImageData/getImageData/putImageData renderers must be converted to WebGL/WebGPU or removed from the critical render path.",
    ).toMatch(/^(webgl|webgpu)$/);
    expect(
      sourceUsesGpuRenderer(),
      "Procedural pixel renderers must contain an actual WebGL/WebGPU code path, not only declare a GPU strategy.",
    ).toBe(true);
    expect(
      appPerformanceHasRenderPipelinePass("pixel-transform"),
      "Procedural pixel renderers must declare a rendererPipeline pixel-transform pass so caching and invalidation are machine-checkable.",
    ).toBe(true);
  });

  it("requires custom renderers to declare high-frequency viewport invalidation", () => {
    if (!appPerformance.usesCustomRenderer) {
      return;
    }

    expect(
      appPerformanceHasInteractionInvalidation("viewport-zoom"),
      "Custom renderer apps must declare rendererPipeline interactionInvalidation for viewport-zoom so zoom can stay responsive without recomputing expensive passes.",
    ).toBe(true);
  });

  it("requires WebGL/WebGPU renderers to keep their pipeline lifecycle outside React render", () => {
    if (!sourceUsesGpuRenderer()) {
      return;
    }

    expect(
      sourceUsesWebGlLifecycleGuard(),
      "WebGL/WebGPU renderer setup must be guarded by refs, memoized setup, an effect, or a renderer class so control changes update uniforms/buffers instead of rebuilding the pipeline.",
    ).toBe(true);
    expect(
      sourceCreatesWebGlContextInComponentRender(),
      "Do not create a WebGL context directly in the component render path; initialize it once and update uniforms/buffers on runtime value changes.",
    ).toBe(false);
  });

  it("requires animation loops to clean up scheduled frames", () => {
    expect(
      sourceUsesAnimationFrameWithoutCleanup(),
      "Renderers that schedule requestAnimationFrame must cancelAnimationFrame on cleanup to avoid runaway loops during control changes or route unmount.",
    ).toBe(false);
  });

  it("rejects direct app storage writes outside the runtime persistence policy", () => {
    expect(
      sourceUsesDirectStorageApi(),
      "Generated apps must not read or write app state through localStorage/sessionStorage directly. Use runtime persistence policy when product persistence is required.",
    ).toBe(false);
  });

  it("rejects renderer effects that overwrite user-edited timeline duration", () => {
    expect(
      sourceResyncsTimelineDurationFromRuntimeDuration(),
      "Renderers must not watch state.timeline.durationSeconds and dispatch timeline.setDuration back to a computed local duration. Compute a default only during initialization/reset, then map renderer progress to state.timeline.durationSeconds.",
    ).toBe(false);
  });

  it("rejects timeline-driven texture uploads in GPU keyframe renderers", () => {
    if (
      !sourceUsesGpuRenderer() ||
      appSchema.panels.timeline?.enabled !== true ||
      appSchema.panels.timeline.mode !== "keyframes"
    ) {
      return;
    }

    expect(
      sourceMayUploadTextureFromTimelineDrivenEffect(),
      "GPU keyframe renderers must upload source textures only when media/resource keys change. Timeline-driven effects may update uniforms and draw, but must not call texImage2D or renderer.setImage from an effect that depends on settings/currentTime/keyframeGroups.",
    ).toBe(false);
  });
});
