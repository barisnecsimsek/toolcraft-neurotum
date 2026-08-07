import type { FrozenPreparedModel } from "./frozen-model";
import type { FrozenSceneSettings } from "./frozen-values";

export type FrozenBoundary = Readonly<{
  frontY: number;
  halfBand: number;
  noiseAmplitude: number;
}>;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const normalized = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

export function getFrozenBoundary(
  model: Pick<FrozenPreparedModel, "bounds">,
  settings: Pick<FrozenSceneSettings, "mask">,
): FrozenBoundary {
  const span = Math.max(0.001, model.bounds.maxY - model.bounds.minY);
  const halfBand = Math.max(0.002, settings.mask.transition * span * 0.5);
  const noiseAmplitude = settings.mask.turbulence * span;
  const top = model.bounds.maxY + halfBand + noiseAmplitude * 0.5;
  const bottom = model.bounds.minY - halfBand - noiseAmplitude * 0.5;
  return {
    frontY: top + (bottom - top) * settings.mask.progress,
    halfBand,
    noiseAmplitude,
  };
}

export function getRetainedIceMaskAtHeight(
  height: number,
  normalizedNoise: number,
  boundary: FrozenBoundary,
): number {
  const disturbedHeight =
    height + (Math.min(1, Math.max(0, normalizedNoise)) - 0.5) * boundary.noiseAmplitude;
  return (
    1 -
    smoothstep(
      boundary.frontY - boundary.halfBand,
      boundary.frontY + boundary.halfBand,
      disturbedHeight,
    )
  );
}
