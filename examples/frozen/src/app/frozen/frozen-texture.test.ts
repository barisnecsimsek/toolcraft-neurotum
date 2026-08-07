import { expect, test } from "vitest";

import {
  createFrozenLuminanceBytes,
  getFrozenScratchSize,
} from "./frozen-texture";

test("scratch preparation converts RGBA into linear luminance bytes", () => {
  expect(
    Array.from(
      createFrozenLuminanceBytes(
        new Uint8ClampedArray([
          255, 0, 0, 255,
          0, 255, 0, 255,
          0, 0, 255, 255,
          255, 255, 255, 128,
        ]),
      ),
    ),
  ).toEqual([54, 182, 18, 128]);
});

test("scratch preparation bounds the longest image edge at 2048", () => {
  expect(getFrozenScratchSize(4_096, 2_048)).toEqual({
    height: 1_024,
    width: 2_048,
  });
  expect(getFrozenScratchSize(800, 600)).toEqual({ height: 600, width: 800 });
});
