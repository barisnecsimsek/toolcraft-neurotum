# Palette First Stroke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a newly selected Palette color apply to the very first manual brush stroke.

**Architecture:** Keep the built-in Toolcraft `palette` control and existing ink mode select. Change the default ink mode to `single` so manual drawing uses the selected palette color by default, while `cycle` remains an explicit alternate mode.

**Tech Stack:** TypeScript, Toolcraft schema controls, WebGL2 renderer settings, Vitest, Playwright browser probe.

---

### Task 1: Fix The Ink Mode Default

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] **Step 1: Make palette-backed drawing the default**

Set `ink.mode` default to `single` and update the palette description so the selected token is described as the default brush color.

- [x] **Step 2: Update tests and acceptance language**

Update schema, acceptance, and performance fixtures so Palette can be tested without switching Mode first.

- [x] **Step 3: Verify first-stroke behavior**

Use a browser probe that selects Blue 900 and draws immediately; compare against the previous Cycle failure and confirm the first stroke uses the selected palette color.
