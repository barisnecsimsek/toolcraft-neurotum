# Source Image Contain Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the uploaded source Scale slider and fit uploaded source images inside the canvas without cropping.

**Architecture:** Delete `source.scale` from schema/state/tests/performance, and change the source image draw path from cover-fit to contain-fit. Keep Toolcraft upload, saturation, preview/export, and WebGL render scale behavior unchanged.

**Tech Stack:** Toolcraft schema/runtime, React canvas renderer, WebGL2, Vitest, Playwright.

---

### Task 1: Remove Source Scale State And Control

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/liquid-glass-types.ts`
- Modify: `src/app/liquid-glass-values.ts`

- [x] **Step 1: Delete the `sourceScale` slider from the `Source Texture` section.**
- [x] **Step 2: Remove `source.scale` from `LiquidGlassSettings` and `liquidGlassDefaultSettings`.**
- [x] **Step 3: Remove `source.scale` normalization from `getLiquidGlassSettings`.**

### Task 2: Change Uploaded Source Fitting

**Files:**
- Modify: `src/app/liquid-glass-render.ts`
- Modify: `src/app/liquid-glass-renderer.tsx`

- [x] **Step 1: Change uploaded image fitting from cover to contain.**
- [x] **Step 2: Remove the scale parameter from `drawUploadedImage`.**
- [x] **Step 3: Remove `source.scale` from the source canvas cache key.**
- [x] **Step 4: Remove the source-scale preview throttle branch and constants.**

### Task 3: Update Acceptance And Performance Coverage

**Files:**
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-acceptance.test.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `e2e/liquid-glass-performance.spec.ts`

- [x] **Step 1: Delete the `source.scale` acceptance row.**
- [x] **Step 2: Delete the `source-scale` performance scenario and pipeline references.**
- [x] **Step 3: Remove Scale interactions from source browser tests.**
- [x] **Step 4: Remove source-scale browser performance test and helper.**
- [x] **Step 5: Update schema and acceptance test expected target lists.**

### Task 4: Verify And Record

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Modify: this plan

- [x] **Step 1: Run `pnpm exec tsc -p tsconfig.json --noEmit`.**
- [x] **Step 2: Run `pnpm verify:quick`.**
- [x] **Step 3: Run targeted browser acceptance for source upload/saturation.**
- [x] **Step 4: Run targeted browser performance for source saturation and source media import.**
- [x] **Step 5: Update worklog and mark this plan complete.**
