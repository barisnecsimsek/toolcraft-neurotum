# Watercolor Brush Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ink spread while the pointer is still drawing and add watercolor brush controls for size, pigment load, wetness, and flow.

**Architecture:** Keep Toolcraft-owned controls in `src/app/app-schema.ts`, pass typed brush settings through `SuminagashiRenderer`, and keep product pixels in the existing WebGL engine. The engine will line-splat dye/velocity during pointer movement and run a lightweight wet preview advection step immediately while pointer input is active, then continue the full fluid solve between input events.

**Tech Stack:** Toolcraft schema controls, React renderer bridge, WebGL2 stable-fluid engine, Vitest, Playwright browser probes.

---

### Task 1: Brush Schema Surface

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/suminagashi-renderer.tsx`
- Modify: `src/app/app-schema.test.ts`

- [ ] Add a `Brush` controls section after `Ink` with four full-width sliders: `brush.size`, `brush.load`, `brush.wetness`, and `brush.flow`.
- [ ] Use short labels: `Size`, `Load`, `Wetness`, `Flow`.
- [ ] Give every slider `defaultValue`, `min`, `max`, `step`, `unit`, `performanceRole`, `performanceReason`, and `orderRole`.
- [ ] Extend `SuminagashiFluidSettings` and `readSettings` so the engine receives the four numeric values.
- [ ] Add schema tests asserting control type/defaults and settings persistence version.

### Task 2: Immediate Wet Preview

**Files:**
- Modify: `src/app/suminagashi-fluid.ts`

- [ ] Make pointer segment dye radius and strength read brush `Size` and `Load`.
- [ ] Make velocity line force read brush `Flow`.
- [ ] Add a lightweight wet preview step that advects velocity/dye immediately after applying pointer segments while the pointer is down, using `Wetness` to scale the time step and dye softness.
- [ ] Preserve the full pressure-projection path for ongoing diffusion after pointer events settle.
- [ ] Keep the blank-paper idle gate so the canvas is not animated before drawing or enabling Auto.

### Task 3: Acceptance And Performance

**Files:**
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`

- [ ] Add acceptance rows for every brush slider, with browser tests that move the real slider and draw a stroke.
- [ ] Add a browser test that holds the pointer down, waits a few animation frames, and proves product pixels change before `mouseup`.
- [ ] Add performance scenarios for brush-size, load, wetness, and flow slider changes.
- [ ] Update renderer pipeline inventories so brush targets invalidate ink splats/fluid step but not framebuffer setup.

### Task 4: Worklog And Verification

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] Record the root cause: pressure batching was repeatedly reset by fresh pointer segments, delaying visible diffusion until drawing stopped.
- [ ] Record the brush settings decision and rejected alternatives.
- [ ] Run direct local checks when `pnpm exec` is blocked by ignored esbuild builds: docs/integrity, `tsc`, `vitest`, `vite build`, targeted browser behavior, and targeted browser performance.
