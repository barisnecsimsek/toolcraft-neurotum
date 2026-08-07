import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export const frozenEnvironmentAssetUrl = new URL(
  "./assets/delta_2_1k.hdr",
  import.meta.url,
).href;

export type FrozenEnvironmentResource = Readonly<{
  renderTarget: THREE.WebGLRenderTarget;
  source: "Poly Haven Delta 2";
  texture: THREE.Texture;
}>;

export async function loadFrozenEnvironment(
  renderer: THREE.WebGLRenderer,
): Promise<FrozenEnvironmentResource> {
  const sourceTexture = await new HDRLoader().loadAsync(frozenEnvironmentAssetUrl);
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    generator.compileEquirectangularShader();
    const renderTarget = generator.fromEquirectangular(sourceTexture);
    return {
      renderTarget,
      source: "Poly Haven Delta 2",
      texture: renderTarget.texture,
    };
  } finally {
    sourceTexture.dispose();
    generator.dispose();
  }
}

export function disposeFrozenEnvironment(
  environment: FrozenEnvironmentResource,
): void {
  environment.renderTarget.dispose();
}
