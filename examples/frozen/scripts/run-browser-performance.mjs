#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import spawn from "cross-spawn";

import {
  getToolcraftPerformanceReportPath,
  readAndValidateToolcraftPerformanceReport,
} from "./toolcraft-performance-report.mjs";

import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  assertToolcraftVerificationInputsUnchanged,
  clearToolcraftPerformanceReceipt,
  collectToolcraftVerificationInputs,
  getToolcraftPerformanceBaselineReceiptPath,
  getToolcraftPerformanceReceiptPath,
} from "./toolcraft-verification-receipt.mjs";

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const [, , ...requestedArguments] = process.argv;
const reasonArguments = requestedArguments.filter((argument) =>
  argument.startsWith("--reason="),
);
const unsupportedArguments = requestedArguments.filter(
  (argument) => argument !== "--" && !argument.startsWith("--reason="),
);
if (unsupportedArguments.length > 0) {
  throw new Error(
    `Toolcraft protected performance checkpoints do not accept Playwright arguments: ${unsupportedArguments.join(" ")}. Run Playwright directly for targeted diagnosis.`,
  );
}
if (reasonArguments.length > 1) {
  throw new Error("Toolcraft performance checkpoint accepts at most one --reason.");
}
const requestedReason = reasonArguments[0]?.slice("--reason=".length);
if (
  requestedReason !== undefined &&
  requestedReason !== "explicit-performance-work"
) {
  throw new Error(
    "Toolcraft performance checkpoint --reason must be explicit-performance-work.",
  );
}

function getBinaryPath(name) {
  return path.join(
    projectDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name,
  );
}

const playwrightBin = getBinaryPath("playwright");
const tscBin = getBinaryPath("tsc");
const viteBin = getBinaryPath("vite");

const baselineReceiptPath = getToolcraftPerformanceBaselineReceiptPath(projectDir);
let hasDurableBaseline = true;
try {
  await access(baselineReceiptPath);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  hasDurableBaseline = false;
}
if (hasDurableBaseline && requestedReason !== "explicit-performance-work") {
  throw new Error(
    "A durable performance baseline already exists in this frozen legacy snapshot. It does not support current targeted verification ownership; regenerate a fresh app from the current starter/CLI before a later delivery or performance iteration. Rerun this full checkpoint only for explicit performance work with --reason=explicit-performance-work.",
  );
}
if (!hasDurableBaseline && requestedReason !== undefined) {
  throw new Error(
    "The first working performance checkpoint must run without --reason; explicit-performance-work refresh is only valid after a durable baseline exists.",
  );
}

const checkpointReason = hasDurableBaseline
  ? "explicit-performance-work"
  : "first-working-version";
const baselineInventory = await collectToolcraftVerificationInputs(projectDir);
const checkpointStartedAtMs = Date.now();
const performanceReportNonce = randomUUID();
const performanceReportPath = getToolcraftPerformanceReportPath(projectDir);
await clearToolcraftPerformanceReceipt(projectDir);
await rm(performanceReportPath, { force: true });

await Promise.all([playwrightBin, tscBin, viteBin].map((filePath) => access(filePath)));

function runBinary(binaryPath, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { env, stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${path.basename(binaryPath)} exited after signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${path.basename(binaryPath)} exited with code ${code ?? 1}.`));
        return;
      }
      resolve();
    });
  });
}

async function writeCheckpointFile(receiptPath, receipt) {
  const temporaryPath = `${receiptPath}.${process.pid}.tmp`;
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await rename(temporaryPath, receiptPath);
}

async function writeToolcraftPerformanceCheckpointReceipts(inventory, evidence) {
  const receipt = {
    checkpointReason,
    completedAt: new Date().toISOString(),
    files: inventory.entries,
    kind: "performance-checkpoint",
    performanceEvidence: evidence,
    runner: "protected-playwright",
    sourceHash: inventory.sourceHash,
    status: "passed",
    version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  };
  await writeCheckpointFile(
    baselineReceiptPath,
    receipt,
  );
  await writeCheckpointFile(getToolcraftPerformanceReceiptPath(projectDir), receipt);
}

await runBinary(tscBin, ["-p", "tsconfig.json", "--noEmit"]);
await runBinary(viteBin, ["build"]);
assertToolcraftVerificationInputsUnchanged({
  baseline: baselineInventory,
  current: await collectToolcraftVerificationInputs(projectDir),
  phase: "during the production build",
});
await runBinary(playwrightBin, ["install", "chromium"]);
await runBinary(
  playwrightBin,
  [
    "test",
    "--grep",
    "browser perf:",
    "--workers=1",
  ],
  {
    ...process.env,
    TOOLCRAFT_BROWSER_SERVER_MODE: "preview",
    TOOLCRAFT_PERFORMANCE_FIXTURE_SELECTOR: "maximum",
    TOOLCRAFT_PERFORMANCE_REPORT_NONCE: performanceReportNonce,
    TOOLCRAFT_PERFORMANCE_REPORT_PATH: performanceReportPath,
    TOOLCRAFT_PERFORMANCE_REPORT_SOURCE_HASH: baselineInventory.sourceHash,
  },
);
const verifiedInventory = await collectToolcraftVerificationInputs(projectDir);
assertToolcraftVerificationInputsUnchanged({
  baseline: baselineInventory,
  current: verifiedInventory,
  phase: "during Playwright",
});
const validatedReport = await readAndValidateToolcraftPerformanceReport({
  nonce: performanceReportNonce,
  notBeforeMs: checkpointStartedAtMs,
  reportPath: performanceReportPath,
  sourceHash: verifiedInventory.sourceHash,
});
await writeToolcraftPerformanceCheckpointReceipts(
  verifiedInventory,
  validatedReport.evidence,
);
