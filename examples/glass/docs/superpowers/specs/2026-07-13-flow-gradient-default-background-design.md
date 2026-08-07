# Flow Gradient Default Background Spec

## Request

Use `~/Desktop/flow-gradient-shader (1).png` as the default Liquid Glass source/background image and remove the previous default geological image.

## Product Behavior

- First load seeds the flow-gradient PNG as the visible Source fileDrop preview.
- The old geological default is no longer present in `public` and is no longer referenced by the app.
- User uploads still replace the default Source image.
- Manual Remove image still leaves Source empty until upload or reset.
- Source section reset and global Reset restore the new flow-gradient default source.
- Existing open sessions that still hold the old app-owned default source may be upgraded by `LiquidGlassDefaultMediaSync`; user-uploaded source media must not be overwritten.

## State Mapping

- `liquidGlassDefaultSourceAsset` points to `/liquid-glass-default-background.png`, with file name `flow-gradient-shader (1).png` and source image dimensions `4096x2560`.
- The source file remains runtime media for `source.upload`, not a schema control value.
- The WebGL renderer continues to read actual `source.upload` media through `findLiquidGlassSourceAsset`.

## Verification

Verification tier: Tier 3
Reason: Default source media changes product pixels, upload/reset lifecycle, and media import workload.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, targeted app tests, relevant source browser acceptance, targeted source media performance, and docs/worklog checks.
Skip: Full `pnpm verify:perf`, because this is a focused default media replacement with targeted media coverage.
