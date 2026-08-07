# Default Image And Settings Design

## Request

Make `~/Desktop/Geological Cross Section with Colors.png` and `~/Downloads/liquid-glass-settings.json` the default Liquid Glass app state.

## Required Preflight

- `docs/toolcraft/workflow.md`
- `docs/toolcraft/schema-reference.md`
- `docs/toolcraft/component-rules.md`
- `docs/toolcraft/acceptance-testing.md`
- `docs/toolcraft/performance.md`
- `docs/toolcraft/renderer-technique.md`
- `docs/toolcraft/decision-contract.md`
- Required skills: brainstorming and writing-plans.

## Verification Tier

Verification tier: Tier 3
Reason: This changes schema defaults and app-owned media fallback used by custom WebGL preview/export.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted browser acceptance for default source/settings, and targeted source media performance if needed.
Skip: Full `pnpm verify:perf` because this is a focused defaults/media update, not a new renderer architecture or performance complaint.

## Product Behavior

- First app load renders the geological cross-section image as the source backdrop.
- Existing saved `v1` localStorage state is not restored; the persistence key/version moves to `v2` so this new base appears on first load after the update.
- User-uploaded source images still override the built-in default through the existing `Source / Image` fileDrop.
- Removing or resetting a user-uploaded source returns to the built-in default image.
- Settings defaults match the provided settings JSON for canvas size, glass shape, center, shadow, text, texture, refraction, edge, surface, highlights, background, and image export.
- The UI keeps the existing Toolcraft flow. No preset picker is reintroduced.

## Control Section Inventory

Product need: Start from a designed source image but keep custom upload as the only user image flow.
Value model: built-in default media fallback plus existing nullable fileDrop override.
Candidate built-ins checked: `fileDrop`, `imagePicker`, `segmented`.
Best built-in: keep `fileDrop`; it already owns custom image upload/clear/reset.
Rejected alternatives: `imagePicker` or source presets would contradict the previous upload-only request; storing the image as a default `source.upload` value would require runtime media state rather than a simple schema value.
Target: `source.upload`.
Required acceptance: Default pixels render before upload; upload changes output; clear/reset returns to default output.

Product need: Make provided settings the reset/base values.
Value model: schema control `defaultValue` plus normalized fallback settings.
Candidate built-ins checked: existing sliders/selects/vector/colorOpacity/fontPicker/fileDrop.
Best built-in: update existing default values only.
Rejected alternatives: programmatically importing the JSON on startup would bypass schema reset semantics and settings transfer expectations.
Target: all targets present in `liquid-glass-settings.json`.
Required acceptance: Default canvas output uses provided settings and Reset controls returns to them.

## Renderer Pipeline Impact

The source frame pass gains a built-in default image when `state.mediaAssets` has no `source.upload` asset. User media keeps priority. The fallback is loaded through the same image decode/cache path as uploaded source media so preview and export stay aligned.

No shader, displacement, text, texture, or export helper changes are required.

## Risks

- The default source image is 2944x1648, larger than the 1920x1080 canvas. The existing contain-fit source drawing preserves it without cropping and remains covered by source media acceptance/performance.
- Texture mode from the JSON is `image` while `texture.upload` is null, so texture overlay controls are visible but no overlay texture appears until the user uploads one. This mirrors the imported settings and preserves upload-only texture behavior.
