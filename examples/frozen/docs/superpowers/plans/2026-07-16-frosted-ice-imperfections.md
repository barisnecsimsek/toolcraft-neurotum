# Voronoi two-material ice blend plan

Verification tier: Tier 3

Reason: Adds a user-authored material-mask entity and blends two retained WebGL
physical lobes per fragment, changing shader cost, controls, acceptance, and
renderer output.

Run: typecheck, focused material/schema/performance Vitest, exact Chromium
material and control acceptance, the affected preview/camera performance path
where the protected lifecycle permits, production build, direct integrity, and
the protected Tier 3 iteration runner.

Skip: no new media format, upload flow, timeline, layers, persistence, canvas
sizing, render scale, geometry limits, or export semantics. Do not refresh the
full performance baseline for this later visual feature pass.

## Visual target and material contract

Use the supplied `Frosted Ice Imperfections` reference for the transparent lobe,
while preserving the current frost lobe unchanged:

- transparent ice uses low roughness, full physical transmission, blue volume
  absorption, and sharp HDR/Fresnel highlights;
- frost uses the current tint, roughness variation, relief, transmission, and
  generated geometry response without a replacement procedural material;
- a UV-independent object-space Voronoi field blends the two lobes continuously;
- `Frost coverage = 0%` is exactly transparent ice and `100%` is exactly the
  current frost; intermediate values create connected cellular frost patches;
- the existing top-to-bottom thaw mask remains authoritative.

The reference image is:
`local-reference://captures/CleanShot 2026-07-16 at 16.40.04@2x.png`.

## Controls and state

- Keep existing `Ice Surface`, `Surface Relief`, and `Lighting` behavior.
- Add one `Material Mask` section with built-in continuous sliders:
  `ice.materialMaskCoverage`, `ice.materialMaskScale`,
  `ice.materialMaskSoftness`, `ice.materialMaskDistortion`, and
  `ice.materialMaskSeed`.
- Coverage controls the transparent/frost balance; scale controls Voronoi cell
  size; softness controls the transition band; distortion jitters cell centers;
  seed deterministically changes the pattern.
- Existing scratch texture and relief controls continue to affect the frost lobe
  exactly as they do now. They are not repurposed as the material mask.
- No custom controls, timeline, layers, or export actions.

## Renderer implementation

1. Implement a bounded object-space Voronoi F1/F2 mask with deterministic cell
   jitter and a low-cost distortion field. Compute it once per fragment.
2. Blend clear-ice and current-frost diffuse tint, roughness, scratch normal
   strength, and physical transmission from the same mask so there is no seam or
   double-draw z-fighting.
3. Preserve the current frost endpoint exactly at 100% and use a clear endpoint
   at 0%; crystals and icicles consume the same mask in effect space.
4. Keep Delta 2 PMREM HDRI and ACES. HDRI rotation/intensity remain user controls;
   no external environment file is required for the material to work.
5. Bump the material shader and renderer pipeline cache/runtime ids; no new
   workload dimension is needed because all five controls execute the same fixed
   Voronoi instruction count.

## Acceptance

- Add automated and protected browser acceptance for all five mask targets.
- Add a focused Chromium material proof: 0%, 50%, and 100% coverage must produce
  distinct rendered pixels; seed must change the 50% pattern; both endpoints
  must retain physical HDR response without shader/WebGL errors.
- Preserve the x2 backing, object-space thaw mask, scratch upload, exact icicle
  zero behavior, and PBR transmission checks.
