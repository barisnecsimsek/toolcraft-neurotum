# Blender-style orientation gizmo drag

## Goal

Keep the existing bottom-left orientation gizmo design while changing its point interaction to Blender-style interactive navigation: a short click snaps to the selected axis, while dragging a point freely orbits the camera in both screen axes.

## Behavior contract

- Pointer down on a visible axis point begins a pending gesture and does not move the camera immediately.
- Movement below a 3 CSS pixel threshold remains a click candidate.
- Crossing the threshold cancels click snapping and starts a free two-axis orbit from the current camera pose, without first snapping to the selected axis.
- Free drag uses the same orbit math and viewport-height sensitivity as left-dragging the product canvas.
- Pointer up before the threshold animates the existing 600 ms axis snap.
- Pointer up after a drag keeps the freely orbited pose and does not snap.
- Pointer cancel ends the gesture without snapping.
- The empty circular background remains non-interactive; the user grabs an axis point.
- Every committed pose continues to use the `view.orbit` runtime target and one merged history group per gesture.

## Reference evidence

- The supplied PNG still defines the existing visual target and point-based affordance.
- Blender's Viewport Preferences documents Interactive Navigation as: clicking an axis sets the matching view, while dragging orbits the view.
- The app's existing main-canvas orbit is the selected free-orbit model so both interaction surfaces remain consistent.

## Implementation

1. Update `src/app/renderer/orientation-gizmo-control.tsx` to separate click from drag with a threshold, remove pointer-down snapping, and route both pointer deltas through `orbitPoseFromPointerDelta` using the actual viewport height.
2. Remove the obsolete axis-constrained orbit helper and its unit coverage from `src/app/renderer/orbit-camera.ts` and `src/app/renderer/orbit-camera.test.ts`; add coverage proving one diagonal point drag changes both off-axis camera components while preserving radius.
3. Update schema help, acceptance metadata, reference inventory, and the targeted `view.orbit` performance scenario to describe the intentional Blender-style behavior.
4. Update browser acceptance so a click still snaps and a diagonal point drag demonstrably changes both camera axes.
5. Record the behavior decision and verification evidence in `docs/toolcraft/agent-worklog.md`.

## Verification note

Verification tier: Tier 3
Reason: This changes custom canvas-handle pointer mechanics and the camera-render interaction workload, without changing runtime state shape, exports, dependencies, or Toolcraft architecture.
Run: `npm run ai:check`, focused orbit unit tests, `npm run verify:quick`, the focused camera/effects browser acceptance, the targeted `view.orbit` browser performance scenario, controlled-browser interaction verification, and the existing dev-server identity check.
Skip: `npm run verify:final` and the full browser performance suite are not required for this post-first-working, non-performance feature pass; export, media, runtime architecture, and unrelated workloads are unchanged.
