import type { ToolcraftMediaAsset, ToolcraftState } from "@/toolcraft/runtime";

export type LiquidMetalEnvironmentPreset =
  | "chrome"
  | "custom"
  | "neutral"
  | "product"
  | "rim"
  | "softbox"
  | "studio"
  | "warm";

export type LiquidMetalEnvironmentSettings = {
  asset: ToolcraftMediaAsset | null;
  intensity: number;
  preset: LiquidMetalEnvironmentPreset;
  rotationDegrees: number;
  sourceKey: string;
};

const environmentTarget = "media.environment";

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asEnvironmentPreset(value: unknown): LiquidMetalEnvironmentPreset {
  return value === "chrome" ||
    value === "custom" ||
    value === "neutral" ||
    value === "product" ||
    value === "rim" ||
    value === "softbox" ||
    value === "warm"
    ? value
    : "studio";
}

export function getLiquidMetalEnvironmentExtension(
  asset: Pick<ToolcraftMediaAsset, "fileName">,
): string {
  return /\.([a-z0-9]+)$/iu.exec(asset.fileName)?.[1]?.toLowerCase() ?? "";
}

export function getLiquidMetalEnvironmentSettings(
  state: ToolcraftState,
): LiquidMetalEnvironmentSettings {
  const preset = asEnvironmentPreset(
    state.values["lighting.environmentPreset"],
  );
  const asset =
    state.mediaAssets.find(
      (candidate) => candidate.sourceTarget === environmentTarget,
    ) ?? null;
  const intensity = Math.max(
    0,
    Math.min(3, asNumber(state.values["lighting.environmentIntensity"], 1.35)),
  );
  const rotationDegrees =
    ((asNumber(state.values["lighting.environmentRotation"], 0) % 360) + 360) %
    360;
  const activeAsset = preset === "custom" ? asset : null;
  const sourceKey = activeAsset
    ? `custom:${activeAsset.id}:${activeAsset.fileName}`
    : preset === "custom"
      ? "preset:studio:custom-fallback"
      : `preset:${preset}`;

  return {
    asset: activeAsset,
    intensity,
    preset,
    rotationDegrees,
    sourceKey,
  };
}
