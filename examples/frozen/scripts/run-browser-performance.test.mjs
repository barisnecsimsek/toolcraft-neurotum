import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import spawn from "cross-spawn";

import {
  getToolcraftPerformanceBaselineReceiptPath,
  getToolcraftPerformanceReceiptPath,
  validateToolcraftPerformanceReceipt,
} from "./toolcraft-verification-receipt.mjs";
import {
  createProtectedRunnerFixture,
  invokeRunner,
  projectDir,
  readJson,
  readPlaywrightShimEvents,
  runProtectedRunner,
  runnerPath,
} from "./run-browser-performance-test-helpers.mjs";

test("protected performance runner rejects Playwright filters before launching tools", () => {
  const receiptPath = path.join(
    projectDir,
    ".toolcraft",
    "verification",
    "performance.json",
  );
  const baselinePath = path.join(
    projectDir,
    ".toolcraft",
    "verification",
    "performance-baseline.json",
  );
  const hadReceipt = existsSync(receiptPath);
  const hadBaseline = existsSync(baselinePath);
  const originalReceipt = hadReceipt ? readFileSync(receiptPath) : undefined;
  const originalBaseline = hadBaseline ? readFileSync(baselinePath) : undefined;
  const sentinelReceipt = Buffer.from("protected receipt sentinel\n");
  const sentinelBaseline = Buffer.from("protected baseline sentinel\n");
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, sentinelReceipt);
  writeFileSync(baselinePath, sentinelBaseline);

  try {
    const result = spawn.sync(
      process.execPath,
      [runnerPath, "e2e/app-performance.spec.ts"],
      {
        cwd: projectDir,
        encoding: "utf8",
        timeout: 5_000,
      },
    );

    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /do not accept Playwright arguments.*app-performance\.spec\.ts/iu,
    );
    assert.deepEqual(readFileSync(receiptPath), sentinelReceipt);
    assert.deepEqual(readFileSync(baselinePath), sentinelBaseline);
  } finally {
    if (originalReceipt) writeFileSync(receiptPath, originalReceipt);
    else rmSync(receiptPath, { force: true });
    if (originalBaseline) writeFileSync(baselinePath, originalBaseline);
    else rmSync(baselinePath, { force: true });
  }
});

test("protected runner preserves the first baseline unless performance work is explicit", async (t) => {
  const rootDir = createProtectedRunnerFixture();
  t.after(() => rmSync(rootDir, { force: true, recursive: true }));
  const baselinePath = getToolcraftPerformanceBaselineReceiptPath(rootDir);
  const currentPath = getToolcraftPerformanceReceiptPath(rootDir);
  runProtectedRunner(rootDir);
  const firstBaseline = readJson(baselinePath);
  assert.deepEqual(readJson(currentPath), firstBaseline);
  assert.match(firstBaseline.performanceEvidence.reportHash, /^[a-f0-9]{64}$/u);
  assert.equal(firstBaseline.performanceEvidence.profileCatalogVersion, 1);
  assert.equal(firstBaseline.performanceEvidence.measurements.length, 3);
  assert.equal(
    readPlaywrightShimEvents(rootDir).findLast(
      (event) => event.event === "completed",
    )?.fixtureSelector,
    "maximum",
  );

  writeFileSync(path.join(rootDir, "src", "app.ts"), "export const value = 2;\n");
  const repeated = invokeRunner(rootDir, "run-browser-performance.mjs");
  assert.notEqual(repeated.status, 0);
  assert.match(
    `${repeated.stdout}\n${repeated.stderr}`,
    /frozen legacy snapshot.*regenerate.*current starter\/cli.*explicit performance work/iu,
  );
  assert.doesNotMatch(
    `${repeated.stdout}\n${repeated.stderr}`,
    /use post-first-working targeted verification/iu,
  );
  assert.deepEqual(readJson(baselinePath), firstBaseline);

  runProtectedRunner(rootDir, ["--reason=explicit-performance-work"]);
  const secondBaseline = readJson(baselinePath);
  const secondCurrent = readJson(currentPath);

  assert.notEqual(secondBaseline.sourceHash, firstBaseline.sourceHash);
  assert.equal(secondBaseline.checkpointReason, "explicit-performance-work");
  assert.deepEqual(secondCurrent, secondBaseline);
  assert.equal(secondBaseline.kind, "performance-checkpoint");
  assert.deepEqual(await validateToolcraftPerformanceReceipt({ rootDir }), []);
});
