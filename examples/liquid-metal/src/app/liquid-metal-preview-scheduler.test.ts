import { describe, expect, it } from "vitest";

import {
  advanceLiquidMetalPreviewDeadline,
  isLiquidMetalPreviewFrameDue,
  liquidMetalPreviewFrameIntervalMs,
  liquidMetalViewportInteractionFrameIntervalMs,
  retimeLiquidMetalPreviewDeadline,
} from "./liquid-metal-preview-scheduler";

describe("Liquid Metal preview scheduler", () => {
  it("renders at a stable 30 fps cadence on slightly short 60 Hz timestamps", () => {
    let nextRenderAtMs: number | null = null;
    let renderedFrames = 0;

    for (let frameIndex = 1; frameIndex <= 120; frameIndex += 1) {
      const nowMs = frameIndex * 16.6;

      if (!isLiquidMetalPreviewFrameDue(nowMs, nextRenderAtMs)) continue;

      renderedFrames += 1;
      nextRenderAtMs = advanceLiquidMetalPreviewDeadline(
        nowMs,
        nextRenderAtMs,
        liquidMetalPreviewFrameIntervalMs,
      );
    }

    expect(renderedFrames).toBe(60);
  });

  it("carries the ideal deadline forward instead of resetting it to now", () => {
    const nextRenderAtMs = advanceLiquidMetalPreviewDeadline(
      49.8,
      50,
      liquidMetalPreviewFrameIntervalMs,
    );

    expect(nextRenderAtMs).toBeCloseTo(50 + liquidMetalPreviewFrameIntervalMs);
    expect(isLiquidMetalPreviewFrameDue(66.4, nextRenderAtMs)).toBe(false);
    expect(isLiquidMetalPreviewFrameDue(83.2, nextRenderAtMs)).toBe(true);
  });

  it("skips missed deadlines after a long frame instead of burst rendering", () => {
    const nextRenderAtMs = advanceLiquidMetalPreviewDeadline(
      216,
      50,
      liquidMetalPreviewFrameIntervalMs,
    );

    expect(nextRenderAtMs).toBeGreaterThan(216);
    expect(isLiquidMetalPreviewFrameDue(216, nextRenderAtMs)).toBe(false);
  });

  it("delays work when viewport interaction starts and resumes immediately", () => {
    const interactionDeadline = retimeLiquidMetalPreviewDeadline(
      100,
      120,
      liquidMetalPreviewFrameIntervalMs,
      liquidMetalViewportInteractionFrameIntervalMs,
    );

    expect(interactionDeadline).toBe(200);

    const resumedDeadline = retimeLiquidMetalPreviewDeadline(
      220,
      interactionDeadline,
      liquidMetalViewportInteractionFrameIntervalMs,
      liquidMetalPreviewFrameIntervalMs,
    );

    expect(resumedDeadline).toBe(220);
    expect(isLiquidMetalPreviewFrameDue(220, resumedDeadline)).toBe(true);
  });
});
