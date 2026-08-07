import type { Page } from "@playwright/test";

export type ToolcraftFrameProbeResult = {
  longTaskCount: number;
  longTaskMaxMs: number;
  maxFrameGapMs: number;
  sampleCount: number;
};

export type ToolcraftInteractionResult = ToolcraftFrameProbeResult & {
  durationMs: number;
};

export type ToolcraftInteractionOptions = {
  settleFrames?: number;
  settleMs?: number;
};

export async function startToolcraftFrameProbe(
  page: Page,
): Promise<() => Promise<ToolcraftFrameProbeResult>> {
  await page.evaluate(() => {
    const win = window as Window & {
      __toolcraftFrameProbe?: {
        active: boolean;
        longTaskCount: number;
        longTaskMaxMs: number;
        observer?: PerformanceObserver;
        maxFrameGapMs: number;
        rafId: number;
        sampleCount: number;
      };
      __toolcraftStopFrameProbe?: () => ToolcraftFrameProbeResult;
    };

    if (win.__toolcraftFrameProbe?.active) {
      cancelAnimationFrame(win.__toolcraftFrameProbe.rafId);
    }

    let lastFrame = performance.now();
    win.__toolcraftFrameProbe = {
      active: true,
      longTaskCount: 0,
      longTaskMaxMs: 0,
      maxFrameGapMs: 0,
      rafId: 0,
      sampleCount: 0,
    };

    try {
      win.__toolcraftFrameProbe.observer = new PerformanceObserver((list) => {
        const probe = win.__toolcraftFrameProbe;
        if (!probe?.active) {
          return;
        }

        for (const entry of list.getEntries()) {
          probe.longTaskCount += 1;
          probe.longTaskMaxMs = Math.max(probe.longTaskMaxMs, entry.duration);
        }
      });
      win.__toolcraftFrameProbe.observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // Some browser contexts do not expose longtask entries. Frame gaps still catch jank.
    }

    const tick = (now: number) => {
      const probe = win.__toolcraftFrameProbe;
      if (!probe?.active) {
        return;
      }

      probe.maxFrameGapMs = Math.max(probe.maxFrameGapMs, now - lastFrame);
      probe.sampleCount += 1;
      lastFrame = now;
      probe.rafId = requestAnimationFrame(tick);
    };

    win.__toolcraftFrameProbe.rafId = requestAnimationFrame(tick);
    win.__toolcraftStopFrameProbe = () => {
      const probe = win.__toolcraftFrameProbe ?? {
        active: false,
        longTaskCount: 0,
        longTaskMaxMs: 0,
        maxFrameGapMs: 0,
        rafId: 0,
        sampleCount: 0,
      };

      probe.active = false;
      cancelAnimationFrame(probe.rafId);
      probe.observer?.disconnect();

      return {
        longTaskCount: probe.longTaskCount,
        longTaskMaxMs: probe.longTaskMaxMs,
        maxFrameGapMs: probe.maxFrameGapMs,
        sampleCount: probe.sampleCount,
      };
    };
  });

  return async () =>
    page.evaluate(() => {
      const win = window as Window & {
        __toolcraftStopFrameProbe?: () => ToolcraftFrameProbeResult;
      };

      return (
        win.__toolcraftStopFrameProbe?.() ?? {
          longTaskCount: 0,
          longTaskMaxMs: 0,
          maxFrameGapMs: 0,
          sampleCount: 0,
        }
      );
    });
}

export async function measureToolcraftInteraction(
  page: Page,
  action: () => Promise<void>,
  options: ToolcraftInteractionOptions = {},
): Promise<ToolcraftInteractionResult> {
  const stopProbe = await startToolcraftFrameProbe(page);
  const startedAt = await page.evaluate(() => performance.now());

  await action();

  const endedAt = await page.evaluate(() => performance.now());
  await waitForToolcraftAnimationFrames(page, options.settleFrames ?? 3);

  if (options.settleMs && options.settleMs > 0) {
    await page.waitForTimeout(options.settleMs);
  }

  const frameProbe = await stopProbe();

  return {
    durationMs: endedAt - startedAt,
    longTaskCount: frameProbe.longTaskCount,
    longTaskMaxMs: frameProbe.longTaskMaxMs,
    maxFrameGapMs: frameProbe.maxFrameGapMs,
    sampleCount: frameProbe.sampleCount,
  };
}

export async function measureToolcraftAnimationFrames(
  page: Page,
  frameCount = 120,
  options: ToolcraftInteractionOptions = {},
): Promise<ToolcraftInteractionResult> {
  if (frameCount < 120) {
    throw new Error("Animation performance probes must sample at least 120 frames.");
  }

  const stopProbe = await startToolcraftFrameProbe(page);
  const startedAt = await page.evaluate(() => performance.now());

  await waitForToolcraftAnimationFrames(page, frameCount);

  if (options.settleFrames && options.settleFrames > 0) {
    await waitForToolcraftAnimationFrames(page, options.settleFrames);
  }

  if (options.settleMs && options.settleMs > 0) {
    await page.waitForTimeout(options.settleMs);
  }

  const endedAt = await page.evaluate(() => performance.now());
  const frameProbe = await stopProbe();

  return {
    durationMs: endedAt - startedAt,
    longTaskCount: frameProbe.longTaskCount,
    longTaskMaxMs: frameProbe.longTaskMaxMs,
    maxFrameGapMs: frameProbe.maxFrameGapMs,
    sampleCount: frameProbe.sampleCount,
  };
}

export async function waitForToolcraftAnimationFrames(page: Page, count: number): Promise<void> {
  if (count <= 0) {
    return;
  }

  await page.evaluate(
    (frameCount) =>
      new Promise<void>((resolve) => {
        let remainingFrames = frameCount;

        const tick = () => {
          remainingFrames -= 1;

          if (remainingFrames <= 0) {
            resolve();
            return;
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      }),
    count,
  );
}
