import { expect, type Locator, type Page } from "@playwright/test";

import type { ToolcraftPerformanceConfig } from "@/toolcraft/runtime";

import {
  expectToolcraftPerformanceBudget,
  getToolcraftPerformanceStressValue,
} from "./performance-budget-helpers";
import {
  measureToolcraftInteraction,
  type ToolcraftInteractionOptions,
  type ToolcraftInteractionResult,
} from "./performance-probe-helpers";

export async function getToolcraftFieldByLabel(page: Page, label: string): Promise<Locator> {
  const exactField = page.locator('[data-slot="field"]').filter({
    has: page.getByText(label, { exact: true }),
  });
  const field =
    (await exactField.count()) > 0
      ? exactField.first()
      : page
          .locator('[data-slot="field"]')
          .filter({ hasText: new RegExp(`^${label}(?:\\s|$)`) })
          .first();
  await expect(field, `Toolcraft field "${label}" should be visible`).toBeVisible();
  return field;
}

export async function expectToolcraftSegmentedControlCellsPreservePadding(
  page: Page,
  label: string,
  options: {
    minHorizontalPaddingPx?: number;
  } = {},
): Promise<void> {
  const minHorizontalPaddingPx = options.minHorizontalPaddingPx ?? 6;
  const field = await getToolcraftFieldByLabel(page, label);
  const segmentedGroup = field.locator('[data-slot="toggle-group"]').first();

  await expect(
    segmentedGroup,
    `Toolcraft segmented control "${label}" should render a toggle group.`,
  ).toBeVisible();

  const issues = await segmentedGroup.evaluate(
    (group, minPadding) => {
      type LayoutIssue = {
        label: string;
        reason: string;
      };

      function getTextRect(element: Element): DOMRect | null {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            return node.textContent?.trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        });
        const textNodes: Text[] = [];
        let currentNode = walker.nextNode();

        while (currentNode) {
          textNodes.push(currentNode as Text);
          currentNode = walker.nextNode();
        }

        if (textNodes.length === 0) {
          return null;
        }

        const range = document.createRange();
        range.setStartBefore(textNodes[0]!);
        range.setEndAfter(textNodes[textNodes.length - 1]!);

        return range.getBoundingClientRect();
      }

      const items = Array.from(
        group.querySelectorAll<HTMLElement>('[data-slot="toggle-group-item"]'),
      );
      const issues: LayoutIssue[] = [];
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]!;
        const itemRect = item.getBoundingClientRect();
        const textRect = getTextRect(item);
        const label = item.textContent?.trim() || item.getAttribute("aria-label") || `#${index + 1}`;
        const nextItem = items[index + 1];
        const computedStyle = window.getComputedStyle(item);

        if (context && label.trim()) {
          context.font = computedStyle.font;
          const measuredTextWidth = context.measureText(label).width;
          const requiredWidth = measuredTextWidth + minPadding * 2;

          if (requiredWidth > itemRect.width + 0.5) {
            issues.push({
              label,
              reason: `label requires ${requiredWidth.toFixed(2)}px including padding but cell width is ${itemRect.width.toFixed(2)}px`,
            });
          }
        }

        if (nextItem) {
          const nextRect = nextItem.getBoundingClientRect();

          if (itemRect.right > nextRect.left + 0.5) {
            issues.push({
              label,
              reason: `cell overlaps next cell by ${(itemRect.right - nextRect.left).toFixed(2)}px`,
            });
          }
        }

        if (item.scrollWidth > item.clientWidth + 1) {
          issues.push({
            label,
            reason: `cell scrollWidth ${item.scrollWidth}px exceeds clientWidth ${item.clientWidth}px`,
          });
        }

        if (!textRect) {
          continue;
        }

        const leftPadding = textRect.left - itemRect.left;
        const rightPadding = itemRect.right - textRect.right;

        if (leftPadding < minPadding) {
          issues.push({
            label,
            reason: `left text padding ${leftPadding.toFixed(2)}px is below ${minPadding}px`,
          });
        }

        if (rightPadding < minPadding) {
          issues.push({
            label,
            reason: `right text padding ${rightPadding.toFixed(2)}px is below ${minPadding}px`,
          });
        }
      }

      return issues;
    },
    minHorizontalPaddingPx,
  );

  expect(
    issues,
    `Toolcraft segmented control "${label}" must preserve cell padding and avoid label collisions.`,
  ).toEqual([]);
}

export async function dragToolcraftSliderByLabel(
  page: Page,
  label: string,
  targetRatio: number,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const slider = field.locator('[data-slot="slider"], [role="slider"]').first();

  await expect(slider, `Toolcraft slider "${label}" should be visible`).toBeVisible();

  const box = await slider.boundingBox();
  if (!box) {
    throw new Error(`Could not measure slider "${label}".`);
  }

  const startX = box.x + box.width * 0.15;
  const endX = box.x + box.width * targetRatio;
  const y = box.y + box.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 12 });
  await page.mouse.up();
}

export async function dragToolcraftSliderToValue(
  page: Page,
  label: string,
  value: number,
): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  const slider = field.locator('[data-slot="slider"], [role="slider"]').first();

  await expect(slider, `Toolcraft slider "${label}" should be visible`).toBeVisible();

  const range = await slider.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    const min = Number(
      htmlElement.getAttribute("aria-valuemin") ??
        (htmlElement as HTMLInputElement).min ??
        "0",
    );
    const max = Number(
      htmlElement.getAttribute("aria-valuemax") ??
        (htmlElement as HTMLInputElement).max ??
        "100",
    );

    return {
      max: Number.isFinite(max) ? max : 100,
      min: Number.isFinite(min) ? min : 0,
    };
  });
  const denominator = range.max - range.min;
  const ratio = denominator === 0 ? 0 : (value - range.min) / denominator;

  await dragToolcraftSliderByLabel(page, label, Math.min(1, Math.max(0, ratio)));
}

export async function dragToolcraftSliderToPerformanceStressValue(
  page: Page,
  label: string,
  config: ToolcraftPerformanceConfig,
  scenarioId: string,
): Promise<void> {
  const value = getToolcraftPerformanceStressValue(config, scenarioId);

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Toolcraft performance scenario "${scenarioId}" must provide a numeric stressFixture.value for slider "${label}".`,
    );
  }

  await dragToolcraftSliderToValue(page, label, value);
}

export async function expectToolcraftCanvasBackingPixelsForRenderScale(
  page: Page,
  canvasSelector: string,
  renderScale: number,
): Promise<void> {
  if (!Number.isFinite(renderScale) || renderScale <= 1) {
    throw new Error(
      `Toolcraft render scale backing-pixel checks require a numeric renderScale greater than 1, received ${renderScale}.`,
    );
  }

  const canvas = page.locator(canvasSelector).first();
  await expect(
    canvas,
    `Toolcraft render scale check expected a visible canvas matching "${canvasSelector}".`,
  ).toBeVisible();

  const metrics = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error("Render scale backing-pixel checks must target an HTMLCanvasElement.");
    }

    const rect = element.getBoundingClientRect();
    const viewport = element.closest('[data-slot="toolcraft-runtime-canvas"]');
    const viewportRect = viewport?.getBoundingClientRect();
    const fitScale = viewportRect
      ? Math.min(
          1,
          viewportRect.width / Math.max(1, rect.width),
          viewportRect.height / Math.max(1, rect.height),
        )
      : 1;
    return {
      backingHeight: element.height,
      backingWidth: element.width,
      cssHeight: (element.clientHeight || rect.height) * fitScale,
      cssWidth: (element.clientWidth || rect.width) * fitScale,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  const expectedWidth = metrics.cssWidth * metrics.devicePixelRatio * renderScale;
  const expectedHeight = metrics.cssHeight * metrics.devicePixelRatio * renderScale;

  expect(
    metrics.backingWidth,
    `Expected canvas backing width to honor Resolution scale ${renderScale}.`,
  ).toBeGreaterThanOrEqual(Math.floor(expectedWidth - 1));
  expect(
    metrics.backingHeight,
    `Expected canvas backing height to honor Resolution scale ${renderScale}.`,
  ).toBeGreaterThanOrEqual(Math.floor(expectedHeight - 1));
}

export async function expectToolcraftDiscreteSliderDragSmoothness(
  page: Page,
  label: string,
  options: ToolcraftInteractionOptions & {
    expectMarkers?: boolean;
    maxFrameGapMs?: number;
    maxInteractionMs?: number;
  } = {},
): Promise<ToolcraftInteractionResult> {
  const field = await getToolcraftFieldByLabel(page, label);
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]').first();

  await expect(
    slider,
    `Toolcraft discrete slider "${label}" should render the discrete variant.`,
  ).toBeVisible();

  const markers = field.locator('[data-slot="slider-marker"]');
  if (options.expectMarkers === false) {
    await expect(
      markers,
      `Toolcraft half-width discrete slider "${label}" should hide over-budget tick markers.`,
    ).toHaveCount(0);
  } else {
    await expect(
      markers.first(),
      `Toolcraft discrete slider "${label}" should render tick markers.`,
    ).toBeVisible();
  }

  const result = await measureToolcraftInteraction(
    page,
    async () => {
      await dragToolcraftSliderByLabel(page, label, 0.85);
    },
    options,
  );

  expectToolcraftPerformanceBudget(result, {
    maxFrameGapMs: options.maxFrameGapMs ?? 80,
    maxInteractionMs: options.maxInteractionMs ?? 500,
  });

  return result;
}
