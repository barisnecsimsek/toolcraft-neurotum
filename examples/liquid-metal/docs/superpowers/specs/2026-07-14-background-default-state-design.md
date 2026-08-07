# Liquid Metal default pose and background revision

## Goal

Use `/Users/kusnizza/Downloads/liquid-metal-3d-settings.json` as the source of truth for the clean-load and Reset defaults of the saved camera pose, scene background color, and background inclusion state. Preserve the existing preloaded model, scratch mask, ten stickers, shader values, timeline, export formats, and renderer quality.

## Reference delta

- `view.orbit`: `position: [-1.2365748457148928, -1.3347790929484664, 4.224836970105814]`, `up: [0, 1, 0]`.
- `appearance.background`: `{ hex: "#AFAFC5" }`.
- `export.includeBackground`: `true`.

The supplied `view.orbit` already matches `DEFAULT_LIQUID_METAL_ORBIT_POSE` exactly, so the camera implementation remains unchanged and receives an explicit regression assertion. The only effective state changes are the background color and Include defaults.

## Product behavior

- A clean load and global/section Reset use the supplied camera pose.
- The Background section starts with `Include` on and `#AFAFC5` selected.
- Live preview renders the product background by default.
- PNG export includes `#AFAFC5` by default; users can still turn Include off for transparency.
- Video continues to include the product background under the existing export contract.

## Control Section Inventory

No control inventory changes are required. Existing owners remain:

- `Model Size`: `view.orbit` through the orientation gizmo.
- `Projection`: `shader.offset`, unchanged at `{ x: 0, y: 0 }`.
- `Background`: `export.includeBackground` and `appearance.background` in the existing two-column row.

## Product decisions

- Canvas: unchanged editable 1920x1080 output at 2x default render scale.
- Panels: unchanged existing sections.
- Media: unchanged typed default model, scratch mask, and sticker assets.
- Renderer: unchanged Three.js/WebGL pipeline; only initial values supplied to the existing clear-color/background path change.
- Timeline: unchanged playback timeline and loop duration.
- Layers: remain disabled.
- Persistence: remains disabled; schema defaults own clean load and Reset.
- Settings transfer: unchanged runtime-owned import/export.
- Export: unchanged helpers and formats; the new Include default changes the initial PNG behavior only.

## Acceptance

- Unit state proves exact orbit, `appearance.background = #AFAFC5`, and `export.includeBackground = true`.
- Authored-default browser acceptance proves the real controls and output start with those values and Reset restores them.
- Export browser acceptance explicitly switches Include off before checking transparent PNG, then switches it on again before included-background export.

## Verification note

Verification tier: Tier 2

Reason: Schema defaults and product starting output change, but state shape, controls, media, renderer pipeline, timeline, export implementation, workload, and dependencies do not.

Run: focused product/schema tests, `npm run verify:quick`, and focused authored-default plus background/export Playwright acceptance; then inspect the live default scene.

Skip: Full performance checkpoint and `verify:final`; this is a post-first-working non-performance default-value revision with no renderer workload or architecture change.
