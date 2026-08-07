# Direct orientation-point tracking

## Goal

Make the grabbed orientation-gizmo axis point follow the pointer immediately instead of converting its movement through the much larger canvas viewport height.

## Root cause

The current gesture feeds gizmo-local pointer deltas into the main-canvas orbit formula `angle = π × delta / viewportHeight`. In the controlled browser, an 18×18 CSS pixel pointer drag at a 1228px viewport height moved the selected point only 1.13×1.13 pixels on the 24.5px-radius gizmo.

## Behavior contract

- Keep the 3px click/drag threshold and 600ms click-to-axis snap.
- On drag, map the pointer's absolute gizmo-local position onto the 24.5px orientation sphere.
- Rotate the camera pose so the grabbed world-axis endpoint projects to that mapped position in the gizmo.
- Preserve the selected endpoint's starting front/rear hemisphere while it is grabbed.
- Inside the sphere, the endpoint follows the pointer one-to-one; outside the circle, it clamps naturally to the sphere edge.
- Preserve camera radius, runtime `view.orbit`, one merged history group per gesture, reset, undo/redo, preview, and export behavior.
- Keep the main product-canvas orbit sensitivity unchanged.

## Implementation

1. Add direct gizmo-point projection math and unit coverage in `src/app/renderer/orbit-camera.ts` and `src/app/renderer/orbit-camera.test.ts`.
2. Update `src/app/renderer/orientation-gizmo-control.tsx` to capture the endpoint hemisphere on pointer down and apply the absolute pointer-to-sphere pose during drag.
3. Strengthen `e2e/app-controls.spec.ts` so it proves the selected endpoint lands at the clamped pointer position, not merely that camera state changes.
4. Keep the existing targeted `view.orbit` browser performance scenario and record the diagnosis and evidence in `docs/toolcraft/agent-worklog.md`.

## Verification note

Verification tier: Tier 3
Reason: This changes a custom canvas-handle direct-manipulation algorithm and the high-frequency `view.orbit` render path without changing schema state shape, export, dependencies, or Toolcraft runtime architecture.
Run: `npm run ai:check`, focused orbit unit tests, `npm run verify:quick`, focused camera/effects browser acceptance, targeted `browser perf: view.orbit remains responsive`, and controlled-browser pointer/projection measurement.
Skip: `npm run verify:final` and the full performance checkpoint are not required for this post-first-working interaction-sensitivity correction; unrelated renderer workloads, export, media, and runtime architecture are unchanged.
