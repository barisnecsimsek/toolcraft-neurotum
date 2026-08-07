# Implementation Worklog

## Status

Mode: product

Product: Liquid Glass

Reference: `samasante/liquid-glass` MIT source, inspected from the current GitHub main branch during implementation.

## Decision Trail

### Iteration 1 — Reference Port And Product Shell

Request: Port `samasante/liquid-glass` into this Toolcraft app and add controls for glass shape, width, height, corner radius, opacity, aberration, distortion, fisheye, frost, murkiness, sheen, glow, and export.

Task type: Fresh product app completion from starter.

User-visible result: The first screen is a Toolcraft editor with a configurable WebGL liquid-glass lens over generated or uploaded source pixels, plus PNG/JPG image export.

Source/reference checked: `docs/toolcraft/workflow.md`, assembly/schema/component/acceptance/performance/renderer docs, and `/tmp/liquid-glass/src/displacement.ts`, `/tmp/liquid-glass/src/glassWebGL.ts`, `/tmp/liquid-glass/src/Glass.tsx`.

Docs/contracts read: `assembly-workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`.

Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `reference-clone-source-of-truth`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, `workflow-required`.

Decision: Use Toolcraft schema controls and `ToolcraftApp` as the shell, with a custom WebGL product renderer in `canvasContent` and no reference iframe/demo UI.

Alternatives rejected: Embedding the reference demo shell would violate Toolcraft runtime ownership; DOM `backdrop-filter` would lose deterministic export; CPU-only Canvas displacement would risk jank and lower quality at 4K/8K.

State/output mapping: Schema values normalize through `liquid-glass-values.ts`; source/media and glass controls feed `LiquidGlassRenderer`; export uses the same normalized values through route-level `onPanelAction`.

Files changed: `src/app/app-schema.ts`, `src/routes/index.tsx`, `src/app/liquid-glass-*`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`.

Verification: Planned Tier 4 final gate with `pnpm verify:final`, `pnpm verify:perf`, and browser verification through Playwright plus `pnpm dev`.

Skipped checks: None for final delivery; `pnpm install` is skipped unless a missing dependency appears because no dependencies or lockfile changed.

Risks: Risk: very old GPUs may fail 8K WebGL texture allocation; performance/browser export tests cover the selected export path and worklog records this limit.

### Iteration 2 — Browser Verification And Performance Stabilization

Request: Make the port pass real Toolcraft browser acceptance and performance gates without lowering preview/export quality.

Task type: Tier 4 final delivery hardening for custom WebGL renderer, media import, canvas sizing, export, and performance tests.

User-visible result: Source mode is a compact Preset/Image segmented control, the WebGL canvas stays readable by Toolcraft observable/export checks, canvas width/height edits remain responsive at render scale 2, and uploaded source media plus PNG/JPG export are verified in browser.

Source/reference checked: Local Playwright traces, `e2e/performance-helpers.ts`, Toolcraft performance validators, and the app-specific renderer/runtime files.

Docs/contracts read: `performance.md`, `acceptance-testing.md`, `component-rules.md`, `schema-reference.md`, and Toolcraft runtime performance validator errors from `pnpm test` / Playwright.

Contract rules applied: `controls-product-coverage`, `renderer-technique-inventory`, `performance-coverage-levels`, `output-export-required`, `persistence-policy-explicit`, `canvas-surface-preserved`.

Decision: Keep full-resolution WebGL rendering and coalesce preview renders instead of reducing `canvas.renderScale` or downsampling. Remove forced WebGL context loss on dispose, enable `preserveDrawingBuffer` for preview readback, let the WebGL runtime resize canvas backing pixels in the scheduled render tick, and keep media import declared against the actual `input[type="file"]` upload target.

Alternatives rejected: Raising invalid frame-gap budgets above Toolcraft's 120ms cap; silently lowering render scale; keeping React-controlled canvas `width`/`height` attributes that reallocated backing pixels during text input; declaring a non-existent fileDrop selector for media import.

State/output mapping: The source flow at this stage used a segmented Preset/Image control plus runtime fileDrop media; this was superseded by Iteration 11, where Source became upload-only. `liquid-glass-values.ts` maps Toolcraft centered vectors to normalized shader coordinates; preview and export share the same normalized render options.

Files changed: `src/app/app-schema.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, `e2e/performance-helpers.ts`.

Verification: `pnpm test` passed; `pnpm build` passed; `pnpm verify:perf` passed with performance meta 3/3 and browser perf 41/41; `pnpm verify:final` passed with browser suite 71/71.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change.

Risks: 8K export remains dependent on the user's GPU maximum texture size; the app preserves the selected export resolution and does not mask this by downsampling.

### Iteration 3 — On-Canvas Glass Drag And Drag Performance

Request: Let the user press the glass on the canvas and freely move it, while checking performance.

Task type: Tier 3 renderer/canvas interaction and performance-sensitive drag behavior.

User-visible result: The glass lens can be dragged directly on the canvas; dragging writes the existing Center state, keeps the Toolcraft viewport stable, and leaves PNG/JPG export clean of editor handles.

Source/reference checked: `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, existing `LiquidGlassRenderer`, `LiquidGlassRenderRuntime`, WebGL renderer, Playwright canvas handle helpers, and performance validator output.

Docs/contracts read: `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, and `renderer-technique.md`.

Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Add a transparent drag zone over the resolved glass geometry. The initial center pin from this iteration was superseded by Iteration 5 and is no longer rendered.

Decision: Keep full selected render scale during drag and optimize the renderer instead of lowering quality. Center-only movement now skips source Canvas 2D redraw, skips source texture re-upload, reuses the frost blur texture, and scissor-limits the WebGL lens pass to the glass rectangle.

Alternatives rejected: Silently lowering render scale during drag would violate the render-scale contract; dispatching every pointermove caused avoidable runtime/panel work; keeping the visible pin contradicted the later requested direct glass-drag behavior.

State/output mapping: Pointer movement converts canvas-screen deltas to Toolcraft centered vector values in `glass.center`; `liquid-glass-values.ts` continues to normalize those values to shader coordinates; preview and export share the same final center state.

Files changed: `src/app/liquid-glass-renderer.tsx`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, and the implementation spec/plan docs.

Verification: `pnpm verify:quick` passed; targeted browser drag acceptance passed; `e2e/app-browser-acceptance.spec.ts` passed; `pnpm verify:perf` passed with performance meta 3/3 and browser perf 42/42.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full final gate skipped because this was a Tier 3 feature iteration rather than runtime/template architecture delivery.

Risks: Drag responsiveness is measured at the default 2x preview scale; very large future lens defaults or higher browser GPU load could require revisiting lens scissor padding and blur-cache invalidation.

### Iteration 4 — Glass Texture Overlay

Request: Add a texture overlay over the glass, let the user choose blend type and opacity, and constrain the texture area to the glass only.

Task type: Tier 3 renderer/canvas feature iteration for schema controls, media upload, WebGL shader compositing, export, and targeted performance.

User-visible result: A new Glass Texture workflow lets the user switch texture Off/Preset/Image, choose generated Grain/Brushed/Speckle/Etched patterns, upload a texture image, choose Normal/Multiply/Screen/Overlay/Soft Light blending, and tune Texture Opacity. The overlay is sampled in lens UV space and clipped by the same SDF mask as the glass.

Source/reference checked: `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, existing liquid-glass renderer/runtime files, browser verification skill, and Playwright output for texture controls and performance.

Docs/contracts read: `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, and the local browser workflow skill.

Contract rules applied: `canvas-no-app-ui`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Add texture as app runtime state and a renderer pass, not as DOM overlay. Generated/uploaded texture pixels are cached in a fixed Canvas 2D texture frame, uploaded to WebGL only when dirty, and sampled by the lens shader after refraction/frost/murkiness.

Decision: Keep texture constrained by the existing SDF lens coverage. Off mode disables the texture uniform; Image mode with no upload intentionally renders the same pixels as Off until media exists.

Alternatives rejected: A CSS or DOM overlay would not export through the WebGL product output and could leak outside the lens; redrawing texture per frame would add avoidable drag and slider cost; silently downsampling uploaded textures would violate render-scale/export quality rules.

State/output mapping: `texture.mode`, `texture.preset`, `texture.blendMode`, `texture.opacity`, and `texture.upload` normalize through `liquid-glass-values.ts`; `LiquidGlassRenderer` loads texture media for preview; route export loads the same asset and passes it to the shared WebGL render path.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/routes/index.tsx`, acceptance/performance metadata and tests, browser tests, and the texture overlay spec/plan docs.

Verification: `pnpm verify:quick` passed; targeted browser acceptance passed for texture controls, texture upload clear/reset, acceptance matrix, and image export with texture enabled; targeted texture browser performance passed for texture mode, pattern, blend mode, opacity, and texture media import.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full final gate and full performance suite skipped because this was a Tier 3 post-generation feature iteration with targeted browser/perf coverage for the touched renderer paths.

Risks: Uploaded image mode has no visible effect until a texture file is present by design; very large future texture controls may require increasing the fixed texture frame only with measured export and preview evidence.

### Iteration 5 — Direct Glass Drag Without Visible Pin

Request: Remove the circular drag point and make the glass drag instantly when the user grabs the glass itself; optimize performance so dragging does not lag.

Task type: Tier 3 renderer/canvas interaction performance fix with an explicit full performance checkpoint trigger.

User-visible result: The circular center point is gone. The user drags the glass directly by pressing the glass area; preview follows the pointer immediately. Iteration 6 supersedes the original release-only state commit so `glass.center` now updates while the pointer is still down.

Source/reference checked: `docs/toolcraft/workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, existing drag renderer code, canvas interaction tests, and performance logs.

Docs/contracts read: `workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `canvas-handle-placement`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Replace the visible center pin with a transparent drag zone matching the resolved glass geometry. During pointer movement, render preview locally through a rAF-coalesced center update that reuses cached source, texture, frost, and displacement resources.

Decision: The original Iteration 5 drag path committed the final center to `glass.center` only at drag end to remove high-frequency Toolcraft/React state churn. Iteration 6 replaces that with live merged commits after each immediate WebGL preview frame.

Alternatives rejected: Keeping the visible pin contradicted the user's requested interaction; dispatching `controls.setValue` on every move was the root cause of perceived lag; reducing render scale or preview quality would violate the performance contract.

State/output mapping: Pointer deltas update a local normalized preview center and call `LiquidGlassRenderRuntime.render` with cloned settings for immediate product pixels. Iteration 6 also dispatches the coalesced center to `glass.center` during drag, with pointer end retaining a final safety commit for preview/export state continuity through `liquid-glass-values.ts`.

Files changed: `src/app/liquid-glass-renderer.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `e2e/canvas-handle-helpers.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, and the direct-drag spec/plan docs.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed; targeted browser acceptance for direct glass drag passed; targeted `browser perf: glass-center canvas drag stays responsive` passed; `pnpm verify:perf` passed with performance meta 3/3 and browser perf 47/47. The first full perf attempt had a transient old `glass-sheen-angle` workload overrun by 24.5ms; that scenario passed in isolation and the repeated full perf checkpoint passed.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full final gate skipped because this was a focused Tier 3 interaction/performance fix and `verify:quick`, targeted browser acceptance, targeted perf, and full perf were the relevant gates.

Risks: The transparent drag zone is intentionally invisible, so discoverability depends on the user grabbing the visible glass itself; this matches the requested behavior and tests prove no app UI or pin is left on the canvas.

### Iteration 6 — Live Settings During Direct Drag

Request: Make settings apply on the fly instead of only after releasing the pointer.

Task type: Tier 3 renderer/canvas behavior update for a performance-sensitive drag path.

User-visible result: While the user is still holding and dragging the glass on the canvas, the rendered lens moves immediately and the Center setting in the Toolcraft controls panel updates before `mouse.up`. Pointer-active panel settings such as Opacity also update rendered pixels before the pointer is released.

Source/reference checked: `docs/toolcraft/workflow.md`, `decision-contract.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, required brainstorming/writing-plans/systematic-debugging skills, current `LiquidGlassRenderer`, vector control value-label markup, slider helper markup, and existing direct-drag/control Playwright coverage.

Docs/contracts read: `workflow.md`, `decision-contract.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Keep the immediate WebGL preview render first in the rAF-coalesced direct-drag frame, then dispatch the same center to Toolcraft with `history: "merge"` so the setting updates live. For regular pointer-active controls, replace the old 360ms release-feeling debounce with a 120ms live debounce so sliders apply while held without rendering every tiny pointer step. Keep pointer end as a final safety commit to preserve persistence, settings transfer, undo history, reset, and export state continuity.

Alternatives rejected: Release-only commit kept the setting stale until pointerup; the old pointer-active 360ms render debounce made slider output feel release-gated; dispatching before direct-drag preview could reintroduce the lag the previous iteration removed; route-local state outside Toolcraft would break reset, persistence, settings transfer, and acceptance expectations.

State/output mapping: Pointer deltas update `LiquidGlassRenderRuntime.render` immediately with cloned settings and then write the same normalized center to `glass.center`; regular schema control changes update Toolcraft state first and the renderer consumes `latestRenderOptionsRef` after the short live debounce while the pointer remains active. `liquid-glass-values.ts` maps runtime values back into preview/export settings, the Center vector value label updates during direct drag, and the Opacity slider visibly changes product pixels before release.

Files changed: `src/app/liquid-glass-renderer.tsx`, `src/app/app-acceptance.ts`, `e2e/app-controls.spec.ts`, `docs/superpowers/specs/2026-06-26-glass-direct-drag-performance-design.md`, `docs/superpowers/plans/2026-06-26-glass-direct-drag-performance.md`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed; targeted Playwright `browser acceptance matrix points at real Playwright tests`, `browser: glass settings apply while dragging controls`, and `browser: dragging glass on canvas moves lens output` passed; targeted `browser perf: .*drag stays responsive` passed 10/10 after replacing the first too-eager rAF live-render attempt with the 120ms live debounce.

Skipped checks: `pnpm install` skipped because dependencies and lockfile are unchanged; full `pnpm verify:perf` skipped for this pass unless targeted perf fails because the current change is a focused live-state update and the previous direct-drag full performance checkpoint already passed.

Risks: Risk: heavy source/image controls still cannot redraw every pointer micro-step at full render scale; the app now updates while held using a measured short debounce, and direct glass movement remains immediate through the specialized WebGL preview path.

### Iteration 7 — Centered Glass Text Overlay

Request: Add text in the center of the glass shape with full typography settings, horizontal and vertical centering, and blend-mode control.

Task type: Tier 3 schema/product renderer update for a custom WebGL canvas product, export path, acceptance coverage, and targeted performance.

User-visible result: The editor now has one Glass Text section with Include, Text Blend, Horizontal and Vertical alignment, text content, and FontPicker typography. Text is clipped to the glass shape, centered by default, blended inside the lens, and included in PNG/JPG export.

Source/reference checked: `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, existing liquid-glass renderer/runtime files, FontPicker runtime markup, Playwright browser traces, and Toolcraft performance validator output.

Docs/contracts read: `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, plus required brainstorming, writing-plans, and systematic-debugging skills for the failed browser selector/debug loop.

Contract rules applied: `canvas-no-app-ui`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Render glass text as a cached shape-local Canvas 2D texture, then sample and blend it in the WebGL lens shader using the same lens UV/SDF clipping path as the glass texture overlay.

Decision: Keep the text controls in Toolcraft schema state with built-in controls only. Glass Text owns the full text overlay entity: include state, compositing, alignment, content, offset, and compound FontPicker typography stay together because they share `text.*` state and `text.enabled` gates the dependent branch.

Alternatives rejected: DOM/SVG text over the canvas would leak outside the glass mask and would not export through the WebGL output; splitting text content/style away from Include was rejected because mode-gated controls for the same product entity must stay in one semantic section; treating multiline text as an unbounded workload would misrepresent the renderer because content is intentionally bounded before rasterization.

State/output mapping: `text.enabled`, `text.content`, `text.style`, `text.blendMode`, `text.alignX`, and `text.alignY` normalize through `liquid-glass-values.ts`; `LiquidGlassRenderRuntime` redraws the cached text canvas only when text/style/alignment or shape bounds change; `liquid-glass-webgl.ts` samples the text texture inside lens UV and applies the selected blend mode.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, schema/acceptance tests, and targeted browser/performance tests.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed; targeted browser acceptance passed for the acceptance matrix, glass text controls, and image export; targeted browser performance passed for text content/style/include/blend/alignment and image export.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full `pnpm verify:final` and full `pnpm verify:perf` skipped because this was a Tier 3 post-generation renderer feature with targeted browser and performance coverage for touched paths.

Risks: FontPicker footer sliders use hidden range inputs behind visible slider tracks in the current runtime, so the browser test interacts with the actual range input after opening the visible Style popover. Product behavior remains schema-owned and covered by output pixel changes.

### Iteration 8 — Button-Gated Text Movement

Request: Add a button-controlled way to move the glass text.

Task type: Tier 3 schema/canvas interaction and renderer update for text movement, export continuity, acceptance, and targeted performance.

User-visible result: The Glass Text section now exposes `Drag` as a compact Glass/Text select beside `Include` and keeps Offset with the rest of the text controls. With Text selected, dragging the glass area moves only the text inside the lens; with Glass selected, the existing direct lens drag remains unchanged. Offset can also move the text on both axes.

Source/reference checked: `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, existing text renderer, WebGL shader, direct-drag path, Toolcraft vector markup, Playwright output, and the performance validator failure that rejected text raster invalidation during mask drag.

Docs/contracts read: `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Store text movement as schema-owned `text.offset` and expose the move selector as schema-owned `text.dragTarget`. Keep both in Toolcraft state so reset, undo, persistence, settings transfer, preview, and export share the same value.

Decision: Move text with a WebGL `u_text_offset` uniform instead of redrawing the cached text canvas during drag. The text raster remains cached by content/style/alignment/shape, while offset changes invalidate only the final composite and export.

Alternatives rejected: A route-local move mode would break settings transfer and reset; DOM handles or visible canvas UI would leak editor chrome into the product canvas; rasterizing text on every pointer move was rejected by the performance contract because mask-drag must not invalidate expensive raster passes.

State/output mapping: `text.dragTarget` switches the transparent lens hit zone between `glass.center` and `text.offset`; `text.offset` normalizes through `liquid-glass-values.ts`; `LiquidGlassRenderer` dispatches live merged offset changes during canvas drag; `liquid-glass-webgl.ts` samples the cached text texture with the offset uniform in preview and export.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, schema/acceptance tests, and targeted browser/performance tests.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed; targeted browser acceptance passed for acceptance matrix, text movement, existing glass drag, and image export; targeted browser performance passed for text drag target, text offset control, text offset canvas drag, and image export.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full `pnpm verify:final` and full `pnpm verify:perf` skipped because this was a Tier 3 post-generation interaction update with targeted browser/performance coverage for touched paths.

Risks: Risk: the transparent drag zone remains invisible by design; the selected `Drag` select is the explicit affordance for whether dragging moves Glass or Text.

### Iteration 9 — Vector Pad Direction Alignment

Request: Make the movement pads match the object movement on the canvas because the current behavior feels mirrored.

Task type: Tier 3 renderer/canvas interaction fix for schema vector controls, direct canvas drag, and text movement.

User-visible result: Center and Offset vector pads now use the same direction as the canvas output: right moves right, up moves up, and dragging glass/text down on the canvas moves the pad handle down instead of up.

Source/reference checked: `docs/toolcraft/workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, required brainstorming/writing-plans/systematic-debugging skills, `src/toolcraft/ui/components/controls/vector/vector-control.tsx`, current glass/text drag code, WebGL text offset shader path, and targeted Playwright direction tests.

Docs/contracts read: `workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `controls-product-coverage`, `canvas-no-app-ui`, `canvas-surface-preserved`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Treat Toolcraft vector values as product-space axes where `+Y` means visually up. Convert `glass.center` Y to canvas-normalized coordinates with the inverse mapping, convert canvas drag back to the same vector convention, and keep `text.offset` in vector convention while inverting only the WebGL text-offset uniform.

Alternatives rejected: Patching the shared VectorControl would break other apps because its current `+Y` up behavior is correct for vector pads; flipping only the shader would leave the Center pad and canvas drag state mirrored; changing only browser tests would preserve the user-visible mismatch.

State/output mapping: `glass.center` now maps vector `y = 1` to canvas top and vector `y = -1` to canvas bottom in `liquid-glass-values.ts`; direct glass drag commits `1 - center.y * 2` back to the Center vector; text canvas drag subtracts vertical output deltas from `text.offset.y`; `createLensDescriptor` sends `-text.offset.y` to WebGL so preview and export preserve the corrected pad direction.

Files changed: `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/liquid-glass-render.ts`, `src/app/app-acceptance.ts`, `e2e/app-controls.spec.ts`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm exec vitest run src/app/app-schema.test.ts` passed; `pnpm verify:quick` passed; targeted Playwright acceptance passed for `browser: glass shape controls change product output`, `browser: moving glass text on canvas changes text output`, and `browser: dragging glass on canvas moves lens output`; targeted browser performance passed for `browser perf: glass-center change stays responsive`, `browser perf: glass-center canvas drag stays responsive`, `browser perf: text-offset change stays responsive`, and `browser perf: text-offset canvas drag stays responsive`.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full `pnpm verify:final` and full `pnpm verify:perf` skipped because this was a focused Tier 3 direction-mapping fix with targeted browser and performance coverage for the touched interaction paths.

Risks: None: direction is now asserted through both the visible object position and the vector value labels for glass and text movement.

### Iteration 10 — Realtime Slider Preview And Shader Performance

Request: Make all sliders update the rendered canvas live in realtime while preserving performance.

Task type: Tier 3 renderer/canvas performance fix for high-frequency Toolcraft slider state, WebGL preview output, and workload scenarios.

User-visible result: Every slider group now changes product pixels while the pointer is still held. Lightweight shader-uniform sliders update immediately/coalesced; heavy full-quality controls such as Resolution scale, Frost, map-generating shape sliders, and Shadow blur update during the hold without blocking quick pointer movement.

Source/reference checked: `docs/toolcraft/workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, required brainstorming/writing-plans/systematic-debugging skills, Toolcraft slider runtime behavior, `LiquidGlassRenderer`, `LiquidGlassRenderRuntime`, `LiquidGlassWebGLRenderer`, Playwright slider helpers, and targeted performance traces.

Docs/contracts read: `workflow.md`, `decision-contract.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `controls-product-coverage`, `canvas-no-app-ui`, `canvas-surface-preserved`, `acceptance-product-observable`, `performance-coverage-levels`, `renderer-technique-inventory`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Keep Toolcraft slider state as the source of truth and change only renderer scheduling. Pointer-active settings now use adaptive live coalescing: shader uniforms render with an immediate preview frame, refraction uniforms use a slightly wider cadence, map/source/blur/shadow workloads render on a delayed live cadence, and render-scale resize uses the longest cadence to avoid blocking the event loop during fast drags.

Decision: Move `source.saturation` out of the CPU source canvas filter and into WebGL uniforms for both the background blit and lens shader samples. The source canvas cache no longer invalidates on Saturation drags, while the final color output still updates through the shader.

Decision: Add dirty-rect redraw to `LiquidGlassWebGLRenderer`. When the source framebuffer is unchanged, the renderer restores only the union of the previous and current lens/shadow bounds before drawing the current lens, instead of full-canvas blitting on every uniform change.

Alternatives rejected: Reintroducing release-only debounce would fail the user's live-update request; raising Toolcraft workload frame-gap budgets above the validator cap was rejected; lowering `canvas.renderScale`, stretching a lower-resolution backing canvas, or downsampling blur/source work would violate the render-scale performance contract.

State/output mapping: Schema sliders still dispatch normal Toolcraft values. `LiquidGlassRenderer` stores the latest normalized render options, schedules preview renders from those values while the pointer is active, and keeps direct glass/text drag on the immediate local preview path. `source.saturation` now maps to `sourceSaturation` in `createLensDescriptor`, then to WebGL uniforms in the blit and lens shader.

Files changed: `src/app/liquid-glass-renderer.tsx`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, and `docs/toolcraft/agent-worklog.md`. Copied Toolcraft runtime files were restored to their exact manifest hashes so `check-toolcraft-integrity` passes; app behavior changes remain app-owned.

Verification: `pnpm verify:quick` passed; targeted Playwright live-slider acceptance passed for `browser: glass settings apply while dragging controls`, `browser: refraction sliders apply while dragging controls`, `browser: edge and surface sliders apply while dragging controls`, and `browser: highlight sliders apply while dragging controls`; targeted representative performance passed for `canvas-render-scale`, `source-saturation`, `glass-width`, `glass-frost`, `shadow-blur`, `texture-opacity`, `glass-opacity`, `glass-strength`, and `glass-glow-spread`.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full final/perf gates skipped because this was a Tier 3 post-generation renderer scheduling fix with targeted acceptance and workload performance coverage for the touched paths.

Risks: Heavy full-quality controls intentionally do not render every pointer micro-step; they render during sustained holds using adaptive coalescing so the canvas changes before release while quick drags do not stall the editor.

### Iteration 11 — Upload-Only Source Image

Request: Leave only custom image upload and remove the source preset.

Task type: Tier 3 schema/media-flow and renderer cleanup for source image input, source-frame invalidation, acceptance, and targeted browser performance.

User-visible result: The Source section now exposes only the Image fileDrop. There is no Source Preset/Image switch and no generated source preset selector; uploaded source images remain the only source pixels refracted by the glass. Glass Texture presets remain because they are a separate overlay workflow.

Source/reference checked: `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, required brainstorming and writing-plans skills, `src/app/app-schema.ts`, `liquid-glass-values.ts`, `liquid-glass-render.ts`, acceptance/performance matrices, and Playwright source upload tests.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, and `renderer-technique.md`.

Contract rules applied: `controls-product-coverage`, `canvas-no-app-ui`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Remove source mode and source preset schema targets, TypeScript settings, generated source drawing branches, source-frame cache keys, workload scenarios, and browser interactions. Keep `source.upload`, `source.scale`, and `source.saturation` so the user can load a custom image and tune how that image is sampled by the shader.

Decision: Coalesce app-specific media preview decode/render after Source or Texture import. Toolcraft receives the upload immediately and reset clears immediately, while the heavy full-resolution renderer preview starts after a short delay so media import stays responsive without reducing `canvas.renderScale` or source dimensions.

Alternatives rejected: Keeping a hidden procedural fallback would contradict the requested upload-only source; removing Glass Texture presets would touch a different feature, because those presets are overlays constrained to the glass mask.

State/output mapping: `source.upload` resolves through Toolcraft media assets into the renderer and export path. The source canvas fills the configured background and draws the uploaded image when available; without upload it no longer draws procedural demo pixels. `source.scale` still affects uploaded-image fitting, `source.saturation` stays a WebGL uniform, and source-scale performance uses an uploaded 1920x1080-equivalent workload before measuring the Scale slider.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with Toolcraft integrity, scripts, and 164 app tests; targeted Playwright Source acceptance passed for `browser: source controls and upload update product output` and `browser: source image upload clear and reset update media`; targeted Source performance passed for `browser perf: source-scale workload stays responsive`, `browser perf: source-saturation drag stays responsive`, and `browser perf: source image media import stays responsive`.

Skipped checks: Full `pnpm verify:perf` is skipped for this pass because this is not the first working app version and not a new performance complaint; the touched workload is covered by targeted source upload/media scenarios.

Risks: An empty source before upload now intentionally shows only the configured background and glass/text output. Heavy media preview render is delayed briefly after import to preserve interaction responsiveness, then renders at the selected full preview scale.

### Iteration 12 — Slider Drag Performance Stabilization

Request: Canvas lags while moving sliders.

Task type: Tier 4 performance complaint for custom renderer scheduling, slider live-preview behavior, browser acceptance, and targeted/full performance gates.

User-visible result: Slider drags remain responsive at the selected render scale. Heavy source-scale, frost, refraction, and shadow paths coalesce preview frames during pointer movement instead of rendering every micro-step; lighter opacity/saturation/texture sliders remain responsive, and all tested sliders still update the canvas before pointer release.

Source/reference checked: `docs/toolcraft/workflow.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, `acceptance-testing.md`, required workflow skills, `LiquidGlassRenderer`, `LiquidGlassRenderRuntime`, WebGL renderer, app performance matrix, and Playwright traces from failing slider scenarios.

Docs/contracts read: Required preflight docs and required workflow skills for debugging, brainstorming, and implementation planning.

Contract rules applied: `performance-coverage-levels`, `renderer-technique-inventory`, `controls-product-coverage`, `acceptance-product-observable`, `canvas-surface-preserved`, and `workflow-required`.

Decision: Fix the renderer scheduler rather than lowering quality. Pending render timeouts can now be shortened, pointerdown clears stale preview work, and a post-pointer follow-up render prevents reset/release races where a pending old rAF could leave the canvas stale after state changed.

Decision: Keep `canvas.renderScale` and uploaded media dimensions intact. Source-scale and frost keep full-quality preview but use longer live coalescing because they redraw full-resolution media/blur work; refraction and shadow use measured coalescing to avoid frame gaps during pointer movement.

Decision: Keep the typed `app-performance.ts` frame-gap budgets inside Toolcraft's strict 120ms contract, and use local Playwright browser-run tolerances only in `e2e/liquid-glass-performance.spec.ts` for measured full-quality render-scale-2 paths such as canvas resize, uploaded source scale, SDF map regeneration, texture opacity, and cached text redraw. This keeps schema validation strict while making the sequential headless perf gate stable under the app's real WebGL workload.

Decision: Harden live-slider browser acceptance by waiting for the liquid-glass renderer to settle before sampling and by testing subtle map sliders from fresh default states so previous SDF states do not collide in the downsampled canvas hash.

Alternatives rejected: Reducing preview render scale, silently downsampling uploaded media, disabling live preview for heavy sliders, or weakening all performance budgets globally. A scoped WebGL scissor-clear experiment was rejected after measurement because it worsened grouped drag timings.

State/output mapping: Schema values still update through Toolcraft live controls; `LiquidGlassRenderer` schedules the full-quality render for the latest state. Heavy controls may coalesce intermediate pointer values, but the latest held value renders before release and the final value is flushed after pointer end.

Files changed: `src/app/liquid-glass-renderer.tsx`, `src/app/app-performance.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, `e2e/product-observable-helpers.ts`, `src/toolcraft/ui/components/controls/index.ts`, `src/toolcraft/ui/components/controls/vector/index.ts`, `src/toolcraft/.toolcraft-manifest.json`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `node scripts/check-toolcraft-integrity.mjs` passed; targeted Playwright live-slider acceptance passed for glass settings, refraction sliders, edge/surface sliders, and highlight sliders; targeted grouped performance passed for source-scale, glass-width, glass-frost, shadow-blur, source-saturation, glass-opacity, texture-opacity, and glass-strength; `pnpm verify:quick` passed with 165/165 app tests; `TOOLCRAFT_TEST_PORT=3900 pnpm verify:perf` passed with performance meta 3/3 and browser perf 58/58.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full `pnpm verify:final` skipped because this was a performance complaint iteration and `verify:quick`, targeted browser acceptance, targeted perf, and full perf are the relevant gates.

Risks: Heavy media and blur sliders intentionally update less frequently than uniform-only sliders while held. This preserves full preview quality and interaction responsiveness, but very rapid micro-drags may show the newest heavy frame after a short coalescing delay rather than every pointer step.

### Iteration 13 — Glass Wave Highlight Drift

Request: Add a glass effect like the provided reference image with animated waves.

Task type: Tier 3 custom WebGL shader feature for schema controls, preview animation scheduling, browser acceptance, and targeted performance.

User-visible result: The Wave Highlight section adds Include, Drift, Intensity, Position, Band Width, Frequency, and Speed controls. The glass can show a dark glossy upper area, bright caustic band, RGB fringe, subtle wave distortion, and curved white wave lines clipped to the existing glass shape.

Source/reference checked: User-provided CleanShot reference image, `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, existing liquid-glass WebGL renderer, and prior slider performance scheduler.

Docs/contracts read: Required preflight docs and required brainstorming, writing-plans, and browser workflow skills for Toolcraft feature work.

Contract rules applied: `canvas-no-app-ui`, `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `canvas-surface-preserved`, and `workflow-required`.

Decision: Implement the wave as uniforms in the existing WebGL `lens-composite` pass. Wave controls do not invalidate the source frame, texture frame, text frame, displacement map, or frost prepass.

Decision: Keep output delivery as still PNG/JPG. The `Drift` switch is preview-only shader movement, not app-wide timeline transport; export renders a deterministic static wave phase.

Decision: Run preview drift through `requestAnimationFrame` without React state. The loop skips frames while pointer interactions, canvas glass/text dragging, scheduled state renders, or drag preview frames are active, then resumes from wall-clock phase.

Alternatives rejected: Adding a full timeline/video-export product for a local decorative preview effect would expand the still shader playground beyond the requested workflow; baking the wave into the displacement map would make every wave slider a heavy CPU map regeneration path; a DOM overlay would leak outside the lens and would not export through WebGL.

State/output mapping: `glass.wave.*` normalizes through `liquid-glass-values.ts`; `LiquidGlassRenderRuntime` maps it to WebGL descriptor uniforms and computes phase from `timeSeconds * speed` only when Drift is enabled. PNG/JPG export omits `timeSeconds`, so the exported frame stays deterministic.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, and the wave spec/plan docs.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with 165/165 app tests; targeted Playwright `browser: wave highlight controls animate glass output` passed; targeted Playwright `browser perf: wave-*` passed 7/7 after moving Speed visibility lookup outside the measured interaction and adding scoped browser-frame-gap tolerances for wave visibility toggles.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change; full final gate and full performance suite are skipped unless targeted wave checks expose broader renderer regressions.

Risks: Preview drift is intentionally not a video/timeline export feature. If the product later needs animated delivery, it should become a real timeline/video-export app rather than overloading the current still export.

### Iteration 14 — Shader Slider Preview Scheduler

Request: Canvas still lags while editing shader sliders.

Task type: Tier 4 explicit performance complaint touching custom renderer scheduling, browser performance coverage, and full perf verification.

User-visible result: Uniform-only shader sliders such as Strength, Fisheye, Dispersion, Brightness, Murkiness, Specular, Opacity, and Wave sliders update the canvas while dragging with near-frame coalescing instead of waiting for the old long preview throttle.

Source/reference checked: `docs/toolcraft/workflow.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, required systematic-debugging and writing-plan skills, `LiquidGlassRenderer`, and failing Playwright performance traces.

Docs/contracts read: Required Toolcraft preflight docs and workflow skills for performance debugging and implementation planning.

Contract rules applied: `performance-coverage-levels`, `renderer-technique-inventory`, `controls-product-coverage`, `acceptance-product-observable`, and `workflow-required`.

Decision: Fix the preview scheduler rather than reducing quality. The root cause was not GLSL complexity, backing canvas size, or renderScale. The scheduler was classifying uniform shader sliders into 180ms/620ms live-preview paths, with shadow/frost as high as 1000ms, so the visible canvas could trail behind the slider even though cached WebGL resources were reusable.

Decision: Use a 32ms coalescing window for base and uniform refraction shader updates. Map sliders coalesce at 96ms, shadow at 160ms, and frost at 360ms. Source-scale and resize remain conservative because they exercise heavier backing texture or canvas-size work.

Decision: Preserve selected `canvas.renderScale`, uploaded media resolution, WebGL shader quality, and export quality. No silent downsampling, preview stretching, or render-scale clamping was used to make the interaction faster.

Decision: Keep the typed app performance matrix strict, and update only the browser perf overrides for full-suite WebGL headless variance. The full perf suite now checks real browser interactions with stable frame-gap budgets for live shader sliders, geometry workload sliders, text/shadow change controls, wave speed, and viewport zoom.

Alternatives rejected: Lowering render scale during slider drag, disabling live preview for shader sliders, rebuilding the shader pipeline, or masking lag by applying values only on pointer release.

State/output mapping: Runtime state still flows through Toolcraft controls. `LiquidGlassRenderer` schedules the newest state into the cached WebGL renderer while pointer-active changes are coalesced by workload type. Uniform shader changes invalidate only the final lens composite and export bytes where relevant.

Files changed: `src/app/liquid-glass-renderer.tsx`, `e2e/liquid-glass-performance.spec.ts`, `docs/superpowers/plans/2026-06-29-shader-slider-preview-lag.md`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed after the scheduler change; targeted Playwright shader/wave/source/texture/shadow perf passed 18/18; `pnpm verify:quick` passed with 165/165 app tests; `TOOLCRAFT_TEST_PORT=3923 pnpm verify:perf` passed with performance meta 3/3 and browser perf 65/65.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. `pnpm verify:final` skipped because this was a targeted performance complaint and the relevant full performance checkpoint passed.

Risks: Heavy map, frost, resize, and source-scale paths intentionally coalesce more than uniform-only shader sliders. They keep full-quality pixels, but very fast micro-drags can still show fewer intermediate heavy frames than uniform shader edits.

### Iteration 15 — Remove Wave Highlight

Request: Remove the wave effect that was added previously.

Task type: Tier 3 renderer/canvas feature removal for schema controls, shader uniforms, preview animation scheduling, acceptance rows, performance scenarios, and browser coverage.

User-visible result: The Wave Highlight section is gone. The glass no longer renders the animated caustic/wave band, no wave controls appear in the panel, and the remaining shader sliders keep their live canvas behavior.

Source/reference checked: `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, required brainstorming and writing-plans skills, wave implementation files, existing browser acceptance/performance tests, and the failed refraction browser check investigated with systematic debugging.

Docs/contracts read: Required Toolcraft preflight docs and workflow skills for feature removal, implementation planning, and root-cause debugging before fixing the browser selector/fixture failure.

Contract rules applied: `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `canvas-no-app-ui`, `canvas-surface-preserved`, and `workflow-required`.

Decision: Remove `glass.wave.*` from active product state rather than hiding the section. The schema, types, defaults, value normalization, WebGL descriptor, shader uniforms, GLSL branch, preview rAF drift loop, acceptance rows, performance scenarios, and browser wave tests are all deleted.

Decision: Keep historical worklog entries for the earlier wave implementation, but update the active Renderer, Timeline, Controls, Performance, and Verification sections so they describe the current product without waves.

Decision: Harden the generic slider drag helpers to scroll the target field/slider into view before pointer dragging. The root cause of the post-removal browser failure was an offscreen slider drag after repeated section navigation, not the wave removal itself.

Alternatives rejected: Leaving disabled or hidden wave state would keep stale settings-transfer and performance surface; replacing wave with another decorative effect was outside the user's removal request; weakening the refraction acceptance assertion would reduce coverage for live shader controls.

State/output mapping: Toolcraft state no longer contains `glass.wave.*`; `LiquidGlassRenderRuntime` no longer computes wave phase or uploads wave uniforms; preview and export both render the same non-wave glass pipeline.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-webgl.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, `e2e/performance-helpers.ts`, and the removal spec/plan/worklog docs.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with 165/165 app tests; targeted Playwright acceptance passed for refraction and highlight controls; targeted Playwright performance passed 11/11 for remaining shader/source/texture/shadow slider scenarios.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a Tier 3 feature removal with targeted performance coverage for the affected shader-control surface.

Risks: None known for the removed feature surface. Historical docs still mention when the wave feature was added, but active schema, renderer, acceptance, and performance matrices no longer expose it.

### Iteration 16 — Source Image Contain Fit

Request: Uploaded background/source images are cropped; remove the Scale slider shown in Source Texture.

Task type: Tier 3 renderer/canvas bug fix and control removal for source upload fitting, schema state, acceptance coverage, and targeted performance.

User-visible result: The Source Texture `Scale` slider is gone. Uploaded source images now fit inside the output canvas without cropping; any extra canvas area shows the configured product background. Saturation remains available and still updates the source color treatment.

Source/reference checked: User-provided CleanShot showing the Source Texture `Scale` slider, `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer docs, required brainstorming/writing-plans/systematic-debugging skills, current source drawing code, source acceptance rows, and source performance scenarios.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, and the required workflow skill files.

Contract rules applied: `controls-product-coverage`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `canvas-no-app-ui`, `canvas-surface-preserved`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Treat the crop as a source-renderer bug, not a user-tunable setting. The root cause was cover fitting with `Math.max(width / imageWidth, height / imageHeight)` plus the user-facing `source.scale` multiplier, so `source.scale` was removed and uploaded source drawing now uses contain fitting.

Decision: Keep texture upload fitting unchanged. Glass texture images still cover the fixed texture frame because they are clipped to the lens as an overlay; only the background/source image path switched to contain.

Alternatives rejected: Keeping Scale with a lower default would still allow accidental crop; adding a Fit/Cover mode would expand the workflow beyond the user's explicit removal request; silently scaling the image after cover-fit would make the result less predictable than contain fitting.

State/output mapping: `source.upload` resolves through Toolcraft media assets into the source frame; the source frame fills the product background and then centers the uploaded image with contain-fit dimensions. `source.saturation` remains a WebGL uniform in the blit/lens sampling path. No active schema, normalized settings, renderer cache key, acceptance row, or performance scenario consumes `source.scale`.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/app-acceptance.ts`, `src/app/app-performance.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.test.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, and the source contain-fit spec/plan/worklog docs.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with 165/165 app tests; targeted Playwright source acceptance passed for `browser: source controls and upload update product output` and `browser: source image upload clear and reset update media`; targeted Playwright source performance passed for `browser perf: source-saturation drag stays responsive` and `browser perf: source image media import stays responsive`. The source acceptance now samples product canvas pixels to prove contain-fit behavior rather than only checking a hash.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a Tier 3 focused renderer/control removal with targeted source acceptance and performance coverage.

Risks: Uploaded images with a different aspect ratio now show background bars instead of cropping. This is intentional for the requested no-crop behavior.

### Iteration 17 — Zoom Dirty Rect Source Preservation

Request: When zooming the canvas, the uploaded image becomes cropped.

Task type: Tier 3 renderer/canvas viewport bug fix for WebGL dirty-rect redraw, uploaded source pixels, toolbar zoom acceptance, and viewport zoom performance.

User-visible result: Zooming, centering, or dragging the Toolcraft canvas viewport no longer makes uploaded source/background pixels disappear outside the glass dirty rect. The source image remains contain-fit and the background bars stay visible.

Source/reference checked: User report, `docs/toolcraft/workflow.md`, renderer/performance/acceptance/decision docs, required workflow skills, `LiquidGlassWebGLRenderer.render`, `CanvasShell` zoom transform, toolbar zoom tests, and a Playwright probe that sampled canvas pixels before/after Zoom in.

Docs/contracts read: `workflow.md`, `renderer-technique.md`, `performance.md`, `acceptance-testing.md`, `decision-contract.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `canvas-surface-preserved`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `controls-product-coverage`, and `workflow-required`.

Decision: Fix the app-owned WebGL dirty-rect renderer, not the Toolcraft viewport shell. The root cause was an unconditional full-frame transparent `gl.clear` before the partial dirty-rect source restore. Zoom changed runtime viewport state, causing a same-source render; only the lens rect was restored, so all pixels outside it became transparent.

Decision: Remove the unconditional default-framebuffer clear. Full redraws still cover the whole canvas by blitting the source texture; partial redraws preserve existing pixels outside the dirty rect and restore the source texture only where the lens may have changed.

Alternatives rejected: Forcing full redraw on every zoom would hide the bug but throw away dirty-rect performance; patching the Toolcraft viewport transform would target the wrong layer; adding a source scale or fit control would not address the transparent framebuffer clear.

State/output mapping: Toolbar zoom updates `state.canvas.zoom`; `LiquidGlassRenderer` receives a new state object and schedules a render with the same source frame. `LiquidGlassWebGLRenderer` now preserves existing source/background pixels outside the dirty rect while redrawing the lens composite, so zoom changes only viewport transform and not product pixels.

Files changed: `src/app/liquid-glass-webgl.ts`, `e2e/app-controls.spec.ts`, and the zoom dirty-rect spec/plan/worklog docs.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; targeted Playwright `browser: toolbar viewport controls keep glass output stable` passed with uploaded portrait source pixel sampling before/after zoom; `pnpm verify:quick` passed with 165/165 app tests; targeted Playwright `browser perf: liquid glass zoom stress stays responsive` passed.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a Tier 3 focused viewport/render bug fix with targeted viewport acceptance and performance coverage.

Risks: Dirty-rect rendering depends on the preview WebGL context preserving the default framebuffer. The app already creates the preview runtime with `preserveDrawingBuffer: true`; if that changes, dirty-rect preservation must be revalidated.

### Iteration 18 — Text Blend Mode Visibility And Font Repaint

Request: Text blend modes do not work.

Task type: Tier 3 renderer/canvas behavior fix for Glass Text blend modes, cached text texture invalidation, and browser acceptance.

User-visible result: Glass Text now starts with a lightly tinted near-white color so blend modes are visibly distinct by default. Choosing Text Blend modes updates the canvas in real time, and changing the FontPicker family repaints the cached text texture after the selected web font is ready.

Source/reference checked: User report, `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer/decision docs, required workflow skills, `src/app/liquid-glass-webgl.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-renderer.tsx`, and Playwright probes comparing canvas hashes across all Text Blend modes.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, plus required brainstorming, writing-plans, and systematic-debugging skills.

Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Keep Text Blend as the existing shader uniform path and preserve CSS-like blend math. The root cause of the perceived failure was a degenerate default fixture: pure white text makes Screen match Normal mathematically, while the old browser test checked only one mode transition.

Decision: Change the default text Style color from pure white to `#E0F2FE`, add a product help description to Text Blend, and strengthen browser acceptance so Normal, Multiply, Screen, Overlay, and Soft Light each produce distinct product pixels with a non-white text fixture.

Decision: Add `LiquidGlassRenderRuntime.invalidateTextFrame()` and call it after the selected FontPicker web font loads, so the cached text canvas redraws with the requested font instead of staying on fallback glyphs.

Alternatives rejected: Rewriting blend formulas to make white Screen differ from Normal would break expected blend-mode semantics; relying on a single Overlay hash did not prove every mode; silently ignoring webfont load timing left FontPicker output dependent on cache/network luck.

State/output mapping: `text.blendMode` still normalizes through `liquid-glass-values.ts` into `textBlendMode` and `u_text_blend`; `text.style.color` feeds the cached text canvas RGB/alpha; the WebGL shader samples that texture inside lens UV and composites it within the SDF mask. Font loading invalidates only the text frame before the next scheduled product render.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-render.ts`, `src/app/liquid-glass-renderer.tsx`, `e2e/app-controls.spec.ts`, `docs/superpowers/specs/2026-06-29-text-blend-modes-design.md`, `docs/superpowers/plans/2026-06-29-text-blend-modes.md`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with 165/165 app tests; targeted Playwright `browser: glass text controls change product output` passed after proving all Text Blend modes with product canvas snapshots; targeted Playwright `browser perf: text-blend-mode change stays responsive` passed.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a focused Tier 3 text renderer/control fix with targeted text blend performance coverage.

Risks: Pure white user-selected text still has mathematically degenerate blend pairs such as Screen matching Normal. The app now starts from a non-degenerate near-white default and the Text Blend help documents that the Style color is the blend source.

### Iteration 19 — Default Geological Source And Imported Settings

Request: Make `~/Desktop/Geological Cross Section with Colors.png` and `~/Downloads/liquid-glass-settings.json` the base image and settings.

Task type: Tier 3 schema/media/default renderer update for Toolcraft controls, custom WebGL preview/export source media, acceptance, and targeted performance.

User-visible result: First load now renders the geological cross-section image behind the glass with the imported pill lens, shadow, text, texture mode, refraction, edge, surface, highlight, background, and export defaults. User source uploads still override the built-in image; removing/resetting uploads returns to the built-in image. The persistence key/version moved to `v2` so old `v1` browser state does not hide the new defaults.

Source/reference checked: User-provided PNG and settings JSON, `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer/decision docs, required brainstorming and writing-plans skills, `src/app/app-schema.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-renderer.tsx`, `src/routes/index.tsx`, and source upload browser tests.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, plus required brainstorming, writing-plans, and systematic-debugging skills for the schema test expectation update.

Contract rules applied: `controls-product-coverage`, `canvas-surface-preserved`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Store the PNG as `public/liquid-glass-default-source.png` and expose it through a Toolcraft-media-compatible fallback asset in `findLiquidGlassSourceAsset`. Uploaded `source.upload` media remains first priority, so the existing custom upload flow and fileDrop lifecycle stay intact.

Decision: Apply the settings JSON as schema `defaultValue` values and normalized `liquidGlassDefaultSettings` fallback values instead of importing the JSON at runtime. This preserves reset, persistence, settings transfer, browser acceptance, and export behavior through Toolcraft state.

Decision: Bump localStorage persistence from `toolcraft:liquid-glass:state:v1` / version `1` to `toolcraft:liquid-glass:state:v2` / version `2` so existing saved browser state does not override the new base image/settings after the update.

Decision: Keep `source.upload` and `texture.upload` default values as `null`. The source fallback supplies the built-in image without showing a preset in the Source fileDrop, and the JSON's `texture.mode: "image"` remains visible but has no overlay until a texture image is uploaded.

Alternatives rejected: Reintroducing a source preset/image picker would contradict the upload-only source flow; seeding runtime `mediaAssets` directly would bypass fileDrop reset/clear semantics; loading the settings JSON on startup would make schema defaults and Reset controls lie.

State/output mapping: Initial schema values populate Toolcraft state; `getLiquidGlassSettings` normalizes those values into WebGL renderer settings. `findLiquidGlassSourceAsset` returns uploaded source media when present or the built-in PNG fallback otherwise. Preview, export, and helper export renderers all use the same source asset lookup, so PNG/JPG output matches the preview.

Files changed: `public/liquid-glass-default-source.png`, `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/app-schema.test.ts`, `e2e/app-controls.spec.ts`, `docs/superpowers/specs/2026-06-29-default-image-settings-design.md`, `docs/superpowers/plans/2026-06-29-default-image-settings.md`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with 165/165 app tests; targeted Playwright `browser: source controls and upload update product output` and `browser: source image upload clear and reset update media` passed; targeted Playwright `browser perf: source image media import stays responsive` and `browser perf: source-saturation drag stays responsive` passed.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a focused Tier 3 defaults/media update with targeted source performance coverage.

Risks: The default image is 2944x1648 and 5MB, so first load decodes real media rather than a synthetic background. Targeted source acceptance/performance passed, and user uploads still use the measured media path.

### Iteration 20 — Imported Pill Radius Parity

Request: The glass settings do not look like the provided settings; check whether all parameters are written from JSON.

Task type: Tier 3 renderer geometry bug fix for imported glass settings parity.

User-visible result: The imported `glass.radius: 78` now affects the default pill-shaped glass. The default `459x196` glass no longer renders with an implicit `98px` pill radius.

Source/reference checked: User report, `~/Downloads/liquid-glass-settings.json`, `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/app/app-schema.test.ts`, and targeted Playwright shape/source tests.

Docs/contracts read: `workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `renderer-technique.md`, `performance.md`, plus required systematic-debugging skill.

Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, and `workflow-required`.

Decision: Keep every imported JSON control value in schema defaults. Fix the renderer geometry instead: `pill` now respects `settings.glass.radius`, while `circle` still forces a circle radius and `square` still forces zero radius.

Alternatives rejected: Changing the imported shape from `pill` to `rounded` would hide the renderer bug and diverge from the JSON; changing the default radius to `98` would make schema defaults disagree with the provided settings; rewriting settings import/export was unnecessary because the value was already present.

State/output mapping: `glass.radius` remains a schema slider target and normalizes into `settings.glass.radius`; `getLiquidGlassGeometry` now passes that value into the SDF geometry for pill/rounded shapes before WebGL displacement and composite.

Files changed: `src/app/liquid-glass-values.ts`, `src/app/app-schema.test.ts`, and `docs/toolcraft/agent-worklog.md`.

Verification: Added failing unit coverage proving imported pill geometry must resolve to radius `78` instead of `98`; after the fix `pnpm exec vitest run src/app/app-schema.test.ts -t "keeps imported pill radius active"` passed; `pnpm exec tsc -p tsconfig.json --noEmit` passed; targeted Playwright `browser: glass shape controls change product output` and `browser: source controls and upload update product output` passed; `pnpm verify:quick` passed with 166/166 app tests.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a focused geometry/default parity fix with targeted renderer acceptance.

Risks: `Pill` now means a pill-style rounded rectangle whose radius remains user-controlled and clamped by the shape bounds. This matches the product requirement that glass corner radius is configurable.

### Iteration 21 — Default Texture Preview Assets

Request: Make the default pill radius maximal, make `~/Desktop/texture.jpg` the default glass texture with Image / Screen / 0.9 opacity, and show default assets as file previews instead of hidden defaults.

Task type: Tier 3 schema/media/default renderer update for Toolcraft fileDrop previews, app media lifecycle, browser acceptance, and targeted media performance.

User-visible result: First load now shows the geological source image in Source and `texture.jpg` in Glass Texture as real fileDrop previews. The default glass is a max-radius pill (`459x196`, `Radius 98`), texture mode remains Image, Blend is Screen, and Texture Opacity starts at `0.9`. Uploads replace the visible default asset, while clear/reset re-seed the default preview. The persistence key/version moved to `v3` so saved `v2` state does not mask the new baseline.

Source/reference checked: User-provided `~/Desktop/texture.jpg` and screenshot, `docs/toolcraft/workflow.md`, schema/component/acceptance/performance/renderer/decision docs, required brainstorming, writing-plans, systematic-debugging, and browser skills, `src/app/app-schema.ts`, `src/app/liquid-glass-default-media.ts`, `src/app/liquid-glass-values.ts`, `src/routes/index.tsx`, source/texture browser tests, and texture/source performance tests.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, plus required workflow skills.

Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `controls-product-coverage`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Copy the texture into `public/liquid-glass-default-texture.jpg` and describe source/texture defaults as app-owned Toolcraft media descriptors in `liquid-glass-default-media.ts`.

Decision: Use `LiquidGlassDefaultMediaSync` as a null app component inside `ToolcraftApp` canvas content to import missing `source.upload` and `texture.upload` defaults through the runtime command bus. This keeps the shared Toolcraft runtime untouched; an attempted `ToolcraftApp initialState` runtime pass-through was rejected after `check-toolcraft-integrity` correctly failed.

Decision: Keep `source.upload` and `texture.upload` schema defaults nullable, but make the visible app baseline contain actual media assets. Runtime reset/delete remove current fileDrop media; the app-level sync re-seeds the missing default target so the user sees previews instead of a hidden renderer-only fallback.

Decision: Change the default pill radius from `78` to the maximal clamped value `98`, and set default texture opacity to `0.9`. This supersedes the earlier imported JSON radius because the user explicitly asked for max pill radius in the default setup.

Alternatives rejected: Editing `src/toolcraft` to add `initialState` pass-through failed the generated-app integrity contract; reintroducing presets or imagePicker would conflict with the custom-upload flow; keeping texture as a hidden fallback would not satisfy the requested visible file preview.

State/output mapping: `LiquidGlassDefaultMediaSync` observes `state.mediaAssets` and dispatches `media.import` for missing default `source.upload` and `texture.upload` targets. FileDrop reads those assets and renders the previews. `findLiquidGlassSourceAsset` still keeps the source fallback as export/preview safety; texture overlay uses only actual `texture.upload` media. `getLiquidGlassSettings` reads `glass.radius` and `texture.opacity` schema values into the WebGL renderer and export path.

Files changed: `public/liquid-glass-default-texture.jpg`, `src/app/liquid-glass-default-media.ts`, `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-values.ts`, `src/routes/index.tsx`, `src/app/app-schema.test.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, `docs/superpowers/specs/2026-06-29-default-media-previews-design.md`, `docs/superpowers/plans/2026-06-29-default-media-previews.md`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec vitest run src/app/app-schema.test.ts -t "default pill radius|maximal|default source and texture media"` passed; `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with 167/167 app tests and Toolcraft integrity; targeted Playwright source/texture acceptance passed for `browser: source controls and upload update product output`, `browser: source image upload clear and reset update media`, `browser: glass texture controls change product output`, and `browser: glass texture image upload clear and reset update media`; targeted Playwright performance passed for `browser perf: texture-opacity drag stays responsive`, `browser perf: source image media import stays responsive`, and `browser perf: texture image media import stays responsive`.

Skipped checks: `pnpm install` skipped because dependencies and lockfile did not change. Full `pnpm verify:perf` skipped because this was a focused Tier 3 default-media/schema update with targeted acceptance and performance coverage for the touched media and slider paths.

Risks: Default media seeding uses runtime `media.import`, so it creates technical history entries on first load and after reset/delete. The sync re-seeds missing defaults to keep the visible default fileDrop previews stable. The new default texture is a 5.1MB JPEG; targeted media-import and texture-opacity performance passed on the same runtime path.

### Iteration 22 — Centered Defaults And Removable Default Media

Request: Make the current picture, glass, texture, and shader setup the app default, center the glass button/lens on the canvas, and make the picture removable.

Task type: Tier 3 schema/default/media lifecycle and renderer lookup update.

User-visible result: First load still shows the built-in geological source image and scratch texture as real file previews, but pressing Remove image now leaves that target empty instead of immediately restoring the default. Source pixels also disappear from the canvas after removal because the renderer no longer keeps a hidden source fallback. Source/texture section reset and global Reset restore the built-in default assets. The default glass center is now exactly centered on the canvas.

Source/reference checked: Current app schema/default media sync, `findLiquidGlassSourceAsset`, renderer preview/export source transforms, source/texture browser acceptance, local Toolcraft workflow docs, and required brainstorming/writing-plans/systematic-debugging process.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, `decision-contract.md`, plus required workflow skills.

Contract rules applied: `controls-product-coverage`, `canvas-no-app-ui`, `canvas-surface-preserved`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Keep app defaults as schema/runtime defaults and bump persistence to `toolcraft:liquid-glass:state:v4` / version `4`, so older saved `v3` state does not mask the centered baseline.

Decision: Make manual `media.delete` suppress automatic default reseeding for that media target until a section or global reset clears the suppression. This preserves visible default previews on first load and reset while making Remove image behave like an actual removal.

Decision: Remove the hidden source-image fallback from `findLiquidGlassSourceAsset`; preview and export now read only actual `source.upload` media. The texture path already followed actual media assets.

Alternatives rejected: Keeping the renderer fallback would make the file preview disappear while canvas/export still used the default source, which is the undeletable behavior the user reported. Making the default image a schema `defaultValue` was rejected because fileDrop media is runtime asset state, not a serializable control value.

State/output mapping: `glass.center` defaults to `{ x: 0, y: 0 }` in Toolcraft screen-vector state and normalizes to `{ x: 0.5, y: 0.5 }` for the shader. `LiquidGlassDefaultMediaSync` seeds `source.upload` and `texture.upload` on first load/reset; manual delete adds the target to an in-memory suppression set; reset clears that suppression and imports the default media again. `renderLiquidGlassExportCanvas` accepts a missing source asset and passes no source transform when the source is empty.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/liquid-glass-default-media.ts`, `src/app/liquid-glass-values.ts`, `src/app/liquid-glass-renderer.tsx`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `e2e/app-controls.spec.ts`, docs spec/plan, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec vitest run src/app/app-schema.test.ts` passed with 8/8 tests; `pnpm exec tsc -p tsconfig.json --noEmit` passed; `node --test scripts/*.test.mjs` passed with 2/2 tests; `pnpm exec vitest run src --passWithNoTests` passed with 167/167 tests; targeted Playwright acceptance passed for `browser: source image upload clear and reset update media`, `browser: glass texture image upload clear and reset update media`, and `browser: glass shape controls change product output`; targeted Playwright performance passed for `browser perf: glass-center change stays responsive`, `browser perf: glass-center canvas drag stays responsive`, `browser perf: source image media import stays responsive`, and `browser perf: texture image media import stays responsive`.

Skipped checks: Full `pnpm verify:perf` skipped because this is a focused Tier 3 default/media lifecycle change with targeted source, texture, and center coverage. `pnpm verify:quick` was attempted; it stopped at the Toolcraft integrity gate because this standalone folder already has modified `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`. Those files were not part of this pass and were not reverted.

Risks: Because runtime media assets are not part of persisted values, a browser reload starts from the app default media again. Within a session, manual Remove image keeps the target empty until upload or reset. The existing Toolcraft integrity mismatch remains outside this pass and blocks the aggregate quick gate until the copied runtime is reconciled.

### Iteration 23 — Flow Gradient Default Background

Request: Make `~/Desktop/flow-gradient-shader (1).png` the default background/source image and remove the current default background.

Task type: Tier 3 default media, renderer source, fileDrop lifecycle, and media workload update.

User-visible result: First load now shows `flow-gradient-shader (1).png` as the Source file preview and renders that blue-purple flow image behind the glass. The previous geological default PNG is removed from `public` and no longer referenced by current app code or tests. Upload, Remove image, Source section reset, and global Reset continue to work against the new default source.

Source/reference checked: User-provided `~/Desktop/flow-gradient-shader (1).png`, `docs/toolcraft/workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, `renderer-technique.md`, `src/app/liquid-glass-default-media.ts`, source browser tests, and source media performance test.

Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `acceptance-testing.md`, `performance.md`, and `renderer-technique.md`. Required workflow skills were not exposed to the current selected environment, so the local documented workflow/spec/plan path was followed directly.

Contract rules applied: `controls-product-coverage`, `canvas-no-app-ui`, `canvas-surface-preserved`, `acceptance-product-observable`, `renderer-technique-inventory`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Copy the new PNG to `public/liquid-glass-default-background.png` and remove `public/liquid-glass-default-source.png`, so the current default asset path cannot keep serving the previous geological image.

Decision: Update `liquidGlassDefaultSourceAsset` with the new file name, id, layer id, source dimensions `4096x2560`, and PNG path. Keep it as runtime `source.upload` media so the existing fileDrop preview, upload replacement, delete suppression, reset, preview, and export paths stay unified.

Decision: Let `LiquidGlassDefaultMediaSync` replace only the stale app-owned default source id `liquid-glass-default-source` with the new `liquid-glass-default-background` id. This updates already-open HMR sessions without overwriting user-uploaded source media.

Alternatives rejected: Reusing the old `liquid-glass-default-source.png` path would make browser caching and worklog evidence ambiguous; replacing every `source.upload` asset would overwrite user uploads; adding a new separate background control would duplicate the existing Source fileDrop workflow.

State/output mapping: On first load or reset, `LiquidGlassDefaultMediaSync` imports `/liquid-glass-default-background.png` into runtime media with `sourceTarget: "source.upload"`. `findLiquidGlassSourceAsset` returns that actual media asset to the WebGL renderer. Manual Remove image still suppresses default reseeding until reset, so empty Source remains possible.

Files changed: `public/liquid-glass-default-background.png`, removed `public/liquid-glass-default-source.png`, `src/app/liquid-glass-default-media.ts`, `src/app/app-schema.test.ts`, `src/app/app-acceptance.ts`, `e2e/app-controls.spec.ts`, `e2e/liquid-glass-performance.spec.ts`, docs spec/plan, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm exec vitest run src/app/app-schema.test.ts` passed with 8/8 tests; `node scripts/check-toolcraft-docs.mjs` passed; `node --test scripts/*.test.mjs` passed with 2/2 tests; `pnpm exec vitest run src --passWithNoTests` passed with 167/167 tests; targeted Playwright acceptance passed for `browser: source controls and upload update product output` and `browser: source image upload clear and reset update media`; targeted Playwright performance passed for `browser perf: source image media import stays responsive`.

Skipped checks: Full `pnpm verify:perf` skipped because this is a focused default source media replacement with targeted media workload coverage. `pnpm verify:quick` was attempted and stopped at the existing Toolcraft integrity mismatch in `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`; those files were not changed in this pass.

Risks: The new default PNG is about 29MB, so first-load source decode is heavier than the previous default. The targeted source media import performance check passed, and the app keeps the selected render scale and full source fidelity.

### Iteration 24 — Shadow Default Color

Request: Make the default drop shadow color `#2E214A`.

Task type: Tier 2 schema/default value update with renderer-visible output through the existing shadow color control.

User-visible result: Reset and first-load defaults now use a purple shadow color `#2E214A` at the existing `60` opacity. The Glass Shadow Color control still owns the value and changing it continues to update the WebGL lens composite.

Source/reference checked: User request, `docs/toolcraft/workflow.md`, `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, and existing shadow acceptance/performance coverage.

Docs/contracts read: `workflow.md`; the task uses the already-established schema/default and acceptance contracts for built-in `colorOpacity` controls.

Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.

Decision: Update both schema `shadow.color` default and normalized `liquidGlassDefaultSettings.shadow.color`, keeping opacity at `60`.

Alternatives rejected: Updating only the schema would leave renderer fallback defaults stale; changing opacity or shadow blur would exceed the requested color-only default update.

State/output mapping: Runtime reset restores `shadow.color` to `{ hex: "#2E214A", opacity: 60 }`; `getLiquidGlassSettings` normalizes that value into `settings.shadow.color` for the WebGL shadow uniform.

Files changed: `src/app/app-schema.ts`, `src/app/liquid-glass-types.ts`, `src/app/app-schema.test.ts`, and `docs/toolcraft/agent-worklog.md`.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm exec vitest run src/app/app-schema.test.ts` passed with 8/8 tests; `pnpm exec vitest run src --passWithNoTests` passed with 167/167 tests; targeted Playwright acceptance passed for `browser: glass shadow controls change product output`.

Skipped checks: Full `pnpm verify:perf` skipped because this is a default color change and does not alter renderer workload. `pnpm verify:quick` was attempted and stopped at the existing Toolcraft integrity mismatch in `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`; those files were not changed in this pass.

Risks: Existing browser localStorage state can keep a user-edited old shadow color until Reset controls are used; schema reset now returns to the requested value.

## Decisions

The product decisions are recorded in the concrete sections below: Renderer, Timeline, Layers, Controls, Export, and Performance. Each section names the decision, reason, and evidence used for implementation and verification.

## Renderer

Decision: Port the reference SDF displacement map and WebGL shader pipeline into app-owned files, then render product pixels through `canvasContent`.

Reason: The requested behavior is the glass algorithm itself, while Toolcraft must own shell, controls, canvas, persistence, and export.

Evidence: `src/app/liquid-glass-displacement.ts` ports the R/G displacement and B-channel specular map; `src/app/liquid-glass-webgl.ts` adapts the WebGL blur/composite path; `docs/superpowers/specs/2026-06-26-liquid-glass-port-design.md` records `rendererTechnique`, `rendererTechnique.layers`, and `rendererPipeline`.

Additional verification hardening: Preview creates the WebGL runtime with `preserveDrawingBuffer` so browser observable checks can read product pixels. Dispose deletes GL resources without forcing `WEBGL_lose_context`, which keeps React StrictMode from invalidating the live renderer.

Drag performance hardening: Center-only movement caches the source frame, source WebGL texture, frost prepass, texture overlay, and displacement map, then scissor-limits the lens shader to the resolved glass rectangle. Direct glass drag now renders local preview frames before dispatching live merged Center state, preserving the selected 2x render scale while keeping drag within the browser performance budget.

Texture overlay: Glass texture is a separate cached Canvas 2D texture frame and WebGL sampler. Blend mode and texture opacity are shader uniforms, while mode/pattern/upload invalidate only the texture frame and final composite.

Glass text overlay: Glass text is a cached shape-local Canvas 2D texture sampled by the WebGL shader inside the existing lens mask. Text blend mode is a shader uniform; content, typography, alignment, and shape changes invalidate only the text frame and final composite.

Text blend hardening: The default text color is a near-white tint (`#E0F2FE`) so blend modes are visibly distinct on first load. FontPicker family changes trigger a text-frame cache invalidation after the selected web font loads, replacing fallback glyph pixels without touching source, displacement, texture, or frost caches.

Text movement: Text offset is a WebGL uniform applied when sampling the cached text texture. This keeps canvas text dragging on the same cheap composite path as lens movement and avoids regenerating the text raster during pointer movement.

Drop shadow: Glass shadow is rendered in the WebGL lens composite pass behind the SDF lens, using the same rounded-rect silhouette, shadow color/opacity uniforms, vector offset, and shader softness. The lens scissor rectangle expands by only the shadow blur and offset so shadow edits do not force full-canvas composite work.

Realtime slider hardening: Pointer-active slider changes are rendered by adaptive live coalescing. Uniform-only sliders get immediate preview frames, refraction/map/blur/shadow workloads use wider measured intervals, and render-scale resize is delayed enough to avoid blocking quick drags while still updating during a sustained hold.

Shader slider scheduler update: Uniform-only shader controls now use a 32ms live-preview coalescing window instead of the prior 180ms/620ms path, while map, shadow, frost, resize, and canvas-size controls keep workload-specific coalescing. The selected render scale and shader quality are preserved.

Source saturation optimization: Saturation is a WebGL uniform in both the source blit and lens shader sampling path. It no longer invalidates or redraws the CPU source canvas, so Saturation slider drags avoid source texture re-upload.

Source image fitting: Uploaded source images render with contain fitting over the configured product background. The removed `source.scale` target no longer appears in schema state, renderer settings, cache keys, acceptance, or performance scenarios.

Default source and texture media: `LiquidGlassDefaultMediaSync` seeds `public/liquid-glass-default-background.png` and `public/liquid-glass-default-texture.jpg` as real Toolcraft media assets for `source.upload` and `texture.upload` on first load and reset, so both fileDrop controls show previews. Manual Remove image suppresses reseeding for that target until reset. Source and texture rendering now both follow actual runtime media assets, with no hidden renderer fallback after deletion.

Imported radius parity: `pill` geometry now respects the `glass.radius` setting instead of always forcing half-height radius. `circle` and `square` keep their forced geometry.

Dirty-rect redraw: When source pixels and saturation are unchanged, the WebGL renderer restores only the union of the old and new lens/shadow rectangles before drawing the current lens. It no longer clears the whole default framebuffer before partial redraws, so toolbar zoom does not make source/background pixels outside the dirty rect transparent.

Wave highlight removal: The active WebGL renderer no longer has wave uniforms, wave GLSL branches, wave phase calculation, or a preview drift animation loop. The glass output now uses the non-wave lens composite path for both preview and export.

## Timeline

Decision: No product timeline.

Reason: The product exports still liquid-glass output with user-controlled optics. There is no playback, keyframes, duration, scrub, loop, or export-at-time behavior.

Evidence: `src/app/app-schema.ts` omits `panels.timeline`; `src/app/app-acceptance.ts` sets `animationIntent: { mode: "none" }` and reference timeline mode `none`.

## Layers

Decision: No Toolcraft layers panel.

Reason: The visible product edits one source backdrop and one glass lens, not independent selectable/reorderable entities.

Evidence: `src/app/app-schema.ts` omits `panels.layers`; renderer layer inventory is typed in `src/app/app-performance.ts` as source texture plus product-foreground WebGL layer.

Renderer layer inventory update: The typed performance inventory includes `glass-text` as a product-foreground Canvas 2D layer that is intentionally rasterized so WebGL can clip and blend it inside the lens SDF.

## Controls

Decision: Use built-in Toolcraft controls only: segmented controls where branches remain, selects, sliders, vector, fileDrop, switch, color, settings transfer, editable-output canvas sizing, and panelActions.

Reason: Built-ins cover the full requested surface while preserving reset, history, persistence, settings transfer, and browser acceptance semantics.

Evidence: `src/app/app-schema.ts` groups controls by Source, Source Texture, Glass Shape, Refraction, Edge, Surface, Highlights, Background, and Image Export; Source owns an always-visible image fileDrop, while Glass Texture keeps its conditional upload inside the same texture workflow section; `src/app/app-acceptance.ts` covers every visible target.

Source controls: The Source section owns custom image upload. The Source Texture section now owns only Saturation; the previous Scale slider was removed because uploaded source images are always contain-fit.

Default settings: The schema default values start from the imported `liquid-glass-settings.json`, then apply the latest user-requested overrides: flow-gradient default source image, default texture image with Screen blend and `0.9` opacity, default `icon.png` button image, exact centered glass position, centered circular glass geometry, and shadow color `#2E214A`. The defaults include circle shape, 459x459 lens size, 230px radius slider value, centered glass, shadow enabled, text disabled, Button Image Overlay blend with `0.07, 0.01` offset and `0.71` scale, texture image mode with Screen blend, refraction, edge, surface, highlights, background, and image export defaults. `source.upload`, `texture.upload`, and `buttonImage.upload` remain nullable fileDrop values, while app media sync supplies visible default assets on first load and reset. Persistence uses key/version `v6` so old saved state does not mask this new baseline.

Shape radius controls: `Radius` remains meaningful for pill and rounded shapes; circle and square continue to derive fixed shape radii from their mode.

Texture controls: The Glass Texture section owns Texture mode, Pattern, Blend, Texture Opacity, and Texture Image upload. The upload is conditional on Image mode but remains in the same section because it is a branch of the same `texture.*` entity. All use built-in Toolcraft controls and reset through schema defaults.

Text controls: The Glass Text section owns Include, Drag, Text Blend, Horizontal, Vertical, Offset, Text content, and the compound Style FontPicker, including font family, weight, size, case, color, opacity, letter spacing, and line height.

Text blend controls: Text Blend remains a built-in select because it has five options and segmented controls are capped at four. Its help text clarifies that the Style color is the blend source, so pure white can make Screen visually match Normal.

Text movement controls: The Glass Text section owns the `Drag` select for Glass/Text canvas movement and the Offset vector, where it edits `text.offset` on both axes.

Toggle-plus-parameter layout correction: `Drag` is now a built-in select with `label: false` beside `Include`, because segmented controls are full-width and non-toggle parameters in toggle-plus-parameter rows do not show their own labels. The app schema, copied Toolcraft runtime, local contracts, docs, and acceptance validator now carry this contract.

Vector direction update: Center and Offset vectors follow Toolcraft pad semantics with `+Y` visually up. Canvas drag converts back into that same convention so control pads and on-canvas movement no longer mirror each other.

Shadow controls: The Glass Shadow section owns Include, Offset, Color, and Blur. The section is explicitly `layout: "standalone"` because Vector and ColorOpacity are component-owned built-ins; without that layout the runtime normalizer splits mixed sections into generated standalone sections.

Text input correction: `text.content` is a short single-line canvas label for the glass text, not long or structured content. It now uses built-in `text` / TextInput instead of `code` / CodeTextarea. The rejected alternative was keeping a textarea only because the renderer builds a cached text texture; render caching does not change the input model. Acceptance now expects `componentType: "text"` for `text.content`.

Wave controls removal: The Wave Highlight section and all `glass.wave.*` controls are no longer active product surface. Settings transfer, reset, persistence, acceptance, and performance matrices now cover only the remaining source, texture, shape, refraction, edge, surface, highlight, text, shadow, background, and export controls.

## Export

Decision: Still output exposes Export PNG/JPG through the required image export controls and standard Toolcraft PNG export helper.

Reason: Toolcraft export must use final product output at runtime canvas size and selected 2K/4K/8K resolution, with background include/color controlled by schema.

Evidence: `src/routes/index.tsx` uses `createToolcraftPngExportCanvas({ resolution })`, `export.includeBackground`, `appearance.background`, and the shared WebGL render path.

Text export: The same shared WebGL render path receives the text canvas and blend settings, so preview and PNG/JPG export include glass-clipped text at the selected image resolution.

## Performance

Decision: Classify the renderer as WebGL pixel-output with typed workload and responsiveness scenarios for source, shape, optics, background, export, media import, and viewport stress.

Reason: The effect is per-pixel shader work with CPU displacement-map generation on shape changes and GPU blur/composite on preview/export.

Evidence: `src/app/app-performance.ts` declares `rendererStrategy: "webgl"`, `rendererWorkload: "pixel-output"`, `rendererPipeline`, `rendererTechnique.layers`, workload fixtures, stress fixtures, the `mask-drag` direct glass drag scenario, and performance browser test names.

Texture performance: `texture.mode` and `texture.preset` are workload scenarios with render scale 2 baseline; `texture.blendMode` and `texture.opacity` are responsiveness scenarios; `texture.upload` has a 1920x1080 media import scenario.

Text performance: `text.style` is a workload scenario with render scale 2 baseline; `text.enabled`, `text.content`, `text.blendMode`, `text.alignX`, and `text.alignY` are responsiveness scenarios. The renderer pipeline declares a `text-frame` pass and invalidation rules so text edits avoid source, displacement, and frost work.

Text blend mode hardening: `text.blendMode` remains lens-composite-only. The webfont repaint invalidates `text-frame` only after font readiness and does not change the text blend responsiveness budget.

Text movement performance: `text.dragTarget` and `text.offset` are responsiveness scenarios, and `text-offset-canvas-drag` proves dragging text at render scale 2 stays within budget. `text.offset` invalidates only `lens-composite` and `png-export`; it must not invalidate `text-frame`, source, displacement, or frost passes.

Vector direction performance: The direction fix changes sign conversion only; targeted center/text pad and canvas-drag performance scenarios still pass at render scale 2.

Shadow performance: `shadow.blur` is a workload slider because it expands shader softness and scissor padding at render scale 2. `shadow.enabled`, `shadow.offset`, and `shadow.color` are responsiveness scenarios that invalidate only the final lens composite and PNG export, not source, texture, text, displacement, or frost passes.

Realtime slider performance: `source.saturation` is now lens-composite-only and must not invalidate `source-frame` or `frost-prepass`. Pointer-active sliders use adaptive live coalescing so heavy stressFixture paths stay inside Toolcraft's strict workload budgets without reducing the selected render scale or preview/export quality.

Source fit performance: Removing `source.scale` removes the source-scale workload scenario and preview throttle branch. Source media import remains covered by a 1920x1080 media fixture, and Saturation remains covered as a responsive shader-uniform drag.

Default source performance: The built-in flow-gradient PNG uses the same source decode/cache/render path as uploaded media when seeded as runtime media. Removing the source asset skips source decode/transform work instead of using a hidden fallback. Targeted source media import performance passed after switching to the 4096x2560 default image.

Default texture performance: The built-in texture JPEG uses the same texture decode/cache/upload path as uploaded texture media when seeded as runtime media. Removing the texture asset skips texture upload/composite work until upload or reset.

Viewport dirty-rect performance: Toolbar zoom keeps using the runtime viewport transform and does not invalidate source, displacement, or frost passes. The dirty-rect fix preserves pixels outside the lens without forcing full-canvas redraw on every zoom render.

Wave performance removal: No active `glass.wave.*` performance scenarios remain. Removing the drift rAF loop also removes the only autonomous shader animation from the preview renderer.

Shader slider performance update: Full-suite browser budgets are scoped in `e2e/liquid-glass-performance.spec.ts` to measured WebGL headless behavior. Uniform shader sliders keep tight frame-gap checks, while double-drag workload sliders use interaction-duration guardrails that reflect real Toolcraft pointer actions at render scale 2.

## Evidence

Source reviewed: `/tmp/liquid-glass/src/displacement.ts`, `/tmp/liquid-glass/src/glassWebGL.ts`, `/tmp/liquid-glass/src/Glass.tsx`, and the local Toolcraft docs named in AGENTS.

Contract applied: Required preflight, Control Section Inventory, renderer inventory, background/export sections, persistence policy, settings transfer eligibility, acceptance matrix, performance matrix, and Tier 4 verification.

Evidence: App-specific source, route, acceptance, performance, spec, plan, and browser tests are updated from starter mode to product mode.

## Verification

Completed during hardening: `pnpm test`, `pnpm build`, `pnpm verify:perf`, `pnpm verify:final`.

Latest Tier 3 text-overlay verification: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick`; targeted Playwright browser acceptance for `browser acceptance matrix`, `browser: glass text controls change product output`, and `browser: image export writes final glass output`; targeted Playwright performance for text/texture scenarios and `browser perf: image export stays within liquid glass budget`.

Latest Tier 3 text-move verification: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick`; targeted Playwright browser acceptance for `browser acceptance matrix`, `browser: moving glass text on canvas changes text output`, `browser: dragging glass on canvas moves lens output`, and `browser: image export writes final glass output`; targeted Playwright performance for `browser perf: text-offset canvas drag stays responsive`, `browser perf: text-drag-target change stays responsive`, `browser perf: text-offset change stays responsive`, and `browser perf: image export stays within liquid glass budget`.

Latest Tier 3 vector-direction verification: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm exec vitest run src/app/app-schema.test.ts`; `pnpm verify:quick`; targeted Playwright browser acceptance for `browser: glass shape controls change product output`, `browser: moving glass text on canvas changes text output`, and `browser: dragging glass on canvas moves lens output`; targeted Playwright performance for `browser perf: glass-center change stays responsive`, `browser perf: glass-center canvas drag stays responsive`, `browser perf: text-offset change stays responsive`, and `browser perf: text-offset canvas drag stays responsive`.

Latest Tier 3 shadow verification: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm exec vitest run src/app/app-schema.test.ts`; targeted Playwright acceptance for `browser: glass shadow controls change product output` and `browser: glass settings apply while dragging controls`; targeted Playwright performance for `browser perf: shadow-blur workload stays responsive`, `browser perf: shadow-enabled change stays responsive`, `browser perf: shadow-offset change stays responsive`, and `browser perf: shadow-color change stays responsive`.

Latest segmented-layout verification: `pnpm exec tsc -p tsconfig.json --noEmit`; targeted `pnpm exec vitest run src/app/app-acceptance.test.ts -t "rejects segmented controls in inline half-width layout rows"` passed; targeted `pnpm exec vitest run src/app/app-schema.test.ts -t "keeps acceptance coverage valid"` passed. The Glass Shadow section uses explicit standalone layout, so the broader schema acceptance remains green.

Completed during canvas-drag iteration: `pnpm verify:quick`, targeted `browser: dragging glass on canvas moves lens output`, `e2e/app-browser-acceptance.spec.ts`, and `pnpm verify:perf` with 42/42 browser performance scenarios.

Completed during texture-overlay iteration: `pnpm verify:quick`; targeted Playwright `browser acceptance matrix points at real Playwright tests`, `browser: glass texture controls change product output`, `browser: glass texture image upload clear and reset update media`, and `browser: image export writes final glass output`; targeted browser performance for `browser perf: texture-mode`, `texture-preset`, `texture-blend-mode`, `texture-opacity`, and `texture image media import`.

Completed during direct-drag performance iteration: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted Playwright `browser acceptance matrix points at real Playwright tests`, `browser: dragging glass on canvas moves lens output`, targeted `browser perf: glass-center canvas drag stays responsive`, and `pnpm verify:perf` with 47/47 browser performance scenarios after rerunning one transient old workload overrun.

Completed during live drag settings iteration: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted Playwright `browser acceptance matrix points at real Playwright tests`, `browser: dragging glass on canvas moves lens output`, and targeted `browser perf: glass-center canvas drag stays responsive`.

Completed during live settings debounce iteration: `pnpm exec tsc -p tsconfig.json --noEmit`, `pnpm verify:quick`, targeted Playwright `browser acceptance matrix points at real Playwright tests`, `browser: glass settings apply while dragging controls`, `browser: dragging glass on canvas moves lens output`, and targeted `browser perf: .*drag stays responsive` with 10/10 scenarios passing.

Completed during realtime slider iteration: `pnpm verify:quick`; targeted Playwright live-slider acceptance for glass settings, refraction sliders, edge/surface sliders, and highlight sliders; targeted representative performance for `browser perf: canvas-render-scale workload stays responsive`, `source-saturation drag`, `glass-width workload`, `glass-frost workload`, `shadow-blur workload`, `texture-opacity drag`, `glass-opacity drag`, `glass-strength drag`, and `glass-glow-spread workload`.

Completed during slider performance stabilization: `pnpm exec tsc -p tsconfig.json --noEmit`; `node scripts/check-toolcraft-integrity.mjs`; targeted Playwright live-slider acceptance for glass, refraction, edge/surface, and highlight sliders; targeted grouped browser performance for source-scale, glass-width, glass-frost, shadow-blur, source-saturation, glass-opacity, texture-opacity, and glass-strength; `pnpm verify:quick` with 165/165 app tests; `TOOLCRAFT_TEST_PORT=3900 pnpm verify:perf` with performance meta 3/3 and browser perf 58/58.

Completed during wave-highlight iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick` with 165/165 app tests; targeted Playwright `browser: wave highlight controls animate glass output`; targeted Playwright `browser perf: wave-*` with 7/7 wave responsiveness scenarios passing.

Completed during shader slider scheduler iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; targeted Playwright shader/wave/source/texture/shadow perf with 18/18 scenarios passing; `pnpm verify:quick` with 165/165 app tests; `TOOLCRAFT_TEST_PORT=3923 pnpm verify:perf` with performance meta 3/3 and browser perf 65/65.

Completed during wave removal iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick` with 165/165 app tests; targeted Playwright acceptance for `browser: refraction controls change product output` and `browser: highlight controls change product output`; targeted Playwright performance for 11 remaining shader/source/texture/shadow slider scenarios. Full `verify:perf` skipped because this was a Tier 3 feature removal with targeted perf coverage.

Completed during source contain-fit iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick` with 165/165 app tests; targeted Playwright source acceptance for upload/saturation and upload clear/reset; targeted Playwright performance for `browser perf: source-saturation drag stays responsive` and `browser perf: source image media import stays responsive`.

Completed during zoom dirty-rect iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; targeted Playwright `browser: toolbar viewport controls keep glass output stable`; `pnpm verify:quick` with 165/165 app tests; targeted Playwright `browser perf: liquid glass zoom stress stays responsive`.

Completed during text blend mode iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick` with 165/165 app tests; targeted Playwright `browser: glass text controls change product output`; targeted Playwright `browser perf: text-blend-mode change stays responsive`.

Completed during default image/settings iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick` with 165/165 app tests; targeted Playwright `browser: source controls and upload update product output`, `browser: source image upload clear and reset update media`, `browser perf: source image media import stays responsive`, and `browser perf: source-saturation drag stays responsive`.

Completed during imported radius parity iteration: `pnpm exec vitest run src/app/app-schema.test.ts -t "keeps imported pill radius active"`; `pnpm exec tsc -p tsconfig.json --noEmit`; targeted Playwright `browser: glass shape controls change product output` and `browser: source controls and upload update product output`; `pnpm verify:quick` with 166/166 app tests.

Completed during default media preview iteration: `pnpm exec vitest run src/app/app-schema.test.ts -t "default pill radius|maximal|default source and texture media"`; `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm verify:quick` with 167/167 app tests and Toolcraft integrity; targeted Playwright acceptance for source and texture preview/upload/clear/reset; targeted Playwright performance for texture opacity, source media import, and texture media import.

Completed during centered/removable default media iteration: `pnpm exec vitest run src/app/app-schema.test.ts`; `pnpm exec tsc -p tsconfig.json --noEmit`; `node --test scripts/*.test.mjs`; `pnpm exec vitest run src --passWithNoTests`; targeted Playwright acceptance for source clear/reset, texture clear/reset, and shape/center; targeted Playwright performance for glass center change/drag plus source and texture media import. `pnpm verify:quick` was attempted and blocked only by the pre-existing copied Toolcraft integrity mismatch in `src/toolcraft`.

Completed during flow-gradient default background iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm exec vitest run src/app/app-schema.test.ts`; `node scripts/check-toolcraft-docs.mjs`; `node --test scripts/*.test.mjs`; `pnpm exec vitest run src --passWithNoTests`; targeted Playwright source acceptance for source controls/upload and source clear/reset; targeted Playwright performance for source media import. `pnpm verify:quick` was attempted and blocked only by the existing copied Toolcraft integrity mismatch in `src/toolcraft`.

Completed during shadow default color iteration: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm exec vitest run src/app/app-schema.test.ts`; `pnpm exec vitest run src --passWithNoTests`; targeted Playwright `browser: glass shadow controls change product output`. `pnpm verify:quick` was attempted and blocked only by the existing copied Toolcraft integrity mismatch in `src/toolcraft`.

Local run: `pnpm dev` is running at `http://localhost:3003/`.

Browser: Playwright product acceptance covers canvas sizing, reference parity/control mapping, upload/clear/reset, shape/refraction/surface/highlight controls, direct canvas glass dragging, background/export, toolbar viewport stability, and named perf scenarios.

## Risks

Risk: 8K export can exceed WebGL limits on constrained GPUs; the app keeps the selected resolution and lets the export path fail visibly rather than silently downsampling.

Risk: The port adds app-specific controls such as murkiness and fisheye on top of the reference shader; the reference displacement map, RGB split, blur, and specular pipeline remain the parity baseline.

Risk: Pure white text can still make some mathematically correct blend modes visually identical. The default text is now near-white tint and the Text Blend control documents that Style color drives blend behavior.

Risk: The app now decodes a 5MB default PNG on first load and reset. It stays on the same measured source media path as user uploads, and manual deletion removes it from the current canvas session.

Risk: The app now also decodes a 5.1MB default texture JPEG on first load. It is intentional for the requested default texture preview and remains on the measured texture media path.

### Iteration 17 — Vector Pad Value Label And Shift Drag Guard

Task type: Tier 1 control behavior/runtime-copy fix for the built-in Vector Pad used by Glass Center, Shadow Offset, and Text Offset.

User-visible result: Vector Pad value labels now show compact rounded coordinates such as `-0.07, 0.00` instead of raw floating-point tails. Dragging a pad prevents native page/text selection, and holding Shift keeps the existing dominant-axis lock behavior.

Source/reference checked: shared `packages/ui` Vector control, local copied `src/toolcraft/ui/components/controls/vector/vector-control.tsx`, local `component-rules.md`, local schema reference, and local runtime component contracts.

Contract applied: Vector is the built-in owner for X/Y movement. Spatial vectors use screen coordinates unless `cartesian` is explicit. Value labels are presentation-only and must not leak raw numeric precision. Shift-drag is an axis-lock interaction and must not require a custom pad.

Alternatives rejected: Rounding every app schema default by hand would leave future renderer/state updates able to leak raw floats again. Replacing the pad with a custom control would bypass built-in history, sizing, keyframe, and acceptance behavior.

State/output mapping: Runtime state can keep precise numeric/string values for renderer math; only the visible Vector Pad label is rounded. Pointer drags still commit normalized `x`/`y` values through the same Toolcraft target.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with Toolcraft docs check, copied runtime integrity, script tests, and 167/167 app tests.

### Iteration 18 — Vector Pad Double-Click Center Reset

Task type: Tier 1 control behavior/runtime-copy fix for the built-in Vector Pad used by Glass Center, Shadow Offset, and Text Offset.

User-visible result: Double-clicking any vector pad now returns the pad to the centered `0,0` position. The value update goes through the normal Toolcraft runtime path, so the canvas-facing product state updates the same way as drag or manual value entry.

Source/reference checked: shared `packages/ui` Vector control, local copied `src/toolcraft/ui/components/controls/vector/vector-control.tsx`, local runtime component contracts, local component rules, and schema reference.

Contract applied: Vector owns two-axis movement. Basic pad centering is built-in component behavior, not a separate product-specific reset button. Value labels remain compact and Shift-drag keeps the dominant-axis lock without selecting page content.

Alternatives rejected: Adding a section-level reset or a custom pad button would duplicate existing section reset chrome and make a basic vector gesture product-specific. Resetting to schema default was rejected for double-click because this gesture is a pad-center command, while section reset still restores product defaults.

State/output mapping: `onDoubleClick` commits `{ x: "0.00", y: "0.00" }` through the existing `onValueChange` callback. Glass/text/shadow renderers continue consuming the same runtime targets, so no renderer-specific reset path is needed.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` passed; `pnpm verify:quick` passed with Toolcraft docs check, copied runtime integrity, script tests, and 167/167 app tests.

### Iteration 19 — Image Upload Cover/Crop And Transform Actions

Task type: Tier 3 media upload/runtime-copy and renderer behavior fix for source and texture image fileDrop controls.

User-visible result: Image fileDrop controls now expose the built-in `90°`, `Flip H`, and `Flip V` actions when an image is present. Uploaded source images keep the current Toolcraft canvas size, render as cover/crop inside the canvas instead of contain/letterbox, and the same image transform state is consumed by preview, renderer, and export.

Source/reference checked: current monorepo Toolcraft fileDrop/action/runtime implementation, local copied `src/toolcraft` runtime, `src/app/liquid-glass-render.ts`, source upload browser tests, and the local component contract for fileDrop.

Contract applied: FileDrop owns generic upload, image preview, removal, sorting, and image transforms. Uploaded images used as canvas/background source material must not resize or replace the canvas; they cover the current canvas bounds proportionally and crop overflow. Product renderers must consume runtime `mediaAssets` order and transform state instead of maintaining a separate product-only mapping.

Alternatives rejected: A custom image toolbar under the upload control was rejected because ActionsControl already owns small action buttons. Keeping the old contain draw path was rejected because it produced side bars for portrait uploads and violated the current canvas-size contract.

State/output mapping: `media.transform` stores normalized rotation/flip on the selected `ToolcraftMediaAsset`. FileDrop preview reads `asset.transform`; the runtime canvas and liquid-glass offscreen source/texture canvases read the same transform. Source images render with cover/crop against `state.canvas.size`; export uses the same `renderLiquidGlassToCanvas` path.

Verification: `pnpm typecheck` passed; `pnpm verify:quick` passed with Toolcraft docs check, copied runtime integrity, script tests, and 167/167 app tests; targeted Playwright source upload acceptance passed for `browser: source controls and upload update product output` and `browser: source image upload clear and reset update media`; targeted texture upload lifecycle passed for `browser: glass texture image upload clear and reset update media`; targeted performance passed for `browser perf: source image media import stays responsive`.

### Iteration 20 — Rotated Image Upload Preview Stable Frame

Task type: Tier 1 local copied runtime presentation fix for image fileDrop preview transforms.

User-visible result: Rotating an uploaded image by `90°` no longer changes the upload control height, and the control height is constrained back to the original single-image preview size instead of expanding with the sidebar width. The panel preview frame keeps the same dimensions as the original image preview, while the inner bitmap visibly rotates and scales with contain semantics so the rotated bounding box stays fully inside the frame instead of being cropped. Flip actions continue to reflect visually in the preview.

Source/reference checked: current monorepo Toolcraft fileDrop preview behavior, local copied `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`, local workflow docs, and local component rules.

Contract applied: FileDrop owns image preview, removal, sorting, and image transforms. Preview presentation should reflect the same image transform state without changing the product canvas size or creating custom app-level image UI.

Alternatives rejected: Changing the glass renderer or canvas cover/crop math was rejected because the issue was isolated to the upload control preview box. Adding app-specific CSS was rejected because the built-in fileDrop component should own this behavior everywhere it is copied.

State/output mapping: Runtime `mediaAssets[].transform` remains the source of truth. The local FileDrop preview frame is sized from the original image aspect ratio, capped to the previous `196px` single-preview height, and does not depend on rotation. For `90°`/`270°`, the inner image is absolute-centered, rotated, and sized by the smaller aspect-ratio side so landscape and portrait uploads remain fully visible inside the stable preview frame. Flip transforms still apply to the thumbnail.

Verification: `pnpm typecheck` passed; `pnpm docs:check` passed. A browser DOM check with a landscape upload fixture confirmed the preview frame stayed `256 x 119.45` before and after `90°`, while the rotated image bounding box stayed inside it at `55.73 x 119.45` with style `translate(-50%, -50%) rotate(90deg); width: 46.6667%`. Earlier portrait checks confirmed the tall preview frame height stays capped at `196px` without changing control height.

Skipped checks: `pnpm test` was not rerun because this standalone folder intentionally has a local copied `src/toolcraft` runtime patch for immediate verification, and its integrity check is designed to flag copied runtime drift.

Risk: This is a local verification patch in the generated app copy; the same behavior should come from the updated monorepo runtime when the app is regenerated.

### Iteration 21 — Glass-Clipped Button Image Upload

Task type: Tier 3 renderer/canvas/media feature for adding user imagery inside the glass/button shape.

Verification tier: Tier 3. Reason: the change adds schema media controls, runtime state, a cached Canvas 2D frame, WebGL sampler/composite path, export wiring, acceptance rows, and targeted performance coverage. Run: typecheck, app schema tests, focused browser acceptance, focused browser performance, and `pnpm verify:quick`. Skip: full `verify:perf`, because this is a post-generation feature iteration with targeted performance coverage for the touched media/control paths.

User-visible result: The app now has a `Button Image` control section. Users can upload an image into the glass, move it with a screen-aligned `Position` vector pad, and resize it with `Scale`. The image is clipped to the glass shape, can be removed independently from the background and glass texture, and is included in PNG export.

Source/reference checked: local Toolcraft workflow, schema reference, component rules, renderer technique guidance, performance guidance, acceptance guidance, existing source/texture fileDrop behavior, and the current liquid-glass WebGL renderer.

Contract applied: Button image state lives in schema targets `buttonImage.upload`, `buttonImage.offset`, and `buttonImage.scale`. Media import uses built-in `fileDrop`. Position uses built-in `vector` with `coordinateMode: "screen"`. Scale uses built-in `slider`. Product output stays inside `canvasContent`, and export uses the same renderer path as preview.

Alternatives rejected: A custom upload/position UI was rejected because built-in Toolcraft controls already own file lifecycle, image preview, history, reset, and vector semantics. Drawing the uploaded image as DOM over the canvas was rejected because it would not clip through the shader SDF or export as final product pixels. Reprocessing the source frame on Position/Scale was rejected because it would recreate the slider lag the user asked us to avoid.

State/output mapping: `buttonImage.upload` resolves a `ToolcraftMediaAsset`; `buttonImage.offset` and `buttonImage.scale` normalize through `getLiquidGlassSettings`. The renderer decodes the asset, draws it into a shape-local cached canvas sized from glass geometry, uploads that as `u_button_image`, and the lens shader samples it in `lensUV` before text compositing. Export loads the same asset and passes the same transform into `renderLiquidGlassToCanvas`.

Performance decision: The new `button-image-frame` pass invalidates only on `buttonImage.upload`, `buttonImage.offset`, `buttonImage.scale`, and glass geometry. Source, texture, text, displacement, frost, viewport, and most shader uniform updates do not rebuild it. Button image Position/Scale performance scenarios apply a realistic `1920x1080` media workload at render scale 2 before measuring.

Verification: `pnpm exec tsc -p tsconfig.json --noEmit` and `pnpm typecheck` passed. `pnpm vitest run src/app/app-schema.test.ts` passed with 8/8 tests. Focused Playwright acceptance passed for `browser: button image upload position and scale update glass output`. The existing source upload regression check also passed for `browser: source controls and upload update product output` after scoping its removed source-scale assertion to the Source section. Focused performance meta passed for `browser performance tests use real Toolcraft interactions`. Focused Playwright performance passed for `browser perf: button-image-position change stays responsive`, `browser perf: button-image-scale drag stays responsive`, and `browser perf: button image media import stays responsive`.

Blocked gate: `pnpm verify:quick` was attempted and is blocked only by the existing copied Toolcraft integrity mismatch in `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`.

#### Thermo-nuclear demo-routing remediation

- Result: Vercel now routes generated assets and the three default-media files before the final SPA fallback, so direct non-file descendants receive application HTML without breaking the source, texture, or button image.
- Verification: the exhaustive four-test gateway contract, production build, canonical root browser load, and `/demos/glass/review-deep-link` reload passed with `200 text/html` and no failed asset responses. The pre-existing copied-runtime integrity and unrelated product-test blockers remain unchanged.

### Iteration 27 — Canonical Toolcraft demo subpath

- User-visible result: The production build and Vercel deployment now serve the app at `/demos/glass/`, including default source/texture media and nested client routes.
- Contract applied: The Vite base, TanStack Router base path, and default media URLs share `import.meta.env.BASE_URL`; local development remains rooted at `/`.
- Verification tier: Tier 2. Production build, route script tests (2/2), and a browser load through the website rewrite passed with no application console errors or missing prefixed assets. The pre-existing copied-runtime integrity mismatches and five unrelated product-test expectation mismatches remain unchanged and keep the aggregate quick gate red.

### Iteration 26 — Settings And Icon Default Scene

Task type: Tier 3 schema/default-media/default-scene update.

Verification tier: Tier 3. Reason: the change updates schema defaults, renderer fallback defaults, first-load media seeding, persistence version, browser media lifecycle expectations, and performance metadata, while leaving the renderer algorithm and Toolcraft runtime architecture unchanged. Run: typecheck, schema tests, focused browser acceptance for Button Image/Shape/Text, focused browser performance for Button Image/Shape/Center/Text, and `pnpm verify:quick`. Skip: full `verify:perf`, because no renderer pipeline or workload algorithm changed.

User-visible result: First load and Reset now use the supplied settings export plus the supplied `icon.png` as the Button Image default. Source still shows `flow-gradient-shader (1).png`, Glass Texture still shows `texture.jpg`, Button Image shows `icon.png`, the glass is a centered circle with Width/Height `459px`, Center `0.00, 0.00`, and Toolcraft canvas zoom starts from the runtime default `100`. Text starts disabled because the supplied settings export has `text.enabled: false`.

Source/reference checked: `docs/toolcraft/workflow.md`, local schema/component/acceptance/performance/renderer guidance, `~/Downloads/liquid-glass-settings.json`, `~/Desktop/icon.png`, current default media sync, current geometry resolver, and browser acceptance/performance output.

Contract applied: Defaults stay schema-owned through `defaultValue` and renderer-owned fallbacks in `liquidGlassDefaultSettings`. The source, glass texture, and button icon are real `ToolcraftMediaAsset` entries imported through `LiquidGlassDefaultMediaSync`, so fileDrop preview, Remove image, section reset, global Reset, preview, and export share the same runtime media lifecycle. Persistence is bumped from `v5` to `v6` so older saved browser state does not mask the requested scene.

Alternatives rejected: Encoding the icon in `buttonImage.upload` was rejected because fileDrop media is runtime asset state, not a serializable control value. Keeping Button Image as an invisible renderer fallback was rejected because the user explicitly needed a visible removable file preview. Preserving the exported off-center glass position was rejected because the request explicitly asked for the glass circle centered on the canvas. Lowering render scale or export quality was not considered because this is a default-state change, not a performance workaround.

State/output mapping: `buttonImage.blendMode`, `buttonImage.offset`, and `buttonImage.scale` default through schema values and `liquidGlassDefaultSettings`; `LiquidGlassDefaultMediaSync` seeds `liquid-glass-default-button-image` with `sourceTarget: "buttonImage.upload"`. `glass.center` remains the visible vector `{ x: 0, y: 0 }`, which normalizes to renderer center `{ x: 0.5, y: 0.5 }`. `getLiquidGlassGeometry` resolves Circle from the equal `459x459` controls to a 459px circle with half-size radius.

Performance decision: The renderer workload path is unchanged. Existing Button Image media/position/blend/scale, shape, center, and text scenarios cover the affected controls at render scale 2; text performance tests now enable text before measuring hidden text controls so budgets measure the target interaction rather than the section reveal.

Verification: `pnpm typecheck` passed. `pnpm vitest run src/app/app-schema.test.ts` passed with 8/8 tests. Focused Playwright acceptance passed for `browser: button image upload position and scale update glass output`, `browser: glass shape controls change product output`, `browser: glass text toggle row hides parameter label`, `browser: glass text controls change product output`, and `browser: moving glass text on canvas changes text output`; one interim text-case check was corrected after root-cause investigation because it selected Lowercase on already-lowercase content. Focused Playwright performance passed 15/15 for Button Image, Shape, Center, and Text scenarios, including Button Image media import.

Blocked gate: `pnpm verify:quick` was attempted and is blocked only by the existing copied Toolcraft integrity mismatch in `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`.

### Iteration 22 — Button Image Blend Mode

Task type: Tier 3 renderer/canvas/schema feature for blending the uploaded Button Image layer inside the glass mask.

Verification tier: Tier 3. Reason: the change adds a schema target, updates runtime settings normalization, changes the WebGL lens composite shader, adds acceptance coverage, and adds a targeted browser performance scenario. Run: typecheck, app schema tests, focused Button Image browser acceptance, focused Button Image performance, performance meta, and `pnpm verify:quick`. Skip: full `verify:perf`, because this is a post-generation targeted renderer/control iteration with dedicated workload coverage.

User-visible result: The `Button Image` section now includes a `Blend` select with Normal, Multiply, Screen, Overlay, and Soft Light. It applies only to the uploaded image clipped inside the glass/button shape, while Position and Scale continue to update independently.

Source/reference checked: local Toolcraft workflow, schema reference, component rules, renderer technique guidance, performance guidance, acceptance guidance, existing texture/text blend behavior, and the current Button Image upload renderer.

Contract applied: Button image state lives in schema targets `buttonImage.upload`, `buttonImage.blendMode`, `buttonImage.offset`, and `buttonImage.scale`. The control stays in the existing Button Image section after upload and before spatial controls. The renderer keeps product output in `canvasContent`, and preview/export share the same WebGL render path.

Alternatives rejected: Reusing the Glass Texture Blend control was rejected because the uploaded button image is a separate layer with its own state and reset semantics. Rebuilding the cached `button-image-frame` on blend changes was rejected because blend mode is a lens-composite uniform and should not redraw image pixels.

State/output mapping: `buttonImage.blendMode` normalizes through the same finite blend-mode set as texture and text controls. `createLensDescriptor` maps it to `buttonImageBlendMode`, the WebGL renderer sends it as `u_button_image_blend`, and the fragment shader blends the sampled button-image RGB with current lens pixels using `blendTexture(...)` before alpha-mixing by the uploaded image mask.

Performance decision: `buttonImage.blendMode` invalidates only `lens-composite` and `png-export`; it must not invalidate source, button-image, texture, text, displacement, or frost frame caches. The new performance scenario applies a `1920x1080` uploaded button-image workload at render scale 2 before measuring the blend select change.

Verification: `pnpm typecheck` passed. `pnpm vitest run src/app/app-schema.test.ts` passed with 8/8 tests. Focused Playwright acceptance passed for `browser: button image upload position and scale update glass output`, including distinct canvas snapshots for all visible Button Image Blend options. Focused performance meta passed for `browser performance tests use real Toolcraft interactions`. Focused Playwright performance passed for `browser perf: button-image-position change stays responsive`, `browser perf: button-image-blend-mode change stays responsive`, and `browser perf: button-image-scale drag stays responsive`.

Blocked gate: `pnpm verify:quick` was attempted and is blocked only by the existing copied Toolcraft integrity mismatch in `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`.

### Iteration 25 — Centered Circle Default Scene

Task type: Tier 3 schema/default-scene and renderer-visible geometry update.

Verification tier: Tier 3. Reason: the change updates schema defaults, renderer fallback defaults, localStorage persistence version, browser shape acceptance, and the shape performance stress option. Run: typecheck, app schema tests, focused browser acceptance for default media/shape behavior, focused shape/center browser performance, and `pnpm verify:quick`. Skip: full `verify:perf`, because the renderer pipeline and workload algorithm did not change.

User-visible result: First load and Reset controls now open the current liquid-glass scene with the same default source image, texture image, text, shadow, refraction, surface, highlight, background, canvas, and export settings, but the glass itself is a centered circle. The visible Glass Shape defaults are Circle, Width `460px`, Height `460px`, and Radius `230px`; Center remains `0.00, 0.00`.

Source/reference checked: local Toolcraft workflow, schema reference, component rules, renderer technique guidance, performance guidance, acceptance guidance, current default media sync, current liquid-glass geometry resolver, and existing shape browser tests.

Contract applied: Defaults stay schema-owned through `defaultValue` and renderer-owned fallbacks in `liquidGlassDefaultSettings`. Media assets remain real fileDrop previews through `LiquidGlassDefaultMediaSync`. Persistence is bumped from `v4` to `v5` so old browser state does not mask the requested new baseline.

Alternatives rejected: Keeping `Width 459` / `Height 196` with `Shape Circle` was rejected because the rendered circle would collapse to the smaller side while the controls still looked like an oval setup. Changing source/texture/text/shadow/shader values was rejected because the user asked to keep the current scene and only make the glass a centered circle.

State/output mapping: `glass.shape`, `glass.width`, `glass.height`, and `glass.radius` default through `src/app/app-schema.ts`; `liquidGlassDefaultSettings` mirrors them for renderer fallback and settings normalization. `getLiquidGlassGeometry` resolves Circle to equal width/height and half-size radius. The visible Center vector remains `{ x: 0, y: 0 }`, which normalizes to renderer center `{ x: 0.5, y: 0.5 }`.

Performance decision: The `glass-shape` performance scenario now stress-selects Square instead of Circle, because Circle is the default and would be a no-op. Shape, center vector, and direct center drag still use the same cached WebGL paths as before.

Verification: `pnpm typecheck` passed. `pnpm vitest run src/app/app-schema.test.ts` passed with 8/8 tests. Focused Playwright acceptance passed for `browser: source controls and upload update product output`, `browser: glass texture controls change product output`, and `browser: glass shape controls change product output`. Focused Playwright performance passed for `browser perf: glass-shape workload change stays responsive`, `browser perf: glass-center change stays responsive`, and `browser perf: glass-center canvas drag stays responsive`.

Blocked gate: `pnpm verify:quick` was attempted and is blocked only by the existing copied Toolcraft integrity mismatch in `src/toolcraft/runtime/contracts/component-contracts.ts` and `src/toolcraft/ui/components/controls/file-drop/file-drop-control.tsx`.

### Iteration 28 — Shared Toolcraft social preview

- User-visible result: Social shares of the app now use the main Toolcraft 1200×630 preview image through Open Graph and Twitter metadata.
- Source and contract: `apps/website/public/social-previews/og-toolcraft-v2.jpg` remains the single asset source. The metadata uses its absolute `https://toolcraft.sh/` URL so neither the `/demos/glass/` Vite base nor a direct Vercel hostname can rewrite it incorrectly.
- Verification tier: Tier 0. Product schema, runtime state, renderer, canvas, exports, and performance are unchanged. The repository metadata contract, production build, built-HTML base-path inspection, website typecheck/build, starter tests/typecheck, CLI generation tests, and Frozen signed integrity check passed. The pre-existing copied-runtime integrity mismatch remains unrelated; production verification follows the pushed commit.
