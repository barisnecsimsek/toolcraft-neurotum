import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const canvasSource = readFileSync(new URL("./effects-canvas.tsx", import.meta.url), "utf8");
const engineSource = readFileSync(
  new URL("./three-effects-engine.ts", import.meta.url),
  "utf8",
);
const bloomSource = readFileSync(
  new URL("./effects-bloom-pass.ts", import.meta.url),
  "utf8",
);
const externalComposerSource = readFileSync(
  new URL("./external-texture-composer.ts", import.meta.url),
  "utf8",
);
const studioEnvironmentSource = readFileSync(
  new URL("./studio-environment.ts", import.meta.url),
  "utf8",
);

describe("preview sizing and render pipeline", () => {
  it("builds a local procedural studio environment without network assets", () => {
    expect(engineSource).toContain("createProceduralStudioEnvironment");
    expect(engineSource).toContain(
      "this.scene.environment = this.studioEnvironment.texture",
    );
    expect(engineSource).toContain("this.scene.environmentIntensity");
    expect(engineSource).not.toContain("loadAsync(");
    expect(studioEnvironmentSource).not.toMatch(/https?:\/\//);
    expect(studioEnvironmentSource).toContain("new THREE.PMREMGenerator(renderer)");
    expect(studioEnvironmentSource).toContain("generator.fromScene(");
    expect(studioEnvironmentSource).toContain('"MeshFX.ProceduralStudio"');
    expect(engineSource).not.toContain("new THREE.HemisphereLight");
    expect(engineSource).not.toContain("new THREE.DirectionalLight(0x8aa2ff");
  });

  it("uses the full fitted viewport, DPR, and selected Resolution scale", () => {
    expect(canvasSource).toContain("(window.devicePixelRatio || 1) * renderScale");
    expect(canvasSource).not.toContain("previewCapScale");
    expect(canvasSource).not.toContain("Math.min(window.devicePixelRatio");
    expect(canvasSource).not.toContain("720 / Math.max");
  });

  it("keeps logical shader resolution separate from physical backing pixels", () => {
    expect(engineSource).toContain("this.renderer.setPixelRatio(nextPixelRatio)");
    expect(engineSource).toContain("this.composer.setPixelRatio(nextPixelRatio)");
    expect(engineSource).toContain(
      "const sizeScale = this.width / this.effectScaleBaselineWidth",
    );
    expect(engineSource).not.toContain("this.width / 720");
  });

  it("coalesces control renders and only allocates the animated cache when needed", () => {
    expect(canvasSource).toContain("window.requestAnimationFrame(() =>");
    expect(engineSource).toContain(
      "this.saveStaticPass.enabled = settings.grain.enabled && settings.grain.animate",
    );
    expect(engineSource).toContain("private ensureAnimatedSize(): void");
    expect(canvasSource).toContain("if (needsRender) engine.render(settingsRef.current)");
  });

  it("caches the MSAA scene and keeps full-screen post targets single-sampled", () => {
    expect(engineSource).toContain("this.sceneTarget.samples = 4");
    expect(engineSource).toContain("private ensureSceneCache(");
    expect(engineSource).toContain("new ExternalTextureComposer(this.renderer, this.sceneTarget)");
    expect(engineSource).not.toContain("new RenderPass(");
    expect(engineSource).not.toContain("new TexturePass(");
    expect(engineSource).toContain('this.sceneCacheKey = ""');
    expect(externalComposerSource).toContain("private readonly inputTarget");
    expect(externalComposerSource).toContain("type: THREE.HalfFloatType");
    expect(externalComposerSource).not.toContain("samples =");
    expect(externalComposerSource).toContain("pass.renderToScreen = isLast");
    expect(engineSource).not.toContain("this.bloomPass.setSize(nextWidth, nextHeight)");
  });

  it("uses the source-equivalent r164 Bloom blur pipeline without a redundant parent composite", () => {
    expect(bloomSource).not.toContain("sourceStrength / 3");
    expect(bloomSource).not.toContain("super.render(renderer, writeBuffer, readBuffer");
    expect(bloomSource).toContain("this.materialHighPassFilter");
    expect(bloomSource).toContain("bloomDirections.BlurDirectionX");
    expect(bloomSource).toContain("bloomDirections.BlurDirectionY");
  });

  it("skips neutral adjustment/output passes without lowering render scale", () => {
    expect(engineSource).toContain("adjustments.enabled = hasColorAdjustments(settings)");
    expect(engineSource).toContain("makeOutputAwareFragmentShader");
    expect(engineSource).toContain("gl_FragColor.rgb = toneMapping(gl_FragColor.rgb)");
    expect(engineSource).toContain("gl_FragColor = linearToOutputTexel(gl_FragColor)");
    expect(engineSource).toContain("setUniform(finalShaderPass, \"outputTransform\", 1)");
    expect(engineSource).not.toContain("previewCapScale");
  });
});
