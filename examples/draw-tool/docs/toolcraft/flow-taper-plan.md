# Flow Taper Plan

Verification tier: Tier 3
Reason: Adds one Brush schema control and changes the WebGL fluid renderer's post-release motion path.
Run: direct Toolcraft checks, TypeScript, Vitest, Vite build, targeted browser acceptance for the new Taper control, and targeted release performance at the max Taper workload.
Skip: full `pnpm verify:perf`; this is a local post-release renderer feature loop, so only the touched release workload needs perf coverage.

## Product Behavior

Released strokes should not stop with a hard velocity cutoff. After the normal full-solver settle window, the flow enters a smooth taper window where velocity decays with an ease-out curve before the engine freezes the dry pigment.

## Control Section Inventory

- `Ink`: next-stroke ink source: `ink.mode`, `ink.palette`.
- `Brush`: direct painting and water behavior: `brush.size`, `brush.load`, `brush.wetness`, `brush.settle`, `brush.taper`, `brush.flow`.
- `Flow`: idle/reference flow and local clear action: `flow.auto`, `flow.clearSignal`.
- `Background`: preview/export product paper: `export.includeBackground`, `appearance.background`.
- `Image Export`: PNG/JPG delivery settings: `export.image.format`, `export.image.resolution`.
- `Video Export`: animated delivery settings: `export.video.format`, `export.video.resolution`.

## Implementation Plan

1. Add built-in slider `brush.taper`, label `Taper`, default `100%`, range `0-200%`, after `brush.settle`.
2. Read `brush.taper` into `SuminagashiFluidSettings`.
3. Replace the single `dryingUntil` cutoff with a scheduled settle window plus taper window.
4. Apply time-based velocity damping during the taper window, then freeze after the velocity has been eased down.
5. Add acceptance and performance metadata/tests for `brush.taper`.
6. Update `docs/toolcraft/agent-worklog.md` with decisions, evidence, verification, and risks.
