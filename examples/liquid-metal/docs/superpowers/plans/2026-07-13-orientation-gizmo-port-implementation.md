# Liquid Metal Orientation Gizmo Port — Implementation Plan

Verification tier: Tier 3

Reason: add a runtime-backed custom canvas handle and migrate preview/export
camera orientation from local Euler state to one schema pose without changing
shared Toolcraft runtime or dependencies.

Run: `npm run ai:check`, focused Vitest files, `npm run verify:quick`, focused
Playwright gizmo/export/sticker acceptance, targeted `view.orbit` performance,
and controlled in-app browser verification.

Skip: full `npm run verify:final` and the full performance checkpoint because
this is a post-first-working non-performance feature; unrelated renderer
workloads are unchanged.

## 1. Port camera-pose math

Files:

- Add `src/app/liquid-metal-orbit.ts`.
- Add `src/app/liquid-metal-orbit.test.ts`.

Work:

- Port defensive pose parsing, radius preservation, camera quaternion,
  six-axis projection, 600ms snap support, quadratic easing, middle-drag
  spherical orbit, and direct gizmo-pointer mapping from `ascii-tool`.
- Set the Liquid Metal default pose to camera position `[0, 0, 4.6]` and up
  `[0, 1, 0]` while keeping source interaction constants unchanged.
- Prove malformed-state fallback, radius/up behavior, all six snap poses,
  depth projection, direct pointer tracking, clamping, and easing.

## 2. Port the custom viewport handle

Files:

- Add `src/app/liquid-metal-orientation-gizmo.tsx`.
- Update `src/routes/index.tsx`.

Work:

- Port the exact 70px / DPR2 axes canvas, stable sibling backing, theme
  observer, colors, depth sorting, hover/hit behavior, 3px threshold, 600ms
  click snap, pointer capture/cancel, direct endpoint drag, and merged history.
- Keep the empty circle inert and portal only the textless handle into
  `[data-slot="toolcraft-runtime-canvas"]`.
- Register `liquidMetalControlRenderers` through `ToolcraftApp`.

## 3. Add schema and product-contract coverage

Files:

- Update `src/app/app-schema.ts`.
- Update `src/app/acceptance/defaults.ts`.
- Update `src/app/app-acceptance.base-coverage.test.ts`.
- Update `src/app/app-schema.test.ts`.
- Update `src/app/liquid-metal-product.test.ts`.

Work:

- Add the custom `orientationGizmo` control to the `Model Size` section with
  target `view.orbit`, default pose, label `false`, reset support, and
  responsiveness metadata.
- Extend the `Model Size` section inventory to include normalized model
  framing plus view orientation.
- Add custom-control and canvas-handle acceptance rows with a `vector`
  built-in fit check, runtime-state/product-output coverage, export exclusion,
  and exact browser test names.
- Extend the reference study/inventory with the supplied CleanShot and local
  `ascii-tool` source evidence; update product readiness text.
- Add the target to order/coverage assertions and verify the custom control
  stays non-keyframe app state.

## 4. Unify preview, pointer gesture, raycasting, and export orientation

Files:

- Update `src/app/liquid-metal-renderer.tsx`.
- Update `src/app/liquid-metal-scene.ts`.
- Update `src/app/liquid-metal-export.ts`.

Work:

- Remove mutable product-orientation Euler state from the React renderer.
- Read `view.orbit` from runtime state and include it in the preview signature.
- Change middle-button orbit to apply the ported spherical camera math and
  dispatch coalesced `controls.setValue` updates with one merged history group.
- Keep left-button sticker selection/drag behavior unchanged.
- Apply camera position/up/look-at in `LiquidMetalSceneRenderer` before render;
  preserve the existing model base rotation in both preview and isolated
  export renderers.
- Make sticker raycasting use the resulting camera matrices.
- Simplify the export provider to provide only the loaded model; derive the
  pose from the action's Toolcraft state for both PNG and video.
- Expose a stable `data-view-orbit` observable on product output for browser
  verification.

## 5. Declare renderer invalidation and targeted performance

Files:

- Update `src/app/app-performance.ts`.
- Update `src/app/app-performance.renderer-source.test.ts` if source-contract
  assertions are needed.
- Update `e2e/liquid-metal-performance-cases.spec.ts`.

Work:

- Add `view.orbit` mask-drag invalidation for only
  `orientation-gizmo` and `three-surface-composite`, with decode/preprocess
  passes explicitly protected.
- Add the orientation-gizmo pipeline pass and editing-handle renderer layer.
- Add `view.orbit` to surface-composite and PNG/video inputs/invalidations.
- Add a targeted render-scale-2 custom-handle drag scenario with existing
  responsive GPU budgets and a real `dragCanvasHandle` interaction.
- Keep `view.orbit` a responsiveness target, not a workload target.

## 6. Add end-to-end behavior coverage

Files:

- Update `e2e/app-controls.spec.ts`.

Work:

- Verify exact bounds/insets/backing separation/transparency and source colors.
- Hover and click an endpoint; wait for snap and prove pose plus output change.
- Drag the endpoint and prove its projected position matches the clamped
  pointer, the final pose remains stable, and empty backing is inert.
- Verify middle-drag changes the same pose without moving Toolcraft viewport.
- Verify reset/undo/redo, fixed placement after zoom/center, theme backing, and
  zero WebGL errors.
- Snap before PNG/video export and prove export uses the selected pose while
  `expectExportExcludesCanvasHandles` proves no handle pixels are included.
- Re-run the existing sticker surface test after camera orbit to protect
  camera-aware raycasting.

## 7. Record evidence and verify

Files:

- Update `docs/toolcraft/agent-worklog.md`.

Commands/checks:

1. Run focused orbit/product/schema/performance Vitest files.
2. Run `npm run verify:quick`.
3. Run the focused Playwright gizmo runtime test, sticker test, and export test.
4. Run only `browser perf: view.orbit remains responsive`.
5. Start or reuse `npm run dev`, then use the controlled in-app browser to
   inspect direct point tracking, backing stability, fixed placement, reset,
   history, and console/WebGL health.
6. Record concrete pass/fail evidence, skipped full-suite reason, and remaining
   risks in the worklog before delivery.
