# Default Media Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the Liquid Glass default source and texture as visible fileDrop assets while updating pill radius and texture defaults.

**Architecture:** Add app-owned default media descriptors and a null sync component that imports missing default fileDrop targets through Toolcraft runtime commands. Keep renderer/export code consuming `state.mediaAssets`.

**Tech Stack:** Toolcraft runtime, React ToolcraftApp shell, schema controls, WebGL liquid glass renderer, Playwright browser acceptance/performance.

---

### Task 1: Add Default Media Assets

**Files:**
- Create/copy: `public/liquid-glass-default-texture.jpg`
- Create: `src/app/liquid-glass-default-media.ts`
- Modify: `src/app/liquid-glass-values.ts`
- Modify: `src/routes/index.tsx`

- [x] Copy `~/Desktop/texture.jpg` to `public/liquid-glass-default-texture.jpg`.
- [x] Export `liquidGlassDefaultSourceAsset`, `liquidGlassDefaultTextureAsset`, and `LiquidGlassDefaultMediaSync`.
- [x] Render `LiquidGlassDefaultMediaSync` as a null product-state companion beside the renderer inside `ToolcraftApp` canvas content.
- [x] Keep uploaded media priority for source/texture render lookup.

### Task 2: Preserve Toolcraft Runtime Boundary

**Files:**
- Modify: `src/app/liquid-glass-default-media.ts`
- Modify: `src/routes/index.tsx`

- [x] Do not edit `src/toolcraft`; integrity checks must keep the runtime copy clean.
- [x] Import missing `source.upload` and `texture.upload` defaults only when no media exists for that target.
- [x] Let user uploads replace the target through existing `fileDrop` behavior.
- [x] Let clear/reset remove current media, then re-seed the default target through the sync effect.

### Task 3: Update Defaults And Coverage

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/liquid-glass-types.ts`
- Modify: `src/app/app-schema.test.ts`
- Modify: `e2e/app-controls.spec.ts`

- [x] Change default pill radius to `98`.
- [x] Change default texture opacity to `0.9`; keep mode `image` and blend `screen`.
- [x] Bump persistence to `toolcraft:liquid-glass:state:v3` / version `3`.
- [x] Add unit expectations for max pill radius and default media descriptors.
- [x] Add browser expectations that source and texture fileDrop previews show default assets on first load and after reset.

### Task 4: Verification And Worklog

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [x] Run `pnpm exec tsc -p tsconfig.json --noEmit`.
- [x] Run `pnpm verify:quick`.
- [x] Run targeted browser source/texture acceptance.
- [x] Run targeted texture/source performance scenarios for the touched media/default path.
- [x] Record decisions, verification, skipped full perf, and risks in the worklog.
