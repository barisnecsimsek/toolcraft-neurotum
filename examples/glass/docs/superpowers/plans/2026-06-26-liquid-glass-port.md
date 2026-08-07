# Liquid Glass Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Toolcraft liquid-glass shader playground that ports the `samasante/liquid-glass` SDF displacement and WebGL renderer into this app.

**Architecture:** Toolcraft owns the runtime shell and controls. App files provide typed runtime value helpers, an adapted displacement-map generator, a WebGL renderer, a React canvas renderer, PNG export handling, acceptance/performance matrices, browser tests, and a product worklog.

**Tech Stack:** React 19, TypeScript, local Toolcraft runtime, Canvas 2D, WebGL2, Playwright, Vitest/node tests.

---

### Task 1: Schema And Product Contract

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`

- [x] Replace starter schema with `defineToolcraft` product schema using editable output canvas, render scale, controls panel, settings transfer auto, localStorage persistence, PNG export, required Background section, Image Export section, and sticky `Export PNG`.
- [x] Set `appTransferMode` to `reference-runtime-clone` with `referenceName: "samasante/liquid-glass"`, source-of-truth coverage, and no reference timeline.
- [x] Set `appProductReadiness.mode` to `product`.
- [x] Add performance `rendererTechnique` and `rendererPipeline` inventory before implementing renderer code.

### Task 2: Reference Algorithm Port

**Files:**
- Create: `src/app/liquid-glass-types.ts`
- Create: `src/app/liquid-glass-values.ts`
- Create: `src/app/liquid-glass-displacement.ts`
- Create: `src/app/liquid-glass-webgl.ts`
- Create: `src/app/liquid-glass-render.ts`

- [x] Port reference defaults and value normalization into `liquid-glass-types.ts` and `liquid-glass-values.ts`.
- [x] Port the MIT SDF map generator from `src/displacement.ts`, preserving R/G displacement, B-channel specular, dome, splay, bend, glow, sheen, and soft-edge behavior.
- [x] Adapt the reference WebGL renderer from `src/glassWebGL.ts`, adding an export-friendly `preserveDrawingBuffer` option and app-specific controls for opacity, saturation, murkiness, fisheye mapping, and background compositing.
- [x] Add a shared `renderLiquidGlassToCanvas` function that can render preview and export canvases from the same normalized state.

### Task 3: React Renderer And Export

**Files:**
- Create: `src/app/liquid-glass-renderer.tsx`
- Modify: `src/routes/index.tsx`

- [x] Add `LiquidGlassRenderer` that reads Toolcraft state through `useToolcraft`, draws only product output, consumes uploaded media from `state.mediaAssets`, respects `shouldIncludeToolcraftPreviewBackground`, and updates WebGL without rebuilding runtime UI.
- [x] Wire `ToolcraftApp` with `canvasContent`, `renderDefaultCanvasMedia={false}`, and `onPanelAction` for `export-png`.
- [x] Use `createToolcraftPngExportCanvas({ resolution })` and runtime `export.includeBackground`/`appearance.background`.

### Task 4: Acceptance, Browser, Performance Tests

**Files:**
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `e2e/app-performance.spec.ts`

- [x] Add exact schema control order tests and reference-clone product contract assertions.
- [x] Add acceptance rows with automated/browser test names for every visible entity.
- [x] Replace starter browser tests with product tests that interact through real controls and use product observable helpers.
- [x] Add performance scenarios and browser perf tests using fixture helpers from `app-performance.ts`.

### Task 5: Worklog And Verification

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] Replace starter worklog with product decisions for renderer, timeline, layers, controls, export, and performance.
- [x] Run `pnpm verify:final`.
- [ ] If any build/test fails, use systematic debugging: read the failure, reproduce, compare working patterns, form one hypothesis, fix, and re-run targeted checks.
- [x] Run `pnpm verify:perf` because this is the first working product version.
- [x] Run `pnpm dev` and report the local URL.

## Self Review

Spec coverage: the plan covers schema, reference source, renderer, export, acceptance, performance, worklog, browser verification, and final local run.

Placeholder scan: no implementation step depends on unspecified files or unknown commands.

Type consistency: app-specific files use `liquid-glass-*` naming and route/schema references remain under `src/app` and `src/routes`.
