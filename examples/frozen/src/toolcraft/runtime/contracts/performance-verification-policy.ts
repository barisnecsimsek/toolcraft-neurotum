export const TOOLCRAFT_PERFORMANCE_VERIFICATION_POLICY = {
  agentBrowser:
    "Agent-controlled browser checks are limited to diagnosis and targeted visual investigation; they do not mint durable performance baselines or receipts.",
  explicitPerformanceRefresh:
    "Explicit later performance work requires the protected Playwright pnpm verify:perf:refresh command to refresh durable performance evidence.",
  firstStable:
    "The first stable working product requires the protected Playwright pnpm verify:perf checkpoint before pnpm verify:final so the durable baseline and current receipt are machine-produced.",
  ordinaryLaterEdit:
    "Ordinary later edits use the protected targeted iteration runner with exact tests and a baseline-linked current receipt instead of rerunning or refreshing the full checkpoint.",
} as const;

export const TOOLCRAFT_PERFORMANCE_VERIFICATION_LIFECYCLE = {
  diagnosis: {
    durableEvidence: false,
    purposes: ["diagnosis", "targeted-visual-investigation"],
    runner: "agent-browser",
  },
  durableEvidence: {
    explicitRefreshCommand: "verify:perf:refresh",
    firstStableCommand: "verify:perf",
    ordinaryIterationCommand: "verify:perf:record-iteration",
    runner: "protected-playwright",
  },
} as const;

export const TOOLCRAFT_PERFORMANCE_VERIFICATION_POLICY_TEXT = [
  TOOLCRAFT_PERFORMANCE_VERIFICATION_POLICY.agentBrowser,
  TOOLCRAFT_PERFORMANCE_VERIFICATION_POLICY.firstStable,
  TOOLCRAFT_PERFORMANCE_VERIFICATION_POLICY.explicitPerformanceRefresh,
  TOOLCRAFT_PERFORMANCE_VERIFICATION_POLICY.ordinaryLaterEdit,
].join(" ");
