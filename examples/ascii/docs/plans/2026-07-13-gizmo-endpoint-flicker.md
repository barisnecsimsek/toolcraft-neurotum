# Stable orientation endpoint at the sphere boundary

## Goal

Remove the remaining flicker of a grabbed colored orientation point when the pointer reaches or moves beyond the gizmo sphere, without changing the 70px design, direct point tracking, click snap, camera radius, history, preview, or export behavior.

## Diagnosis

The pointer projection currently clamps radial distance to exactly `1`, which makes the captured camera-local Z component exactly zero at the sphere boundary. Reapplying the same pointer pose produces alternating floating-point depths around zero (`-2.22e-16` / `+2.22e-16`). The renderer interprets that numerical noise as alternating front/rear state, switching the dot opacity between `0.95` and `0.3` and changing depth order even though the visible camera pose is unchanged.

## Product decisions

- Preserve the existing Model section, `view.orbit` runtime target, custom canvas handle, separated static backing, timeline/layers policy, persistence, settings transfer, and PNG export paths.
- Preserve absolute pointer-to-point tracking and the captured front/rear hemisphere for the full gesture.
- Clamp the radial component an imperceptible amount inside the unit sphere so the captured hemisphere retains a non-zero signed depth at the visual boundary.
- Keep the Canvas2D front/rear styling and depth ordering unchanged; correct the unstable pose input instead of masking it in paint code.

## Files

1. Update `src/app/renderer/orbit-camera.ts` with a small minimum camera-local Z magnitude when mapping an outside pointer to the sphere.
2. Add a repeated-boundary regression in `src/app/renderer/orbit-camera.test.ts` that proves both captured hemispheres keep their depth sign and the endpoint remains visually on the sphere edge.
3. Strengthen `e2e/app-controls.spec.ts` so a real held-point drag repeatedly crosses the outside boundary and proves the active dot remains at the bright opacity instead of alternating front/rear alpha.
4. Record the root cause, decision, evidence, and verification in `docs/toolcraft/agent-worklog.md`.

## Verification tier

Verification tier: Tier 3

Reason: This corrects the high-frequency camera math and Canvas2D editing-handle output on the `view.orbit` renderer path, while schema shape, product renderer architecture, exports, dependencies, timeline, and layers remain unchanged.

Run: focused orbit unit tests; `npm run verify:quick`; focused `browser: effect baseline and camera orbit`; targeted `browser perf: view.orbit remains responsive`; controlled-browser drag at the sphere boundary with stable endpoint depth/appearance and a clean console.

Skip: `npm run verify:final` and the full performance checkpoint because this is a post-first-working, narrowly scoped visual interaction fix. Unrelated media, export, timeline, layers, and renderer workloads are unchanged.
