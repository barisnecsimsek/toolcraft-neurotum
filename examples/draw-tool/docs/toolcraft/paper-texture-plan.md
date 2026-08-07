# Paper Texture Plan

Verification tier: Tier 3
Reason: Adds visible paper texture controls and changes the WebGL display-composite shader output.
Run: direct Toolcraft checks, TypeScript, Vitest, Vite build, targeted browser pixel checks for texture controls, and a focused responsiveness probe.
Skip: full `pnpm verify:perf`; this is a local renderer/control feature loop, so targeted browser evidence covers the touched display path.

## Product Behavior

The default canvas stays flat beige with no texture, preserving the earlier product requirement. Users can turn on procedural paper texture and tune the visible paper surface without uploading assets.

## Control Section Inventory

- `Ink`: next-stroke ink source: `ink.mode`, `ink.palette`.
- `Brush`: direct painting and water behavior: `brush.size`, `brush.load`, `brush.wetness`, `brush.settle`, `brush.taper`, `brush.flow`.
- `Flow`: idle/reference flow and local clear action: `flow.auto`, `flow.clearSignal`.
- `Paper`: optional output paper texture: `paper.texture.enabled`, `paper.texture.grain`, `paper.texture.scale`, `paper.texture.fiber`, `paper.texture.mottle`.
- `Background`: required preview/export background row: `export.includeBackground`, `appearance.background`.
- `Image Export`: PNG/JPG delivery settings: `export.image.format`, `export.image.resolution`.
- `Video Export`: animated delivery settings: `export.video.format`, `export.video.resolution`.

## Implementation Plan

1. Add a `Paper` section before `Background` with built-in switch and sliders.
2. Keep `Background` directly before `Image Export`.
3. Read paper texture values into `SuminagashiFluidSettings`.
4. Extend the display shader with deterministic procedural grain, fiber streaks, and mottling uniforms.
5. Re-render display when paper texture settings change.
6. Update acceptance, performance metadata, schema tests, browser tests, and worklog.
