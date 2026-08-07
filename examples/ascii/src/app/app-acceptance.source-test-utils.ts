import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const e2eDir = join(appDir, "../../e2e");
const routesDir = join(appDir, "../routes");

export function readBrowserTestSources(): string {
  return readdirSync(e2eDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .map((fileName) => readFileSync(join(e2eDir, fileName), "utf8"))
    .join("\n");
}

export function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function readSourceTree(
  rootDir: string,
  shouldSkipFile: (fileName: string, filePath: string) => boolean = () => false,
): string {
  const chunks: string[] = [];

  function visit(currentDir: string): void {
    for (const entryName of readdirSync(currentDir)) {
      const entryPath = join(currentDir, entryName);
      const entryStat = statSync(entryPath);

      if (entryStat.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (
        entryStat.isFile() &&
        /\.[cm]?[jt]sx?$/.test(entryName) &&
        !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entryName) &&
        !shouldSkipFile(entryName, entryPath)
      ) {
        chunks.push(readFileSync(entryPath, "utf8"));
      }
    }
  }

  visit(rootDir);

  return stripJsComments(chunks.join("\n"));
}

export function sourceDefinesProductCanvasContent(): boolean {
  const routeSource = readSourceTree(routesDir);

  return /canvasContent\s*=/.test(routeSource) || /renderDefaultCanvasMedia=\{false\}/.test(routeSource);
}

export function readRouteSource(): string {
  return readSourceTree(routesDir);
}

export function sourceHasVideoCapabilityCheck(source: string): boolean {
  return /\bMediaRecorder\.isTypeSupported\b|\bVideoEncoder\b|\bffmpeg\b|\bFFmpeg\b|\btranscoder\b|\bencoder\b/i.test(
    source,
  );
}

function sourceHasAwaitedVideoDurationRead(source: string): boolean {
  return (
    /\bawait\s+(?:get|read|load|resolve)[A-Za-z0-9_$]*Video[A-Za-z0-9_$]*Duration[A-Za-z0-9_$]*\s*\(/.test(
      source,
    ) ||
    /\b(?:const|let)\s+[A-Za-z0-9_$]*duration[A-Za-z0-9_$]*\s*=\s*await\s+page\.evaluate\s*\([\s\S]*?document\.createElement\s*\(\s*["']video["']\s*\)[\s\S]*?video\.duration/i.test(
      source,
    )
  );
}

function sourceHasFakeVideoDurationCoverage(source: string): boolean {
  return (
    /\bmetadataCoverage\b/.test(source) ||
    /["'`]loadedmetadata\s+video\.duration["'`]/.test(source) ||
    /\bcatch\s*\{[\s\S]{0,240}\b[A-Za-z0-9_$]*duration[A-Za-z0-9_$]*\s*=\s*(?:Number\s*\(\s*[A-Za-z0-9_$]+\s*\)|[A-Za-z0-9_$]+)/i.test(
      source,
    )
  );
}

export function sourceHasVideoDurationMetadataCoverage(source: string): boolean {
  const hasVideoMetadataReader =
    /\bdocument\.createElement\s*\(\s*["']video["']\s*\)/.test(source) &&
    /\bURL\.createObjectURL\b/.test(source) &&
    /\bloadedmetadata\b|\bonloadedmetadata\b/.test(source) &&
    /\bvideo\.duration\b/.test(source);

  return (
    hasVideoMetadataReader &&
    sourceHasAwaitedVideoDurationRead(source) &&
    /\btimeline duration\b|\btimelineDuration\b|\bdurationSeconds\b|\baria-valuemax\b/.test(
      source,
    ) &&
    !sourceHasFakeVideoDurationCoverage(source)
  );
}

export function sourceHasVideoDimensionMetadataCoverage(source: string): boolean {
  const hasVideoMetadataReader =
    /\bdocument\.createElement\s*\(\s*["']video["']\s*\)/.test(source) &&
    /\bURL\.createObjectURL\b/.test(source) &&
    /\bloadedmetadata\b|\bonloadedmetadata\b/.test(source) &&
    /\bvideo\.videoWidth\b/.test(source) &&
    /\bvideo\.videoHeight\b/.test(source);
  const hasResolutionCoverage =
    /\b(?:export\.video\.resolution|video resolution|resolution)\b/i.test(source) &&
    /\bcurrent\b/i.test(source) &&
    /\b4k\b/i.test(source);
  const has4kDimensionExpectation =
    /\b(?:3840|2160)\b/.test(source) || /\bgetToolcraftVideoExportSize\b/.test(source);

  return hasVideoMetadataReader && hasResolutionCoverage && has4kDimensionExpectation;
}

export function sourceHasCustomMovOrProResEncoder(source: string): boolean {
  return /\bVideoEncoder\b|\bffmpeg\b|\bFFmpeg\b|\bProRes\b|\bprores\b|\btranscoder\b/i.test(
    source,
  );
}

export function sourceUsesVideoExportSizeHelper(source: string): boolean {
  return /\bgetToolcraftVideoExportSize\b/.test(source);
}

export function sourceHasUnsafeVideoLongEdgeSizing(source: string): boolean {
  return (
    /\b(?:export\.video\.resolution|videoResolution|VideoResolution)\b[\s\S]{0,500}\b4096\b/i.test(
      source,
    ) ||
    /\b4096\b[\s\S]{0,500}\b(?:export\.video\.resolution|videoResolution|VideoResolution)\b/i.test(
      source,
    )
  );
}

export function sourceHasCaptureStreamBeforeCanvasSizing(source: string): boolean {
  const captureStreamMatches = Array.from(
    source.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\.captureStream\s*\(/g),
  );

  if (captureStreamMatches.length === 0) {
    return false;
  }

  return captureStreamMatches.some((match) => {
    const canvasName = match[1];
    const captureStreamIndex = match.index ?? 0;
    const beforeCaptureStream = source.slice(
      Math.max(0, captureStreamIndex - 2000),
      captureStreamIndex,
    );
    const escapedCanvasName = escapeRegExp(canvasName);

    return (
      !new RegExp(`\\b${escapedCanvasName}\\.width\\s*=`).test(beforeCaptureStream) ||
      !new RegExp(`\\b${escapedCanvasName}\\.height\\s*=`).test(beforeCaptureStream)
    );
  });
}

export function sourceHandlesVideoRecorderOrEncoderErrors(source: string): boolean {
  const usesMediaRecorder = /\bnew\s+MediaRecorder\b/.test(source);
  const usesVideoEncoder = /\bnew\s+VideoEncoder\b/.test(source);
  const mediaRecorderRejectsErrors =
    /\.\s*onerror\s*=[\s\S]{0,700}\b(?:reject|throw|Promise\.reject)\b/.test(source) ||
    /\.addEventListener\s*\(\s*["']error["'][\s\S]{0,900}\b(?:reject|throw|Promise\.reject)\b/.test(
      source,
    );
  const videoEncoderRejectsErrors =
    /\bnew\s+VideoEncoder\s*\(\s*\{[\s\S]{0,1200}\berror\s*:[\s\S]{0,700}\b(?:reject|throw|Promise\.reject)\b/.test(
      source,
    );

  if (usesMediaRecorder && !mediaRecorderRejectsErrors) {
    return false;
  }

  if (usesVideoEncoder && !videoEncoderRejectsErrors) {
    return false;
  }

  return true;
}

export function sourceHasImageExportDimensionCoverage(source: string): boolean {
  const hasImageDecoder =
    /\bcreateImageBitmap\b/.test(source) ||
    /\bnew\s+Image\s*\(/.test(source) ||
    /\bHTMLImageElement\b/.test(source);
  const hasDimensionRead =
    /\b(?:bitmap|image|img|png|exportedImage|decodedImage)\.(?:width|naturalWidth|videoWidth)\b/i.test(
      source,
    ) &&
    /\b(?:bitmap|image|img|png|exportedImage|decodedImage)\.(?:height|naturalHeight|videoHeight)\b/i.test(
      source,
    );
  const hasResolutionPreset =
    /\b(?:2k|4k|8k|2048|4096|8192)\b/i.test(source) &&
    /\b(?:export\.image\.resolution|image resolution|resolution)\b/i.test(source);

  return hasImageDecoder && hasDimensionRead && hasResolutionPreset;
}

export function sourcePassesImageResolutionToPngExport(source: string): boolean {
  if (
    /\bcreateToolcraftPngExportCanvas\s*\(\s*\{[\s\S]*\bresolution\s*:[\s\S]{0,320}\bexport\.image\.resolution\b/.test(
      source,
    )
  ) {
    return true;
  }

  const runtimeResolutionNames = Array.from(
    source.matchAll(
      /\b(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*(?:Resolution|resolution)[A-Za-z0-9_$]*)\s*=[\s\S]{0,220}\bexport\.image\.resolution\b/g,
    ),
  ).map((match) => match[1]);

  return runtimeResolutionNames.some((name) =>
    new RegExp(
      `\\bcreateToolcraftPngExportCanvas\\s*\\(\\s*\\{[\\s\\S]*\\bresolution\\s*:\\s*${name}\\b`,
    ).test(source),
  );
}

export function getProductImplementationSource(): string {
  return `${readSourceTree(routesDir)}\n${readSourceTree(appDir)}`;
}

export function getProductRuntimeImplementationSource(): string {
  return `${readSourceTree(routesDir)}\n${readSourceTree(appDir, (fileName) =>
    /^app-(schema|acceptance|performance)\.tsx?$/.test(fileName) ||
    fileName === "app-schema.ts"
  )}`;
}
