import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  collectToolcraftVerificationInputs,
  getToolcraftPerformanceBaselineReceiptPath,
  getToolcraftPerformanceReceiptPath,
} from "./toolcraft-verification-receipt.mjs";

export async function createReceiptFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-receipt-"));
  await fs.mkdir(path.join(rootDir, "src", "app"), { recursive: true });
  await fs.mkdir(path.join(rootDir, "e2e"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "src", "app", "app-schema.ts"),
    'export const schema = { mode: "initial" };\n',
  );
  await fs.writeFile(
    path.join(rootDir, "e2e", "app-performance.spec.ts"),
    'export const scenario = "heavy";\n',
  );
  await fs.writeFile(
    path.join(rootDir, "package.json"),
    JSON.stringify({ name: "receipt-fixture", private: true }),
  );
  return rootDir;
}

export function createPerformanceEvidenceFixture() {
  return {
    environment: {
      browser: { name: "chromium", version: "1" },
      calibration: { durationMs: 1, iterations: 1 },
      cpuThrottling: { mode: "none", rate: 1 },
      evidenceType: "performance-environment",
      hardwareConcurrency: 4,
      version: 1,
      viewport: { height: 720, width: 1280 },
    },
    matrixHash: "b".repeat(64),
    measurements: [{ pathId: "initial", phase: "cold" }],
    pipelineSummaries: [],
    profileCatalogVersion: 1,
    reportHash: "a".repeat(64),
  };
}

export async function writePassedCheckpointFixture(
  rootDir,
  { runner = "protected-playwright", writeBaseline = true } = {},
) {
  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const receipt = {
    checkpointReason: "first-working-version",
    completedAt: new Date().toISOString(),
    files: inventory.entries,
    kind: "performance-checkpoint",
    performanceEvidence: createPerformanceEvidenceFixture(),
    runner,
    sourceHash: inventory.sourceHash,
    status: "passed",
    version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  };
  const receiptPaths = [getToolcraftPerformanceReceiptPath(rootDir)];
  if (writeBaseline) {
    receiptPaths.push(getToolcraftPerformanceBaselineReceiptPath(rootDir));
  }
  await fs.mkdir(path.dirname(receiptPaths[0]), { recursive: true });
  await Promise.all(
    receiptPaths.map((receiptPath) =>
      fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`),
    ),
  );
  return receipt;
}
