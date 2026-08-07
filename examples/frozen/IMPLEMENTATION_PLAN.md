# Frozen — Implementation Plan

1. Author the product schema and acceptance inventory in
   `src/app/app-schema.ts` and `src/app/app-acceptance-data.ts`: model upload,
   orientation target, Thaw Front, Ice Detail, Ice Surface, required Background
   and Image Export sections, sticky PNG action, editable output sizing, render
   scale, and values/canvas persistence.
2. Add focused product modules under `src/app/frozen/` for model parsing and
   normalization, deterministic surface sampling, the thaw-field math, the
   Three.js scene/resource lifecycle, shader/material construction, model orbit,
   and export rendering. Keep CSS in a locally imported module.
3. Declare and compile one `rendererPipelineRegistration`; assess it in
   `src/app/app-performance.ts` before renderer implementation, then supply the
   same registration through `appComposition`. This historical frozen snapshot
   no longer carries a current verification-ownership declaration.
4. Wire `canvasContent` and `onPanelAction` in
   `src/app/app-composition.tsx`; suppress default media rendering because the
   WebGL canvas owns product preview. Export through
   `createToolcraftPngExportCanvas` with current state, include-background, and
   selected image resolution.
5. Add app-owned Vitest coverage for thaw-field boundaries, model normalization,
   deterministic sampling, schema state/output mapping, and export render setup.
   Add focused Playwright acceptance for upload/clear, progress, workload
   controls, orientation drag, background semantics, PNG dimensions, viewport
   stability, and renderer responsiveness.
6. Complete performance dimensions and adapters for bounded source triangles,
   crystal instances, icicle instances, and export pixels; derive canonical
   paths and run only the benchmark requested by `assessToolcraftRenderPlan`.
7. Update `docs/toolcraft/agent-worklog.md`, run targeted checks, establish the
   first stable `verify:perf` baseline, run the direct integrity checker and
   `verify:final`, then start the verified local dev URL.

Known preflight issue: the untouched generated starter currently fails
`npm run ai:check` because the signed generic
`e2e/app-browser-semantic-evidence.spec.ts` is 558 lines while the signed health
policy caps `e2e/` files at 500. Resolve through the upstream template/regenerate
path if available; do not patch the protected generated file locally.

## Default Night King scene — 2026-07-17

Verification tier: Tier 3

Reason: predefined model and relief media, schema defaults, persistence version,
and initial WebGL output change together; renderer algorithms and export code do
not change.

Run: `npm run ai:check`, focused schema/product Vitest, `npm run verify:quick`,
the exact default-media/reset/persistence browser scenarios, production build,
and a live clean-profile visual check of the initial scene. Record a protected
Tier 3 iteration receipt only if the existing durable-baseline prerequisite is
available.

Skip: full performance checkpoint because this is a later feature iteration and
the request does not ask for performance optimization; timeline, layers, and
video remain outside the still-scene product.

1. Copy the supplied optimized Night King ZIP and black wall JPEG into a focused
   product asset folder, then declare both through `media.defaultAssets` for
   `source.model` and `source.scratchTexture`.
2. Centralize the supplied `frozen-settings.json` values in one default-scene
   module and map them to schema/control defaults, including pose, melt mode,
   ice geometry/material, relief, lighting, background, export, and 1.5× render
   scale.
3. Bump persistence to v3 and include media so prior v2 state cannot hide the new
   scene while later user source changes still survive reload.
4. Update acceptance metadata and focused unit/browser tests so initial attach,
   removal, Reset restoration, settings restoration, and clean startup all prove
   the default scene rather than an empty canvas.
5. Keep the worklog aligned, then verify the exact bundled ZIP/JPEG in the real
   app without changing the renderer or Toolcraft runtime. Regenerate from the
   current starter before attempting a new targeted performance iteration.

## Melt refreeze timing modes — 2026-07-17

Verification tier: Tier 3

Reason: one built-in control changes persisted melt settings and the pointer/
animation-frame lifecycle of the retained thermal field. The field dimensions,
cooling math, export path, layers, and timeline remain unchanged.

Run: focused melt/schema Vitest, `npm run verify:quick`, the exact Melt Brush
Chromium scenarios for conditional control visibility and both timing modes,
plus the existing targeted thermal animation-frame performance scenario when a
baseline-linked iteration receipt is available.

Skip: the full performance checkpoint because this is a later interaction
feature and not a performance-optimization request; model preprocessing, image
export, layers, timeline, and source-media flows are unaffected.

1. Add a built-in segmented `melt.refreezeMode` control to `Melt Brush` with
   `Drawing` and `Release` choices; keep `Release` as the default and include it
   in settings transfer, reset, persistence, inventory, and acceptance data.
2. Parse the mode into `FrozenSceneSettings` and add a focused scheduling helper
   that allows thermal cooling while the pointer is active only in `Drawing`
   mode.
3. Make pointer-down explicitly pause cooling in `Release` mode, start or retain
   cooling in `Drawing` mode, and resume cooling after pointer-up/cancel/lost
   capture in either mode without changing deposition or field math.
4. Expose the active timing state as product-output observables and prove that
   `Drawing` cools during a held stroke while `Release` stays stable until the
   pointer is released and then cools.
5. Keep the renderer pipeline and worklog aligned, record the decision, and
   verify the live app at its existing URL. The frozen snapshot preserves
   historical proof but requires regeneration before new targeted verification.

## Model texture exposure — 2026-07-17

Verification tier: Tier 3

Reason: a persisted source-material control changes the retained source shader,
live preview, and PNG export. It does not change texture decoding, geometry,
workload boundaries, layers, timeline, or the physical ice material.

Run: focused source exposure/schema/material Vitest, `npm run typecheck`,
`npm run build`, the exact model-exposure Chromium acceptance with conditional
visibility and directional luminance proof, direct integrity, and the protected
kernel/iteration commands required by the changed preview-render owner.

Skip: full performance checkpoint because this is a post-first-working feature
loop and not a performance request; the existing control-drag preview path and
fixed-cost shader pass remain the canonical performance coverage.

1. Add a model-only built-in slider `source.modelExposure` inside `Source`
   beside its owning `Type` selector, ranging from −3 to +3 EV with a neutral
   0 EV default and normal persistence/settings-transfer behavior.
2. Parse EV into scene settings and convert it to a linear radiance multiplier
   with `2^EV`, clamped by the schema/parser domain.
3. Add one retained source-material shader uniform that multiplies final source
   radiance before ACES tone mapping. Keep ice materials and unlit image-card
   pixels unchanged; reuse the same uniform path for preview and export.
4. Add the target to the canonical preview pipeline, section inventory, product
   readiness, acceptance rows, schema tests, and performance ownership without
   introducing a workload dimension or resource rebuild.
5. Prove the control is hidden in Image mode, restored in 3D mode, and that
   +3 EV yields higher foreground luminance than −3 EV on the textured default
   model while the output size remains stable.

## Model-only exposure mask correction — 2026-07-17

Verification tier: Tier 3

Reason: corrects the retained source-material shader so model EV cannot alter
model radiance seen through retained ice. Schema, persistence, geometry,
textures, HDRI, ice materials, timeline, layers, and export ownership remain
unchanged.

1. Reuse the source shader's existing `frozenCoreMask` and blend the multiplier
   from `1` under retained ice to `uFrozenSourceExposure` on revealed model
   pixels, including local Melt Brush reveal.
2. Extend exact Chromium acceptance to prove a fully frozen canvas is invariant
   between −3 and +3 EV while the fully thawed model still brightens and output
   dimensions remain stable.
3. Keep `source.modelExposure` on the existing fixed-cost preview-render
   control-drag path; add no workload dimension or resource invalidation.
4. Run focused TypeScript/Vitest, exact Chromium acceptance, production build,
   current-source kernel, integrity, `verify:quick`, and the protected Tier 3
   iteration attempt; record known signed/baseline blockers in the worklog.

## Melt Brush keyboard shortcut — 2026-07-17

Verification tier: Tier 2

Reason: adds keyboard input for the existing persisted `melt.enabled` switch.
The state target, renderer behavior, workload, exports, layers, and timeline do
not change.

Run: focused shortcut and melt-control Vitest, `npm run verify:quick`, and the
exact Melt Brush Chromium acceptance proving toggle-on, toggle-off, Russian
layout independence through physical `KeyM`, and editable-control exclusion.

Skip: performance checks because the shortcut dispatches the same fixed-cost
state change as the existing switch and adds no renderer pass, workload
dimension, resource invalidation, viewport path, or export work.

1. Add a focused keyboard hook that accepts unmodified, non-repeating physical
   `KeyM` events outside editable controls and dispatches the normal Toolcraft
   `controls.setValue` command for `melt.enabled`.
2. Mount the hook in the existing product output, preserving normal history,
   persistence, conditional settings visibility, model-orbit locking, and reset
   behavior owned by the target.
3. Document the shortcut in the Melt Brush switch description and keep the
   acceptance metadata and performance-impact ownership aligned.
4. Add pure helper coverage plus real-browser assertions for both directions
   and for ignored key presses while a built-in input is focused, then record
   verification evidence in the worklog.

## Refresh default settings from exported scene — 2026-07-17

Verification tier: Tier 3

Reason: schema defaults and persistence identity change so the supplied settings
become the startup and Reset state, and the initial rendered mesh budget rises
from 6,000 to 14,000 triangles. Controls, renderer algorithms, media assets,
exports, layers, and timeline structure do not change.

Run: none, per the user's explicit request to update defaults without checks.

Skip: all automated, browser, build, integrity, and performance checks by direct
user instruction. The existing `model-render-triangles` workload dimension
derives the new schema default; no new dimension or renderer pass is introduced.

1. Replace `frozenDefaultSceneValues` with the matching values from
   `local-reference://downloads/frozen-settings.json`, normalizing the Background
   color value to the schema's existing hex-string shape.
2. Preserve bundled Night King and scratch-texture default media because settings
   transfer does not embed media payloads and represents those targets as null.
3. Bump the localStorage persistence key/version so existing saved v3 state does
   not mask the refreshed startup defaults.
4. Record the exact source, mapping decision, skipped verification, and remaining
   risk in the product worklog.

## Reapply defaults from the second exported scene — 2026-07-17

Verification tier: Tier 3

Reason: the second export changes the clean-start WebGL workload to the maximum
30,000-triangle mesh budget and changes the startup render scale, thaw mask, and
Melt interaction state. Renderer algorithms and workload boundaries stay fixed.

Run: restart the saved dev server only. Do not run automated, browser, build,
integrity, or performance checks, continuing the user's explicit instruction for
this default-settings update.

Skip: all verification commands. The root-cause correction is procedural: stop
the live dev server before changing the persistence identity so an HMR-connected
tab cannot seed the new key with the previous in-memory state.

1. Stop the current saved-port server before editing schema persistence.
2. Apply `local-reference://downloads/frozen-settings (1).json` as the authoritative
   defaults: x1 render scale, 30,000 mesh budget, Progress 20, and Melt enabled;
   preserve the other already-matching scene values and bundled media.
3. Align the model fallback and future unit/performance/browser expectations,
   then bump persistence from v4 to v5.
4. Record the diagnosis, changes, intentionally skipped verification, and
   maximum-default-workload risk; start a fresh server on the saved port.
