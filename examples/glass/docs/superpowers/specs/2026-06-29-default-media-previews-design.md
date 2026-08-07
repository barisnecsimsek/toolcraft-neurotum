# Default Media Previews Design

## Request

Make the default pill radius maximal, make `~/Desktop/texture.jpg` the default glass texture with Image / Screen / 0.9 opacity, and show default assets as real file previews instead of hidden renderer defaults.

## Required Preflight

- `docs/toolcraft/workflow.md`
- `docs/toolcraft/schema-reference.md`
- `docs/toolcraft/component-rules.md`
- `docs/toolcraft/acceptance-testing.md`
- `docs/toolcraft/performance.md`
- `docs/toolcraft/renderer-technique.md`
- `docs/toolcraft/decision-contract.md`
- Required skills: brainstorming, writing-plans, and systematic-debugging for the existing default-preview mismatch.

## Verification Tier

Verification tier: Tier 3
Reason: The change touches default media lifecycle, fileDrop previews, schema defaults, renderer inputs, and app-level runtime command seeding.
Run: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted browser source/texture acceptance, and targeted texture/source responsiveness where the changed default media path is exercised.
Skip: Full `pnpm verify:perf` because this is a focused media/defaults pass after the first working app and not a broad renderer rewrite.

## Product Behavior

- First load shows the geological source image in the Source fileDrop preview.
- First load shows `texture.jpg` in the Glass Texture fileDrop preview when Texture is set to Image.
- Texture defaults to Image mode, Screen blend, and 0.9 opacity.
- Pill defaults to a maximal 98px radius for the 459x196 glass.
- User uploads still replace the default source or texture through the existing fileDrop flow.
- Removing or resetting a user-uploaded source/texture restores the default asset preview and default output.
- The persistence key/version moves to `v3` so saved `v2` settings do not mask the new baseline.

## Control Section Inventory

Product need: Default source and texture must be visible as editable file assets.
Value model: Toolcraft `mediaAssets` seeded through the runtime command bus by an app-owned null component.
Candidate built-ins checked: `fileDrop`, `imagePicker`, `segmented`.
Best built-in: keep `fileDrop`; it owns upload, preview, clear, and reset.
Rejected alternatives: hidden renderer fallback hides the asset from the file control; `imagePicker` or source presets would reintroduce preset flow the user asked to remove.
Target: `source.upload`, `texture.upload`.
Required acceptance: default preview images are visible, uploads replace them, clear/reset restore default previews and product output.

Product need: Max pill radius and matching texture settings.
Value model: schema `defaultValue` and normalized `liquidGlassDefaultSettings`.
Candidate built-ins checked: existing `slider`, `select`, `segmented`.
Best built-in: update existing default values.
Rejected alternatives: a special-case renderer max-pill override would make the Radius slider lie about state.
Target: `glass.radius`, `texture.opacity`, `texture.mode`, `texture.blendMode`.
Required acceptance: unit coverage for resolved geometry/defaults and browser output changes for texture controls.

## Renderer Pipeline Impact

No shader algorithm changes are required. The source and texture decode paths receive app-seeded Toolcraft media assets, so preview/export continue to use the existing cached image loading path. Reset and delete remove current media through runtime behavior; the app-level sync re-seeds missing default targets so the fileDrop preview remains visible.

## Risks

- The default texture is a 5616x3744 JPEG. It should remain acceptable because the existing texture loader caches a fixed texture frame, but targeted texture browser/perf checks cover the changed media path.
- Default media seeding uses `media.import`, so it can create technical history entries. The sync re-seeds missing default targets to keep visible defaults stable after undo/reset/delete.
