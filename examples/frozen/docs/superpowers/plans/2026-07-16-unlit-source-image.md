# Unlit source image plan

Verification tier: Tier 3

Reason: the image-card face material changes inside the custom WebGL renderer and
must remain color-stable in preview, camera orbit, and still export.

## Product decision

- Preserve the uploaded image as an sRGB color texture.
- Render the front/back image faces with an unlit material and disable tone
  mapping for that material, so HDRI, direct lights, and exposure do not alter
  the source pixels.
- Keep the rounded card edge, ice shell, frost, crystals, and icicles physically
  lit. No schema controls, sections, persistence, timeline, layers, or actions
  change.
- The existing ice overlay may still refract or cover the source as part of the
  freeze effect; only the underlying image is lighting-independent.

## Implementation

1. Update `src/app/frozen/frozen-image-model.ts` to construct the image faces
   with `MeshBasicMaterial`, `map`, alpha handling, and `toneMapped=false`.
2. Add focused material-contract coverage to
   `src/app/frozen-image-source.test.ts` and browser acceptance proving that
   lighting controls do not change a fully thawed image card.
3. Update `PRODUCT_SPEC.md`, acceptance evidence, and
   `docs/toolcraft/agent-worklog.md` with the unlit-source decision.

## Verification

- Run the focused source-image unit test and TypeScript.
- Run a real Chromium image upload and compare the fully thawed product pixels
  before/after changing environment intensity and exposure.
- Run `npm run verify:quick`, direct integrity, and the impact-derived targeted
  iteration command. The material removes lighting work and adds no workload
  dimension, boundary, resource, or renderer pass.
- Skip the full performance checkpoint: this is a later visual-correctness pass,
  not an optimization request or first-stable delivery.
