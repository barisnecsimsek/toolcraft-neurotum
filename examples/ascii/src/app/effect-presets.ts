export type DuotonePreset = {
  ink: string;
  label: string;
  paper: string;
  value: string;
};

export const duotonePresets = [
  { ink: "#000000", label: "Monochrome", paper: "#FFFFFF", value: "monochrome" },
  { ink: "#2F58D8", label: "Aurora", paper: "#FFD9C7", value: "aurora" },
  { ink: "#114C4F", label: "Fjord", paper: "#D7F4EC", value: "fjord" },
  { ink: "#19213F", label: "Paper Moon", paper: "#F4EFE6", value: "paper-moon" },
  { ink: "#6B102F", label: "Rosette", paper: "#FFF0C7", value: "rosette" },
  { ink: "#FFFFFF", label: "Deep Sea", paper: "#1A3A6E", value: "deep-sea" },
  { ink: "#0047AB", label: "Riviera", paper: "#F8E6A0", value: "riviera" },
  { ink: "#5A31F4", label: "Prism", paper: "#D6FFEF", value: "prism" },
  { ink: "#E0E0FF", label: "Nocturne", paper: "#0A0A2E", value: "nocturne" },
  { ink: "#2B2D42", label: "Carbon", paper: "#FFB4A2", value: "carbon" },
  { ink: "#095256", label: "Tidepool", paper: "#F7C59F", value: "tidepool" },
  { ink: "#7B2D26", label: "Terra", paper: "#F8F0D8", value: "terra" },
  { ink: "#3A0CA3", label: "Voltage", paper: "#BDE0FE", value: "voltage" },
  { ink: "#213D35", label: "Lichen", paper: "#C7F464", value: "lichen" },
  { ink: "#7F4F24", label: "Saffron", paper: "#FFF3B0", value: "saffron" },
  { ink: "#293241", label: "Beacon", paper: "#EE6C4D", value: "beacon" },
  { ink: "#1B4332", label: "Grove", paper: "#B7E4C7", value: "grove" },
  { ink: "#14213D", label: "Eclipse", paper: "#FCA311", value: "eclipse" },
] as const satisfies readonly DuotonePreset[];

export const duotonePresetOptions = [
  { label: "Manual", value: "manual" },
  ...duotonePresets.map(({ label, value }) => ({ label, value })),
] as const;

export function resolveDuotoneColors({
  ink,
  paper,
  preset,
}: {
  ink: string;
  paper: string;
  preset: string;
}): { ink: string; paper: string } {
  const selectedPreset = duotonePresets.find((item) => item.value === preset);

  return selectedPreset
    ? { ink: selectedPreset.ink, paper: selectedPreset.paper }
    : { ink, paper };
}

export const stylizedEffectOptions = [
  { label: "None", value: "none" },
  { label: "Pixelate", value: "pixelate" },
  { label: "Dither", value: "dither" },
  { label: "ASCII", value: "ascii" },
  { label: "Halftone", value: "halftone" },
  { label: "Mosaic", value: "mosaic" },
  { label: "Bricks", value: "bricks" },
  { label: "Pointillism", value: "pointillism" },
  { label: "Heatmap", value: "heatmap" },
  { label: "Threshold", value: "threshold" },
  { label: "Duotone", value: "duotone" },
] as const;

export const colorModeOptions = [
  { label: "Source", value: "source" },
  { label: "Duotone", value: "duotone" },
] as const;

export const extendedColorModeOptions = [
  { label: "Duotone", value: "duotone" },
  { label: "Grayscale", value: "grayscale" },
  { label: "Source", value: "source" },
] as const;
