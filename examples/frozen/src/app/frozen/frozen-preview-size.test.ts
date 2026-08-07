import { expect, test } from "vitest";

import { getFrozenPreviewSize } from "./frozen-preview-size";

test("x2 preview uses two physical pixels per fitted CSS pixel", () => {
  expect(
    getFrozenPreviewSize({
      cssHeight: 540,
      cssWidth: 960,
      maximumTextureSize: 16_384,
      outputHeight: 1080,
      outputWidth: 1920,
      renderScale: 2,
    }),
  ).toEqual({ height: 1080, width: 1920 });
});

test("preview sizing fits the output aspect without a 512 pixel cap", () => {
  expect(
    getFrozenPreviewSize({
      cssHeight: 900,
      cssWidth: 1_600,
      maximumTextureSize: 16_384,
      outputHeight: 1080,
      outputWidth: 1920,
      renderScale: 2,
    }).width,
  ).toBe(3_200);
});

test("preview sizing respects the physical GPU texture boundary", () => {
  expect(
    getFrozenPreviewSize({
      cssHeight: 5_000,
      cssWidth: 5_000,
      maximumTextureSize: 4_096,
      outputHeight: 1_000,
      outputWidth: 1_000,
      renderScale: 2,
    }),
  ).toEqual({ height: 4_096, width: 4_096 });
});
