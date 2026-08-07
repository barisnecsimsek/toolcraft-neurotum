# Brick Chaos Control

## Product behavior

Add a persistent `Chaos` slider to `Brick Grid`. At `0%`, the source-to-brick mapping is unchanged. Raising the slider deterministically increases both the share of bricks exchanged and the maximum local exchange radius. The radius grows nonlinearly so the lower range stays local, while at `100%` nearly every brick participates and the radius spans most of the grid, making the source image difficult to recognize while preserving one brick per grid cell.

The startup and reset default is `25%`, so a fresh mosaic begins with visible but still recognizable local disorder. Users can move the slider to `0%` for the exact source mapping.

The permutation is deterministic for a given grid and Chaos value. It must not flicker between renders, duplicate source bricks, or omit bricks. Preview and image export use the same persistent Chaos mapping. The existing held-Scale shuffle remains transient and composes on top of the persistent mapping.

## Control Section Inventory

- Source Image: unchanged media import and clear flow.
- Brick Grid: Detail and Scale define grid density; new Chaos controls persistent source-cell permutation; Gap, Corners, and Bevel remain unchanged.
- Studs, Tone, Lighting, Background, and Image Export: unchanged and consume the chaos-rendered product normally.

## Runtime decisions

- Control: built-in continuous slider, `brick.chaos`, `0..100`, step `1`, default `0`, unit `%`.
- Renderer: existing Canvas 2D renderer with a cached deterministic permutation keyed by columns, rows, and Chaos value.
- State: schema-backed product value; included automatically in localStorage persistence and Settings Transfer.
- Timeline and layers: unchanged and absent.
- Export: unchanged helper path; `getBrickMosaicSettings` carries Chaos into the shared preview/export renderer.
- Transient Scale shuffle: unchanged and composed before persistent Chaos lookup.

## Verification tier

Verification tier: Tier 3
Reason: A new schema control changes persistent Canvas 2D output and export mapping.
Run: `pnpm ai:check`, `pnpm verify:quick`, focused browser acceptance for `0% -> 100% -> 0%`, focused `brick-chaos-drag`, and real browser visual verification.
Skip: Full performance/final gates are not required for an incremental feature loop without a performance complaint, dependency change, or runtime/template change.
