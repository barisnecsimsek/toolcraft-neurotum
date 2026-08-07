# Clear Fade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Wash action with a half-width Clear action that clears the painting through a fast fade.

**Architecture:** Keep the action as a Toolcraft schema `actions` control in the Flow section. The renderer receives a `flow.clearSignal`, stops fluid motion immediately, fades the dye framebuffer over a short duration, then clears dye, velocity, and pressure buffers.

**Tech Stack:** TypeScript, Toolcraft schema/actions, WebGL2 framebuffer clear pass, Vitest, Playwright browser probe.

---

### Task 1: Schema And Runtime Signal

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/routes/index.tsx`
- Modify: `src/app/suminagashi-renderer.tsx`

- [x] **Step 1: Rename the local action**

Change the Flow action control from Wash to Clear, with action value `clear` and runtime target `flow.clearSignal`.

- [x] **Step 2: Make the action half-width**

Add an inline two-column layout group for `autoFlow` and `clear`, so the Clear action occupies one half of the Flow row.

- [x] **Step 3: Route the action through the new signal**

Dispatch `flow.clearSignal` from the panel action handler and have the renderer listen for that signal.

### Task 2: WebGL Clear Fade

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`

- [x] **Step 1: Add fade state**

Track a clear fade start time and opacity inside the engine.

- [x] **Step 2: Stop fluid motion immediately**

When Clear is triggered, empty pending pointer work and clear velocity and pressure buffers before the visual fade begins.

- [x] **Step 3: Fade dye to blank**

Each animation frame during the fade, multiply the dye framebuffer toward zero, render the display, and finally clear the dye buffer.

### Task 3: Coverage And Verification

**Files:**
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Update labels and test metadata**

Replace Wash acceptance/performance labels with Clear language and update the action coverage value.

- [x] **Step 2: Record the decision**

Add a worklog entry documenting the half-width Flow action and fast clear fade.

- [x] **Step 3: Verify**

Run direct typecheck, app Vitest, docs check, production build, and a browser probe that draws ink, clicks Clear, and proves the canvas fades to near-blank.
