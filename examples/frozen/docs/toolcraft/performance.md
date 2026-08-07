# Toolcraft Performance Contract

Use this document while authoring `src/app/app-performance.ts`, performance acceptance, and browser evidence. Read `core/performance.md` first.

## Producer Order

The only normative sequence is:

```text
reachable controls and inputs
-> workload dimensions and enforced boundaries
-> pass cost, frequency, lifecycle, and invalidation
-> render-plan assessment and protected benchmark decision when required
-> derived paths and combined fixtures
-> targeted development checks
-> first stable full checkpoint
```

Do not substitute content-type thresholds, key-name matching, or hand-authored stress values for this sequence.

## 1. Reachability

Inventory every input that a user or runtime path can reach:

- visible schema controls and all conditional branches;
- runtime-owned state read by product output;
- imported or otherwise external source inputs;
- derived magnitudes used by renderer cost.

Every visible non-action control declares `performanceRole: "workload"` or `performanceRole: "responsiveness"`. Workload classification is explicit product modeling. Labels, ids, target strings, units, control types, and option text are not classification evidence.

## 2. Workload Envelope

Author numeric dimensions for workload magnitude, not one dimension per control. A dimension declares:

- `id`: stable product-owned identifier;
- `unit`: the numeric quantity represented;
- `source`: `schema-target`, `runtime-state`, `external-input`, or `derived`;
- `mapping`: `direct`, `area`, `quadratic`, or `custom`;
- `defaultValue`;
- `interactiveMax` when interactive/frame work reaches the dimension;
- `batchMax` when batch/import/export work reaches the dimension.

These fields name maximum-workload boundaries, not numerical maxima. For a numeric `schema-target`, set `source.workloadBoundary` to `"minimum"` or `"maximum"` and make every declared profile boundary equal that schema endpoint. This supports both count-like controls whose cost rises toward `max` and inverse controls whose cost rises toward `min`. Runtime-state and external-input dimensions declare the actual maximum-workload value directly, even when it is numerically below `defaultValue`.

Declare only the profiles consumed by renderer passes. A schema control can change a batch-only dimension and retain targeted control-change coverage without claiming an interactive workload maximum; numeric batch-only dimensions are not required to manufacture `interactiveMax`.

Each explicit workload control maps to exactly one schema-backed dimension. The dimension boundary equals the value the schema or product runtime actually enforces. A scenario or browser test cannot lower that boundary. Interactive boundaries are fully guaranteed.

Numeric capability is structural. Sliders and range sliders use their effective numeric bounds. Any other control participates as a numeric schema source only when it declares finite `min`, `max`, and numeric `defaultValue`; a partial domain, inverted bounds, or a default outside the bounds is invalid. Control names and kinds do not manufacture numeric limits.

The empty starter uses:

```ts
workloadEnvelope: { dimensions: [] }
```

It omits `fixtureAdapters` because there are no dimensions to apply.

## 3. Render Pipeline

Custom renderers declare a stable `rendererPipeline.runtimeId`. Every pass declares `cost` and `lifecycle` in addition to its existing inputs, invalidators, cache key, kind, output, quality, and execution location.

`cost` names the dimensions that affect a pass, their relationship, and execution frequency. `lifecycle` says whether resources are uncached, memoized, or retained and whether their scope is a call, interaction, renderer, or source. A constant-cost pass uses an empty dimension list. A workload dimension appears only on passes whose cost changes with that magnitude.

`interactionInvalidation` includes `initial-render` and every exact reachable interaction. Targets that produce the same invalidation path remain together. High-frequency viewport or playback paths declare work they must not invalidate when that work is retained upstream.

## 4. Assessment And Benchmarks

Call `assessToolcraftRenderPlan(appSchema, model)` before implementing renderer code. Resolve all errors first.

When assessment returns a kernel benchmark requirement, add one `kernelBenchmarkDecisions` entry for the pass and implement the named executable candidates in `e2e/app-kernel-benchmarks.ts`. Run `pnpm verify:kernel`; its protected Playwright runner owns timing, verifies equal deterministic output at the exact required workload, and writes a source-bound receipt. `app-performance.ts`, the harness, tests, and worklog must not contain authored timing evidence. High-frequency variable-cost `pixel-transform`, `rasterize`, and `composite` passes compare Canvas 2D and WebGL even when the proposed pass already declares GPU execution; WebGPU is added only when selected. Do not add a decision or harness when assessment does not require one.

Renderer source guards remain mandatory. Typed assessment does not permit resources to be created in React render, source-bound resources to be rebuilt by unrelated state, or scheduled animation work to escape cleanup.

## 5. Canonical Paths

Call `deriveToolcraftPerformancePaths(appSchema, model)` after the pipeline is declared. Path ids are deterministic products of profile, interaction, invalidated passes, execution locations, and workload dimensions. Target membership is exact scenario coverage but does not churn the id when another equivalent control joins the path.

Declare exactly one scenario for every derived path. Each scenario declares:

- `pathId` from the derived path;
- `coversTargets` exactly equal to that path's targets;
- a browser test and automated test;
- a real browser adapter while the budget comes from the path's centrally derived profile;
- a real expected product observable.

Do not use an umbrella viewport scenario when a concrete viewport path exists. Export remains a batch path and retains download or clipboard completion proof.

Scenario interaction is the canonical pipeline interaction from its derived path, such as `control-drag`, `viewport-drag`, `viewport-zoom`, `initial-render`, or `export`. Do not introduce scenario-only aliases or umbrella interaction names.

This frozen compatibility snapshot predates canonical version-2 verification ownership. Existing checkpoint and legacy baseline-linked receipt validation remains source-bound, but no local inventory authorizes post-baseline targeted scope.

## 6. Fixture Adapters And Plans

`fixtureAdapters.dimensions` contains exactly one adapter per workload dimension. An adapter:

- owns the same `dimensionId` as its registry key;
- converts a compiled numeric value into the product value used by the UI;
- observes that product value back into the same number;
- applies and observes every compiled checkpoint exactly;
- uses an `exhaustive-discrete` entries domain when the product input is finite, binding each numeric workload value to the value actually applied to the product.

For schema `select` and `segmented` controls, the discrete domain matches every option one-to-one: omissions, extras, duplicate product values, and duplicate numeric values are invalid. Finite runtime-state, external-input, and derived domains carry exhaustive provenance aligned with the dimension source. Continuous adapters do not need a discrete domain.

The compiler moves every continuous dimension from `defaultValue` toward its declared maximum-workload boundary, including numerically downward ranges. It accepts a development vector only when the combined normalized pressure is exactly `0.8` within the runtime tolerance. Discrete values must additionally be present in their exhaustive domain. If no reachable vector meets those invariants, development is unavailable; the maximum checkpoint remains independently available. Execution applies and observes available checkpoints exactly, never an interpolated or rounded discrete value. Measured inverse vectors for custom mappings or benchmark relationships must pass the same domain check before execution.

Discrete combination search is deterministic and lazy. The runtime-owned `toolcraftDiscreteDimensionBudget` allows at most 256 dimensions in a searched path, and `toolcraftDiscreteCombinationBudget` allows at most 4096 path-level combinations. Dimension count and cardinality are checked before search; overflow or a path above either budget is an actionable planning error distinct from an exhaustive domain that simply has no exact development vector. A valid exact inverse checkpoint for a custom or benchmark development path bypasses these search budgets because no combination search runs; its full vector must still belong to the exhaustive domains and produce exact normalized pressure `0.8` within tolerance.

Compile each workload-bearing path with `compileToolcraftPerformanceFixturePlan`. This frozen snapshot preserves its compiled development and maximum fixtures as historical proof; regenerate before running a new targeted iteration.

Performance profiles are loaded from the runtime-owned shared profile manifest. Runtime validation, starter scripts, and generated standalone runners consume that same versioned manifest; product scenarios cannot copy or override budgets.

Generic direct, area, quadratic, and product cost models derive a development vector without authored full-vector evidence. `fixtureAdapters.inverseCheckpoints` are present only when a custom mapping or benchmark relationship makes generic inversion impossible; each required pass receives one measured checkpoint for the same complete vector.

## 7. Browser Evidence

Browser tests execute compiled values, apply adapter results through the real UI, and re-observe every dimension before measurement. The action then exercises the derived path and asserts its product-level result.

Mutating measurements prove a stable baseline, record the first persistent changed response, and keep the immutable result bound to the same `pathId` as its centrally derived budget. Autonomous output uses a deterministic semantic expectation. Non-mutating batch work ends only after real completion.

`export` scenarios declare exact `actionValue`, visible `controlLabel`, and `completionEvidence`. They may declare a `completionDeadlineMs` only when the product needs a stricter deadline than the central batch profile; scenarios do not author responsiveness budgets. The protected helper owns the click and completion event. Export evidence still inspects the delivered artifact and verifies that it is non-empty and matches selected output semantics.

## 8. Development And Checkpoints

Do not perform later product implementation directly in this frozen snapshot. Regenerate from the current starter so the canonical graph, catalog, and version-2 ownership inventory can derive targeted scope; a local replacement or product-authored JSON is not evidence.

Run exact `browser perf:` paths only when the edit changes their pipeline, boundary, adapter, interaction, or output. Record why unrelated paths and the full suite were not run.

This frozen legacy snapshot preserves compiled development fixtures only as historical receipt context and does not support current targeted verification ownership. Regenerate a fresh app from the current starter/CLI before any later delivery or performance iteration. The protected first-stable checkpoint and explicit refresh still select compiled maximum fixtures.

Run the protected Playwright full checkpoint at the first stable working product version without a protected baseline. This frozen compatibility snapshot retains that historical checkpoint and its receipt validation but exposes no current targeted-iteration path. Regenerate from the current starter before later product or performance work.

`TOOLCRAFT_PERFORMANCE_VERIFICATION_LIFECYCLE` owns this split centrally: agent-browser is limited to diagnosis and targeted visual investigation, while protected Playwright owns first-stable, explicit refresh, and ordinary iteration receipts. Product config cannot override it.

Agent-browser observations help diagnosis and visual verification, but they do not mint the durable baseline. Worklog prose is context, not execution proof.

## Performance Quality

Preserve selected output quality, preview fidelity, backing resolution, source fidelity, product boundaries, and live interaction behavior. When a budget fails, inspect assessed pass cost, invalidation, resource lifecycle, scheduling, cancellation, and execution location before changing product scope.

## Non-Normative Domain Examples

The following examples are illustrative only and establish no universal fixture minimum, product category, or naming rule:

- An image export app may use output width as a schema-backed dimension and treat export as quadratic batch work.
- A list compositor may use item count from runtime state and combine it with a second independently enforced magnitude.
- A source-driven renderer may model source width and height separately or derive area when that matches measured cost.

Use the smallest set of numeric dimensions that explains the real renderer workload.
