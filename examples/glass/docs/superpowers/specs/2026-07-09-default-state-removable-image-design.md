# Liquid Glass Default State And Removable Media Spec

## Request

Make the current Liquid Glass setup the application default. Keep the default source image, default glass, texture, text, shadow, and shader settings, but place the glass button/lens at the exact horizontal and vertical center of the canvas. The default image must be removable from the file control and the canvas.

## Product Behavior

- First load seeds the built-in geological source image and scratch texture as real Toolcraft media assets so the file controls show asset previews.
- The glass lens defaults to the center of the canvas: `glass.center` schema value `{ x: 0, y: 0 }`, normalized renderer value `{ x: 0.5, y: 0.5 }`.
- Manual `Remove image` on Source removes the source image preview and leaves the canvas without a source image until the user uploads a new image or resets the app/section.
- Manual `Remove image` on Glass Texture removes the default/custom texture preview and leaves the texture overlay empty until upload or reset.
- Source section reset, Glass Texture section reset, and global Reset controls restore the built-in default media assets because those assets are part of the app default setup.
- The renderer must not keep a hidden built-in source fallback after Source media is removed. Product output follows the actual runtime media assets.

## State Mapping

- Schema defaults remain the source of truth for settings, reset, persistence, and settings transfer.
- `LiquidGlassDefaultMediaSync` may seed missing default media only when the target was not manually deleted, or when reset clears the deletion suppression.
- `findLiquidGlassSourceAsset` returns only an actual `source.upload` image asset or `null`.
- Persistence key/version bumps to prevent old browser state from masking the centered default.

## Verification

Verification tier: Tier 3
Reason: Schema defaults, media lifecycle, renderer source lookup, and browser-visible canvas behavior change.
Run: `pnpm verify:quick`; targeted browser acceptance for source/texture clear-reset and shape/center behavior; targeted performance for source/texture media import and glass-center responsiveness.
Skip: Full `pnpm verify:perf`, because this is a focused default/media lifecycle change with targeted workload coverage.
