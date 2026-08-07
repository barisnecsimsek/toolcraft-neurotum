# Stable orientation-gizmo endpoint at the sphere boundary

## Goal

Port the updated ASCII Tool orientation-gizmo behavior so a grabbed colored
endpoint keeps a stable front/rear hemisphere, opacity, and depth order when
the pointer reaches or moves beyond the sphere boundary.

## Diagnosis

The current Liquid Metal pointer projection clamps radial distance to exactly
`1`. That makes the captured camera-local Z component exactly zero. Repeated
application of the same boundary pose produces floating-point depth near zero
and can discard or invert the captured hemisphere, which changes the existing
Canvas2D front/rear styling and point sort order.

## Product decisions

- Preserve the 70px design, separate static backing, direct point tracking,
  click snap, camera radius, merged history, preview, raycasting, and exports.
- Preserve the hemisphere captured at pointer-down for the whole gesture.
- Clamp the radial coordinate an imperceptible amount inside the unit sphere,
  leaving a signed camera-local Z magnitude of `1e-4` at the visual boundary.
- Keep the existing Canvas2D paint rules; stabilize their camera-math input.

## State and output mapping

`getLiquidMetalOrbitPoseFromGizmoPointer` continues to write the same
schema-backed `view.orbit` value. `projectLiquidMetalOrbitAxes` then receives a
stable non-zero depth for the active point, while preview, sticker raycasting,
PNG/video export, reset, and undo/redo consume the unchanged pose shape.

## Acceptance

- Repeating an outside-boundary pointer pose 30 times preserves the requested
  depth sign for both captured hemispheres.
- The projected endpoint remains visually on the 24.5px sphere radius.
- A real held-point drag alternating just outside the bottom boundary produces
  one constant bright alpha value instead of front/rear flicker.
- Existing snap, direct drag, backing, preview, and performance behavior pass.
