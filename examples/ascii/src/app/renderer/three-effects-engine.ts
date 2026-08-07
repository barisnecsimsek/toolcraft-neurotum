import * as THREE from "three";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SavePass } from "three/addons/postprocessing/SavePass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import type { EffectsRendererSettings } from "./effect-state";
import {
  EffectsBloomPass,
} from "./effects-bloom-pass";
import {
  effectFragmentShaders,
  type EffectShaderName,
} from "./effect-shaders";
import { ExternalTextureComposer } from "./external-texture-composer";
import { disposeEffectsModel, loadEffectsModel } from "./model-loader";
import { SCENE_PROFILE } from "./scene-profile";
import {
  createProceduralStudioEnvironment,
  type ProceduralStudioEnvironment,
} from "./studio-environment";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const effectNames = [
  "none",
  "pixelate",
  "dither",
  "ascii",
  "halftone",
  "mosaic",
  "bricks",
  "pointillism",
  "heatmap",
  "threshold",
  "duotone",
] as const;

type StylizedEffectName = Exclude<(typeof effectNames)[number], "none">;

const characterPresets = [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "@#%&*+=-:.",
  "01アイウエオカキクケコ",
  "01",
  "⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊",
  "·—",
  "·•●○",
  "/\\|",
] as const;

function createPassUniforms(fragmentShader: string): Record<string, THREE.IUniform> {
  const uniforms: Record<string, THREE.IUniform> = {};

  for (const match of fragmentShader.matchAll(
    /uniform\s+(sampler2D|float|vec2|vec3)\s+(\w+)\s*;/g,
  )) {
    const [, type, name] = match;
    if (!name) continue;

    if (type === "vec2") uniforms[name] = { value: new THREE.Vector2() };
    else if (type === "vec3") uniforms[name] = { value: new THREE.Color() };
    else uniforms[name] = { value: type === "sampler2D" ? null : 0 };
  }

  return uniforms;
}

function makeOutputAwareFragmentShader(fragmentShader: string): string {
  const effectMain = fragmentShader.replace(
    /void\s+main\s*\(\s*\)/,
    "void applyEffectMain()",
  );

  if (effectMain === fragmentShader) {
    throw new Error("Effect shader is missing main().");
  }

  return /* glsl */ `
    uniform float outputTransform;
    ${effectMain}

    void main() {
      applyEffectMain();

      if (outputTransform > 0.5) {
        #ifdef TONE_MAPPING
          gl_FragColor.rgb = toneMapping(gl_FragColor.rgb);
        #endif
        gl_FragColor = linearToOutputTexel(gl_FragColor);
      }
    }
  `;
}

function createShaderPass(name: EffectShaderName): ShaderPass {
  const fragmentShader = effectFragmentShaders[name];
  return new ShaderPass({
    fragmentShader: makeOutputAwareFragmentShader(fragmentShader),
    uniforms: {
      ...createPassUniforms(fragmentShader),
      outputTransform: { value: 0 },
    },
    vertexShader,
  });
}

function setUniform(pass: ShaderPass, name: string, value: number | boolean): void {
  const uniform = pass.uniforms[name];
  if (uniform) uniform.value = typeof value === "boolean" ? (value ? 1 : 0) : value;
}

function setColor(pass: ShaderPass, name: string, value: string): void {
  const uniformValue = pass.uniforms[name]?.value;
  if (uniformValue instanceof THREE.Color) uniformValue.set(value);
}

function setResolution(pass: ShaderPass, width: number, height: number): void {
  const resolution = pass.uniforms.resolution?.value;
  if (resolution instanceof THREE.Vector2) resolution.set(width, height);
}

function copyShaderPassState(source: ShaderPass, target: ShaderPass): void {
  target.enabled = source.enabled;

  for (const [name, sourceUniform] of Object.entries(source.uniforms)) {
    if (name === "tDiffuse") continue;
    const targetUniform = target.uniforms[name];
    if (!targetUniform) continue;

    if (
      sourceUniform.value instanceof THREE.Color &&
      targetUniform.value instanceof THREE.Color
    ) {
      targetUniform.value.copy(sourceUniform.value);
    } else if (
      sourceUniform.value instanceof THREE.Vector2 &&
      targetUniform.value instanceof THREE.Vector2
    ) {
      targetUniform.value.copy(sourceUniform.value);
    } else {
      targetUniform.value = sourceUniform.value;
    }
  }
}

function createCharacterTexture(characters: string): THREE.CanvasTexture & { _charCount: number } {
  const glyphs = characters.length > 0 ? characters : ".";
  const cellSize = 64;
  const canvas = document.createElement("canvas");
  canvas.width = cellSize * glyphs.length;
  canvas.height = cellSize;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("ASCII character atlas requires Canvas 2D support.");

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.font = "bold 54px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let index = 0; index < glyphs.length; index += 1) {
    context.fillText(glyphs[index] ?? ".", cellSize * index + 32, 32);
  }

  const texture = new THREE.CanvasTexture(canvas) as THREE.CanvasTexture & {
    _charCount: number;
  };
  texture.generateMipmaps = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture._charCount = glyphs.length;
  return texture;
}

function getAsciiCharacters(settings: EffectsRendererSettings): string {
  if (settings.ascii.shape < 7) return ".";
  if (settings.ascii.shape === 14) return settings.ascii.characters || ".";
  return characterPresets[settings.ascii.shape] || ".";
}

function getToneMapping(index: number): THREE.ToneMapping {
  return [
    THREE.NoToneMapping,
    THREE.ACESFilmicToneMapping,
    THREE.AgXToneMapping,
    THREE.NeutralToneMapping,
    THREE.ReinhardToneMapping,
    THREE.CineonToneMapping,
    THREE.NoToneMapping,
  ][index] ?? THREE.NoToneMapping;
}

function hasColorAdjustments(settings: EffectsRendererSettings): boolean {
  const adjustments = settings.adjustments;
  return (
    adjustments.exposure !== 0 ||
    adjustments.brightness !== 0 ||
    adjustments.contrast !== 0 ||
    adjustments.saturation !== 0 ||
    adjustments.hue !== 0 ||
    adjustments.temperature !== 0 ||
    adjustments.tint !== 0
  );
}

export class ThreeEffectsEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(
    SCENE_PROFILE.camera.fov,
    16 / 9,
    SCENE_PROFILE.camera.near,
    SCENE_PROFILE.camera.far,
  );
  private readonly studioEnvironment: ProceduralStudioEnvironment;
  private readonly composer: ExternalTextureComposer;
  private readonly animatedComposer: ExternalTextureComposer;
  private readonly sceneTarget: THREE.WebGLRenderTarget;
  private readonly saveStaticPass: SavePass;
  private readonly outputPass = new OutputPass();
  private readonly animatedOutputPass = new OutputPass();
  private readonly bloomPass = new EffectsBloomPass(
    new THREE.Vector2(1, 1),
    0.4,
    0.5,
    0.85,
  );
  private readonly stylizedPasses: Record<StylizedEffectName, ShaderPass>;
  private readonly depthOfFieldPass = createShaderPass("depthOfField");
  private readonly chromaticPass = createShaderPass("chromatic");
  private readonly filmGrainPass = createShaderPass("filmGrain");
  private readonly animatedFilmGrainPass = createShaderPass("filmGrain");
  private readonly gradientOverlayPass = createShaderPass("gradientOverlay");
  private readonly animatedGradientOverlayPass = createShaderPass("gradientOverlay");
  private readonly vignettePass = createShaderPass("vignette");
  private readonly animatedVignettePass = createShaderPass("vignette");
  private readonly adjustmentsPass = createShaderPass("adjustments");
  private readonly animatedAdjustmentsPass = createShaderPass("adjustments");
  private model: THREE.Group | null = null;
  private modelToken = 0;
  private asciiTexture = createCharacterTexture(".");
  private asciiTextureKey = ".";
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private effectScaleBaselineWidth = 1;
  private animatedSizeDirty = true;
  private sceneCacheKey = "";
  private disposed = false;

  private readonly mainOutputAwarePasses: ShaderPass[] = [];
  private readonly animatedOutputAwarePasses: ShaderPass[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(1);

    this.camera.position.set(...SCENE_PROFILE.camera.position);
    this.camera.lookAt(0, 0, 0);

    this.scene.environmentIntensity = SCENE_PROFILE.environment.intensity;
    this.scene.environmentRotation.set(0, 0, 0);
    this.studioEnvironment = createProceduralStudioEnvironment(this.renderer);
    this.scene.environment = this.studioEnvironment.texture;
    const key = new THREE.DirectionalLight(
      0xffffff,
      SCENE_PROFILE.directionalLight.intensity,
    );
    key.position.set(...SCENE_PROFILE.directionalLight.position);
    key.castShadow = true;
    this.scene.add(key);

    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      format: THREE.RGBAFormat,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
    });
    this.sceneTarget.samples = 4;
    this.sceneTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.sceneTarget.texture.name = "EffectsScene.msaa";
    this.composer = new ExternalTextureComposer(this.renderer, this.sceneTarget);
    const staticCacheTarget = new THREE.WebGLRenderTarget(1, 1, {
      format: THREE.RGBAFormat,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
    });
    staticCacheTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.saveStaticPass = new SavePass(staticCacheTarget);
    this.animatedComposer = new ExternalTextureComposer(
      this.renderer,
      staticCacheTarget,
    );

    this.stylizedPasses = {
      ascii: createShaderPass("ascii"),
      bricks: createShaderPass("bricks"),
      dither: createShaderPass("dither"),
      duotone: createShaderPass("duotone"),
      halftone: createShaderPass("halftone"),
      heatmap: createShaderPass("heatmap"),
      mosaic: createShaderPass("mosaic"),
      pixelate: createShaderPass("pixelate"),
      pointillism: createShaderPass("pointillism"),
      threshold: createShaderPass("threshold"),
    };
    this.mainOutputAwarePasses.push(
      ...Object.values(this.stylizedPasses),
      this.depthOfFieldPass,
      this.chromaticPass,
      this.filmGrainPass,
      this.gradientOverlayPass,
      this.vignettePass,
      this.adjustmentsPass,
    );
    this.animatedOutputAwarePasses.push(
      this.animatedFilmGrainPass,
      this.animatedGradientOverlayPass,
      this.animatedVignettePass,
      this.animatedAdjustmentsPass,
    );

    for (const pass of Object.values(this.stylizedPasses)) {
      pass.enabled = false;
      this.composer.addPass(pass);
    }
    this.bloomPass.enabled = false;
    this.depthOfFieldPass.enabled = false;
    this.chromaticPass.enabled = false;
    this.filmGrainPass.enabled = false;
    this.gradientOverlayPass.enabled = false;
    this.vignettePass.enabled = false;
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.depthOfFieldPass);
    this.composer.addPass(this.chromaticPass);
    this.saveStaticPass.enabled = false;
    this.composer.addPass(this.saveStaticPass);
    this.composer.addPass(this.filmGrainPass);
    this.composer.addPass(this.gradientOverlayPass);
    this.composer.addPass(this.vignettePass);
    this.composer.addPass(this.adjustmentsPass);
    this.composer.addPass(this.outputPass);

    this.animatedComposer.addPass(this.animatedFilmGrainPass);
    this.animatedComposer.addPass(this.animatedGradientOverlayPass);
    this.animatedComposer.addPass(this.animatedVignettePass);
    this.animatedComposer.addPass(this.animatedAdjustmentsPass);
    this.animatedComposer.addPass(this.animatedOutputPass);
  }

  setSize(
    width: number,
    height: number,
    pixelRatio = 1,
    effectScaleBaselineWidth = width,
  ): boolean {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));
    const nextPixelRatio = Math.max(1, pixelRatio);
    const nextEffectScaleBaselineWidth = Math.max(1, effectScaleBaselineWidth);
    const sizeChanged = this.width !== nextWidth || this.height !== nextHeight;
    const pixelRatioChanged = this.pixelRatio !== nextPixelRatio;
    const referenceWidthChanged =
      this.effectScaleBaselineWidth !== nextEffectScaleBaselineWidth;

    this.width = nextWidth;
    this.height = nextHeight;
    this.pixelRatio = nextPixelRatio;
    this.effectScaleBaselineWidth = nextEffectScaleBaselineWidth;
    if (!sizeChanged && !pixelRatioChanged && !referenceWidthChanged) return false;

    if (!sizeChanged && !pixelRatioChanged) return true;

    this.camera.aspect = nextWidth / nextHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(nextPixelRatio);
    this.renderer.setSize(nextWidth, nextHeight, false);
    this.composer.setPixelRatio(nextPixelRatio);
    this.composer.setSize(nextWidth, nextHeight);
    this.sceneTarget.setSize(
      Math.max(1, Math.round(nextWidth * nextPixelRatio)),
      Math.max(1, Math.round(nextHeight * nextPixelRatio)),
    );
    this.sceneCacheKey = "";
    this.animatedSizeDirty = true;

    for (const pass of [
      ...Object.values(this.stylizedPasses),
      this.depthOfFieldPass,
      this.chromaticPass,
      this.filmGrainPass,
      this.gradientOverlayPass,
      this.vignettePass,
      this.adjustmentsPass,
      this.animatedFilmGrainPass,
      this.animatedGradientOverlayPass,
      this.animatedVignettePass,
      this.animatedAdjustmentsPass,
    ]) {
      setResolution(pass, nextWidth, nextHeight);
    }
    return true;
  }

  private ensureAnimatedSize(): void {
    if (!this.animatedSizeDirty) return;
    this.animatedComposer.setPixelRatio(this.pixelRatio);
    this.animatedComposer.setSize(this.width, this.height);
    this.animatedSizeDirty = false;
  }

  async setModel(asset?: ToolcraftMediaAsset): Promise<"default" | "upload"> {
    const token = this.modelToken + 1;
    this.modelToken = token;
    const loaded = await loadEffectsModel(asset);

    if (token !== this.modelToken) {
      disposeEffectsModel(loaded.model);
      return loaded.source;
    }

    if (this.model) {
      this.scene.remove(this.model);
      disposeEffectsModel(this.model);
    }
    this.model = loaded.model;
    this.scene.add(loaded.model);
    this.sceneCacheKey = "";
    return loaded.source;
  }

  private updateAsciiTexture(settings: EffectsRendererSettings): void {
    const characters = getAsciiCharacters(settings);
    if (characters !== this.asciiTextureKey) {
      this.asciiTexture.dispose();
      this.asciiTexture = createCharacterTexture(characters);
      this.asciiTextureKey = characters;
    }

    this.stylizedPasses.ascii.uniforms.charTexture.value = this.asciiTexture;
    setUniform(
      this.stylizedPasses.ascii,
      "charCount",
      this.asciiTexture._charCount,
    );
  }

  private configureTerminalOutput(
    passes: readonly ShaderPass[],
    outputPass: OutputPass,
    toneMapping: number,
    bloomCanBeTerminal = false,
  ): void {
    for (const pass of passes) setUniform(pass, "outputTransform", 0);

    if (toneMapping === 6) {
      outputPass.enabled = false;
      return;
    }

    let finalShaderPass: ShaderPass | undefined;
    for (let index = passes.length - 1; index >= 0; index -= 1) {
      const pass = passes[index];
      if (pass?.enabled) {
        finalShaderPass = pass;
        break;
      }
    }
    const bloomIsTerminal =
      bloomCanBeTerminal &&
      this.bloomPass.enabled &&
      ![
        this.depthOfFieldPass,
        this.chromaticPass,
        this.filmGrainPass,
        this.gradientOverlayPass,
        this.vignettePass,
        this.adjustmentsPass,
      ].some((pass) => pass.enabled);

    if (finalShaderPass && !bloomIsTerminal) {
      setUniform(finalShaderPass, "outputTransform", 1);
      outputPass.enabled = false;
      return;
    }

    outputPass.enabled = true;
  }

  private ensureSceneCache(settings: EffectsRendererSettings): void {
    const key = [
      this.width,
      this.height,
      this.pixelRatio,
      this.modelToken,
      settings.background,
      settings.includeBackground ? 1 : 0,
      ...settings.orbitPose.position,
      ...settings.orbitPose.up,
    ].join(":");
    if (key === this.sceneCacheKey) return;

    const previousTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(previousTarget);
    this.sceneCacheKey = key;
  }

  private applySettings(settings: EffectsRendererSettings, timeSeconds: number): void {
    const sizeScale = this.width / this.effectScaleBaselineWidth;
    const ink = settings.duotone.ink;
    const paper = settings.duotone.paper;
    const activeEffect = effectNames[settings.effect] ?? "none";

    for (const [name, pass] of Object.entries(this.stylizedPasses)) {
      pass.enabled = name === activeEffect;
    }

    this.camera.position.fromArray(settings.orbitPose.position);
    this.camera.up.fromArray(settings.orbitPose.up).normalize();
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();

    const pixelate = this.stylizedPasses.pixelate;
    setUniform(pixelate, "pixelSize", settings.pixelate.size * sizeScale);
    setUniform(pixelate, "colorMode", settings.pixelate.colorMode);
    setColor(pixelate, "fgColor", ink);
    setColor(pixelate, "bgColor", paper);

    const dither = this.stylizedPasses.dither;
    setUniform(dither, "pixelScale", settings.dither.size * sizeScale);
    setUniform(dither, "ditherType", settings.dither.pattern);
    setUniform(dither, "levels", settings.dither.levels);
    setUniform(dither, "colorMode", settings.dither.colorMode);
    setColor(dither, "fgColor", ink);
    setColor(dither, "bgColor", paper);
    setUniform(dither, "brightness", settings.dither.brightness);
    setUniform(dither, "contrast", settings.dither.contrast);

    const ascii = this.stylizedPasses.ascii;
    setUniform(ascii, "cellSize", settings.ascii.size * sizeScale);
    setUniform(ascii, "brightness", settings.ascii.brightness);
    setUniform(ascii, "shapeMode", Math.min(settings.ascii.shape, 7));
    setUniform(ascii, "asciiType", 0);
    setUniform(ascii, "colorMode", settings.ascii.colorMode);
    setColor(ascii, "fgColor", ink);
    setColor(ascii, "bgColor", paper);
    setUniform(ascii, "spacing", settings.ascii.spacing);
    setUniform(ascii, "invert", settings.ascii.invert);
    this.updateAsciiTexture(settings);

    const halftone = this.stylizedPasses.halftone;
    setUniform(halftone, "scale", 105 - settings.halftone.size);
    setUniform(halftone, "angle", settings.halftone.angle);
    setUniform(halftone, "shape", settings.halftone.shape);
    setUniform(halftone, "halftoneType", settings.halftone.type);
    setUniform(halftone, "colorMode", settings.halftone.colorMode);
    setColor(halftone, "fgColor", ink);
    setColor(halftone, "bgColor", paper);
    setUniform(halftone, "spacing", settings.halftone.spacing);
    setUniform(halftone, "softness", 0.1);
    setUniform(halftone, "invert", settings.halftone.invert);

    const mosaic = this.stylizedPasses.mosaic;
    setUniform(mosaic, "cellSize", settings.mosaic.size * sizeScale);
    setUniform(mosaic, "edgeWidth", settings.mosaic.edges);
    setColor(mosaic, "edgeColor", settings.mosaic.edgeColor);
    setUniform(mosaic, "jitter", settings.mosaic.jitter);
    setUniform(mosaic, "edgeSoftness", 0);
    setUniform(mosaic, "colorMode", settings.mosaic.colorMode);
    setColor(mosaic, "fgColor", ink);
    setColor(mosaic, "bgColor", paper);

    const bricks = this.stylizedPasses.bricks;
    setUniform(bricks, "cellSize", settings.bricks.size * sizeScale);
    setUniform(bricks, "studSize", settings.bricks.stud);
    setUniform(bricks, "bevel", settings.bricks.bevel);
    setUniform(bricks, "grout", settings.bricks.grout);
    setUniform(bricks, "lightAngle", settings.bricks.light);
    setUniform(bricks, "colorMode", settings.bricks.colorMode);
    setColor(bricks, "fgColor", ink);
    setColor(bricks, "bgColor", paper);

    const pointillism = this.stylizedPasses.pointillism;
    setUniform(pointillism, "dotSize", settings.pointillism.size * sizeScale);
    setUniform(pointillism, "jitter", settings.pointillism.jitter);
    setColor(pointillism, "bgColor", paper);
    setUniform(pointillism, "shape", settings.pointillism.shape);
    setUniform(pointillism, "spacing", settings.pointillism.spacing);
    setUniform(pointillism, "softness", 0);
    setUniform(pointillism, "colorMode", settings.pointillism.colorMode);
    setColor(pointillism, "fgColor", ink);

    const heatmap = this.stylizedPasses.heatmap;
    setUniform(heatmap, "palette", settings.heatmap.palette);
    setUniform(heatmap, "brightness", settings.heatmap.brightness);
    setUniform(heatmap, "contrast", settings.heatmap.contrast);
    setUniform(heatmap, "invert", settings.heatmap.invert);
    setUniform(heatmap, "mixOriginal", settings.heatmap.colorMix);
    setUniform(heatmap, "posterize", settings.heatmap.steps);

    const threshold = this.stylizedPasses.threshold;
    setUniform(threshold, "threshold", settings.threshold.value);
    setUniform(threshold, "smoothing", settings.threshold.smoothing);
    setUniform(threshold, "colorMode", settings.threshold.colorMode);
    setColor(threshold, "fgColor", ink);
    setColor(threshold, "bgColor", paper);
    setUniform(threshold, "invert", settings.threshold.invert);

    const duotone = this.stylizedPasses.duotone;
    setColor(duotone, "fgColor", ink);
    setColor(duotone, "bgColor", paper);

    this.bloomPass.enabled = settings.bloom.enabled;
    this.bloomPass.strength = settings.bloom.strength;
    this.bloomPass.threshold = settings.bloom.threshold;
    this.bloomPass.radius = settings.bloom.radius;
    this.bloomPass.mix = settings.bloom.mix;
    this.bloomPass.blendMode = settings.bloom.blend;
    this.bloomPass.softness = settings.bloom.softness;
    const bloomInternals = this.bloomPass as unknown as {
      highPassUniforms?: Record<string, THREE.IUniform>;
    };
    const smoothWidth = bloomInternals.highPassUniforms?.smoothWidth;
    if (smoothWidth) smoothWidth.value = settings.bloom.softness;

    const depth = this.depthOfFieldPass;
    depth.enabled = settings.blur.enabled;
    setUniform(depth, "dofMode", settings.blur.mode);
    setUniform(depth, "focusX", settings.blur.focusPoint.x);
    setUniform(depth, "focusY", settings.blur.focusPoint.y);
    setUniform(depth, "aperture", settings.blur.aperture);
    setUniform(depth, "maxBlur", settings.blur.maxBlur * sizeScale);
    setUniform(depth, "focusRange", settings.blur.focusRange);
    setUniform(depth, "tiltAngle", settings.blur.angle);
    setUniform(depth, "tiltPosition", settings.blur.position);
    setUniform(depth, "blurEasing", settings.blur.easing);

    const chromatic = this.chromaticPass;
    chromatic.enabled = settings.chromatic.enabled;
    setUniform(chromatic, "amount", settings.chromatic.amount);
    setUniform(chromatic, "chromaticMode", settings.chromatic.mode);
    setUniform(chromatic, "angle", settings.chromatic.angle);

    const grain = this.filmGrainPass;
    grain.enabled = settings.grain.enabled;
    this.saveStaticPass.enabled = settings.grain.enabled && settings.grain.animate;
    setUniform(grain, "time", timeSeconds);
    setUniform(grain, "grainAmount", settings.grain.amount);
    setUniform(grain, "grainMode", settings.grain.mode);
    setUniform(grain, "grainAnimate", settings.grain.animate);

    const overlay = this.gradientOverlayPass;
    overlay.enabled = settings.overlay.enabled;
    setColor(overlay, "color1", settings.overlay.start);
    setColor(overlay, "color2", settings.overlay.end);
    setUniform(overlay, "angle", settings.overlay.angle);
    setUniform(overlay, "opacity", settings.overlay.opacity);

    const vignette = this.vignettePass;
    vignette.enabled = settings.vignette.enabled;
    setUniform(vignette, "amount", settings.vignette.amount);
    setUniform(vignette, "softness", settings.vignette.softness);

    const adjustments = this.adjustmentsPass;
    adjustments.enabled = hasColorAdjustments(settings);
    setUniform(adjustments, "exposure", settings.adjustments.exposure);
    setUniform(adjustments, "brightness", settings.adjustments.brightness);
    setUniform(adjustments, "contrast", settings.adjustments.contrast);
    setUniform(adjustments, "saturation", settings.adjustments.saturation);
    setUniform(adjustments, "hue", settings.adjustments.hue);
    setUniform(adjustments, "temperature", settings.adjustments.temperature);
    setUniform(adjustments, "tint", settings.adjustments.tint);

    this.renderer.toneMapping = getToneMapping(settings.adjustments.toneMapping);
    copyShaderPassState(this.filmGrainPass, this.animatedFilmGrainPass);
    copyShaderPassState(this.gradientOverlayPass, this.animatedGradientOverlayPass);
    copyShaderPassState(this.vignettePass, this.animatedVignettePass);
    copyShaderPassState(this.adjustmentsPass, this.animatedAdjustmentsPass);
    this.configureTerminalOutput(
      this.mainOutputAwarePasses,
      this.outputPass,
      settings.adjustments.toneMapping,
      true,
    );
    this.configureTerminalOutput(
      this.animatedOutputAwarePasses,
      this.animatedOutputPass,
      settings.adjustments.toneMapping,
    );
  }

  render(settings: EffectsRendererSettings, timeSeconds = 0): void {
    this.renderer.setClearColor(
      new THREE.Color(settings.background),
      settings.includeBackground ? 1 : 0,
    );
    this.applySettings(settings, timeSeconds);
    const adjustments = settings.adjustments;
    const hasAdjustments =
      adjustments.exposure !== 0 ||
      adjustments.brightness !== 0 ||
      adjustments.contrast !== 0 ||
      adjustments.saturation !== 0 ||
      adjustments.hue !== 0 ||
      adjustments.temperature !== 0 ||
      adjustments.tint !== 0 ||
      adjustments.toneMapping !== 0;
    const hasPostEffects =
      settings.bloom.enabled ||
      settings.blur.enabled ||
      settings.chromatic.enabled ||
      settings.grain.enabled ||
      settings.overlay.enabled ||
      settings.vignette.enabled;

    if (settings.effect === 0 && !hasAdjustments && !hasPostEffects) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.ensureSceneCache(settings);
    this.composer.render();
  }

  renderAnimated(settings: EffectsRendererSettings, timeSeconds: number): void {
    this.ensureAnimatedSize();
    setUniform(this.filmGrainPass, "time", timeSeconds);
    copyShaderPassState(this.filmGrainPass, this.animatedFilmGrainPass);
    this.renderer.toneMapping = getToneMapping(settings.adjustments.toneMapping);
    this.configureTerminalOutput(
      this.animatedOutputAwarePasses,
      this.animatedOutputPass,
      settings.adjustments.toneMapping,
    );
    this.animatedComposer.render();
  }

  dispose(): void {
    this.disposed = true;
    this.modelToken += 1;
    if (this.model) {
      disposeEffectsModel(this.model);
      this.model = null;
    }
    this.scene.environment = null;
    this.studioEnvironment.dispose();
    this.asciiTexture.dispose();
    for (const pass of Object.values(this.stylizedPasses)) pass.dispose();
    this.depthOfFieldPass.dispose();
    this.chromaticPass.dispose();
    this.filmGrainPass.dispose();
    this.animatedFilmGrainPass.dispose();
    this.gradientOverlayPass.dispose();
    this.animatedGradientOverlayPass.dispose();
    this.vignettePass.dispose();
    this.animatedVignettePass.dispose();
    this.adjustmentsPass.dispose();
    this.animatedAdjustmentsPass.dispose();
    this.bloomPass.dispose();
    this.saveStaticPass.dispose();
    this.outputPass.dispose();
    this.animatedOutputPass.dispose();
    this.composer.dispose();
    this.animatedComposer.dispose();
    this.sceneTarget.dispose();
    this.renderer.dispose();
  }
}
