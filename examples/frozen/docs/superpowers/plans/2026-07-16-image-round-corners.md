# Image round corners plan

Verification tier: Tier 3

Reason: adds one source-geometry control and replaces the thin depth-limited box
rounding with a custom rounded-rectangle WebGL extrusion consumed by preview,
surface sampling, orbit, and still export.

## Product decision

- Add the built-in continuous slider `source.imageCornerRadius`, visible only in
  Image mode, labeled `Round corners`, with a 0–100% range.
- Interpret 0% as a rectangular image/slab silhouette and 100% as a radius equal
  to half the shorter image face (pill/circle limit), independent of thickness.
- Keep `Bevel` as the separate physical front/side edge treatment. Round corners
  owns the two-dimensional outline; Bevel owns the three-dimensional edge.
- Use one rounded-rectangle extrusion for both textured caps and edge geometry,
  so the image cannot retain square corners outside the model silhouette.
- No new section, custom control, layer, timeline, persistence policy, action, or
  export setting is required. The Source section remains one cohesive entity.

## Implementation

1. Extend `FrozenImageGeometrySettings`, runtime value mapping, schema Source
   controls, section inventory, acceptance data, and renderer invalidation with
   `source.imageCornerRadius`.
2. Replace `RoundedBoxGeometry` in `frozen-image-model.ts` with a constant-detail
   `ExtrudeGeometry` built from a rounded rectangle. Normalize its bounds, assign
   full-image planar UVs, and use cap/side material groups for the unlit image and
   lit edge.
3. Carry normalized and physical corner radius through prepared-model metadata
   and renderer diagnostics.
4. Add unit coverage for depth-independent radius, exact bounds/UVs/groups, and
   schema/value mapping; add browser coverage for the real slider and visible
   rectangular-to-rounded silhouette transition.
5. Update `PRODUCT_SPEC.md` and `docs/toolcraft/agent-worklog.md`.

## Performance and verification

- The slider is responsiveness-only: curve/bevel segments stay fixed, topology
  stays bounded, and the existing `image-model-prepare` path owns rebuild cost.
- Run TypeScript, focused schema/product/performance gates, exact Chromium round
  corner acceptance, the existing image-geometry performance path, protected
  kernel/build receipt, direct integrity, and `npm run verify:quick`.
- Attempt the protected Tier 3 iteration receipt with exact unit, browser, and
  image-geometry performance tests. Do not run a full checkpoint; this is a later
  feature pass and not a performance-optimization request.
