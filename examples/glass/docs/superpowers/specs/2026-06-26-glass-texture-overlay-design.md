# Glass Texture Overlay Design

## Request

Add a texture overlay on top of the glass, let the user choose blend mode and opacity, and constrain the texture to the glass area only.

## Product Behavior

The texture is a glass-surface material, not an editor overlay. It appears only inside the resolved glass shape and participates in preview and export through the same WebGL render path.

Control Section Inventory:

- Source: choose procedural or uploaded backdrop pixels.
- Source Texture: tune the backdrop scale and color.
- Glass Shape and Center: size, radius, shape, and position the lens.
- Glass Blend: set base lens opacity.
- Glass Texture: choose no texture, generated texture, or uploaded texture; choose the generated pattern; choose blend mode; tune texture opacity.
- Refraction, Edge, Surface, Highlights: existing optical shader controls.
- Background, Image Export, Export: existing Toolcraft output controls.

## Renderer Technique

Renderer remains mixed Canvas 2D plus WebGL:

- Canvas 2D prepares and caches a fixed overlay texture frame for generated and uploaded texture sources.
- WebGL samples the overlay texture in the lens composite shader after refraction, frost, brightness, and murkiness.
- The shader applies blend modes in lens UV space and mixes by texture alpha and user opacity.
- Shape clipping uses the existing SDF coverage/discard path, so texture pixels cannot render outside the glass area.

## State

New runtime state:

- `texture.mode`: `off`, `preset`, or `image`.
- `texture.preset`: generated pattern, used when mode is `preset`.
- `texture.upload`: Toolcraft image fileDrop, used when mode is `image`.
- `texture.blendMode`: shader blend mode.
- `texture.opacity`: blend alpha multiplier.

Defaults keep the current visual unchanged: texture is off by default.

## Verification

Verification tier: Tier 3

Reason: This touches schema controls, media import, WebGL shader compositing, export bytes, renderer cache invalidation, and performance-sensitive preview paths.

Run:

- `pnpm verify:quick`
- targeted browser acceptance for glass texture controls and texture upload/clear/reset/export
- targeted browser performance for texture mode, preset, blend, opacity, and media import

Skip:

- Full final gate unless quick or targeted checks expose a broader regression.
- Full performance suite unless targeted texture scenarios reveal instability.
