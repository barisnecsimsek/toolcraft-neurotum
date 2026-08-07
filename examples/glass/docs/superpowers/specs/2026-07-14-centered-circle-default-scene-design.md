# Centered Circle Default Scene Spec

## Goal

Make the current liquid-glass scene the app baseline on first load and reset, while changing the glass from the previous centered pill into a centered circle.

## Product Behavior

- Preserve the current default source image, glass texture image, text, shadow, refraction, surface, highlight, background, export, canvas size, and render-scale settings.
- Change the default glass shape to `Circle`.
- Make the circle geometry explicit and self-consistent in controls: `Width 460px`, `Height 460px`, `Radius 230px`.
- Keep the glass centered on the canvas: the visible Center vector remains `0, 0`, which normalizes to renderer center `{ x: 0.5, y: 0.5 }`.
- Bump persistence to `toolcraft:liquid-glass:state:v5` / version `5` so older saved browser state does not hide the new default scene.

## Implementation

- Update schema defaults in `src/app/app-schema.ts`.
- Update fallback renderer defaults in `src/app/liquid-glass-types.ts`.
- Update schema tests to assert the circular default geometry and new persistence version.
- Update browser/performance tests that previously assumed selecting `Circle` from the default scene changes output.
- Record the decision and verification in `docs/toolcraft/agent-worklog.md`.

## Verification

Verification tier: Tier 3.
Reason: default scene state changes visible renderer geometry and persistence behavior, and it affects shape acceptance/performance paths.
Run: typecheck, schema tests, focused browser acceptance for shape/default media, focused shape/center performance, and `pnpm verify:quick`.
Skip: full `verify:perf`, because no renderer pipeline or workload algorithm changes.
