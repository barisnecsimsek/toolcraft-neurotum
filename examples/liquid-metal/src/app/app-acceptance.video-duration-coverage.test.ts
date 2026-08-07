import { describe, expect, it } from "vitest";

import { sourceHasVideoDurationMetadataCoverage } from "./app-acceptance.source-test-utils";

describe("Toolcraft starter video duration acceptance coverage", () => {
  it("rejects fake video duration browser coverage that falls back to expected duration", () => {
    const fakeCoverage = `
      async function getVideoDuration(page, buffer, mimeType) {
        return page.evaluate(() => {
          const video = document.createElement("video");
          const url = URL.createObjectURL(new Blob([], { type: mimeType }));
          video.addEventListener("loadedmetadata", () => video.duration);
          video.src = url;
        });
      }

      test("browser: exports video", async ({ page }) => {
        const durationSeconds = "1";
        const videoBuffer = readFileSync(videoPath);
        const metadataCoverage = "loadedmetadata video.duration";
        let videoDuration = Number(durationSeconds);

        try {
          videoDuration = readWebmDurationSeconds(videoBuffer);
        } catch {
          videoDuration = Number(durationSeconds);
        }

        expect(metadataCoverage).toContain("loadedmetadata");
        expect(metadataCoverage).toContain("video.duration");
        expect(videoDuration).toBeLessThan(1.75);
      });
    `;

    expect(sourceHasVideoDurationMetadataCoverage(fakeCoverage)).toBe(false);
  });

  it("accepts video duration coverage that loads the exported blob as a video", () => {
    const realCoverage = `
      async function getVideoDuration(page, buffer, mimeType) {
        return page.evaluate(
          ({ encoded, mime }) =>
            new Promise((resolve, reject) => {
              const video = document.createElement("video");
              const bytes = new Uint8Array(atob(encoded).length);
              const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
              video.addEventListener("loadedmetadata", () => resolve(video.duration), {
                once: true,
              });
              video.addEventListener("error", () => reject(new Error("duration failed")));
              video.src = url;
            }),
          { encoded: buffer.toString("base64"), mime: mimeType },
        );
      }

      test("browser: exports video", async ({ page }) => {
        const durationSeconds = "1";
        await page.getByRole("button", { name: "Edit timeline duration" }).click();
        const videoDuration = await getVideoDuration(page, videoBuffer, mimeType);
        expect(videoDuration).toBeGreaterThan(Number(durationSeconds) - 0.25);
        expect(videoDuration).toBeLessThan(Number(durationSeconds) + 0.25);
      });
    `;

    expect(sourceHasVideoDurationMetadataCoverage(realCoverage)).toBe(true);
  });
});
