#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertToolcraftVerificationInputsUnchanged,
  collectToolcraftVerificationInputs,
} from "./toolcraft-verification-inventory.mjs";
import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  getToolcraftPerformanceReceiptShapeError,
} from "./toolcraft-performance-receipt-policy.mjs";
export {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  assertToolcraftVerificationInputsUnchanged,
  collectToolcraftVerificationInputs,
};
function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function getVerificationReceiptPath(rootDir, fileName) {
  return path.join(path.resolve(rootDir), ".toolcraft", "verification", fileName);
}

export function getToolcraftPerformanceReceiptPath(rootDir) {
  return getVerificationReceiptPath(rootDir, "performance.json");
}

export function getToolcraftPerformanceBaselineReceiptPath(rootDir) {
  return getVerificationReceiptPath(rootDir, "performance-baseline.json");
}

export async function clearToolcraftPerformanceReceipt(rootDir) {
  await fs.rm(getToolcraftPerformanceReceiptPath(rootDir), { force: true });
}

async function readReceipt(receiptPath) {
  let source;
  try {
    source = await fs.readFile(receiptPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { missing: true };
    throw error;
  }
  try {
    return { receipt: JSON.parse(source) };
  } catch {
    return { malformed: true };
  }
}

export function getChangedFiles(previousFiles, currentFiles) {
  const previous = new Map(previousFiles.map((entry) => [entry.path, entry.sha256]));
  const current = new Map(currentFiles.map((entry) => [entry.path, entry.sha256]));
  return [...new Set([...previous.keys(), ...current.keys()])]
    .filter((filePath) => previous.get(filePath) !== current.get(filePath))
    .sort(compareCodeUnits);
}

async function loadDurableBaseline(rootDir) {
  const loaded = await readReceipt(getToolcraftPerformanceBaselineReceiptPath(rootDir));
  if (loaded.missing) {
    return { error: "Toolcraft performance baseline receipt is missing. Run pnpm verify:perf once for the first stable working version." };
  }
  if (loaded.malformed) {
    return { error: "Toolcraft performance baseline receipt is malformed JSON." };
  }
  const shapeError = getToolcraftPerformanceReceiptShapeError(loaded.receipt);
  if (shapeError || loaded.receipt.kind !== "performance-checkpoint") {
    return {
      error:
        shapeError ??
        "Toolcraft performance baseline must be a protected passed performance checkpoint.",
    };
  }
  return { receipt: loaded.receipt };
}

export async function validateToolcraftPerformanceReceipt({ rootDir }) {
  const loaded = await readReceipt(getToolcraftPerformanceReceiptPath(rootDir));
  if (loaded.missing) {
    return [
      "Toolcraft performance receipt is missing. This frozen compatibility snapshot can validate existing receipts but cannot record a new targeted iteration.",
    ];
  }
  if (loaded.malformed) {
    return ["Toolcraft performance receipt is malformed JSON."];
  }

  const shapeError = getToolcraftPerformanceReceiptShapeError(loaded.receipt);
  if (shapeError) return [shapeError];

  const baseline = await loadDurableBaseline(rootDir);
  if (baseline.error) return [baseline.error];

  if (loaded.receipt.kind === "performance-checkpoint") {
    if (loaded.receipt.sourceHash !== baseline.receipt.sourceHash) {
      return [
        "Toolcraft current performance checkpoint does not match the durable performance baseline.",
      ];
    }
  } else {
    return [
      "This frozen legacy snapshot cannot validate targeted iteration ownership because its legacy impact authority was removed. Regenerate a fresh app from the current starter/CLI before a later delivery or performance iteration; use the supported full checkpoint only for first-stable or explicit performance work.",
    ];
  }

  const inventory = await collectToolcraftVerificationInputs(rootDir);
  if (loaded.receipt.sourceHash !== inventory.sourceHash) {
    return [
      "Toolcraft performance receipt is stale because product or verification inputs changed after the recorded verification pass.",
    ];
  }
  return [];
}

async function runCli() {
  const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [command = "validate", ...args] = process.argv.slice(2);

  if (command !== "validate") {
    throw new Error(`Unknown Toolcraft verification receipt command: ${command}.`);
  }
  const errors = await validateToolcraftPerformanceReceipt({ rootDir: projectDir });
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  console.log("Toolcraft performance receipt and durable baseline are current and valid.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
