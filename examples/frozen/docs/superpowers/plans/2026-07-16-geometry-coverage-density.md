# Geometry-relative ice coverage plan

Verification tier: Tier 3

Reason: Changes two workload controls, model preprocessing, retained instance
capacity, WebGL output, acceptance, and renderer performance paths.

Run: targeted Vitest, typecheck/build, exact Chromium coverage acceptance,
targeted preview/model-import performance where the protected lifecycle permits,
direct integrity, and the protected iteration runner.

Skip: timeline, layers, persistence policy, media formats, and export behavior do
not change. Do not refresh the full performance baseline for this later feature
pass.

## Product behavior

- `ice.crystalDensity` becomes 0–100% surface coverage. Zero renders no surface
  spikes; 100% consumes the geometry-derived full sample pool.
- `ice.icicleDensity` becomes 0–100% underside coverage. Zero renders no long
  icicles; 100% consumes all candidates allowed by the Underside filter.
- Instance capacity is derived from normalized sampled surface area and bounded
  by explicit hard caps, so arbitrary models remain safe while the maximum is
  materially denser than the old fixed 4,000/100 limits.
- Keep the built-in sliders in the existing `Ice Geometry` section. No custom
  controls, new sections, timeline, layers, or export changes.

## Coverage correction after complex-model evidence

The user's complex uploaded model proves that consuming every random sample is
not equivalent to complete visual coverage. The renderer must therefore satisfy
two additional invariants:

- Surface crystals, shell ice, and icicles share the same top-to-bottom thaw
  mask. `Surface coverage = 100%` densely covers only the currently frozen
  region; `Progress = 100%` removes every generated ice element.
- At 100%, each crystal base radius is derived from model surface area divided by
  active sample count and enlarged to an overlapping footprint. Random sample
  gaps therefore close instead of exposing bare islands. Lower coverage values
  retain sparse behavior, and `Crystal size` remains a meaningful multiplier.

Implementation touches `frozen-material.ts` and `frozen-instances.ts`, adds a
focused unit helper for the adaptive footprint, and extends the Chromium test to
prove 100% coverage changes pixels while frozen but is fully discarded at
`Progress = 100%`.

## Implementation

1. Update `src/app/frozen/frozen-model.ts` to retain surface-area evidence and
   allocate deterministic adaptive crystal/icicle sample pools.
2. Update `src/app/frozen/frozen-values.ts` and
   `src/app/frozen/frozen-instances.ts` so density values are fractions of the
   geometry pool and actual instance counts derive from coverage.
3. Update `src/app/frozen/frozen-controls.ts`,
   `src/app/app-performance.ts`, `src/app/app-renderer-pipeline.ts`, and the
   fixture/kernel adapters to declare coverage-percent workload dimensions.
4. Update focused unit/browser tests to prove left edge = 0, right edge exceeds
   the old hard cap on the actual uploaded geometry, and intermediate coverage
   changes the retained output.
5. Record the decision and verification evidence in
   `docs/toolcraft/agent-worklog.md`.
