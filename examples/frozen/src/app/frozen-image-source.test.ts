import * as THREE from "three";
import { expect, test } from "vitest";

import {
  createToolcraftState,
  type ToolcraftInitialState,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import {
  createFrozenImageCardGeometry,
  createFrozenImageModel,
  getFrozenImageSlabGeometry,
  getFrozenSourceImageSize,
} from "./frozen/frozen-image-model";
import {
  getFrozenImageIcicleProfile,
  getFrozenIcicleDirectionMode,
  isFrozenIcicleSampleEligible,
  setFrozenIcicleDirection,
} from "./frozen/frozen-instances";
import { augmentFrozenSourceMaterials } from "./frozen/frozen-material";
import {
  disposeFrozenModel,
  prepareFrozenObject,
} from "./frozen/frozen-model";
import {
  getFrozenImageGeometrySettings,
  getFrozenSourceMode,
} from "./frozen/frozen-values";

function stateWith(
  values: Readonly<Record<string, unknown>> = {},
  initial: ToolcraftInitialState = {},
): ToolcraftState {
  const state = createToolcraftState(appSchema, initial);
  return { ...state, values: { ...state.values, ...values } };
}

function findControl(target: string) {
  return appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((control) => control.target === target);
}

test("source mode switches between 3D and image geometry", () => {
  expect(getFrozenSourceMode(stateWith())).toBe("model");
  expect(getFrozenSourceMode(stateWith({ "source.mode": "image" }))).toBe(
    "image",
  );
  expect(findControl("source.mode")).toMatchObject({
    options: [
      expect.objectContaining({ value: "model" }),
      expect.objectContaining({ value: "image" }),
    ],
  });
});

test("source image upload transforms clear and reset drive volumetric geometry", () => {
  const imageControl = findControl("source.image");
  expect(imageControl).toMatchObject({
    assetKind: "image",
    type: "fileDrop",
    visibleWhen: { equals: "image", target: "source.mode" },
  });
  expect(String(imageControl?.accept)).toContain("image/png");
  expect(String(imageControl?.accept)).toContain("image/jpeg");
  expect(getFrozenSourceImageSize(4096, 2048)).toEqual({
    height: 1024,
    width: 2048,
  });
  expect(
    getFrozenImageSlabGeometry(200, 100, {
      bevel: 1,
      cornerRadius: 1,
      thickness: 1,
    }),
  ).toMatchObject({
    aspect: 2,
    bevel: 1,
    cornerRoundness: 1,
    thickness: 1,
    width: 2,
    height: 1,
  });
});

test("source.imageThickness changes frozen product output", () => {
  const thin = getFrozenImageSlabGeometry(
    200,
    100,
    getFrozenImageGeometrySettings(stateWith({ "source.imageThickness": 1 })),
  );
  const thick = getFrozenImageSlabGeometry(
    200,
    100,
    getFrozenImageGeometrySettings(stateWith({ "source.imageThickness": 100 })),
  );
  expect(thick.depth).toBeGreaterThan(thin.depth * 10);
});

test("source.imageBevel changes frozen product output", () => {
  const square = getFrozenImageSlabGeometry(100, 100, {
    bevel: 1,
    cornerRadius: 0.2,
    thickness: 0.2,
  });
  expect(square.bevelRadius).toBeGreaterThan(0);
  expect(square.bevelRadius).toBeLessThan(square.depth / 2);
  expect(
    getFrozenImageSlabGeometry(100, 100, {
      bevel: 0,
      cornerRadius: 0.2,
      thickness: 0.2,
    })
      .bevelRadius,
  ).toBe(0);
});

test("source.imageCornerRadius changes image and slab silhouette together", () => {
  const square = getFrozenImageSlabGeometry(200, 100, {
    bevel: 0,
    cornerRadius: 0,
    thickness: 0.01,
  });
  const rounded = getFrozenImageSlabGeometry(200, 100, {
    bevel: 0,
    cornerRadius: 1,
    thickness: 0.01,
  });
  expect(square.cornerRadius).toBe(0);
  expect(rounded.cornerRadius).toBeCloseTo(0.4975);
  expect(rounded.cornerRadius).toBeGreaterThan(rounded.depth * 10);

  const geometry = createFrozenImageCardGeometry(rounded);
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(rounded.width);
  expect(size.y).toBeCloseTo(rounded.height);
  expect(size.z).toBeCloseTo(rounded.depth);
  expect(new Set(geometry.groups.map((group) => group.materialIndex))).toEqual(
    new Set([0, 1]),
  );
  const positions = geometry.getAttribute("position");
  let hasSquareCorner = false;
  for (let index = 0; index < positions.count; index += 1) {
    if (
      Math.abs(positions.getX(index)) > rounded.width * 0.49 &&
      Math.abs(positions.getY(index)) > rounded.height * 0.49
    ) {
      hasSquareCorner = true;
      break;
    }
  }
  expect(hasSquareCorner).toBe(false);
  const uv = geometry.getAttribute("uv");
  expect(Math.min(...Array.from(uv.array))).toBeGreaterThanOrEqual(0);
  expect(Math.max(...Array.from(uv.array))).toBeLessThanOrEqual(1);
  geometry.dispose();

  expect(
    getFrozenImageGeometrySettings(
      stateWith({ "source.imageCornerRadius": 100 }),
    ).cornerRadius,
  ).toBe(1);
});

test("image card preserves source colors independently from scene lighting", () => {
  const texture = new THREE.Texture();
  const prepared = createFrozenImageModel(
    {
      height: 64,
      sourceId: "unlit-image-fixture",
      sourceLabel: "unlit-image-fixture.png",
      texture,
      width: 128,
    },
    { bevel: 0.2, cornerRadius: 0.2, thickness: 0.2 },
  );
  const sourceMaterials: THREE.Material[] = [];
  prepared.object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    sourceMaterials.push(
      ...materials.filter(
        (material) =>
          "map" in material &&
          (material as THREE.MeshBasicMaterial).map === texture,
      ),
    );
  });

  expect(sourceMaterials).toHaveLength(1);
  const tintedSourceMaterials = augmentFrozenSourceMaterials(prepared.object);
  for (const material of sourceMaterials) {
    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(material.toneMapped).toBe(false);
    expect(material.userData.frozenPreserveSourceColor).toBe(true);
    expect(tintedSourceMaterials).not.toContain(material);
  }

  disposeFrozenModel(prepared);
  texture.dispose();
});

test("image source icicles bend toward gravity while 3D stays gravity-aligned", () => {
  expect(getFrozenIcicleDirectionMode("image")).toBe("gravity-bent");
  expect(getFrozenIcicleDirectionMode("model")).toBe("gravity");
  expect(isFrozenIcicleSampleEligible("image", 0, 0.28)).toBe(true);
  expect(isFrozenIcicleSampleEligible("image", 0.5, 0.28)).toBe(false);
  expect(isFrozenIcicleSampleEligible("model", 0, 0.28)).toBe(false);
  expect(isFrozenIcicleSampleEligible("model", -0.5, 0.28)).toBe(true);

  const direction = new THREE.Vector3();
  setFrozenIcicleDirection(direction, "image", new THREE.Vector3(0, 0, 4));
  expect(direction.toArray()).toEqual([0, -1, 0]);
  setFrozenIcicleDirection(direction, "model", new THREE.Vector3(0, 0, 1));
  expect(direction.toArray()).toEqual([0, -1, 0]);

  const bounds = { maxY: 1, minY: -1 };
  expect(
    getFrozenImageIcicleProfile({
      bounds,
      normalY: -1,
      positionY: -0.9,
      sampleIndex: 0,
    }),
  ).toEqual({ bend: 0, eligible: true, lengthScale: 1, region: "hanging" });
  expect(
    getFrozenImageIcicleProfile({
      bounds,
      normalY: 1,
      positionY: -0.9,
      sampleIndex: 0,
    }),
  ).toEqual({ bend: 0, eligible: false, lengthScale: 0, region: "upward" });
  const lowerWall = Array.from({ length: 128 }, (_, sampleIndex) =>
    getFrozenImageIcicleProfile({
      bounds,
      normalY: 0,
      positionY: -0.8,
      sampleIndex,
    }),
  ).find((profile) => profile.eligible);
  expect(lowerWall).toMatchObject({ region: "wall" });
  expect(lowerWall?.bend).toBeGreaterThan(0.5);
  expect(lowerWall?.lengthScale).toBeGreaterThan(0.15);
  expect(lowerWall?.lengthScale).toBeLessThan(0.55);
  expect(
    Array.from({ length: 128 }, (_, sampleIndex) =>
      getFrozenImageIcicleProfile({
        bounds,
        normalY: 0,
        positionY: 0.8,
        sampleIndex,
      }),
    ).every((profile) => !profile.eligible),
  ).toBe(true);

  const source = new THREE.Group();
  source.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 0.2),
      new THREE.MeshStandardMaterial(),
    ),
  );
  const prepared = prepareFrozenObject(source, {
    imageGeometry: {
      aspect: 2,
      bevel: 0,
      bevelRadius: 0,
      cornerRadius: 0,
      cornerRoundness: 0,
      depth: 0.2,
      thickness: 0.2,
    },
    seed: "normal-aligned-image-fixture",
    sourceId: "normal-aligned-image-fixture",
    sourceKind: "image",
    sourceLabel: "normal-aligned-image-fixture.png",
  });
  const sampledNormals = Array.from(prepared.icicleSamples.normals);
  const downwardShare = sampledNormals.filter(
    (value, index) => index % 3 === 1 && value < -0.45,
  ).length / (sampledNormals.length / 3);
  expect(downwardShare).toBeGreaterThan(0.6);
  expect(sampledNormals.some((value, index) => index % 3 === 2 && value > 0.9)).toBe(
    true,
  );
  disposeFrozenModel(prepared);
});
