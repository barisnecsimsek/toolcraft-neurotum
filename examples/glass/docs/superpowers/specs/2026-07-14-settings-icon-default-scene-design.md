# Settings And Icon Default Scene Spec

## Goal

Use the supplied `liquid-glass-settings.json` and `icon.png` as the app's default scene, while forcing the glass itself to be a centered circle and preserving the runtime canvas zoom default of 100%.

## Product Behavior

- First load and Reset use the exported settings for source saturation, shadow, texture, shader, button image blend/position/scale, background, canvas size, render scale, and image export.
- The default source preview remains `flow-gradient-shader (1).png`.
- The default glass texture preview remains `texture.jpg`.
- The Button Image fileDrop shows `icon.png` as a real default asset, not as an invisible fallback.
- Removing the button image removes it from the glass and from the file preview until section reset or global Reset restores the default icon.
- The glass starts as a centered circle: visible Center is `{ x: 0, y: 0 }`, renderer center is `{ x: 0.5, y: 0.5 }`, and Width/Height are both `459`.
- Text defaults to off because the supplied settings export has `text.enabled: false`.
- Persistence moves to `v6` so an older saved browser state does not mask the new baseline.
- Toolcraft canvas zoom stays at the runtime default `100`.

## Verification

Verification tier: Tier 3.
Reason: schema defaults, media lifecycle defaults, persistence baseline, and visible canvas output change, but renderer algorithm and runtime architecture do not.
Run: typecheck, schema tests, focused Button Image/Shape/Text browser acceptance, focused Button Image/Shape/Center performance, and attempt `pnpm verify:quick`.
Skip: full `verify:perf`, because no renderer pipeline or workload algorithm changes.
