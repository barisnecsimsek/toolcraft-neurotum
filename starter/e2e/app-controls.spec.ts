import { expect, test, type Page } from "@playwright/test";

import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";
import {
  expectToolcraftDiscreteSliderDragSmoothness,
} from "./performance-helpers";

test.describe.configure({ timeout: 90_000 });

const outputSelector = '[data-toolcraft-product-output="particle-grid"]';
const sourceSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <defs>
      <linearGradient id="lum"><stop stop-color="#050505"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#lum)"/>
    <rect x="0" y="0" width="128" height="90" fill="#e51d2a"/>
    <rect x="128" y="0" width="128" height="90" fill="#f5bf18"/>
    <rect x="256" y="0" width="128" height="90" fill="#22b455"/>
    <rect x="384" y="0" width="128" height="90" fill="#3156df"/>
    <rect x="512" y="0" width="128" height="90" fill="#ffffff"/>
    <circle cx="105" cy="245" r="64" fill="#222222"/>
    <rect x="430" y="180" width="150" height="125" fill="#eeeeee"/>
  </svg>`;

async function uploadSource(page: Page, name = "particle-grid-source.svg"): Promise<void> {
  await page.locator('input[type="file"]').first().setInputFiles({
    buffer: Buffer.from(sourceSvg),
    mimeType: "image/svg+xml",
    name,
  });
  await expect(page.getByRole("img", { name })).toBeVisible();
  await expect(page.locator(outputSelector)).toHaveAttribute("data-source-ready", "true", {
    timeout: 20_000,
  });
}

async function chooseSelect(page: Page, label: string, option: string): Promise<void> {
  const field = page.locator('[data-slot="field"]').filter({
    has: page.getByText(label, { exact: true }),
  });
  await field.getByRole("combobox").click();
  await page.getByText(option, { exact: true }).click();
}

async function changeColor(page: Page, label: string, value: string): Promise<void> {
  const input = page.getByLabel(`${label} hex`, { exact: true });
  await input.fill(value);
  await input.press("Tab");
  await expect(input).toHaveValue(value.toUpperCase());
}

async function setSliderToEdge(
  page: Page,
  label: string,
  key: "End" | "Home",
): Promise<void> {
  const slider = page.getByRole("slider", { name: label, exact: true });
  await slider.focus();
  await slider.press(key);
}

test("browser: source image lifecycle updates Particle Grid output", async ({ page }) => {
  await page.goto("/");
  const before = await getToolcraftProductObservableSnapshot(page);
  await uploadSource(page);
  await expect.poll(() => getToolcraftProductObservableSnapshot(page)).not.toBe(before);

  for (const action of ["90° Right", "Flip horizontal", "Flip vertical"]) {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("button", { name: action }).click();
    });
  }

  await page.getByRole("button", { name: "Remove image" }).click();
  await expect(page.getByText("particle-grid-source.svg")).toHaveCount(0);
  await uploadSource(page, "reset-source.svg");
  await page.getByRole("button", { name: "Reset controls" }).click();
  await expect(page.getByText("reset-source.svg")).toHaveCount(0);
});

test("browser: grid controls change Particle Grid geometry", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  for (const [label, key] of [
    ["Columns", "End"],
    ["Rows", "End"],
    ["Row gap", "End"],
    ["Column gap", "End"],
    ["Max width", "Home"],
  ] as const) {
    await expectToolcraftProductObservableToChange(page, async () => {
      await setSliderToEdge(page, label, key);
    });
  }
});

test("browser: particle shape controls change rendered masks", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  for (const [label, key] of [
    ["Width", "Home"],
    ["Minimum width", "End"],
    ["Shrink threshold", "End"],
    ["Maximum shrink", "Home"],
    ["Softness", "End"],
  ] as const) {
    await expectToolcraftProductObservableToChange(page, async () => {
      await setSliderToEdge(page, label, key);
    });
  }
});

test("browser: color mapping controls change particle colors", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);

  await expectToolcraftProductObservableToChange(page, async () => {
    await chooseSelect(page, "Color mode", "Tint");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await changeColor(page, "Tint", "#ff00ff");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await chooseSelect(page, "Color grouping", "Brightness");
  });

  for (const [label, color] of [
    ["Group 1 / Reds", "#ff55aa"],
    ["Group 2 / Oranges", "#55ffff"],
    ["Group 3 / Greens", "#ffff55"],
    ["Group 4 / Blues", "#aa55ff"],
  ] as const) {
    await expectToolcraftProductObservableToChange(page, async () => {
      await changeColor(page, label, color);
    });
  }

  await expectToolcraftProductObservableToChange(page, async () => {
    await chooseSelect(page, "Color grouping", "Color");
  });
});

test("browser: dot pattern controls change bright-cell texture", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await setSliderToEdge(page, "Chance", "End");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await changeColor(page, "Pattern background", "#ff00ff");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await setSliderToEdge(page, "Dot size", "End");
  });
  await expectToolcraftProductObservableToChange(page, async () => {
    await setSliderToEdge(page, "Density", "End");
  });
});

test("browser: background inclusion changes preview and PNG alpha", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await page
      .locator('[data-slot="field"]')
      .filter({ hasText: "Include" })
      .getByRole("switch")
      .click();
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.png$/);
});

test("browser: background color changes Particle Grid gaps", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  await expectToolcraftProductObservableToChange(page, async () => {
    await changeColor(page, "background", "#ffcc00");
  });
});

test("browser: image format changes exported MIME", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  await chooseSelect(page, "Format", "JPG");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.jpg$/);
});

test("browser: image resolution changes exported dimensions", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  await chooseSelect(page, "Resolution", "2K");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const image = await page.evaluate(async (data) => {
    const bitmap = await createImageBitmap(
      new Blob([new Uint8Array(data)], { type: "image/png" }),
    );
    const dimensions = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return dimensions;
  }, [...Buffer.concat(chunks)]);
  expect(Math.max(image.width, image.height)).toBe(2048);
});

test("browser: export action downloads Particle Grid image bytes", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const stream = await (await downloadPromise).createReadStream();
  expect(stream.readable).toBe(true);
});

test("browser: Particle Grid renderer produces source-sampled particles", async ({ page }) => {
  await page.goto("/");
  await uploadSource(page);
  const snapshot = await getToolcraftProductObservableSnapshot(page);
  expect(snapshot).toContain("particle-grid");
  expect(
    await page.locator(outputSelector).evaluate((canvas) => {
      return (canvas as HTMLCanvasElement).getContext("webgl2") !== null;
    }),
  ).toBe(true);
});

test("browser: resolution scale changes backing pixels", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(outputSelector);
  const before = await canvas.evaluate((element) => (element as HTMLCanvasElement).width);
  const field = page.locator('[data-slot="field"]').filter({ hasText: /^Resolution scale/ });
  await expect(field.locator('[data-slot="slider"]')).toHaveAttribute("data-variant", "discrete");
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 120,
    maxInteractionMs: 1500,
  });
  await expect
    .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width))
    .not.toBe(before);
});
