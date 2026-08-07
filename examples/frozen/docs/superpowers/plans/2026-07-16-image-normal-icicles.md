# Image-card normal-aligned icicles

Verification tier: Tier 3

Reason: Change image-source surface sampling and retained WebGL instance matrices,
including the maximum reachable image icicle distribution and rendered output.

Run: TypeScript; focused geometry/instance Vitest; exact image-source Chromium
acceptance; live visual browser inspection; protected kernel benchmark; direct
integrity; `npm run verify:quick`; targeted affected performance path/iteration
attempt.

Skip: Full performance refresh because this is a later visual-correctness pass,
not a performance request. Timeline, layers, controls, persistence, media formats,
canvas size, x2 render scale, and export semantics do not change.

## Product decision

- Keep the existing control-section inventory unchanged.
- For a 3D source, keep underside-weighted candidate sampling, the Underside
  threshold, and gravity-aligned local `-Y` icicles.
- For an Image source, sample icicle candidates across the complete rounded slab
  and rotate each local `-Y` cone axis to its sampled outward surface normal.
- Hide `Underside` in Image mode because it has no meaning for complete-surface
  normal alignment; keep the rest of the Ice Geometry section unchanged.
- Preserve density, length, radius, variation, thaw-mask behavior, 12,000 hard
  cap, renderer technique, PNG export, no timeline, and no layers.

## Implementation

1. Update `src/app/frozen/frozen-model.ts` so image slabs retain full-surface
   icicle samples while imported 3D meshes retain downward-weighted samples.
2. Update `src/app/frozen/frozen-instances.ts` with testable source-kind
   eligibility/direction helpers and normal-aligned image instance matrices.
3. Bump the canonical renderer runtime id and expose the active icicle direction
   mode as a product-output diagnostic attribute.
4. Align product spec, acceptance language, focused unit/browser coverage,
   performance impact ownership if required, and the Toolcraft worklog.

## Acceptance

- Image mode reports `surface-normal` icicle direction.
- A front/side normal maps the cone axis away from the card rather than global
  down; a bottom normal remains down.
- 3D mode still rejects non-underside candidates and remains gravity-aligned.
- Image density/length changes still alter rendered pixels and the thaw mask.
