# Independent duotone preset naming

## Goal

Replace every name shown in the supplied duotone preset dropdown with a new product-owned label and internal preset id while preserving the exact color pairs and effect behavior.

## Product decisions

- Keep the existing built-in `select` control, Duotone color entity, section placement, renderer, randomize action, export behavior, and preset ordering.
- Rename the editable manual branch from `Custom/custom` to `Manual/manual`.
- Replace the eighteen fixed preset labels and values with: `Monochrome`, `Aurora`, `Fjord`, `Paper Moon`, `Rosette`, `Deep Sea`, `Riviera`, `Prism`, `Nocturne`, `Carbon`, `Tidepool`, `Terra`, `Voltage`, `Lichen`, `Saffron`, `Beacon`, `Grove`, and `Eclipse`.
- Preserve every fixed preset's current `ink` and `paper` hex values.
- Do not keep legacy preset ids as aliases. Existing imported settings that contain an old id may require the user to choose a current preset; this is intentional so the old naming does not remain in runtime code.
- Timeline, layers, persistence policy, media flow, canvas renderer, and image export are unchanged.

## Files

1. Update `src/app/effect-presets.ts` with the new labels and values.
2. Update `src/app/app-schema.ts`, `src/app/renderer/effect-state.ts`, and `src/app/panel-actions.ts` so defaults, manual visibility, overlay fallback, and randomization use the new ids.
3. Add focused unit coverage for the complete ordered label/value inventory and unchanged color resolution.
4. Strengthen `e2e/app-controls.spec.ts` to verify the current names in the real dropdown, reject representative legacy labels, and prove preset selection still changes rendered output.
5. Record the naming decision, compatibility note, and verification in `docs/toolcraft/agent-worklog.md`.

## Verification tier

Verification tier: Tier 2

Reason: Visible select options, schema defaults, conditional manual-color visibility, and runtime preset ids change, but renderer technique, workload, canvas mechanics, exports, dependencies, timeline, and layers do not.

Run: focused preset/schema/effect-state unit tests; `npm run verify:quick`; focused `browser: applies Mesh FX controls to rendered 3D output`; controlled-browser inspection of the opened preset menu and representative output change.

Skip: targeted performance and the full performance checkpoint because labels and constant-time preset lookup do not change renderer workload or interaction frequency. Skip `npm run verify:final` because this is a post-first-working scoped schema/copy pass.
