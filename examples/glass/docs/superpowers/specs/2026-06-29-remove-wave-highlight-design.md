# Remove Wave Highlight Design

Verification tier: Tier 3
Reason: Removes a schema section, renderer uniforms, autonomous preview loop, acceptance rows, and performance scenarios for a custom WebGL feature.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted browser acceptance for highlight/refraction output, and targeted browser performance for remaining shader sliders.
Skip: Full `pnpm verify:perf` is not required because this is a feature removal, not a fresh app or explicit performance complaint.

## Goal

Remove the wave highlight effect that was added after the reference image request. The product should keep the original liquid-glass shader, texture overlay, text overlay, shadow, refraction, surface, highlight, background, and PNG export flows.

## Control Section Inventory

- `Source`: source upload.
- `Source Texture`: source scale and saturation.
- `Glass Shape`: shape, dimensions, and radius.
- `Center`: glass position.
- `Glass Blend`: lens opacity.
- `Glass Shadow`: shadow include, offset, color, and blur.
- `Glass Text`: text include, drag target, blend, alignment, offset, content, and style.
- `Glass Texture`: texture mode, upload, blend, and opacity.
- `Refraction`: strength, depth, curvature, fisheye, aberration, and splay.
- `Edge`: bend and edge width.
- `Surface`: frost, brightness, and murkiness.
- `Highlights`: specular, sheen, sheen thickness, sheen angle, glow, and glow spread.
- `Background`: preview/export background include and color.
- `Image Export`: image format and resolution.

`Wave Highlight` is removed entirely and no `glass.wave.*` targets remain in the active product.

## Renderer

Remove wave uniforms and GLSL math from the `lens-composite` shader. Remove the preview rAF loop that only existed to animate wave drift. Keep the regular state-render scheduler and WebGL cache behavior for all remaining sliders.

## State Flow

Remove `LiquidGlassWaveSettings`, `glass.wave` defaults, and `glass.wave.*` value normalization. `getLiquidGlassLensDescriptor` no longer receives or computes wave fields; export remains deterministic because there is no time-based product branch left.

## Acceptance And Performance

Delete wave acceptance rows, browser acceptance test, app schema assertions, performance scenarios, browser performance tests, and browser budget overrides. Remaining highlight/refraction/surface controls continue to prove product output and performance.

## Risks

Old settings JSON files may contain `glass.wave.*` values. Toolcraft settings import already ignores schema targets that no longer exist; persistence may carry extra values, but with no schema control or renderer consumer they have no product effect.
