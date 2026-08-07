import { describe, expect, it } from "vitest";
import * as THREE from "three";

import { createToolcraftState } from "@/toolcraft/runtime";

import { appSchema } from "../app-schema";
import { readEffectsRendererSettings } from "./effect-state";
import { effectFragmentShaders } from "./effect-shaders";

describe("effect state mapping", () => {
  it.each([
    ["coarse-2", 0],
    ["bayer-4", 1],
    ["fine-8", 2],
    ["clustered", 3],
    ["scanline", 4],
    ["diagonal", 8],
    ["white-noise", 5],
    ["noise-2", 6],
    ["blue-noise", 7],
    ["blue-noise-2", 9],
    ["blue-noise-half", 10],
    ["r2-noise", 11],
  ])("maps Dither pattern %s to source uniform %i", (pattern, expected) => {
    const state = createToolcraftState(appSchema, {
      values: { "dither.pattern": pattern },
    });
    expect(readEffectsRendererSettings(state).dither.pattern).toBe(expected);
  });

  it("maps Dither and Threshold color modes in reference order", () => {
    const state = createToolcraftState(appSchema, {
      values: {
        "dither.colorMode": "source",
        "threshold.colorMode": "grayscale",
      },
    });
    const settings = readEffectsRendererSettings(state);
    expect(settings.dither.colorMode).toBe(2);
    expect(settings.threshold.colorMode).toBe(1);
  });

  it("keeps custom ASCII characters and camera orbit in renderer state", () => {
    const state = createToolcraftState(appSchema, {
      values: {
        "ascii.characters": "XO",
        "view.orbit": { position: [1, 2, 3], up: [0, 1, 0] },
      },
    });
    const settings = readEffectsRendererSettings(state);
    expect(settings.ascii.characters).toBe("XO");
    expect(settings.orbitPose).toEqual({
      position: [1, 2, 3],
      up: [0, 1, 0],
    });
  });

  it("maps post-processing display values to the exact reference uniforms", () => {
    const state = createToolcraftState(appSchema, {
      values: {
        "blur.angle": 90,
        "blur.focusPoint": { x: 0.25, y: -0.4 },
        "chromatic.amount": 0.05,
        "grain.amount": 0.41,
        "overlay.angle": 135,
        "overlay.end": "#334455",
        "overlay.start": "#112233",
      },
    });
    const settings = readEffectsRendererSettings(state);

    expect(settings.blur.angle).toBeCloseTo(Math.PI / 2);
    expect(settings.blur.focusPoint).toEqual({ x: 0.25, y: 0.4 });
    expect(settings.chromatic.amount).toBeCloseTo(0.005);
    expect(settings.grain.amount).toBeCloseTo(0.3 * 0.41 ** 2);
    expect(settings.bloom.blend).toBe(1);
    expect(settings.overlay).toMatchObject({
      angle: 135,
      end: "#334455",
      start: "#112233",
    });
  });

  it("uses the same Three.js revision as the inspected effects runtime", () => {
    expect(THREE.REVISION).toBe("164");
  });

  it("ships the source ASCII atlas and continuous anti-aliasing algorithm", () => {
    expect(effectFragmentShaders.ascii).toContain("uniform sampler2D charTexture");
    expect(effectFragmentShaders.ascii).toContain("float densityHash");
    expect(effectFragmentShaders.ascii).toContain("length(fwidth(q))");
    expect(effectFragmentShaders.ascii).toContain("shapeMode > 6.5");
  });
});
