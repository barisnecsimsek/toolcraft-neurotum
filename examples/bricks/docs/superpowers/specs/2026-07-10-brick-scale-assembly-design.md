# Brick Scale Assembly Interaction

## Product behavior

Dragging the existing `Scale` slider temporarily shuffles preview bricks between grid cells. Every brick remains grid-aligned, keeps its normal size and rotation, and swaps with one neighboring brick within a four-cell radius. The shuffle is a true permutation, so no source brick is duplicated or dropped. Releasing or cancelling the pointer immediately restores the final image with no assembly animation.

The effect is preview-only. Runtime state continues to store only `brick.scale`, persisted settings remain unchanged, and PNG export always renders the fully assembled mosaic.

## Control Section Inventory

- Source Image: unchanged media import and clear flow.
- Brick Grid: the existing `Scale` slider gains the transient local-shuffle/assemble interaction; Detail, Gap, Corners, and Bevel remain unchanged.
- Studs, Tone, Lighting, Background, and Image Export: unchanged.

## Runtime decisions

- Renderer: keep the existing Canvas 2D renderer and cached source/relief tiles; use a cached deterministic local permutation while interaction is active.
- State: keep only the transient held/shuffling state in the app renderer; do not add schema values or route-local product settings.
- Timeline: none. This is a short control feedback animation, not product playback.
- Layers: none. The mosaic remains one product output.
- Persistence and settings transfer: unchanged because the transient arrangement is not a user setting.
- Export: unchanged and always assembled.
- Motion: no release animation; the final image replaces the shuffled preview immediately.

## Verification tier

Verification tier: Tier 3
Reason: The change adds a transient Canvas 2D animation to the high-frequency `brick.scale` renderer path.
Run: `pnpm verify:quick`; targeted browser acceptance for Scale local shuffle/release; targeted `brick-scale-drag` performance scenario; local browser verification.
Skip: Full `pnpm verify:perf` and `pnpm verify:final` are not required for this post-delivery feature loop because the user did not report a performance regression and runtime/export architecture is unchanged.
