import { unzip } from "fflate";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

type FrozenPackageEntry = Readonly<{
  bytes: Uint8Array;
  path: string;
}>;

export type FrozenImportedModel = Readonly<{
  extension: "glb" | "gltf" | "obj" | "stl";
  object: THREE.Object3D;
  resourceUrls: readonly string[];
  usesSourceMaterials: boolean;
}>;

const modelPreference = ["glb", "gltf", "obj", "stl"] as const;

function extension(path: string): string {
  return /\.([a-z0-9]+)$/iu.exec(path)?.[1]?.toLowerCase() ?? "";
}

function normalizePath(path: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  })();
  const segments: string[] = [];
  for (const segment of decoded.replaceAll("\\", "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return segments.join("/");
}

function directory(path: string): string {
  const normalized = normalizePath(path);
  const separator = normalized.lastIndexOf("/");
  return separator < 0 ? "" : `${normalized.slice(0, separator + 1)}`;
}

function basename(path: string): string {
  return normalizePath(path).split("/").at(-1) ?? "";
}

function mimeType(path: string): string {
  switch (extension(path)) {
    case "bin":
    case "glb":
      return "application/octet-stream";
    case "gif":
      return "image/gif";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "ktx2":
      return "image/ktx2";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function readAsset(asset: ToolcraftMediaAsset): Promise<ArrayBuffer> {
  const response = await fetch(asset.dataUrl);
  if (!response.ok && !/^(?:blob|data):/u.test(asset.dataUrl)) {
    throw new Error(`Could not read ${asset.fileName}.`);
  }
  return response.arrayBuffer();
}

function unzipEntries(buffer: ArrayBuffer): Promise<FrozenPackageEntry[]> {
  return new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (error, files) => {
      if (error) {
        reject(new Error(`Could not unpack the model ZIP: ${error.message}`));
        return;
      }
      resolve(
        Object.entries(files)
          .filter(([path]) => !path.endsWith("/"))
          .map(([path, bytes]) => ({ bytes, path: normalizePath(path) })),
      );
    });
  });
}

export function selectFrozenPackageModelPath(
  paths: readonly string[],
): string | null {
  for (const preferredExtension of modelPreference) {
    const match = paths
      .map(normalizePath)
      .filter((path) => extension(path) === preferredExtension)
      .sort((first, second) => first.localeCompare(second))[0];
    if (match) return match;
  }
  return null;
}

export function resolveFrozenPackageResourcePath(
  request: string,
  primaryPath: string,
  paths: readonly string[],
): string | null {
  if (/^(?:blob|data|https?):/iu.test(request)) return request;
  const normalizedPaths = paths.map(normalizePath);
  const requestPath = normalizePath(request.split(/[?#]/u, 1)[0]);
  const direct = normalizedPaths.find((path) => path === requestPath);
  if (direct) return direct;
  const relative = normalizePath(`${directory(primaryPath)}${requestPath}`);
  const relativeMatch = normalizedPaths.find((path) => path === relative);
  if (relativeMatch) return relativeMatch;
  const requestedBase = basename(requestPath).toLowerCase();
  const basenameMatches = normalizedPaths.filter(
    (path) => basename(path).toLowerCase() === requestedBase,
  );
  return basenameMatches.length === 1 ? basenameMatches[0] : null;
}

function parseGltf(
  data: ArrayBuffer | string,
  manager: THREE.LoadingManager,
  resourcePath: string,
): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    new GLTFLoader(manager).parse(
      data,
      resourcePath,
      (gltf) => resolve(gltf.scene),
      reject,
    );
  });
}

function parseStl(bytes: Uint8Array): THREE.Object3D {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new STLLoader().parse(arrayBuffer(bytes))));
  return group;
}

function findObjMaterialPath(
  objText: string,
  objPath: string,
  paths: readonly string[],
): string | null {
  const declared = /^\s*mtllib\s+(.+)$/imu.exec(objText)?.[1]?.trim();
  if (declared) {
    const resolved = resolveFrozenPackageResourcePath(declared, objPath, paths);
    if (resolved && extension(resolved) === "mtl") return resolved;
  }
  return paths.find((path) => extension(path) === "mtl") ?? null;
}

async function parsePackage(entries: readonly FrozenPackageEntry[]): Promise<FrozenImportedModel> {
  const paths = entries.map((entry) => entry.path);
  const primaryPath = selectFrozenPackageModelPath(paths);
  if (!primaryPath) {
    if (paths.some((path) => extension(path) === "blend")) {
      throw new Error(
        "Blender .blend files cannot run in the browser. Export a GLB with embedded textures, then upload that GLB or a ZIP package.",
      );
    }
    throw new Error(
      "The ZIP has no supported model. Include a GLB, glTF, OBJ + MTL, or STL.",
    );
  }
  const primary = entries.find((entry) => entry.path === primaryPath);
  if (!primary) throw new Error("The selected package model is missing.");

  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const resourceUrls = new Map<string, string>();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((request) => {
    const resolved = resolveFrozenPackageResourcePath(request, primaryPath, paths);
    if (!resolved || /^(?:blob|data|https?):/iu.test(resolved)) return request;
    const entry = entriesByPath.get(resolved);
    if (!entry) return request;
    const existing = resourceUrls.get(resolved);
    if (existing) return existing;
    const url = URL.createObjectURL(
      new Blob([arrayBuffer(entry.bytes)], { type: mimeType(resolved) }),
    );
    resourceUrls.set(resolved, url);
    return url;
  });

  try {
    const primaryExtension = extension(primaryPath) as FrozenImportedModel["extension"];
    if (primaryExtension === "glb") {
    return {
      extension: primaryExtension,
      object: await parseGltf(arrayBuffer(primary.bytes), manager, directory(primaryPath)),
      resourceUrls: [...resourceUrls.values()],
      usesSourceMaterials: true,
    };
  }
  if (primaryExtension === "gltf") {
    return {
      extension: primaryExtension,
      object: await parseGltf(text(primary.bytes), manager, directory(primaryPath)),
      resourceUrls: [...resourceUrls.values()],
      usesSourceMaterials: true,
    };
  }
  if (primaryExtension === "stl") {
    return {
      extension: primaryExtension,
      object: parseStl(primary.bytes),
      resourceUrls: [],
      usesSourceMaterials: false,
    };
  }

  const objText = text(primary.bytes);
  const materialPath = findObjMaterialPath(objText, primaryPath, paths);
  const loader = new OBJLoader(manager);
  if (materialPath) {
    const materialEntry = entriesByPath.get(materialPath);
    if (materialEntry) {
      const materials = new MTLLoader(manager).parse(
        text(materialEntry.bytes),
        directory(materialPath),
      );
      materials.preload();
      loader.setMaterials(materials);
    }
  }
    return {
      extension: "obj",
      object: loader.parse(objText),
      resourceUrls: [...resourceUrls.values()],
      usesSourceMaterials: Boolean(materialPath),
    };
  } catch (error) {
    resourceUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

export async function importFrozenModel(
  asset: ToolcraftMediaAsset,
): Promise<FrozenImportedModel> {
  const assetExtension = extension(asset.fileName);
  const buffer = await readAsset(asset);
  if (assetExtension === "zip") return parsePackage(await unzipEntries(buffer));
  if (assetExtension === "glb") {
    return {
      extension: "glb",
      object: await parseGltf(buffer, new THREE.LoadingManager(), ""),
      resourceUrls: [],
      usesSourceMaterials: true,
    };
  }
  if (assetExtension === "obj") {
    return {
      extension: "obj",
      object: new OBJLoader().parse(new TextDecoder().decode(buffer)),
      resourceUrls: [],
      usesSourceMaterials: false,
    };
  }
  if (assetExtension === "stl") {
    return {
      extension: "stl",
      object: parseStl(new Uint8Array(buffer)),
      resourceUrls: [],
      usesSourceMaterials: false,
    };
  }
  if (assetExtension === "blend") {
    throw new Error(
      "Blender .blend files cannot run in the browser. Export a GLB with embedded textures first.",
    );
  }
  throw new Error(
    `Unsupported model format for ${asset.fileName}. Use GLB, OBJ, STL, or ZIP.`,
  );
}
