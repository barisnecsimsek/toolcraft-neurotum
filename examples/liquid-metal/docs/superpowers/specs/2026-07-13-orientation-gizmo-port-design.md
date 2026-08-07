# Liquid Metal Orientation Gizmo Port

## Goal

Port the orientation element shown in the supplied CleanShot from the local
`/Users/kusnizza/Projects/toolkit-tests/ascii-tool` project into Liquid Metal
3D with its complete interaction contract. The element must be a real
Toolcraft canvas editing handle whose camera pose reaches preview, reset,
history, settings transfer, PNG export, and video export.

## Reference Evidence

- Supplied still:
  `/Users/kusnizza/Library/Application Support/CleanShot/media/media_E2dbSxQSOm/CleanShot 2026-07-13 at 10.53.19@2x.png`.
- Source implementation:
  `ascii-tool/src/app/renderer/orientation-gizmo-control.tsx` and
  `ascii-tool/src/app/renderer/orbit-camera.ts`.
- Source behavior coverage:
  `ascii-tool/src/app/renderer/orbit-camera.test.ts`,
  `ascii-tool/e2e/app-controls.spec.ts`, and the gizmo-specific plans in
  `ascii-tool/docs/plans/`.
- Source runtime record:
  `ascii-tool/docs/toolcraft/agent-worklog.md`, iterations 6 through 10.

The inspected source establishes this contract:

- 70×70 CSS pixels with a 140×140 Canvas2D backing at a fixed DPR of 2;
- fixed 16px left/bottom viewport placement;
- physically separate, fully opaque circular backing and transparent dynamic
  axes canvas so camera updates cannot make the circle flicker;
- center `(35, 35)`, reach `24.5`, point radius `5.6`, hover radius `7.28`,
  positive-axis line width `2.1`;
- X `#ff215e`, Y `#53ff55`, Z `#3b69ff`, front alpha `0.95`, rear alpha
  `0.3`, with rear-to-front depth sorting;
- nearest-depth point hit testing, hover enlargement, and a one-pixel white
  hover outline;
- click-to-axis snap over 600ms with quadratic ease-in-out;
- a 3px click/drag threshold;
- direct point tracking on drag: the grabbed axis point follows the absolute
  pointer position on the orientation sphere, clamps at its edge, preserves
  its starting front/rear hemisphere, preserves camera radius, and can update
  camera up/roll when exact tracking requires it;
- one merged Toolcraft history group per gesture;
- no interaction on the empty circle and no gizmo pixels in export output.

## Chosen Architecture

Use the supported custom-control path already proven in `ascii-tool`:

1. Add an `orientationGizmo` schema control targeting `view.orbit` in the
   existing `Model Size` section.
2. Register its renderer through `ToolcraftApp controlRenderers`.
3. Portal only the textless editing handle into the runtime canvas viewport.
4. Store the final camera position/up value in Toolcraft runtime state.
5. Make the persistent Three.js preview renderer and both export renderers read
   the same pose.

`view.orbit` uses `{ position: [x, y, z], up: [x, y, z] }`. The default radius
is adapted from the reference scene to Liquid Metal's existing `4.6` camera
distance; the widget geometry and all interaction math remain unchanged. The
existing initial model presentation stays at its current fixed base rotation,
so adding the control does not unexpectedly reframe the product at rest.

The current middle-button canvas orbit remains the Liquid Metal host gesture
because left-button drag already owns sticker selection and surface placement.
It will stop mutating local Euler rotation and instead write the shared
`view.orbit` pose with the reference spherical orbit math. This is a host-app
gesture decision, not a change to the copied gizmo behavior.

## Approaches Considered

### Chosen: schema-backed camera pose plus exact custom handle

This preserves source behavior and keeps reset, undo/redo, preview, settings,
and export synchronized.

### Rejected: visual-only overlay over local model Euler state

The existing `{x, y}` model rotation cannot represent six camera-axis snaps,
camera up, roll introduced by direct point tracking, or exact endpoint
projection. The widget would display a different orientation from export and
could not reset through Toolcraft state.

### Rejected: cross-project import, iframe, or copied editor shell

That would couple this generated app to another folder and violate the
Toolcraft runtime boundary. The small app-owned math and handle modules are the
correct portable unit.

## Control Section Inventory

The existing `Model Size` section becomes the owner of normalized model
framing and its view orientation:

| Section | Entity/workflow | Targets | Grouping reason |
| --- | --- | --- | --- |
| Model Size | Normalized model framing and camera view | `model.scale`, `view.orbit` | Model scale controls source framing while the portal-only custom control owns the matching camera pose without adding duplicate panel chrome. |

All other sections, timeline, layers, media, background, and export controls are
unchanged. Layers remain enabled only through the current media-layer behavior;
the gizmo does not create a product layer. Persistence remains `storage: none`.

## State And Render Flow

```text
schema view.orbit
  ├─ orientation-gizmo click/drag → setValue(history: merge)
  ├─ middle-button canvas orbit → controls.setValue(history: merge)
  ├─ preview → camera.position / camera.up / lookAt(origin)
  ├─ PNG export → isolated renderer with the same pose
  └─ video export → every encoded frame with the same pose
```

The static model base rotation remains renderer-owned and identical in preview
and export. Sticker raycasting uses the updated camera matrices, so selection
and surface placement continue to follow visible pixels after orbiting.

## Renderer Technique And Pipeline

The product renderer remains WebGL. The gizmo adds one low-count editing-handle
layer: an opaque DOM backing plus a transparent Canvas2D axes surface. It is
excluded from export.

`view.orbit` invalidates only the lightweight orientation-gizmo draw and the
`three-surface-composite` pass. It must not invalidate model decode,
normalization, environment decode/prepare, scratch decode/prepare, sticker
decode, or decal projection. The targeted interaction scenario runs at render
scale 2 with an uploaded model.

## Acceptance

- The exact 70×70 / 140×140 bounds, 16px insets, colors, backing separation,
  transparency, axis projection, hover state, and depth ordering match the
  source.
- Empty-circle press is inert.
- Clicking each visible endpoint can snap to its corresponding axis; browser
  coverage proves a representative snap reaches the exact pose after 600ms.
- Dragging a point more than 3px cancels snapping, directly tracks the pointer,
  clamps at the sphere edge, preserves radius/hemisphere, updates visible
  pixels, and leaves the final pose stable after release.
- Middle-button orbit changes the same `view.orbit` target and keeps Toolcraft
  canvas offset/zoom stable; left-button sticker behavior remains intact.
- Undo/redo and Model Size/global reset restore runtime-backed orientation.
- Toolbar zoom and radar/center do not move the fixed handle.
- Theme changes the stable backing between the source dark/light colors.
- Preview, PNG, and video use the same camera pose, while exported pixels omit
  both backing and axes layers.
- WebGL reports no errors and sticker raycasting remains correct after orbit.

## Verification Note

Verification tier: Tier 3

Reason: this adds a custom canvas editing handle and migrates camera orientation
from local model Euler state to a runtime-backed camera pose across preview,
raycasting, PNG, and video. It changes no dependencies, shared Toolcraft
runtime, timeline semantics, layer model, or product media shape.

Run: `npm run ai:check`; focused orbit-math and product/export tests;
`npm run verify:quick`; focused browser acceptance for the gizmo, middle orbit,
sticker interaction, reset/history, theme/zoom stability, and export exclusion;
the targeted `view.orbit` browser performance scenario at render scale 2; and
controlled in-app browser verification of pointer tracking and layer stability.

Skip: `npm run verify:final` and the full performance checkpoint are not
required for this post-first-working non-performance Tier 3 feature. Unrelated
shader, media-import, timeline, layer-order, and 4K/8K workload suites remain
outside this pass; the touched camera-render path receives targeted functional
and performance coverage.
