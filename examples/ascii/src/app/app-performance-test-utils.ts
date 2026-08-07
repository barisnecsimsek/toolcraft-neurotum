import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

export const appDir = dirname(fileURLToPath(import.meta.url));
export const srcDir = join(appDir, "..");
export const routesDir = join(appDir, "../routes");
export const e2eDir = join(appDir, "../../e2e");
export const projectDir = join(appDir, "../..");

export function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function readFiles(rootDir: string, matcher: RegExp): string {
  const chunks: string[] = [];

  function visit(currentDir: string) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!["dist", "node_modules", "toolcraft"].includes(entry.name)) {
          visit(filePath);
        }
        continue;
      }

      if (
        entry.isFile() &&
        matcher.test(entry.name) &&
        !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) &&
        !/^(?:starter-|app-)(?:acceptance|performance)(?:[.-].*)?\.ts$/.test(entry.name)
      ) {
        chunks.push(readFileSync(filePath, "utf8"));
      }
    }
  }

  visit(rootDir);
  return chunks.join("\n");
}

export function readSiblingAppTestSources(): string {
  return readdirSync(appDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .filter((fileName) => !/^app-performance(?:\..*)?\.test\.[cm]?[jt]sx?$/.test(fileName))
    .map((fileName) => readFileSync(join(appDir, fileName), "utf8"))
    .map(stripJsComments)
    .join("\n");
}

export function readBrowserTestSources(): string {
  return readdirSync(e2eDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .map((fileName) => readFileSync(join(e2eDir, fileName), "utf8"))
    .map(stripJsComments)
    .join("\n");
}

export function readMarkdownFiles(rootDir: string): string {
  if (!existsSync(rootDir)) {
    return "";
  }

  const chunks: string[] = [];

  function visit(currentDir: string) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!["dist", "node_modules", "toolcraft"].includes(entry.name)) {
          visit(filePath);
        }
        continue;
      }

      if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
        chunks.push(readFileSync(filePath, "utf8"));
      }
    }
  }

  visit(rootDir);
  return chunks.join("\n");
}

export function readProjectDecisionSources(): string {
  return stripJsComments(
    [
      readMarkdownFiles(join(projectDir, "docs")),
      readMarkdownFiles(join(projectDir, "specs")),
      readMarkdownFiles(join(projectDir, "plans")),
    ].join("\n"),
  );
}

export function projectDocsIncludeRendererTechniqueDecision(): boolean {
  const decisionSources = readProjectDecisionSources();

  return [
    /Renderer Technique Decision Matrix/i,
    /sourceRepresentation/,
    /productRepresentation/,
    /previewRenderer/,
    /exportRenderer/,
    /rendererWorkload/,
    /rendererStrategy/,
    /whyNotAlternativeStrategies/,
    /fidelityRisks/,
    /performanceRisks/,
  ].every((pattern) => pattern.test(decisionSources));
}

export function projectDocsIncludeRendererLayerInventory(): boolean {
  const decisionSources = readProjectDecisionSources();

  return (
    /Renderer Layer Inventory|rendererTechnique\.layers|layer inventory/i.test(decisionSources) &&
    /backgroundLayer|productForegroundLayer|editingHandlesLayer|exportComposite|product-foreground/i.test(
      decisionSources,
    )
  );
}

export function projectDocsIncludeRendererPipelineInventory(): boolean {
  const decisionSources = readProjectDecisionSources();

  return (
    /Render Pipeline Inventory|rendererPipeline|render pipeline/i.test(decisionSources) &&
    /pass|passes|cacheKey|cache key|invalidat/i.test(decisionSources) &&
    /control-drag|viewport-zoom|viewport-drag|media-import|animation-frame|timeline-playback|interaction/i.test(
      decisionSources,
    )
  );
}

export function projectDocsExplainRendererAlternatives(): boolean {
  const decisionSources = readProjectDecisionSources();

  return (
    /whyNotAlternativeStrategies/.test(decisionSources) &&
    /alternative|strategy|renderer/i.test(decisionSources) &&
    /text-output|vector-output|pixel-output|rendererWorkload/.test(decisionSources) &&
    /exportRenderer|export\/copy|product-quality/i.test(decisionSources)
  );
}

export function sourceUsesCustomRenderer(): boolean {
  const routeSources = stripJsComments(readFiles(routesDir, /\.(ts|tsx)$/));
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return (
    /canvasContent\s*=/.test(routeSources) ||
    /renderDefaultCanvasMedia=\{false\}/.test(routeSources) ||
    /useToolcraft(Value)?\(/.test(appSources) ||
    /getContext\(["']2d["']\)|webgl|webgpu|OffscreenCanvas|ImageData/.test(appSources)
  );
}

export function sourceUsesHardcodedOutputBackgroundColor(
  source = stripJsComments(readFiles(srcDir, /\.(ts|tsx|css)$/)),
): boolean {
  const canvasFillPattern =
    /(?:ctx|context|canvasContext)\.fillStyle\s*=\s*["']#[0-9a-fA-F]{3,8}["'][\s\S]{0,240}\.fillRect\s*\(/;
  const outputCssBackgroundPattern =
    /\.(?:[a-z0-9_-]*(?:canvas|renderer|preview|output|product)[a-z0-9_-]*)\s*{[^}]*background(?:-color)?\s*:\s*#[0-9a-fA-F]{3,8}/i;

  return canvasFillPattern.test(source) || outputCssBackgroundPattern.test(source);
}

export function schemaHasOutputBackgroundColorControl(): boolean {
  return (appSchema.panels.controls?.sections ?? []).some((section) =>
    Object.values(section.controls).some((control) => {
      if (control.type !== "color") {
        return false;
      }

      const searchText = [
        section.title,
        typeof control.label === "string" ? control.label : "",
        control.target,
      ].join(" ");

      return /\b(background|backdrop|scene|canvas)\b/i.test(searchText);
    }),
  );
}

export function projectDocsIncludeFixedBackgroundDecision(): boolean {
  return /fixedBackgroundReason|fixed background|non-editable background|not user-editable background|reference-defined background|product-defined background/i.test(
    readProjectDecisionSources(),
  );
}

export function sourceUsesCpuPixelLoop(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const cpuPixelMethodCallPattern =
    /(?:\.(?:createImageData|getImageData|putImageData)|\[\s*["'](?:createImageData|getImageData|putImageData)["']\s*\])\s*\(/;

  return (
    /new\s+ImageData\s*\(/.test(appSources) ||
    cpuPixelMethodCallPattern.test(appSources)
  );
}

export function appPerformanceHasRenderPipelinePass(kind: string): boolean {
  return (appPerformance.rendererPipeline?.passes ?? []).some(
    (pass) => pass.kind === kind,
  );
}

export function appPerformanceHasInteractionInvalidation(interaction: string): boolean {
  return (appPerformance.rendererPipeline?.interactionInvalidation ?? []).some(
    (entry) => entry.interaction === interaction,
  );
}

export function sourceUsesGpuRenderer(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return /getContext\(["']webgl2?["']\)|navigator\.gpu|GPUCanvasContext/.test(appSources);
}

export function sourceUsesWebGlLifecycleGuard(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return (
    /useEffect\s*\(/.test(appSources) ||
    /useLayoutEffect\s*\(/.test(appSources) ||
    /useMemo\s*\(/.test(appSources) ||
    /useRef\s*\(/.test(appSources) ||
    /class\s+\w+Renderer/.test(appSources)
  );
}

export function sourceCreatesWebGlContextInComponentRender(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const componentRenderPattern =
    /function\s+[A-Z]\w*\s*\([^)]*\)\s*{(?![\s\S]{0,600}use(?:Layout)?Effect\s*\()[\s\S]{0,600}\.getContext\(["']webgl2?["']\)/;

  return componentRenderPattern.test(appSources);
}

export function sourceMayUploadTextureFromTimelineDrivenEffect(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const timelineDrivenTextureUploadPattern =
    /use(?:Layout)?Effect\s*\(\s*\(\)\s*=>\s*{[\s\S]*?(?:texImage2D\s*\(|\.setImage\s*\()[\s\S]*?}\s*,\s*\[[\s\S]*?(?:settings|state\.timeline|currentTimeSeconds|keyframeGroups)[\s\S]*?\]\s*\)/;

  return timelineDrivenTextureUploadPattern.test(appSources);
}

export function sourceResyncsTimelineDurationFromRuntimeDuration(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));
  const durationResyncPattern =
    /use(?:Layout)?Effect\s*\(\s*\(\)\s*=>\s*{[\s\S]*?timeline\.setDuration[\s\S]*?}\s*,\s*\[[\s\S]*state\.timeline\.durationSeconds[\s\S]*\]\s*\)/;

  return durationResyncPattern.test(appSources);
}

export function sourceUsesLowResolutionPreviewUpscale(source = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/))): boolean {
  const lowResolutionPreviewPattern =
    /maxPreviewPixels|previewPixelBudget|previewScale|previewRatio|lowRes|lowResolution|downsample/i;
  const scaledDrawImagePattern =
    /\.drawImage\s*\([\s\S]{0,240}(?:outputWidth|outputHeight|state\.canvas\.size|canvas\.width|canvas\.height)[\s\S]{0,240}\)/;

  return lowResolutionPreviewPattern.test(source) || scaledDrawImagePattern.test(source);
}

export function browserTestsAssertNativePreviewResolution(): boolean {
  const browserTestSources = readBrowserTestSources();

  return (
    /previewWidth|previewHeight|clientWidth|clientHeight|getBoundingClientRect/.test(
      browserTestSources,
    ) &&
    /outputWidth|outputHeight|state\.canvas\.size|canvas\.size|toHaveAttribute/.test(
      browserTestSources,
    )
  );
}

export function browserPerfContractRequiresRenderScaleBackingPixels(): boolean {
  const browserTestSources = readBrowserTestSources();

  return (
    /scenarioUsesRenderScaleFixture/.test(browserTestSources) &&
    /expectToolcraftCanvasBackingPixelsForRenderScale/.test(browserTestSources)
  );
}

export function sourceUsesAnimationFrameWithoutCleanup(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return /requestAnimationFrame\s*\(/.test(appSources) && !/cancelAnimationFrame\s*\(/.test(appSources);
}

export function sourceUsesDirectStorageApi(): boolean {
  const appSources = stripJsComments(readFiles(srcDir, /\.(ts|tsx)$/));

  return /\b(?:localStorage|sessionStorage)\s*\./.test(appSources);
}
