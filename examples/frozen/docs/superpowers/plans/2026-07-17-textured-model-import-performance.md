# Textured Model Import And Preview Performance Plan

Verification tier: Tier 4
Reason: Textured package import, a new workload control, source simplification,
renderer primitive topology, dependency metadata, acceptance, and canonical
performance paths all change; the user explicitly reported preview lag.
Run: focused Vitest, typecheck, protected kernel, package/GLB browser acceptance,
targeted model-import/preview/orbit/mask/export performance scenarios,
`npm run verify:perf:refresh`, direct integrity, `npm run verify:final`, and real
browser visual inspection at x2.
Skip: timeline/layer/video tests remain unrelated because those surfaces stay
disabled and no animation or video export behavior changes.

1. Add the ZIP dependency through the package manager and keep lockfile metadata
   current.
2. Extract model parsing/package resolution into focused product modules:
   - direct GLB/OBJ/STL parsing;
   - ZIP GLB/glTF/OBJ/MTL/STL resource resolution;
   - deterministic disposal of temporary object URLs;
   - precise unsupported-Blend diagnostics.
3. Add mesh simplification as a focused source-preparation module, preserving
   texture attributes and protecting unsupported geometry; expose source and
   effective triangle counts on `FrozenPreparedModel`.
4. Update Source schema, values, control inventory, preparation cache keys,
   renderer inputs, and source acceptance for `source.modelTriangleBudget`.
5. Reduce only the generated crystal/icicle primitive topology and enable
   correct instanced-mesh frustum culling without changing instance capacities,
   coverage, physical material, or x2 backing scale.
6. Split performance dimensions between accepted source triangles and rendered
   triangle budget, reassess the canonical pipeline, update fixture adapters,
   path scenarios, tests, and `app-performance-impact.json`.
7. Create a textured Night King GLB from the supplied Blend file by relinking the
   three present 2K maps, using a glTF-compatible normal-map node, and embedding
   resources. Do not overwrite the source Blend.
8. Add unit coverage for ZIP resource selection, MTL/texture application,
   simplification attributes/bounds, and lower ice primitive triangle counts.
9. Add real browser coverage for a generated textured package, mesh-budget
   change, direct GLB preservation, supplied Night King GLB, clear/reset, and
   stable x2 output.
10. Update the product spec and worklog with the Sketchfab comparison, chosen
    GLB/ZIP workflow, state/output mapping, measured performance, blockers, and
    remaining risks. Run the Tier 4 verification note exactly as recorded.

