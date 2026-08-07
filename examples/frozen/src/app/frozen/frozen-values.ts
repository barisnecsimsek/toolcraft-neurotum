import type { ToolcraftState } from "@/toolcraft/runtime";
import {
  readToolcraftOrientationPose,
  type ToolcraftOrientationPose,
} from "@/toolcraft/runtime/react";

import { frozenDefaultSceneValues } from "./frozen-default-scene";
import type { FrozenImageGeometrySettings } from "./frozen-image-model";
import {
  frozenModelTriangleBudgetDefault,
  frozenModelTriangleBudgetMinimum,
  frozenSourceTriangleLimit,
} from "./frozen-model";

export type FrozenSourceMode = "image" | "model";
export type FrozenMeltRefreezeMode = "after-release" | "during-stroke";

export type FrozenSceneSettings = Readonly<{
  background: Readonly<{
    color: string;
    include: boolean;
  }>;
  crystals: Readonly<{
    density: number;
    elongation: number;
    size: number;
    variation: number;
  }>;
  icicles: Readonly<{
    density: number;
    length: number;
    radius: number;
    underside: number;
    variation: number;
  }>;
  lighting: Readonly<{
    environmentIntensity: number;
    environmentRotation: number;
    exposure: number;
  }>;
  mask: Readonly<{
    noiseScale: number;
    progress: number;
    transition: number;
    turbulence: number;
  }>;
  melt: Readonly<{
    enabled: boolean;
    heat: number;
    radius: number;
    refreeze: number;
    refreezeMode: FrozenMeltRefreezeMode;
    structure: number;
  }>;
  materialMask: Readonly<{
    coverage: number;
    distortion: number;
    scale: number;
    seed: number;
    softness: number;
  }>;
  scratch: Readonly<{
    bump: number;
    contrast: number;
    displacement: number;
    invert: boolean;
    offset: Readonly<{ x: number; y: number }>;
    rotation: number;
    roughness: number;
    scale: number;
  }>;
  sourceMaterial: Readonly<{
    exposure: number;
  }>;
  surface: Readonly<{
    color: string;
    ior: number;
    roughness: number;
    roughnessVariation: number;
    shellThickness: number;
    transmission: number;
  }>;
  viewport: Readonly<{
    height: number;
    orientation: ToolcraftOrientationPose;
    renderScale: number;
    width: number;
  }>;
}>;

function finiteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentage(
  value: unknown,
  fallback: number,
  maximum = 100,
): number {
  return clamp(finiteNumber(value, fallback) / 100, 0, maximum / 100);
}

function colorHex(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "hex" in value &&
    typeof value.hex === "string"
  ) {
    return value.hex;
  }
  return fallback;
}

function vectorValue(
  value: unknown,
  fallback: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
): Readonly<{ x: number; y: number }> {
  if (typeof value !== "object" || value === null) return fallback;
  const candidate = value as { x?: unknown; y?: unknown };
  return {
    x: clamp(finiteNumber(candidate.x, fallback.x), -1, 1),
    y: clamp(finiteNumber(candidate.y, fallback.y), -1, 1),
  };
}

export function getFrozenSourceMode(state: ToolcraftState): FrozenSourceMode {
  return state.values["source.mode"] === "image" ? "image" : "model";
}

export function shouldCoolFrozenMelt(
  mode: FrozenMeltRefreezeMode,
  pointerActive: boolean,
): boolean {
  return mode === "during-stroke" || !pointerActive;
}

export function getFrozenModelExposureMultiplier(exposure: number): number {
  return 2 ** clamp(exposure, -3, 3);
}

export function getFrozenModelTriangleBudget(state: ToolcraftState): number {
  return clamp(
    finiteNumber(
      state.values["source.modelTriangleBudget"],
      frozenModelTriangleBudgetDefault,
    ),
    frozenModelTriangleBudgetMinimum,
    frozenSourceTriangleLimit,
  );
}

export function getFrozenImageGeometrySettings(
  state: ToolcraftState,
): FrozenImageGeometrySettings {
  return {
    bevel: percentage(
      state.values["source.imageBevel"],
      frozenDefaultSceneValues["source.imageBevel"],
    ),
    cornerRadius: percentage(
      state.values["source.imageCornerRadius"],
      frozenDefaultSceneValues["source.imageCornerRadius"],
    ),
    thickness: clamp(
      finiteNumber(
        state.values["source.imageThickness"],
        frozenDefaultSceneValues["source.imageThickness"],
      ) / 100,
      0.01,
      1,
    ),
  };
}

export function getFrozenSceneSettings(state: ToolcraftState): FrozenSceneSettings {
  const values = state.values;
  return {
    background: {
      color: colorHex(
        values["scene.background"],
        frozenDefaultSceneValues["scene.background"],
      ),
      include:
        values["export.includeBackground"] === undefined
          ? frozenDefaultSceneValues["export.includeBackground"]
          : values["export.includeBackground"] !== false,
    },
    crystals: {
      density: percentage(
        values["ice.crystalDensity"],
        frozenDefaultSceneValues["ice.crystalDensity"],
      ),
      elongation: percentage(
        values["ice.crystalElongation"],
        frozenDefaultSceneValues["ice.crystalElongation"],
      ),
      size: percentage(
        values["ice.crystalSize"],
        frozenDefaultSceneValues["ice.crystalSize"],
      ),
      variation: percentage(
        values["ice.crystalVariation"],
        frozenDefaultSceneValues["ice.crystalVariation"],
      ),
    },
    icicles: {
      density: percentage(
        values["ice.icicleDensity"],
        frozenDefaultSceneValues["ice.icicleDensity"],
      ),
      length: percentage(
        values["ice.icicleLength"],
        frozenDefaultSceneValues["ice.icicleLength"],
      ),
      radius: percentage(
        values["ice.icicleRadius"],
        frozenDefaultSceneValues["ice.icicleRadius"],
      ),
      underside: percentage(
        values["ice.icicleUnderside"],
        frozenDefaultSceneValues["ice.icicleUnderside"],
        95,
      ),
      variation: percentage(
        values["ice.icicleVariation"],
        frozenDefaultSceneValues["ice.icicleVariation"],
      ),
    },
    lighting: {
      environmentIntensity: percentage(
        values["lighting.environmentIntensity"],
        frozenDefaultSceneValues["lighting.environmentIntensity"],
        300,
      ),
      environmentRotation:
        (clamp(
          finiteNumber(
            values["lighting.environmentRotation"],
            frozenDefaultSceneValues["lighting.environmentRotation"],
          ),
          -180,
          180,
        ) *
          Math.PI) /
        180,
      exposure: percentage(
        values["lighting.exposure"],
        frozenDefaultSceneValues["lighting.exposure"],
        200,
      ),
    },
    mask: {
      noiseScale: clamp(
        finiteNumber(
          values["effect.noiseScale"],
          frozenDefaultSceneValues["effect.noiseScale"],
        ),
        0.5,
        8,
      ),
      progress: percentage(
        values["effect.progress"],
        frozenDefaultSceneValues["effect.progress"],
      ),
      transition: clamp(
        finiteNumber(
          values["effect.transition"],
          frozenDefaultSceneValues["effect.transition"],
        ) / 100,
        0.01,
        0.3,
      ),
      turbulence: percentage(
        values["effect.turbulence"],
        frozenDefaultSceneValues["effect.turbulence"],
        40,
      ),
    },
    melt: {
      enabled:
        values["melt.enabled"] === undefined
          ? frozenDefaultSceneValues["melt.enabled"]
          : values["melt.enabled"] === true,
      heat: percentage(
        values["melt.heat"],
        frozenDefaultSceneValues["melt.heat"],
      ),
      radius: percentage(
        values["melt.radius"],
        frozenDefaultSceneValues["melt.radius"],
      ),
      refreeze: percentage(
        values["melt.refreeze"],
        frozenDefaultSceneValues["melt.refreeze"],
      ),
      refreezeMode:
        values["melt.refreezeMode"] === "during-stroke"
          ? "during-stroke"
          : "after-release",
      structure: percentage(
        values["melt.structure"],
        frozenDefaultSceneValues["melt.structure"],
      ),
    },
    materialMask: {
      coverage: percentage(
        values["ice.materialMaskCoverage"],
        frozenDefaultSceneValues["ice.materialMaskCoverage"],
      ),
      distortion: percentage(
        values["ice.materialMaskDistortion"],
        frozenDefaultSceneValues["ice.materialMaskDistortion"],
      ),
      scale: clamp(
        finiteNumber(
          values["ice.materialMaskScale"],
          frozenDefaultSceneValues["ice.materialMaskScale"],
        ),
        0.5,
        20,
      ),
      seed: clamp(
        finiteNumber(
          values["ice.materialMaskSeed"],
          frozenDefaultSceneValues["ice.materialMaskSeed"],
        ),
        0,
        100,
      ),
      softness: percentage(
        values["ice.materialMaskSoftness"],
        frozenDefaultSceneValues["ice.materialMaskSoftness"],
        50,
      ),
    },
    scratch: {
      bump: percentage(
        values["scratch.bump"],
        frozenDefaultSceneValues["scratch.bump"],
      ),
      contrast: percentage(
        values["scratch.contrast"],
        frozenDefaultSceneValues["scratch.contrast"],
        300,
      ),
      displacement: percentage(
        values["scratch.displacement"],
        frozenDefaultSceneValues["scratch.displacement"],
        20,
      ),
      invert:
        values["scratch.invert"] === undefined
          ? frozenDefaultSceneValues["scratch.invert"]
          : values["scratch.invert"] === true,
      offset: vectorValue(values["scratch.offset"], {
        x: Number(frozenDefaultSceneValues["scratch.offset"].x),
        y: Number(frozenDefaultSceneValues["scratch.offset"].y),
      }),
      rotation:
        (clamp(
          finiteNumber(
            values["scratch.rotation"],
            frozenDefaultSceneValues["scratch.rotation"],
          ),
          -180,
          180,
        ) *
          Math.PI) /
        180,
      roughness: percentage(
        values["scratch.roughness"],
        frozenDefaultSceneValues["scratch.roughness"],
      ),
      scale: clamp(
        finiteNumber(
          values["scratch.scale"],
          frozenDefaultSceneValues["scratch.scale"],
        ),
        1,
        100,
      ),
    },
    sourceMaterial: {
      exposure: clamp(
        finiteNumber(
          values["source.modelExposure"],
          frozenDefaultSceneValues["source.modelExposure"],
        ),
        -3,
        3,
      ),
    },
    surface: {
      color: colorHex(values["ice.color"], frozenDefaultSceneValues["ice.color"]),
      ior: clamp(
        finiteNumber(values["ice.ior"], frozenDefaultSceneValues["ice.ior"]),
        1,
        1.8,
      ),
      roughness: percentage(
        values["ice.roughness"],
        frozenDefaultSceneValues["ice.roughness"],
      ),
      roughnessVariation: percentage(
        values["ice.roughnessVariation"],
        frozenDefaultSceneValues["ice.roughnessVariation"],
      ),
      shellThickness: percentage(
        values["ice.shellThickness"],
        frozenDefaultSceneValues["ice.shellThickness"],
        12,
      ),
      transmission: percentage(
        values["ice.transmission"],
        frozenDefaultSceneValues["ice.transmission"],
      ),
    },
    viewport: {
      height: Math.max(1, Math.round(state.canvas.size.height)),
      orientation: readToolcraftOrientationPose(
        values["scene.orientation"],
        frozenDefaultSceneValues["scene.orientation"],
      ),
      renderScale: clamp(
        finiteNumber(
          values["canvas.renderScale"],
          frozenDefaultSceneValues["canvas.renderScale"],
        ),
        1,
        2,
      ),
      width: Math.max(1, Math.round(state.canvas.size.width)),
    },
  };
}

export function getFrozenSettingsToken(settings: FrozenSceneSettings): string {
  return JSON.stringify(settings);
}
