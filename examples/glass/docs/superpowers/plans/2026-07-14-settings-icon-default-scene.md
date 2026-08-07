# Settings And Icon Default Scene Implementation Plan

**Goal:** Make the supplied settings JSON and `icon.png` the application default scene, with the glass circle centered and canvas zoom at the runtime default of 100%.

**Architecture:** Defaults remain schema-owned through Toolcraft `defaultValue` fields. Default source, glass texture, and button icon are seeded as real Toolcraft media assets by `LiquidGlassDefaultMediaSync`, so fileDrop previews, Remove image, section reset, global Reset, preview, and export all use the same runtime media path.

## Task 1: Default Scene Values

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/liquid-glass-types.ts`
- Modify: `src/app/liquid-glass-default-media.ts`
- Add: `public/liquid-glass-default-button-image.png`

- [x] Copy the supplied `icon.png` into `public`.
- [x] Set Button Image defaults to Overlay, offset `0.07/0.01`, and scale `0.71`.
- [x] Seed `icon.png` as the default media asset for `buttonImage.upload`.
- [x] Set text Include default to off from the supplied settings export.
- [x] Force the glass to a centered circle with equal Width/Height and Center `0/0`.
- [x] Bump persistence to `v6`.

## Task 2: Tests And Metadata

**Files:**
- Modify: `src/app/app-schema.test.ts`
- Modify: `src/app/app-acceptance.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `e2e/app-controls.spec.ts`
- Modify: `e2e/liquid-glass-performance.spec.ts`

- [x] Update schema tests for the new persistence version, button icon asset, text default, and button image defaults.
- [x] Update browser tests that assumed no default button image.
- [x] Update browser text tests to enable text before exercising hidden text controls.
- [x] Update performance metadata default values for Button Image scenarios.

## Task 3: Verification And Worklog

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`
- Modify: `docs/superpowers/plans/2026-07-14-settings-icon-default-scene.md`

- [x] Run `pnpm typecheck`.
- [x] Run `pnpm vitest run src/app/app-schema.test.ts`.
- [x] Run focused browser acceptance for Button Image, Shape, and Text.
- [x] Run focused browser performance for Button Image, Shape, and Center.
- [x] Attempt `pnpm verify:quick` and record the result.
- [x] Mark this plan complete.
- [x] Add a worklog iteration for the settings/icon default scene.
