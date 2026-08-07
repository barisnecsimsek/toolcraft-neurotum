import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { appAcceptance } from "./app-acceptance";
import { readBrowserTestSources } from "./app-acceptance.source-test-utils";

const currentFileName = basename(fileURLToPath(import.meta.url));
const appDir = dirname(fileURLToPath(import.meta.url));

function readSiblingAppTestSources(): string {
  return readdirSync(appDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .filter((fileName) => fileName !== currentFileName)
    .map((fileName) => readFileSync(join(appDir, fileName), "utf8"))
    .join("\n");
}

function acceptanceCoversTimelineDurationEdit(
  entry: (typeof appAcceptance)[number],
): boolean {
  return (
    entry.timelinePlaybackCoverage === "all-playback-behavior" ||
    (Array.isArray(entry.timelinePlaybackCoverage) &&
      entry.timelinePlaybackCoverage.includes("duration"))
  );
}

describe("starter acceptance test coverage contract", () => {
  it("requires each acceptance entry to point at an automated app test", () => {
    const testSources = readSiblingAppTestSources();

    for (const entry of appAcceptance) {
      if (!entry.automated) {
        continue;
      }

      expect(
        testSources,
        `${entry.id} must be backed by an app test named "${entry.automatedTestName}".`,
      ).toContain(entry.automatedTestName);
    }
  });

  it("requires each browser acceptance entry to point at a fallback Playwright test", () => {
    const browserTestSources = readBrowserTestSources();

    for (const entry of appAcceptance) {
      if (!entry.browser) {
        continue;
      }

      expect(
        browserTestSources,
        `${entry.id} must be backed by a fallback Playwright test named "${entry.browserTestName}".`,
      ).toContain(entry.browserTestName);

      if (entry.timelineCoverage === "playback" && acceptanceCoversTimelineDurationEdit(entry)) {
        expect(
          browserTestSources,
          `${entry.id} duration coverage must click the real timeline duration editor.`,
        ).toContain("Edit timeline duration");
        expect(
          browserTestSources,
          `${entry.id} duration coverage must edit the contenteditable timeline duration textbox.`,
        ).toContain('name: "timeline duration"');
        expect(
          browserTestSources,
          `${entry.id} duration coverage must prove the playback range changes after editing duration.`,
        ).toMatch(/aria-valuemax|durationSeconds/);
      }
    }
  });
});
