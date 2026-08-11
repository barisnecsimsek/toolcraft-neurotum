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

  it("fixes row gap at zero and exposes horizontal connection controls", () => {
    expect(getControl("particle.rowGap")).toBeUndefined();
    expect(particleGridFragmentShaderSource).not.toContain("uRowGap");
    expect(getControl("particle.shrinkThreshold")).toBeUndefined();
    expect(getControl("particle.maxShrink")).toBeUndefined();
    expect(particleGridFragmentShaderSource).not.toContain("uShrinkThreshold");
    expect(particleGridFragmentShaderSource).not.toContain("uMaxShrink");
    expect(getControl("particle.maxColumnWidth")).toMatchObject({
      label: "Maximum width",
      max: 1,
    });
    expect(getControl("particle.columnGap")).toMatchObject({ min: 0 });
    expect(getControl("particle.width")).toMatchObject({
      label: "Width gain",
      max: 3,
    });
    expect(particleGridFragmentShaderSource).toContain(
      "float maximumWidth = min(uMaxColumnWidth, availableWidth);",
    );
    expect(particleGridFragmentShaderSource).toContain(
      "float centeredX = (effectUv.x - cellCenterX) * gridDims.x;",
    );
    expect(particleGridFragmentShaderSource).toContain(
      "float edgeWidth = max(uSoftness * 0.5, halfPixelInCell);",
    );
  });

  it("kills particles below a configurable raw-width threshold", () => {
    expect(getControl("particle.killBelowWidth")).toMatchObject({
      defaultValue: 0,
      label: "Kill below",
      min: 0,
      max: 1,
    });
    expect(particleGridFragmentShaderSource).toContain(
      "if (rawWidth < uKillBelowWidth)",
    );
    expect(
      particleGridFragmentShaderSource.indexOf("rawWidth < uKillBelowWidth"),
    ).toBeLessThan(
      particleGridFragmentShaderSource.indexOf("max(rawWidth, uMinWidth)"),
    );
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
