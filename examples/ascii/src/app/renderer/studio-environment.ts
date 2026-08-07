import * as THREE from "three";

export type ProceduralStudioEnvironment = {
  dispose: () => void;
  texture: THREE.Texture;
};

type LightPanel = {
  color: THREE.ColorRepresentation;
  intensity: number;
  position: readonly [number, number, number];
  size: readonly [number, number];
};

const lightPanels: readonly LightPanel[] = [
  {
    color: 0xf8fbff,
    intensity: 4.6,
    position: [-6.5, 4.5, 6],
    size: [7, 10],
  },
  {
    color: 0xffd6ad,
    intensity: 2.8,
    position: [5.5, 0.5, 5],
    size: [4.5, 8],
  },
  {
    color: 0x7593ff,
    intensity: 2.4,
    position: [-4, -0.5, -6],
    size: [3, 9],
  },
  {
    color: 0xffffff,
    intensity: 3.4,
    position: [4, 5.5, -5.5],
    size: [8, 3],
  },
  {
    color: 0xdde9ff,
    intensity: 2.5,
    position: [0, 7.5, 1],
    size: [6, 4],
  },
  {
    color: 0xffecd9,
    intensity: 1.4,
    position: [0, -5.5, 0],
    size: [9, 9],
  },
] as const;

export function createProceduralStudioEnvironment(
  renderer: THREE.WebGLRenderer,
): ProceduralStudioEnvironment {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080d);

  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  const panelMaterials: THREE.MeshBasicMaterial[] = [];

  for (const panel of lightPanels) {
    const color = new THREE.Color(panel.color).multiplyScalar(panel.intensity);
    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(panelGeometry, material);
    mesh.position.set(...panel.position);
    mesh.scale.set(panel.size[0], panel.size[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    panelMaterials.push(material);
  }

  const generator = new THREE.PMREMGenerator(renderer);
  const renderTarget = generator.fromScene(scene, 0.04, 0.1, 100);
  renderTarget.texture.name = "MeshFX.ProceduralStudio";

  generator.dispose();
  panelGeometry.dispose();
  for (const material of panelMaterials) material.dispose();

  return {
    dispose: () => renderTarget.dispose(),
    texture: renderTarget.texture,
  };
}
