# Sticker topology conditioning for imported geometry

## Goal

Keep stickers continuous across the valid small bevel triangles of uploaded
models without changing the uploaded render geometry, hard normals, materials,
model framing, controls, or export behavior.

## Diagnosis

The supplied `A.obj` is already one closed manifold surface: 2,220 valid
triangles, 3,330 two-owner edges, no degenerate triangles, and one connected
component after the existing position weld. The sticker topology builder uses
the chart-space epsilon `1e-7` as an absolute squared-area cutoff. After model
normalization that removes 1,688 valid small bevel triangles, leaving 532
triangles, 500 artificial boundary edges, and two sticker components.

## Product decisions

- Preserve the original mesh buffers for WebGL shading so authored hard-normal
  seams, bevel highlights, material groups, and source geometry remain intact.
- Continue building a separate canonical sticker topology once per loaded model.
- Continue welding coincident sticker-topology vertices with the existing
  normalized-coordinate position keys.
- Reject only triangles that are degenerate relative to their own longest edge,
  rather than applying an absolute world-area cutoff.
- Use distinct tolerances for topology area, normal validity, edge unfolding,
  and chart clipping so quantities with different dimensions do not share one
  epsilon.
- Preserve real open boundaries, disconnected components, and non-manifold
  seams; do not auto-fill holes or connect geometry by proximity.

## Unchanged behavior

- Existing Model, Stickers, and Sticker Transform sections remain unchanged.
- No new controls, layers, persistence, settings fields, or timeline behavior.
- Preview, PNG, and video continue to share the same cached surface topology and
  sticker placement map.
- Model centering, dominant-axis normalization, camera orbit, raycasting, model
  scale, sticker scale/rotation/drag, stacking, and HDRI response are unchanged.

## Acceptance

- A scaled valid folded-surface fixture retains every small triangle and wraps a
  sticker onto both connected faces.
- An exactly collinear triangle remains excluded.
- The existing connected-hard-edge browser output remains continuous.
- The exact supplied `A.obj` retains 2,220 surface triangles as one component
  and renders intact stickers without the reported slices.
- Targeted sticker scale, rotation, and direct-drag budgets remain unchanged.
