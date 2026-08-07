import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { disposeEffectsModel, loadEffectsModel } from "./model-loader";
import { MODEL_SIZE, SCENE_PROFILE } from "./scene-profile";

describe("base scene profile", () => {
  it("keeps the custom camera, environment, and light profile", () => {
    expect(SCENE_PROFILE.camera).toEqual({
      far: 200,
      fov: 18,
      near: 0.1,
      position: [0, 0.12, 20.5],
    });
    expect(SCENE_PROFILE.environment).toEqual({
      intensity: 1.1,
    });
    expect(SCENE_PROFILE.directionalLight.position).toEqual([-3.2, 7.5, 5.8]);
    expect(SCENE_PROFILE.directionalLight.intensity).toBe(1.15);
  });

  it("builds the built-in ring from custom geometry and physical material", async () => {
    const { model, source } = await loadEffectsModel();

    try {
      const mesh = model.getObjectByProperty("type", "Mesh");
      expect(source).toBe("default");
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      if (!(mesh instanceof THREE.Mesh)) return;

      const geometry = mesh.geometry as THREE.TorusGeometry;
      expect(geometry.parameters).toMatchObject({
        arc: Math.PI * 2,
        radialSegments: 48,
        radius: 1.45,
        tubularSegments: 128,
        tube: 0.52,
      });
      expect(geometry.attributes.normal).toBeDefined();
      expect(mesh.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
      expect(mesh.castShadow).toBe(true);
      expect(mesh.receiveShadow).toBe(true);

      expect(mesh.material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      expect(material.clearcoat).toBe(0.18);
      expect(material.clearcoatRoughness).toBe(0.3);
      expect(material.color.getHex()).toBe(0xf6f8ff);
      expect(material.metalness).toBe(0.92);
      expect(material.roughness).toBe(0.48);
      expect(material.envMapIntensity).toBe(1.1);
      expect(material.side).toBe(THREE.DoubleSide);

      const size = new THREE.Box3()
        .setFromObject(model)
        .getSize(new THREE.Vector3());
      expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(MODEL_SIZE, 5);
    } finally {
      disposeEffectsModel(model);
    }
  });
});
