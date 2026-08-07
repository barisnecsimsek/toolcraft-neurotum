# Melt Brush edge-overlap implementation plan

Verification tier: Tier 3
Reason: This changes the custom WebGL canvas interaction, hit testing, thermal
deposit position, browser acceptance, and the existing `mask-drag` performance
path without changing schema boundaries or output quality.
Run: TypeScript; focused projected-geometry/unit tests; exact edge-overlap,
direct-hit/miss, radius/zoom, and refreeze browser scenarios; current-source
kernel verification; targeted mask-drag performance attempt; direct integrity;
production build; `verify:quick` and protected iteration attempt.
Skip: Full performance checkpoint because this is a later interaction feature,
not a performance-optimization request. Timeline, layer, video, persistence,
media-format, and export-dimension checks are unchanged.

## Files and steps

1. Update `PRODUCT_SPEC.md` with pointer-outside partial-overlap semantics.
2. Add `src/app/frozen/frozen-melt-projection.ts` for memoized projected source
   triangles and bounded nearest screen-space candidates.
3. Update `src/app/frozen/frozen-scene.ts` to recover surface depth on direct
   misses and deposit from the pointer-centered 3D location.
4. Update `src/app/frozen/frozen-output.tsx` to break stroke interpolation while
   a captured pointer has no brush/object overlap.
5. Update acceptance, performance impact, renderer runtime id, focused Vitest,
   and `e2e/frozen-melt-brush.spec.ts`.
6. Record decisions, proof, skipped full checkpoint, and remaining risks in the
   product worklog.
