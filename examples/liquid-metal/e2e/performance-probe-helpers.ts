import type { Page } from "@playwright/test";

export type ToolcraftFrameProbeResult = {
  longTaskCount: number;
  longTaskMaxMs: number;
  maxFrameGapMs: number;
  sampleCount: number;
};

export type ToolcraftInteractionResult = ToolcraftFrameProbeResult & {
  durationMs: number;
  productFrameCount?: number;
  renderMs?: number;
};

export type ToolcraftProductFrameProbeOptions = {
  attributeName: string;
  frameCount: number;
  selector: string;
  timeoutMs?: number;
};

export type ToolcraftInteractionEndMarkerOptions = {
  attributeName: string;
  expectedValue: string;
  selector: string;
  timeoutMs?: number;
};

export type ToolcraftInteractionOptions = {
  endMarker?: ToolcraftInteractionEndMarkerOptions;
  productFrames?: ToolcraftProductFrameProbeOptions;
  settleFrames?: number;
  settleMs?: number;
};

export type ToolcraftProductFrameProbeResult = {
  durationMs: number;
  frameCount: number;
  maxFrameGapMs: number;
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

      probe.maxFrameGapMs = Math.max(
        probe.maxFrameGapMs,
        performance.now() - lastFrame,
      );
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

type ToolcraftFrozenInteractionProbe = {
  endedAt?: number;
  error?: string;
  frameProbe?: ToolcraftFrameProbeResult;
  startedAt: number;
};

async function armToolcraftInteractionEndMarker(
  page: Page,
  {
    attributeName,
    expectedValue,
    selector,
    timeoutMs = 15_000,
  }: ToolcraftInteractionEndMarkerOptions,
): Promise<void> {
  await page.evaluate(
    ({ attribute, expected, targetSelector, timeout }) => {
      const win = window as Window & {
        __toolcraftFrozenInteractionProbe?: ToolcraftFrozenInteractionProbe;
        __toolcraftStopFrameProbe?: () => ToolcraftFrameProbeResult;
      };
      const target = document.querySelector(targetSelector);

      if (!target) {
        throw new Error(
          `Interaction end-marker target "${targetSelector}" was not found.`,
        );
      }

      if (target.getAttribute(attribute) === expected) {
        throw new Error(
          `Interaction end marker ${targetSelector}[${attribute}] already matched "${expected}" before the action.`,
        );
      }

      const frozen: ToolcraftFrozenInteractionProbe = {
        startedAt: performance.now(),
      };
      win.__toolcraftFrozenInteractionProbe = frozen;

      let completed = false;
      let timeoutId = 0;
      const observer = new MutationObserver(() => {
        if (target.getAttribute(attribute) !== expected) return;

        finish();
      });
      const finish = (error?: string): void => {
        if (completed) return;

        completed = true;
        window.clearTimeout(timeoutId);
        observer.disconnect();
        frozen.endedAt = performance.now();
        frozen.error = error;
        frozen.frameProbe = win.__toolcraftStopFrameProbe?.() ?? {
          longTaskCount: 0,
          longTaskMaxMs: 0,
          maxFrameGapMs: 0,
          sampleCount: 0,
        };
      };

      observer.observe(target, {
        attributeFilter: [attribute],
        attributes: true,
      });
      timeoutId = window.setTimeout(
        () =>
          finish(
            `Interaction end marker ${targetSelector}[${attribute}] did not reach "${expected}" within ${timeout}ms.`,
          ),
        timeout,
      );
    },
    {
      attribute: attributeName,
      expected: expectedValue,
      targetSelector: selector,
      timeout: timeoutMs,
    },
  );
}

async function readToolcraftFrozenInteractionProbe(
  page: Page,
  timeoutMs: number,
): Promise<ToolcraftFrozenInteractionProbe> {
  await page.waitForFunction(
    () => {
      const win = window as Window & {
        __toolcraftFrozenInteractionProbe?: ToolcraftFrozenInteractionProbe;
      };

      return Boolean(win.__toolcraftFrozenInteractionProbe?.frameProbe);
    },
    undefined,
    { timeout: timeoutMs + 1_000 },
  );

  return page.evaluate(() => {
    const win = window as Window & {
      __toolcraftFrozenInteractionProbe?: ToolcraftFrozenInteractionProbe;
    };
    const frozen = win.__toolcraftFrozenInteractionProbe;

    if (!frozen) {
      throw new Error("The interaction end-marker probe was not armed.");
    }

    return frozen;
  });
}

export async function measureToolcraftInteraction(
  page: Page,
  action: () => Promise<void>,
  options: ToolcraftInteractionOptions = {},
): Promise<ToolcraftInteractionResult> {
  const stopProbe = await startToolcraftFrameProbe(page);
  const endMarker = options.endMarker;

  if (endMarker) {
    await armToolcraftInteractionEndMarker(page, endMarker);
    await action();

    const frozen = await readToolcraftFrozenInteractionProbe(
      page,
      endMarker.timeoutMs ?? 15_000,
    );

    if (frozen.error) throw new Error(frozen.error);
    if (frozen.endedAt === undefined || !frozen.frameProbe) {
      throw new Error("The interaction end-marker probe did not finish.");
    }

    return {
      durationMs: frozen.endedAt - frozen.startedAt,
      longTaskCount: frozen.frameProbe.longTaskCount,
      longTaskMaxMs: frozen.frameProbe.longTaskMaxMs,
      maxFrameGapMs: frozen.frameProbe.maxFrameGapMs,
      sampleCount: frozen.frameProbe.sampleCount,
    };
  }

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
  const productFrameProbe = options.productFrames
    ? waitForToolcraftProductFrames(page, options.productFrames)
    : Promise.resolve<ToolcraftProductFrameProbeResult | null>(null);

  const [, productFrames] = await Promise.all([
    waitForToolcraftAnimationFrames(page, frameCount),
    productFrameProbe,
  ]);

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
    maxFrameGapMs: Math.max(
      frameProbe.maxFrameGapMs,
      productFrames?.maxFrameGapMs ?? 0,
    ),
    productFrameCount: productFrames?.frameCount,
    renderMs: productFrames?.durationMs,
    sampleCount: frameProbe.sampleCount,
  };
}

export async function waitForToolcraftProductFrames(
  page: Page,
  {
    attributeName,
    frameCount,
    selector,
    timeoutMs = 15_000,
  }: ToolcraftProductFrameProbeOptions,
): Promise<ToolcraftProductFrameProbeResult> {
  if (frameCount <= 0) {
    return { durationMs: 0, frameCount: 0, maxFrameGapMs: 0 };
  }

  return page.evaluate(
    ({ attribute, count, targetSelector, timeout }) =>
      new Promise<ToolcraftProductFrameProbeResult>((resolve, reject) => {
        const target = document.querySelector(targetSelector);

        if (!target) {
          reject(new Error(`Product frame target "${targetSelector}" was not found.`));
          return;
        }

        const startedAt = performance.now();
        let frameGapStartedAt = startedAt;
        let lastValue = target.getAttribute(attribute);
        let observedFrames = 0;
        let maxFrameGapMs = 0;
        const timeoutId = window.setTimeout(() => {
          observer.disconnect();
          reject(
            new Error(
              `Observed ${observedFrames}/${count} distinct product frames from ${targetSelector} within ${timeout}ms.`,
            ),
          );
        }, timeout);
        const observer = new MutationObserver(() => {
          const nextValue = target.getAttribute(attribute);

          if (nextValue === lastValue) return;

          const now = performance.now();

          lastValue = nextValue;
          observedFrames += 1;
          maxFrameGapMs = Math.max(maxFrameGapMs, now - frameGapStartedAt);
          frameGapStartedAt = now;

          if (observedFrames < count) return;

          window.clearTimeout(timeoutId);
          observer.disconnect();
          resolve({
            durationMs: now - startedAt,
            frameCount: observedFrames,
            maxFrameGapMs,
          });
        });

        observer.observe(target, {
          attributeFilter: [attribute],
          attributes: true,
        });
      }),
    {
      attribute: attributeName,
      count: frameCount,
      targetSelector: selector,
      timeout: timeoutMs,
    },
  );
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
