# Text Blend Modes Design

## Request

User reports that Glass Text blend modes do not work.

## Required Preflight

- `docs/toolcraft/workflow.md`
- `docs/toolcraft/schema-reference.md`
- `docs/toolcraft/component-rules.md`
- `docs/toolcraft/acceptance-testing.md`
- `docs/toolcraft/performance.md`
- `docs/toolcraft/renderer-technique.md`
- `docs/toolcraft/decision-contract.md`
- Required skills: brainstorming, systematic-debugging, writing-plans.

## Verification Tier

Verification tier: Tier 3
Reason: The touched surface is WebGL/text compositing behavior plus browser acceptance for a renderer-backed control.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted browser text acceptance, and targeted text blend performance.
Skip: Full `pnpm verify:perf` unless the targeted text blend scenario fails; this is a focused post-generation renderer/control fix.

## Diagnosis

The `text.blendMode` value reaches `LiquidGlassLensDescriptor.textBlendMode` and the shader uniform `u_text_blend`. A browser probe showed all five modes produce distinct pixels when text color is non-white, but default white text makes `Screen` degenerate to the same output as `Normal`, which makes the UI feel like the mode is not responding. Existing acceptance covered only one transition and could not prove each mode.

The text FontPicker acceptance also depended on `Roboto` changing canvas pixels immediately. Canvas 2D may draw fallback glyphs before the web font is ready, so that assertion is not a stable proof of text blend behavior.

## Product Behavior

- Keep the Toolcraft Glass Text flow unchanged.
- Keep text blend modes as shader-backed compositing inside the glass SDF, clipped to the lens.
- Make browser acceptance exercise all blend modes with a non-white text color so every mode has a meaningful observable.
- Use a lightly tinted default text color so the default Glass Text blend scenario is not degenerate while preserving the white-glass look.
- Re-render the cached text frame after the selected web font is ready so FontPicker changes are visible in the product canvas.
- Preserve render scale and WebGL quality.

## Control Section Inventory

Product need: Change how glass-clipped text composites over refracted lens pixels.
Value model: finite mode selection.
Candidate built-ins checked: `select`, `segmented`.
Best built-in: `select`, already used for five modes and compatible with compact panel density.
Rejected alternatives: `segmented` exceeds the four-option guidance; custom control would duplicate built-in select behavior.
Target: `text.blendMode`.
Required acceptance: Every visible blend option changes rendered product pixels in a non-degenerate text fixture.

## Renderer Pipeline Impact

No new renderer pass is needed. `text.blendMode` remains a lens-composite uniform and must not invalidate `source-frame`, `displacement-map`, `frost-prepass`, `texture-frame`, or `text-frame`.

The renderer may explicitly invalidate the cached `text-frame` after the selected font face finishes loading. This does not change blend-mode cost; it only replaces fallback glyph pixels with the requested family.

## Risks

- Some blend/color combinations are mathematically identical or very close, for example white `Screen` and white `Normal`. Acceptance avoids the degenerate fixture while the UI keeps true blend-mode semantics.
