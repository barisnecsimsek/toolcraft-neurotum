# Palette Live State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Palette family and shade changes reach Toolcraft state immediately so the next brush stroke uses the selected color without waiting for delayed commit timers.

**Architecture:** Keep the built-in Toolcraft `palette` control. Wire its `onValueChange` event into the runtime controls panel and give Palette live events the same merged history semantics used by sliders and color pickers; keep delayed commit only as interaction/persistence settling.

**Tech Stack:** TypeScript, React, Toolcraft runtime controls, WebGL renderer state, manual Playwright browser probe.

---

### Task 1: Wire Palette Live Changes

**Files:**
- Modify: `src/toolcraft/ui/components/controls/color/palette-control.tsx`
- Modify: `src/toolcraft/runtime/react/controls-panel.tsx`
- Modify: `src/toolcraft/.toolcraft-manifest.json`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Add palette history metadata**

Extend Palette live/commit metadata with Toolcraft control history fields and group each palette interaction with `history: "merge"`.

- [x] **Step 2: Commit live palette values in the runtime panel**

Pass `onValueChange={commit}` to the built-in `Palette` renderer so state updates on live selection instead of after `250ms + 160ms`.

- [x] **Step 3: Verify immediate color and shade stability**

Use Playwright against the running dev server to choose Red 500, draw immediately, and confirm the first stroke is red-dominant. Also sample shade indicator movement to confirm it does not jump back.
