import assert from "node:assert/strict";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import spawn from "cross-spawn";

import { installToolcraftPlaywrightTestShim } from "./playwright-test-shim-fixture.mjs";
import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  collectToolcraftVerificationInputs,
  getToolcraftPerformanceBaselineReceiptPath,
  getToolcraftPerformanceReceiptPath,
} from "./toolcraft-verification-receipt.mjs";
import { createPerformanceEvidenceFixture } from "./toolcraft-verification-receipt-test-helpers.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const projectDir = path.dirname(scriptsDir);
export const runnerPath = path.join(scriptsDir, "run-browser-performance.mjs");

export function installToolcraftRuntimeFixtureDependency(rootDir) {
  const generatedRuntimeDir = path.join(
    projectDir,
    "src",
    "toolcraft",
    "runtime",
  );
  if (existsSync(generatedRuntimeDir)) {
    const relativeManifestPath = path.join(
      "performance",
      "profile-catalog-manifest.mjs",
    );
    const fixtureRuntimeDir = path.join(rootDir, "src", "toolcraft", "runtime");
    mkdirSync(path.join(fixtureRuntimeDir, "performance"), { recursive: true });
    copyFileSync(
      path.join(generatedRuntimeDir, relativeManifestPath),
      path.join(fixtureRuntimeDir, relativeManifestPath),
    );
    return;
  }

  mkdirSync(path.join(rootDir, "node_modules", "@repo"), { recursive: true });
  symlinkSync(
    realpathSync(path.join(projectDir, "..", "packages", "toolcraft-runtime")),
    path.join(rootDir, "node_modules", "@repo", "toolcraft-runtime"),
    process.platform === "win32" ? "junction" : "dir",
  );
}

export function createVerificationFixture(prefix) {
  const rootDir = mkdtempSync(path.join(tmpdir(), `toolcraft-${prefix}-`));
  mkdirSync(path.join(rootDir, "src", "app"), { recursive: true });
  mkdirSync(path.join(rootDir, "src", "toolcraft"), { recursive: true });
  writeFileSync(path.join(rootDir, "src", "app.ts"), "export const value = 1;\n");
  writeFileSync(
    path.join(rootDir, "src", "toolcraft", ".toolcraft-manifest.json"),
    '{"protectedFiles":{}}\n',
  );
  return rootDir;
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function readPlaywrightShimEvents(rootDir) {
  const eventsPath = path.join(
    rootDir,
    "node_modules/.toolcraft-playwright-test-shim/events.jsonl",
  );
  return readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function writePassedCheckpointFixture(rootDir) {
  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const receipt = {
    checkpointReason: "first-working-version",
    completedAt: "2026-07-14T00:00:00.000Z",
    files: inventory.entries,
    kind: "performance-checkpoint",
    performanceEvidence: createPerformanceEvidenceFixture(),
    runner: "protected-playwright",
    sourceHash: inventory.sourceHash,
    status: "passed",
    version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  };
  for (const receiptPath of [
    getToolcraftPerformanceBaselineReceiptPath(rootDir),
    getToolcraftPerformanceReceiptPath(rootDir),
  ]) {
    mkdirSync(path.dirname(receiptPath), { recursive: true });
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
  return receipt;
}

export function createProtectedRunnerFixture(
  playwrightListReport = {
    errors: [],
    suites: [{
      title: "app-controls.spec.ts",
      specs: [{
        title: "browser perf: focused renderer path",
        tags: [],
        tests: [{ projectName: "" }],
      }],
    }],
  },
) {
  const rootDir = createVerificationFixture("protected-runner");
  const fixtureScriptsDir = path.join(rootDir, "scripts");
  const binDir = path.join(rootDir, "node_modules", ".bin");
  mkdirSync(fixtureScriptsDir, { recursive: true });
  mkdirSync(binDir, { recursive: true });
  for (const fileName of [
    "run-browser-performance.mjs",
    "playwright-test-title-selection.mjs",
    "toolcraft-performance-report.mjs",
    "toolcraft-performance-receipt-policy.mjs",
    "toolcraft-source-inventory.mjs",
    "toolcraft-source-ownership.mjs",
    "toolcraft-targeted-performance-report.mjs",
    "toolcraft-verification-inventory.mjs",
    "toolcraft-verification-receipt.mjs",
  ]) {
    copyFileSync(path.join(scriptsDir, fileName), path.join(fixtureScriptsDir, fileName));
  }
  symlinkSync(
    realpathSync(path.join(projectDir, "node_modules", "cross-spawn")),
    path.join(rootDir, "node_modules", "cross-spawn"),
    process.platform === "win32" ? "junction" : "dir",
  );
  installToolcraftRuntimeFixtureDependency(rootDir);
  installToolcraftPlaywrightTestShim({
    listReport: playwrightListReport,
    rootDir,
  });
  for (const binary of ["tsc", "vite"]) {
    const binaryPath = path.join(
      binDir,
      process.platform === "win32" ? `${binary}.cmd` : binary,
    );
    writeFileSync(
      binaryPath,
      process.platform === "win32"
        ? "@echo off\r\nexit /b 0\r\n"
        : "#!/usr/bin/env node\nprocess.exitCode = 0;\n",
    );
    if (process.platform !== "win32") chmodSync(binaryPath, 0o755);
  }
  return rootDir;
}

export function invokeRunner(rootDir, fileName, args = [], env = process.env) {
  return spawn.sync(
    process.execPath,
    [path.join(rootDir, "scripts", fileName), ...args],
    { cwd: rootDir, encoding: "utf8", env, timeout: 10_000 },
  );
}

export function runProtectedRunner(rootDir, args = []) {
  const result = invokeRunner(rootDir, "run-browser-performance.mjs", args);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}
