import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  collectToolcraftVerificationInputs,
  getChangedFiles,
  getToolcraftPerformanceBaselineReceiptPath,
  getToolcraftPerformanceReceiptPath,
  validateToolcraftPerformanceReceipt,
} from "./toolcraft-verification-receipt.mjs";
import * as receiptModule from "./toolcraft-verification-receipt.mjs";
import {
  createPerformanceEvidenceFixture,
  createReceiptFixture as createFixture,
  writePassedCheckpointFixture,
} from "./toolcraft-verification-receipt-test-helpers.mjs";

test("does not expose a reusable passed-checkpoint writer", () => {
  assert.equal("writeToolcraftPerformanceReceipt" in receiptModule, false);
});

test("does not expose deleted impact or iteration authority", () => {
  assert.equal(
    "validateToolcraftCurrentVerificationImpactInventory" in receiptModule,
    false,
  );
  assert.equal("getToolcraftPerformanceIterationContext" in receiptModule, false);
  assert.equal("TOOLCRAFT_PERFORMANCE_ITERATION_REASON" in receiptModule, false);
  assert.equal(
    "getToolcraftPerformanceIterationVerificationError" in receiptModule,
    false,
  );
  assert.equal("writeToolcraftPerformanceIteration" in receiptModule, false);
});

test("rejects verification inputs that change during a protected checkpoint", () => {
  const assertStable = receiptModule.assertToolcraftVerificationInputsUnchanged;
  assert.equal(typeof assertStable, "function");
  assert.doesNotThrow(() =>
    assertStable({
      baseline: { entries: [], sourceHash: "same" },
      current: { entries: [], sourceHash: "same" },
      phase: "after build",
    }),
  );
  assert.throws(
    () =>
      assertStable({
        baseline: { entries: [], sourceHash: "before" },
        current: { entries: [], sourceHash: "after" },
        phase: "after Playwright",
      }),
    /verification inputs changed.*after Playwright.*rerun the active protected verification command/iu,
  );
});

test("requires a structured receipt instead of prose-only performance claims", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await fs.mkdir(path.join(rootDir, "docs", "toolcraft"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "docs", "toolcraft", "agent-worklog.md"),
    "- Run: pnpm verify:perf passed\n",
  );

  const errors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /performance receipt is missing/iu);
});

test("requires the durable protected baseline even when a current checkpoint exists", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await writePassedCheckpointFixture(rootDir, { writeBaseline: false });

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /performance baseline receipt is missing/iu,
  );
});

test("accepts a passed receipt only while its source inventory is current", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await writePassedCheckpointFixture(rootDir);

  assert.deepEqual(await validateToolcraftPerformanceReceipt({ rootDir }), []);

  await fs.writeFile(
    path.join(rootDir, "src", "app", "app-schema.ts"),
    'export const schema = { mode: "changed" };\n',
  );
  const staleErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(staleErrors.length, 1);
  assert.match(staleErrors[0], /stale/iu);
});

test("rejects manual agent-browser receipts without automated runner proof", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  await writePassedCheckpointFixture(rootDir, { runner: "agent-browser" });

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /supported runner/iu,
  );
});

test("rejects a receipt whose file inventory does not produce its source hash", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        checkpointReason: "first-working-version",
        completedAt: new Date().toISOString(),
        files: [],
        kind: "performance-checkpoint",
        performanceEvidence: createPerformanceEvidenceFixture(),
        runner: "protected-playwright",
        sourceHash: inventory.sourceHash,
        status: "passed",
        version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
      },
      null,
      2,
    )}\n`,
  );

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /file inventory.*source hash/iu,
  );
});

test("invalidates a checkpoint when the npm dependency graph changes", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const packageLockPath = path.join(rootDir, "package-lock.json");
  await fs.writeFile(
    packageLockPath,
    JSON.stringify({ lockfileVersion: 3, packages: {} }),
  );
  await writePassedCheckpointFixture(rootDir);

  await fs.writeFile(
    packageLockPath,
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "node_modules/example": { version: "2.0.0" } },
    }),
  );

  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /stale/iu,
  );
});

test("rejects malformed and non-passed receipts", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, "not json");
  const malformedErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(malformedErrors.length, 1);
  assert.match(malformedErrors[0], /malformed/iu);

  await writePassedCheckpointFixture(rootDir);
  const failedReceipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  failedReceipt.status = "failed";
  await fs.writeFile(receiptPath, `${JSON.stringify(failedReceipt, null, 2)}\n`);
  const failedErrors = await validateToolcraftPerformanceReceipt({ rootDir });
  assert.equal(failedErrors.length, 1);
  assert.match(failedErrors[0], /passed/iu);
});

test("rejects unsupported current and baseline receipt versions", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));

  for (const receiptPath of [
    getToolcraftPerformanceReceiptPath(rootDir),
    getToolcraftPerformanceBaselineReceiptPath(rootDir),
  ]) {
    await writePassedCheckpointFixture(rootDir);
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.version = TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION - 1;
    await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    assert.match(
      (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
      /unsupported version/iu,
    );
  }
});

test("rejects ownership-unverified legacy iteration claims", async (t) => {
  const rootDir = await createFixture();
  t.after(() => fs.rm(rootDir, { force: true, recursive: true }));
  const baseline = await writePassedCheckpointFixture(rootDir);
  await fs.writeFile(
    path.join(rootDir, "src", "app", "app-schema.ts"),
    'export const schema = { mode: "legacy-iteration" };\n',
  );
  const inventory = await collectToolcraftVerificationInputs(rootDir);
  const receiptPath = getToolcraftPerformanceReceiptPath(rootDir);
  const iteration = {
    baselineEvidenceHash: baseline.performanceEvidence.reportHash,
    baselineSourceHash: baseline.sourceHash,
    changedFiles: getChangedFiles(baseline.files, inventory.entries),
    completedAt: new Date().toISOString(),
    files: inventory.entries,
    kind: "performance-iteration",
    reasonCode: "post-first-working-targeted-verification",
    sourceHash: inventory.sourceHash,
    status: "passed-targeted",
    verification: {
      browserTests: ["browser: legacy acceptance"],
      checks: ["typecheck", "build", "playwright-targeted-functional"],
      performancePassIds: [],
      performancePathIds: [],
      performanceTests: [],
      runner: "protected-iteration",
      unitTests: [],
    },
    verificationTier: 2,
    version: TOOLCRAFT_PERFORMANCE_RECEIPT_VERSION,
  };
  await fs.writeFile(receiptPath, `${JSON.stringify(iteration, null, 2)}\n`);
  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /cannot validate targeted iteration ownership.*regenerate.*current starter\/CLI/iu,
  );

  iteration.changedFiles = [];
  await fs.writeFile(receiptPath, `${JSON.stringify(iteration, null, 2)}\n`);
  assert.match(
    (await validateToolcraftPerformanceReceipt({ rootDir }))[0],
    /cannot validate targeted iteration ownership.*regenerate.*current starter\/CLI/iu,
  );
});
