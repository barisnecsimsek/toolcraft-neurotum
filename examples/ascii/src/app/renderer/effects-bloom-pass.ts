import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const bloomDirections = UnrealBloomPass as typeof UnrealBloomPass & {
  BlurDirectionX: THREE.Vector2;
  BlurDirectionY: THREE.Vector2;
};

const compositeVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const compositeFragmentShader = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float intensity;
  uniform float bloomMix;
  uniform float blendMode;
  uniform vec3 tintColor;
  varying vec2 vUv;

  void main() {
    vec4 scene = texture2D(tScene, vUv);
    vec3 bloom = texture2D(tBloom, vUv).rgb * intensity * tintColor;
    vec3 screenBlend = 1.0 - (1.0 - scene.rgb) * (1.0 - bloom);
    vec3 addBlend = scene.rgb + bloom;
    vec3 blended = mix(screenBlend, addBlend, blendMode);
    gl_FragColor = vec4(mix(scene.rgb, blended, bloomMix), scene.a);
  }
`;

export class EffectsBloomPass extends UnrealBloomPass {
  mix = 1;
  blendMode = 0;
  softness = 0.3;
  tintColor = "#ffffff";
  private readonly sceneTarget: THREE.WebGLRenderTarget;
  private readonly copyMaterial = new THREE.MeshBasicMaterial();
  private readonly copyQuad = new FullScreenQuad(this.copyMaterial);
  private readonly finalCompositeMaterial: THREE.ShaderMaterial;
  private readonly finalCompositeQuad: FullScreenQuad;

  constructor(resolution: THREE.Vector2, strength: number, radius: number, threshold: number) {
    super(resolution, strength, radius, threshold);
    this.needsSwap = true;
    this.sceneTarget = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
      type: THREE.HalfFloatType,
    });
    this.finalCompositeMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader: compositeFragmentShader,
      uniforms: {
        blendMode: { value: 0 },
        bloomMix: { value: 1 },
        intensity: { value: strength },
        tBloom: { value: null },
        tintColor: { value: new THREE.Color(0xffffff) },
        tScene: { value: null },
      },
      vertexShader: compositeVertexShader,
    });
    this.finalCompositeQuad = new FullScreenQuad(this.finalCompositeMaterial);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime: number,
    maskActive: boolean,
  ): void {
    const oldClearColor = new THREE.Color();
    renderer.getClearColor(oldClearColor);
    const oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);

    this.copyMaterial.map = readBuffer.texture;
    renderer.setRenderTarget(this.sceneTarget);
    renderer.clear();
    this.copyQuad.render(renderer);

    if (maskActive) renderer.state.buffers.stencil.setTest(false);

    const highPassUniforms = this.highPassUniforms as Record<
      string,
      THREE.IUniform
    >;
    highPassUniforms.tDiffuse.value = readBuffer.texture;
    highPassUniforms.luminosityThreshold.value = this.threshold;
    highPassUniforms.smoothWidth.value = this.softness;
    this.fsQuad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);

    let inputRenderTarget = this.renderTargetBright;
    for (let index = 0; index < this.nMips; index += 1) {
      const blurMaterial = this.separableBlurMaterials[index];
      const horizontalTarget = this.renderTargetsHorizontal[index];
      const verticalTarget = this.renderTargetsVertical[index];
      if (!blurMaterial || !horizontalTarget || !verticalTarget) continue;

      this.fsQuad.material = blurMaterial;
      blurMaterial.uniforms.colorTexture.value = inputRenderTarget.texture;
      blurMaterial.uniforms.direction.value = bloomDirections.BlurDirectionX;
      renderer.setRenderTarget(horizontalTarget);
      renderer.clear();
      this.fsQuad.render(renderer);

      blurMaterial.uniforms.colorTexture.value = horizontalTarget.texture;
      blurMaterial.uniforms.direction.value = bloomDirections.BlurDirectionY;
      renderer.setRenderTarget(verticalTarget);
      renderer.clear();
      this.fsQuad.render(renderer);
      inputRenderTarget = verticalTarget;
    }

    this.fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0] ?? null);
    renderer.clear();
    this.fsQuad.render(renderer);

    if (maskActive) renderer.state.buffers.stencil.setTest(true);

    this.finalCompositeMaterial.uniforms.tScene.value = this.sceneTarget.texture;
    this.finalCompositeMaterial.uniforms.tBloom.value = this.renderTargetsHorizontal[0]?.texture;
    this.finalCompositeMaterial.uniforms.intensity.value = this.strength;
    this.finalCompositeMaterial.uniforms.bloomMix.value = this.mix;
    this.finalCompositeMaterial.uniforms.blendMode.value = this.blendMode;
    (this.finalCompositeMaterial.uniforms.tintColor.value as THREE.Color).set(this.tintColor);

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    renderer.clear();
    this.finalCompositeQuad.render(renderer);

    renderer.setClearColor(oldClearColor, oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }

  override setSize(width: number, height: number): void {
    super.setSize(width, height);
    this.sceneTarget.setSize(width, height);
  }

  override dispose(): void {
    super.dispose();
    this.sceneTarget.dispose();
    this.copyMaterial.dispose();
    this.copyQuad.dispose();
    this.finalCompositeMaterial.dispose();
    this.finalCompositeQuad.dispose();
  }
}
