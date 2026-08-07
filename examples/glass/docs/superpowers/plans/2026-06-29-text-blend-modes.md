# Text Blend Modes Plan

## Verification Note

Verification tier: Tier 3
Reason: WebGL text compositing acceptance and renderer-backed control behavior are being changed/tested.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted `browser: glass text controls change product output`, targeted `browser perf: text-blend-mode change stays responsive`.
Skip: Full `pnpm verify:perf` unless targeted text performance fails because this is a focused text blend iteration.

## Steps

- [x] Inspect the text blend state path from schema to normalized settings to WebGL uniform.
- [x] Strengthen browser acceptance so all Text Blend options are proven with a non-white text color.
- [x] Remove the flaky dependency on an immediate Roboto canvas glyph change from the same acceptance path.
- [x] Re-render the cached text frame after the selected web font finishes loading.
- [x] Update worklog with root cause, decision, verification, skipped checks, and risks.
- [x] Run typecheck, quick verification, targeted browser acceptance, and targeted text blend performance.
