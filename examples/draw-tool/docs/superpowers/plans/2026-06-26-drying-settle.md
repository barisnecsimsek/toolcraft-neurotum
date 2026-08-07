# Drying Settle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make brush input wet only while painting, then let the ink briefly settle and become static.

**Architecture:** Keep the existing WebGL fluid state. Hover pointer movement does not create velocity or dye segments. Real paint input extends a short drying window; when that window ends, the engine stops active simulation and clears velocity/pressure while preserving dye pixels.

**Tech Stack:** TypeScript, WebGL2, Toolcraft runtime, Vitest, Playwright browser probes.

---

### Task 1: Fix Hover Input

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`

- [x] **Step 1: Ignore pointermove when the brush is not down**

Return early from `pointerMove` unless `this.pointer.down` is true. Do not queue a `PointerSegment`, set `moved`, or update `lastInteraction` for hover-only movement.

### Task 2: Add Drying Window

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`

- [x] **Step 1: Track drying timeout**

Add a private timestamp that extends whenever real ink/brush/wash input occurs. Base the timeout on `brush.wetness` so wetter strokes settle longer.

- [x] **Step 2: Freeze the fluid after drying**

When the pointer is not down, no pressure solve is pending, and the drying timeout has passed, set `activeInk` to false and clear velocity/pressure FBOs while keeping dye intact.

### Task 3: Document And Verify

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Test: `src/app/app-performance.test.ts`

- [x] **Step 1: Record the decision trail**

Document that hover no longer affects pigment and that post-stroke advection is finite.

- [x] **Step 2: Run checks**

Run direct typecheck, targeted Vitest, and manual Playwright probes against the running server.

### Task 4: Optimize Post-Release Settle

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Reproduce post-release jank**

Measure active drag separately from the first seconds after `pointerup` with max brush values at 2x render scale.

- [x] **Step 2: Replace post-release full solve with lightweight settling**

During ordinary drying after `pointerup`, run dye-only wet preview at a throttled cadence instead of starting a full pressure solve every frame. Keep full solve available for explicit Auto and Wash behavior.

- [x] **Step 3: Verify release responsiveness**

Repeat the phase split browser measurement and prove `pointerup` no longer produces frame gaps over budget.

### Task 5: Optimize Active Stroke Start

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Isolate first-move jank**

Measure pointerdown, active move, and release separately at max brush values and 2x render scale to identify whether the bad frame belongs to press, drag, or release.

- [x] **Step 2: Throttle active input work without reducing render scale**

Keep continuous line splats, but limit active per-frame splat batches, space wide-brush segments farther apart, throttle display/wet-preview passes while drawing, and defer the first pointerdown presentation to the animation frame loop.

- [x] **Step 3: Verify active and release responsiveness**

Repeat the no-pause heavy stroke measurement and prove both drag and release remain below the frame-gap budget while held-stroke spreading and dry hover stability still work.
