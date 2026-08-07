# Gravity-driven image-card icicles

## Goal

Replace image-card normal-aligned spikes with gravity-driven ice. Surface
normals still define attachment and a short root neck, but every visible icicle
body bends toward world down. Long icicles grow only from downward-facing card
surfaces and the lower rounded contour. Vertical faces may carry short frozen
rivulets; upward-facing surfaces keep frost/crystals but no icicles.

## Physical model

For a sampled point `p`, unit outward normal `n`, and gravity
`g = (0, -1, 0)`, define `d = dot(n, g)`:

- `d > 0.45`: hanging region. Use the full authored length and a nearly straight
  gravity-aligned body.
- `-0.15 <= d <= 0.45`: wall region. Admit only lower-card drainage sites and
  cap the visible length. The root leaves the surface briefly before bending
  down.
- `d < -0.15`: upward-facing region. Do not create an icicle.

Use normalized card height `h = (p.y - minY) / (maxY - minY)` to suppress wall
drips above the lower half and to shorten the remaining wall drips. Density is
applied after physical eligibility, so 100% means every eligible drainage site,
not every surface sample.

The icicle centerline is a quadratic Bezier:

```text
P0 = p
P1 = p + n * rootOffset
P2 = p + n * rootOffset + g * length
B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
```

For a downward normal, the points are collinear and the icicle remains straight.
For a wall normal, the root moves slightly outward and the body turns down.

## Renderer technique

Keep one retained `InstancedMesh`. Replace the one-height-segment cone with a
small bounded segmented taper and deform its centerline once in the vertex
shader using per-instance root-normal and bend attributes. Do not rebuild
individual curve meshes or allocate objects per frame. The existing maximum of
12,000 image icicle candidates remains the enforced workload boundary.

## Product behavior

- No new controls or sections.
- `Icicle coverage` controls eligible drainage sites.
- `Length` controls the gravity-directed body; wall drips receive a physical
  cap and height falloff.
- `Radius` controls the root/body radius.
- `Variation` continues to vary length and radius and may slightly vary root
  bend without allowing a horizontal body.
- Surface crystals remain normal-aligned and provide side/top ice growth.
- Imported 3D models preserve their existing underside eligibility and
  gravity-aligned icicles.
- Timeline, layers, persistence, media flow, Melt Brush, and export semantics are
  unchanged.

## Acceptance

- Image top normals are ineligible.
- Image underside normals produce full-length gravity-aligned icicles.
- Image wall normals produce shorter bent-drip profiles whose final tangent is
  gravity-aligned and whose root offset is bounded.
- At 100% coverage there are no straight horizontal icicle bodies.
- Existing zero coverage/length/radius behavior remains exact.
- Imported 3D direction and underside filtering do not regress.
- Browser proof uploads an image card, uses maximum icicle coverage/length, and
  verifies the renderer publishes gravity-bent image behavior plus rendered
  product output.

## Verification tier

Verification tier: Tier 3

Reason: retained WebGL instance geometry, shader deformation, image-card
eligibility, renderer output, acceptance, and preview workload are affected.

Run: focused unit tests; `npm run typecheck`; exact image-card Chromium
acceptance and 3D underside regression; protected kernel proof after renderer
changes; targeted canonical preview path; `npm run verify:quick`; production
build; direct integrity; keep the existing development server available.

Skip: no full performance checkpoint because this is a later visual-correction
feature, not a performance optimization request. Timeline, layer, persistence,
and export-format suites are unchanged.
