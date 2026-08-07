# Drawing Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make continuous drawing responsive while preserving the current WebGL quality, brush feel, 2x render scale, and immediate wet spread.

**Architecture:** Keep the renderer on WebGL and optimize the active pointer path. Coalesce dense pointer-move queues into fewer continuous line splats, show a lightweight wet preview while the pointer is down, and defer the full pressure projection until the brush pauses or releases.

**Tech Stack:** React, Toolcraft runtime, WebGL2 fluid shader passes, Vitest, Playwright browser performance checks.

---

### Task 1: Reproduce And Bound The Bottleneck

**Files:**
- Read: `src/app/suminagashi-fluid.ts`
- Read: `src/app/app-performance.ts`

- [x] **Step 1: Run a heavy active-stroke browser measurement**

Run a real pointer drag against the running app at `http://localhost:3007/` with `Size=72`, `Load=180`, `Wetness=100`, `Flow=180`, and `Resolution scale=2`.

Expected current result: active drawing exceeds the frame budget, with large frame gaps and long tasks.

- [x] **Step 2: Record root cause hypothesis**

The active stroke currently processes every pointer segment as two fullscreen splat passes, runs immediate wet advection, and continues full pressure projection batches while the pointer is down. A dense drag therefore piles up GPU and main-thread scheduling work faster than frames can consume it.

### Task 2: Optimize Active Stroke Path

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`

- [x] **Step 1: Add pointer-segment coalescing**

Implement helpers that compress dense queued pointer segments into a bounded number of continuous line segments per animation frame. Preserve first-to-last coverage so a fast stroke remains a brush line, not separated dots.

- [x] **Step 2: Defer full pressure projection during active drawing**

When the pointer is down, apply coalesced pointer splats, run the lightweight wet preview, render the display, and return from the frame without starting or continuing the full pressure solver. Resume the full solve after pointer release or when no active pointer work is present.

- [x] **Step 3: Keep immediate spread visible**

Continue calling the wet preview path while the brush is down so ink spreads as the user draws rather than only on pointer release.

### Task 3: Update Performance Contract

**Files:**
- Modify: `src/app/app-performance.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Update performance risk/evidence text**

Record that active pointer input is coalesced and full pressure projection is deferred during pointer-down drawing.

- [x] **Step 2: Add worklog decision trail**

Add an iteration with the root cause measurement, contract docs read, files changed, verification commands, and remaining risks.

### Task 4: Verify

**Files:**
- Test: `src/app/app-schema.test.ts`
- Test: `src/app/app-acceptance.test.ts`
- Test: `src/app/app-performance.test.ts`
- Browser: running app at `http://localhost:3007/`

- [x] **Step 1: Run static/unit checks**

Run:

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit
./node_modules/.bin/vitest run src/app/app-schema.test.ts src/app/app-acceptance.test.ts src/app/app-performance.test.ts
./node_modules/.bin/vitest run src --passWithNoTests
./node_modules/.bin/vite build
```

- [x] **Step 2: Run browser performance comparison**

Repeat the heavy active-stroke measurement. Expected: substantially lower duration, fewer or no long tasks, and max frame gap within the app performance budget or clearly improved with documented residual risk.

- [x] **Step 3: Run real visual checks**

Verify that a continuous stroke still looks like a brush stroke, not dotted input, and that wet spread appears before pointer release.
