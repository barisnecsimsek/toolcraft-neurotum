# Reference Post-Stroke Settle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a bounded reference-style full fluid settle after pointer release, then freeze ink so stale velocity does not create lingering swirl.

**Architecture:** Keep the current WebGL2 stable-fluid engine and its active-stroke throttles. Re-route only the post-release drying branch from dye-only preview advection to the existing full `step(dt)` solver, shorten the drying window, and document the changed render pipeline/performance decision.

**Tech Stack:** TypeScript, React, Toolcraft runtime schema, WebGL2, Vitest, Playwright.

---

### Task 1: Implement Bounded Full-Solver Settle

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`

- [x] **Step 1: Shorten the wetness-based settle window**

Set `dryingBaseMs` to `320` and `dryingWetnessMs` to `520` so the full solver runs for several hundred milliseconds instead of multiple seconds.

- [x] **Step 2: Replace the post-release dye-only branch**

In `pointerUp()`, restart the bounded drying window for active ink so a long held stroke still receives post-release settling. In `frame(now)`, keep the held-pointer `previewWetStep()` path unchanged. For non-held active ink with no Auto/Wash, run `step(dt)` until `now > dryingUntil`; render only when the pressure batch completes or when fresh pointer input was applied. Once the window expires, call `freezeSettledInk()`.

- [x] **Step 3: Preserve performance guardrails**

Do not increase `pressureIterations`, `dyeResolution`, `simResolution`, or selected `canvas.renderScale`. Reuse existing batched pressure projection through `pressureIterationsPerFrame`.

### Task 2: Update Machine-Readable Performance Metadata

**Files:**
- Modify: `src/app/app-performance.ts`

- [x] **Step 1: Update renderer pipeline prose**

Change `performanceRisks` and the `fluid-step` pipeline description from "post-stroke drying uses a throttled dye-only settle" to "post-release settling uses bounded full solver batches, then freezes velocity/pressure."

- [x] **Step 2: Keep scenario IDs stable**

Do not rename existing performance scenarios. The touched behavior is covered by existing `animation-frame`, brush, viewport, and manual targeted pointer-up measurements.

### Task 3: Update Worklog

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Record this renderer iteration**

Add a Decision Trail entry with request, root cause, docs/skills used, files changed, verification, skipped checks, and risk.

- [x] **Step 2: Update current renderer/performance summaries**

Revise the Render Pipeline Inventory and Renderer Technique Decision Matrix so they no longer claim ordinary post-release drying is dye-only.

### Task 4: Verify

**Files:**
- No source edits.

- [x] **Step 1: Run direct checks**

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

- [x] **Step 2: Run focused browser checks**

Against the running Vite app, verify held-stroke spread changes before pointerup, post-release frames change during the bounded settle, output becomes stable after the freeze window, hover does not move dry pigment, and a heavy release path stays within the existing frame-gap budget.

- [x] **Step 3: Record verification results**

Update `docs/toolcraft/agent-worklog.md` with concrete command results and browser measurements. This folder is not a git repository, so do not include commit steps.
