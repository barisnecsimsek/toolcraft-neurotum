import { defineConfig, devices } from "@playwright/test";

import { findAvailablePort, readPreferredPort } from "./scripts/toolcraft-port.mjs";

const resolvedTestPortEnvName = "TOOLCRAFT_RESOLVED_TEST_PORT";
const resolvedTestPort = Number(process.env[resolvedTestPortEnvName]);
const preferredTestPort = readPreferredPort([
  resolvedTestPortEnvName,
  "TOOLCRAFT_TEST_PORT",
  "TOOLCRAFT_PORT",
  "PORT",
]);
const testPort =
  Number.isInteger(resolvedTestPort) && resolvedTestPort > 0 && resolvedTestPort <= 65_535
    ? resolvedTestPort
    : await findAvailablePort(preferredTestPort);
const testBaseUrl = `http://localhost:${testPort}`;
const browserServerMode =
  process.env.TOOLCRAFT_BROWSER_SERVER_MODE === "preview" ? "preview" : "dev";
const performanceReportValues = {
  nonce: process.env.TOOLCRAFT_PERFORMANCE_REPORT_NONCE,
  path: process.env.TOOLCRAFT_PERFORMANCE_REPORT_PATH,
  sourceHash: process.env.TOOLCRAFT_PERFORMANCE_REPORT_SOURCE_HASH,
};
const hasAnyPerformanceReportValue = Object.values(performanceReportValues).some(Boolean);
const hasAllPerformanceReportValues = Object.values(performanceReportValues).every(Boolean);
if (hasAnyPerformanceReportValue && !hasAllPerformanceReportValues) {
  throw new Error(
    "Toolcraft protected performance reporting requires nonce, path, and source hash together.",
  );
}
const checkpointReport = hasAllPerformanceReportValues
  ? {
      nonce: performanceReportValues.nonce!,
      path: performanceReportValues.path!,
      sourceHash: performanceReportValues.sourceHash!,
    }
  : undefined;
const targetedPerformanceReportValues = {
  nonce: process.env.TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_NONCE,
  passIds: process.env.TOOLCRAFT_TARGETED_PERFORMANCE_PASS_IDS,
  path: process.env.TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_PATH,
  sourceHash: process.env.TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_SOURCE_HASH,
};
const hasAnyTargetedPerformanceReportValue = Object.values(
  targetedPerformanceReportValues,
).some(Boolean);
const hasAllTargetedPerformanceReportValues = Object.values(
  targetedPerformanceReportValues,
).every(Boolean);
if (
  hasAnyTargetedPerformanceReportValue &&
  !hasAllTargetedPerformanceReportValues
) {
  throw new Error(
    "Toolcraft targeted performance reporting requires nonce, pass ids, path, and source hash together.",
  );
}
const targetedPerformanceReport = hasAllTargetedPerformanceReportValues
  ? {
      nonce: targetedPerformanceReportValues.nonce!,
      passIds: JSON.parse(targetedPerformanceReportValues.passIds!) as string[],
      path: targetedPerformanceReportValues.path!,
      sourceHash: targetedPerformanceReportValues.sourceHash!,
    }
  : undefined;
process.env[resolvedTestPortEnvName] = String(testPort);

if (!resolvedTestPort && testPort !== preferredTestPort) {
  console.error(
    `[toolcraft] Browser test port ${preferredTestPort} is busy; using ${testPort} instead.`,
  );
}

export default defineConfig({
  forbidOnly: true,
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: [
    ["list"],
    [
      "./e2e/browser-runtime-evidence-reporter.ts",
      { checkpointReport, targetedPerformanceReport },
    ],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: testBaseUrl,
    viewport: { height: 720, width: 1280 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm exec -- vite ${browserServerMode} --host 127.0.0.1 --port ${testPort} --strictPort`,
    reuseExistingServer: false,
    timeout: 60_000,
    url: testBaseUrl,
  },
});
