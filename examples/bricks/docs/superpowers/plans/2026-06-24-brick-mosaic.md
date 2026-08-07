# Brick Mosaic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the Toolcraft workflow skills already loaded in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Toolcraft image-to-brick-mosaic app with upload, controllable brick parameters, Canvas 2D preview/export, acceptance, browser, and performance coverage.

**Architecture:** Keep the Toolcraft shell runtime-owned. Add schema controls in `src/app/app-schema.ts`, render product pixels through a focused Canvas 2D renderer under `src/app`, and wire PNG export through `ToolcraftApp onPanelAction` in `src/routes/index.tsx`.

**Tech Stack:** React, Toolcraft runtime schema/hooks/export helpers, Canvas 2D, Vitest, Playwright.

---

### Task 1: Schema And Route

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/routes/index.tsx`

- [ ] Replace starter schema with product schema: canvas upload, `intrinsic-media`, `renderScale: true`, controls sections from the design, `settingsTransfer: "auto"`, localStorage persistence for `values`, `canvas`, and `panels`, and one sticky `Export PNG` action.
- [ ] Add `BrickMosaicRenderer` as `canvasContent`, set `renderDefaultCanvasMedia={false}`, and implement `onPanelAction` for `export-png`.

### Task 2: Renderer And Export Helpers

**Files:**
- Create: `src/app/brick-mosaic-renderer.tsx`
- Create: `src/app/brick-mosaic-render.ts`

- [ ] Implement typed value normalization from `ToolcraftState`.
- [ ] Decode and cache the uploaded image by media id/data URL for preview.
- [ ] Render a deterministic placeholder brick pattern when no media exists.
- [ ] Render brick rectangles, color sampling, monochrome/posterization/grading, stud circles, edge shading, and background.
- [ ] Expose a pure `renderBrickMosaicToContext` function used by preview and export.

### Task 3: App Tests

**Files:**
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`

- [ ] Replace starter tests with product schema assertions for controls, sections, panels, settings transfer, persistence, and export.
- [ ] Switch readiness to `mode: "product"` and add acceptance rows for every visible control, media lifecycle, canvas render scale, persistence, toolbar/viewport, output, and export.
- [ ] Declare performance scenarios for workload controls, media import, preview, drag, zoom stress, viewport stability, and export-copy.

### Task 4: Browser Tests

**Files:**
- Modify: `e2e/app-controls.spec.ts`
- Add or modify: `e2e/app-brick-mosaic.spec.ts`
- Modify: `e2e/app-performance.spec.ts`

- [ ] Replace starter browser tests with product upload, clear, control-output, persistence, background, and PNG export dimension tests.
- [ ] Add named browser tests matching every acceptance row.
- [ ] Add named browser perf tests matching every performance scenario and read workload stress values through `getToolcraftPerformanceStressValue(appPerformance, scenarioId)`.

### Task 5: Worklog And Verification

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] Replace starter worklog with product decisions and the full decision trail.
- [ ] Run `pnpm verify:final`; if failures occur, use systematic debugging before fixes.
- [ ] Run `pnpm verify:perf` because this is the first working app version.
- [ ] Start `pnpm dev` and report the local URL.
