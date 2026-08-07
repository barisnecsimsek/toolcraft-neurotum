export const liquidMetalPreviewFrameIntervalMs = 1000 / 30;
export const liquidMetalViewportInteractionFrameIntervalMs = 100;

const liquidMetalPreviewDeadlineToleranceMs = 1;

function sanitizeFrameInterval(frameIntervalMs: number): number {
  return Number.isFinite(frameIntervalMs) && frameIntervalMs > 0
    ? frameIntervalMs
    : liquidMetalPreviewFrameIntervalMs;
}

export function isLiquidMetalPreviewFrameDue(
  nowMs: number,
  nextRenderAtMs: number | null,
): boolean {
  return (
    nextRenderAtMs === null ||
    !Number.isFinite(nextRenderAtMs) ||
    nowMs + liquidMetalPreviewDeadlineToleranceMs >= nextRenderAtMs
  );
}

export function advanceLiquidMetalPreviewDeadline(
  nowMs: number,
  nextRenderAtMs: number | null,
  frameIntervalMs: number,
): number {
  const interval = sanitizeFrameInterval(frameIntervalMs);

  if (nextRenderAtMs === null || !Number.isFinite(nextRenderAtMs)) {
    return nowMs + interval;
  }

  const effectiveLateness = Math.max(
    0,
    nowMs + liquidMetalPreviewDeadlineToleranceMs - nextRenderAtMs,
  );
  const elapsedSlots = Math.floor(effectiveLateness / interval) + 1;

  return nextRenderAtMs + elapsedSlots * interval;
}

export function retimeLiquidMetalPreviewDeadline(
  nowMs: number,
  nextRenderAtMs: number | null,
  previousFrameIntervalMs: number,
  nextFrameIntervalMs: number,
): number | null {
  const previousInterval = sanitizeFrameInterval(previousFrameIntervalMs);
  const nextInterval = sanitizeFrameInterval(nextFrameIntervalMs);

  if (previousInterval === nextInterval || nextRenderAtMs === null) {
    return nextRenderAtMs;
  }

  return nextInterval < previousInterval ? nowMs : nowMs + nextInterval;
}
