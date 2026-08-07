# Glass Direct Drag Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the circular drag point and make dragging the glass itself update preview and the Center setting immediately without waiting for pointer release.

**Architecture:** Keep Toolcraft as the source of persisted state, but render the pointer-preview path before dispatching the merged live Center update for each coalesced drag frame. The WebGL renderer already caches source, texture, frost, and displacement inputs, so the drag path updates only lens-center uniforms and the final composite.

**Tech Stack:** React, Toolcraft runtime commands, Canvas/WebGL renderer, Playwright browser acceptance and performance tests.

---

### Task 1: Renderer Drag Loop

**Files:**
- Modify: `src/app/liquid-glass-renderer.tsx`

- [ ] Remove the visible center pin element and its `data-toolcraft-canvas-handle` marker.
- [ ] Add a stable `data-testid="liquid-glass-drag-zone"` on the transparent glass hit zone.
- [ ] Add rAF-coalesced local preview rendering for pointer moves.
- [ ] Commit `glass.center` during each coalesced drag frame through merged `controls.setValue`, with pointer end as the final safety commit.
- [ ] Skip scheduled React-state preview renders while a direct glass drag is active.

### Task 2: Acceptance And Performance Metadata

**Files:**
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-schema.test.ts`

- [ ] Change the on-canvas drag acceptance row from visible canvas handle to direct glass drag runtime behavior.
- [ ] Point the mask-drag scenario selector at the transparent glass drag zone.
- [ ] Update schema snapshot names for the revised acceptance row.

### Task 3: Browser Tests

**Files:**
- Modify: `e2e/canvas-handle-helpers.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `e2e/liquid-glass-performance.spec.ts`

- [ ] Let the drag helper target the glass drag zone by `data-testid`.
- [ ] Verify no circular handle exists.
- [ ] Drag the glass zone in acceptance and performance tests.
- [ ] Keep export-clean coverage proving editor overlays are not duplicated into product output.

### Task 4: Verification And Worklog

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] Run `pnpm verify:quick`.
- [ ] Run targeted browser acceptance for direct drag.
- [ ] Run targeted browser performance for direct drag.
- [ ] Run `pnpm verify:perf` because the request explicitly reports lag.
- [ ] Record decisions, evidence, skipped checks, and risks in the worklog.
