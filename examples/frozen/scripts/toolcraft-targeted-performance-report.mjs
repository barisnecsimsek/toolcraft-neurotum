import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export const TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_VERSION = 1;

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueSortedStringArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) => typeof item === "string" && item.length > 0 && item.trim() === item,
    ) &&
    new Set(value).size === value.length &&
    value.every((item, index) => index === 0 || compareCodeUnits(value[index - 1], item) < 0)
  );
}

export function getToolcraftTargetedPerformanceReportError(
  report,
  expected = {},
) {
  if (
    !isRecord(report) ||
    report.version !== TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_VERSION ||
    typeof report.nonce !== "string" ||
    report.nonce.length === 0 ||
    !/^[a-f0-9]{64}$/u.test(report.sourceHash ?? "") ||
    !isUniqueSortedStringArray(report.performancePassIds) ||
    !isUniqueSortedStringArray(report.performancePathIds) ||
    !isUniqueSortedStringArray(report.testNames)
  ) {
    return "Toolcraft targeted performance report is malformed.";
  }
  for (const [field, actual] of [
    ["nonce", report.nonce],
    ["sourceHash", report.sourceHash],
  ]) {
    if (expected[field] !== undefined && expected[field] !== actual) {
      return `Toolcraft targeted performance report ${field} does not match the protected runner.`;
    }
  }
  for (const field of ["performancePassIds", "performancePathIds", "testNames"]) {
    if (
      expected[field] !== undefined &&
      JSON.stringify(expected[field]) !== JSON.stringify(report[field])
    ) {
      return `Toolcraft targeted performance report ${field} does not match the protected runner.`;
    }
  }
  return undefined;
}

export function createToolcraftTargetedPerformanceReport(value) {
  const report = Object.freeze({
    nonce: value.nonce,
    performancePassIds: Object.freeze([...value.performancePassIds].sort(compareCodeUnits)),
    performancePathIds: Object.freeze([...value.performancePathIds].sort(compareCodeUnits)),
    sourceHash: value.sourceHash,
    testNames: Object.freeze([...value.testNames].sort(compareCodeUnits)),
    version: TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_VERSION,
  });
  const error = getToolcraftTargetedPerformanceReportError(report);
  if (error) throw new Error(error);
  return report;
}

export async function writeToolcraftTargetedPerformanceReport(filePath, value) {
  const report = createToolcraftTargetedPerformanceReport(value);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.rename(temporaryPath, filePath);
  return report;
}

export function writeToolcraftTargetedPerformanceReportSync(filePath, value) {
  const report = createToolcraftTargetedPerformanceReport(value);
  fsSync.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fsSync.writeFileSync(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
  fsSync.renameSync(temporaryPath, filePath);
  return report;
}

export async function readToolcraftTargetedPerformanceReport(filePath, expected) {
  let report;
  try {
    report = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Toolcraft targeted performance report is missing.");
    }
    throw new Error("Toolcraft targeted performance report is malformed JSON.");
  }
  const validationError = getToolcraftTargetedPerformanceReportError(report, expected);
  if (validationError) throw new Error(validationError);
  return report;
}
