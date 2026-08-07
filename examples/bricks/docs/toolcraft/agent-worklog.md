# Implementation Worklog

This file records product decisions and the evidence behind them.

## Status

Mode: product

Brick Mosaic is now a product app: it uploads one image, renders a raised brick mosaic on the Toolcraft canvas, exposes product controls, and exports image output.

## Decision Trail

### Iteration 11 — Chaos default at 25%

- Request: Change the base Chaos value to `25%`.
- Task type: Tier 2 schema default and persistence preset update.
- User-visible result: Fresh loads and Brick Grid Reset now start Chaos at `25%`, while `0%` remains available for an exact source mapping.
- Source/reference checked: User request, startup preset, schema default wiring, localStorage persistence policy, startup browser acceptance, and Chaos output acceptance.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `brainstorming`, and `writing-plans`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `acceptance-product-observable`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Set `brick.chaos` startup/default value to `25` and advance persistence to `v3` so the old persisted `0%` does not mask the new baseline.
- Alternatives rejected: Keeping persistence `v2` would leave existing browsers at their saved old value; changing the renderer fallback would not update schema Reset semantics.
- State/output mapping: `brickMosaicStartupValues["brick.chaos"]` feeds the schema control `defaultValue`; the runtime initializes and resets `brick.chaos` to `25`; the existing renderer normalizes it to `0.25`.
- Files changed: `src/app/brick-mosaic-startup-preset.ts`, `src/app/app-schema.ts`, `src/app/app-schema.test.ts`, `e2e/app-brick-mosaic.spec.ts`, feature spec/plan, and this worklog.
- Verification: `pnpm verify:quick` passed with 169 tests; focused Chromium startup, Chaos output, and Brick Grid Reset tests passed with 3/3 tests.
- Skipped checks: Full performance/final gates skipped because no renderer algorithm, workload, export, dependency, runtime/template, or architecture behavior changed.
- Risks: Advancing persistence intentionally starts a fresh local app state once; users can still import previously exported settings. No functional risk remains after startup, Reset, and exact-zero browser coverage.

### Iteration 10 — Persistent Chaos control

- Request: Add a slider that introduces persistent chaos into the final mosaic, from no chaos on the left to an almost unrecognizable image on the right, by mixing nearby bricks more strongly.
- Task type: Tier 3 schema/product behavior and custom Canvas 2D renderer mapping.
- User-visible result: Brick Grid now includes a persistent `0..100%` Chaos slider. The left edge preserves the exact mosaic, the lower range exchanges nearby bricks, and the right edge expands the exchange radius across most of the grid until the portrait is almost unrecognizable.
- Source/reference checked: User request, current Brick Grid schema, deterministic local permutation helper, preview/export shared renderer, acceptance matrix, and control performance scenarios.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `schema-reference.md`, `component-rules.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`, `brainstorming`, and `writing-plans`.
- Contract rules applied: `canvas-surface-preserved`, `controls-product-coverage`, `controls-layout-heuristics`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Add schema target `brick.chaos` as a `0..100%` built-in slider; use a fixed-seed one-to-one permutation where participation grows linearly and radius grows nonlinearly from local exchanges to most of the grid; compose it with transient Scale shuffle; use the same settings/render path for preview and export.
- Alternatives rejected: Independent random source sampling could duplicate or omit bricks; a changing random seed would flicker; color noise would not represent swapping cubes; a separate randomize action would not provide continuous control.
- State/output mapping: `brick.chaos` normalizes to `settings.brick.chaos`; the renderer derives a cached permutation from grid dimensions and intensity; each visible slot samples exactly one permuted source cell; export calls the same settings and renderer without transient Scale shuffle.
- Files changed: `src/app/app-schema.ts`, `src/app/brick-mosaic-startup-preset.ts`, `src/app/brick-mosaic-render.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-acceptance.test.ts`, `src/app/app-performance.ts`, `e2e/app-brick-mosaic.spec.ts`, feature spec/plan, and this worklog.
- Verification: `pnpm verify:quick` passed with 169 tests; unit coverage proves identity at zero, deterministic bijection, increasing participation, and increasing radius; focused browser `0% -> 100% -> 0%` acceptance and `brick-chaos-drag` performance passed; live Chromium visual QA on the bundled portrait confirmed an exact readable image at zero and an almost unrecognizable distributed-color grid at maximum.
- Skipped checks: Full performance/final gates skipped because this is an incremental app-local Tier 3 feature with no dependency, runtime/template, export helper, canvas sizing, or architecture change. The directly touched responsiveness scenario passed.
- Risks: None known after permutation invariants, exact zero restoration, targeted performance, and real portrait visual verification passed.

### Iteration 9 — Remove release assembly animation

- Request: Remove the cube assembly animation and restore the earlier immediate final result.
- Task type: Tier 3 custom Canvas 2D interaction simplification for Scale release.
- User-visible result: Local swaps remain visible while Scale is held, and releasing it immediately restores the final mosaic with no settling frames.
- Source/reference checked: User request, `useBrickScaleAssembly`, render interpolation in `brick-mosaic-render.ts`, local-swap acceptance, and Scale performance coverage.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`, `brainstorming`, `writing-plans`, and `browser`.
- Contract rules applied: `canvas-surface-preserved`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Keep local permutation only during active Scale interaction; remove settle progress, duration, easing, and animation frames; render the exact final image immediately on release.
- Alternatives rejected: Setting duration to zero would leave dead animation state and interpolation code; removing the held shuffle would exceed the requested rollback scope.
- State/output mapping: Active Scale pointer state passes a shuffle seed to preview rendering; pointer release removes the shuffle option and the renderer takes the unchanged final/export path immediately.
- Files changed: `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `e2e/app-brick-mosaic.spec.ts`, feature spec/plan, and this worklog.
- Verification: `pnpm verify:quick` passed with 168 tests; focused immediate-release acceptance, existing Scale output acceptance, and `brick-scale-drag` passed; live Chromium confirmed `shuffling` while held, immediate `assembled` after release, no legacy assembly attribute, and the exact final portrait.
- Skipped checks: Full performance/final suites skipped because this removes work from a targeted preview path and does not change schema, export, runtime, dependencies, or architecture. Dependency install skipped because dependencies and lockfile are unchanged.
- Risks: None known after browser and targeted performance verification.

### Iteration 8 — Double local assembly speed

- Request: Make the cube reordering assembly animation two times faster.
- Task type: Tier 3 timing change in the custom Canvas 2D Scale release animation.
- User-visible result: The same local permutation now assembles in 300 ms instead of 600 ms; radius, easing, grid alignment, and final output are unchanged.
- Source/reference checked: User timing request, `brickAssemblyDurationMs` in `src/app/brick-mosaic-renderer.tsx`, local-swap browser acceptance, and Scale performance coverage.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`, `brainstorming`, `writing-plans`, and `browser`.
- Contract rules applied: `canvas-surface-preserved`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Preserve permutation, easing, radius, runtime state, and export behavior; change only release assembly duration from 600 ms to 300 ms.
- Alternatives rejected: Changing easing would alter motion character; reducing frames or render quality would weaken visual fidelity; adding a speed control is outside the request.
- State/output mapping: Scale pointer release still starts renderer-local settle progress; elapsed time is now normalized over 300 ms; progress still reaches the same exact assembled output.
- Files changed: `src/app/brick-mosaic-renderer.tsx`, `e2e/app-brick-mosaic.spec.ts`, feature spec, and this worklog.
- Verification: `pnpm verify:quick` passed with 168 tests; focused local-swap timing acceptance and `brick-scale-drag` passed; the browser measured 382 ms wall time around the configured 300 ms animation and reached the exact assembled phase. Full `pnpm verify:perf` ran: the touched Scale scenario and 24/27 browser perf scenarios passed, while unrelated media import, saturation, and contrast scenarios exceeded their existing budgets; a focused rerun reproduced only those same unrelated failures.
- Skipped checks: `pnpm verify:final` skipped because runtime, schema, export, dependencies, and architecture are unchanged. Dependency install skipped because dependencies and lockfile are unchanged.
- Risks: The requested timing path has no known risk after focused acceptance/performance passed. Existing unrelated performance gaps remain in media import (`159 ms` frame gap vs `120 ms`), saturation (`3082 ms` vs `1800 ms`), and contrast (`1898 ms` vs `1800 ms`).

### Iteration 7 — Correct Scale interaction to local brick swaps

- Request: Correct the Scale interaction so cubes only exchange grid positions within a local radius instead of scattering, rotating, or resizing.
- Task type: Tier 3 visual mismatch fix in the custom Canvas 2D renderer and Scale control interaction.
- User-visible result: Scale drag keeps a fully occupied aligned grid while neighboring cubes exchange cells within a four-cell radius; release moves those cubes back into the exact final image without rotation or resizing.
- Source/reference checked: User correction, the Iteration 6 visual screenshots, `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, Scale acceptance, and `brick-scale-drag` performance coverage.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`, `brainstorming`, `systematic-debugging`, and `writing-plans`.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Replace free scatter transforms with a deterministic one-to-one permutation made from disjoint neighbor swaps inside a four-cell radius; keep size and rotation unchanged; interpolate only cell position during release.
- Alternatives rejected: Independent random source sampling could duplicate or drop cubes; rotation/scale/continuous scatter contradict the clarified behavior; a new radius control is unnecessary for this correction.
- State/output mapping: `brick.scale` still controls final grid density; the renderer-local seed selects a cached local permutation while Scale is held; settle progress moves each permuted brick back to its own source cell; export omits assembly options and stays final.
- Files changed: `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `e2e/app-brick-mosaic.spec.ts`, feature spec/plan docs, and this worklog.
- Verification: `pnpm verify:quick` passed with 168 tests; the unit test proved a complete one-to-one involutive permutation bounded by four cells; focused browser local-swap acceptance, existing Scale output acceptance, and `brick-scale-drag` performance scenario passed; visual Playwright screenshots confirmed a grid-aligned shuffled frame and exact assembled frame.
- Skipped checks: Full `pnpm verify:perf` and `pnpm verify:final` skipped because this is a targeted post-delivery correction with no dependency, runtime, export, or architecture change and no explicit performance complaint. Dependency install skipped because dependencies and lockfile were unchanged.
- Risks: None known after permutation invariants, dense Scale performance, and real visual output checks passed.

### Iteration 6 — Scale scramble and assembly preview

- Request: Randomize the cubes while changing brick size and assemble them into the final image when the Scale slider is released.
- Task type: Tier 3 custom Canvas 2D renderer interaction and high-frequency Scale control behavior.
- User-visible result: Holding and dragging Scale scatters the preview bricks with deterministic position, rotation, and size variation; releasing the pointer eases them into the exact final mosaic in 600 ms.
- Source/reference checked: `src/app/brick-mosaic-renderer.tsx`, `src/app/brick-mosaic-render.ts`, the built-in Toolcraft slider DOM and pointer lifecycle, Scale acceptance, and the existing `brick-scale-drag` performance scenario.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`, `component-rules.md`, `brainstorming`, and `writing-plans`.
- Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Keep the built-in Scale slider and runtime state unchanged; add deterministic preview-only scatter transforms and a short app-local settle animation; keep export fully assembled.
- Alternatives rejected: A custom Scale control would duplicate the built-in; timeline playback would misrepresent a transient control response; persisting random positions would pollute product settings; changing export would violate the requested final-image behavior.
- State/output mapping: `brick.scale` continues to control final grid density; pointer interaction on the built-in Scale slider controls only renderer-local scramble phase, seed, and settle progress; omitted assembly options keep export on the final path.
- Files changed: `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `e2e/app-brick-mosaic.spec.ts`, feature spec/plan docs, and this worklog.
- Verification: `pnpm verify:quick` passed with 168 tests; focused browser Scale assembly acceptance passed; existing Scale output acceptance passed; focused `brick-scale-drag` performance scenario passed; visual Playwright screenshots confirmed scattered and assembled states on the running app.
- Skipped checks: Full `pnpm verify:perf` and `pnpm verify:final` skipped because this is a targeted post-delivery feature loop with no dependency, runtime, export, or architecture change and no explicit performance complaint. Dependency install skipped because dependencies and lockfile were unchanged.
- Risks: None known after the high-detail Scale drag budget and real visual assembly check passed.

### Iteration 1 — Brick Mosaic product build

- Request: Build an app where a user uploads an image and turns it into a cube/brick mosaic with controls for detail, scale, monochrome, and additional useful parameters.
- Task type: Fresh generated app completion; schema, media, custom Canvas 2D renderer, export, acceptance, browser, and performance coverage.
- User-visible result: The canvas shows a raised toy-brick version of the uploaded image with adjustable grid density, brick scale, gaps, corners, bevels, studs, tone, lighting, background, and image export settings.
- Source/reference checked: User-provided CleanShot references showing coarse and fine brick detail; local Toolcraft starter schema, route, renderer/export contracts, acceptance/performance validators, and browser test helpers.
- Docs/contracts read: `workflow.md`, `assembly-workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, and required Toolcraft workflow skills.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Use `defineToolcraft` + `ToolcraftApp`, built-in schema controls, single uploaded media source, no timeline, no layers, Canvas 2D `canvasContent`, localStorage persistence, settings transfer auto, and standard PNG helper export.
- Alternatives rejected: DOM/SVG nodes per brick would be too heavy for dense grids; default media preview cannot draw raised studs/bevels; WebGL/WebGPU are reserved for a true pixel-output shader path if Canvas 2D stress tests fail; timeline/layers are unnecessary for one still image result.
- State/output mapping: `media.source` imports the source image; `brick.*`, `stud.*`, `tone.*`, `lighting.*`, and `appearance.background` feed `getBrickMosaicSettings`; `BrickMosaicRenderer` draws the live preview; `export.image.*` and `export.includeBackground` feed `createToolcraftPngExportCanvas`; toolbar commands adjust viewport only.
- Files changed: `src/app/app-schema.ts`, `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, `src/routes/index.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `e2e/app-brick-mosaic.spec.ts`, `e2e/app-controls.spec.ts`, docs specs/plans, and this worklog.
- Verification: `pnpm verify:quick`, `TOOLCRAFT_TEST_PORT=3021 pnpm verify:final`, and `TOOLCRAFT_TEST_PORT=3022 pnpm verify:perf` passed.
- Skipped checks: `pnpm install` skipped because `node_modules` is present and dependencies/lockfile were not changed.
- Risks: No open product risks after final and sequential performance gates passed.

### Iteration 2 — Browser verification hardening

- Request: Complete final browser and performance verification for the Brick Mosaic product.
- Task type: Post-build debugging for browser acceptance, export, persistence, and performance coverage.
- User-visible result: All controls now visibly affect output, PNG/JPG export downloads at selected 2K/4K/8K dimensions, transparent PNG background behavior works, and persisted settings restore after reload.
- Source/reference checked: Playwright error contexts, `e2e/product-observable-helpers.ts`, Toolcraft slider/vector/select DOM, `src/toolcraft/ui/components/controls/vector/vector-control.tsx`, and export helper usage in `src/routes/index.tsx`.
- Docs/contracts read: `systematic-debugging` workflow, browser verification workflow, and performance/acceptance contracts already selected for Tier 4.
- Contract rules applied: `acceptance-product-observable`, `output-export-required`, `performance-coverage-levels`, `persistence-policy-explicit`, and `canvas-surface-preserved`.
- Decision: Use keyboard-driven role-slider interactions in browser helpers, scroll vector pad into view before dragging, parse vector numeric strings in renderer settings, render uploaded image pixels inside brick bounds so transparent exports keep clear gaps, and use DOM select-item clicks where Base UI options are not exposed to Playwright `getByRole("option")`.
- Alternatives rejected: Loosening performance budgets above the contract cap; patching copied Toolcraft runtime; downsampling export; relying on hidden state writes instead of browser-level interactions.
- State/output mapping: Slider and vector browser actions update runtime values; `lighting.direction` string values now normalize into renderer settings; image export format/resolution still update runtime values and are verified by decoded downloads.
- Files changed: `src/app/brick-mosaic-render.ts`, `e2e/performance-helpers.ts`, `e2e/app-brick-mosaic.spec.ts`, `src/app/app-performance.ts`, and this worklog.
- Verification: Targeted Playwright repros passed for slider output, export format/resolution, persistence, select perf, and direction; full final and performance gates passed afterward.
- Skipped checks: No dependency install; no runtime integrity changes.
- Risks: None remaining from this verification pass.

### Iteration 3 — Brick renderer performance cache

- Request: Optimize the app so the brick mosaic does not lag, with attention to caching.
- Task type: Performance optimization for custom Canvas 2D renderer, upload/media preview, high-density controls, and export parity.
- User-visible result: Uploaded mosaics reuse source sampling, rounded brick masks, and transparent brick relief tiles while dragging controls; preview canvas backing is no longer reallocated when only product controls change.
- Source/reference checked: `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, `src/app/app-performance.ts`, and real browser perf scenarios for preview, detail, scale, render scale, export, viewport, and zoom.
- Docs/contracts read: `workflow.md`, `performance.md`, `decision-contract.md`, `renderer-technique.md`, `acceptance-testing.md`, `systematic-debugging`, `writing-plans`, and `browser`.
- Contract rules applied: `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- Decision: Keep Canvas 2D quality and selected render scale intact; cache the tiny sampled image per uploaded image/grid/tone, cache reusable `Path2D` rounded masks, cache the color-independent brick relief tile per geometry/light/stud/renderScale, and avoid assigning `canvas.width`/`canvas.height` when the backing size already matches.
- Alternatives rejected: Reducing detail, downsampling preview/export, clamping `canvas.renderScale`, weakening performance budgets, or moving to WebGL before the Canvas 2D hot path had been optimized.
- State/output mapping: `brick.detail`, `brick.scale`, `tone.*`, `lighting.*`, `stud.*`, and `canvas.renderScale` still map to the same visual output; caches are keyed by those output-affecting values and fall back to direct drawing when unavailable.
- Files changed: `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, and this worklog.
- Verification: `pnpm verify:quick`, targeted browser perf for stress preview/render-scale/detail/scale/export, `TOOLCRAFT_TEST_PORT=3024 pnpm verify:perf`, and `TOOLCRAFT_TEST_PORT=3025 pnpm verify:final` passed.
- Skipped checks: No dependency install because dependencies and lockfile were unchanged.
- Risks: No known open performance risks after sequential browser perf passed.

### Iteration 4 — Background include export and preview parity

- Request: Fix the Background Include behavior: when Include is on, preview and PNG export include the selected background; when Include is off, preview and PNG export become transparent; video export still keeps the background.
- Task type: Export/renderer bug fix for runtime background mapping.
- User-visible result: The Background switch now controls the product-rendered live preview background and PNG alpha consistently, and turning it back on restores opaque background output.
- Source/reference checked: `src/routes/index.tsx`, `src/app/brick-mosaic-renderer.tsx`, `src/app/brick-mosaic-render.ts`, local Toolcraft export helper, browser PNG alpha tests, and current Toolcraft background contract.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/schema-reference.md`, `docs/toolcraft/component-rules.md`, `docs/toolcraft/acceptance-testing.md`, and the current Toolcraft background/export contract from the source template.
- Contract rules applied: `output-export-required`, `controls-product-coverage`, `canvas-surface-preserved`, and `acceptance-product-observable`.
- Decision: Keep the generated `src/toolcraft` runtime copy untouched, add an app-local preview include guard for this exported app, and pass the export helper `includeBackground` value into `renderBrickMosaicToContext`.
- Alternatives rejected: Relying on CSS or the Toolcraft canvas shell for export background, and keeping preview opaque when Include is off.
- State/output mapping: `export.includeBackground` drives preview product background visibility and PNG alpha; `appearance.background` supplies the fill color; video remains background-inclusive by contract.
- Files changed: `src/app/brick-mosaic-renderer.tsx`, `src/routes/index.tsx`, background acceptance tests/docs, and this worklog.
- Verification: `pnpm test`, `TOOLCRAFT_TEST_PORT=3033 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "background include" --workers=1`, and `pnpm build` passed.
- Skipped checks: Full performance suite skipped because this pass changes background alpha/export wiring only, not renderer workload or performance-sensitive controls.
- Risks: No open design risk after decoded PNG alpha verification passed for both Include states.

### Iteration 5 — Startup portrait preset

- Request: Use the provided portrait image and `brick-mosaic-settings.json` values as the app startup state.
- Task type: Startup media flow and schema default update for an existing product app.
- User-visible result: A fresh app load starts with the bundled `1672x941` portrait image, high-detail brick settings, dark background, and the imported settings JSON values; users can still replace or clear the image through the existing Source Image file control.
- Source/reference checked: `~/Desktop/image.png`, `~/Downloads/brick-mosaic-settings.json`, `src/app/app-schema.ts`, `src/routes/index.tsx`, `src/toolcraft/runtime/state/reducer.ts`, and browser fileDrop output.
- Docs/contracts read: `workflow.md`, `assembly-workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `brainstorming`, `writing-plans`, `systematic-debugging`, and `browser`.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `acceptance-product-observable`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Copy the requested image into `public/startup`, define the requested preset values in an app-local preset module, set schema defaults from those values, bump persistence to `v2` so stale localStorage does not override the requested startup settings, and import startup media once through the standard `media.import` command from a non-visual canvas child.
- Alternatives rejected: Editing copied Toolcraft runtime to add an `initialState` prop, rendering the startup image outside runtime media state, hardcoding the data URL into source, or leaving persistence at `v1` where old saved settings could hide the new startup defaults.
- State/output mapping: `BrickMosaicStartupMedia` fetches `/startup/brick-mosaic-start.png` and dispatches `media.import`; `media.import` sets `state.mediaAssets` and intrinsic canvas size; `brickMosaicStartupValues` feed schema `defaultValue` entries for `brick.*`, `stud.*`, `tone.*`, `lighting.*`, `appearance.background`, and `export.image.*`; the renderer/export paths continue to read runtime state.
- Files changed: `public/startup/brick-mosaic-start.png`, `src/app/brick-mosaic-startup-preset.ts`, `src/app/brick-mosaic-startup-media.tsx`, `src/app/app-schema.ts`, `src/routes/index.tsx`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `e2e/app-brick-mosaic.spec.ts`, and this worklog.
- Verification: `pnpm verify:quick`, `pnpm build`, and `TOOLCRAFT_TEST_PORT=3028 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: (startup preset loads requested image and settings|source image import and clear update brick mosaic output|brick mosaic renderer maps uploaded image to bricks)" --workers=1` passed.
- Skipped checks: Full performance suite skipped because the renderer workload implementation and performance-sensitive controls were not changed; startup image uses existing high-detail defaults already covered by performance scenarios.
- Risks: Existing browser localStorage under the old `v1` key is intentionally ignored by the new `v2` persistence key; users who want old presets can still import them through Settings Transfer.

## Decisions

### Renderer

- Decision: Canvas 2D custom renderer with a cached tiny pixelated source canvas, cached rounded masks, cached Canvas 2D brick/stud relief overlays, deterministic preview-only local grid permutations during Scale interaction, and a cached persistent Chaos permutation shared by preview and export.
- Reason: The product is a dense image-derived brick composition with preview/export parity; Canvas 2D can draw the geometric overlays and encode through the standard PNG helper.
- Evidence: `src/app/brick-mosaic-render.ts`, `src/app/brick-mosaic-renderer.tsx`, renderer technique matrix in `docs/superpowers/specs/2026-06-24-brick-mosaic-design.md`, `appPerformance.rendererTechnique`, and passing browser output/hash tests.

### Timeline

- Decision: No timeline.
- Reason: The requested product is a still image transformation with no playback, keyframes, scrub, duration, loop, or export-at-time behavior.
- Evidence: `appTransferMode.animationIntent.mode` is `none`; `panels.timeline` is omitted.

### Layers

- Decision: No layers.
- Reason: The app has one uploaded image source and one final rendered product; there are no multiple editable objects, reorder, visibility, selection, or groups.
- Evidence: `panels.layers` is omitted and acceptance has no layer coverage rows.

### Controls

- Decision: Use built-in controls grouped by product workflow: Source Image; Brick Grid with Detail, Scale, Chaos, Gap, Corners, and Bevel; Studs; Tone; Lighting; Background; and Image Export.
- Reason: Built-ins cover upload, sliders, switches, vector direction, color, selects, settings transfer, and footer action needs without custom controls.
- Evidence: `src/app/app-schema.ts`, Control Section Inventory in the spec, startup preset defaults in `src/app/brick-mosaic-startup-preset.ts`, and `src/app/app-acceptance.ts`.

### Export

- Decision: Still output exposes one sticky `Export PNG` action and separate Image Export format/resolution controls.
- Reason: Toolcraft requires image export delivery for still products; helper-managed resolution/background preserves PNG transparency behavior and 2K/4K/8K output dimensions.
- Evidence: `src/routes/index.tsx` calls `createToolcraftPngExportCanvas` with runtime `includeBackground` and `resolution`; browser tests decode exported dimensions and alpha; `TOOLCRAFT_TEST_PORT=3021 pnpm verify:final` passed.

### Performance

- Decision: Classify detail, scale, render scale, and image export resolution as workload controls; cache repeated renderer work without lowering selected quality; keep the held Scale local shuffle inside the existing Scale workload path; classify persistent Chaos as responsiveness because it changes cached source mapping without changing primitive count; all other visible controls get responsiveness scenarios.
- Reason: Those controls change brick count, backing pixels, or export size; source sampling, rounded masks, and brick relief are repeated across many cells and can be reused safely when keyed by output-affecting settings.
- Evidence: `src/app/app-performance.ts` declares workload targets, stress fixtures, renderer layer inventory, media import, preview, export-copy, viewport stability, and zoom stress scenarios; `TOOLCRAFT_TEST_PORT=3022 pnpm verify:perf` and `TOOLCRAFT_TEST_PORT=3024 pnpm verify:perf` passed sequentially.

## Evidence

- Source reviewed: user image references, `src/app/app-schema.ts`, `src/routes/index.tsx`, `src/app/brick-mosaic-render.ts`, Toolcraft runtime schema/export/control docs, vector/select control DOM, and e2e helper contracts.
- Contract applied: Toolcraft runtime shell, built-in schema controls, product-only canvas content, required background/image export sections, explicit persistence, acceptance coverage, and performance stress fixtures.

## Verification

- Run: `pnpm verify:quick` passed.
- Run: `TOOLCRAFT_TEST_PORT=3021 pnpm verify:final` passed; 73 browser tests passed after docs, integrity, unit tests, and build.
- Run: `TOOLCRAFT_TEST_PORT=3022 pnpm verify:perf` passed; 3 performance matrix tests and 27 sequential browser perf tests passed.
- Run: `TOOLCRAFT_TEST_PORT=3023 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser perf: (brick mosaic stress preview render|canvas-render-scale-drag|brick-detail-drag|brick-scale-drag|brick mosaic export copy)" --workers=1` passed; 5 targeted browser perf tests passed.
- Run: `TOOLCRAFT_TEST_PORT=3024 pnpm verify:perf` passed; 3 performance matrix tests and 27 sequential browser perf tests passed after the renderer cache optimization.
- Run: `TOOLCRAFT_TEST_PORT=3025 pnpm verify:final` passed; docs, integrity, unit tests, build, and 73 browser tests passed after the renderer cache optimization.
- Run: `TOOLCRAFT_TEST_PORT=3028 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: (startup preset loads requested image and settings|source image import and clear update brick mosaic output|brick mosaic renderer maps uploaded image to bricks)" --workers=1` passed; 3 targeted browser tests passed for startup media and source replacement/clear.
- Run: `pnpm build` passed after the startup preset change.
- Run: `TOOLCRAFT_TEST_PORT=3034 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: brick scale drag scrambles and reassembles bricks" --workers=1` passed.
- Run: `TOOLCRAFT_TEST_PORT=3034 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: brick scale changes product output|browser perf: brick-scale-drag" --workers=1` passed; 2 targeted tests passed.
- Visual QA: Playwright screenshots at `1440x1000` confirmed the held Scale state visibly scatters bricks and release restores a stable aligned grid without viewport movement.
- Run: `TOOLCRAFT_TEST_PORT=3034 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: brick scale drag locally swaps and reassembles bricks|browser: brick scale changes product output|browser perf: brick-scale-drag" --workers=1` passed; 3 targeted tests passed after the corrected local-swap implementation.
- Visual QA: Updated Playwright screenshots at `1440x1000` confirmed every held-state brick remains aligned and unrotated while nearby colors exchange cells, then returns to the exact assembled portrait.
- Run: Focused 300 ms assembly acceptance and `brick-scale-drag` passed; live Chromium measured 382 ms from release observer setup through final `assembled` state.
- Run: `TOOLCRAFT_TEST_PORT=3035 pnpm verify:perf` completed with 24/27 browser perf scenarios passing, including `brick-scale-drag`; unrelated media import, saturation, and contrast budgets failed and were reproduced with a focused rerun on port 3036.
- Run: `TOOLCRAFT_TEST_PORT=3034 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: brick scale drag locally swaps and restores final image|browser: brick scale changes product output|browser perf: brick-scale-drag" --workers=1` passed; 3 targeted tests passed after removing release animation.
- Visual QA: Fresh dev server on port 3007 showed the held shuffled grid and immediate final portrait after release; `data-brick-assembly-phase` was absent.
- Run: `pnpm verify:quick` passed with 169 tests after adding persistent Chaos.
- Run: `TOOLCRAFT_TEST_PORT=3040 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: brick chaos changes final output|browser perf: brick-chaos-drag" --workers=1` passed; exact zero restoration, strong maximum disruption, and the focused responsiveness budget were verified.
- Visual QA: Fresh dev server on port 3042 showed the bundled portrait fully assembled at `0%`, nearly unrecognizable at `100%`, and fully restored after returning to `0%`.
- Run: `pnpm verify:quick` passed with 169 tests after changing the Chaos base value to `25%` and persistence to `v3`.
- Run: `TOOLCRAFT_TEST_PORT=3044 pnpm exec playwright test e2e/app-brick-mosaic.spec.ts --grep "browser: startup preset loads requested image and settings|browser: brick chaos reset restores base value|browser: brick chaos changes final output" --workers=1` passed; 3 focused browser tests verified startup, Reset, and exact `0%` behavior.
- Run: `TOOLCRAFT_DEV_PORT=3011 pnpm dev` started the local app at `http://localhost:3011/`.
- Run: `TOOLCRAFT_DEV_PORT=3042 pnpm dev` started the updated local app at `http://localhost:3042/`.
- Note: `TOOLCRAFT_TEST_PORT` was used because `localhost:3002` was already occupied by an unrelated local server; no existing server was stopped.

## Risks

- Risk: No known remaining product risks after final delivery verification.

### Iteration 12 — Canonical Toolcraft demo subpath

- User-visible result: The production build and Vercel deployment now serve the app at `/demos/bricks/`, including its startup image and nested client routes.
- Contract applied: The Vite base and TanStack Router base path share `import.meta.env.BASE_URL`; the startup media URL is resolved from that base. Local development remains rooted at `/`.
- Verification tier: Tier 2. `pnpm build`, `pnpm verify:quick` (3 files, 169 tests), and a browser load through the website rewrite all passed with the canonical URL retained and no application console errors or non-favicon 4xx responses.

#### Thermo-nuclear review remediation

- Result: Vercel now routes generated assets and `/startup/*` media before the final SPA fallback, so direct non-file descendants receive the application HTML without breaking the startup image.
- Verification: the exhaustive four-test gateway contract, production build, canonical root browser load, and `/demos/bricks/review-deep-link` reload passed with `200 text/html` and no failed asset responses. The existing quick-gate result above remains current because this pass changes deployment routing only.

### Iteration 13 — Shared Toolcraft social preview

- User-visible result: Social shares of the app now use the main Toolcraft 1200×630 preview image through Open Graph and Twitter metadata.
- Source and contract: `apps/website/public/social-previews/og-toolcraft-v2.jpg` remains the single asset source. The metadata uses its absolute `https://toolcraft.sh/` URL so neither the `/demos/bricks/` Vite base nor a direct Vercel hostname can rewrite it incorrectly.
- Verification tier: Tier 0. Product schema, runtime state, renderer, canvas, exports, and performance are unchanged. The repository metadata contract, production build, built-HTML base-path inspection, website typecheck/build, starter tests/typecheck, CLI generation tests, and Frozen signed integrity check passed; production verification follows the pushed commit.
