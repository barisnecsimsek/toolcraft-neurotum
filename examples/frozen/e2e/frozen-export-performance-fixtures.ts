import { expect, type Download, type Page } from "@playwright/test";

import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";

const resolutionLabels = { "2k": "2K", "4k": "4K", "8k": "8K" } as const;

export async function applyFrozenExportWidth(
  page: Page,
  value: string,
): Promise<void> {
  const label = resolutionLabels[value as keyof typeof resolutionLabels];
  if (!label) throw new Error(`Unknown export fixture ${value}.`);
  const control = await getToolcraftControlFieldByTarget(
    page,
    "export.image.resolution",
  );
  const trigger = control.getByRole("combobox");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).click();
  await expect(trigger).toHaveAttribute("title", label);
}

export async function observeFrozenExportWidth(page: Page): Promise<string> {
  const control = await getToolcraftControlFieldByTarget(
    page,
    "export.image.resolution",
  );
  const title = await control.getByRole("combobox").getAttribute("title");
  const entry = Object.entries(resolutionLabels).find(([, label]) => label === title);
  if (!entry) throw new Error(`Could not observe export resolution ${title}.`);
  return entry[0];
}

export async function frozenDownloadSize(download: Download): Promise<number> {
  const stream = await download.createReadStream();
  if (!stream) return 0;
  let size = 0;
  for await (const chunk of stream) size += Buffer.byteLength(chunk);
  return size;
}
