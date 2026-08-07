# Renderer Technique

> Reading route: start with `workflow.md`. Core generated-app rules live in `core/*`; this file is the focused renderer-selection reference.

Choose renderer technology from product output semantics, reference behavior, fidelity requirements, and the assessed render plan. Names, keywords, control types, source formats, and visual richness do not select a renderer.

## Normative Sequence

Use the same producer order for every custom renderer:

1. Inventory reachable controls, runtime-state inputs, and external inputs.
2. Model workload dimensions with schema or product-enforced boundaries.
3. Declare each candidate pass's cost, frequency, lifecycle, execution location, quality, cache keys, and exact interaction invalidation.
4. Run `assessToolcraftRenderPlan`; resolve errors and run protected `pnpm verify:kernel` only when the assessment requires candidate evidence.
5. Derive canonical paths and compile combined fixtures through their adapters.
6. Implement the selected renderer and run targeted checks for the paths being developed.
7. Run the first stable full checkpoint only at the verification lifecycle event defined by the performance contract.

Do not write renderer code before the envelope, `rendererTechnique`, pipeline, and assessment exist.

## Selection Principles

- Preserve the reference renderer in reference-runtime-clone mode unless a concrete blocker, replacement reason, and acceptance mapping are recorded.
- Keep semantic output in a representation that preserves its required fidelity, editing behavior, accessibility, and export meaning.
- Select execution location and renderer API from assessed pass cost and update frequency. Do not infer them from a product category or target name.
- Preview and export may use different renderers when `previewExportDifferenceReason` explains the boundary and tests prove equivalent product semantics.
- Prefer retained resources and stable cache keys. Source-bound resources live outside React render, survive unrelated interactions according to pass lifecycle, and release during cleanup.
- Separate layers when they have different semantics, invalidation, lifecycle, interaction, or export treatment. A costly layer does not force unrelated output into the same renderer.
- Preserve selected quality, product boundaries, backing resolution, and source fidelity. A renderer is not accepted by silently reducing them.

When assessment requires a benchmark, declare `kernelBenchmarkDecisions`, implement only the named executable candidates in `e2e/app-kernel-benchmarks.ts`, and let protected `pnpm verify:kernel` measure them at the exact combined workload vector. Candidate outputs must be deterministic and equal at full quality. Do not author timing values or add speculative benchmark metadata when generic assessment resolves the choice.

## Required Inventory

Custom renderer specs and `src/app/app-performance.ts` mirror:

- `sourceRepresentation`;
- `productRepresentation`;
- `previewRenderer`;
- `exportRenderer`;
- `rendererStrategy`;
- `whyNotAlternativeStrategies`;
- `fidelityRisks`;
- `performanceRisks`.

Workload pressure and renderer candidates are derived from envelope dimensions and assessed renderer-pass cost/lifecycle. Do not author a parallel coarse workload category or separate renderer-comparison metadata. `kernelBenchmarkDecisions` records product intent; only its protected current-source receipt is measurement evidence.

If output is intentionally rasterized, include `intentionalRasterizationReason`. If preview and export renderers differ, include `previewExportDifferenceReason`. If a reference runtime renderer changes, include `referenceRendererChangeReason`.

`rendererTechnique` records the selected technology. `rendererPipeline` records why and when its passes execute. Both must agree with the implementation.

## Layer Inventory

Declare each meaningful product, overlay, and export layer in `rendererTechnique.layers`. Give visible product and editing layers a stable `uiSelector` for browser proof. For every layer, record content semantics, renderer, primitive magnitude, and export mode.

Editing handles remain interaction overlays, stay out of exported product output, and write through runtime state. Tests verify visible layers and export inclusion independently.

## Three-Dimensional Model Interaction

When the product exposes 3D rotation, schema `orientationGizmo`, direct model drag, preview rendering, hit testing, reset/history, and export share one orientation pose target. The product renderer supplies geometry-aware `hitTest`; Toolcraft owns gesture scheduling and history through `useToolcraftModelOrbitInteraction`.

Pointer ownership is selected on pointer-down. A visible-model hit rotates; a miss is left untouched so `CanvasShell` pans. Target-scoped runtime ownership serializes gizmo drag, snap, and direct orbit, and cancels stale work on a newer gesture or external state write. Do not infer model geometry in runtime, keep a second local camera/Euler state, or let orientation invalidate passes that do not consume the pose. Measure the orientation target's canonical live interaction path at the declared workload without reducing preview quality.

Layer boundaries follow semantics and invalidation, not a fixed list of product domains. Their workload proof comes from derived paths and combined fixtures.
