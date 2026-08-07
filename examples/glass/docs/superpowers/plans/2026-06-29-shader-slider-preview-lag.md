# Shader Slider Preview Lag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shader sliders update the canvas with minimal perceived lag while preserving selected render scale and full-quality preview/export.

**Architecture:** Keep the existing WebGL renderer and cache model. Fix the preview scheduler so uniform-only shader sliders render on the next animation frame, while map/blur/source workloads still coalesce at shorter measured intervals instead of waiting hundreds of milliseconds to a full second.

**Tech Stack:** Toolcraft schema/runtime, React canvas renderer, WebGL2, Playwright performance gates.

---

### Task 1: Reclassify Preview Throttles

**Files:**
- Modify: `src/app/liquid-glass-renderer.tsx`

- [x] **Step 1: Treat uniform-only shader sliders as near-frame preview**

Change the preview throttle constants so base and uniform refraction paths schedule with a small `32ms` coalescing window, close to two frames in the browser, instead of the previous `180ms`/`620ms` delays.

- [x] **Step 2: Shorten heavy visual feedback without reducing quality**

Lower map, shadow, and frost coalescing intervals enough to keep the canvas alive during slider edits, while preserving full render scale and the same WebGL resources.

- [x] **Step 3: Verify no cache invalidation changes**

Run `pnpm exec tsc -p tsconfig.json --noEmit` and targeted browser perf for shader sliders. Expected: no TypeScript errors; slider tests remain within budgets.

### Task 2: Record Evidence

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Add a decision trail entry**

Record the root cause: scheduler throttles, not GLSL quality or canvas backing scale.

- [x] **Step 2: Record verification**

Record quick, targeted browser perf, and full performance checkpoint results.
