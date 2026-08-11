import { describe, expect, it } from "vitest";

import { appSchema } from "./app-schema";
import { particleGridFragmentShaderSource } from "./particle-grid";

function getControl(target: string) {
  return appSchema.panels.controls?.sections
    .flatMap((section) => Object.values(section.controls))
    .find((control) => control.target === target);
}

describe("Particle Grid grain experiment", () => {
  it("keeps one shader pass with readable internal stages", () => {
    for (const functionName of [
      "applyGrainToLuminance",
      "buildParticleMask",
      "mapParticleColor",
      "applyCellPattern",
      "applyGrain",
      "composeParticle",
    ]) {
      expect(particleGridFragmentShaderSource).toContain(`${functionName}(`);
    }

    expect(particleGridFragmentShaderSource.match(/void main\s*\(/g)).toHaveLength(1);
    expect(particleGridFragmentShaderSource).not.toContain("sampler2D uPreviousPass");
  });

  it("keeps grain neutral by default", () => {
    expect(getControl("particle.grainAmount")).toMatchObject({
      defaultValue: 0,
      max: 0.5,
      min: 0,
    });
    expect(getControl("particle.ditherAmount")).toBeUndefined();
    expect(getControl("particle.distortionAmount")).toBeUndefined();
  });

  it("publishes the experimental control sections inside Particle Grid", () => {
    const sectionTitles = appSchema.panels.controls?.sections.map(
      (section) => section.title,
    );

    expect(sectionTitles).toContain("Grain");
    expect(sectionTitles).not.toContain("Dither");
    expect(sectionTitles).not.toContain("Distortion");
  });
});
