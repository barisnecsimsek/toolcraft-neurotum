export type ToolcraftTargetedPerformanceReport = Readonly<{
  nonce: string;
  performancePassIds: readonly string[];
  performancePathIds: readonly string[];
  sourceHash: string;
  testNames: readonly string[];
  version: 1;
}>;

export const TOOLCRAFT_TARGETED_PERFORMANCE_REPORT_VERSION: 1;

export function getToolcraftTargetedPerformanceReportError(
  report: unknown,
  expected?: Partial<ToolcraftTargetedPerformanceReport>,
): string | undefined;

export function createToolcraftTargetedPerformanceReport(
  value: Omit<ToolcraftTargetedPerformanceReport, "version">,
): ToolcraftTargetedPerformanceReport;

export function writeToolcraftTargetedPerformanceReport(
  filePath: string,
  value: Omit<ToolcraftTargetedPerformanceReport, "version">,
): Promise<ToolcraftTargetedPerformanceReport>;

export function writeToolcraftTargetedPerformanceReportSync(
  filePath: string,
  value: Omit<ToolcraftTargetedPerformanceReport, "version">,
): ToolcraftTargetedPerformanceReport;

export function readToolcraftTargetedPerformanceReport(
  filePath: string,
  expected?: Partial<ToolcraftTargetedPerformanceReport>,
): Promise<ToolcraftTargetedPerformanceReport>;
