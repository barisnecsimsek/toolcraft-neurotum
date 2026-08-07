# Image-card gravity icicles implementation plan

## Scope

1. Update `PRODUCT_SPEC.md` so image-card icicles use physical drainage sites,
   a short normal-derived root, and gravity-directed bodies rather than complete
   normal-aligned surface spikes.
2. Refactor `src/app/frozen/frozen-instances.ts` around a typed image icicle
   profile helper that owns eligibility, length falloff, root direction, and
   bend. Preserve the existing imported-model gravity path.
3. Add the minimum segmented instanced taper and per-instance attributes needed
   for a bounded vertex-shader bend. Keep one draw call and the existing 12,000
   candidate limit.
4. Update `src/app/frozen/frozen-output.tsx` observables and the canonical
   renderer runtime id to publish the corrected image mode.
5. Replace obsolete normal-alignment expectations in
   `src/app/frozen-image-source.test.ts`, image acceptance metadata, and
   `e2e/frozen-source-controls.spec.ts` with physical eligibility and rendered
   gravity-bend proof. Keep an exact imported-3D regression.
6. Update `src/app/app-performance.ts` descriptions and
   `src/app/app-performance-impact.json` only where the preview-render technique
   changed; workload dimensions and control ranges remain unchanged.
7. Record the superseding decision and concrete proof in
   `docs/toolcraft/agent-worklog.md`.

## Control and runtime inventory

- Controls: existing Ice Geometry `ice.icicleDensity`, `ice.icicleLength`,
  `ice.icicleRadius`, and `ice.icicleVariation`; no new controls.
- Source: existing `source.mode` and `source.image` determine the image-card
  branch.
- Renderer: retained WebGL preview/export scene and instanced icicle mesh.
- Timeline: unchanged and disabled.
- Layers: unchanged and disabled.
- Persistence/settings transfer: unchanged.
- Export: same renderer output; no format or sizing change.

## Performance assessment

- Reachable maximum remains 12,000 candidate icicles at 100% coverage.
- Source image pixels, source triangles, coverage, transmission, and render scale
  remain the existing workload dimensions and boundaries.
- Preview rendering retains one instanced draw call; bounded extra vertex work
  replaces incorrect rigid transforms. No per-frame CPU topology work is added.
- `preview-render` remains the affected pass; run the exact development path
  selected by the impact inventory and do not lower x2 quality.

## Verification

- Focused Vitest for profile classification, curve endpoints/tangents, zero
  semantics, image-card geometry, pipeline, acceptance, and performance gates.
- Exact Chromium image-card test at maximum coverage/length proving no
  surface-normal spike mode and changed rendered output.
- Exact imported-3D underside test.
- `npm run typecheck`, protected `pnpm verify:kernel`, production build, direct
  integrity, and `npm run verify:quick`.
- Attempt `pnpm verify:perf:record-iteration -- --tier=3` with exact unit,
  browser, and affected canonical performance titles; preserve existing recorded
  blockers instead of weakening output quality.
