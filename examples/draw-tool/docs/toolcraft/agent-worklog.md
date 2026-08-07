# Implementation Worklog

## Status

Mode: product

Product: Suminagashi Draw.

## Verification Tier

Verification tier: Tier 2
Reason: Changing `ink.palette`'s schema default affects fresh state and Reset behavior for one compound control while preserving its target, renderer mapping, layout, persistence policy, and export paths.
Run: `pnpm verify:quick`, the exact schema unit assertion, and a focused browser check that Reset selects Amber family shade 500.
Skip: full `pnpm verify:perf` because a constant default-value change adds no renderer, viewport, animation, or export workload.

## Control Section Inventory

- Ink: `ink.palette`. The section owns the next dye color; `palette` is the exact built-in because the value model is constrained family plus shade. Its default and Reset value is Amber 500, matching the supplied screenshot, and the app uses that Palette color for manual strokes and Auto drops.
- Brush: `brush.size`, `brush.load`, `brush.wetness`, `brush.settle`, `brush.taper`, `brush.flow`. The section owns direct painting behavior: stroke thickness, pigment density, in-stroke spread, post-release solver duration, post-release stop smoothness, and brush-driven water movement. Sliders are built-ins because each value is a numeric continuous setting.
- Flow: `flow.auto`, `flow.clearSignal`. The section owns optional idle reference drops/stirring and the local half-width Clear action.
- Paper: `paper.texture.enabled`, `paper.texture.grain`, `paper.texture.scale`, `paper.texture.fiber`, `paper.texture.mottle`. The section owns optional procedural paper surface texture. Texture defaults off to preserve the flat beige paper baseline; dependent sliders are unavailable while Texture is off.
- Background: `export.includeBackground`, `appearance.background`. Required output background controls sit directly before export settings; Include controls PNG/preview alpha.
- Image Export: `export.image.format`, `export.image.resolution`. Required image delivery settings in one compact row.
- Export footer: `export-image`. Sticky image delivery action only.

## Decision Trail

### Iteration 1 — Reference Suminagashi Port

- Request: Study `https://suminagashi-fjdbyyqi.manus.space/`, inspect source, and port the drawing behavior into this Toolcraft app with Palette-based color selection and flat beige paper without texture.
- Task type: Reference app porting, schema controls, custom renderer, export, acceptance, performance.
- User-visible result: The app opens as a Toolcraft editor with a fixed beige suminagashi drawing canvas, pointer ink drops/strokes, optional Auto drops/stirring, Palette-selected ink, Wash, PNG/JPG export, and WebM/MP4-preferred video export.
- Source/reference checked: The reference inline source: WebGL/Three.js Stable Fluids, `SIM_RES: 256`, `DYE_RES: 1280`, `PRESSURE_ITER: 28`, `VEL_DISSIPATION: 0.16`, `DYE_DISSIPATION: 0.07`, `CURL: 14`, `SPLAT_RADIUS: 0.0026`, `SPLAT_FORCE: 5200`, absorption dye field, pointer splats, auto drops/stir, wash.
- Docs/contracts read: `workflow.md`, `assembly-workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `custom-controls.md`, `renderer-technique.md`, `acceptance-testing.md`, `performance.md`.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `reference-clone-source-of-truth`, `renderer-technique-inventory`, `controls-product-coverage`, `output-export-required`, `persistence-policy-explicit`, `performance-coverage-levels`, `workflow-required`.
- Decision: Use `defineToolcraft`, `ToolcraftApp`, schema controls, `canvasContent`, and `onPanelAction`. Implement the reference fluid algorithm directly in WebGL2 instead of copying the reference UI or adding Three.js. Use fixed `1920x1080` output because the reference has no user-facing output-size workflow and runtime editable-size ordering conflicts with this generated validator; keep `Resolution scale` for backing pixels.
- Alternatives rejected: iframe/reference shell because Toolcraft must own the shell; Canvas 2D because pressure/advection would move dense pixel work to CPU; DOM/SVG because the product is a pixel fluid field; texture noise/vignette because the user requested plain beige paper without texture; settings transfer because live dye/velocity state is session-only and not portable, while localStorage persistence covers user-edited controls.
- State/output mapping: `ink.mode` and `ink.palette` choose future splat color; `flow.auto` controls optional idle drop/stir scheduling; `flow.washSignal` increases dye dissipation; `export.includeBackground` and `appearance.background` drive preview alpha and PNG/JPG background; `export.image.*` drives image encoding and resolution; `export.video.*` drives MediaRecorder MIME preference and resolution target; renderer state holds velocity/dye/pressure FBOs and renders only product pixels.
- Files changed: `src/app/app-schema.ts`, `src/app/suminagashi-fluid.ts`, `src/app/suminagashi-renderer.tsx`, `src/routes/index.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `e2e/app-browser-acceptance.spec.ts`, `e2e/app-performance.spec.ts`, `package.json`, `plans/suminagashi-port-plan.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `pnpm ai:check`, `pnpm test`, `pnpm verify:perf`, and `pnpm verify:final`; `pnpm dev` remains the final local run step.
- Skipped checks: None for final; `pnpm install` skipped because dependencies were unchanged.
- Risks: Video export uses MediaRecorder on the live WebGL canvas and not an offline frame-timestamp muxer; PNG/JPG export composites the current WebGL preview through the standard canvas helper.

### Iteration 2 — Brush-First Drawing Cadence

- Request: Make the app stop behaving as if it is always animated; painting should happen when the user paints, inks should then spread, and continuous drag must feel like a brush instead of dotted splats.
- Task type: Reference algorithm correction, pointer path handling, default state, browser acceptance.
- User-visible result: The default canvas starts as calm flat beige paper. Auto is off by default and can be enabled for the reference idle drops/stirring. Pointer drag queues movement segments and interpolates dye/velocity splats along the path so fast strokes read as a continuous brush mark.
- Source/reference checked: Reference inline source showed `pointerdown` drops ink immediately, `pointermove` stores motion, `applyPointer` applies velocity and low-strength dye while down, and Auto drops only after idle time; the reference does not texture the paper.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `acceptance-testing.md`, `performance.md`.
- Contract rules applied: `reference-clone-source-of-truth`, `canvas-no-app-ui`, `renderer-technique-inventory`, `controls-product-coverage`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`.
- Decision: Disable the initial seed and default Auto flow, reset persistence to v2, render pointerdown immediately, and turn fast pointer motion into sampled brush segments. New pointer input interrupts pending pressure batching so strokes appear before the remaining fluid solve continues.
- Alternatives rejected: Always-running seed animation because the user clarified the canvas should not be animated until painting or Auto; per-frame single-point pointer splats because they leave dotted gaps during fast continuous movement; reducing render scale because quality/performance controls must preserve the user's selected backing pixels.
- State/output mapping: `flow.auto` defaults to `false`; enabling it restores reference idle drops/stirring. Pointer segment samples write dye and velocity into the same WebGL FBOs as reference splats, then normal advection/projection spreads the ink over following frames.
- Files changed: `src/app/suminagashi-fluid.ts`, `src/app/app-schema.ts`, `src/app/suminagashi-renderer.tsx`, `src/app/app-performance.ts`, `src/app/app-acceptance.ts`, `src/app/app-schema.test.ts`, `e2e/app-controls.spec.ts`, `plans/suminagashi-port-plan.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed direct `tsc`, direct `vitest run src --passWithNoTests` with 177 tests, docs/integrity/script checks, direct `vite build`, and manual Playwright browser probes. Browser evidence: blank paper stayed `0->0` sampled dark pixels, fast brush stroke hit `21/25` dark line samples, stroke pixels changed after 70 frames, Auto produced sampled dark pixels `0->346`, targeted perf measured Auto toggle `102.6ms` with `49.4ms` max gap, Auto animation `116.7ms` max gap and `124.0ms` long task, painted renderScale 1 animation `41.7ms` max gap with no long tasks, painted default 2x animation `58.5ms` max gap with `62ms` max long task, and fast stroke `277.5ms` with `41.5ms` max gap.
- Skipped checks: `pnpm verify:quick` and config-driven Playwright were not used because this Codex runtime's `pnpm exec` runs a dependency status install that fails with `ERR_PNPM_IGNORED_BUILDS esbuild@0.28.1`; equivalent direct binaries and manual Playwright probes were used instead.
- Risks: Pointer path rendering now uses a single line-splat shader per movement segment; this is faster than multi-stamp interpolation but can look slightly more continuous than the reference when the browser emits very sparse pointer events.

### Iteration 3 — Watercolor Brush Controls And Live Spread

- Request: Make ink spread immediately while drawing on the canvas instead of only after pointer release, and add realistic watercolor brush settings such as blur/spread strength and brush thickness.
- Task type: Renderer behavior correction, schema controls, acceptance coverage, performance coverage.
- User-visible result: The app now exposes a `Brush` section with `Size`, `Load`, `Wetness`, and `Flow`. While the pointer is still pressed, the current stroke visibly spreads across animation frames before `mouseup`.
- Source/reference checked: Reference inline pointer loop (`pointermove` stores motion and `applyPointer` splats dye/velocity while down), existing WebGL pressure batching in `src/app/suminagashi-fluid.ts`, and local browser evidence showing previous pressure batching delayed visible advection until pointer input settled.
- Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `renderer-technique.md`, `performance.md`, `decision-contract.md`.
- Contract rules applied: `reference-clone-source-of-truth`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, `workflow-required`.
- Decision: Keep the full pressure projection for ongoing simulation but add an immediate wet preview advection step whenever pointer segments are applied while the pointer is down. Brush settings map to line-splat radius (`Size`), absorption strength (`Load`), immediate in-stroke advection (`Wetness`), and brush velocity (`Flow`). Brush display changes no longer redraw the current display composite on every slider tick because they affect future splats, not existing pixels.
- Alternatives rejected: Waiting for the pressure solve to complete because repeated pointer events reset/delay visible diffusion; adding a fake CSS/canvas blur because the output must stay in the WebGL dye/velocity field; adding custom brush controls because built-in sliders express the numeric value model; lowering render scale because performance fixes must preserve selected quality.
- State/output mapping: `brush.size`, `brush.load`, `brush.wetness`, and `brush.flow` are persisted runtime values read by `SuminagashiRenderer` and passed into `SuminagashiFluidEngine`. Pointer splats consume those values when writing dye and velocity FBOs; `previewWetStep` advects those FBOs while the pointer remains down.
- Files changed: `src/app/app-schema.ts`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `docs/superpowers/plans/2026-06-26-watercolor-brush-controls.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `./node_modules/.bin/tsc -p tsconfig.json --noEmit` and targeted `./node_modules/.bin/vitest run src/app/app-schema.test.ts src/app/app-acceptance.test.ts src/app/app-performance.test.ts` with 182 tests. Manual Playwright evidence: live spread changed before pointerup; Size coverage increased `221->3762`; Load darkness increased `928->6889`; targeted perf measured Size drag `359.7ms` with `25.7ms` max gap, Wetness drag `267.0ms` with `9.1ms` max gap, and held wet stroke `2781.9ms` with `133.3ms` max gap and `127ms` max long task.
- Skipped checks: Full `pnpm verify:perf` and config-driven Playwright were skipped for this Tier 3 iteration because the first product version already passed full perf and this environment's `pnpm exec` still fails on ignored `esbuild@0.28.1` builds; direct binaries and manual browser probes were used instead.
- Risks: The immediate wet preview is an intentional approximation layered before full pressure projection; it makes drawing feel wet immediately but may be slightly more responsive than the original reference's batched fluid solve on extremely slow hardware.

### Iteration 4 — Active Stroke Performance

- Request: Optimize drawing performance because the app lags while painting.
- Task type: Performance issue, custom WebGL renderer, pointer input, browser verification.
- User-visible result: Heavy continuous brush strokes remain continuous and spread while the pointer is still down, but the active drawing path no longer stalls on every raw pointer event.
- Source/reference checked: `src/app/suminagashi-fluid.ts` pointer queue, pressure batching, wet preview, display composite, and the running app at `http://localhost:3007/`. Baseline heavy browser stroke at `Size=72`, `Load=180`, `Wetness=100`, `Flow=180`, `Resolution scale=2` measured `45.7s`, `216.7ms` max frame gap, `477` long tasks, and `938ms` max long task.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, `brainstorming` with Toolcraft approval override, `writing-plans`, `browser`.
- Contract rules applied: `renderer-technique-inventory`, `performance-coverage-levels`, `acceptance-product-observable`, `reference-clone-source-of-truth`, `canvas-no-app-ui`, `workflow-required`.
- Decision: Coalesce dense pointer input at the source using brush-distance thresholds, cap per-frame queued pointer segments, cache the canvas rect during a stroke, defer full pressure projection while the pointer is down, throttle idle wet-preview renders during held strokes, advect dye only for the lightweight in-stroke preview, and present the dye-sized display composite through an 8-bit target plus WebGL2 framebuffer blit.
- Alternatives rejected: Lowering `canvas.renderScale`, shrinking the selected canvas backing store, downsampling the live canvas, or disabling immediate wet spread because performance fixes must preserve user-selected quality and requested watercolor behavior; replacing line splats with point stamps because that reintroduces dotted strokes.
- State/output mapping: Pointer input writes coalesced continuous line splats into dye/velocity FBOs. `brush.size` determines the coalescing threshold and splat radius; `brush.load`, `brush.wetness`, and `brush.flow` still map to pigment strength, immediate dye advection, and velocity force. Full pressure projection resumes after active input so the same fluid state continues spreading after release.
- Files changed: `src/app/suminagashi-fluid.ts`, `src/app/app-performance.ts`, `docs/superpowers/plans/2026-06-26-drawing-performance.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `./node_modules/.bin/tsc -p tsconfig.json --noEmit` and targeted `./node_modules/.bin/vitest run src/app/app-schema.test.ts src/app/app-acceptance.test.ts src/app/app-performance.test.ts` with 182 tests. Manual Playwright after optimization measured the same heavy stroke at `11.4s`, `99.9ms` max frame gap, `0` frames over `100ms`, `13` long tasks, and `105ms` max long task. Existing continuous fast-stroke sampling logic returned `18/25` dark samples. Held-stroke wetness changed before pointer release (`113` sampled dark cells to `49` after 500ms while still down), proving in-stroke spread remains live.
- Skipped checks: `pnpm verify:perf` and config-driven Playwright were not run because this runtime's `pnpm exec` still triggers dependency status installation and fails on ignored `esbuild@0.28.1` builds; direct local binaries and manual Playwright scenarios against the already running Vite server were used instead. Full browser perf remains available once pnpm/build approvals are repaired.
- Risks: The active stroke renderer now coalesces very dense raw pointer streams, so extremely sharp high-speed zigzags may be slightly smoothed, but line splats preserve continuous brush coverage and avoid the previous dotted-stroke failure.

### Iteration 5 — Drying Stops Hover Drift

- Request: Do not keep spreading just because the user moves the mouse; paint should spread while drawing, then fade/settle and become static.
- Task type: Renderer behavior correction, pointer input lifecycle, browser verification.
- User-visible result: Hover movement no longer injects water velocity into existing ink. Pressed brush strokes still spread while drawing, keep settling briefly after release, then freeze as a static dry painting.
- Source/reference checked: `src/app/suminagashi-fluid.ts` pointer event flow, `applyPointerSegment`, drying/active simulation loop, and manual browser hashes from the running app at `http://localhost:3007/`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, `brainstorming` with Toolcraft approval override, `writing-plans`.
- Contract rules applied: `reference-clone-source-of-truth`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `canvas-no-app-ui`, `workflow-required`.
- Decision: Return early from hover-only `pointerMove`; only pressed pointer input queues dye/velocity line splats. Add a wetness-based drying window for real paint/wash input, and when it expires clear velocity/pressure FBOs while preserving dye pixels.
- Alternatives rejected: Continuing to use hover as a velocity brush because it makes dry ink move without painting; stopping immediately on `pointerup` because the user wants a visible settling phase; clearing dye on dry because the final painting should remain visible.
- State/output mapping: `brush.wetness` controls both live in-stroke spread and the drying duration. Dye FBO remains as the visible dried image; velocity/pressure FBOs are cleared when dry so later hover or old flow cannot keep moving pigment.
- Files changed: `src/app/suminagashi-fluid.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `docs/superpowers/plans/2026-06-26-drying-settle.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src/app/app-schema.test.ts src/app/app-acceptance.test.ts src/app/app-performance.test.ts`, `./node_modules/.bin/vitest run src --passWithNoTests`, and `./node_modules/.bin/vite build`. Manual Playwright browser probes showed `liveSpreadChanged=true`, `postReleaseChanged=true`, `dryStable=true`, `hoverStable=true`, and final sanity `wetChanged=true`, `hoverStableAfterDry=true`.
- Skipped checks: Full config-driven Playwright and `pnpm verify:perf` remain skipped because `pnpm exec` fails in this runtime on ignored `esbuild@0.28.1` builds; direct binaries and manual Playwright probes were used instead.
- Risks: Very wet strokes now have a finite settling window rather than indefinite fluid motion; this matches the requested dry watercolor behavior but is less like a forever-running fluid demo.

### Iteration 6 — Post-Release Settle Performance

- Request: Fix the new lag that starts when the mouse is released after drawing.
- Task type: Performance issue, custom WebGL renderer, pointer release lifecycle, browser verification.
- User-visible result: Releasing the brush no longer synchronously blocks on final WebGL splats or starts a full pressure solve loop; the painting still settles briefly after release and then becomes static.
- Source/reference checked: `src/app/suminagashi-fluid.ts` `pointerUp`, `frame`, drying branch, and manual phase-split browser measurement at `Size=72`, `Load=180`, `Wetness=100`, `Flow=180`, `Resolution scale=2`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, `brainstorming` with Toolcraft approval override, `writing-plans`.
- Contract rules applied: `renderer-technique-inventory`, `performance-coverage-levels`, `acceptance-product-observable`, `canvas-no-app-ui`, `workflow-required`.
- Decision: Make `pointerUp` queue the final brush segment only, then let the next animation frame apply it. During ordinary post-release drying, use throttled dye-only wet preview instead of calling the full `step()` pressure/curl/divergence pipeline every frame. Keep full solve path for Auto and Wash.
- Alternatives rejected: Reducing render scale or dye resolution because quality must remain user-selected; freezing immediately on release because the user wants a short settling phase; keeping final splats inside the mouseup event because that blocks the release interaction.
- State/output mapping: Final pointer segment still writes dye/velocity through the existing splat path, but the work runs in the renderer frame loop. `brush.wetness` continues to control settling duration; the drying branch updates dye and display at a lighter cadence, then freezes velocity/pressure while preserving dye.
- Files changed: `src/app/suminagashi-fluid.ts`, `src/app/app-performance.ts`, `docs/superpowers/plans/2026-06-26-drying-settle.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Baseline phase split measured release `maxFrameGap=132.5ms`, `over100=3`, `longTaskMax=137ms`; after optimization release measured `maxFrameGap=91.6ms`, `over100=0`, `longTaskMax=92ms`. Manual browser behavior probe showed `heldChanged=true`, `releaseChanged=true`, and `hoverStableAfterDry=true`.
- Skipped checks: Full config-driven Playwright and `pnpm verify:perf` remain skipped because `pnpm exec` fails in this runtime on ignored `esbuild@0.28.1` builds; direct binaries and manual Playwright probes were used instead.
- Risks: Post-release settling is intentionally lighter than a full fluid solve; the visible watercolor behavior remains, but the pressure projection no longer runs continuously during drying.

### Iteration 7 — Active Stroke Performance

- Request: Drawing performance is still poor, and releasing the mouse can start lagging.
- Task type: Performance issue, custom WebGL renderer, active pointer lifecycle, browser verification.
- User-visible result: Heavy brush strokes stay responsive while drawing, and release no longer starts a janky post-stroke phase. Ink still visibly spreads while the pointer is held, briefly settles after release, then becomes static.
- Source/reference checked: `src/app/suminagashi-fluid.ts` `pointerDown`, `applyPointer`, active `frame` branch, `pointerSegmentDistanceThreshold`, and phase-split manual browser measurements at `Size=72`, `Load=180`, `Wetness=100`, `Flow=180`, `Resolution scale=2`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, `brainstorming` with Toolcraft approval override, `writing-plans`, `browser`.
- Contract rules applied: `renderer-technique-inventory`, `performance-coverage-levels`, `acceptance-product-observable`, `canvas-no-app-ui`, `workflow-required`.
- Decision: Limit active pointer work to six coalesced continuous line splats per frame, increase large-brush segment spacing, throttle active display composite to roughly 40 fps, run wet-preview advection during held strokes on a 64 ms cadence, and present the first pointerdown drop in the next animation frame instead of synchronously blocking the first move.
- Alternatives rejected: Reducing selected render scale or dye resolution because performance fixes must preserve user-selected output quality; dropping line splats because continuous brush feel matters; removing in-stroke wet preview because the user explicitly wants paint to spread before release.
- State/output mapping: `brush.size` affects both splat radius and segment spacing, so wider brushes queue fewer visible-equivalent line segments. `brush.wetness` still controls live held-stroke spread and drying duration. Display throttling affects only presentation cadence during active input; the dye/velocity state remains the product output.
- Files changed: `src/app/suminagashi-fluid.ts`, `src/app/app-performance.ts`, `docs/superpowers/plans/2026-06-26-drying-settle.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Before the active-stroke fix, heavy no-pause stress measured drag `maxFrameGap=158.3ms`, `over100=14`, `longTaskMax=151ms`; release was already improved to `maxFrameGap=50ms`, `over100=0`. A split probe isolated the bad peak to first movement immediately after `pointerdown`: delayed-move stroke measured `down maxFrameGap=24.9ms`, `move maxFrameGap=66.2ms`, `release maxFrameGap=41.6ms`. After deferring pointerdown display and throttling active work, the same heavy no-pause stress measured drag `maxFrameGap=50.1ms`, `over100=0`, `longTaskMax=0`, and release `maxFrameGap=25.1ms`, `over100=0`, `longTaskMax=0`. Behavior probe showed `heldChanged=true`, `releaseChanged=true`, and `hoverStableAfterDry=true`. Direct checks passed: `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests`, and `./node_modules/.bin/vite build`.
- Skipped checks: Full config-driven Playwright and `pnpm verify:perf` remain skipped because `pnpm exec` fails in this runtime on ignored `esbuild@0.28.1` builds; direct binaries and manual Playwright probes were used instead.
- Risks: Active-stroke display is intentionally throttled under heavy input, so ultra-fast strokes may present at a lower cadence than the simulation queue; line splats keep the mark continuous and wet-preview still updates while held.

### Iteration 8 — Half-Width Clear Fade

- Request: Make the Wash button 50% width with a different label, and make it immediately clear everything through a fast fade.
- Task type: Schema action layout, control labeling, custom WebGL renderer behavior, browser verification.
- User-visible result: The Flow section now shows Auto and Clear in one two-column row, so Clear occupies half the row. Clicking Clear quickly fades existing ink to blank paper and stops fluid motion immediately.
- Source/reference checked: `src/app/app-schema.ts` Flow section, `src/routes/index.tsx` panel action dispatch, `src/app/suminagashi-renderer.tsx` signal watcher, `src/app/suminagashi-fluid.ts` dye/velocity/pressure framebuffer lifecycle, and the running app at `http://localhost:3008/`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `renderer-technique.md`, `acceptance-testing.md`, `performance.md`; skills used: Toolcraft `brainstorming`, `writing-plans`.
- Contract rules applied: `controls-layout-heuristics`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `workflow-required`.
- Decision: Rename the local action to `Clear`, change its signal target to `flow.clearSignal`, pair it with `flow.auto` in an inline two-column layout, and add app-scoped CSS so the action button fills its half-width cell. Replace the old wash behavior with `clearWithFade()`. The engine clears velocity and pressure immediately, then fades the dye framebuffer over `180ms` before clearing dye fully.
- Alternatives rejected: Keeping the label `Wash` because the behavior is now clear, not dissipation; making Clear full-width because the user asked for 50%; instantly zeroing dye with no visible transition because the requested behavior is a quick fade; lowering render scale because the action can be handled by existing framebuffer clear passes.
- State/output mapping: The Clear action dispatches `flow.clearSignal`; the renderer observes that signal and calls `clearWithFade()`. The WebGL clear pass multiplies dye opacity down over the fade window, while velocity and pressure are already zeroed so no old motion restarts the painting.
- Files changed: `src/app/app-schema.ts`, `src/routes/index.tsx`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/styles.css`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-acceptance.test.ts`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, `docs/superpowers/plans/2026-06-26-clear-fade.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Manual Playwright probe on `http://localhost:3008/` measured the Flow inline group at `274px`, Clear action cell at `133px`, and Clear button at `133px`, proving half-width layout. The same probe drew ink and clicked Clear; dark canvas samples fell from `514` to `0` after the fast fade. Direct checks passed: `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests`, and `./node_modules/.bin/vite build`.
- Skipped checks: Full `pnpm verify:perf` is skipped because this is a focused action/renderer behavior pass; targeted browser and direct checks cover the changed path.
- Risks: The internal historical warm-up path still contains the older `washing` field for solver warm-up compatibility, but the visible product action no longer exposes wash dissipation.

### Iteration 9 — Palette First Stroke

- Request: Palette color selection does not always apply on the first drawing stroke; investigate why.
- Task type: Broken control behavior, schema default, persistence migration, browser verification.
- User-visible result: Palette-backed drawing is now the default. Selecting a color from Palette and drawing immediately uses that selected color on the first stroke.
- Source/reference checked: `src/app/app-schema.ts` Ink section, `src/app/suminagashi-renderer.tsx` palette-to-settings mapping, `src/app/suminagashi-fluid.ts` `currentInkColor()` and `pointerDown()`, PaletteControl live/commit flow, and browser probes against `http://localhost:3008/`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, Toolcraft `brainstorming`, `writing-plans`.
- Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `persistence-policy-explicit`, `renderer-technique-inventory`, `workflow-required`.
- Decision: Set `ink.mode` default to `single`, put `Single` first in the mode menu, clarify that `Single` uses Palette and `Cycle` rotates reference colors, and bump localStorage persistence from `v3` to `v4` so previously saved `cycle` state does not keep overriding Palette after the fix.
- Alternatives rejected: Leaving `Cycle` as the default because it makes the visible Palette choice look broken; removing `Cycle` entirely because the reference-style rotating ink option is still useful when explicitly selected; changing the Palette component because it already emits live values correctly.
- State/output mapping: `ink.palette` still maps through `getPaletteHex()` into `settings.paletteHex`. With default `ink.mode = "single"`, `pointerDown()` reads `settings.paletteHex` for the first brush color. Explicit `Cycle` continues to use `cycleInkHexes`.
- Files changed: `src/app/app-schema.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, `docs/superpowers/plans/2026-06-26-palette-first-stroke.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Manual browser reproduction showed the old default `Cycle` path produced a non-blue first stroke after choosing Blue 900 (`r183/g179/b175`), while `Single` produced a blue-dominant stroke. After the fix, a browser probe with stale `v3` localStorage set to `cycle` loaded `Mode=Single`, selected Blue 900, and the first stroke was blue-dominant (`r157/g162/b168`, `blueDominant=true`). Direct checks passed: `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests`, and `./node_modules/.bin/vite build`.
- Skipped checks: Full `pnpm verify:perf` is skipped because this is a focused control default/persistence fix; targeted browser and direct checks cover the changed path.
- Risks: Users who explicitly choose `Cycle` will still get rotating reference colors instead of the Palette color; the Mode tooltip now states that distinction.

### Iteration 10 — Palette Live State And Shade Stability

- Request: Check whether the Palette shade component was broken because the shade switcher starts jerking, and continue investigating why selected colors do not always apply on the first stroke.
- Task type: Broken shared control/runtime binding, browser verification.
- User-visible result: Palette family and shade changes now reach Toolcraft runtime state immediately, so drawing right after a Palette click uses the selected color. The shade indicator remains visually stable and does not jump back after selection.
- Source/reference checked: `PaletteControl` optimistic state, delayed click commit, delayed persist, `ControlsPanel` palette renderer, reducer `controls.setValue`, and browser probes against `http://localhost:3008/`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, Toolcraft `brainstorming` with approval override, `writing-plans`, `browser`.
- Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `panel-host-behavior`, `workflow-required`.
- Decision: Treat Palette as a live control like Slider and Color. Add merged control-history metadata to Palette live/commit events, then wire `ControlsPanel` to `onValueChange` instead of only `onCommit`. Update the local Toolcraft manifest because this intentionally changes shared copied runtime behavior.
- Alternatives rejected: Hiding the apparent shade issue with CSS because the browser evidence showed no CSS selector collision and the deeper bug was delayed state propagation; keeping `onCommit` only because it delays app state by `CLICK_COMMIT_IDLE_MS + PERSIST_SETTLE_MS`; replacing Palette with app-specific controls because the product contract requires the built-in Palette component.
- State/output mapping: `ink.palette` is updated during live family/shade selection, so `SuminagashiRenderer` immediately receives the new `paletteHex` and `pointerDown()` uses it for the next splat when `ink.mode` is `single`.
- Files changed: `src/toolcraft/ui/components/controls/color/palette-control.tsx`, `src/toolcraft/runtime/react/controls-panel.tsx`, `src/toolcraft/.toolcraft-manifest.json`, `docs/superpowers/plans/2026-06-26-palette-live-state.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Before the fix, selecting Red 500 and drawing immediately or after `350ms` produced non-red strokes; only after `650ms` was the stroke red-dominant, matching the delayed commit plus persist timers. After the fix, selecting Red 500 and drawing immediately produced red-dominant output (`r236.5/g195.3/b186.9`, `redDominant=true`). Shade indicator probes from `900 -> 100 -> 900` showed monotonic motion with zero detected reversals and final `Primary shade 900`.
- Skipped checks: Full performance suite is skipped because this pass changes control-state timing, not renderer workload.
- Risks: This is a local copied Toolcraft runtime change. The manifest was updated so generated-app integrity checks treat the shared Palette fix as the current local runtime baseline.

### Iteration 11 — Reference Post-Stroke Settle

- Request: Make post-stroke settling closer to the reference by running true `step(dt)` with pressure, vorticity, and advection for several hundred milliseconds after pointer release, then freeze; avoid returning pointer-up lag and address the visible swirl.
- Task type: Renderer algorithm correction, performance-sensitive post-stroke behavior, browser verification.
- User-visible result: Held strokes still spread immediately while drawing. After release, ink now settles through the same full solver path as the reference for a short wetness-based window, then becomes static so stale velocity cannot keep swirling pigment.
- Source/reference checked: Reference inline source `step(dt)` loop with curl, vorticity, divergence, 28 pressure iterations, gradient subtraction, velocity advection, dye advection, and local `src/app/suminagashi-fluid.ts` post-release `previewWetStep()` shortcut.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`; skills used: `systematic-debugging`, `brainstorming` with Toolcraft approval override, `writing-plans`.
- Contract rules applied: `reference-clone-source-of-truth`, `renderer-technique-inventory`, `performance-coverage-levels`, `acceptance-product-observable`, `canvas-no-app-ui`, `workflow-required`.
- Decision: Keep dye-only `previewWetStep()` only for active held strokes. On `pointerup`, refresh the drying window for active ink so release always receives a post-stroke settle. Replace ordinary post-release drying with bounded full `step(dt)` solver batches, shorten drying to `320ms + wetness * 520ms`, then clear velocity and pressure while preserving dye.
- Alternatives rejected: Keeping post-release dye-only advection because it moves pigment through stale unprojected velocity and causes the swirl-like artifact; running full solver for the former multi-second drying window because that risks returning pointer-up jank; reducing render scale or dye resolution because performance fixes must preserve selected output quality.
- State/output mapping: Pointer splats write dye and velocity FBOs. While `pointer.down` is true, `brush.wetness` controls immediate preview advection. `pointerUp()` refreshes `dryingUntil`; after release, `brush.wetness` controls the bounded full-solver settle duration, and `freezeSettledInk()` clears velocity/pressure so dry pigment is static.
- Files changed: `src/app/suminagashi-fluid.ts`, `src/app/app-performance.ts`, `docs/superpowers/specs/2026-06-26-reference-post-stroke-settle-design.md`, `docs/superpowers/plans/2026-06-26-reference-post-stroke-settle.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Direct checks passed: `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests` with 182 tests, and `./node_modules/.bin/vite build`. Targeted Playwright probe against `http://localhost:3008/` measured `heldDiff=5.184`, `releaseDiff=7.605`, `dryHoverDiff=0`, `darkSamples=750`, and heavy release performance `maxFrameGap=50.1ms`, `over100=0`, `longTaskMax=52ms`.
- Skipped checks: Full `pnpm verify:perf` remains skipped because `pnpm ai:check`/`pnpm exec` still triggers dependency status installation and fails on ignored `esbuild@0.28.1`; direct binaries and targeted browser perf covered the touched pointer-up workload.
- Risks: The post-release solver is still pressure-batched across frames for responsiveness, so it is reference-equivalent in pass sequence but not exactly one full pressure projection per display frame.

### Iteration 12 — Post-Release Settle Slider

- Request: Add a slider for stopping after pointer release, with shorter and longer regulation.
- Task type: Schema control, renderer timing, acceptance coverage, performance coverage.
- User-visible result: The Brush section now includes `Settle`, a `0%` to `200%` slider. Lower values stop released strokes faster; higher values let released strokes keep running the full solver longer before drying static.
- Source/reference checked: Current `src/app/suminagashi-fluid.ts` post-release `extendDrying()` and `frame()` full-solver branch, `src/app/app-schema.ts` Brush controls, and local Toolcraft schema/control/performance contracts.
- Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `renderer-technique.md`, `performance.md`, `decision-contract.md`; skills used: `brainstorming` with Toolcraft approval override and `writing-plans`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, `workflow-required`.
- Decision: Add built-in slider target `brush.settle` in the Brush section after `Wetness`, default `100`, range `0-200%`, and use it as a multiplier for the existing wetness-based post-release full-solver duration. Keep shader quality, pressure iteration count, render scale, and in-stroke wet preview unchanged.
- Alternatives rejected: A select with Short/Normal/Long because the user asked for a regulating slider; adding a global pause/animation control because the behavior is specifically post-release drying; extending Wetness semantics further because Wetness already controls in-stroke spread and base wetness.
- State/output mapping: `brush.settle` persists in Toolcraft runtime state, `SuminagashiRenderer` reads it into `brushSettle`, and `SuminagashiFluidEngine.extendDrying()` multiplies the bounded post-release settle window before `freezeSettledInk()` clears velocity and pressure.
- Files changed: `src/app/app-schema.ts`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-acceptance.test.ts`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, `docs/superpowers/specs/2026-06-26-post-release-settle-slider-design.md`, `docs/superpowers/plans/2026-06-26-post-release-settle-slider.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Direct checks passed: `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node scripts/check-toolcraft-integrity.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests` with 183 tests, and `./node_modules/.bin/vite build`. Targeted Playwright probe against `http://localhost:3008/` confirmed the `Settle` slider is visible and measured `shortMotion=0`, `longMotion=9.434`, `dryHoverDiff=0`, and heavy `Settle=200%` release performance `maxFrameGap=58.3ms`, `over100=0`, `longTaskMax=59ms`.
- Skipped checks: Full `pnpm verify:perf` and config-driven Playwright remain skipped because `pnpm exec` still triggers dependency status installation and fails on ignored `esbuild@0.28.1`; direct binaries plus targeted browser probes covered the touched control and pointer-up workload.
- Risks: High `Settle` intentionally extends the full-solver activity window, so it must stay covered by targeted release performance probes.

### Iteration 13 — Smooth Flow Taper

- Request: The flow currently stops too sharply; add a slider that controls how smoothly the flow stops after pointer release, with smoother values taking longer and avoiding jerks.
- Task type: Broken visual behavior, schema control, WebGL renderer timing, acceptance coverage, performance coverage.
- User-visible result: The Brush section now includes `Taper`, a `0%` to `200%` slider. Released ink still runs the true full solver during `Settle`, then enters a smooth time-based velocity fade before becoming static.
- Source/reference checked: Current `src/app/suminagashi-fluid.ts` `dryingUntil`, `freezeSettledInk()`, pressure-batched `step(dt)`, existing `Settle` control, and targeted browser probes against `http://localhost:3005/`.
- Docs/contracts read: `workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `renderer-technique.md`, `performance.md`; skills used: `systematic-debugging`, `brainstorming`, `writing-plans`, `browser`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, `workflow-required`.
- Decision: Add built-in slider target `brush.taper` after `brush.settle`, default `100`, range `0-200%`. Replace the single hard drying cutoff with a schedule containing the full-solver settle window plus a taper window. During taper, apply ease-out velocity damping through the existing GPU fade pass before final freeze clears velocity/pressure.
- Alternatives rejected: Extending `Settle` alone because it controls how long the real solver runs, not how softly the velocity stops; clearing velocity gradually without a control because the user asked for regulation; lowering pressure iterations, render scale, or dye resolution because the fix should preserve quality and reference-like passes.
- State/output mapping: `brush.taper` is runtime state read by `SuminagashiRenderer` as `brushTaper`. `SuminagashiFluidEngine.extendDrying()` schedules `dryingTaperStartsAt` and `dryingUntil`; post-release frames call `applyStopTaperDamping(now)` after completed solver batches so velocity decays smoothly before `freezeSettledInk()` makes dye static.
- Files changed: `src/app/app-schema.ts`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-acceptance.test.ts`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, `docs/toolcraft/flow-taper-plan.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests` with 184 tests, and `./node_modules/.bin/vite build`. Targeted Playwright probe confirmed `Taper` visibility, measured late post-release motion `sharpMotion=0` at `0%` vs `smoothMotion=1.437` at `200%`, and measured heavy max-Taper release performance `maxFrameGap=116ms`, `longTaskMax=121ms`, `sampleCount=130`.
- Skipped checks: Full `pnpm verify:perf` and config-driven Playwright remain skipped because `pnpm exec` still triggers dependency status installation and fails on ignored `esbuild@0.28.1`; direct binaries plus a targeted browser probe covered the touched control and pointer-up workload. `node scripts/check-toolcraft-integrity.mjs` currently fails on pre-existing copied-runtime modifications in `runtime/contracts/component-contracts.ts` and `runtime/schema/define-toolcraft.ts`; this pass did not edit `src/toolcraft`.
- Risks: `Taper=200%` intentionally keeps the simulation active longer after release, so future performance-sensitive changes should keep a max-Taper release probe.

### Iteration 14 — Paper Texture Controls

- Request: Add the ability to customize paper texture and choose the needed settings.
- Task type: Schema controls, WebGL display shader, acceptance coverage, performance coverage.
- User-visible result: A new `Paper` section exposes `Texture`, `Grain`, `Scale`, `Fiber`, and `Mottle`. The default remains flat beige paper with Texture off; enabling Texture adds procedural paper variation, and the sliders tune fine grain, texture size, directional fibers, and broad mottling.
- Source/reference checked: Current flat display shader in `src/app/suminagashi-fluid.ts`, `SuminagashiRenderer` display-setting rerender path, required Background section ordering in local Toolcraft docs, and browser probes against `http://localhost:3005/`.
- Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `renderer-technique.md`, `performance.md`; skills used: `brainstorming`, `writing-plans`, `browser`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `output-export-required`, `workflow-required`.
- Decision: Add a separate `Paper` section before the required `Background` section so `Background` remains directly before `Image Export`. Use a built-in switch plus four built-in sliders. Keep Texture default `false`, mark the texture sliders disabled while Texture is off, and implement texture as deterministic procedural shader noise rather than uploaded assets.
- Alternatives rejected: Putting texture controls inside `Background` because the required Background row must stay only Include plus paper color; enabling texture by default because the earlier requested baseline was flat beige paper; adding image upload because procedural watercolor paper is enough and avoids media lifecycle/export complexity.
- State/output mapping: `paper.texture.*` values are runtime controls read by `SuminagashiRenderer` into `SuminagashiFluidSettings`. `renderDisplay()` passes them as display shader uniforms, where grain/fiber/mottle modulate the paper color before absorption compositing. Image export draws the current WebGL frame, so texture is included through the existing output pipeline.
- Files changed: `src/app/app-schema.ts`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `src/app/app-acceptance.test.ts`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, `docs/toolcraft/paper-texture-plan.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests` with 185 tests, and `./node_modules/.bin/vite build`. Targeted Playwright probe confirmed no browser/shader errors, Texture-off paper variation `0`, Texture-on strong settings variation `7.390`, flat-to-texture diff `17.841`, slider drag diff `18.963`, and paper-scale frame sampling `maxFrameGap=8.8ms`.
- Skipped checks: Full `pnpm verify:perf` and config-driven Playwright remain skipped because `pnpm exec` still triggers dependency status installation and fails on ignored `esbuild@0.28.1`; direct binaries plus targeted browser probes covered the touched display path. `node scripts/check-toolcraft-integrity.mjs` still fails on pre-existing copied-runtime modifications in `runtime/contracts/component-contracts.ts` and `runtime/schema/define-toolcraft.ts`; this pass did not edit `src/toolcraft`.
- Risks: Procedural paper texture is deterministic and shader-based; it does not simulate physical absorption differences in the fluid solver.

### Iteration 15 — Image-Only Export

- Request: Remove the video export button and the ability to export video.
- Task type: Export surface removal, schema controls, route behavior, acceptance coverage, performance coverage, browser verification.
- User-visible result: The controls panel no longer contains `Video Export` settings or an `Export Video` button. `Export PNG` remains the only sticky footer delivery action and still supports PNG/JPG format plus 2K/4K/8K image resolution.
- Source/reference checked: Current `src/app/app-schema.ts` export sections, `src/routes/index.tsx` panel-action handler, renderer handle methods, acceptance/performance matrices, and browser coverage.
- Docs/contracts read: `workflow.md`, `assembly-workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`; skills used: `brainstorming`, `writing-plans`, `browser`.
- Contract rules applied: `controls-product-coverage`, `output-export-required`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, `workflow-required`.
- Decision: Treat the app as image-only delivery even though the drawing surface has a live WebGL settle loop. Remove `export.video.*` controls, remove `export-video`, delete the MediaRecorder/captureStream route path, and make local acceptance require video settings only when a schema actually exposes a video export action.
- Alternatives rejected: Hiding only the button because route-level video export would still exist; keeping video settings disabled because the user asked to remove the ability, not pause it; changing the renderer algorithm because export removal does not affect painting or settling behavior.
- State/output mapping: `export.image.format`, `export.image.resolution`, `export.includeBackground`, and `appearance.background` continue to drive PNG/JPG export through `createToolcraftPngExportCanvas`. No runtime state targets named `export.video.*` remain in the product schema, route, performance matrix, or browser tests.
- Files changed: `src/app/app-schema.ts`, `src/routes/index.tsx`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `docs/toolcraft/video-export-removal-plan.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests` with 184 tests, and `./node_modules/.bin/vite build`. Targeted Playwright probe against `http://localhost:3005/` confirmed `Export Video` button count `0`, `Video Export` label count `0`, one `Export PNG` button, and a decoded `image/png` export at `4096x2304`.
- Skipped checks: Full `pnpm verify:perf` remains skipped for this Tier 3 removal because the changed workload is export surface availability; targeted checks and browser proof cover the touched path. `node scripts/check-toolcraft-integrity.mjs` still fails on pre-existing copied-runtime modifications in `runtime/contracts/component-contracts.ts` and `runtime/schema/define-toolcraft.ts`; this pass did not edit `src/toolcraft`.
- Risks: Toolcraft's generic contract docs still describe video export for animated products, so the app-local acceptance policy now explicitly treats this product as image-only by user request.

### Iteration 16 — Single Ink Source

- Request: Leave only `Single` in the Ink mode UI.
- Task type: Schema control removal, renderer color-source mapping, acceptance coverage, performance coverage, browser verification.
- User-visible result: The Ink section no longer shows the Mode select. Palette is the only Ink control, and all manual strokes plus Auto drops use the currently selected Palette color.
- Source/reference checked: Current screenshot, `src/app/app-schema.ts` Ink section, `src/app/suminagashi-renderer.tsx` palette mapping, `src/app/suminagashi-fluid.ts` color selection and Auto drops, and the app-specific acceptance/performance/browser coverage.
- Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`; skills used: `brainstorming`, `writing-plans`, `browser`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, `workflow-required`.
- Decision: Remove `ink.mode` entirely instead of leaving a one-option select. Treat `Single` as the permanent product behavior by making the engine choose `paletteHex` directly and by removing the cycle color list, cycle index, acceptance row, performance scenario, and browser tests.
- Alternatives rejected: Keeping a disabled or one-option Mode select because it would keep dead UI in the panel; hiding only the label because stale `ink.mode` state could still affect drawing; keeping Auto drops on random reference colors because that would preserve hidden Cycle-like behavior.
- State/output mapping: `ink.palette` maps through `getPaletteHex()` into `SuminagashiFluidSettings.paletteHex`. `pointerDown()` and Auto flow call the same palette-backed color path, so the selected family and shade determine visible ink.
- Files changed: `src/app/app-schema.ts`, `src/app/suminagashi-renderer.tsx`, `src/app/suminagashi-fluid.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `docs/toolcraft/ink-single-plan.md`, `docs/toolcraft/agent-worklog.md`.
- Verification: Passed `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests` with 184 tests, and `./node_modules/.bin/vite build`. Targeted Playwright probe against `http://localhost:3005/` confirmed the Ink section is visible, `Mode`, `Cycle`, and `Single` are absent, and drawing changes the WebGL output (`dark samples 0 -> 470`).
- Skipped checks: Full `pnpm verify:perf` remains skipped because this removes a lightweight control and does not add renderer workload; targeted browser proof covers the visible UI and color-source behavior. `node scripts/check-toolcraft-integrity.mjs` still fails on pre-existing copied-runtime modifications in `runtime/contracts/component-contracts.ts` and `runtime/schema/define-toolcraft.ts`; this pass did not edit `src/toolcraft`.
- Risks: Auto flow now uses a single palette color rather than random reference colors, matching the user request but reducing reference-style color variety.

### Iteration 17 — Amber 500 Default Ink

- Request: Make the family and shade selected in the supplied Ink screenshot the default colors.
- Task type: Schema default, Reset behavior, exact unit expectation, browser verification.
- User-visible result: Fresh app state and Ink section Reset select the Amber family at shade 500.
- Source/reference checked: `CleanShot 2026-07-14 at 13.06.11@2x.png`, where the third family token is selected and the middle shade token is selected; current Palette family ordering identifies these as Amber and 500. Current `src/app/app-schema.ts`, its exact schema test, and Palette acceptance coverage were also checked.
- Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`; skills used: `brainstorming`, `writing-plans`, `browser`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `acceptance-product-observable`, `persistence-policy-explicit`, `workflow-required`.
- Decision: Keep the existing built-in `palette` control and change only `ink.palette.defaultValue` to `{ family: "Amber", shade: "500" }`. Control Selection Inventory: product need is a constrained default family+shade token; candidates checked were `palette` and freeform `color`; `palette` remains the exact owner; `color` is rejected because it loses family/shade semantics; target remains `ink.palette`; required acceptance is exact schema default plus real Reset UI selection.
- Alternatives rejected: Hardcoding an amber hex in the renderer because it would disconnect Reset and runtime state; replacing Palette with a freeform Color control because the requested selection is a token family plus shade; incrementing persistence version because that would erase unrelated saved user settings merely to demonstrate a new default.
- State/output mapping: Schema initialization and `controls.resetTargets` write Amber 500 into `ink.palette`; `getPaletteHex()` maps that runtime pair into `SuminagashiFluidSettings.paletteHex`, which colors future manual strokes and Auto drops.
- Files changed: `src/app/app-schema.ts`, `src/app/app-schema.test.ts`, `docs/toolcraft/agent-worklog.md`.
- Verification: `pnpm verify:quick` passed `ai:check` and the local docs check, then stopped only at the pre-existing generated-runtime integrity drift in four `src/toolcraft` files. Direct continuation passed `node --test scripts/*.test.mjs` (2 tests), `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, and `./node_modules/.bin/vitest run src --passWithNoTests` (184 tests). Focused browser proof on `http://localhost:3004/` selected Blue 900, clicked the real `Reset Ink section` action, then confirmed `Primary family Amber` and `Primary shade 500` both had `aria-pressed="true"`, the prior tokens were false, and the console had no errors.
- Skipped checks: Full `pnpm verify:perf` because this changes no renderer code or workload. The copied-runtime integrity failure was not fixed because its four `src/toolcraft` files pre-date and are outside this app-default change; the systematic-debugging classification is copied runtime source, which the generated-app contract prohibits patching locally for this task.
- Risks: Existing persisted user choices intentionally continue to override schema defaults until the user invokes Reset; this preserves the current persistence contract.

## Renderer Technique Decision Matrix

- sourceRepresentation: `reference-runtime`.
- productRepresentation: `pixel`.
- previewRenderer: `webgl`.
- exportRenderer: `canvas-2d` compositing of current WebGL frame through standard Toolcraft helpers.
- rendererWorkload: `pixel-output`.
- rendererStrategy: `webgl`.
- whyNotAlternativeStrategies: DOM/SVG cannot represent the absorption-field fluid; Canvas 2D would put advection/projection pixel work on CPU; WebGPU is unnecessary for this reference-sized workload and has less baseline support.
- fidelityRisks: Paper fiber/vignette remain off by default to preserve the flat beige baseline, while optional procedural texture is user-controlled; image export draws the current preview frame into selected output dimensions.
- performanceRisks: Pressure projection preserves 28 GPU iterations for full solver paths but is skipped during active held strokes and resumes in frame-sized batches during a bounded post-release settle scaled by `brush.settle`; `brush.taper` adds a time-based velocity damping tail before freeze; dense pointer input is coalesced into continuous line splats; active strokes throttle display/wet-preview work and defer first pointerdown presentation to rAF; pointerup defers final splats to rAF; hover does not affect pigment; drying clears velocity/pressure while preserving dye; changing render scale rebuilds FBOs; painted diffusion and optional Auto flow must stay responsive during viewport zoom/drag.
- previewExportDifferenceReason: Preview owns the live WebGL simulation; export paths use Toolcraft image delivery APIs so background and resolution settings are runtime-owned.

## Renderer Layer Inventory

- backgroundLayer: kind `background`, renderer `webgl`, content `shader`, exportMode `composited`, uiSelector `[data-suminagashi-canvas]`.
- productForegroundLayer: kind `product-foreground`, renderer `webgl`, content `shader` and `dense-pattern`, exportMode `included`, uiSelector `[data-suminagashi-canvas]`.
- exportComposite: kind `export-composite`, renderer `canvas-2d`, content `composite`, exportMode `composited`.
- editingHandlesLayer: absent because drawing uses direct pointer splats, not persistent editable handles.

## Render Pipeline Inventory

- Pass `simulation-fbos`: kind `preprocess`, runsOn `gpu`, output `source`, quality `preview`, cache key `canvas.size.width`, `canvas.size.height`, `canvas.renderScale`, invalidated by editable output setup and render scale.
- Pass `ink-splats`: kind `pixel-transform`, runsOn `gpu`, output `intermediate`, quality `preview`, cache key `ink.palette.family`, `ink.palette.shade`, `brush.size`, `brush.load`, `brush.wetness`, `brush.flow`, `pointer.uv`, invalidated by pointer drawing, ink controls, and brush controls.
- Pass `fluid-step`: kind `pixel-transform`, runsOn `gpu`, output `intermediate`, quality `preview`, cache key `velocity-fbo`, `dye-fbo`, `brush.wetness`, `brush.settle`, `brush.taper`, `brush.flow`, `flow.auto`, `flow.clearSignal`, invalidated by animation frame, pressed pointer splats, brush wetness/settle/taper/flow, auto flow, and clear fade. Active pointer drawing uses a lighter dye-only preview step for immediate held-stroke feedback; after pointer release the renderer runs bounded full solver batches with curl, vorticity, pressure, gradient subtraction, velocity advection, and dye advection. After the wetness-and-settle-based window, `brush.taper` damps velocity smoothly before velocity and pressure are cleared so the dye becomes static; Clear also clears velocity/pressure immediately and fades dye to blank.
- Pass `display-composite`: kind `composite`, runsOn `gpu`, output `preview`, quality `retina`, cache key `dye-fbo`, `appearance.background`, `export.includeBackground`, `paper.texture.enabled`, `paper.texture.grain`, `paper.texture.scale`, `paper.texture.fiber`, `paper.texture.mottle`, invalidated by animation frame, background controls, texture controls, and include toggle. The paper absorption composite and optional procedural paper texture run into a dye-sized 8-bit display target before WebGL2 framebuffer blit presents it to the selected backing canvas size; active brush input throttles this presentation cadence without changing selected render scale or product state.
- Pass `image-export`: kind `export`, runsOn `export-only`, output `export`, quality `export`, invalidated by export format/resolution/background/texture state.
- Interaction invalidation: `control-drag` for `canvas.renderScale` rebuilds FBOs; `control-drag` for `brush.size` is a workload scenario that changes future splat radius without rebuilding FBOs; `control-drag` for `brush.settle` changes future full-solver duration without rebuilding FBOs; `control-drag` for `brush.taper` changes future post-release velocity fade duration without rebuilding FBOs; `control-change` for ink/brush/background/export controls avoids rebuilding simulation FBOs; `viewport-drag` and `viewport-zoom` coalesce non-essential auto work and must not invalidate `simulation-fbos`, `fluid-step`, or `ink-splats`; `export` invalidates only `image-export`.

## Decisions

### Renderer

- Decision: Direct WebGL2 stable-fluid renderer in `canvasContent`.
- Reason: The reference source is a GPU fluid simulation with velocity, dye, pressure, curl, and divergence framebuffers.
- Evidence: Reference source inspected; typed `rendererTechnique` and `rendererPipeline` in `src/app/app-performance.ts`; browser tests use `[data-suminagashi-canvas]`.

### Timeline

- Decision: No Toolcraft timeline; animation intent is autonomous.
- Reason: The reference app has no play/pause/scrub/duration transport. Painted ink diffusion continues as physics state, and Auto flow is an optional product parameter, not a timeline.
- Evidence: `appTransferMode.animationIntent.mode = "autonomous"` with no transport coverage; no `panels.timeline`.

### Layers

- Decision: No Layers panel.
- Reason: The product has one live fluid surface, no editable object stack, visibility, reorder, or selection.
- Evidence: `panels.layers` omitted; renderer layer inventory has no editable layers.

### Controls

- Decision: Built-in `select`, `palette`, `slider`, `switch`, `actions`, `color`, and export `select` controls.
- Reason: All requested behavior fits Toolcraft built-ins; Palette exactly owns family plus shade, Brush and Paper settings are continuous numeric parameters suited to sliders, Settle and Taper are duration/smoothness parameters suited to sliders, and Clear is a local `actions` command paired with Auto in a two-column Flow row.
- Evidence: `src/app/app-schema.ts`; acceptance rows cover every visible target, palette parts, and brush slider behavior.

### Project Settings

- Decision: Use `canvas.sizing: { mode: "editable-output" }` so the runtime first technical setup section exposes Aspect ratio, Canvas width, Canvas height, and Resolution scale.
- Reason: This is an exportable product canvas. The reference app lacking its own size editor is not a fixed-output requirement; the initial 1920x1080 size remains the default, not a lock.
- Evidence: `src/app/app-schema.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, and `e2e/app-controls.spec.ts` now prove the runtime canvas sizing controls exist and update the WebGL output dimensions.

### Export

- Decision: Image-only footer delivery with `Export PNG`; PNG/JPG export goes through `createToolcraftPngExportCanvas`.
- Reason: The user requested removal of video export ability while keeping still image delivery; background, image format, and image resolution remain runtime-owned.
- Evidence: `src/app/app-schema.ts` exposes only `export-image`; `src/routes/index.tsx` reads `export.image.*`, `export.includeBackground`, and `appearance.background`, with no MediaRecorder/captureStream path.

### Performance

- Decision: Full performance matrix with workload fixtures for render scale, brush size, brush settle duration, brush taper duration, paper texture scale, and export resolutions, plus animation/viewport/export scenarios. The renderer uses a dye-sized byte display composite target, WebGL high-performance/desynchronized context hints, pointer input coalescing, pressure deferral during active strokes, throttled dye-only wet preview while drawing, rAF-deferred pointerdown/pointerup presentation work, user-scaled full-solver post-release settling, user-scaled velocity tapering, and optional procedural paper texture without changing selected render scale.
- Reason: Pixel-output WebGL, painted diffusion, brush-size radius changes, and optional Auto flow need real browser performance coverage while preserving the user's 1x-2x backing-pixel control.
- Evidence: `src/app/app-performance.ts`, `src/app/suminagashi-fluid.ts`, `src/app/suminagashi-renderer.tsx`, `e2e/app-controls.spec.ts` perf scenarios, manual active-stroke browser measurements recorded in Iteration 4, max-Taper release measurements recorded in Iteration 13, and paper texture measurements recorded in Iteration 14.

## Evidence

- Source reviewed: reference page inline WebGL source and local Toolcraft docs.
- Product source: `src/app/suminagashi-fluid.ts`, `src/app/suminagashi-renderer.tsx`, `src/routes/index.tsx`.
- Contract applied: Toolcraft shell, product-only canvasContent, background/export sections, acceptance/performance matrices, persistence policy.

## Verification

- Run: `pnpm ai:check` passed.
- Run: `pnpm test` passed with 177 unit/contract tests.
- Run: `pnpm verify:perf` passed with 3 performance-matrix browser tests and 18 browser perf scenarios.
- Run: `pnpm verify:final` passed: `ai:check`, `pnpm test`, production build, and 36 non-performance browser tests. Vite reported only the existing large chunk warning.
- Current iteration: direct `node scripts/check-ai-skills.mjs`, `node scripts/check-toolcraft-docs.mjs`, `node --test scripts/*.test.mjs`, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`, `./node_modules/.bin/vitest run src --passWithNoTests`, and `./node_modules/.bin/vite build` passed. Manual Playwright confirmed the Ink section has no Mode/Cycle/Single UI and drawing still changes output. `node scripts/check-toolcraft-integrity.mjs` currently fails on pre-existing copied-runtime modifications in `runtime/contracts/component-contracts.ts` and `runtime/schema/define-toolcraft.ts`; this iteration did not edit `src/toolcraft`.
- Local run: direct Vite dev server is running at `http://localhost:3005/`.
- Note: `pnpm exec vite` and config-driven Playwright webServer fail in this runtime because `pnpm` tries to run an install and stops on ignored `esbuild@0.28.1` builds; direct local binaries work.

## Risks

- Risk: Export image dimensions are correct through the Toolcraft helper, but the fluid state is captured from the live WebGL preview rather than replayed offline at every target resolution.

### Iteration 18 — Canonical Toolcraft demo subpath

- User-visible result: The production build and Vercel deployment now serve the app at `/demos/draw-tool/`, including nested client routes and bundled assets.
- Contract applied: The Vite base and TanStack Router base path share `import.meta.env.BASE_URL`; local development remains rooted at `/`.
- Verification tier: Tier 2. Production build, route script tests (2/2), Vitest (3 files, 184 tests), and a browser load through the website rewrite passed. The existing copied-runtime integrity mismatches remain outside this routing change and still prevent the aggregate quick gate from becoming green.

#### Thermo-nuclear review remediation

- Result: Vercel now routes generated assets before the final SPA fallback, so direct non-file descendants receive the application HTML without breaking prefixed assets.
- Verification: the exhaustive four-test gateway contract, production build, canonical root browser load, and `/demos/draw-tool/review-deep-link` reload passed with `200 text/html` and no failed asset responses. The pre-existing copied-runtime integrity blocker remains unchanged.

### Iteration 19 — Shared Toolcraft social preview

- User-visible result: Social shares of the app now use the main Toolcraft 1200×630 preview image through Open Graph and Twitter metadata.
- Source and contract: `apps/website/public/social-previews/og-toolcraft-v2.jpg` remains the single asset source. The metadata uses its absolute `https://toolcraft.sh/` URL so neither the `/demos/draw-tool/` Vite base nor a direct Vercel hostname can rewrite it incorrectly.
- Verification tier: Tier 0. Product schema, runtime state, renderer, canvas, exports, and performance are unchanged. The repository metadata contract, production build, built-HTML base-path inspection, website typecheck/build, starter tests/typecheck, CLI generation tests, and Frozen signed integrity check passed. The pre-existing copied-runtime integrity mismatch remains unrelated; production verification follows the pushed commit.
