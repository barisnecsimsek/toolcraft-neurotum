import { describe, expect, it } from "vitest";

import {
  duotonePresetOptions,
  duotonePresets,
  resolveDuotoneColors,
} from "./effect-presets";

describe("duotone presets", () => {
  it("exposes the product-owned preset names and ids in display order", () => {
    expect(duotonePresetOptions).toEqual([
      { label: "Manual", value: "manual" },
      { label: "Monochrome", value: "monochrome" },
      { label: "Aurora", value: "aurora" },
      { label: "Fjord", value: "fjord" },
      { label: "Paper Moon", value: "paper-moon" },
      { label: "Rosette", value: "rosette" },
      { label: "Deep Sea", value: "deep-sea" },
      { label: "Riviera", value: "riviera" },
      { label: "Prism", value: "prism" },
      { label: "Nocturne", value: "nocturne" },
      { label: "Carbon", value: "carbon" },
      { label: "Tidepool", value: "tidepool" },
      { label: "Terra", value: "terra" },
      { label: "Voltage", value: "voltage" },
      { label: "Lichen", value: "lichen" },
      { label: "Saffron", value: "saffron" },
      { label: "Beacon", value: "beacon" },
      { label: "Grove", value: "grove" },
      { label: "Eclipse", value: "eclipse" },
    ]);
  });

  it("preserves the existing fixed color pairs and manual fallback", () => {
    expect(duotonePresets.map(({ ink, paper }) => ({ ink, paper }))).toEqual([
      { ink: "#000000", paper: "#FFFFFF" },
      { ink: "#2F58D8", paper: "#FFD9C7" },
      { ink: "#114C4F", paper: "#D7F4EC" },
      { ink: "#19213F", paper: "#F4EFE6" },
      { ink: "#6B102F", paper: "#FFF0C7" },
      { ink: "#FFFFFF", paper: "#1A3A6E" },
      { ink: "#0047AB", paper: "#F8E6A0" },
      { ink: "#5A31F4", paper: "#D6FFEF" },
      { ink: "#E0E0FF", paper: "#0A0A2E" },
      { ink: "#2B2D42", paper: "#FFB4A2" },
      { ink: "#095256", paper: "#F7C59F" },
      { ink: "#7B2D26", paper: "#F8F0D8" },
      { ink: "#3A0CA3", paper: "#BDE0FE" },
      { ink: "#213D35", paper: "#C7F464" },
      { ink: "#7F4F24", paper: "#FFF3B0" },
      { ink: "#293241", paper: "#EE6C4D" },
      { ink: "#1B4332", paper: "#B7E4C7" },
      { ink: "#14213D", paper: "#FCA311" },
    ]);
    expect(
      resolveDuotoneColors({
        ink: "#123456",
        paper: "#ABCDEF",
        preset: "manual",
      }),
    ).toEqual({ ink: "#123456", paper: "#ABCDEF" });
    expect(
      resolveDuotoneColors({
        ink: "#123456",
        paper: "#ABCDEF",
        preset: "aurora",
      }),
    ).toEqual({ ink: "#2F58D8", paper: "#FFD9C7" });
  });
});
