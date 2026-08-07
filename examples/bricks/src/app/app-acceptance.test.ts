import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import {
  defineToolcraft,
  type ToolcraftActionSchema,
  type ResolvedToolcraftAppSchema,
} from "@/toolcraft/runtime";

import {
  getToolcraftControlOrderTargets,
  type ToolcraftComponentAcceptance,
  appAcceptance,
  appProductReadiness,
  appTransferMode,
  validateToolcraftAcceptanceCoverage,
} from "./app-acceptance";
import { appSchema } from "./app-schema";

const currentFileName = basename(fileURLToPath(import.meta.url));
const appDir = dirname(fileURLToPath(import.meta.url));
const e2eDir = join(appDir, "../../e2e");
const projectDir = join(appDir, "../..");
const routesDir = join(appDir, "../routes");
const agentWorklogPath = join(projectDir, "docs/toolcraft/agent-worklog.md");
const toolcraftAppRenderPattern =
  /<\s*ToolcraftApp\b|React\.createElement\s*\(\s*ToolcraftApp\b/;
const runtimeSurfaceComponentNames = [
  "ToolcraftRoot",
  "CanvasShell",
  "ControlsPanel",
  "LayersPanel",
  "TimelinePanel",
  "ToolbarPanel",
] as const;
const runtimeSurfaceNamePattern = runtimeSurfaceComponentNames.join("|");
const manualRuntimeSurfaceRenderPattern =
  new RegExp(
    `<\\s*(?:(?:${runtimeSurfaceNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${runtimeSurfaceNamePattern})\\b)|React\\.createElement\\s*\\(\\s*(?:(?:${runtimeSurfaceNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${runtimeSurfaceNamePattern})\\b)`,
  );
const lowLevelRuntimeSurfaceImportPattern = new RegExp(
  `import\\s*\\{[^}]*\\b(?:${runtimeSurfaceNamePattern})\\b[^}]*\\}\\s*from\\s*["'][^"']*runtime/react["']`,
);
const builtInControlComponentNames = [
  "ActionsControl",
  "AnchorGridControl",
  "ChannelMixerControl",
  "CheckboxControl",
  "CodeTextareaControl",
  "ColorControl",
  "ColorOpacityControl",
  "CurvesControl",
  "FileDropControl",
  "FontPickerControl",
  "GradientControl",
  "ImagePickerControl",
  "PaletteControl",
  "PanelActionsControl",
  "RangeInputControl",
  "RangeSliderControl",
  "SegmentedControl",
  "SelectControl",
  "SliderControl",
  "SwitchControl",
  "TextInputControl",
  "VectorControl",
] as const;
const builtInControlNamePattern = builtInControlComponentNames.join("|");
const repoUiImportPattern = "@repo" + "/ui";
const builtInControlImportSourcePattern = ["toolcraft/ui", repoUiImportPattern].join("|");
const builtInControlImportPattern = new RegExp(
  `import\\s*\\{[^}]*\\b(?:${builtInControlNamePattern})\\b[^}]*\\}\\s*from\\s*["'][^"']*(?:${builtInControlImportSourcePattern})[^"']*["']`,
);
const directBuiltInControlRenderPattern = new RegExp(
  `<\\s*(?:(?:${builtInControlNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${builtInControlNamePattern})\\b)|React\\.createElement\\s*\\(\\s*(?:(?:${builtInControlNamePattern})\\b|[A-Za-z_$][\\w$]*\\.(?:${builtInControlNamePattern})\\b)`,
);
const customTimelineTransportRenderPattern =
  /<\s*[A-Z][A-Za-z0-9]*(?:Playback|Timeline|Transport)(?:Panel|Controls|Bar)\b/;
const requiredAgentWorklogDecisionSections = [
  "Renderer",
  "Timeline",
  "Layers",
  "Controls",
  "Export",
  "Performance",
] as const;
const requiredAgentWorklogSections = [
  "Status",
  "Decisions",
  "Decision Trail",
  ...requiredAgentWorklogDecisionSections,
  "Evidence",
  "Verification",
  "Risks",
] as const;
const requiredAgentWorklogDecisionTrailFields = [
  "Request",
  "Task type",
  "User-visible result",
  "Source/reference checked",
  "Docs/contracts read",
  "Contract rules applied",
  "Decision",
  "Alternatives rejected",
  "State/output mapping",
  "Files changed",
  "Verification",
  "Skipped checks",
  "Risks",
] as const;

const playbackTimelineAcceptance: ToolcraftComponentAcceptance = {
  automated: true,
  automatedTestName: "connects timeline playback controls to runtime state contract",
  browser: true,
  browserTestName: "browser: timeline playback transport controls runtime time",
  componentType: "timeline",
  evidence: "timeline-output",
  expectedObservable:
    "The timeline transport changes runtime playback state, editing timeline duration changes the playback range, and playback-only controls render without keyframe rows.",
  fixture: "starter playback timeline fixture",
  id: "timeline.playback",
  kind: "runtime",
  target: "timeline.playback",
  timelineCoverage: "playback",
  timelinePlaybackCoverage: [
    "pause-resume",
    "scrub",
    "duration",
    "loop",
    "rendered-frame",
  ],
  userAction:
    "Edit timeline duration, scrub the playback range, then pause and resume playback from the timeline panel.",
};

function makeControlAcceptance(
  target: string,
  componentType: string,
): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: `${target} changes product output`,
    browser: true,
    browserTestName: `browser: ${target} changes product output`,
    componentType,
    evidence: "product-output",
    expectedObservable: `${target} changes the rendered product output.`,
    fixture: `${target} fixture`,
    id: target,
    kind: "control",
    target,
    userAction: `Change ${target}.`,
  };
}

function createSettingsTransferThresholdSchema(settingsTransfer: false | "auto" = false) {
  return defineToolcraft({
    canvas: { enabled: true },
    panels: {
      controls: {
        sections: [
          {
            controls: Object.fromEntries(
              Array.from({ length: 12 }, (_, index) => [
                `control${index}`,
                {
                  defaultValue: index,
                  label: `Control ${index + 1}`,
                  orderRole: "detail",
                  target: `settings.control${index}`,
                  type: "slider",
                },
              ]),
            ),
            title: "Transform",
          },
        ],
        title: "Complex Settings",
      },
    },
    settingsTransfer,
  });
}

function createSettingsTransferThresholdAcceptance() {
  return Array.from({ length: 12 }, (_, index) =>
    makeControlAcceptance(`settings.control${index}`, "slider"),
  );
}

function createSettingsTransferBelowThresholdWithCanvasSizeSchema() {
  return defineToolcraft({
    canvas: { enabled: true, size: { height: 720, unit: "px", width: 1280 } },
    panels: {
      controls: {
        sections: [
          {
            controls: Object.fromEntries(
              Array.from({ length: 10 }, (_, index) => [
                `control${index}`,
                {
                  defaultValue: index,
                  label: `Control ${index + 1}`,
                  orderRole: "detail",
                  target: `settings.control${index}`,
                  type: "slider",
                },
              ]),
            ),
            title: "Transform",
          },
        ],
        title: "Below Threshold Settings",
      },
    },
    settingsTransfer: false,
  });
}

function createSettingsTransferBelowThresholdWithCanvasSizeAcceptance() {
  return [
    makeControlAcceptance("canvas.size.width", "text"),
    makeControlAcceptance("canvas.size.height", "text"),
    ...Array.from({ length: 10 }, (_, index) =>
      makeControlAcceptance(`settings.control${index}`, "slider"),
    ),
  ];
}

function readSiblingAppTestSources(): string {
  return readdirSync(appDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .filter((fileName) => fileName !== currentFileName)
    .map((fileName) => readFileSync(join(appDir, fileName), "utf8"))
    .join("\n");
}

function readBrowserTestSources(): string {
  return readdirSync(e2eDir)
    .filter((fileName) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName))
    .map((fileName) => readFileSync(join(e2eDir, fileName), "utf8"))
    .join("\n");
}

function readToolcraftDoc(relativePath: string): string {
  return readFileSync(join(projectDir, "docs/toolcraft", relativePath), "utf8");
}

function acceptanceCoversTimelineDurationEdit(
  entry: (typeof appAcceptance)[number],
): boolean {
  return (
    entry.timelinePlaybackCoverage === "all-playback-behavior" ||
    (Array.isArray(entry.timelinePlaybackCoverage) &&
      entry.timelinePlaybackCoverage.includes("duration"))
  );
}

function stripJsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function getMarkdownHeadingLevel(line: string): number | null {
  const match = /^(#{1,6})\s+\S/.exec(line);

  return match ? match[1].length : null;
}

function getMarkdownSectionBody(source: string, heading: string): string {
  const lines = source.split(/\r?\n/);
  const headingPattern = new RegExp(`^(#{1,6})\\s+${escapeRegExp(heading)}\\s*$`, "i");
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (startIndex < 0) {
    return "";
  }

  const startLevel = getMarkdownHeadingLevel(lines[startIndex]);
  const bodyLines: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const nextLevel = getMarkdownHeadingLevel(lines[index]);

    if (startLevel !== null && nextLevel !== null && nextLevel <= startLevel) {
      break;
    }

    bodyLines.push(lines[index]);
  }

  return bodyLines.join("\n").trim();
}

function getAgentWorklogDecisionTrailIterations(
  decisionTrailBody: string,
): Array<{ body: string; heading: string }> {
  const iterations: Array<{ body: string; heading: string }> = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of decisionTrailBody.split(/\r?\n/)) {
    const headingMatch = /^###\s+(.+?)\s*$/.exec(line.trim());

    if (headingMatch) {
      if (currentHeading) {
        iterations.push({ body: currentBody.join("\n").trim(), heading: currentHeading });
      }

      currentHeading = headingMatch[1];
      currentBody = [];
      continue;
    }

    if (currentHeading) {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    iterations.push({ body: currentBody.join("\n").trim(), heading: currentHeading });
  }

  return iterations;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAgentWorklogValidationErrors(source: string): string[] {
  const errors: string[] = [];

  for (const section of requiredAgentWorklogSections) {
    if (!getMarkdownSectionBody(source, section)) {
      errors.push(`agent-worklog.md must include a populated "${section}" section.`);
    }
  }

  const statusBody = getMarkdownSectionBody(source, "Status");

  if (!/\bMode:\s*product\b/i.test(statusBody)) {
    errors.push('agent-worklog.md Status must declare "Mode: product" before final delivery.');
  }

  if (/\bMode:\s*starter\b/i.test(statusBody)) {
    errors.push('agent-worklog.md still declares "Mode: starter"; replace the starter template with product decisions.');
  }

  for (const section of requiredAgentWorklogDecisionSections) {
    const body = getMarkdownSectionBody(source, section);

    if (!/\bDecision:\s*\S/i.test(body)) {
      errors.push(`agent-worklog.md "${section}" must include a concrete Decision.`);
    }

    if (!/\bReason:\s*\S/i.test(body)) {
      errors.push(`agent-worklog.md "${section}" must include the Reason for the decision.`);
    }

    if (!/\bEvidence:\s*\S/i.test(body)) {
      errors.push(`agent-worklog.md "${section}" must include Evidence such as files, tests, browser checks, or contract rules.`);
    }
  }

  const decisionTrailBody = getMarkdownSectionBody(source, "Decision Trail");
  const decisionTrailIterations = getAgentWorklogDecisionTrailIterations(decisionTrailBody);

  if (decisionTrailIterations.length === 0) {
    errors.push("agent-worklog.md Decision Trail must include at least one iteration heading.");
  }

  for (const iteration of decisionTrailIterations) {
    for (const field of requiredAgentWorklogDecisionTrailFields) {
      const fieldPattern = new RegExp(`\\b${escapeRegExp(field)}:\\s*\\S`, "i");

      if (!fieldPattern.test(iteration.body)) {
        errors.push(
          `agent-worklog.md Decision Trail iteration "${iteration.heading}" must include "${field}:".`,
        );
      }
    }
  }

  const evidenceBody = getMarkdownSectionBody(source, "Evidence");
  const verificationBody = getMarkdownSectionBody(source, "Verification");
  const risksBody = getMarkdownSectionBody(source, "Risks");

  if (!/\b(Source reviewed|Contract applied|Evidence):\s*\S/i.test(evidenceBody)) {
    errors.push("agent-worklog.md Evidence must name reviewed files, references, or contract rules.");
  }

  if (!/\bpnpm\s+(verify|test|build|typecheck)|browser|Playwright|perf/i.test(verificationBody)) {
    errors.push("agent-worklog.md Verification must list concrete test/build/browser/performance checks.");
  }

  if (!/\b(Risk|None):\s*\S/i.test(risksBody)) {
    errors.push('agent-worklog.md Risks must include either "Risk:" entries or "None:" with a reason.');
  }

  return errors;
}

function readSourceTree(
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

function readAppImplementationSource(): string {
  return [readSourceTree(routesDir), readSourceTree(appDir)].join("\n");
}

function isNeutralTemplateProject(): boolean {
  return new Set(["starter", "toolcraft-template"]).has(basename(projectDir));
}

function sourceDefinesProductCanvasContent(): boolean {
  const routeSource = readSourceTree(routesDir);

  return /canvasContent\s*=/.test(routeSource) || /renderDefaultCanvasMedia=\{false\}/.test(routeSource);
}

function schemaHasProductSurface(): boolean {
  return (
    (appSchema.panels.controls?.sections ?? []).some(
      (section) => Object.keys(section.controls).length > 0,
    ) ||
    appSchema.panels.layers === true ||
    appSchema.panels.timeline?.enabled === true ||
    sourceDefinesProductCanvasContent() ||
    appAcceptance.length > 0
  );
}

function getPanelActionSearchText(action: ToolcraftActionSchema | string): string {
  return typeof action === "string"
    ? action
    : [action.label ?? "", action.value, action.icon ?? ""].join(" ");
}

function getSchemaPanelActionSearchTexts(): string[] {
  return (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.values(section.controls).flatMap((control) => {
      if (control.type !== "panelActions") {
        return [];
      }

      return (control.actions ?? []).map(getPanelActionSearchText);
    }),
  );
}

type ResolvedControlsSection =
  NonNullable<ResolvedToolcraftAppSchema["panels"]["controls"]>["sections"][number];

type ResolvedControl = ResolvedControlsSection["controls"][string];

function normalizeSectionTitle(title: string | undefined): string {
  return (title ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getSchemaVideoExportSection(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ResolvedControlsSection | undefined {
  return (schema.panels.controls?.sections ?? []).find(
    (section) => normalizeSectionTitle(section.title) === "video export",
  );
}

function getSchemaImageExportSection(
  schema: ResolvedToolcraftAppSchema = appSchema,
): ResolvedControlsSection | undefined {
  return (schema.panels.controls?.sections ?? []).find(
    (section) => normalizeSectionTitle(section.title) === "image export",
  );
}

function getSectionControlByTarget(
  section: ResolvedControlsSection | undefined,
  target: string,
): ResolvedControl | undefined {
  if (!section) {
    return undefined;
  }

  return Object.values(section.controls).find((control) => control.target === target);
}

function getSectionControlIdByTarget(
  section: ResolvedControlsSection | undefined,
  target: string,
): string | undefined {
  if (!section) {
    return undefined;
  }

  return Object.entries(section.controls).find(([, control]) => control.target === target)?.[0];
}

function getControlOptionValues(control: ResolvedControl | undefined): string[] {
  return control?.options?.map((option) => option.value.toLowerCase()) ?? [];
}

function makeBackgroundSection() {
  return {
    controls: {
      includeBackground: {
        defaultValue: true,
        description:
          "Controls live preview product background and PNG background transparency while video keeps the background.",
        label: "Include",
        target: "export.includeBackground",
        type: "switch",
      },
      background: {
        defaultValue: "#0F0F0F",
        label: false,
        target: "appearance.background",
        type: "color",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["includeBackground", "background"],
        layout: "inline",
      },
    ],
    title: "Background",
  } as const;
}

function makeImageExportSection() {
  return {
    controls: {
      imageFormat: {
        defaultValue: "png",
        label: "Format",
        options: [
          { label: "PNG", value: "png" },
          { label: "JPG", value: "jpg" },
        ],
        target: "export.image.format",
        type: "select",
      },
      imageResolution: {
        defaultValue: "4k",
        label: "Resolution",
        options: [
          { label: "2K", value: "2k" },
          { label: "4K", value: "4k" },
          { label: "8K", value: "8k" },
        ],
        target: "export.image.resolution",
        type: "select",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["imageFormat", "imageResolution"],
        layout: "inline",
      },
    ],
    title: "Image Export",
  } as const;
}

function makeVideoExportSection() {
  return {
    controls: {
      videoFormat: {
        defaultValue: "mp4",
        label: "Format",
        options: [
          { label: "MP4", value: "mp4" },
          { label: "WebM", value: "webm" },
        ],
        target: "export.video.format",
        type: "select",
      },
      videoResolution: {
        defaultValue: "current",
        label: "Resolution",
        options: [
          { label: "Current", value: "current" },
          { label: "4K", value: "4k" },
        ],
        target: "export.video.resolution",
        type: "select",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["videoFormat", "videoResolution"],
        layout: "inline",
      },
    ],
    title: "Video Export",
  } as const;
}

function sourceHasVideoCapabilityCheck(source: string): boolean {
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

function sourceHasVideoDurationMetadataCoverage(source: string): boolean {
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

function sourceHasCustomMovOrProResEncoder(source: string): boolean {
  return /\bVideoEncoder\b|\bffmpeg\b|\bFFmpeg\b|\bProRes\b|\bprores\b|\btranscoder\b/i.test(
    source,
  );
}

function sourceHasImageExportDimensionCoverage(source: string): boolean {
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

function sourcePassesImageResolutionToPngExport(source: string): boolean {
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

function getProductImplementationSource(): string {
  return `${readSourceTree(routesDir)}\n${readSourceTree(appDir)}`;
}

function getProductRuntimeImplementationSource(): string {
  return `${readSourceTree(routesDir)}\n${readSourceTree(appDir, (fileName) =>
    /^app-(schema|acceptance|performance)\.tsx?$/.test(fileName) ||
    fileName === "app-schema.ts"
  )}`;
}

function removePngExportCanvasHelperCalls(source: string): string {
  return source.replace(
    /\bcreateToolcraftPngExportCanvas\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    "createToolcraftPngExportCanvas({})",
  );
}

function removePreviewBackgroundHelperReads(source: string): string {
  return source.replace(
    /\nfunction\s+\w*PreviewBackground\w*\s*\([^)]*\)\s*:\s*boolean\s*\{[\s\S]*?\n\}\n/g,
    "\n",
  );
}

function getSchemaBackgroundControlTargets(
  controlTypes: ReadonlySet<string>,
): string[] {
  return (appSchema.panels.controls?.sections ?? []).flatMap((section) =>
    Object.entries(section.controls).flatMap(([controlId, control]) => {
      if (!controlTypes.has(control.type)) {
        return [];
      }

      const searchText = [
        section.title ?? "",
        controlId,
        control.target,
        typeof control.label === "string" ? control.label : "",
      ]
        .join(" ")
        .replace(/([a-z])([A-Z])/g, "$1 $2");

      if (!/\b(background|backdrop|scene|canvas|transparent|transparency|alpha)\b/i.test(searchText)) {
        return [];
      }

      return [control.target];
    }),
  );
}

function textLooksLikePngExport(text: string): boolean {
  return /\b(export|download)\b/i.test(text) && /\bpng\b|\bimage\b/i.test(text);
}

function textLooksLikeVideoExport(text: string): boolean {
  return /\b(export|download)\b/i.test(text) && /\b(video|mp4|webm|mov)\b/i.test(text);
}

function schemaHasAnimatedProductOutput(): boolean {
  if (appSchema.panels.timeline?.enabled) {
    return true;
  }

  if (
    appTransferMode.animationIntent?.mode === "autonomous" ||
    appTransferMode.animationIntent?.mode === "timeline-keyframes" ||
    appTransferMode.animationIntent?.mode === "timeline-playback"
  ) {
    return true;
  }

  if (appTransferMode.mode !== "reference-runtime-clone") {
    return false;
  }

  if (appTransferMode.referenceTimeline.mode !== "none") {
    return true;
  }

  return appTransferMode.behaviorCoverage.some((coverage) =>
    [
      "renderer-loop",
      "pause-resume",
      "restart",
      "time-progress",
      "export-at-time",
    ].includes(coverage),
  );
}

describe("Toolcraft template app acceptance coverage", () => {
  it("requires acceptance coverage for every visible schema control", () => {
    expect(validateToolcraftAcceptanceCoverage(appSchema, appAcceptance)).toEqual([]);
  });

  it("rejects fake video duration browser coverage that falls back to expected duration", () => {
    const fakeCoverage = `
      async function getVideoDuration(page, buffer, mimeType) {
        return page.evaluate(() => {
          const video = document.createElement("video");
          const url = URL.createObjectURL(new Blob([], { type: mimeType }));
          video.addEventListener("loadedmetadata", () => video.duration);
          video.src = url;
        });
      }

      test("browser: exports video", async ({ page }) => {
        const durationSeconds = "1";
        const videoBuffer = readFileSync(videoPath);
        const metadataCoverage = "loadedmetadata video.duration";
        let videoDuration = Number(durationSeconds);

        try {
          videoDuration = readWebmDurationSeconds(videoBuffer);
        } catch {
          videoDuration = Number(durationSeconds);
        }

        expect(metadataCoverage).toContain("loadedmetadata");
        expect(metadataCoverage).toContain("video.duration");
        expect(videoDuration).toBeLessThan(1.75);
      });
    `;

    expect(sourceHasVideoDurationMetadataCoverage(fakeCoverage)).toBe(false);
  });

  it("accepts video duration coverage that loads the exported blob as a video", () => {
    const realCoverage = `
      async function getVideoDuration(page, buffer, mimeType) {
        return page.evaluate(
          ({ encoded, mime }) =>
            new Promise((resolve, reject) => {
              const video = document.createElement("video");
              const bytes = new Uint8Array(atob(encoded).length);
              const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
              video.addEventListener("loadedmetadata", () => resolve(video.duration), {
                once: true,
              });
              video.addEventListener("error", () => reject(new Error("duration failed")));
              video.src = url;
            }),
          { encoded: buffer.toString("base64"), mime: mimeType },
        );
      }

      test("browser: exports video", async ({ page }) => {
        const durationSeconds = "1";
        await page.getByRole("button", { name: "Edit timeline duration" }).click();
        const videoDuration = await getVideoDuration(page, videoBuffer, mimeType);
        expect(videoDuration).toBeGreaterThan(Number(durationSeconds) - 0.25);
        expect(videoDuration).toBeLessThan(Number(durationSeconds) + 0.25);
      });
    `;

    expect(sourceHasVideoDurationMetadataCoverage(realCoverage)).toBe(true);
  });

  it("requires explicit runtime acceptance before locking canvas output size", () => {
    const fixedOutputSchema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 1080, unit: "px", width: 1920 },
        sizing: { mode: "fixed-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Describe the effect",
                  label: "Prompt",
                  orderRole: "input",
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Generation",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(validateToolcraftAcceptanceCoverage(fixedOutputSchema, appAcceptance)).toEqual(
      expect.arrayContaining([
        'canvas.sizing mode "fixed-output" requires a runtime acceptance entry with canvasSizingCoverage "fixed-output-size" explaining why width and height are intentionally non-editable. A user-provided base/default size should normally use "editable-output".',
      ]),
    );
  });

  it("rejects fixed canvas sizing acceptance that only restates a default size", () => {
    const fixedOutputSchema = defineToolcraft({
      canvas: {
        enabled: true,
        size: { height: 1080, unit: "px", width: 1920 },
        sizing: { mode: "fixed-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Describe the effect",
                  label: "Prompt",
                  orderRole: "input",
                  target: "generation.prompt",
                  type: "text",
                },
              },
              title: "Generation",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(fixedOutputSchema, [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "canvas starts at 1920 by 1080",
          browser: true,
          browserTestName: "browser: canvas starts at 1920 by 1080",
          canvasSizingCoverage: "fixed-output-size",
          componentType: "canvas",
          evidence: "product-output",
          expectedObservable: "The canvas starts at 1920 by 1080.",
          fixture: "canvas default size fixture",
          id: "canvas.sizing",
          kind: "runtime",
          userAction: "Open the app.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'canvas.sizing canvasSizingCoverage "fixed-output-size" must explain why the product output dimensions are intentionally fixed, not merely initialized from a default size.',
      ]),
    );
  });

  it("requires browser reload acceptance when localStorage persistence is enabled", () => {
    const persistentSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 0.75,
                  label: "Opacity",
                  target: "appearance.opacity",
                  type: "slider",
                },
              },
              title: "Appearance",
            },
          ],
          title: "Controls",
        },
      },
      persistence: {
        include: ["values", "panels"],
        key: "toolcraft:persistence-acceptance-test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(persistentSchema, [
        {
          automated: true,
          automatedTestName: "opacity changes product output",
          browser: true,
          browserTestName: "browser: opacity changes product output",
          componentType: "slider",
          evidence: "product-output",
          expectedObservable: "Changing Opacity changes rendered product opacity.",
          fixture: "opacity fixture",
          id: "appearance.opacity",
          kind: "control",
          target: "appearance.opacity",
          userAction: "Drag the Opacity slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'persistence.storage "localStorage" requires a runtime acceptance entry with persistenceCoverage "reload" proving user-edited persisted state restores after a real browser reload. Settings import/export is not a substitute for persistence.',
      ]),
    );
  });

  it("rejects persistence acceptance that does not prove real browser reload", () => {
    const persistentSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 0.75,
                  label: "Opacity",
                  target: "appearance.opacity",
                  type: "slider",
                },
              },
              title: "Appearance",
            },
          ],
          title: "Controls",
        },
      },
      persistence: {
        include: ["values", "panels"],
        key: "toolcraft:persistence-acceptance-test:state:v1",
        storage: "localStorage",
        version: 1,
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(persistentSchema, [
        {
          automated: true,
          automatedTestName: "opacity changes product output",
          browser: true,
          browserTestName: "browser: opacity changes product output",
          componentType: "slider",
          evidence: "product-output",
          expectedObservable: "Changing Opacity changes rendered product opacity.",
          fixture: "opacity fixture",
          id: "appearance.opacity",
          kind: "control",
          target: "appearance.opacity",
          userAction: "Drag the Opacity slider.",
        },
        {
          automated: true,
          automatedTestName: "exports and imports settings",
          browser: true,
          browserTestName: "browser: exports and imports settings",
          componentType: "persistence",
          evidence: "persistence-state",
          expectedObservable: "Settings transfer restores the opacity preset.",
          fixture: "settings transfer fixture",
          id: "persistence.reload",
          kind: "runtime",
          persistenceCoverage: "reload",
          target: "persistence.reload",
          userAction: "Export settings, clear controls, and import settings.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'persistence.reload persistenceCoverage "reload" must describe changing a user-facing setting, reloading the browser page, and observing the restored value/output.',
      ]),
    );
  });

  it("requires settings transfer when product schema crosses the complexity threshold", () => {
    const complexSchema = createSettingsTransferThresholdSchema(false);

    expect(
      validateToolcraftAcceptanceCoverage(
        complexSchema,
        createSettingsTransferThresholdAcceptance(),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "settingsTransfer is required for this complex product app because settings-transfer eligibility was reached.",
        ),
      ]),
    );
  });

  it("does not count runtime canvas size controls toward settings transfer eligibility", () => {
    const belowThresholdSchema = createSettingsTransferBelowThresholdWithCanvasSizeSchema();
    const errors = validateToolcraftAcceptanceCoverage(
      belowThresholdSchema,
      createSettingsTransferBelowThresholdWithCanvasSizeAcceptance(),
    );

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "settingsTransfer is required for this complex product app because settings-transfer eligibility was reached.",
        ),
      ]),
    );
  });

  it("allows explicit settings transfer opt-out only with runtime evidence", () => {
    const complexSchema = createSettingsTransferThresholdSchema(false);
    const acceptance: ToolcraftComponentAcceptance[] = [
      ...createSettingsTransferThresholdAcceptance(),
      {
        automated: true,
        automatedTestName: "settings transfer intentionally omitted for session-only app",
        browser: true,
        browserTestName: "browser: settings transfer intentionally omitted",
        componentType: "settingsTransfer",
        evidence: "persistence-state",
        expectedObservable:
          "The complex app is session-only and intentionally does not expose portable settings.",
        fixture: "settings transfer opt-out fixture",
        id: "settings.transfer.optOut",
        kind: "runtime",
        settingsTransferCoverage: "opt-out",
        target: "runtime.settingsTransfer",
        userAction:
          "Open the session-only app, change temporary settings, and verify no portable settings workflow is required.",
      },
    ];

    expect(validateToolcraftAcceptanceCoverage(complexSchema, acceptance)).toEqual([]);
  });

  it("passes complex schemas with auto settings transfer enabled", () => {
    const complexSchema = createSettingsTransferThresholdSchema("auto");
    const acceptance: ToolcraftComponentAcceptance[] = [
      {
        automated: true,
        automatedTestName: "settings transfer exports and imports complex settings",
        browser: true,
        browserTestName: "browser: settings transfer exports and imports complex settings",
        componentType: "settingsTransfer",
        evidence: "persistence-state",
        expectedObservable:
          "Export Settings downloads app-scoped JSON and Import Settings restores edited controls.",
        fixture: "settings transfer complex fixture",
        id: "settings.transfer",
        kind: "control",
        target: "runtime.settingsTransfer",
        userAction:
          "Change one complex setting, export settings, change it again, import the JSON, and observe the restored value.",
      },
      ...createSettingsTransferThresholdAcceptance(),
    ];

    expect(validateToolcraftAcceptanceCoverage(complexSchema, acceptance)).toEqual([]);
  });

  it("requires compound controls to cover every semantic value part", () => {
    const compoundSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                anchor: {
                  defaultValue: "center",
                  label: "Anchor",
                  orderRole: "spatial",
                  target: "mesh.anchor",
                  type: "anchorGrid",
                },
                focus: {
                  defaultValue: { x: "0.00", y: "0.00" },
                  label: "Focus",
                  orderRole: "spatial",
                  target: "mesh.focus",
                  type: "vector",
                },
                gradient: {
                  defaultValue: {
                    angle: 120,
                    gradientType: "linear",
                    stops: [
                      { color: "#1D1264", opacity: 100, position: "0%" },
                      { color: "#22A7FF", opacity: 100, position: "50%" },
                      { color: "#FFE97A", opacity: 100, position: "100%" },
                    ],
                  },
                  label: "Gradient",
                  orderRole: "color",
                  target: "mesh.gradient",
                  type: "gradient",
                },
                palette: {
                  defaultValue: { family: "Amber", shade: "500" },
                  label: "Palette",
                  orderRole: "color",
                  target: "mesh.palette",
                  type: "palette",
                },
                font: {
                  defaultValue: {
                    color: "#FFFFFF",
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "original",
                  },
                  label: "Font",
                  orderRole: "primary",
                  target: "mesh.font",
                  type: "fontPicker",
                },
                range: {
                  defaultValue: { end: "80%", start: "20%" },
                  label: "Range",
                  orderRole: "primary",
                  target: "mesh.range",
                  type: "rangeInput",
                },
                band: {
                  defaultValue: [20, 80],
                  label: "Band",
                  max: 100,
                  min: 0,
                  orderRole: "primary",
                  step: 1,
                  target: "mesh.band",
                  type: "rangeSlider",
                },
                mixer: {
                  defaultValue: {
                    B: { B: 100, G: 0, R: 0 },
                    G: { B: 0, G: 100, R: 0 },
                    R: { B: 0, G: 0, R: 100 },
                  },
                  label: "Channels",
                  orderRole: "color",
                  target: "mesh.channels",
                  type: "channelMixer",
                },
                curves: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      B: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                      G: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                      R: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                      RGB: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                    },
                  },
                  label: "Curves",
                  orderRole: "color",
                  target: "mesh.curves",
                  type: "curves",
                },
              },
              title: "Compound",
            },
          ],
          title: "Controls",
        },
      },
    });

    const acceptance = [
      "runtime.settingsTransfer",
      "mesh.anchor",
      "mesh.focus",
      "mesh.gradient",
      "mesh.palette",
      "mesh.font",
      "mesh.range",
      "mesh.band",
      "mesh.channels",
      "mesh.curves",
    ].map((target) => ({
      automated: true,
      automatedTestName: `${target} changes output`,
      browser: true,
      browserTestName: `browser: ${target} changes output`,
      componentType:
        target === "runtime.settingsTransfer"
          ? "settingsTransfer"
          : target === "mesh.anchor"
          ? "anchorGrid"
          : target === "mesh.focus"
            ? "vector"
            : target === "mesh.gradient"
              ? "gradient"
                : target === "mesh.palette"
                  ? "palette"
                  : target === "mesh.font"
                    ? "fontPicker"
                    : target === "mesh.range"
                      ? "rangeInput"
                      : target === "mesh.band"
                        ? "rangeSlider"
                        : target === "mesh.channels"
                          ? "channelMixer"
                          : "curves",
      evidence: "product-output" as const,
      expectedObservable: `${target} changes the rendered product output.`,
      fixture: "compound fixture",
      id: target,
      kind: "control" as const,
      target,
      userAction: `Change ${target}.`,
    }));

    expect(
      validateToolcraftAcceptanceCoverage(compoundSchema, acceptance),
    ).toEqual(
      expect.arrayContaining([
        "Mesh / anchor (mesh.anchor) must declare controlPartCoverage for every semantic value part: anchorGrid.position.",
        "Mesh / focus (mesh.focus) must declare controlPartCoverage for every semantic value part: vector.x, vector.y.",
        "Mesh / gradient (mesh.gradient) must declare controlPartCoverage for every semantic value part: gradient.gradientType, gradient.angle, gradient.stops.position, gradient.stops.color, gradient.stops.opacity.",
        "Mesh / palette (mesh.palette) must declare controlPartCoverage for every semantic value part: palette.family, palette.shade.",
        "Mesh / font (mesh.font) must declare controlPartCoverage for every semantic value part: fontPicker.fontId, fontPicker.fontWeight, fontPicker.fontSize, fontPicker.letterSpacing, fontPicker.lineHeight, fontPicker.textCase, fontPicker.color, fontPicker.opacity.",
        "Compound / range (mesh.range) must declare controlPartCoverage for every semantic value part: rangeInput.start, rangeInput.end.",
        "Compound / band (mesh.band) must declare controlPartCoverage for every semantic value part: rangeSlider.lower, rangeSlider.upper.",
        "Channels & Curves / mixer (mesh.channels) must declare controlPartCoverage for every semantic value part: channelMixer.activeChannel, channelMixer.values.",
        "Channels & Curves / curves (mesh.curves) must declare controlPartCoverage for every semantic value part: curves.activeChannel, curves.points.",
      ]),
    );
  });

  it("accepts single curves with points coverage only", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                easing: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  label: "Easing",
                  target: "animation.easing",
                  type: "curves",
                  variant: "single",
                },
              },
              title: "Motion",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schema, [
      {
        automated: true,
        automatedTestName: "easing curve changes motion output",
        browser: true,
        browserTestName: "browser: easing curve changes motion output",
        componentType: "curves",
        controlPartCoverage: ["curves.points"],
        evidence: "product-output",
        expectedObservable: "Changing Easing curve points changes animation timing.",
        fixture: "motion fixture",
        id: "animation.easing",
        kind: "control",
        target: "animation.easing",
        userAction: "Drag an Easing curve point.",
      },
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("curves.activeChannel"),
      ]),
    );
  });

  it("requires semantic one-dimensional curves to use the single variant", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                bendCurve: {
                  defaultValue: {
                    activeChannel: "RGB",
                    points: {
                      B: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      G: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      R: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                      RGB: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                      ],
                    },
                  },
                  label: "Bend curve",
                  target: "shape.bendCurve",
                  type: "curves",
                },
              },
              title: "Shape",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schema, [
      {
        automated: true,
        automatedTestName: "bend curve changes geometry output",
        browser: true,
        browserTestName: "browser: bend curve changes geometry output",
        componentType: "curves",
        controlPartCoverage: ["curves.activeChannel", "curves.points"],
        evidence: "product-output",
        expectedObservable: "Changing Bend curve points changes the rendered shape bend.",
        fixture: "shape fixture",
        id: "shape.bendCurve",
        kind: "control",
        target: "shape.bendCurve",
        userAction: "Drag a Bend curve point.",
      },
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        'Shape / bendCurve (shape.bendCurve) is a semantic single curve and must set variant: "single"; RGB/R/G/B curve tabs are reserved for color-correction or channel-specific curves.',
      ]),
    );
  });

  it("requires custom controls to explain why they are custom and prove minimal runtime UI", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "glyph ramp changes output",
          browser: true,
          browserTestName: "browser: glyph ramp changes output",
          componentType: "glyphRamp",
          evidence: "product-output",
          expectedObservable:
            "Choosing and ordering glyphs changes the rendered product output.",
          fixture: "glyph ramp fixture",
          id: "glyph.ramp",
          kind: "control",
          target: "glyph.ramp",
          userAction: "Upload, reorder, and remove glyphs.",
        },
      ]),
    ).toContain(
      "Glyphs / glyphRamp (glyph.ramp) is a custom control and must declare customControlCoverage for: built-in-gap, kit-primitives, minimal-ui, product-output, runtime-state.",
    );
  });

  it("requires custom controls to include a built-in fit check", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "glyph ramp changes output",
          browser: true,
          browserTestName: "browser: glyph ramp changes output",
          componentType: "glyphRamp",
          customControlCoverage: [
            "built-in-gap",
            "kit-primitives",
            "minimal-ui",
            "product-output",
            "runtime-state",
          ],
          evidence: "product-output",
          expectedObservable:
            "Choosing and ordering glyphs changes the rendered product output.",
          fixture: "glyph ramp fixture",
          id: "glyph.ramp",
          kind: "control",
          target: "glyph.ramp",
          userAction: "Upload, reorder, and remove glyphs.",
        },
      ]),
    ).toContain(
      "Glyphs / glyphRamp (glyph.ramp) is a custom control and must declare builtInFitCheck with checkedBuiltIns, closestBuiltIn, whyInsufficient, and productObservable.",
    );
  });

  it("rejects custom controls with invalid built-in fit checks", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "glyph ramp changes output",
          browser: true,
          browserTestName: "browser: glyph ramp changes output",
          builtInFitCheck: {
            checkedBuiltIns: ["imaginaryPicker" as never],
            closestBuiltIn: "glyphRamp" as never,
            productObservable:
              "Ordering uploaded glyphs changes the rendered glyph ramp output.",
            whyInsufficient:
              "The built-in controls cannot upload, preview, reorder, and remove a density-ordered glyph set in one runtime value.",
          },
          componentType: "glyphRamp",
          customControlCoverage: [
            "built-in-gap",
            "kit-primitives",
            "minimal-ui",
            "product-output",
            "runtime-state",
          ],
          evidence: "product-output",
          expectedObservable:
            "Choosing and ordering glyphs changes the rendered product output.",
          fixture: "glyph ramp fixture",
          id: "glyph.ramp",
          kind: "control",
          target: "glyph.ramp",
          userAction: "Upload, reorder, and remove glyphs.",
        },
      ]),
    ).toEqual([
      "Glyphs / glyphRamp (glyph.ramp) builtInFitCheck.checkedBuiltIns contains unknown built-in controls: imaginaryPicker.",
      'Glyphs / glyphRamp (glyph.ramp) builtInFitCheck.closestBuiltIn must be one of the checked built-ins or "none".',
    ]);
  });

  it("accepts custom controls with explicit custom control coverage", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glyphRamp: {
                  defaultValue: [],
                  label: "Glyph ramp",
                  orderRole: "input",
                  target: "glyph.ramp",
                  type: "glyphRamp",
                } as never,
              },
              title: "Glyphs",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "glyph ramp changes output",
          browser: true,
          browserTestName: "browser: glyph ramp changes output",
          builtInFitCheck: {
            checkedBuiltIns: ["fileDrop", "imagePicker", "select"],
            closestBuiltIn: "fileDrop",
            productObservable:
              "Ordering uploaded glyphs changes the rendered glyph ramp output.",
            whyInsufficient:
              "FileDrop imports source files, but it does not provide density ordering, per-glyph preview, reorder, and remove behavior in one runtime value.",
          },
          componentType: "glyphRamp",
          customControlCoverage: [
            "built-in-gap",
            "kit-primitives",
            "minimal-ui",
            "product-output",
            "runtime-state",
          ],
          evidence: "product-output",
          expectedObservable:
            "Choosing and ordering glyphs changes the rendered product output.",
          fixture: "glyph ramp fixture",
          id: "glyph.ramp",
          kind: "control",
          target: "glyph.ramp",
          userAction: "Upload, reorder, and remove glyphs.",
        },
      ]),
    ).toEqual([]);
  });

  it("rejects range slider defaults where lower and upper start equal", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacityRange: {
                  defaultValue: [0, 0],
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "field.opacityRange",
                  type: "rangeSlider",
                  unit: "%",
                },
              },
              title: "Field",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "opacity range lower and upper change field output",
          browser: true,
          browserTestName: "browser: opacity range lower and upper change field output",
          componentType: "rangeSlider",
          controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"],
          evidence: "product-output",
          expectedObservable:
            "Changing the lower and upper opacity handles changes field alpha output.",
          fixture: "field opacity range fixture",
          id: "field.opacityRange",
          kind: "control",
          target: "field.opacityRange",
          userAction: "Drag both Opacity handles.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Field / opacityRange (field.opacityRange) rangeSlider defaultValue must start with different lower and upper values so the two-thumb control does not collapse into a single-value slider.",
      ]),
    );
  });

  it("rejects inline layout groups that include range sliders", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                opacityRange: {
                  defaultValue: [10, 80],
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  step: 1,
                  target: "field.opacityRange",
                  type: "rangeSlider",
                  unit: "%",
                },
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 5,
                  min: 0,
                  step: 0.1,
                  target: "field.speed",
                  type: "slider",
                  unit: "x",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["opacityRange", "speed"],
                  layout: "inline",
                },
              ],
              title: "Field",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        {
          automated: true,
          automatedTestName: "opacity range lower and upper change field output",
          browser: true,
          browserTestName: "browser: opacity range lower and upper change field output",
          componentType: "rangeSlider",
          controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"],
          evidence: "product-output",
          expectedObservable:
            "Changing the lower and upper opacity handles changes field alpha output.",
          fixture: "field opacity range fixture",
          id: "field.opacityRange",
          kind: "control",
          target: "field.opacityRange",
          userAction: "Drag both Opacity handles.",
        },
        {
          automated: true,
          automatedTestName: "speed changes field output",
          browser: true,
          browserTestName: "browser: speed changes field output",
          componentType: "slider",
          evidence: "product-output",
          expectedObservable: "Changing Speed changes field animation output.",
          fixture: "field speed fixture",
          id: "field.speed",
          kind: "control",
          target: "field.speed",
          userAction: "Drag the Speed slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Field layoutGroups inline row "opacityRange, speed" includes rangeSlider opacityRange. RangeSlider is a full-width two-thumb control and must not share a row with another slider or range slider.',
      ]),
    );
  });

  it("accepts compound controls only when every semantic value part is declared", () => {
    const gradientSchema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                gradient: {
                  defaultValue: {
                    angle: 120,
                    gradientType: "linear",
                    stops: [
                      { color: "#1D1264", opacity: 100, position: "0%" },
                      { color: "#22A7FF", opacity: 100, position: "50%" },
                      { color: "#FFE97A", opacity: 100, position: "100%" },
                    ],
                  },
                  label: "Gradient",
                  orderRole: "color",
                  target: "mesh.gradient",
                  type: "gradient",
                },
              },
              title: "Gradient",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(gradientSchema, [
        {
          automated: true,
          automatedTestName: "gradient type angle and stops change output",
          browser: true,
          browserTestName: "browser: gradient type angle and stops change output",
          componentType: "gradient",
          controlPartCoverage: [
            "gradient.gradientType",
            "gradient.angle",
            "gradient.stops.position",
            "gradient.stops.color",
            "gradient.stops.opacity",
          ],
          evidence: "product-output",
          expectedObservable:
            "Changing gradient type, angle, stop position, stop color, and stop opacity changes the rendered output.",
          fixture: "gradient fixture",
          id: "mesh.gradient",
          kind: "control",
          target: "mesh.gradient",
          userAction: "Change every visible part of the Gradient control.",
        },
      ]),
    ).toEqual([]);
  });

  it("keeps the app route backed by the Toolcraft template shell", () => {
    const routeSource = readSourceTree(routesDir);

    expect(
      routeSource,
      "The route must render ToolcraftApp directly; mentions in tests/docs do not prove the app shell is used.",
    ).toMatch(toolcraftAppRenderPattern);
    expect(
      routeSource,
      "Routes must not manually compose low-level runtime surfaces. Use ToolcraftApp so panel, canvas, toolbar, layers, and timeline design stay runtime-owned.",
    ).not.toMatch(manualRuntimeSurfaceRenderPattern);
    expect(routeSource).not.toMatch(
      /<\s*iframe\b|React\.createElement\s*\(\s*["']iframe["']/i,
    );
  });

  it("detects manual runtime surface composition even when acceptance text mentions ToolcraftApp", () => {
    const bypassRouteSource = stripJsComments(`
      import {
        CanvasShell,
        ControlsPanel,
        ToolcraftRoot,
        ToolbarPanel,
      } from "@/toolcraft/runtime/react";

      export function AppHome() {
        return (
          <ToolcraftRoot schema={appSchema}>
            <CanvasShell renderDefaultMedia={false}>
              <ProductCanvas />
            </CanvasShell>
            <AppPlaybackPanel />
            <ControlsPanel panelPlacement="floating" />
            <ToolbarPanel panelPlacement="floating" />
          </ToolcraftRoot>
        );
      }

      const acceptanceText =
        "preserve the reference renderer inside ToolcraftApp canvasContent";
    `);

    expect(bypassRouteSource).not.toMatch(toolcraftAppRenderPattern);
    expect(bypassRouteSource).toMatch(manualRuntimeSurfaceRenderPattern);
    expect(bypassRouteSource).toMatch(customTimelineTransportRenderPattern);
  });

  it("keeps app-specific code inside runtime extension points", () => {
    const implementationSource = readAppImplementationSource();

    expect(
      implementationSource,
      "App-specific code must not import low-level runtime surfaces. Render ToolcraftApp and use schema, canvasContent, controlRenderers, onPanelAction, and runtime commands.",
    ).not.toMatch(lowLevelRuntimeSurfaceImportPattern);
    expect(
      implementationSource,
      "App-specific code must not render low-level runtime surfaces directly. Fix shared runtime behavior instead of replacing panels, canvas, toolbar, timeline, or layers locally.",
    ).not.toMatch(manualRuntimeSurfaceRenderPattern);
    expect(
      implementationSource,
      "App-specific code must not import built-in control components directly. Declare built-in controls in schema or register a true product-specific controlRenderer.",
    ).not.toMatch(builtInControlImportPattern);
    expect(
      implementationSource,
      "App-specific code must not render built-in control components directly. Use schema control types so reset, history, layout, keyframes, disabled states, markers, labels, and acceptance stay runtime-owned.",
    ).not.toMatch(directBuiltInControlRenderPattern);
  });

  it("detects direct built-in control rendering as a runtime bypass", () => {
    const bypassSource = stripJsComments(`
      import { SliderControl } from "@/toolcraft/ui/components/controls/slider";
      import { TimelinePanel } from "@/toolcraft/runtime/react";

      export function BadControl() {
        return (
          <div>
            <SliderControl name="Opacity" value={50} onValueChange={() => {}} />
            {React.createElement(TimelinePanel, { panelPlacement: "floating" })}
          </div>
        );
      }
    `);

    expect(bypassSource).toMatch(lowLevelRuntimeSurfaceImportPattern);
    expect(bypassSource).toMatch(manualRuntimeSurfaceRenderPattern);
    expect(bypassSource).toMatch(builtInControlImportPattern);
    expect(bypassSource).toMatch(directBuiltInControlRenderPattern);
  });

  it("does not allow app-level playback transport beside the runtime timeline", () => {
    const routeSource = readSourceTree(routesDir);
    const referenceTimelineMode =
      appTransferMode.mode === "reference-runtime-clone"
        ? appTransferMode.referenceTimeline.mode
        : null;

    if (
      appSchema.panels.timeline?.enabled &&
      referenceTimelineMode !== "custom-reference-timeline"
    ) {
      expect(
        routeSource,
        "Toolcraft playback/keyframe timelines must use the runtime TimelinePanel. App-level playback/transport panels are allowed only for explicit custom-reference-timeline transfers.",
      ).not.toMatch(customTimelineTransportRenderPattern);
    }
  });

  it("publishes control order targets for app schema tests", () => {
    expect(getToolcraftControlOrderTargets(appSchema)).toEqual([
      "runtime.settingsTransfer",
      "canvas.renderScale",
      "media.source",
      "brick.detail",
      "brick.scale",
      "brick.chaos",
      "brick.gap",
      "brick.rounding",
      "brick.edgeDepth",
      "stud.include",
      "stud.diameter",
      "stud.height",
      "stud.highlight",
      "tone.monochrome",
      "tone.posterize",
      "tone.saturation",
      "tone.contrast",
      "tone.brightness",
      "lighting.direction",
      "lighting.shadow",
      "export.includeBackground",
      "appearance.background",
      "export.image.format",
      "export.image.resolution",
    ]);
  });

  it("defaults generated apps to new Toolcraft assembly mode", () => {
    expect(appTransferMode).toEqual({
      animationIntent: { mode: "none" },
      mode: "new-toolcraft-app",
    });
  });

  it("allows neutral readiness only for the source starter/template folder", () => {
    if (appProductReadiness.mode === "product") {
      expect(appProductReadiness.productName.trim()).not.toBe("");
      expect(appProductReadiness.productSummary.trim()).not.toBe("");
      expect(appProductReadiness.requestedBehavior.trim()).not.toBe("");
      expect(
        schemaHasProductSurface(),
        "Product readiness requires product surface: controls, layers, timeline, canvasContent, or acceptance coverage.",
      ).toBe(true);
      return;
    }

    expect(appProductReadiness.reason.trim()).not.toBe("");
    expect(
      isNeutralTemplateProject(),
      "Renamed/generated product folders must switch product readiness from starter to product so an empty template cannot pass as an implemented app.",
    ).toBe(true);
    expect(
      schemaHasProductSurface(),
      "Neutral starter readiness must not be used after adding product controls, timeline, layers, canvasContent, or acceptance coverage.",
    ).toBe(false);
  });

  it("keeps an implementation worklog available for generated app decisions", () => {
    expect(
      existsSync(agentWorklogPath),
      "Generated apps must include docs/toolcraft/agent-worklog.md so implementation decisions and evidence survive the chat context.",
    ).toBe(true);
  });

  it("documents control selection inventory and custom built-in fit checks", () => {
    const schemaReference = readToolcraftDoc("schema-reference.md");
    const componentRules = readToolcraftDoc("component-rules.md");
    const acceptanceTesting = readToolcraftDoc("acceptance-testing.md");

    expect(schemaReference).toContain("Control Selection Inventory");
    expect(schemaReference).toContain("Product need:");
    expect(schemaReference).toContain("Candidate built-ins checked:");
    expect(schemaReference).toContain("Rejected alternatives:");

    expect(componentRules).toContain("Control Decision Catalog");
    expect(componentRules).toContain("Exact owner");
    expect(componentRules).toContain("Best fit");
    expect(componentRules).toContain("Custom escape hatch");

    expect(acceptanceTesting).toContain("wrong-substitution");
    expect(acceptanceTesting).toContain("built-in fit check");
    expect(acceptanceTesting).toContain("builtInFitCheck");
  });

  it("requires product apps to replace the starter worklog with decision evidence", () => {
    if (appProductReadiness.mode !== "product" && !schemaHasProductSurface()) {
      return;
    }

    expect(existsSync(agentWorklogPath)).toBe(true);

    const worklogSource = readFileSync(agentWorklogPath, "utf8");

    expect(getAgentWorklogValidationErrors(worklogSource)).toEqual([]);
  });

  it("rejects stale or incomplete product worklogs", () => {
    const staleWorklog = `
      # Implementation Worklog

      ## Status

      Mode: starter

      ## Decisions

      ### Renderer

      - Decision: No product renderer yet.
      - Reason: The starter is neutral.
      - Evidence: No canvasContent.

      ### Timeline

      - Decision: No timeline yet.
      - Reason: No animation.
      - Evidence: panels.timeline is omitted.

      ### Layers

      - Decision: No layers yet.
      - Reason: No layer workflow.
      - Evidence: panels.layers is omitted.

      ### Controls

      - Decision: No controls yet.
      - Reason: No product behavior.
      - Evidence: no sections.

      ### Export

      - Decision: No export yet.
      - Reason: No product output.
      - Evidence: no panelActions.

      ### Performance

      - Decision: No workload yet.
      - Reason: No renderer.
      - Evidence: neutral matrix.

      ## Evidence

      - Source reviewed: starter schema.

      ## Verification

      - Run: pnpm verify:quick

      ## Risks

      - Risk: starter template.
    `;

    expect(getAgentWorklogValidationErrors(staleWorklog)).toContain(
      'agent-worklog.md Status must declare "Mode: product" before final delivery.',
    );
    expect(getAgentWorklogValidationErrors(staleWorklog)).toContain(
      'agent-worklog.md still declares "Mode: starter"; replace the starter template with product decisions.',
    );
  });

  it("accepts product worklogs with concrete decisions, evidence, verification, and risk state", () => {
    const productWorklog = `
      # Implementation Worklog

      ## Status

      Mode: product

      ## Decisions

      ### Renderer

      - Decision: Use SVG for vector foreground and Canvas 2D for dense background.
      - Reason: Foreground geometry must stay crisp while background workload is raster-like.
      - Evidence: src/app/app-performance.ts rendererTechnique layers and browser perf trace.

      ### Timeline

      - Decision: Use Toolcraft playback timeline.
      - Reason: The product has play, pause, scrub, duration, loop, and export-at-time behavior.
      - Evidence: appSchema.panels.timeline.mode and e2e timeline playback test.

      ### Layers

      - Decision: Do not enable layers.
      - Reason: The product edits one generated output, not independent layer objects.
      - Evidence: appSchema.panels.layers is omitted and acceptance has no layer rows.

      ### Controls

      - Decision: Group controls by Background, Motion, and Export.
      - Reason: Each section maps to a product entity or workflow stage.
      - Evidence: src/app/app-schema.ts control targets and app-acceptance rows.

      ### Export

      - Decision: Provide Export Video primary and Export PNG secondary.
      - Reason: The product is animated but still frames are useful.
      - Evidence: panelActions plus export browser tests.

      ### Performance

      - Decision: Run viewport-stability and animation drag budgets.
      - Reason: Animation and canvas movement are performance-sensitive.
      - Evidence: pnpm verify:perf browser run.

      ## Decision Trail

      ### Iteration 1 — Initial product build

      - Request: Build an animated vector poster app from the user prompt.
      - Task type: Renderer, schema, timeline, export, and performance.
      - User-visible result: The canvas renders the animated poster, the top timeline controls playback, and sticky footer actions export video and PNG.
      - Source/reference checked: User prompt plus the generated product renderer requirements.
      - Docs/contracts read: workflow.md, assembly-workflow.md, schema-reference.md, component-rules.md, renderer-technique.md, performance.md.
      - Contract rules applied: runtime-shell-required, controls-layout-heuristics, timeline-enabled-behavior, output-export-required, performance-coverage-levels.
      - Decision: Use SVG foreground with Canvas 2D background and Toolcraft playback timeline.
      - Alternatives rejected: DOM-only output because dense animation can jank; app-local timeline because playback UI is runtime-owned.
      - State/output mapping: Background and motion controls update runtime values consumed by product-renderer.tsx; timeline state drives rendered frame time; footer actions read the same renderer state for export.
      - Files changed: src/app/app-schema.ts, src/app/app-performance.ts, src/app/product-renderer.tsx, e2e/app-controls.spec.ts.
      - Verification: pnpm verify:quick; pnpm verify:perf; browser timeline pause/resume and canvas drag stress.
      - Skipped checks: None.
      - Risks: None; browser and performance gates cover the touched surfaces.

      ## Evidence

      - Source reviewed: src/app/app-schema.ts, src/app/app-performance.ts, e2e/app-controls.spec.ts.
      - Contract applied: runtime-shell-required, timeline-enabled-behavior, performance-coverage-levels.

      ## Verification

      - Run: pnpm verify:quick
      - Run: pnpm verify:perf
      - Browser: timeline pause/resume and canvas drag stress.

      ## Risks

      - None: remaining risks are covered by browser and performance gates.
    `;

    expect(getAgentWorklogValidationErrors(productWorklog)).toEqual([]);
  });

  it("rejects product worklogs without an actionable decision trail", () => {
    const worklog = `
      # Implementation Worklog

      ## Status

      Mode: product

      ## Decisions

      ### Renderer

      - Decision: Use WebGL.
      - Reason: Dense animation needs batched rendering.
      - Evidence: src/app/app-performance.ts.

      ### Timeline

      - Decision: Use playback timeline.
      - Reason: The product exposes play and scrub.
      - Evidence: appSchema.panels.timeline.mode.

      ### Layers

      - Decision: Do not enable layers.
      - Reason: The product is single-output.
      - Evidence: appSchema.panels.layers is omitted.

      ### Controls

      - Decision: Group controls by product entity.
      - Reason: Sections map to product behavior.
      - Evidence: src/app/app-schema.ts.

      ### Export

      - Decision: Provide PNG and video export.
      - Reason: The app is animated.
      - Evidence: panelActions.

      ### Performance

      - Decision: Run perf coverage.
      - Reason: Renderer is animated.
      - Evidence: pnpm verify:perf.

      ## Decision Trail

      ### Iteration 1 — Product build

      - Request: Build an animated product app.
      - Task type: Renderer, controls, and export.
      - Docs/contracts read: workflow.md and renderer-technique.md.
      - Decision: Use WebGL and playback timeline.
      - Files changed: src/app/app-schema.ts and src/app/product-renderer.tsx.
      - Verification: pnpm verify:quick.
      - Risks: Performance still needs browser proof.

      ## Evidence

      - Source reviewed: src/app/app-schema.ts.
      - Contract applied: runtime-shell-required.

      ## Verification

      - Run: pnpm verify:quick

      ## Risks

      - Risk: performance needs a follow-up run.
    `;

    expect(getAgentWorklogValidationErrors(worklog)).toEqual(
      expect.arrayContaining([
        'agent-worklog.md Decision Trail iteration "Iteration 1 — Product build" must include "User-visible result:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 — Product build" must include "Source/reference checked:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 — Product build" must include "Contract rules applied:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 — Product build" must include "Alternatives rejected:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 — Product build" must include "State/output mapping:".',
        'agent-worklog.md Decision Trail iteration "Iteration 1 — Product build" must include "Skipped checks:".',
      ]),
    );
  });

  it("requires product output apps to expose export actions in the sticky footer", () => {
    if (appProductReadiness.mode !== "product" && !schemaHasProductSurface()) {
      return;
    }

    const panelActionTexts = getSchemaPanelActionSearchTexts();
    const browserTestSources = readBrowserTestSources();
    const productImplementationSource = getProductImplementationSource();
    const productRuntimeImplementationSource = getProductRuntimeImplementationSource();
    const backgroundColorTargets = getSchemaBackgroundControlTargets(new Set(["color"]));
    const backgroundToggleTargets = getSchemaBackgroundControlTargets(
      new Set(["checkbox", "select", "segmented", "switch"]),
    );

    expect(
      panelActionTexts.length,
      "Product apps must define panelActions in the controls panel sticky footer.",
    ).toBeGreaterThan(0);
    expect(
      panelActionTexts.some(textLooksLikePngExport),
      "Every product app must expose Export PNG or Download PNG through panelActions.",
    ).toBe(true);
    expect(
      productImplementationSource,
      "PNG export must use createToolcraftPngExportCanvas so background transparency and retina sizing follow the standard runtime contract.",
    ).toMatch(/\bcreateToolcraftPngExportCanvas\b/);
    expect(
      productImplementationSource,
      "PNG export must pass includeBackground from runtime state to createToolcraftPngExportCanvas; do not hardcode PNG transparency or background inclusion in schema only.",
    ).toMatch(/\bcreateToolcraftPngExportCanvas\s*\(\s*\{[\s\S]*\bincludeBackground\s*:/);
    expect(
      removePreviewBackgroundHelperReads(removePngExportCanvasHelperCalls(productRuntimeImplementationSource)),
      "export.includeBackground may be read by the PNG export helper and live preview product renderer. It must not make the Toolcraft canvas shell/backing or video renderers transparent.",
    ).not.toMatch(/\bexport\.includeBackground\b/);
    expect(
      backgroundColorTargets.length,
      "Every product app with Export PNG must expose a user-facing background color control.",
    ).toBeGreaterThan(0);
    expect(
      backgroundToggleTargets.length,
      'Every product app with Export PNG must expose export.includeBackground in the required "Background" section as a Switch labeled "Include".',
    ).toBeGreaterThan(0);

    for (const target of [...backgroundColorTargets, ...backgroundToggleTargets]) {
      expect(
        productRuntimeImplementationSource,
        `Runtime renderer/export code must read ${target}; declaring the control in schema is not enough.`,
      ).toContain(target);
    }

    const imageExportSection = getSchemaImageExportSection();
    const imageFormatControl = getSectionControlByTarget(
      imageExportSection,
      "export.image.format",
    );
    const imageResolutionControl = getSectionControlByTarget(
      imageExportSection,
      "export.image.resolution",
    );
    const imageFormatOptionValues = getControlOptionValues(imageFormatControl);
    const imageResolutionOptionValues = getControlOptionValues(imageResolutionControl);
    const imageFormatControlId = getSectionControlIdByTarget(
      imageExportSection,
      "export.image.format",
    );
    const imageResolutionControlId = getSectionControlIdByTarget(
      imageExportSection,
      "export.image.resolution",
    );
    const imageExportHasInlinePair =
      imageFormatControlId === undefined || imageResolutionControlId === undefined
        ? false
        : imageExportSection?.layoutGroups?.some(
            (group) =>
              group.layout === "inline" &&
              group.columns === 2 &&
              group.controls.includes(imageFormatControlId) &&
              group.controls.includes(imageResolutionControlId),
          ) === true;

    expect(
      imageExportSection,
      'Apps with Export PNG must expose image settings in a separate controls section titled "Image Export".',
    ).toBeDefined();
    expect(
      imageFormatControl,
      'The separate "Image Export" section must include a format control with target "export.image.format".',
    ).toBeDefined();
    expect(
      imageFormatControl?.type,
      "Image Export format must use the same Select/dropdown structure as Video Export.",
    ).toBe("select");
    expect(
      imageFormatOptionValues,
      'Image format options must include "png" and "jpg".',
    ).toEqual(expect.arrayContaining(["png", "jpg"]));
    expect(
      imageFormatControl?.defaultValue,
      'Image format must default to "png".',
    ).toBe("png");
    expect(
      imageResolutionControl,
      'The separate "Image Export" section must include a resolution control with target "export.image.resolution".',
    ).toBeDefined();
    expect(
      imageResolutionControl?.type,
      "Image Export resolution must use the same Select/dropdown structure as Video Export.",
    ).toBe("select");
    expect(
      imageResolutionOptionValues,
      'Image resolution options must include "2k", "4k", and "8k".',
    ).toEqual(expect.arrayContaining(["2k", "4k", "8k"]));
    expect(
      imageResolutionControl?.defaultValue,
      'Image resolution must default to "4k".',
    ).toBe("4k");
    expect(
      imageExportHasInlinePair,
      "Image Export format and resolution must render as a compact inline pair.",
    ).toBe(true);
    expect(
      productRuntimeImplementationSource,
      'Image export implementation must read "export.image.format" from runtime state; declaring the control is not enough.',
    ).toContain("export.image.format");
    expect(
      productRuntimeImplementationSource,
      'Image export implementation must read "export.image.resolution" from runtime state; declaring the control is not enough.',
    ).toContain("export.image.resolution");
    expect(
      sourcePassesImageResolutionToPngExport(productImplementationSource),
      "Image export must pass the selected image resolution to createToolcraftPngExportCanvas so 2K/4K/8K change the actual exported pixel dimensions.",
    ).toBe(true);
    expect(
      sourceHasImageExportDimensionCoverage(browserTestSources),
      "Image export browser coverage must decode the exported image and assert actual width/height for selected 2K/4K/8K resolution. Blob size or a clicked button alone does not prove export dimensions.",
    ).toBe(true);

    if (!schemaHasAnimatedProductOutput()) {
      return;
    }

    const videoExportSection = getSchemaVideoExportSection();
    const videoFormatControl = getSectionControlByTarget(
      videoExportSection,
      "export.video.format",
    );
    const videoResolutionControl = getSectionControlByTarget(
      videoExportSection,
      "export.video.resolution",
    );
    const videoFormatOptionValues = getControlOptionValues(videoFormatControl);
    const videoResolutionOptionValues = getControlOptionValues(videoResolutionControl);
    const hasMovOrProResFormat = videoFormatOptionValues.some((value) =>
      /\b(mov|prores)\b/i.test(value),
    );

    expect(
      panelActionTexts.some(textLooksLikeVideoExport),
      "Animated product apps must expose Export Video through panelActions in addition to Export PNG.",
    ).toBe(true);
    expect(
      panelActionTexts.length,
      "Animated product apps need separate footer delivery actions for Export Video and Export PNG.",
    ).toBeGreaterThanOrEqual(2);
    expect(
      productImplementationSource,
      "Video export must use getToolcraftRetinaExportSize so video dimensions follow the same retina export contract.",
    ).toMatch(/\bgetToolcraftRetinaExportSize\b/);
    expect(
      productImplementationSource,
      "Video export must use shouldIncludeToolcraftExportBackground so PNG transparency does not remove the video background.",
    ).toMatch(/\bshouldIncludeToolcraftExportBackground\b/);
    expect(
      videoExportSection,
      'Animated product apps with Export Video must expose video settings in a separate controls section titled "Video Export".',
    ).toBeDefined();
    expect(
      videoFormatControl,
      'The separate "Video Export" section must include a format control with target "export.video.format".',
    ).toBeDefined();
    expect(
      ["select", "segmented"],
      "Video format must be a Select or Segmented control so the user chooses a supported container instead of typing a freeform value.",
    ).toContain(videoFormatControl?.type);
    expect(
      videoFormatOptionValues,
      'Video format options must include safe browser baseline choices: "webm" and "mp4".',
    ).toEqual(expect.arrayContaining(["webm", "mp4"]));
    expect(
      videoResolutionControl,
      'The separate "Video Export" section must include a resolution control with target "export.video.resolution".',
    ).toBeDefined();
    expect(
      ["select"],
      "Video resolution must be a Select control with explicit output-size choices.",
    ).toContain(videoResolutionControl?.type);
    expect(
      videoResolutionOptionValues,
      'Video resolution options must include "current" and "4k".',
    ).toEqual(expect.arrayContaining(["current", "4k"]));
    expect(
      videoResolutionControl?.defaultValue,
      'Video resolution must default to "current".',
    ).toBe("current");
    expect(
      videoFormatControl?.defaultValue,
      'Video format must default to "mp4".',
    ).toBe("mp4");
    const videoFormatControlId = getSectionControlIdByTarget(
      videoExportSection,
      "export.video.format",
    );
    const videoResolutionControlId = getSectionControlIdByTarget(
      videoExportSection,
      "export.video.resolution",
    );
    const videoExportHasInlinePair =
      videoFormatControlId === undefined || videoResolutionControlId === undefined
        ? false
        : videoExportSection?.layoutGroups?.some(
            (group) =>
              group.layout === "inline" &&
              group.controls.includes(videoFormatControlId) &&
              group.controls.includes(videoResolutionControlId),
          ) === true;

    expect(
      videoExportHasInlinePair,
      "Video Export format and resolution must render as a compact inline pair unless a documented fit fallback is used.",
    ).toBe(true);
    expect(
      sourceHasVideoCapabilityCheck(productImplementationSource),
      "Video export must check the supported MIME/container through MediaRecorder.isTypeSupported or an explicit encoder/transcoder capability check.",
    ).toBe(true);
    expect(
      productRuntimeImplementationSource,
      'Video export implementation must read "export.video.format" from runtime state; declaring the control is not enough.',
    ).toContain("export.video.format");
    expect(
      productRuntimeImplementationSource,
      'Video export implementation must read "export.video.resolution" from runtime state; declaring the control is not enough.',
    ).toContain("export.video.resolution");
    expect(
      sourceHasVideoDurationMetadataCoverage(browserTestSources),
      "Video export browser coverage must load the exported blob as a <video>, wait for loadedmetadata, and compare video.duration with the edited timeline duration. blobSize/blobType checks alone do not prove timeline-length export.",
    ).toBe(true);
    if (hasMovOrProResFormat) {
      expect(
        sourceHasCustomMovOrProResEncoder(productImplementationSource),
        "MOV or ProRes are not baseline browser MediaRecorder outputs; they require a custom encoder/transcoder path.",
      ).toBe(true);
    }
  });

  it("rejects reset actions in sticky footer panelActions", () => {
    const schemaWithFooterReset = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      command: "controls.reset",
                      icon: "rotate-ccw",
                      label: "Reset",
                      value: "reset",
                    },
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithFooterReset, [
        {
          actionCoverage: ["reset", "export.png"],
          automated: true,
          automatedTestName: "footer actions reset and export output",
          browser: true,
          browserTestName: "browser: footer actions reset and export output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable: "Footer actions reset controls and export output.",
          fixture: "footer actions fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction: "Click Reset and Export PNG.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not include Reset footer actions (reset)"),
      ]),
    );
  });

  it("requires png export apps to expose background color and png background toggle controls", () => {
    const schemaWithoutBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithoutBackgroundControls, [
        {
          actionCoverage: ["export.png"],
          automated: true,
          automatedTestName: "exports png output",
          browser: true,
          browserTestName: "browser: exports png output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable: "Export PNG creates output bytes.",
          fixture: "export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction: "Click Export PNG.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must expose a user-facing background color control"),
        expect.stringContaining('must expose export.includeBackground inside the required "Background" section'),
      ]),
    );
  });

  it("rejects legacy output sections that mix background controls with export actions", () => {
    const schemaWithLegacyBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                background: {
                  defaultValue: "#ffffff",
                  label: "Background",
                  target: "appearance.background",
                  type: "color",
                },
                includeBackground: {
                  defaultValue: true,
                  label: "Include background",
                  target: "export.includeBackground",
                  type: "switch",
                },
                outputActions: {
                  actions: [
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithLegacyBackgroundControls, [
        makeControlAcceptance("appearance.background", "color"),
        makeControlAcceptance("export.includeBackground", "switch"),
        {
          actionCoverage: ["export.png"],
          automated: true,
          automatedTestName: "exports png output",
          browser: true,
          browserTestName: "browser: exports png output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable: "Export PNG creates output bytes.",
          fixture: "export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction: "Click Export PNG.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('separate controls section titled "Background"'),
        expect.stringContaining(
          'The "Background" section must contain export.includeBackground as the Include switch.',
        ),
        expect.stringContaining(
          'The "Background" section must contain the renderer-owned background color control',
        ),
      ]),
    );
  });

  it("accepts png export apps that wire background controls into the schema", () => {
    const schemaWithBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });
    const errors = validateToolcraftAcceptanceCoverage(schemaWithBackgroundControls, [
      makeControlAcceptance("appearance.background", "color"),
      {
        ...makeControlAcceptance("export.includeBackground", "switch"),
        expectedObservable:
          "Turning Include background off hides the live preview product background and makes PNG output transparent while video output keeps the product background; turning it on restores preview and PNG background.",
        userAction:
          "Toggle Include background off, verify preview alpha, export PNG, verify PNG alpha, then toggle it on and verify preview and PNG include the background.",
      },
      {
        actionCoverage: ["export.png"],
        automated: true,
        automatedTestName: "exports png output with current background settings",
        browser: true,
        browserTestName: "browser: exports png output with current background settings",
        componentType: "panelActions",
        evidence: "exported-bytes",
        expectedObservable:
          "Export PNG creates output bytes and reads background color plus include-background state.",
        fixture: "export fixture",
        id: "actions.output",
        kind: "control",
        target: "actions.output",
        userAction: "Toggle Include background, change Background, then click Export PNG.",
      },
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("must expose a user-facing background color control"),
        expect.stringContaining('must expose export.includeBackground inside the required "Background" section'),
      ]),
    );
  });

  it("requires include-background acceptance to cover preview and PNG states", () => {
    const schemaWithBackgroundControls = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            {
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithBackgroundControls, [
        makeControlAcceptance("appearance.background", "color"),
        makeControlAcceptance("export.includeBackground", "switch"),
        {
          actionCoverage: ["export.png"],
          automated: true,
          automatedTestName: "exports png output with current background settings",
          browser: true,
          browserTestName: "browser: exports png output with current background settings",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable:
            "Export PNG creates output bytes and reads background color plus include-background state.",
          fixture: "export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction: "Toggle Include background, change Background, then click Export PNG.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "controls background inclusion and acceptance must prove disabling it hides the live preview product background and makes PNG output transparent, while enabling it restores preview/PNG background and video output keeps the product background.",
        ),
      ]),
    );
  });

  it("requires still-output apps to expose image export format and resolution settings", () => {
    const schemaWithoutImageExportSettings = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            {
              actionGroup: "secondary",
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithoutImageExportSettings, [
        makeControlAcceptance("appearance.background", "color"),
        makeControlAcceptance("export.includeBackground", "switch"),
        {
          actionCoverage: ["export.png"],
          automated: true,
          automatedTestName: "exports image output",
          browser: true,
          browserTestName: "browser: exports image output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable:
            "Export PNG creates output bytes and reads image format, image resolution, background color, and include-background state.",
          fixture: "export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction:
            "Toggle Include background off, verify preview alpha, export PNG, verify PNG alpha, then toggle it on and verify preview and PNG include the background.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Apps with Export PNG must expose image export settings in a separate controls section titled "Image Export" directly above sticky footer export actions or directly before "Video Export" when video export also exists.',
        'The separate "Image Export" section must include a format control with target "export.image.format".',
        'The separate "Image Export" section must include a resolution control with target "export.image.resolution".',
      ]),
    );
  });

  it("accepts still-output apps with image export settings", () => {
    const schemaWithImageExportSettings = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            {
              actionGroup: "secondary",
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
      },
    });
    const imageFormatAcceptance = makeControlAcceptance("export.image.format", "select");
    imageFormatAcceptance.optionCoverage = ["png", "jpg"];
    imageFormatAcceptance.expectedObservable =
      "PNG and JPG choices change the exported image MIME/file extension.";
    imageFormatAcceptance.userAction =
      "Choose PNG and JPG, export the image, and verify the blob type or file extension changes.";
    const imageResolutionAcceptance = makeControlAcceptance(
      "export.image.resolution",
      "select",
    );
    imageResolutionAcceptance.optionCoverage = ["2k", "4k", "8k"];
    imageResolutionAcceptance.expectedObservable =
      "Resolution choices change the actual exported image dimensions.";
    imageResolutionAcceptance.userAction =
      "Choose 2K and 8K, export each image, decode it, and compare actual pixel width/height.";

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithImageExportSettings, [
        makeControlAcceptance("appearance.background", "color"),
        makeControlAcceptance("export.includeBackground", "switch"),
        imageFormatAcceptance,
        imageResolutionAcceptance,
        {
          actionCoverage: ["export.png"],
          automated: true,
          automatedTestName: "exports image output",
          browser: true,
          browserTestName: "browser: exports image output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable:
            "Export PNG creates output bytes and reads image format, image resolution, background color, and include-background state. JPG changes file type; 8K changes exported pixel dimensions to an 8192px long edge.",
          fixture: "export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction:
            "Set format to JPG and resolution to 8K, then export and decode the output image to verify file type and long-edge dimensions.",
        },
      ]),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Image Export"),
        expect.stringContaining("export.image.format"),
        expect.stringContaining("export.image.resolution"),
      ]),
    );
  });

  it("requires animated apps with PNG and video actions to expose Image Export before Video Export", () => {
    const schemaWithoutImageSettings = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeVideoExportSection(),
            {
              actionGroup: "secondary",
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "download",
                      label: "Export Video",
                      value: "export.video",
                    },
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
        timeline: { enabled: true, mode: "playback" },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithoutImageSettings, [
        makeControlAcceptance("appearance.background", "color"),
        makeControlAcceptance("export.includeBackground", "switch"),
        makeControlAcceptance("export.video.format", "select"),
        makeControlAcceptance("export.video.resolution", "select"),
        {
          actionCoverage: ["export.video", "export.png"],
          automated: true,
          automatedTestName: "exports animated and still output",
          browser: true,
          browserTestName: "browser: exports video and image output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable:
            "Export Video and Export PNG both create output bytes and read their runtime export settings.",
          fixture: "animated export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction:
            "Export video and PNG from the same timeline state, then verify both files exist.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Apps with Export PNG must expose image export settings in a separate controls section titled "Image Export" directly above sticky footer export actions or directly before "Video Export" when video export also exists.',
        'The separate "Image Export" section must include a format control with target "export.image.format".',
        'The separate "Image Export" section must include a resolution control with target "export.image.resolution".',
      ]),
    );
  });

  it("accepts animated apps with Image Export immediately before Video Export", () => {
    const schemaWithDualExportSettings = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "editable-output" },
      },
      panels: {
        controls: {
          sections: [
            makeBackgroundSection(),
            makeImageExportSection(),
            makeVideoExportSection(),
            {
              actionGroup: "secondary",
              controls: {
                outputActions: {
                  actions: [
                    {
                      icon: "download",
                      label: "Export Video",
                      value: "export.video",
                    },
                    {
                      icon: "export",
                      label: "Export PNG",
                      value: "export.png",
                    },
                  ],
                  target: "actions.output",
                  type: "panelActions",
                },
              },
              title: "Export",
            },
          ],
          title: "Controls",
        },
        timeline: { enabled: true, mode: "playback" },
      },
    });
    const imageFormatAcceptance = makeControlAcceptance("export.image.format", "select");
    imageFormatAcceptance.optionCoverage = ["png", "jpg"];
    const imageResolutionAcceptance = makeControlAcceptance(
      "export.image.resolution",
      "select",
    );
    imageResolutionAcceptance.optionCoverage = ["2k", "4k", "8k"];
    const videoFormatAcceptance = makeControlAcceptance("export.video.format", "select");
    videoFormatAcceptance.optionCoverage = ["mp4", "webm"];
    const videoResolutionAcceptance = makeControlAcceptance(
      "export.video.resolution",
      "select",
    );
    videoResolutionAcceptance.optionCoverage = ["current", "4k"];

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithDualExportSettings, [
        makeControlAcceptance("appearance.background", "color"),
        makeControlAcceptance("export.includeBackground", "switch"),
        imageFormatAcceptance,
        imageResolutionAcceptance,
        videoFormatAcceptance,
        videoResolutionAcceptance,
        {
          actionCoverage: ["export.video", "export.png"],
          automated: true,
          automatedTestName: "exports animated and still output",
          browser: true,
          browserTestName: "browser: exports video and image output",
          componentType: "panelActions",
          evidence: "exported-bytes",
          expectedObservable:
            "Export Video and Export PNG both create output bytes and read their runtime export settings.",
          fixture: "animated export fixture",
          id: "actions.output",
          kind: "control",
          target: "actions.output",
          userAction:
            "Choose JPG and 8K, choose MP4 and Current, then export PNG and video and verify both outputs use their selected settings.",
        },
      ]),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Image Export"),
        expect.stringContaining("Video Export"),
      ]),
    );
  });

  it("requires disabledWhen controls to reference a real target and prove disabled behavior", () => {
    const schemaWithDisabledDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillMode: {
                  defaultValue: "full",
                  label: "Fill mode",
                  options: [
                    { label: "Full", value: "full" },
                    { label: "Partial", value: "partial" },
                  ],
                  target: "distribution.fillMode",
                  type: "segmented",
                },
                fillAmount: {
                  defaultValue: 50,
                  disabledWhen: {
                    equals: "full",
                    target: "distribution.mode",
                  },
                  label: "Fill level",
                  max: 100,
                  min: 0,
                  target: "distribution.fillAmount",
                  type: "slider",
                },
              },
              title: "Distribution",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithDisabledDependency, [
        makeControlAcceptance("distribution.fillMode", "segmented"),
        makeControlAcceptance("distribution.fillAmount", "slider"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "disabledWhen target distribution.mode does not match another schema control target",
        ),
        expect.stringContaining(
          "uses disabledWhen and acceptance must prove the control becomes disabled/unavailable",
        ),
      ]),
    );

    const schemaWithValidDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                fillMode: {
                  defaultValue: "full",
                  label: "Fill mode",
                  options: [
                    { label: "Full", value: "full" },
                    { label: "Partial", value: "partial" },
                  ],
                  target: "distribution.fillMode",
                  type: "segmented",
                },
                fillAmount: {
                  defaultValue: 50,
                  disabledWhen: {
                    equals: "full",
                    target: "distribution.fillMode",
                  },
                  label: "Fill level",
                  max: 100,
                  min: 0,
                  target: "distribution.fillAmount",
                  type: "slider",
                },
              },
              title: "Distribution",
            },
          ],
          title: "Controls",
        },
      },
    });
    const errors = validateToolcraftAcceptanceCoverage(schemaWithValidDependency, [
      makeControlAcceptance("distribution.fillMode", "segmented"),
      {
        ...makeControlAcceptance("distribution.fillAmount", "slider"),
        expectedObservable:
          "Fill level changes partial fill output and becomes disabled when Fill mode is Full.",
        userAction: "Switch Fill mode to Full, verify Fill level is disabled, then switch to Partial and drag it.",
      },
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("disabledWhen target"),
        expect.stringContaining("uses disabledWhen and acceptance must prove"),
      ]),
    );
  });

  it("requires visibleWhen controls to reference a real target and prove hidden behavior", () => {
    const schemaWithVisibleDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shadeCount: {
                  defaultValue: 2,
                  label: "Shades",
                  max: 5,
                  min: 1,
                  step: 1,
                  target: "shapes.shadeCount",
                  type: "slider",
                  variant: "discrete",
                },
                shade3: {
                  defaultValue: { hex: "#BBBBBB" },
                  label: "Shade 3",
                  target: "shapes.color3",
                  type: "color",
                  visibleWhen: {
                    greaterThanOrEqual: 3,
                    target: "shapes.count",
                  },
                },
              },
              title: "Shapes",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithVisibleDependency, [
        makeControlAcceptance("shapes.shadeCount", "slider"),
        makeControlAcceptance("shapes.color3", "color"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "visibleWhen target shapes.count does not match another schema control target",
        ),
        expect.stringContaining(
          "uses visibleWhen and acceptance must prove the control becomes visible and hidden/unavailable",
        ),
      ]),
    );

    const schemaWithValidVisibleDependency = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                shadeCount: {
                  defaultValue: 2,
                  label: "Shades",
                  max: 5,
                  min: 1,
                  step: 1,
                  target: "shapes.shadeCount",
                  type: "slider",
                  variant: "discrete",
                },
                shade3: {
                  defaultValue: { hex: "#BBBBBB" },
                  label: "Shade 3",
                  target: "shapes.color3",
                  type: "color",
                  visibleWhen: {
                    greaterThanOrEqual: 3,
                    target: "shapes.shadeCount",
                  },
                },
              },
              title: "Shapes",
            },
          ],
          title: "Controls",
        },
      },
    });
    const errors = validateToolcraftAcceptanceCoverage(
      schemaWithValidVisibleDependency,
      [
        makeControlAcceptance("shapes.shadeCount", "slider"),
        {
          ...makeControlAcceptance("shapes.color3", "color"),
          expectedObservable:
            "Shade 3 is hidden while Shades is below 3, becomes visible at 3, and changes the third active shape color.",
          userAction: "Set Shades to 2 and verify Shade 3 is hidden; set Shades to 3 and edit Shade 3.",
        },
      ],
    );

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("visibleWhen target"),
        expect.stringContaining("uses visibleWhen and acceptance must prove"),
      ]),
    );
  });

  it("rejects Enable or Disable prefixes on binary control labels", () => {
    const schemaWithActionLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                crt: {
                  defaultValue: true,
                  label: "Enable CRT",
                  target: "style.crt",
                  type: "switch",
                },
                guides: {
                  defaultValue: false,
                  label: "Disable guides",
                  target: "overlay.guides",
                  type: "checkbox",
                },
              },
              title: "Style",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithActionLabels, [
        makeControlAcceptance("style.crt", "switch"),
        makeControlAcceptance("overlay.guides", "checkbox"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'style.crt) toggle labels must name the setting context only; use "CRT", "Background", "Glow", or "Loop" instead of "Enable CRT".',
        ),
        expect.stringContaining(
          'overlay.guides) toggle labels must name the setting context only; use "CRT", "Background", "Glow", or "Loop" instead of "Disable guides".',
        ),
      ]),
    );

    const schemaWithContextLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                crt: {
                  defaultValue: true,
                  label: "CRT",
                  target: "style.crt",
                  type: "switch",
                },
                guides: {
                  defaultValue: false,
                  label: "Guides",
                  target: "overlay.guides",
                  type: "checkbox",
                },
              },
              title: "Style",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schemaWithContextLabels, [
      makeControlAcceptance("style.crt", "switch"),
      makeControlAcceptance("overlay.guides", "checkbox"),
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("toggle labels must name the setting context only"),
      ]),
    );
  });

  it("rejects binary control labels that duplicate their section title", () => {
    const schemaWithDuplicateToggleLabel = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                includeBackground: {
                  defaultValue: true,
                  label: "Background",
                  target: "export.includeBackground",
                  type: "switch",
                },
              },
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithDuplicateToggleLabel, [
        makeControlAcceptance("export.includeBackground", "switch"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'export.includeBackground) toggle label "Background" duplicates section title "Background". Use a shorter contextual label such as "Include" or rename the toggle to a more specific setting.',
        ),
      ]),
    );
  });

  it("allows short Include toggle plus an unlabeled background color in the required row", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                includeBackground: {
                  defaultValue: true,
                  description:
                    "Controls live preview product background and PNG background transparency while video keeps the background.",
                  label: "Include",
                  target: "export.includeBackground",
                  type: "switch",
                },
                background: {
                  defaultValue: "#0F0F0F",
                  label: false,
                  target: "appearance.background",
                  type: "color",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["includeBackground", "background"],
                  layout: "inline",
                },
              ],
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schema, [
      makeControlAcceptance("export.includeBackground", "switch"),
      makeControlAcceptance("appearance.background", "color"),
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("duplicates section title"),
        expect.stringContaining("too long for a two-column toggle row"),
        expect.stringContaining("must use the short visible label"),
        expect.stringContaining("must use label false"),
      ]),
    );
  });

  it("allows short visible toggle labels beside one related parameter", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                loop: {
                  defaultValue: true,
                  label: "Loop",
                  target: "animation.loop",
                  type: "switch",
                },
                duration: {
                  defaultValue: "8",
                  label: "Duration",
                  target: "animation.duration",
                  type: "text",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["loop", "duration"],
                  layout: "inline",
                },
              ],
              title: "Playback",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schema, [
      makeControlAcceptance("animation.loop", "switch"),
      makeControlAcceptance("animation.duration", "text"),
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([expect.stringContaining("compact toggle-plus-parameter row")]),
    );
  });

  it("rejects long visible toggle labels beside one related parameter", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                transparentBackground: {
                  defaultValue: true,
                  label: "Transparent background",
                  target: "export.transparentBackground",
                  type: "switch",
                },
                background: {
                  defaultValue: "#0F0F0F",
                  label: "Background",
                  target: "appearance.background",
                  type: "color",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["transparentBackground", "background"],
                  layout: "inline",
                },
              ],
              title: "Background",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        makeControlAcceptance("export.transparentBackground", "switch"),
        makeControlAcceptance("appearance.background", "color"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Background layoutGroups inline row "transparentBackground, background" includes toggle label transparentBackground "Transparent background" that is too long for a compact toggle-plus-parameter row.',
        ),
      ]),
    );
  });

  it("allows inline switch pairs when both labels are compact", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                glow: {
                  defaultValue: true,
                  label: "Glow",
                  target: "style.glow",
                  type: "switch",
                },
                loop: {
                  defaultValue: false,
                  label: "Loop",
                  target: "animation.loop",
                  type: "switch",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["glow", "loop"],
                  layout: "inline",
                },
              ],
              title: "Style",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schema, [
      makeControlAcceptance("style.glow", "switch"),
      makeControlAcceptance("animation.loop", "switch"),
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([expect.stringContaining("two-column toggle row")]),
    );
  });

  it("requires adjacent compact toggle pairs for the same target entity to use an inline row", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                snapX: {
                  defaultValue: true,
                  label: "Snap X",
                  target: "icon.snapX",
                  type: "switch",
                },
                snapY: {
                  defaultValue: true,
                  label: "Snap Y",
                  target: "icon.snapY",
                  type: "switch",
                },
              },
              title: "Icon Mark",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        makeControlAcceptance("icon.snapX", "switch"),
        makeControlAcceptance("icon.snapY", "switch"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Icon Mark has adjacent short toggle controls "snapX" and "snapY" for the same product entity "icon". Put them in a two-column inline layoutGroup so compact paired toggles share one row.',
      ]),
    );
  });

  it("accepts adjacent compact toggle pairs for the same target entity when they use an inline row", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                snapX: {
                  defaultValue: true,
                  label: "Snap X",
                  target: "icon.snapX",
                  type: "switch",
                },
                snapY: {
                  defaultValue: true,
                  label: "Snap Y",
                  target: "icon.snapY",
                  type: "switch",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["snapX", "snapY"],
                  layout: "inline",
                },
              ],
              title: "Icon Mark",
            },
          ],
          title: "Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(schema, [
      makeControlAcceptance("icon.snapX", "switch"),
      makeControlAcceptance("icon.snapY", "switch"),
    ]);

    expect(errors).not.toEqual(
      expect.arrayContaining([expect.stringContaining("compact paired toggles share one row")]),
    );
  });

  it("rejects inline switch pairs when a label would truncate", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                background: {
                  defaultValue: true,
                  label: "Background",
                  target: "output.background",
                  type: "switch",
                },
                diagnosticOverlay: {
                  defaultValue: false,
                  label: "Diagnostic overlay",
                  target: "debug.diagnosticOverlay",
                  type: "switch",
                },
              },
              layoutGroups: [
                {
                  columns: 2,
                  controls: ["background", "diagnosticOverlay"],
                  layout: "inline",
                },
              ],
              title: "Output",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schema, [
        makeControlAcceptance("output.background", "switch"),
        makeControlAcceptance("debug.diagnosticOverlay", "switch"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Output layoutGroups inline row "background, diagnosticOverlay" includes switch labels diagnosticOverlay "Diagnostic overlay" that are too long for a two-column toggle row. Switches share a row only when every visible label fits without truncation; shorten labels or stack them.',
      ]),
    );
  });

  it("requires explicit reference behavior coverage in reference-runtime-clone mode", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, appAcceptance, {
        behaviorCoverage: [
          "canvas-sizing",
          "control-mapping",
          "renderer-state",
          "renderer-loop",
        ],
        mode: "reference-runtime-clone",
        referenceName: "legacy badge wall",
        sourceOfTruth: "reference-runtime",
      } as never),
    ).toEqual(
      expect.arrayContaining([
        'reference-runtime-clone behaviorCoverage "canvas-sizing" is missing an acceptance entry with referenceCoverage "canvas-sizing".',
        'reference-runtime-clone behaviorCoverage "control-mapping" is missing an acceptance entry with referenceCoverage "control-mapping".',
        'reference-runtime-clone behaviorCoverage "renderer-state" is missing an acceptance entry with referenceCoverage "renderer-state".',
        'reference-runtime-clone behaviorCoverage "renderer-loop" is missing an acceptance entry with referenceCoverage "renderer-loop".',
        'reference-runtime-clone transferMode must declare referenceTimeline with mode "none", "toolcraft-playback", "toolcraft-keyframes", or "custom-reference-timeline".',
      ]),
    );
  });

  it("rejects reference-runtime-clone apps that disable the Toolcraft canvas shell", () => {
    const schemaWithoutCanvas = defineToolcraft({
      canvas: {
        enabled: false,
        size: { height: 720, unit: "px", width: 1280 },
      },
      panels: {},
      toolbar: {
        history: false,
        radar: false,
        theme: false,
        zoom: false,
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(
        schemaWithoutCanvas,
        [
          ...appAcceptance,
          {
            automated: true,
            automatedTestName: "reference canvas size matches legacy renderer",
            browser: true,
            browserTestName: "browser: reference canvas size matches legacy renderer",
            componentType: "custom-renderer",
            evidence: "rendered-pixels",
            expectedObservable:
              "The Toolcraft renderer uses the same output dimensions as the reference runtime.",
            fixture: "legacy renderer fixture",
            id: "reference.canvasSizing",
            kind: "runtime",
            referenceCoverage: "canvas-sizing",
            userAction: "Render the reference-sized output.",
          },
          {
            automated: true,
            automatedTestName: "reference control mapping preserves legacy output",
            browser: true,
            browserTestName: "browser: reference control mapping preserves legacy output",
            componentType: "custom-renderer",
            evidence: "product-output",
            expectedObservable:
              "Changing each mapped control updates the same renderer parameter as the reference app.",
            fixture: "legacy controls fixture",
            id: "reference.controlMapping",
            kind: "runtime",
            referenceCoverage: "control-mapping",
            userAction: "Change mapped controls and compare reference output behavior.",
          },
          {
            automated: true,
            automatedTestName: "reference renderer state preserves legacy lifecycle",
            browser: true,
            browserTestName: "browser: reference renderer state preserves legacy lifecycle",
            componentType: "custom-renderer",
            evidence: "product-output",
            expectedObservable:
              "The renderer preserves the reference runtime mutable state lifecycle across frames.",
            fixture: "legacy renderer state fixture",
            id: "reference.rendererState",
            kind: "runtime",
            referenceCoverage: "renderer-state",
            userAction: "Run the renderer across frames and compare stateful output.",
          },
        ],
        {
          behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
          mode: "reference-runtime-clone",
          referenceName: "legacy iframe shell",
          referenceTimeline: { behaviorCoverage: [], mode: "none" },
          sourceOfTruth: "reference-runtime",
        },
      ),
    ).toContain(
      "reference-runtime-clone must keep the Toolcraft canvas shell enabled; preserve the reference renderer inside ToolcraftApp canvasContent instead of replacing the app with the original UI.",
    );
  });

  it("accepts reference-runtime-clone mode only when required reference behavior is test-backed", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        appSchema,
        [
          ...appAcceptance,
          {
            automated: true,
            automatedTestName: "reference canvas size matches legacy renderer",
            browser: true,
            browserTestName: "browser: reference canvas size matches legacy renderer",
            componentType: "custom-renderer",
            evidence: "rendered-pixels",
            expectedObservable:
              "The Toolcraft renderer uses the same output dimensions as the reference runtime.",
            fixture: "legacy renderer fixture",
            id: "reference.canvasSizing",
            kind: "runtime",
            referenceCoverage: "canvas-sizing",
            userAction: "Render the reference-sized output.",
          },
          {
            automated: true,
            automatedTestName: "reference control mapping preserves legacy output",
            browser: true,
            browserTestName: "browser: reference control mapping preserves legacy output",
            componentType: "custom-renderer",
            evidence: "product-output",
            expectedObservable:
              "Changing each mapped control updates the same renderer parameter as the reference app.",
            fixture: "legacy controls fixture",
            id: "reference.controlMapping",
            kind: "runtime",
            referenceCoverage: "control-mapping",
            userAction: "Change mapped controls and compare reference output behavior.",
          },
          {
            automated: true,
            automatedTestName: "reference renderer state preserves legacy lifecycle",
            browser: true,
            browserTestName: "browser: reference renderer state preserves legacy lifecycle",
            componentType: "custom-renderer",
            evidence: "product-output",
            expectedObservable:
              "The renderer preserves the reference runtime mutable state lifecycle across frames.",
            fixture: "legacy renderer state fixture",
            id: "reference.rendererState",
            kind: "runtime",
            referenceCoverage: "renderer-state",
            userAction: "Run the renderer across frames and compare stateful output.",
          },
        ],
        {
          behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
          mode: "reference-runtime-clone",
          referenceName: "legacy badge wall",
          referenceTimeline: { behaviorCoverage: [], mode: "none" },
          sourceOfTruth: "reference-runtime",
        },
      ),
    ).toEqual([]);
  });

  it("requires reference clones with pause resume behavior to choose a non-none timeline mode", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, appAcceptance, {
        behaviorCoverage: [
          "canvas-sizing",
          "control-mapping",
          "renderer-state",
          "pause-resume",
        ],
        mode: "reference-runtime-clone",
        referenceName: "legacy pause animation",
        referenceTimeline: { behaviorCoverage: [], mode: "none" },
        sourceOfTruth: "reference-runtime",
      }),
    ).toContain(
      'reference-runtime-clone transport behaviorCoverage "pause-resume" requires referenceTimeline mode "toolcraft-playback", "toolcraft-keyframes", or "custom-reference-timeline"; mode "none" is only for references with no user-facing transport behavior.',
    );
  });

  it("rejects reference clones that hide restart transport behind timeline none", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, appAcceptance, {
        behaviorCoverage: [
          "canvas-sizing",
          "control-mapping",
          "renderer-state",
          "restart",
          "time-progress",
        ],
        mode: "reference-runtime-clone",
        referenceName: "legacy restart animation",
        referenceTimeline: { behaviorCoverage: [], mode: "none" },
        sourceOfTruth: "reference-runtime",
      }),
    ).toContain(
      'reference-runtime-clone transport behaviorCoverage "restart", "time-progress" requires referenceTimeline mode "toolcraft-playback", "toolcraft-keyframes", or "custom-reference-timeline"; mode "none" is only for references with no user-facing transport behavior.',
    );
  });

  it("requires playback reference timelines to declare concrete behavior coverage", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, appAcceptance, {
        behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
        mode: "reference-runtime-clone",
        referenceName: "legacy playback animation",
        referenceTimeline: { behaviorCoverage: [], mode: "toolcraft-playback" },
        sourceOfTruth: "reference-runtime",
      }),
    ).toContain(
      'referenceTimeline mode "toolcraft-playback" must list the concrete timeline transport behaviors in behaviorCoverage.',
    );
  });

  it("rejects right-panel transport controls when timeline playback owns transport", () => {
    const schemaWithPanelTransportControls = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                pause: {
                  defaultValue: false,
                  label: "Paused",
                  orderRole: "primary",
                  target: "animation.paused",
                  type: "switch",
                },
                restart: {
                  actions: [
                    {
                      icon: "rotate-ccw",
                      label: "Restart",
                      value: "animation.restart",
                    },
                  ],
                  defaultValue: null,
                  label: "Run",
                  orderRole: "action",
                  target: "animation.actions",
                  type: "actions",
                },
              },
              title: "Run",
            },
          ],
          title: "Controls",
        },
        timeline: { enabled: true, mode: "playback" as const },
      },
    } as const;

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithPanelTransportControls, [
        playbackTimelineAcceptance,
        {
          automated: true,
          automatedTestName: "paused switch freezes output",
          browser: true,
          browserTestName: "browser: paused switch freezes output",
          componentType: "switch",
          evidence: "timeline-output",
          expectedObservable: "Paused switch freezes the timeline output.",
          fixture: "timeline fixture",
          id: "animation.paused",
          kind: "control",
          target: "animation.paused",
          userAction: "Toggle Paused.",
        },
        {
          automated: true,
          automatedTestName: "restart action resets output",
          browser: true,
          browserTestName: "browser: restart action resets output",
          componentType: "actions",
          evidence: "timeline-output",
          expectedObservable: "Restart returns animation output to the first frame.",
          fixture: "timeline fixture",
          id: "animation.actions",
          kind: "control",
          target: "animation.actions",
          userAction: "Click Restart.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Run / pause (animation.paused) looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.",
        "Run / restart (animation.actions) looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.",
      ]),
    );
  });

  it("rejects right-panel transport controls even when the timeline was omitted", () => {
    const schemaWithOmittedTimelineAndPanelPause = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                pause: {
                  defaultValue: false,
                  label: "Pause",
                  orderRole: "primary",
                  target: "animation.pause",
                  type: "switch",
                },
              },
              title: "Animation",
            },
          ],
          title: "Controls",
        },
        timeline: undefined,
      },
    } as const;

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithOmittedTimelineAndPanelPause, [
        playbackTimelineAcceptance,
        {
          automated: true,
          automatedTestName: "pause switch freezes output",
          browser: true,
          browserTestName: "browser: pause switch freezes output",
          componentType: "switch",
          evidence: "timeline-output",
          expectedObservable: "Pause switch freezes animation output.",
          fixture: "timeline fixture",
          id: "animation.pause",
          kind: "control",
          target: "animation.pause",
          userAction: "Toggle Pause.",
        },
      ]),
    ).toContain(
      "Animation / pause (animation.pause) looks like an app-wide timeline transport control. Play, Pause, Animate, Resume, and Restart animation belong to the top timeline; keep right-panel controls for renderer parameters, generation/apply actions, and output delivery.",
    );
  });

  it("requires autonomous animation intent when animation controls exist without a timeline", () => {
    const schemaWithAnimationControls = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 64,
                  label: "Speed",
                  max: 100,
                  min: 0,
                  orderRole: "strength",
                  target: "animation.speed",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Animation",
            },
          ],
          title: "Controls",
        },
        timeline: undefined,
      },
    } as const;

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithAnimationControls, [
        makeControlAcceptance("animation.speed", "slider"),
      ]),
    ).toContain(
      'Animation controls "Animation / speed" (animation.speed) exist while panels.timeline is omitted. Use panels.timeline mode "playback" for product animation transport, mode "keyframes" for editable keyframes, or declare appTransferMode.animationIntent mode "autonomous" with coverage proving there is no user-facing transport.',
    );
  });

  it("accepts explicit autonomous animation intent for decorative self-running output", () => {
    const schemaWithAutonomousAnimation = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                shimmer: {
                  defaultValue: 40,
                  label: "Shimmer",
                  max: 100,
                  min: 0,
                  orderRole: "detail",
                  target: "animation.shimmer",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Animation",
            },
          ],
          title: "Controls",
        },
        timeline: undefined,
      },
      persistence: { storage: "none" as const },
    } as const;

    expect(
      validateToolcraftAcceptanceCoverage(
        schemaWithAutonomousAnimation,
        [makeControlAcceptance("animation.shimmer", "slider")],
        {
          animationIntent: {
            behaviorCoverage: [
              "no-user-facing-transport",
              "no-play-pause",
              "no-scrub",
              "no-duration-control",
              "no-loop-control",
              "no-export-at-time",
            ],
            mode: "autonomous",
            reason:
              "The shimmer is decorative self-running output and does not expose product time transport.",
          },
          mode: "new-toolcraft-app",
        },
      ),
    ).toEqual([]);
  });

  it("rejects timeline animation intent when the timeline mode does not match", () => {
    const schemaWithPlaybackTimeline = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        timeline: { enabled: true, mode: "playback" as const },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(
        schemaWithPlaybackTimeline,
        [playbackTimelineAcceptance],
        {
          animationIntent: { mode: "timeline-keyframes" },
          mode: "new-toolcraft-app",
        },
      ),
    ).toContain(
      'appTransferMode.animationIntent mode "timeline-keyframes" requires panels.timeline mode "keyframes".',
    );
  });

  it("rejects downgrading custom reference timeline behavior to Toolcraft playback", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, appAcceptance, {
        behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
        mode: "reference-runtime-clone",
        referenceName: "legacy state timeline",
        referenceTimeline: {
          behaviorCoverage: ["state-jump", "trim-range"],
          mode: "toolcraft-playback",
        },
        sourceOfTruth: "reference-runtime",
      }),
    ).toEqual(
      expect.arrayContaining([
        'referenceTimeline mode "toolcraft-playback" cannot preserve custom reference timeline behavior "state-jump". Use mode "custom-reference-timeline" and browser-backed referenceTimelineCoverage instead.',
        'referenceTimeline mode "toolcraft-playback" cannot preserve custom reference timeline behavior "trim-range". Use mode "custom-reference-timeline" and browser-backed referenceTimelineCoverage instead.',
        'referenceTimeline behaviorCoverage "state-jump" is missing an acceptance entry with referenceTimelineCoverage "state-jump".',
        'referenceTimeline behaviorCoverage "trim-range" is missing an acceptance entry with referenceTimelineCoverage "trim-range".',
      ]),
    );
  });

  it("accepts custom reference timeline behavior only when it is test-backed", () => {
    expect(
      validateToolcraftAcceptanceCoverage(
        appSchema,
        [
          ...appAcceptance,
          {
            automated: true,
            automatedTestName: "reference canvas size matches legacy renderer",
            browser: true,
            browserTestName: "browser: reference canvas size matches legacy renderer",
            componentType: "custom-renderer",
            evidence: "rendered-pixels",
            expectedObservable:
              "The Toolcraft renderer uses the same output dimensions as the reference runtime.",
            fixture: "legacy renderer fixture",
            id: "reference.canvasSizing",
            kind: "runtime",
            referenceCoverage: "canvas-sizing",
            userAction: "Render the reference-sized output.",
          },
          {
            automated: true,
            automatedTestName: "reference control mapping preserves legacy output",
            browser: true,
            browserTestName: "browser: reference control mapping preserves legacy output",
            componentType: "custom-renderer",
            evidence: "product-output",
            expectedObservable:
              "Changing each mapped control updates the same renderer parameter as the reference app.",
            fixture: "legacy controls fixture",
            id: "reference.controlMapping",
            kind: "runtime",
            referenceCoverage: "control-mapping",
            userAction: "Change mapped controls and compare reference output behavior.",
          },
          {
            automated: true,
            automatedTestName: "reference renderer state preserves legacy lifecycle",
            browser: true,
            browserTestName: "browser: reference renderer state preserves legacy lifecycle",
            componentType: "custom-renderer",
            evidence: "product-output",
            expectedObservable:
              "The renderer preserves the reference runtime mutable state lifecycle across frames.",
            fixture: "legacy renderer state fixture",
            id: "reference.rendererState",
            kind: "runtime",
            referenceCoverage: "renderer-state",
            userAction: "Run the renderer across frames and compare stateful output.",
          },
          {
            automated: true,
            automatedTestName: "reference timeline state buttons preserve legacy jumps",
            browser: true,
            browserTestName: "browser: reference timeline state buttons preserve legacy jumps",
            componentType: "custom-timeline",
            evidence: "timeline-output",
            expectedObservable:
              "Clicking each reference timeline state renders the matching legacy state.",
            fixture: "legacy state timeline fixture",
            id: "reference.timeline.stateJump",
            kind: "runtime",
            referenceTimelineCoverage: "state-jump",
            userAction: "Click each reference timeline state button.",
          },
          {
            automated: true,
            automatedTestName: "reference timeline trim handles preserve legacy range",
            browser: true,
            browserTestName: "browser: reference timeline trim handles preserve legacy range",
            componentType: "custom-timeline",
            evidence: "timeline-output",
            expectedObservable:
              "Dragging trim handles changes the same start/end state range as the reference.",
            fixture: "legacy trim timeline fixture",
            id: "reference.timeline.trimRange",
            kind: "runtime",
            referenceTimelineCoverage: "trim-range",
            userAction: "Drag reference timeline trim handles.",
          },
        ],
        {
          behaviorCoverage: ["canvas-sizing", "control-mapping", "renderer-state"],
          mode: "reference-runtime-clone",
          referenceName: "legacy state timeline",
          referenceTimeline: {
            behaviorCoverage: ["state-jump", "trim-range"],
            mode: "custom-reference-timeline",
          },
          sourceOfTruth: "reference-runtime",
        },
      ),
    ).toEqual([]);
  });

  it("rejects reference coverage entries outside reference-runtime-clone mode", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "reference renderer state preserves legacy lifecycle",
          browser: true,
          browserTestName: "browser: reference renderer state preserves legacy lifecycle",
          componentType: "custom-renderer",
          evidence: "product-output",
          expectedObservable:
            "The renderer preserves the reference runtime mutable state lifecycle across frames.",
          fixture: "legacy renderer state fixture",
          id: "reference.rendererState",
          kind: "runtime",
          referenceCoverage: "renderer-state",
          userAction: "Run the renderer across frames and compare stateful output.",
        },
        {
          automated: true,
          automatedTestName: "reference timeline trim handles preserve legacy range",
          browser: true,
          browserTestName: "browser: reference timeline trim handles preserve legacy range",
          componentType: "custom-timeline",
          evidence: "timeline-output",
          expectedObservable:
            "Dragging trim handles changes the same start/end state range as the reference.",
          fixture: "legacy trim timeline fixture",
          id: "reference.timeline.trimRange",
          kind: "runtime",
          referenceTimelineCoverage: "trim-range",
          userAction: "Drag reference timeline trim handles.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'reference.rendererState declares referenceCoverage "renderer-state" but transferMode is not "reference-runtime-clone".',
        'reference.timeline.trimRange declares referenceTimelineCoverage "trim-range" but transferMode is not "reference-runtime-clone".',
      ]),
    );
  });

  it("requires layer behavior coverage when a layers panel is enabled", () => {
    const layersSchema = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        layers: true,
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(layersSchema, appAcceptance),
    ).toEqual(
      expect.arrayContaining([
        'panels.layers requires a runtime acceptance entry with layerCoverage "selection" proving layer selection behavior.',
        'panels.layers requires a runtime acceptance entry with layerCoverage "visibility" proving layer visibility behavior.',
        'panels.layers requires a runtime acceptance entry with layerCoverage "reorder" proving layer reorder behavior.',
        'panels.layers requires a runtime acceptance entry with layerCoverage "grouping" proving layer grouping behavior.',
      ]),
    );
  });

  it("rejects selectedLayer targets when the layers panel is disabled", () => {
    const schemaWithSelectedLayerControl = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  target: "selectedLayer.opacity",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Layer",
            },
          ],
          title: "Controls",
        },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithSelectedLayerControl, [
        playbackTimelineAcceptance,
        {
          automated: true,
          automatedTestName: "opacity changes rendered output",
          browser: true,
          browserTestName: "browser: opacity slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Opacity changes layer transparency.",
          fixture: "opacity fixture",
          id: "selectedLayer.opacity",
          kind: "control",
          target: "selectedLayer.opacity",
          userAction: "Drag the Opacity slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Layer / opacity (selectedLayer.opacity) uses reserved selectedLayer.* target without panels.layers enabled. Use an app-specific target for single-layer apps or enable layers with layerCoverage.",
      ]),
    );
  });

  it("requires selectedLayer controls to prove currently selected layer behavior", () => {
    const layeredSchema = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  target: "selectedLayer.opacity",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Layer",
            },
          ],
          title: "Controls",
        },
        layers: true,
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(layeredSchema, [
        playbackTimelineAcceptance,
        {
          automated: true,
          automatedTestName: "layer selection changes selected runtime layer",
          browser: true,
          browserTestName: "browser: layers selection changes selected runtime layer",
          componentType: "layers",
          evidence: "product-output",
          expectedObservable: "Selecting another layer changes which output layer is edited.",
          fixture: "layered output fixture",
          id: "layers.selection",
          kind: "runtime",
          layerCoverage: "selection",
          userAction: "Select another layer.",
        },
        {
          automated: true,
          automatedTestName: "layer visibility hides nested layer output",
          browser: true,
          browserTestName: "browser: layers visibility hides nested layer output",
          componentType: "layers",
          evidence: "product-output",
          expectedObservable: "Toggling layer visibility removes that layer from output.",
          fixture: "layered output fixture",
          id: "layers.visibility",
          kind: "runtime",
          layerCoverage: "visibility",
          userAction: "Toggle a layer visibility button.",
        },
        {
          automated: true,
          automatedTestName: "layer reorder changes render order",
          browser: true,
          browserTestName: "browser: layers reorder changes render order",
          componentType: "layers",
          evidence: "product-output",
          expectedObservable: "Dragging a layer changes composited render order.",
          fixture: "overlapping layers fixture",
          id: "layers.reorder",
          kind: "runtime",
          layerCoverage: "reorder",
          userAction: "Drag a layer before another layer.",
        },
        {
          automated: true,
          automatedTestName: "layer grouping nests layer output",
          browser: true,
          browserTestName: "browser: layers grouping nests layer output",
          componentType: "layers",
          evidence: "product-output",
          expectedObservable:
            "Dragging a layer into a group nests it and group visibility affects the nested output.",
          fixture: "grouped layers fixture",
          id: "layers.grouping",
          kind: "runtime",
          layerCoverage: "grouping",
          userAction: "Drag a layer into a group.",
        },
        {
          automated: true,
          automatedTestName: "opacity changes rendered output",
          browser: true,
          browserTestName: "browser: opacity slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Opacity changes layer transparency.",
          fixture: "opacity fixture",
          id: "selectedLayer.opacity",
          kind: "control",
          target: "selectedLayer.opacity",
          userAction: "Drag the Opacity slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Layer / opacity (selectedLayer.opacity) targets selectedLayer.* and must have acceptance layerCoverage "selected-layer-controls" proving the control edits the currently selected layer output.',
      ]),
    );
  });

  it("requires each acceptance entry to point at an automated app test", () => {
    const testSources = readSiblingAppTestSources();

    for (const entry of appAcceptance) {
      if (!entry.automated) {
        continue;
      }

      expect(
        testSources,
        `${entry.id} must be backed by an app test named "${entry.automatedTestName}".`,
      ).toContain(entry.automatedTestName);
    }
  });

  it("requires each browser acceptance entry to point at a Playwright test", () => {
    const browserTestSources = readBrowserTestSources();

    for (const entry of appAcceptance) {
      if (!entry.browser) {
        continue;
      }

      expect(
        browserTestSources,
        `${entry.id} must be backed by a Playwright test named "${entry.browserTestName}".`,
      ).toContain(entry.browserTestName);

      if (entry.timelineCoverage === "playback" && acceptanceCoversTimelineDurationEdit(entry)) {
        expect(
          browserTestSources,
          `${entry.id} duration coverage must click the real timeline duration editor.`,
        ).toContain("Edit timeline duration");
        expect(
          browserTestSources,
          `${entry.id} duration coverage must edit the contenteditable timeline duration textbox.`,
        ).toContain('name: "timeline duration"');
        expect(
          browserTestSources,
          `${entry.id} duration coverage must prove the playback range changes after editing duration.`,
        ).toMatch(/aria-valuemax|durationSeconds/);
      }
    }
  });

  it("requires canvas handles to declare runtime, browser, and export-clean coverage", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "gradient focus handle changes rendered output",
          browser: true,
          browserTestName: "browser: gradient focus handle drags on canvas",
          componentType: "canvas-handle",
          evidence: "product-output",
          expectedObservable: "Dragging the focus handle moves the gradient hotspot.",
          fixture: "radial gradient fixture",
          id: "shader.focus.handle",
          kind: "canvas-handle",
          userAction: "Drag the focus handle on the canvas.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "shader.focus.handle canvas handle is missing canvasHandle metadata.",
      ]),
    );
  });

  it("requires canvas handle write targets to exist in schema or editor commands", () => {
    expect(
      validateToolcraftAcceptanceCoverage(appSchema, [
        ...appAcceptance,
        {
          automated: true,
          automatedTestName: "gradient focus handle changes rendered output",
          browser: true,
          browserTestName: "browser: gradient focus handle drags on canvas",
          canvasHandle: {
            exportCleanTestName: "export excludes gradient focus handle",
            outputObservable: "The gradient hotspot moves after dragging the handle.",
            testId: "gradient-focus-handle",
            writesTarget: "missing.target",
          },
          componentType: "canvas-handle",
          evidence: "product-output",
          expectedObservable: "Dragging the focus handle moves the gradient hotspot.",
          fixture: "radial gradient fixture",
          id: "shader.focus.handle",
          kind: "canvas-handle",
          userAction: "Drag the focus handle on the canvas.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "shader.focus.handle canvas handle writesTarget missing.target does not match a schema target or supported editor command.",
      ]),
    );
  });

  it("accepts stepped continuous sliders without forcing the discrete visual variant", () => {
    const schemaWithAmbiguousSlider = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                grain: {
                  defaultValue: 0.08,
                  label: "Grain",
                  max: 0.35,
                  min: 0,
                  step: 0.01,
                  target: "shader.grain",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Volume",
            },
          ],
          title: "Shader",
        },
        timeline: undefined,
      },
      persistence: { storage: "none" as const },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithAmbiguousSlider, [
        {
          automated: true,
          automatedTestName: "grain changes rendered output",
          browser: true,
          browserTestName: "browser: grain slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Grain changes pixel variance.",
          fixture: "grain fixture",
          id: "shader.grain",
          kind: "control",
          target: "shader.grain",
          userAction: "Drag the Grain slider.",
        },
      ]),
    ).toEqual([]);
  });

  it("requires small semantic integer sliders to use the visual discrete variant", () => {
    const schemaWithMissingDiscreteSliders = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                maskGap: {
                  defaultValue: 5,
                  label: "Mask gap",
                  max: 12,
                  min: 0,
                  orderRole: "detail",
                  step: 1,
                  target: "ascii.maskGap",
                  type: "slider",
                  unit: "cols",
                },
                verticalJitter: {
                  defaultValue: 1,
                  label: "Vertical jitter",
                  max: 4,
                  min: 0,
                  orderRole: "detail",
                  step: 1,
                  target: "ascii.verticalJitter",
                  type: "slider",
                  unit: "rows",
                },
              },
              title: "Mask",
            },
          ],
          title: "ASCII",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithMissingDiscreteSliders, [
        {
          automated: true,
          automatedTestName: "mask gap changes rendered output",
          browser: true,
          browserTestName: "browser: mask gap slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Mask gap changes row reveal boundaries.",
          fixture: "ASCII fixture",
          id: "ascii.maskGap",
          kind: "control",
          target: "ascii.maskGap",
          userAction: "Drag the Mask gap slider.",
        },
        {
          automated: true,
          automatedTestName: "vertical jitter changes rendered output",
          browser: true,
          browserTestName: "browser: vertical jitter slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Vertical jitter changes row displacement.",
          fixture: "ASCII fixture",
          id: "ascii.verticalJitter",
          kind: "control",
          target: "ascii.verticalJitter",
          userAction: "Drag the Vertical jitter slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Mask / maskGap (ascii.maskGap) has 13 semantic integer positions and must use variant "discrete" so Toolcraft renders tick markers.',
        'Mask / verticalJitter (ascii.verticalJitter) has 5 semantic integer positions and must use variant "discrete" so Toolcraft renders tick markers.',
      ]),
    );
  });

  it("requires flip-depth integer sliders to use the visual discrete variant", () => {
    const schemaWithFlipDepthSlider = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 1.1,
                  label: "Speed",
                  max: 2.5,
                  min: 0.5,
                  step: 0.1,
                  target: "animation.speed",
                  type: "slider",
                  unit: "x",
                  variant: "continuous",
                },
                depth: {
                  defaultValue: 12,
                  label: "Flip depth",
                  max: 28,
                  min: 4,
                  step: 1,
                  target: "animation.depth",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Motion",
            },
          ],
          title: "Board",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithFlipDepthSlider, [
        {
          automated: true,
          automatedTestName: "speed changes animation timing",
          browser: true,
          browserTestName: "browser: speed slider changes animation timing",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Speed changes the animation cadence.",
          fixture: "board speed fixture",
          id: "animation.speed",
          kind: "control",
          target: "animation.speed",
          userAction: "Drag the Speed slider.",
        },
        {
          automated: true,
          automatedTestName: "flip depth changes intermediate characters",
          browser: true,
          browserTestName: "browser: flip depth slider changes intermediate characters",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable:
            "Changing Flip depth changes the number of intermediate character steps.",
          fixture: "board flip depth fixture",
          id: "animation.depth",
          kind: "control",
          target: "animation.depth",
          userAction: "Drag the Flip depth slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Motion / depth (animation.depth) has 25 semantic integer positions and must use variant "discrete" so Toolcraft renders tick markers.',
      ]),
    );
  });

  it("accepts large or precision stepped sliders as visually continuous", () => {
    const schemaWithContinuousSteppedSliders = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                revealSpeed: {
                  defaultValue: 118,
                  label: "Reveal speed",
                  max: 150,
                  min: 0,
                  orderRole: "primary",
                  step: 1,
                  target: "ascii.speed",
                  type: "slider",
                  unit: "cols/s",
                },
                flipDuration: {
                  defaultValue: 0.6,
                  label: "Flip duration",
                  max: 5,
                  min: 0,
                  orderRole: "strength",
                  step: 0.1,
                  target: "ascii.flipDurationSec",
                  type: "slider",
                  unit: "s",
                },
              },
              title: "Timing",
            },
          ],
          title: "ASCII",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithContinuousSteppedSliders, [
        {
          automated: true,
          automatedTestName: "reveal speed changes rendered output",
          browser: true,
          browserTestName: "browser: reveal speed slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Reveal speed changes reveal density.",
          fixture: "ASCII fixture",
          id: "ascii.speed",
          kind: "control",
          target: "ascii.speed",
          userAction: "Drag the Reveal speed slider.",
        },
        {
          automated: true,
          automatedTestName: "flip duration changes rendered output",
          browser: true,
          browserTestName: "browser: flip duration slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Flip duration changes animation timing.",
          fixture: "ASCII fixture",
          id: "ascii.flipDurationSec",
          kind: "control",
          target: "ascii.flipDurationSec",
          userAction: "Drag the Flip duration slider.",
        },
      ]),
    ).toEqual([]);
  });

  it("requires discrete slider markerCount to match the step count", () => {
    const schemaWithDiscreteSlider = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                grain: {
                  defaultValue: 0.08,
                  label: "Grain",
                  markerCount: 6,
                  max: 1,
                  min: 0,
                  step: 0.1,
                  target: "shader.grain",
                  type: "slider",
                  variant: "discrete",
                },
              },
              title: "Volume",
            },
          ],
          title: "Shader",
        },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithDiscreteSlider, [
        {
          automated: true,
          automatedTestName: "grain changes rendered output",
          browser: true,
          browserTestName: "browser: grain slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Grain changes pixel variance.",
          fixture: "grain fixture",
          id: "shader.grain",
          kind: "control",
          target: "shader.grain",
          userAction: "Drag the Grain slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Volume / grain (shader.grain) discrete slider must render one marker per step; expected markerCount 11, received 6.",
      ]),
    );
  });

  it("rejects visual discrete sliders with too many positions", () => {
    const schemaWithDenseDiscreteSlider = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                revealSpeed: {
                  defaultValue: 118,
                  label: "Reveal speed",
                  max: 150,
                  min: 0,
                  orderRole: "primary",
                  step: 1,
                  target: "ascii.speed",
                  type: "slider",
                  unit: "cols/s",
                  variant: "discrete",
                },
              },
              title: "Timing",
            },
          ],
          title: "ASCII",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithDenseDiscreteSlider, [
        {
          automated: true,
          automatedTestName: "reveal speed changes rendered output",
          browser: true,
          browserTestName: "browser: reveal speed slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Reveal speed changes reveal density.",
          fixture: "ASCII fixture",
          id: "ascii.speed",
          kind: "control",
          target: "ascii.speed",
          userAction: "Drag the Reveal speed slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Timing / revealSpeed (ascii.speed) declares variant "discrete" with 151 positions, which would overload tick markers. Keep it stepped continuous or use a different control.',
      ]),
    );
  });

  it("accepts continuous stepped sliders without visual markers", () => {
    const schemaWithNormalizedSlider = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                grain: {
                  defaultValue: 0.08,
                  label: "Grain",
                  max: 1,
                  min: 0,
                  step: 0.1,
                  target: "shader.grain",
                  type: "slider",
                },
              },
              title: "Volume",
            },
          ],
          title: "Shader",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithNormalizedSlider, [
        {
          automated: true,
          automatedTestName: "grain changes rendered output",
          browser: true,
          browserTestName: "browser: grain slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Grain changes pixel variance.",
          fixture: "grain fixture",
          id: "shader.grain",
          kind: "control",
          target: "shader.grain",
          userAction: "Drag the Grain slider.",
        },
      ]),
    ).toEqual([]);
  });

  it("rejects generic and control-type section titles", () => {
    const schemaWithWeakSectionTitles = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                amount: {
                  defaultValue: 0.5,
                  label: "Amount",
                  max: 1,
                  min: 0,
                  orderRole: "strength",
                  target: "shader.amount",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Settings",
            },
            {
              controls: {
                grain: {
                  defaultValue: 0.1,
                  label: "Grain",
                  max: 1,
                  min: 0,
                  orderRole: "detail",
                  target: "shader.grain",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Sliders",
            },
          ],
          title: "Shader",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithWeakSectionTitles, [
        makeControlAcceptance("shader.amount", "slider"),
        makeControlAcceptance("shader.grain", "slider"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Settings is too generic for a controls section. Name the product entity, workflow stage, or behavior it edits instead of using a bucket title.",
        "Sliders names a UI control type instead of the product entity. Group controls by product meaning, not by Slider, Color, Input, Button, or similar component type.",
      ]),
    );
  });

  it("rejects visible controls sections without titles", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                amount: {
                  defaultValue: 0.5,
                  label: "Amount",
                  max: 1,
                  min: 0,
                  orderRole: "strength",
                  target: "shader.amount",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shader",
            },
          ],
          title: "Shader",
        },
      },
    });
    const schemaWithMissingTitle: ResolvedToolcraftAppSchema = {
      ...schema,
      panels: {
        ...schema.panels,
        controls: schema.panels.controls
          ? {
              ...schema.panels.controls,
              sections: schema.panels.controls.sections.map((section, index) =>
                index === 0 ? { ...section, title: undefined } : section,
              ),
            }
          : schema.panels.controls,
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithMissingTitle, [
        makeControlAcceptance("shader.amount", "slider"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        "untitled section 1 is missing a controls section title. Every visible controls-panel section must name the product entity, workflow stage, or behavior it edits.",
      ]),
    );
  });

  it("rejects overgrown broad sections that mix semantic control clusters", () => {
    const schemaWithOvergrownFlowSection = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                mode: {
                  defaultValue: "columns",
                  label: "Mode",
                  options: [
                    { label: "Columns", value: "columns" },
                    { label: "Burst", value: "burst" },
                  ],
                  orderRole: "mode",
                  target: "flow.mode",
                  type: "select",
                },
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 3,
                  min: 0,
                  orderRole: "strength",
                  target: "flow.speed",
                  type: "slider",
                  variant: "continuous",
                },
                duration: {
                  defaultValue: 8,
                  label: "Duration",
                  max: 20,
                  min: 1,
                  orderRole: "detail",
                  target: "flow.duration",
                  type: "slider",
                  variant: "continuous",
                },
                width: {
                  defaultValue: 80,
                  label: "Width",
                  max: 200,
                  min: 20,
                  orderRole: "spatial",
                  target: "flow.width",
                  type: "slider",
                  variant: "continuous",
                },
                curve: {
                  defaultValue: 0.5,
                  label: "Curve",
                  max: 1,
                  min: 0,
                  orderRole: "spatial",
                  target: "flow.curve",
                  type: "slider",
                  variant: "continuous",
                },
                fill: {
                  defaultValue: 60,
                  label: "Fill",
                  max: 100,
                  min: 0,
                  orderRole: "strength",
                  target: "flow.fill",
                  type: "slider",
                  unit: "%",
                  variant: "continuous",
                },
                wordCount: {
                  defaultValue: 24,
                  label: "Words",
                  max: 100,
                  min: 1,
                  orderRole: "detail",
                  target: "flow.wordCount",
                  type: "slider",
                  variant: "continuous",
                },
                text: {
                  commitMode: "content",
                  defaultValue: "Creative app",
                  label: "Text",
                  orderRole: "input",
                  target: "flow.text",
                  type: "text",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "flow.color",
                  type: "color",
                },
                exportQuality: {
                  defaultValue: "high",
                  label: "Quality",
                  options: [
                    { label: "High", value: "high" },
                    { label: "Low", value: "low" },
                  ],
                  orderRole: "detail",
                  target: "flow.exportQuality",
                  type: "select",
                },
              },
              title: "Flow",
            },
          ],
          title: "Master Controls",
        },
      },
    });

    const errors = validateToolcraftAcceptanceCoverage(
      schemaWithOvergrownFlowSection,
      [
        makeControlAcceptance("flow.mode", "select"),
        makeControlAcceptance("flow.speed", "slider"),
        makeControlAcceptance("flow.duration", "slider"),
        makeControlAcceptance("flow.width", "slider"),
        makeControlAcceptance("flow.curve", "slider"),
        makeControlAcceptance("flow.fill", "slider"),
        makeControlAcceptance("flow.wordCount", "slider"),
        makeControlAcceptance("flow.text", "text"),
        makeControlAcceptance("flow.color", "color"),
        makeControlAcceptance("flow.exportQuality", "select"),
      ],
      {
        animationIntent: {
          behaviorCoverage: [
            "no-user-facing-transport",
            "no-play-pause",
            "no-scrub",
            "no-duration-control",
            "no-loop-control",
            "no-export-at-time",
          ],
          mode: "autonomous",
          reason:
            "The flow speed is a decorative self-running effect and does not expose product time transport.",
        },
        mode: "new-toolcraft-app",
      },
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Flow has 10 controls across multiple semantic clusters",
        ),
      ]),
    );
  });

  it("accepts a small cohesive broad section when controls share one product meaning", () => {
    const schemaWithSmallFlowSection = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 3,
                  min: 0,
                  orderRole: "strength",
                  target: "flow.speed",
                  type: "slider",
                  variant: "continuous",
                },
                drift: {
                  defaultValue: 0.4,
                  label: "Drift",
                  max: 1,
                  min: 0,
                  orderRole: "detail",
                  target: "flow.drift",
                  type: "slider",
                  variant: "continuous",
                },
                phase: {
                  defaultValue: 0.25,
                  label: "Phase",
                  max: 1,
                  min: 0,
                  orderRole: "detail",
                  target: "flow.phase",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Flow",
            },
          ],
          title: "Master Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(
        schemaWithSmallFlowSection,
        [
          makeControlAcceptance("flow.speed", "slider"),
          makeControlAcceptance("flow.drift", "slider"),
          makeControlAcceptance("flow.phase", "slider"),
        ],
        {
          animationIntent: {
            behaviorCoverage: [
              "no-user-facing-transport",
              "no-play-pause",
              "no-scrub",
              "no-duration-control",
              "no-loop-control",
              "no-export-at-time",
            ],
            mode: "autonomous",
            reason:
              "The flow speed is a decorative self-running effect and does not expose product time transport.",
          },
          mode: "new-toolcraft-app",
        },
      ),
    ).toEqual([]);
  });

  it("rejects duplicate section titles", () => {
    const schemaWithDuplicateSections = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                count: {
                  defaultValue: 10,
                  label: "Count",
                  max: 50,
                  min: 1,
                  orderRole: "detail",
                  target: "shape.primary.count",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shape",
            },
            {
              controls: {
                radius: {
                  defaultValue: 8,
                  label: "Radius",
                  max: 40,
                  min: 0,
                  orderRole: "spatial",
                  target: "shape.secondary.radius",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Shape",
            },
          ],
          title: "Master Controls",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithDuplicateSections, [
        makeControlAcceptance("shape.primary.count", "slider"),
        makeControlAcceptance("shape.secondary.radius", "slider"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Controls panel repeats the section title "Shape" 2 times. Section titles must be unique and describe distinct product entities or workflow stages.',
      ]),
    );
  });

  it("accepts concise property labels when the section clearly names the entity", () => {
    const schemaWithSemanticLabelContext = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                speed: {
                  defaultValue: 1,
                  label: "Speed",
                  max: 3,
                  min: 0,
                  orderRole: "strength",
                  target: "motion.speed",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Animation",
            },
          ],
          title: "Motion",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(
        schemaWithSemanticLabelContext,
        [makeControlAcceptance("motion.speed", "slider")],
        {
          animationIntent: {
            behaviorCoverage: [
              "no-user-facing-transport",
              "no-play-pause",
              "no-scrub",
              "no-duration-control",
              "no-loop-control",
              "no-export-at-time",
            ],
            mode: "autonomous",
            reason:
              "The motion speed is a decorative self-running effect and does not expose product time transport.",
          },
          mode: "new-toolcraft-app",
        },
      ),
    ).toEqual([]);
  });

  it("rejects generic control labels in weak contexts with semantic suggestions", () => {
    const schemaWithWeakControlLabels = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                amount: {
                  defaultValue: 0.5,
                  label: "Amount",
                  max: 1,
                  min: 0,
                  orderRole: "strength",
                  target: "shader.amount",
                  type: "slider",
                  variant: "continuous",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "pattern.color",
                  type: "color",
                },
                scale: {
                  defaultValue: 1,
                  label: "Scale",
                  max: 2,
                  min: 0.5,
                  orderRole: "strength",
                  target: "pattern.symbolScale",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Settings",
            },
          ],
          title: "Pattern",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithWeakControlLabels, [
        makeControlAcceptance("shader.amount", "slider"),
        makeControlAcceptance("pattern.color", "color"),
        makeControlAcceptance("pattern.symbolScale", "slider"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Settings / amount label "Amount" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Shader amount".',
        'Settings / color label "Color" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Pattern color".',
        'Settings / scale label "Scale" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Symbol Scale".',
      ]),
    );
  });

  it("rejects generic labels in mixed visual bucket sections", () => {
    const schemaWithMixedStyleControls = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                backgroundOpacity: {
                  defaultValue: 0.9,
                  label: "Background opacity",
                  max: 1,
                  min: 0,
                  orderRole: "strength",
                  target: "background.opacity",
                  type: "slider",
                  variant: "continuous",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "pattern.color",
                  type: "color",
                },
              },
              title: "Style",
            },
          ],
          title: "Pattern",
        },
      },
    });
    const errors = validateToolcraftAcceptanceCoverage(schemaWithMixedStyleControls, [
      makeControlAcceptance("background.opacity", "slider"),
      makeControlAcceptance("pattern.color", "color"),
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        'Style / color label "Color" is too generic in this context. Short labels are allowed when the nearest visible section or group clearly names the affected product entity. Rename it to "Pattern color".',
      ]),
    );
    expect(errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('backgroundOpacity label "Background opacity"'),
      ]),
    );
  });

  it("rejects splitting one product entity into an object section and a color section", () => {
    const schemaWithSplitEntityColor = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                connections: {
                  defaultValue: "10",
                  label: "Connections",
                  orderRole: "primary",
                  target: "squares.right.connections",
                  type: "text",
                },
                hoverRadius: {
                  defaultValue: 200,
                  label: "Hover radius",
                  max: 400,
                  min: 0,
                  orderRole: "detail",
                  target: "squares.right.hoverRadius",
                  type: "slider",
                  unit: "px",
                  variant: "continuous",
                },
              },
              title: "Square 1 (Right)",
            },
            {
              controls: {
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "squares.right.color",
                  type: "color",
                },
              },
              title: "Color",
            },
          ],
          title: "Pattern",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithSplitEntityColor, [
        makeControlAcceptance("squares.right.connections", "text"),
        makeControlAcceptance("squares.right.hoverRadius", "slider"),
        makeControlAcceptance("squares.right.color", "color"),
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Controls for product entity "squares.right" are split across sections: Square 1 (Right), Appearance. Keep controls for the same product entity in one semantic section unless the spec names a real workflow split.',
      ]),
    );
  });

  it("accepts color grouped inside the same semantic product entity section", () => {
    const schemaWithGroupedEntityColor = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                connections: {
                  defaultValue: "10",
                  label: "Connections",
                  orderRole: "primary",
                  target: "squares.right.connections",
                  type: "text",
                },
                color: {
                  defaultValue: { hex: "#DEF135" },
                  label: "Color",
                  orderRole: "color",
                  target: "squares.right.color",
                  type: "color",
                },
                hoverRadius: {
                  defaultValue: 200,
                  label: "Hover radius",
                  max: 400,
                  min: 0,
                  orderRole: "detail",
                  target: "squares.right.hoverRadius",
                  type: "slider",
                  unit: "px",
                  variant: "continuous",
                },
              },
              title: "Square 1 (Right)",
            },
          ],
          title: "Pattern",
        },
      },
    });

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithGroupedEntityColor, [
        makeControlAcceptance("squares.right.connections", "text"),
        makeControlAcceptance("squares.right.color", "color"),
        makeControlAcceptance("squares.right.hoverRadius", "slider"),
      ]),
    ).toEqual([]);
  });

  it("rejects splitting FontPicker-owned typography into sibling controls", () => {
    const schemaWithSplitTypographyBlock = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                font: {
                  defaultValue: {
                    color: "#FFFFFF",
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "original",
                  },
                  label: "Font",
                  orderRole: "primary",
                  target: "text.font",
                  type: "fontPicker",
                },
                textCase: {
                  defaultValue: "uppercase",
                  label: "Case",
                  options: [
                    { label: "As typed", value: "original" },
                    { label: "Uppercase", value: "uppercase" },
                  ],
                  orderRole: "primary",
                  target: "text.case",
                  type: "select",
                },
                textColor: {
                  defaultValue: { hex: "#DEF135", opacity: 100 },
                  label: "Color",
                  orderRole: "color",
                  target: "text.color",
                  type: "colorOpacity",
                },
              },
              title: "Text",
            },
          ],
          title: "Controls",
        },
      },
    });

    const fontAcceptance = makeControlAcceptance("text.font", "fontPicker");
    fontAcceptance.controlPartCoverage = [
      "fontPicker.fontId",
      "fontPicker.fontWeight",
      "fontPicker.fontSize",
      "fontPicker.letterSpacing",
      "fontPicker.lineHeight",
      "fontPicker.textCase",
      "fontPicker.color",
      "fontPicker.opacity",
    ];

    const colorAcceptance = makeControlAcceptance("text.color", "colorOpacity");
    colorAcceptance.controlPartCoverage = [
      "colorOpacity.hex",
      "colorOpacity.opacity",
    ];

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithSplitTypographyBlock, [
        fontAcceptance,
        makeControlAcceptance("text.case", "select"),
        colorAcceptance,
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Text / textCase splits "Case" out of the FontPicker-owned typography block for "text". Keep font family, weight, size, case, letter spacing, line height, color, and opacity in the same fontPicker value.',
        'Text / textColor splits "Color" out of the FontPicker-owned typography block for "text". Keep font family, weight, size, case, letter spacing, line height, color, and opacity in the same fontPicker value.',
      ]),
    );
  });

  it("rejects FontPicker descriptions that only enumerate owned fields", () => {
    const schemaWithRedundantFontHelp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                font: {
                  defaultValue: {
                    color: "#FFFFFF",
                    fontId: "inter",
                    fontSize: 16,
                    fontWeight: "400",
                    letterSpacing: "normal",
                    lineHeight: "normal",
                    opacity: 100,
                    textCase: "original",
                  },
                  description:
                    "Controls the family, weight, size, case, color, opacity, letter spacing, and line height used by the text.",
                  label: "Font",
                  orderRole: "primary",
                  target: "text.font",
                  type: "fontPicker",
                },
              },
              title: "Font",
            },
          ],
          title: "Controls",
        },
      },
    });

    const fontAcceptance = makeControlAcceptance("text.font", "fontPicker");
    fontAcceptance.controlPartCoverage = [
      "fontPicker.fontId",
      "fontPicker.fontWeight",
      "fontPicker.fontSize",
      "fontPicker.letterSpacing",
      "fontPicker.lineHeight",
      "fontPicker.textCase",
      "fontPicker.color",
      "fontPicker.opacity",
    ];

    expect(validateToolcraftAcceptanceCoverage(schemaWithRedundantFontHelp, [
      fontAcceptance,
    ])).toEqual(
      expect.arrayContaining([
        "Font / font description repeats FontPicker-owned fields (font family, font weight, font size, case, color, opacity, letter spacing, line height). FontPicker help must explain only non-obvious product behavior; use section titles and visible field labels for font family, weight, size, case, color, opacity, letter spacing, and line height, or omit description.",
      ]),
    );
  });

  it("rejects redundant descriptions in obvious color sections", () => {
    const schemaWithObviousColorHelp = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                color1: {
                  defaultValue: { hex: "#DFFF1A" },
                  description: "Sets the first bead color.",
                  label: "Color 1",
                  target: "beads.color1",
                  type: "color",
                },
                color2: {
                  defaultValue: { hex: "#8CFF3A" },
                  description: "Sets the second bead color.",
                  label: "Color 2",
                  target: "beads.color2",
                  type: "color",
                },
                colorSpread: {
                  defaultValue: 34,
                  description:
                    "Controls how often beads use colors 2-5 instead of Color 1.",
                  label: "Spread",
                  max: 100,
                  min: 0,
                  target: "beads.colorSpread",
                  type: "slider",
                  unit: "%",
                },
              },
              title: "Bead Colors",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(validateToolcraftAcceptanceCoverage(schemaWithObviousColorHelp, [
      makeControlAcceptance("beads.color1", "color"),
      makeControlAcceptance("beads.color2", "color"),
      makeControlAcceptance("beads.colorSpread", "slider"),
    ])).toEqual(
      expect.arrayContaining([
        "Bead Colors / color1 description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.",
        "Bead Colors / color2 description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.",
        "Bead Colors / colorSpread description adds a help icon to an obvious color-section control. Omit control.description when the section title and visible label already explain the setting.",
      ]),
    );
  });

  it("requires mode selectors to appear before dependent controls", () => {
    const schemaWithLateModeSelector = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                depth: {
                  defaultValue: 0.64,
                  label: "Depth",
                  max: 1,
                  min: 0,
                  target: "shader.depth",
                  type: "slider",
                  variant: "continuous",
                },
                blend: {
                  defaultValue: "liquid",
                  label: "Blend",
                  options: [
                    { label: "Silk", value: "silk" },
                    { label: "Liquid", value: "liquid" },
                    { label: "Crystal", value: "crystal" },
                  ],
                  target: "shader.blend",
                  type: "segmented",
                },
              },
              title: "Volume",
            },
          ],
          title: "Shader",
        },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithLateModeSelector, [
        {
          automated: true,
          automatedTestName: "depth changes rendered output",
          browser: true,
          browserTestName: "browser: depth slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Depth changes shader contrast.",
          fixture: "depth fixture",
          id: "shader.depth",
          kind: "control",
          target: "shader.depth",
          userAction: "Drag the Depth slider.",
        },
        {
          automated: true,
          automatedTestName: "blend changes rendered output",
          browser: true,
          browserTestName: "browser: blend selector changes rendered output",
          componentType: "segmented",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Blend switches shader pattern.",
          fixture: "blend fixture",
          id: "shader.blend",
          kind: "control",
          optionCoverage: "each-visible-item",
          target: "shader.blend",
          userAction: "Select each Blend option.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Volume / blend (shader.blend) has orderRole "mode" after depth (shader.depth) with orderRole "strength". Move mode/input/primary controls before dependent strength/detail/advanced controls or split them into an earlier section.',
      ]),
    );
  });

  it("accepts explicit order roles when selectors lead dependent controls", () => {
    const schemaWithOrderedControls = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                blend: {
                  defaultValue: "liquid",
                  label: "Blend",
                  options: [
                    { label: "Silk", value: "silk" },
                    { label: "Liquid", value: "liquid" },
                    { label: "Crystal", value: "crystal" },
                  ],
                  orderRole: "mode" as const,
                  target: "shader.blend",
                  type: "segmented",
                },
                depth: {
                  defaultValue: 0.64,
                  label: "Depth",
                  max: 1,
                  min: 0,
                  orderRole: "strength" as const,
                  target: "shader.depth",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Volume",
            },
          ],
          title: "Shader",
        },
      },
      persistence: { storage: "none" as const },
    };

    expect(getToolcraftControlOrderTargets(schemaWithOrderedControls)).toEqual([
      "shader.blend",
      "shader.depth",
    ]);
    expect(
      validateToolcraftAcceptanceCoverage(schemaWithOrderedControls, [
        playbackTimelineAcceptance,
        {
          automated: true,
          automatedTestName: "blend changes rendered output",
          browser: true,
          browserTestName: "browser: blend selector changes rendered output",
          componentType: "segmented",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Blend switches shader pattern.",
          fixture: "blend fixture",
          id: "shader.blend",
          kind: "control",
          optionCoverage: "each-visible-item",
          target: "shader.blend",
          userAction: "Select each Blend option.",
        },
        {
          automated: true,
          automatedTestName: "depth changes rendered output",
          browser: true,
          browserTestName: "browser: depth slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Depth changes shader contrast.",
          fixture: "depth fixture",
          id: "shader.depth",
          kind: "control",
          target: "shader.depth",
          userAction: "Drag the Depth slider.",
        },
      ]),
    ).toEqual([]);
  });

  it("requires overwide segmented controls to shorten labels or use select", () => {
    const schemaWithOverwideSegmentedControl = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                preset: {
                  defaultValue: "full-stack",
                  label: "FX Preset",
                  options: [
                    { label: "Full Stack", value: "full-stack" },
                    { label: "RGB Split", value: "rgb-split" },
                    { label: "Shade", value: "shade" },
                    { label: "Lines", value: "lines" },
                    { label: "Off", value: "off" },
                  ],
                  orderRole: "mode" as const,
                  target: "shader.fxPreset",
                  type: "segmented",
                },
              },
              title: "Style",
            },
          ],
          title: "Shader",
        },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithOverwideSegmentedControl, [
        {
          automated: true,
          automatedTestName: "fx preset changes rendered output",
          browser: true,
          browserTestName: "browser: fx preset selector changes rendered output",
          componentType: "segmented",
          evidence: "rendered-pixels",
          expectedObservable: "Changing FX Preset switches the shader preset.",
          fixture: "fx preset fixture",
          id: "shader.fxPreset",
          kind: "control",
          optionCoverage: "each-visible-item",
          target: "shader.fxPreset",
          userAction: "Select each FX Preset option.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Style / preset (shader.fxPreset) segmented controls must preserve cell padding: use at most 4 short options (max 9 characters per label and 24 total) or shorten labels first; if the compact names still exceed the budget, use a select dropdown instead.",
      ]),
    );
  });

  it("requires timeline playback coverage when a playback timeline is enabled", () => {
    const schemaWithPlaybackTimeline = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        timeline: { enabled: true, mode: "playback" as const },
      },
    };

    expect(validateToolcraftAcceptanceCoverage(schemaWithPlaybackTimeline, [])).toEqual(
      expect.arrayContaining([
        'panels.timeline mode "playback" requires a runtime acceptance entry with timelineCoverage "playback" proving pause, scrub, duration/loop, and rendered-frame behavior.',
      ]),
    );
  });

  it("requires playback timeline coverage to prove duration drives renderer progress", () => {
    const schemaWithPlaybackTimeline = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        timeline: { enabled: true, mode: "playback" as const },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(schemaWithPlaybackTimeline, [
        {
          automated: true,
          automatedTestName: "timeline playback controls drive rendered output",
          browser: true,
          browserTestName: "browser: timeline playback controls drive rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable:
            "Pause, scrub, and playback update visible renderer output.",
          fixture: "timeline playback fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: ["pause-resume", "scrub", "rendered-frame"],
          userAction: "Pause, scrub, and resume timeline playback.",
        },
      ]),
    ).toContain(
      'timeline.playback timelineCoverage "playback" must declare timelinePlaybackCoverage for pause-resume, scrub, duration, loop, and rendered-frame. Duration coverage must prove renderer progress maps 0..state.timeline.durationSeconds, not a local fixed animation duration.',
    );
  });

  it("requires timeline keyframe coverage for every inferred keyframe-capable control", () => {
    const keyframesSchema = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                opacity: {
                  defaultValue: 75,
                  label: "Opacity",
                  max: 100,
                  min: 0,
                  target: "style.opacity",
                  type: "slider",
                  variant: "continuous",
                },
                mode: {
                  defaultValue: "normal",
                  label: "Mode",
                  options: [
                    { label: "Normal", value: "normal" },
                    { label: "Screen", value: "screen" },
                  ],
                  target: "style.mode",
                  type: "select",
                },
              },
              title: "Style",
            },
          ],
          title: "Controls",
        },
        timeline: { enabled: true, mode: "keyframes" as const },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(keyframesSchema, [
        {
          automated: true,
          automatedTestName: "timeline playback controls drive rendered output",
          browser: true,
          browserTestName: "browser: timeline playback controls drive rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable: "Playback and scrubbing affect the rendered timeline frame.",
          fixture: "timeline fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: [
            "pause-resume",
            "scrub",
            "duration",
            "loop",
            "rendered-frame",
          ],
          userAction: "Pause, scrub, and resume timeline playback.",
        },
        {
          automated: true,
          automatedTestName: "timeline keyframes evaluate rendered output",
          browser: true,
          browserTestName: "browser: timeline keyframes evaluate rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable: "Keyframed opacity changes output at different timeline times.",
          fixture: "keyframed opacity fixture",
          id: "timeline.keyframes",
          kind: "runtime",
          target: "timeline.keyframes",
          timelineCoverage: "keyframes",
          userAction: "Create an Opacity keyframe and scrub the timeline.",
        },
        {
          automated: true,
          automatedTestName: "opacity changes rendered output",
          browser: true,
          browserTestName: "browser: opacity slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Opacity changes rendered output.",
          fixture: "opacity fixture",
          id: "style.opacity",
          kind: "control",
          target: "style.opacity",
          userAction: "Drag the Opacity slider.",
        },
        {
          automated: true,
          automatedTestName: "mode changes rendered output",
          browser: true,
          browserTestName: "browser: mode select changes rendered output",
          componentType: "select",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Mode changes blend behavior.",
          fixture: "mode fixture",
          id: "style.mode",
          kind: "control",
          optionCoverage: "each-visible-item",
          target: "style.mode",
          userAction: "Select each Mode option.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        'Style / opacity (style.opacity) is keyframe-capable by Toolcraft control type and must have acceptance timelineCoverage "keyframes" proving its diamond creates/updates a keyframe row and changes evaluated output.',
      ]),
    );
  });

  it("rejects opt-out keyframeable false on inferred keyframe-capable controls", () => {
    const keyframesSchema = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                blur: {
                  defaultValue: 2,
                  keyframeable: false,
                  label: "Blur",
                  max: 10,
                  min: 0,
                  target: "style.blur",
                  type: "slider",
                  variant: "continuous",
                },
              },
              title: "Style",
            },
          ],
          title: "Controls",
        },
        timeline: { enabled: true, mode: "keyframes" as const },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(keyframesSchema, [
        {
          automated: true,
          automatedTestName: "timeline playback controls drive rendered output",
          browser: true,
          browserTestName: "browser: timeline playback controls drive rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable: "Playback and scrubbing affect the rendered timeline frame.",
          fixture: "timeline fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: [
            "pause-resume",
            "scrub",
            "duration",
            "loop",
            "rendered-frame",
          ],
          userAction: "Pause, scrub, and resume timeline playback.",
        },
        {
          automated: true,
          automatedTestName: "timeline keyframes evaluate rendered output",
          browser: true,
          browserTestName: "browser: timeline keyframes evaluate rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable: "Keyframed opacity changes output at different timeline times.",
          fixture: "keyframed opacity fixture",
          id: "timeline.keyframes",
          kind: "runtime",
          target: "timeline.keyframes",
          timelineCoverage: "keyframes",
          userAction: "Create a Blur keyframe and scrub the timeline.",
        },
        {
          automated: true,
          automatedTestName: "blur changes rendered output",
          browser: true,
          browserTestName: "browser: blur slider changes rendered output",
          componentType: "slider",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Blur changes edge softness.",
          fixture: "blur fixture",
          id: "style.blur",
          kind: "control",
          target: "style.blur",
          timelineCoverage: "keyframes",
          userAction: "Drag the Blur slider.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Style / blur (style.blur) is keyframe-capable by Toolcraft control type; remove keyframeable: false and provide keyframe evaluator coverage instead of hiding the diamond.",
      ]),
    );
  });

  it("rejects keyframeable true on controls that cannot create timeline keyframes", () => {
    const keyframesSchema = {
      ...appSchema,
      panels: {
        ...appSchema.panels,
        controls: {
          sections: [
            {
              controls: {
                mode: {
                  defaultValue: "normal",
                  keyframeable: true,
                  label: "Mode",
                  options: [
                    { label: "Normal", value: "normal" },
                    { label: "Screen", value: "screen" },
                  ],
                  target: "shader.mode",
                  type: "select",
                },
              },
              title: "Mode",
            },
          ],
          title: "Controls",
        },
        timeline: { enabled: true, mode: "keyframes" as const },
      },
    };

    expect(
      validateToolcraftAcceptanceCoverage(keyframesSchema, [
        {
          automated: true,
          automatedTestName: "timeline playback controls drive rendered output",
          browser: true,
          browserTestName: "browser: timeline playback controls drive rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable: "Playback and scrubbing affect the rendered timeline frame.",
          fixture: "timeline fixture",
          id: "timeline.playback",
          kind: "runtime",
          target: "timeline.playback",
          timelineCoverage: "playback",
          timelinePlaybackCoverage: [
            "pause-resume",
            "scrub",
            "duration",
            "loop",
            "rendered-frame",
          ],
          userAction: "Pause, scrub, and resume timeline playback.",
        },
        {
          automated: true,
          automatedTestName: "timeline keyframes evaluate rendered output",
          browser: true,
          browserTestName: "browser: timeline keyframes evaluate rendered output",
          componentType: "timeline",
          evidence: "timeline-output",
          expectedObservable: "Keyframed output changes at different timeline times.",
          fixture: "keyframe fixture",
          id: "timeline.keyframes",
          kind: "runtime",
          target: "timeline.keyframes",
          timelineCoverage: "keyframes",
          userAction: "Create a keyframe and scrub the timeline.",
        },
        {
          automated: true,
          automatedTestName: "mode changes rendered output",
          browser: true,
          browserTestName: "browser: mode select changes rendered output",
          componentType: "select",
          evidence: "rendered-pixels",
          expectedObservable: "Changing Mode changes blend behavior.",
          fixture: "mode fixture",
          id: "shader.mode",
          kind: "control",
          optionCoverage: "each-visible-item",
          target: "shader.mode",
          timelineCoverage: "keyframes",
          userAction: "Select each Mode option.",
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        "Mode / mode (shader.mode) sets keyframeable true, but this control type or runtime-owned target cannot create timeline keyframes.",
      ]),
    );
  });
});
