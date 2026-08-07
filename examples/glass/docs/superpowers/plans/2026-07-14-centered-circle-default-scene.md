# Centered Circle Default Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current liquid-glass scene the default scene while changing the glass to a centered circle.

**Architecture:** The default scene remains schema-owned through Toolcraft `defaultValue` fields and renderer fallback settings. The visible default media assets stay in the existing media sync path, while shape defaults and persistence version update together so first load and reset show the new baseline.

**Tech Stack:** Toolcraft schema controls, local default settings, WebGL renderer geometry resolution, Vitest, Playwright.

---

### Task 1: Default Scene Values

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/liquid-glass-types.ts`

- [x] Change `glass.shape` default from `pill` to `circle`.
- [x] Change default glass dimensions to `460x460`.
- [x] Change default radius to `230`.
- [x] Keep `glass.center` as the visible vector default `{ x: 0, y: 0 }` and fallback renderer center `{ x: 0.5, y: 0.5 }`.
- [x] Bump persistence key/version to `toolcraft:liquid-glass:state:v5` / `5`.

### Task 2: Tests And Performance Matrix

**Files:**
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`

- [x] Update schema tests to assert the new circular default geometry.
- [x] Update persistence expectations to version `5`.
- [x] Change the glass-shape performance stress option away from default `circle`.
- [x] Update the shape browser acceptance flow so it changes from the new Circle default to another visible shape before returning through shape variants.

### Task 3: Verification And Worklog

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Modify: `docs/superpowers/plans/2026-07-14-centered-circle-default-scene.md`

- [x] Run `pnpm typecheck`.
- [x] Run `pnpm vitest run src/app/app-schema.test.ts`.
- [x] Run focused browser acceptance for default media/shape behavior.
- [x] Run focused browser performance for shape and center.
- [x] Attempt `pnpm verify:quick` and record the result.
- [x] Mark this plan complete.
- [x] Add a worklog iteration for the default centered circle scene.
