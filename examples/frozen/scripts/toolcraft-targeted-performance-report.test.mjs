import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createToolcraftTargetedPerformanceReport,
  readToolcraftTargetedPerformanceReport,
  writeToolcraftTargetedPerformanceReport,
} from "./toolcraft-targeted-performance-report.mjs";

const sourceHash = "a".repeat(64);
const value = {
  nonce: "runner-nonce",
  performancePassIds: ["composite"],
  performancePathIds: ["control-drag:composite"],
  sourceHash,
  testNames: ["browser perf: control-drag composite"],
};

test("normalizes and validates exact targeted evidence", () => {
  assert.deepEqual(createToolcraftTargetedPerformanceReport(value), {
    ...value,
    version: 1,
  });
});

test("rejects malformed or mismatched targeted evidence", async () => {
  assert.throws(
    () => createToolcraftTargetedPerformanceReport({ ...value, performancePathIds: [] }),
    /malformed/iu,
  );

  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-targeted-report-"));
  const reportPath = path.join(rootDir, "report.json");
  await writeToolcraftTargetedPerformanceReport(reportPath, value);
  await assert.rejects(
    readToolcraftTargetedPerformanceReport(reportPath, {
      performancePathIds: ["unrelated-path"],
    }),
    /performancePathIds does not match/iu,
  );
  await fs.rm(rootDir, { force: true, recursive: true });
});
