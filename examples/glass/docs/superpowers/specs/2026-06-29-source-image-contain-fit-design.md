# Source Image Contain Fit Design

Verification tier: Tier 3
Reason: Removes a visible schema slider, changes uploaded source image canvas fitting, and updates acceptance/performance coverage for a custom WebGL renderer.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted browser acceptance for source upload/saturation, and targeted browser performance for source saturation/media import.
Skip: Full `pnpm verify:perf` is not required because this is a focused feature removal/fitting bug fix, not a fresh app version or explicit performance complaint.

## Goal

Uploaded source/background images must fit inside the output canvas without being cropped. The Source Texture `Scale` slider is removed entirely.

## Root Cause

The uploaded source image path uses cover fitting:

```ts
Math.max(width / imageWidth, height / imageHeight) * source.scale
```

Cover fitting fills the whole canvas and crops whenever the uploaded image aspect ratio differs from the output aspect ratio. The `Scale` slider can make this worse and is not needed for the requested flow.

## Control Section Inventory

- `Source`: `source.upload` for the custom image upload.
- `Source Texture`: `source.saturation` for source color treatment.
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

`source.scale` is removed from schema state, acceptance, performance, and renderer cache keys.

## Renderer

`drawUploadedImage` changes from cover to contain fitting with no user scale multiplier. The source frame still fills the configured product background first, then draws the uploaded image centered within the canvas. Letterboxing/pillarboxing uses the selected product background instead of cropping image content.

## State Flow

`LiquidGlassSettings["source"]` keeps `saturation` and removes `scale`. `getLiquidGlassSettings` no longer normalizes `source.scale`. The source-frame cache key no longer includes scale, and the live preview scheduler no longer has a source-scale branch.

## Acceptance And Performance

The source upload browser test proves upload still changes product output and the Scale slider is no longer visible. The source saturation test remains. The source-scale acceptance row, performance scenario, and browser perf test are deleted. Source media import and saturation performance continue to cover the uploaded image workflow.

## Risks

Wide or tall uploaded images will show background bars instead of cropping. This is the intended outcome for “do not crop uploaded background image.”
