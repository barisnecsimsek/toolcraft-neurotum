# Post-Release Settle Slider Design

## Goal

Add a Brush slider that lets the user make post-release settling stop sooner or continue longer without changing in-stroke wet feedback, render scale, or fluid shader quality.

## Control Section Inventory

- Product need: adjust how long ink keeps running the full solver after pointer release before freezing.
- Value model: numeric duration multiplier, percentage scale around the current reference-like default.
- Candidate built-ins checked: `slider`, `rangeSlider`, `select`.
- Best built-in: `slider`, because this is one continuous numeric amount.
- Rejected alternatives: `rangeSlider` because there is no lower/upper interval; `select` because short/normal/long would be less precise than the requested longer/shorter regulation.
- Target: `brush.settle`.
- Required acceptance: dragging the slider changes visible post-release settle duration and remains responsive at the heaviest value.

## Behavior

The new slider label is `Settle`. It lives in the existing `Brush` section after `Wetness` and before `Flow`. Range is `0%` to `200%`, default `100%`, step `5%`. `100%` keeps the current `320ms + wetness * 520ms` post-release full-solver window. `0%` makes the painting freeze immediately after the final release splat is applied. `200%` doubles the post-release full-solver window for slower drying.

`Wetness` continues to control immediate held-stroke spread and the base wetness contribution. `Settle` controls only how long the post-release full solver runs before `freezeSettledInk()` clears velocity and pressure.

## Verification

Verification tier: Tier 3
Reason: A new visible schema control changes WebGL post-release workload duration and requires product-output and performance coverage.
Run: direct AI/docs/integrity/script checks, TypeScript, Vitest, Vite build, focused browser proof that low Settle freezes sooner than high Settle, and targeted heavy pointer-up performance at `Settle=200%`.
Skip: full `pnpm verify:perf` during this loop if `pnpm exec` still fails on ignored `esbuild@0.28.1`; use direct binaries and targeted browser measurements.
