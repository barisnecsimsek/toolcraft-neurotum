# Post-Release Settle Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-facing Brush slider that controls how quickly ink freezes after pointer release.

**Architecture:** Add `brush.settle` to the Toolcraft schema, renderer settings, fluid engine duration math, acceptance matrix, performance matrix, browser tests, and worklog. Preserve the existing full-solver settle sequence and only scale its bounded duration.

**Tech Stack:** TypeScript, React, Toolcraft schema/runtime, WebGL2, Vitest, Playwright.

---

### Task 1: Add the Schema Control

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/app-schema.test.ts`

- [x] **Step 1: Add `brush.settle`**

Add a `slider` in the `Brush` section after `brushWetness` with label `Settle`, target `brush.settle`, default `100`, min `0`, max `200`, step `5`, unit `%`, and workload performance metadata.

- [x] **Step 2: Update schema tests**

Assert the new slider shape and add `brush.settle` to the published control order targets and performance test-name expectations.

### Task 2: Wire Renderer State

**Files:**
- Modify: `src/app/suminagashi-renderer.tsx`
- Modify: `src/app/suminagashi-fluid.ts`

- [x] **Step 1: Add settings plumbing**

Add `brushSettle` to `SuminagashiFluidSettings`, defaults, and `readSettings()`.

- [x] **Step 2: Scale drying duration**

In `extendDrying()`, multiply the existing base wetness duration by `brush.settle / 100`. Keep `0%` valid so release freezes immediately after the final queued splat is processed.

### Task 3: Add Acceptance And Performance Coverage

**Files:**
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`

- [x] **Step 1: Add acceptance row**

Add an acceptance entry named `brush.settle` with browser test `browser: brush settle changes post-release stop timing`.

- [x] **Step 2: Add performance scenario**

Add `brush-settle-change`, target `brush.settle`, workload role at max `200`, and include `brush.settle` in renderer pipeline inputs/invalidations/workload targets.

- [x] **Step 3: Add browser tests**

Add one product-output browser test comparing low and high post-release settle movement, plus one perf test that drags `Settle` through the real slider and asserts the appPerformance budget.

### Task 4: Update Documentation And Verify

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Record the decision**

Update the control inventory, render pipeline inventory, decision trail, and verification notes.

- [x] **Step 2: Run direct checks**

Run:

```bash
node scripts/check-ai-skills.mjs
node scripts/check-toolcraft-docs.mjs
node scripts/check-toolcraft-integrity.mjs
node --test scripts/*.test.mjs
./node_modules/.bin/tsc -p tsconfig.json --noEmit
./node_modules/.bin/vitest run src --passWithNoTests
./node_modules/.bin/vite build
```

- [x] **Step 3: Run focused browser probes**

Verify the running app shows the new slider, `Settle=0%` produces less post-release motion than `Settle=200%`, dry hover remains stable, and heavy release at `Settle=200%` stays within the frame-gap budget.
