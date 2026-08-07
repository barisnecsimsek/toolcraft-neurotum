# Performance

Read this module before changing renderer technique, animation, canvas, media, export, render scale, workload controls, or performance tests.

## Normative Sequence

Use this order for every product:

1. Reachable controls and inputs.
2. Workload dimensions and enforced boundaries.
3. Pass cost, frequency, lifecycle, and invalidation.
4. Render-plan assessment and, only when required, a protected kernel benchmark decision.
5. Derived paths and combined fixtures.
6. Targeted development checks.
7. First stable full checkpoint.

Do not begin renderer implementation before steps 1-4 are represented in typed configuration and the render-plan assessment has no unresolved errors or benchmarks.

## Envelope

- Inventory every reachable schema control, runtime-state input, and external input.
- Mark workload controls explicitly with `performanceRole: "workload"`; never infer workload from labels, target names, units, option text, or keywords.
- Map every workload role to exactly one numeric `workloadEnvelope` dimension.
- Each dimension declares a stable id, unit, source, mapping, `defaultValue`, and every applicable `interactiveMax` or `batchMax`.
- `interactiveMax` and `batchMax` mean maximum workload for that profile, not the numerically largest value. A numeric `schema-target` source declares `workloadBoundary: "minimum" | "maximum"`; every declared profile boundary equals that selected schema endpoint. A lower endpoint is valid when smaller values create more work.
- Declare only boundaries consumed by passes of that profile. A control may change a batch-only dimension without claiming an `interactiveMax` when interactive passes do not consume it.
- Schema-backed limits equal schema limits. Other limits equal enforced runtime or input boundaries.
- Slider and range controls use their effective numeric domain. Any other schema control is numeric only when it declares a complete finite `min`, `max`, and numeric `defaultValue`; partial, inverted, or out-of-range domains fail validation instead of being guessed from the control type.
- The neutral starter declares `workloadEnvelope: { dimensions: [] }` and omits `fixtureAdapters`.

## Render Plan

Custom renderers declare `rendererPipeline.runtimeId`, passes, and exact interaction invalidation before renderer code. Every pass declares:

- workload dimensions and cost relationship;
- execution frequency;
- lifecycle and resource scope;
- execution location and output quality;
- concrete inputs, invalidators, and cache keys where applicable.

Include `initial-render` and every reachable interaction that executes or intentionally avoids renderer work. Run `assessToolcraftRenderPlan`. If it returns a benchmark requirement, declare the selected candidates in `kernelBenchmarkDecisions`, implement only their executable harnesses in `e2e/app-kernel-benchmarks.ts`, and run protected `pnpm verify:kernel`. The protected runner measures the exact workload, verifies equal deterministic full-quality output, and records a current-source receipt; authored timing values are invalid. High-frequency variable-cost pixel-transform, rasterize, and composite passes always compare a Canvas 2D baseline with WebGL, independent of the already-selected execution location; WebGPU joins the comparison only when it is the selected implementation.

## Compiled Fixtures And Paths

- Derive paths with `deriveToolcraftPerformancePaths`; never author path ids by hand.
- Declare exactly one scenario for each canonical path. The scenario uses that path's `pathId` and exact `coversTargets`; do not create one scenario per equivalent control.
- Equivalent controls share a path when interaction, invalidated passes, execution locations, workload dimensions, and profile are equal.
- Register one `fixtureAdapters.dimensions` adapter per envelope dimension. Each adapter only applies and observes exact numeric values; envelope boundaries and central path profiles remain the sole sources of load and budget policy.
- Finite inputs use an `exhaustive-discrete` entries domain that binds each numeric workload value to the product value actually applied. Schema `select` and `segmented` domains match all schema options one-to-one; other finite sources carry exhaustive provenance aligned with the dimension source.
- A development checkpoint moves from each `defaultValue` toward its declared maximum-workload boundary, including numerically downward ranges. It is available only when the combined vector has exact normalized development pressure `0.8` within the runtime tolerance. For discrete dimensions every value must also belong to the exhaustive domain; otherwise development is unavailable. Maximum remains independently available and execution observes every applied value exactly. Inverse checkpoints use the same domain.
- Discrete path search is deterministic and lazy. The runtime-owned `toolcraftDiscreteDimensionBudget` is 256 searched dimensions and `toolcraftDiscreteCombinationBudget` is 4096 combinations. Dimension overflow, cardinality overflow, or a path above either budget is an actionable planning error, not an unavailable exact vector. A valid exact inverse checkpoint for a custom or benchmark development path bypasses search budgets because no search runs, while its full vector still requires exhaustive-domain membership and exact normalized pressure `0.8` within tolerance.
- Compile development and maximum vectors with `compileToolcraftPerformanceFixturePlan`.
- Combined fixtures include every dimension on the path.
- Add measured inverse full-vector evidence only when a dimension mapping is `custom` or a pass relationship is `benchmark`.
- Performance profile names and budgets come from the runtime-owned profile manifest shared by runtime validation and generated runners. Product scenarios and copied scripts do not redefine those thresholds.

Browser checks apply compiled values through the real UI, observe every dimension, exercise the real preview or export path, assert the product result, and then check the budget. Export scenarios keep exact `actionValue`, visible `controlLabel`, and `completionEvidence` proof.

## Verification Triggers

This frozen compatibility snapshot predates canonical version-2 verification ownership. It retains source-bound validation for existing checkpoints and legacy baseline-linked receipts, but it exposes no targeted iteration runner or writer. Regenerate from the current starter before later product work instead of adding a local impact inventory.

Run targeted functional and browser checks during development. Add the exact affected path performance checks only when an edit changes that path's pipeline, workload boundary, adapter, interaction, or measured output. The targeted Playwright reporter binds passed test names, pass ids, canonical path ids, nonce, and current source hash; product code and prose cannot mint that evidence. Do not run the full performance suite merely because a renderer, canvas, export, timeline, layer, filename, verification tier, or performance-sensitive control changed.

Current generated apps use compiled development fixtures for targeted iterations. This frozen snapshot preserves the compiled fixture history but exposes no current targeted runner.

Run a full performance checkpoint only:

- once, after functional and targeted checks pass, when the app first becomes a stable working product and has no protected baseline yet;
- when the user explicitly requests performance optimization or reports lag, jank, animation, drag, pan, or zoom problems.

The first stable version runs protected Playwright `npm run verify:perf` before `npm run verify:final`. That lifecycle event is recorded once; later feature work does not become "first stable" again. This frozen compatibility snapshot has no current targeted-iteration writer. Regenerate from the current starter before later work; agent-controlled browser checks remain limited to diagnosis and targeted visual investigation and cannot mint receipts.

`TOOLCRAFT_PERFORMANCE_VERIFICATION_LIFECYCLE` is runtime-owned: agent-browser has no durable evidence authority, while protected Playwright owns first-stable, explicit-refresh, and ordinary-iteration commands. Product config cannot override this lifecycle.

## Render Scale And Quality

Render Scale preserves selected backing resolution and visible quality. Do not pass budgets by silently reducing selected quality, backing resolution, product range, source fidelity, export fidelity, or live interaction semantics. Diagnose pass cost, invalidation, cache lifetime, scheduling, and execution location first.

## Slider Responsiveness

Slider Responsiveness means the real product response remains live through the gesture. Model the slider's reachable interaction and invalidated passes, then measure its derived path; a label, target name, or control kind never classifies workload by itself.

Source lifecycle guards remain mandatory: resources are created outside React render, retained according to the declared lifecycle, reused across unrelated interactions, and released during cleanup. Animation frames are cancelled during cleanup, and timeline-only updates do not recreate source-bound resources.

## Non-Normative Examples

These examples illustrate the model; they do not define product categories or minimum fixture sizes:

- An export selector can adapt an option value to a numeric output-width dimension.
- A collection editor can adapt runtime items to a numeric item-count dimension.
- A source importer can expose numeric source dimensions as external-input dimensions.

Choose dimensions from the real product cost model and enforced boundaries, not from these examples.
