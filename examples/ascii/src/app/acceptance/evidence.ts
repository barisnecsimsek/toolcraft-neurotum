import type { ToolcraftComponentAcceptance } from "./types";

export function getAcceptanceEvidenceText(
  entry: ToolcraftComponentAcceptance,
): string {
  return [
    entry.automatedTestName,
    entry.browserTestName,
    entry.expectedObservable,
    entry.fixture,
    entry.userAction,
  ].join(" ");
}
