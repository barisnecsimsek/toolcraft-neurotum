# Assembly Workflow

Build the app from the local Toolcraft runtime copy. Do not recreate controls, panels, toolbar, canvas behavior, timeline, layers, or app chrome by hand.

Use:

- `@/toolcraft/runtime` for schema, contracts, state, commands, history, canvas, panels, timeline, layers, toolbar, and tests.
- `@/toolcraft/runtime/react` for `ToolcraftApp` and hooks.
- `@/toolcraft/runtime/styles.css` for runtime styles.
- `@/toolcraft/ui` for visual components.

Declare the product with `defineToolcraft`. Render through `ToolcraftApp`.

```tsx
import { defineToolcraft } from "@/toolcraft/runtime";
import { ToolcraftApp } from "@/toolcraft/runtime/react";

const appSchema = defineToolcraft({
  canvas: { enabled: true, sizing: { mode: "intrinsic-media" }, upload: true },
  panels: {},
  toolbar: { history: true, radar: true, theme: true, zoom: true },
});

export function AppHome() {
  return <ToolcraftApp schema={appSchema} />;
}
```

Routes must render `ToolcraftApp` directly. Do not compose `ToolcraftRoot`, `CanvasShell`, `ControlsPanel`, `LayersPanel`, `TimelinePanel`, or `ToolbarPanel` by hand in product routes. If a runtime surface has a performance or behavior issue, fix the shared runtime contract instead of replacing the surface with app-level UI.

App-specific source may use only runtime extension points: schema controls, `canvasContent` for product output, `controlRenderers` for true custom controls, `onPanelAction` for sticky footer actions, and runtime commands/hooks. Do not render built-in control components such as `SliderControl`, `SelectControl`, `ColorControl`, `GradientControl`, `FontPickerControl`, `FileDropControl`, or `PanelActionsControl` directly in app code. Declare them in schema so layout, reset, history, disabled states, keyframes, labels, and tests stay runtime-owned.

Read `appSchema.assembly` before adding custom JSX. It lists enabled surfaces, capabilities, commands, and runtime assumptions.

Toolbar history owns undo/redo buttons and keyboard shortcuts. When `toolbar.history` is enabled, the runtime handles `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and `Ctrl+Y`, while ignoring shortcuts inside inputs, textareas, selects, and editable value labels. Do not add route-local undo/redo keyboard listeners.

The starter baseline is deliberately neutral. It must not include demo controls, prompt fields, timeline, or layers until the product behavior requires them. Use tests and docs fixtures to exercise component coverage; do not expose those fixtures in the starting product schema.

Once the folder is a real product, switch `src/app/app-acceptance.ts` from neutral readiness to:

```ts
export const appProductReadiness = {
  mode: "product",
  productName: "Product name",
  productSummary: "What the app creates or edits.",
  requestedBehavior: "The user-facing behavior this app must implement.",
} as const;
```

Do not leave `mode: "starter"` in a renamed product folder or after adding product controls, `canvasContent`, timeline, layers, or acceptance rows.

## Control Sections

Before writing the schema, make a Control Section Inventory. Each section needs a product entity or workflow stage, included targets, and a reason for grouping. Do not group by control type.

Bad section titles: `Controls`, `Settings`, `Options`, `Sliders`, `Inputs`, `Buttons`, `Color`, `Colors`.

Good section titles name the thing being edited: `Background`, `Object`, `Square 1 (Right)`, `Token Pattern`, `Motion`, `Tone Mapping`, `Export`.

Every app-authored controls-panel body section must have a short meaningful visible title. Runtime-created setup/settings sections use the technical title `Setup` but render without a visible heading; sticky footer action sections use the technical title `Export` but render without a visible heading.

Every visible section title renders through the standard 36px collapsible header row with vertically centered text and the runtime collapse icon. Do not hand-build section headers in generated apps.

Section expand/collapse uses the standard runtime height/opacity animation. Do not replace it with instant custom section visibility.

Ordinary controls-panel body sections use 8px top spacing and 24px bottom spacing for their control content. Runtime technical `Setup` / settings sections use 12px top and bottom spacing to match side padding. Sticky footer action sections keep their dedicated spacing.

If a color, slider, input, or selector edits the same entity as nearby controls, keep it in that entity section. Split only when the product has a real workflow split and cover that decision in acceptance.

Before choosing the concrete control type for each target, check `component-rules.md` and `schema-reference.md`. Built-in compound controls must stay compound: for example, typography with font choice, weight, size, color/opacity, and text rhythm uses `fontPicker`, not a plain `select` plus separate inputs/sliders. The product renderer and acceptance rows must cover every semantic value part of the chosen component.

## Figma Source

When the prompt provides a Figma URL, treat the Figma file as the design source of truth.

Required flow:

- Use Figma MCP/design context before implementation.
- Inspect the target node, layer tree, component instances, variants, text nodes, variables, styles, and assets.
- Recreate the design from the Figma structure and Toolcraft runtime/component contracts.
- Use screenshots only for final visual QA after reading the file structure.

Do not implement a Figma design by eye from an image, screenshot, exported PNG, or rough visual memory. If the Figma URL is not node-specific, inspect the file/page metadata and choose the relevant node only when it is unambiguous; otherwise ask for a node-specific link.

## Product Output

Use `canvasContent` only for product output: WebGL, Canvas 2D, SVG, DOM product text, shader previews, generated previews, export previews, or product editing handles.

```tsx
<ToolcraftApp
  canvasContent={<ProductRenderer />}
  renderDefaultCanvasMedia={false}
  schema={appSchema}
/>
```

`canvasContent` must not contain app UI: buttons, forms, CTAs, upload prompts, helper text, settings, menus, labels, placeholder copy, or empty-state instructions.

Product text rendered as DOM must be marked with `data-toolcraft-product-output` or `data-toolcraft-product-text`. Product editing handles must be textless overlays, write to runtime state, and stay out of export/copy output.

Preserve the runtime canvas surface. Product renderers may draw their own output background, but must not hide, replace, or make the Toolcraft canvas backing transparent.

## Reference Runtime Clone

When porting an existing app, use `transferMode: "reference-runtime-clone"` unless the user explicitly asks for redesign.

Preserve the reference runtime as source of truth:

- animation loop and time ownership;
- refs and mutable renderer state;
- particles, objects, connections, spawn cadence, and lifetime rules;
- pause/resume, restart, progress, export, and copy semantics;
- canvas sizing and media lifecycle;
- control-to-renderer mapping.

Toolcraft still owns the shell: schema, controls, canvas, panels, toolbar, file upload, sticky footer actions, and `canvasContent`.

Do not iframe the reference, replace the route with copied original UI, or rebuild the app as a different shell.

## Animation Intent

Before adding animation controls, write an Animation Intent Inventory. Classify the animation as playback timeline, keyframes timeline, custom reference timeline, or autonomous decorative output.

If the user asks for product animation, use the top playback timeline by default. Use no timeline only when the animation is self-running output with no user-facing play/pause, scrub, duration, loop, restart, progress, or export-at-time behavior. In that case, declare `appTransferMode.animationIntent.mode = "autonomous"` and list the absent transport behavior in `behaviorCoverage`.

Do not replace `TimelinePanel` with an app-level playback, transport, or timeline panel to work around performance. Playback/keyframe timeline UI is runtime-owned. Custom timeline UI is allowed only when a reference app has non-Toolcraft timeline behavior and `appTransferMode.referenceTimeline.mode` is `"custom-reference-timeline"` with browser-backed `referenceTimelineCoverage`.

Animated preview renderers must prioritize viewport interactions. During canvas drag, pan, pinch, zoom, and radar/center, suspend or coalesce non-essential animation work, then resume from the correct timeline or autonomous time without changing the user's play/pause state.

## Canvas Sizing And Background

A base/default size in the prompt is the initial output size. It does not remove user-facing size controls. Use `editable-output` unless the reference or product explicitly locks dimensions, and cover any `fixed-output` choice with `canvasSizingCoverage: "fixed-output-size"`.

Every product app exposes output background controls:

- `appearance.background` or `scene.background` as a schema `color` control;
- `export.includeBackground` as a `switch`, `checkbox`, `select`, or `segmented` control.

Preview, PNG export, and video export read the background color runtime value. PNG export passes the include-background runtime value to the export helper. Live preview uses the same include-background runtime value and hides only the product-rendered background when Include is off; the Toolcraft canvas backing stays visible. Video output keeps the background.

Keep those controls together in one required `Background` section directly before the first export settings section. With PNG export that first settings section is `Image Export`; with video-only export it is `Video Export`. Use an equal-width inline row with `export.includeBackground` on the left and the background color parameter on the right; each control occupies half the row. The switch label is `Include`; the color control uses `label: false` because the section title already supplies the background context.

Every product app needs output delivery in sticky footer `panelActions`. Still-output apps expose `Export PNG`. Animated apps expose `Export Video` and `Export PNG`. Clipboard copy is optional and never replaces export. If an odd number of footer actions leaves one action alone in the final row, that final action spans the full row.

Async product actions such as Export, Download, Copy, Generate, or Apply must return the real Promise from `ToolcraftApp onPanelAction`. The controls panel uses that Promise to show the sticky footer top accent indicator while the operation is pending. Use the `reportProgress(0..1)` callback from `onPanelAction` for determinate progress; video export reports frame-based render/encode progress, and PNG export reports phase progress for render, blob, and handoff when those phases are asynchronous. Do not fire-and-forget long export work from `onPanelAction`, and do not add custom loading strips or canvas UI for export progress.

For complex apps, use schema `settingsTransfer: "auto"` or `true` for settings import/export. Recalculate settings-transfer eligibility after adding, removing, or reorganizing controls, sections, timeline, or layers. The runtime threshold is 12 product controls, 5 product sections, or weighted score 18. Do not put Import Settings or Export Settings in sticky footer `panelActions`; runtime inserts the technical `Setup` settings-transfer section first without a visible section heading.

If the app also uses `editable-output` canvas sizing, that first technical `Setup` runtime section is mandatory and contains `Export Settings`, `Import Settings`, `Aspect ratio`, `Canvas width`, `Canvas height`, and optional `Resolution scale` in that order. Do not split the canvas size fields and settings-transfer actions into app-authored sections.

For non-vector raster, Canvas 2D, WebGL, or WebGPU previews, set `canvas.renderScale: true`. Runtime appends `Resolution scale` to the same first technical section. The slider changes backing resolution from `1x` to `2x` without changing visible canvas size; DOM/SVG/vector-native previews should not use it.

If a controls panel shows only `Export Settings` and `Import Settings` in the first runtime section, check the canvas sizing decision. Product-output apps usually need `editable-output`; intrinsic media and explicitly fixed output are the cases where visible canvas size inputs are absent.

For user-edited settings that should survive reload, use schema `persistence` with a stable app-specific key. When localStorage persistence is enabled, acceptance must prove a user setting restores after a real browser reload. Do not use settings import/export as a workaround for broken persistence.

Every app with `Export PNG` must include a separate `Image Export` controls section with:

- `export.image.format` as `select`, defaulting to `png`, with `png` and `jpg` baseline options;
- `export.image.resolution` as `select`, defaulting to `4k`, with `2k`, `4k`, and `8k` baseline options.

`Image Export` `Format` and `Resolution` are one compact workflow pair: render them in a two-column inline row by default. For still-output apps, place `Image Export` directly above sticky footer export buttons. For animated apps with both image and video export, place `Image Export` immediately before `Video Export`.

Animated apps with `Export Video` must include a separate `Video Export` controls section with at least:

- `export.video.format` as `select`, defaulting to `mp4`, with `mp4` and `webm` baseline options;
- `export.video.resolution` as `select`, defaulting to `current`, with options such as `current` and `4k`.

Place `Video Export` as the final authored controls section directly above sticky footer export buttons. Treat `Format` and `Resolution` as a compact semantic pair and put them in one two-column inline row by default. Use vertical rows only when the compact row would clip labels or selected values, and record that fallback reason in the worklog.

Use standard export helpers. `createToolcraftPngExportCanvas` accepts `includeBackground` for runtime PNG transparency and `resolution` for image-export output size. Pass the selected `export.image.resolution` into the PNG helper so 2K/4K/8K produce actual 2048/4096/8192px long-edge PNGs. Do not rely on static `export.png.background` alone when the UI exposes background controls. Video export keeps background and still uses `getToolcraftRetinaExportSize`.

Video export must choose the actual MIME/container with `MediaRecorder.isTypeSupported(...)` or an explicit encoder/transcoder capability check. `MOV` and `ProRes` are allowed only when the app provides a custom encoder/transcoder and proves it with acceptance plus performance coverage. Treat `4K` as an export resolution target, not a hardcoded canvas lock. Offline rendered-frame export must encode or mux frame timestamps from runtime timeline time; real-time `canvas.captureStream()` plus `MediaRecorder` records wall-clock export time and is not enough when renderer work can be slower than playback. Browser acceptance must load the exported blob as a video, wait for metadata, and compare `video.duration` with the edited timeline duration; `blobSize > 0`, `blobType`, parser fallback, or assigning the expected duration in `catch` is not enough.

## Verification Tiers

Before every edit, classify the change by blast radius and write the planned checks in the implementation note or plan:

```md
Verification tier: Tier N
Reason: <changed surface and expected blast radius>
Run: <commands and browser checks>
Skip: <checks not needed for this pass and why>
```

Use these tiers:

| Tier | Use When | Required Checks |
| --- | --- | --- |
| Tier 0 — docs/copy | Documentation, comments, copy, labels, or titles change without schema targets, values, runtime behavior, renderer output, or layout mechanics. | Targeted docs/typecheck or targeted app test. Browser is not required unless visual text fitting is the risk. |
| Tier 1 — local control presentation | One control or panel visual state changes: spacing, hover, focus, disabled, marker visibility, label fit, or component variant display. Runtime state shape and product renderer are unchanged. | Targeted unit/component test plus one focused browser check for the affected control or panel. |
| Tier 2 — schema/product behavior | Controls, sections, defaults, persistence, panel actions, export actions, acceptance rows, or product behavior mapping changes. | `pnpm verify:quick` plus relevant browser acceptance. Run perf only when the changed control affects renderer workload or responsiveness. |
| Tier 3 — renderer/canvas/runtime feature | Custom renderer, animation loop, canvas sizing, upload/media, timeline, layers, toolbar, export bytes, WebGL/Canvas/SVG output, zoom, radar, history, heavy control behavior changes, or a post-generation iteration that touches renderer workload or viewport stability. | `pnpm verify:quick`, targeted browser acceptance, and targeted performance scenarios only for touched workload/viewport/export paths. |
| Tier 4 — final delivery/template architecture | Fresh generated app completion, folder export, commit-ready delivery, dependency changes, runtime/template/contract/CLI changes, broad refactors, or major post-generation iterations that rewrite renderer, canvas, animation, timeline/keyframes, layers, media, export, or control mapping. | Fresh folders run `pnpm install` once, then `pnpm verify:final`; add `pnpm verify:perf` only for the first working app version or explicit performance complaints, then start `pnpm dev` to provide the local URL. |

Choose the tier by blast radius, not by line count. If uncertain, move one tier higher, not automatically to Tier 4.

Do not rerun `pnpm install` after every edit. Run it after fresh export, dependency changes, lockfile changes, or a missing package error.

Use `pnpm verify:ui` when a tier calls for the browser acceptance suite without the performance suite. Use a focused named Playwright test instead when only one entity changed and the relevant test is already known.

Run a full performance checkpoint with `pnpm verify:perf` only when the first working version of the app exists, or when the user explicitly asks to optimize performance, fix lag, remove jank, speed up animation, stabilize drag/zoom, or otherwise complains about performance.

Feature loops after the first working version do not run the full performance suite by default. Renderer, canvas, animation, export, timeline, layers, `canvas.renderScale`, bug fixes, and performance-sensitive controls still need targeted functional/browser checks first, plus targeted performance scenarios only when they directly exercise the touched path. Record any skipped full performance run and reason in the worklog.

For final delivery, run:

```bash
pnpm verify:final
pnpm dev
```

Browser verification must use the real Toolcraft shell plus renderer output. `pnpm verify:final` runs the full static, build, and browser functional gate. `pnpm verify:perf` is intentionally separate and only runs for the two full-performance triggers. `pnpm dev` is intentionally separate because it keeps the local server running.

Do not stop existing local servers to free `3002`. `pnpm dev`, `pnpm preview`, and browser verification prefer `3002`, then automatically use the next free port when it is occupied.
