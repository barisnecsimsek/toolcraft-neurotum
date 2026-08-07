# Zoom Source Dirty Rect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent uploaded source pixels from disappearing/cropping when the user zooms the canvas viewport.

**Architecture:** Keep Toolcraft viewport zoom runtime-owned and fix the app-owned WebGL dirty-rect renderer. Add browser coverage that samples uploaded source pixels before and after zoom.

**Tech Stack:** Toolcraft runtime shell, React canvas renderer, WebGL2, Vitest, Playwright.

---

### Task 1: Add Zoom Regression Coverage

**Files:**
- Modify: `e2e/app-controls.spec.ts`

- [x] **Step 1: Reuse the portrait source upload helper in the toolbar viewport test.**
- [x] **Step 2: Sample left background-bar and source-image pixels before zoom.**
- [x] **Step 3: Use the real toolbar Zoom in/out and Center controls plus viewport drag.**
- [x] **Step 4: Assert sampled pixels remain non-transparent and stable after zoom.**

### Task 2: Fix WebGL Dirty Rect Rendering

**Files:**
- Modify: `src/app/liquid-glass-webgl.ts`

- [x] **Step 1: Remove unconditional full-frame `gl.clear` before dirty-rect restoration.**
- [x] **Step 2: Keep full redraw behavior through the existing full-size source blit.**
- [x] **Step 3: Keep partial redraw behavior through source restore rect plus lens scissor.**

### Task 3: Verify And Record

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Modify: this plan

- [x] **Step 1: Run `pnpm exec tsc -p tsconfig.json --noEmit`.**
- [x] **Step 2: Run `pnpm verify:quick`.**
- [x] **Step 3: Run targeted browser acceptance for toolbar viewport/source zoom.**
- [x] **Step 4: Run targeted browser performance for viewport zoom stress.**
- [x] **Step 5: Update worklog and mark this plan complete.**
