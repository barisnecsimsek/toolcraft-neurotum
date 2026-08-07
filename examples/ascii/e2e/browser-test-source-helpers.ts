import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = dirname(fileURLToPath(import.meta.url));
const metaBrowserSpecPattern = /^app-browser-.*\.spec\.[cm]?[jt]sx?$/;
const performanceSpecPattern = /^app-performance\.spec\.[cm]?[jt]sx?$/;

export type BrowserTestSource = {
  fileName: string;
  source: string;
};

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

type BrowserTestSourceReadOptions = {
  excludeFileNamePatterns?: readonly RegExp[];
};

function readBrowserTestSources({
  excludeFileNamePatterns = [],
}: BrowserTestSourceReadOptions = {}): BrowserTestSource[] {
  return readdirSync(e2eDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .filter(
      (fileName) => !excludeFileNamePatterns.some((pattern) => pattern.test(fileName)),
    )
    .map((fileName) => ({
      fileName,
      source: stripJsComments(readFileSync(join(e2eDir, fileName), "utf8")),
    }));
}

export function readFallbackBrowserTestSources(): BrowserTestSource[] {
  return readBrowserTestSources({
    excludeFileNamePatterns: [metaBrowserSpecPattern],
  });
}

export function readFallbackPerformanceBrowserTestSources(): BrowserTestSource[] {
  return readBrowserTestSources({
    excludeFileNamePatterns: [metaBrowserSpecPattern, performanceSpecPattern],
  });
}

export function findNamedBrowserTestSource(
  sources: readonly BrowserTestSource[],
  testName: string,
): string | undefined {
  const testStartPattern = new RegExp(
    `(?:test|it)(?:\\.[\\w]+)?\\(\\s*(["'\`])${escapeRegExp(testName)}\\1`,
  );
  const nextTestPattern = /\n\s*(?:test|it)(?:\.[\w]+)?\(\s*["'`]/;

  for (const { source } of sources) {
    const match = testStartPattern.exec(source);
    if (!match) {
      continue;
    }

    const startIndex = match.index;
    const afterStart = source.slice(startIndex + 1);
    const nextMatchIndex = afterStart.search(nextTestPattern);

    return source.slice(
      startIndex,
      nextMatchIndex === -1 ? undefined : startIndex + 1 + nextMatchIndex,
    );
  }

  return undefined;
}

export function hasProductObservableHelper(source: string): boolean {
  return /expectToolcraftProductObservableToChange\s*\(|getToolcraftProductObservableSnapshot\s*\(/.test(
    source,
  );
}

export function hasRealLayerRowInteraction(source: string): boolean {
  return /data-layer-id|data-template-layer-name|selectLayerByName\s*\(|layerRowByName\s*\(|getByRole\s*\(\s*(["'`])option\1/i.test(
    source,
  );
}

export function hasRealLayerVisibilityInteraction(source: string): boolean {
  return /toggleLayerVisibilityByName\s*\(|getByRole\s*\([\s\S]*?(Hide|Show|Disable|Enable).*layer|aria-label[\s\S]*?(Hide|Show|Disable|Enable)/i.test(
    source,
  );
}

export function hasRealLayerDragInteraction(source: string): boolean {
  return /\.dragTo\s*\(|page\.mouse\.(?:down|move|up)\s*\(|dragLayer(?:Before|After|ToGroup|ByName)?\s*\(/i.test(
    source,
  );
}

export function hasLayerGroupTarget(source: string): boolean {
  return /data-template-layer-kind[\s\S]*group|groupLayerByName\s*\(|dragLayerToGroup\s*\(|getByRole\s*\(\s*(["'`])option\1[\s\S]*Group/i.test(
    source,
  );
}
