# Settings (2) default state

## Goal

Make `/Users/kusnizza/Downloads/liquid-metal-3d-settings (2).json` the
schema-owned default control state while preserving the complete editable
preloaded scene introduced in the previous pass.

## Source interpretation

The settings payload contains 39 runtime targets. Thirty-three already match
the current defaults. Six shader targets supersede the previous Settings (1)
values:

| Target              | New default |
| ------------------- | ----------- |
| `shader.preset`     | `default`   |
| `shader.colorBack`  | `#AAAAAC`   |
| `shader.repetition` | `2`         |
| `shader.softness`   | `0.1`       |
| `shader.speed`      | `1`         |
| `shader.rotation`   | `0`         |

Together these values are the existing official Paper `Default` preset. No
control, section, range, action, renderer technique, or export behavior changes.

The transfer payload contains `media.model: null`, `media.scratches: null`, and
`media.stickers: []` because settings transfer does not serialize media bytes.
It also omits `stickers.placements`. Those values do not request an empty scene:
the existing typed defaults remain `A.obj`, the scratch JPEG, and ten ordered
stickers with their recovered NDC seeds and scale `0.82`.

The exported timeline `currentTimeSeconds` is session position, and the settings
exporter always writes `isPlaying: false`. The schema supports the authored loop
duration, not an exported transient playback cursor. Keep the existing seamless
`10 / 3` second playback timeline, normal play-on-load behavior, and reset
semantics.

## Product decisions

- Canvas: unchanged editable 1920×1080, render scale 2.
- Controls and section inventory: unchanged; only six `defaultValue`s change.
- Media: keep all twelve current `media.defaultAssets` entries.
- Renderer: unchanged WebGL pipeline; the new defaults feed its existing Paper
  uniforms and physical surface composite.
- Timeline: unchanged playback mode and duration; ignore transient export time.
- Layers: remain disabled.
- Persistence: remains `storage: "none"`, so reload intentionally restores this
  new authored default state.
- Export: unchanged and consumes the same values as preview.

## Acceptance

- A clean root load still resolves `A.obj`, scratch mask, ten stickers, and ten
  placement scales of `0.82`.
- Runtime defaults and Reset produce Paper `Default`: gray base `#AAAAAC`,
  repetition `2`, softness `0.1`, speed `1`, and rotation `0°`.
- The visible controls show those values and the product canvas renders a
  non-empty neutral-metal scene without manual settings import.
- Existing remove/Reset and PNG export behavior remains operational.

## Verification note

Verification tier: Tier 2

Reason: Existing schema control defaults and resulting product output change;
state shape, media workload, renderer implementation, canvas mechanics,
timeline, layers, persistence, and export architecture do not.

Run: focused product/schema tests, `npm run typecheck`, `npm run verify:quick`,
the authored-default-scene browser acceptance with exact control defaults, and
controlled-browser reload/visual/console inspection.

Skip: Targeted and full performance suites are not required. All six changes are
existing uniform-backed responsiveness controls, no workload limit or renderer
path changes, and this is a post-first-working non-performance edit.
