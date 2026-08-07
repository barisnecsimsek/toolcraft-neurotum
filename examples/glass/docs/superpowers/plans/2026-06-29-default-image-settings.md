# Default Image And Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the supplied geological image and exported settings JSON the app's default state.

**Architecture:** Copy the image into public app assets and expose it as an app-owned fallback source asset. Update schema/default settings to the exported JSON values while keeping Toolcraft controls, reset, settings transfer, upload, preview, and export on the existing flow.

**Tech Stack:** Toolcraft schema/runtime, React preview renderer, Canvas 2D source frame, WebGL liquid glass composite, Playwright browser acceptance.

---

### Task 1: Add Default Source Asset

**Files:**
- Create/copy: `public/liquid-glass-default-source.png`
- Modify: `src/app/liquid-glass-values.ts`
- Test: `e2e/app-controls.spec.ts`

- [x] Copy the supplied PNG into `public/liquid-glass-default-source.png`.
- [x] Add a Toolcraft-media-compatible default asset in `liquid-glass-values.ts`.
- [x] Make `findLiquidGlassSourceAsset` return the uploaded source when present, otherwise the default asset.

### Task 2: Apply Exported Settings As Defaults

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/liquid-glass-types.ts`
- Test: `src/app/app-schema.test.ts`

- [x] Update every schema `defaultValue` matching a key in `liquid-glass-settings.json`.
- [x] Update `liquidGlassDefaultSettings` to the same normalized defaults.
- [x] Keep `source.upload` and `texture.upload` nullable so user uploads remain custom-only.
- [x] Bump persistence key/version so old browser state does not hide the new baseline.

### Task 3: Browser Coverage And Worklog

**Files:**
- Modify: `e2e/app-controls.spec.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] Add or strengthen browser evidence that the default source renders before upload.
- [x] Ensure upload/clear/reset still changes output and returns to default source pixels.
- [x] Record the implementation decision, verification, skipped checks, and risks in the worklog.

### Task 4: Verification

**Commands:**
- [x] `pnpm exec tsc -p tsconfig.json --noEmit`
- [x] `pnpm verify:quick`
- [x] targeted Playwright default/source acceptance
- [x] targeted source media performance if fallback decode affects measured path
