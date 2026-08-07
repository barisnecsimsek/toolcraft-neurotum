# Remove Wave Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Wave Highlight effect and all active `glass.wave.*` product surface.

**Architecture:** Delete the schema section, state fields, WebGL uniforms/shader branch, renderer rAF loop, acceptance rows, performance scenarios, and browser tests. Keep the rest of the liquid-glass renderer and Toolcraft flow unchanged.

**Tech Stack:** Toolcraft schema/runtime, React canvas renderer, WebGL2, Vitest, Playwright.

---

### Task 1: Remove Product State And Controls

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/liquid-glass-types.ts`
- Modify: `src/app/liquid-glass-values.ts`

- [x] **Step 1: Delete the `Wave Highlight` controls section.**
- [x] **Step 2: Remove `LiquidGlassWaveSettings` and `glass.wave` defaults.**
- [x] **Step 3: Remove `glass.wave.*` normalization from `getLiquidGlassSettings`.**

### Task 2: Remove Renderer Wave Path

**Files:**
- Modify: `src/app/liquid-glass-webgl.ts`
- Modify: `src/app/liquid-glass-render.ts`
- Modify: `src/app/liquid-glass-renderer.tsx`

- [x] **Step 1: Delete wave fields from `LiquidGlassLensDescriptor`.**
- [x] **Step 2: Delete wave uniforms and GLSL calculations from the lens shader.**
- [x] **Step 3: Remove wave uniform lookups and uploads.**
- [x] **Step 4: Remove the preview wave rAF loop and related refs/callbacks.**

### Task 3: Remove Acceptance And Performance Coverage

**Files:**
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-schema.test.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `e2e/liquid-glass-performance.spec.ts`

- [x] **Step 1: Delete wave acceptance rows and readiness copy.**
- [x] **Step 2: Delete wave performance scenarios and renderer pipeline references.**
- [x] **Step 3: Delete wave browser tests and budget overrides.**
- [x] **Step 4: Update schema test expectations to the new section/order/perf lists.**

### Task 4: Verify And Record

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Modify: this plan

- [x] **Step 1: Run `pnpm exec tsc -p tsconfig.json --noEmit`.**
- [x] **Step 2: Run `pnpm verify:quick`.**
- [x] **Step 3: Run targeted browser acceptance/perf for remaining shader controls.**
- [x] **Step 4: Update worklog and mark this plan complete.**
