import { zipSync } from "fflate";
import * as THREE from "three";
import { expect, test } from "vitest";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import {
  importFrozenModel,
  resolveFrozenPackageResourcePath,
  selectFrozenPackageModelPath,
} from "./frozen-model-import";

function zipAsset(files: Record<string, Uint8Array>): ToolcraftMediaAsset {
  const archive = zipSync(files);
  return {
    assetKind: "file",
    dataUrl: `data:application/zip;base64,${Buffer.from(archive).toString("base64")}`,
    fileName: "textured-model.zip",
    id: "textured-model",
    layerId: "textured-model-layer",
    mimeType: "application/zip",
    position: { x: 0, y: 0 },
    sourceTarget: "source.model",
  };
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material.dispose());
  });
}

test("package model selection prefers GLB and resolves relative texture paths", () => {
  const paths = [
    "bundle/model/model.obj",
    "bundle/model/model.mtl",
    "bundle/textures/ice normal.png",
    "bundle/model/model.glb",
  ];
  expect(selectFrozenPackageModelPath(paths)).toBe("bundle/model/model.glb");
  expect(
    resolveFrozenPackageResourcePath(
      "../textures/ice%20normal.png",
      "bundle/model/model.obj",
      paths,
    ),
  ).toBe("bundle/textures/ice normal.png");
});

test("ZIP OBJ and MTL preserve packaged source material", async () => {
  const encoder = new TextEncoder();
  const imported = await importFrozenModel(
    zipAsset({
      "model/model.mtl": encoder.encode(
        ["newmtl skin", "Kd 0.12 0.38 0.72", "Ns 120"].join("\n"),
      ),
      "model/model.obj": encoder.encode(
        [
          "mtllib model.mtl",
          "o triangle",
          "v 0 0 0",
          "v 1 0 0",
          "v 0 1 0",
          "vt 0 0",
          "vt 1 0",
          "vt 0 1",
          "vn 0 0 1",
          "usemtl skin",
          "f 1/1/1 2/2/1 3/3/1",
        ].join("\n"),
      ),
    }),
  );
  try {
    expect(imported.extension).toBe("obj");
    expect(imported.usesSourceMaterials).toBe(true);
    const mesh = imported.object.getObjectByProperty("isMesh", true) as THREE.Mesh;
    const material = (Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material) as THREE.MeshPhongMaterial;
    expect(material.color.getHexString()).toBe("1f61b8");
  } finally {
    imported.resourceUrls.forEach((url) => URL.revokeObjectURL(url));
    disposeObject(imported.object);
  }
});

test("ZIP containing only Blend gives a portable GLB instruction", async () => {
  await expect(
    importFrozenModel(
      zipAsset({ "source/model.blend": new Uint8Array([66, 76, 69, 78, 68]) }),
    ),
  ).rejects.toThrow("Export a GLB with embedded textures");
});

