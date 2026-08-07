import * as THREE from "three";
import type { Pass } from "three/addons/postprocessing/Pass.js";

/**
 * Runs post passes from a stable external render target. Unlike EffectComposer,
 * the input is never copied into or swapped with the two post targets.
 */
export class ExternalTextureComposer {
  private readonly clock = new THREE.Clock();
  private readonly passes: Pass[] = [];
  private readonly postTargetA: THREE.WebGLRenderTarget;
  private readonly postTargetB: THREE.WebGLRenderTarget;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly inputTarget: THREE.WebGLRenderTarget,
  ) {
    this.postTargetA = this.createPostTarget("EffectsPost.a");
    this.postTargetB = this.createPostTarget("EffectsPost.b");
  }

  private createPostTarget(name: string): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      format: THREE.RGBAFormat,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
    });
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    target.texture.name = name;
    return target;
  }

  addPass(pass: Pass): void {
    this.passes.push(pass);
    pass.setSize(this.width * this.pixelRatio, this.height * this.pixelRatio);
  }

  setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeTargetsAndPasses();
  }

  private resizeTargetsAndPasses(): void {
    const physicalWidth = Math.max(1, Math.round(this.width * this.pixelRatio));
    const physicalHeight = Math.max(1, Math.round(this.height * this.pixelRatio));
    this.postTargetA.setSize(physicalWidth, physicalHeight);
    this.postTargetB.setSize(physicalWidth, physicalHeight);
    for (const pass of this.passes) pass.setSize(physicalWidth, physicalHeight);
  }

  render(deltaTime = this.clock.getDelta()): void {
    const enabledPasses = this.passes.filter((pass) => pass.enabled);
    if (enabledPasses.length === 0) return;

    const previousTarget = this.renderer.getRenderTarget();
    let readBuffer = this.inputTarget;
    let writeBuffer = this.postTargetA;

    for (let index = 0; index < enabledPasses.length; index += 1) {
      const pass = enabledPasses[index];
      if (!pass) continue;

      const isLast = index === enabledPasses.length - 1;
      pass.renderToScreen = isLast;
      pass.render(this.renderer, writeBuffer, readBuffer, deltaTime, false);

      if (pass.needsSwap && !isLast) {
        readBuffer = writeBuffer;
        writeBuffer = writeBuffer === this.postTargetA
          ? this.postTargetB
          : this.postTargetA;
      }
    }

    this.renderer.setRenderTarget(previousTarget);
  }

  dispose(): void {
    this.postTargetA.dispose();
    this.postTargetB.dispose();
  }
}
