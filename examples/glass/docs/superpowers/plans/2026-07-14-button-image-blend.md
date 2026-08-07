# Button Image Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add blend mode control for the uploaded image inside the liquid-glass button.

**Architecture:** Extend the existing Button Image schema state with `buttonImage.blendMode`, map it to the existing shader blend-code enum, and pass it to WebGL as a uniform. The cached image frame remains unchanged when only blend mode changes.

**Tech Stack:** Toolcraft schema controls, React renderer bridge, Canvas 2D cached image frame, WebGL shader compositing, Vitest, Playwright.

---

### Task 1: Schema And State

**Files:**
- Modify: `src/app/liquid-glass-types.ts`
- Modify: `src/app/liquid-glass-values.ts`
- Modify: `src/app/app-schema.ts`
- Test: `src/app/app-schema.test.ts`

- [x] Add `buttonImage.blendMode` to `LiquidGlassSettings` with default `normal`.
- [x] Normalize `buttonImage.blendMode` through the same finite option set as texture/text blend modes.
- [x] Add a `Blend` select in the `Button Image` section after upload and before spatial controls.
- [x] Update schema inventory/order tests to include `buttonImage.blendMode`.

### Task 2: WebGL Blend Path

**Files:**
- Modify: `src/app/liquid-glass-render.ts`
- Modify: `src/app/liquid-glass-webgl.ts`

- [x] Add `buttonImageBlendMode` to the lens descriptor.
- [x] Set it from `settings.buttonImage.blendMode`.
- [x] Add `u_button_image_blend` uniform.
- [x] In the fragment shader, blend button-image RGB with `blendTexture(base, image, u_button_image_blend)` and mix by image alpha.

### Task 3: Coverage And Verification

**Files:**
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `e2e/liquid-glass-performance.spec.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] Add acceptance row for `buttonImage.blendMode`.
- [x] Extend Button Image browser test to choose visible blend options and prove canvas output changes.
- [x] Add responsive performance scenario for `buttonImage.blendMode`.
- [x] Add targeted browser performance test for blend changes under uploaded-image workload.
- [x] Run targeted checks and record evidence in the worklog.
