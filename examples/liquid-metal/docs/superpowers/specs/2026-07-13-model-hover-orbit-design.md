# Model-hover orbit and empty-canvas pan

## Goal

Port the ASCII viewport gesture contract into Liquid Metal: a plain left-button
drag that begins on visible model geometry orbits the shared camera, while the
same drag beginning outside the model remains owned by the Toolcraft canvas and
pans the canvas world. Middle-button drag no longer changes the camera.

## Reference evidence

The local ASCII app is the source of truth:

- `src/app/renderer/effects-canvas.tsx` owns plain-left camera orbit, merged
  `view.orbit` history, pointer capture, and propagation blocking while orbiting.
- `docs/plans/2026-07-10-orientation-gizmo-parity.md` explicitly maps plain-left
  drag over the 3D surface to camera orbit, left drag outside the surface to
  Toolcraft pan, modifier-left to Toolcraft pan, and middle drag to no camera
  rotation.
- `docs/toolcraft/agent-worklog.md` iteration 6 records the same interaction
  decision and runtime state mapping.

Liquid Metal already shares the same `view.orbit` camera pose between preview,
sticker raycasting, the orientation gizmo, history/reset, PNG, and video. This
pass changes only which main-canvas pointer gesture starts an orbit.

## Interaction priority

For a plain unmodified left-button pointer-down:

1. A hit on the top visible sticker starts the existing sticker drag.
2. Otherwise, a hit on visible base-model triangles starts camera orbit.
3. Otherwise, the event is left untouched so it bubbles to Toolcraft's canvas
   viewport and starts canvas pan.

Ctrl-, Meta-, or Shift-modified left drag is never claimed by the product
renderer and remains available to the Toolcraft viewport. Middle-button drag is
also not claimed and must not change `view.orbit`.

The gesture owner is locked at pointer-down. Moving off the model during an
orbit continues the same orbit until pointer-up/cancel; moving onto the model
during an empty-canvas pan does not steal the active Toolcraft gesture.

## Renderer and state mapping

Add a model hit-test to `LiquidMetalSceneRenderer` using the existing camera,
canvas-to-NDC conversion, base-model mesh list, and shared Three.js raycaster.
The hit-test does not allocate geometry, rebuild stickers, or change renderer
state.

When a model hit starts orbit, the existing spherical pointer-delta math,
requestAnimationFrame-coalesced `controls.setValue`, merged history group,
camera pose, render invalidation, and export state remain unchanged. A miss does
not dispatch product state; Toolcraft owns `canvas.setOffset` through the normal
bubbling pointer path.

## Product contracts

- Schema controls/sections: unchanged.
- Canvas output: unchanged WebGL product output; no new handle or UI.
- Timeline, layers, persistence, settings transfer, and export: unchanged.
- Renderer pipeline: the existing raycast interaction pass gains a lightweight
  model-hit branch; model decode, environment decode, sticker topology, and
  export passes remain cached.
- Control Section Inventory: unchanged because no panel control is added.

## Acceptance

- Plain left drag beginning on visible model pixels changes `view.orbit` and
  rendered pixels without changing Toolcraft canvas offset.
- Plain left drag beginning in empty canvas space changes Toolcraft canvas
  offset without changing `view.orbit`.
- Middle-button drag does not change `view.orbit`.
- Sticker drag retains priority over model orbit and still updates its placement.
- One orbit gesture remains one undoable/redoable merged history action.
- Orbit remains responsive at the existing 2x detailed-model workload without
  lowering render scale or preview quality.

## Verification note

Verification tier: Tier 3

Reason: Main-canvas pointer ownership, model raycasting, camera history, and a
high-frequency WebGL interaction change, while schema shape, renderer
architecture, dependencies, media, timeline, layers, persistence, and exports
remain unchanged.

Run: `npm run ai:check`; focused source and renderer tests; `npm run typecheck`;
`npm run verify:quick`; focused browser acceptance for model orbit, empty-canvas
pan, middle-button inertness, sticker priority, undo/redo, and viewport
stability; targeted model-surface orbit performance; controlled-browser
verification on the running app.

Skip: `npm run verify:final` and the full browser performance checkpoint are not
required for this post-first-working focused interaction port. The directly
touched model-orbit path receives targeted functional and performance coverage.
