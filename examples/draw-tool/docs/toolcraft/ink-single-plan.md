# Ink Single Mode Plan

Verification tier: Tier 2
Reason: Removes one visible Ink control and changes the runtime color-source mapping so Palette is always used for drawing.
Run: direct docs checks, TypeScript, Vitest, Vite build, and a focused browser probe that verifies Mode is absent while Palette-selected strokes still render.
Skip: full performance suite; this removes a lightweight responsiveness control and does not add renderer workload.

## Product Behavior

The Ink section exposes only the Palette control. The app always behaves as the previous `Single` mode: manual brush strokes use the selected Palette color, and the Cycle color rotation is no longer user-facing.

## Implementation Plan

1. Remove `ink.mode` from `src/app/app-schema.ts`.
2. Make `SuminagashiRenderer` pass `inkMode: "single"` without reading runtime state.
3. Remove `ink.mode` acceptance and performance rows, schema tests, and browser tests.
4. Update the worklog decision trail and verify the real UI in the browser.
