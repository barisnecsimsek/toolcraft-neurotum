# Implementation Worklog

## Status

Mode: product

Particle Grid Effect is a single-image Toolcraft product that reconstructs an uploaded image as a configurable luminance-driven particle grid and exports the result as an image.

## Decision Trail

### Iteration 9 — Optional below-threshold color

- Request: Add an optional color treatment so particles below Kill below can remain visible in a selected color instead of being removed.
- Decision: Add `particle.colorBelowEnabled` and conditional `particle.belowThresholdColor`. When disabled, the existing early kill remains unchanged. When enabled, below-threshold particles retain their luminance-derived or Minimum width geometry, bypass the kill, and receive the selected color after Dot Pattern but before Grain.
- User-visible result: Particle Shape exposes a Color below toggle and shows Below color only while enabled.
- Performance intent: Two uniforms and constant-cost threshold/color branches in the existing single fragment pass.
- Verification: Node 22 focused shader tests passed 6/6, two targeted schema/performance tests passed, the production Vite build passed, and `git diff --check` passed. Live browser verification confirmed the color picker is hidden by default, appears when Color below is enabled, and produces a different rendered result than kill-only mode at threshold 1 with no browser warnings or errors.

### Iteration 8 — Dot pattern chance default

- Request: Change the default Dot Pattern Chance to `0.02`.
- Decision: Use `0.02` consistently in the schema, renderer fallback, performance scenario, and contract test so initial state and reset behavior match preview and export.
- Verification: Two targeted schema/performance tests passed, the production Vite build passed, `git diff --check` passed, and the live browser showed Chance at `0.02` with no warnings or errors.

### Iteration 7 — Particle width kill threshold

- Request: Add an adjustable option that removes particles below a chosen width threshold.
- Decision: Add `particle.killBelowWidth` as a neutral-by-default Particle Shape slider from 0 to 1. Compare it against luminance multiplied by Width gain before Minimum width and maximum-width clamping, so killed particles remain absent even when Minimum width is nonzero.
- User-visible result: Raising `Kill below` progressively removes narrow/dark particles while leaving wider particles intact.
- Performance intent: One uniform and one early fragment-shader comparison in the existing single pass.
- Verification: Node 22 focused shader tests passed 5/5, two targeted schema/performance tests passed, the production Vite build passed, and `git diff --check` passed. Live browser verification confirmed one neutral-default Kill below slider, a visible output change at value 1, and no browser warnings or errors.

### Iteration 6 — Seamless rows and centered thinning

- Request: Eliminate every visible seam between rows when row gap is fixed at zero, and make horizontal width changes visually symmetric instead of appearing anchored to one side.
- Root cause: The removed Row gap control was not the only vertical-spacing path. `shrinkThreshold` and `maxShrink` still reduced particle height inside each row, while a subpixel fixed edge width could make centered horizontal changes rasterize unevenly at high zoom.
- Decision: Remove vertical height shrink and its two controls so every particle mask spans its full row. Compute horizontal distance from an explicit global column center and enforce at least half a physical pixel of symmetric edge coverage.
- User-visible result: Rows cannot expose background seams through particle geometry, and luminance-driven width expands or contracts around the same column center on both sides.
- State/output mapping: `particle.width`, `particle.minWidth`, `particle.maxColumnWidth`, `particle.columnGap`, and `particle.softness` now affect only the centered horizontal mask. Preview and export share this shader path.
- Verification: Node 22 focused shader tests passed 4/4, three targeted schema/performance tests passed, the production Vite build passed, and `git diff --check` passed. Live browser testing at increased zoom with Maximum width 1, Column gap 0, and Softness 0 showed continuous full-height rows, centered width changes, no removed shrink controls, and no browser warnings or errors.

### Iteration 5 — Connectable particle columns

- Request: Fix row gap permanently at zero, remove its control, and make the maximum horizontal particle width genuinely capable of connecting neighboring columns while remaining adjustable.
- User-visible result: Row gap is no longer shown. Grid now exposes `Maximum width` and `Column gap`, while Particle Shape exposes `Width gain`; setting Maximum width to 1, Column gap to 0, and raising Width gain lets bright particles fill their cells and meet the next column.
- Decision: Treat Maximum width as an absolute cell-width cap instead of multiplying every luminance-derived width by it. Column gap limits the available cap, and Width gain controls how quickly luminance reaches that cap. Remove row-gap state and its shader uniform so vertical row spacing is always zero before the existing luminance-driven height shrink.
- State/output mapping: `particle.maxColumnWidth` caps horizontal coverage, `particle.columnGap` reserves horizontal empty space, and `particle.width` scales luminance before the cap. Preview and export share the same fragment-shader geometry.
- Performance intent: Constant-cost arithmetic changes in the existing fragment pass; no additional render pass or framebuffer.
- Verification: Node 22 focused Vitest passed 4/4, the production Vite build passed, and `git diff --check` passed. Live WebGL verification confirmed no Row gap control, Maximum width = 1, Column gap = 0, and Width gain = 3; bright source regions filled contiguous horizontal cells with no browser warnings or errors.

### Iteration 4 — Single-pass experimental Particle Grid grain

- Request: Keep one Particle Grid effect during visual experimentation; do not add pipeline infrastructure or a base-effect selector. After an initial broader experiment, keep Grain and remove Dither and Distortion for now.
- Task type: Tier 3 custom WebGL shader and schema-control extension within the existing single-image product.
- User-visible result: Particle Grid now exposes one Grain section. Grain can influence luminance-driven particle geometry and color while the product remains one effect, one canvas, one shader draw, and one preview/export renderer.
- Source/reference checked: The complete current Particle Grid GLSL, state resolver, WebGL resource lifecycle, preview component, export renderer, schema, focused tests, and live browser output.
- Reference inputs: The existing Particle Grid implementation; no new external visual reference was supplied.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `core/runtime-boundary.md`, `core/performance.md`, `core/control-selection.md`, `core/layout.md`, `core/setup-export.md`, `core/media-upload.md`, `assembly-workflow.md`, `decision-contract.md`, `schema-reference.md`, `component-rules.md`, `renderer-technique.md`, and `performance.md`.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, and `workflow-required`.
- View interaction intent: `non-spatial`; grain edits the flat image transform without introducing a 3D scene or canvas manipulation.
- Interaction ownership: Every experimental parameter is panel-owned; canvas interaction remains limited to Toolcraft pan/zoom and source drop.
- Decision: Keep the existing Particle Grid renderer and split its GLSL into named internal functions. Grain affects both luminance geometry and particle color. Its amount defaults to zero so the existing appearance remains the baseline; Dither and Distortion were removed from shader state and controls at the user's direction.
- Alternatives rejected: A base-effect registry, generic pipeline, post-effect abstraction, framebuffer chain, and reusable effect stages because no genuinely distinct second visual identity exists yet.
- State/output mapping: `particle.grain*` changes deterministic luminance and particle-color texture. Preview and export continue through the same `ParticleGridWebGlRenderer.render` path.
- Performance intent: Ordinary functional experimentation; no measured performance iteration or full audit was requested or run.
- Verification: Node 22 focused Vitest passed 3/3; the production Vite build passed; a real WebGL2 browser render accepted an uploaded fixture; Grain produced a distinct canvas screenshot hash; Dither and Distortion controls were absent; browser warnings/errors were empty; `git diff --check` passed. Repository-wide TypeScript remains blocked by pre-existing protected acceptance/performance contract drift, while filtered output contains no new errors in `particle-grid.tsx`, `app-schema.ts`, or the new focused test.
- Risks: Grain intentionally affects geometry and color together rather than behaving as an isolated post-effect; visual tuning remains the next step.

### Iteration 3 — Root install and runtime compatibility repair

- Request: "NPM install çalışmıyor. task run yapınca siteyi göremiyorum."
- Task type: Failed local install, failed development startup, and product renderer/runtime compatibility repair.
- Verification tier: Tier 3 — dependency entrypoint plus custom renderer and export integration affect startup and visible canvas output.
- User-visible result: One root `task run` installs the single app manifest and starts the Particle Grid UI on the saved local port without a Vite error overlay.
- Source/reference checked: Reproduced root npm behavior, the live Vite overlay, browser console output, current runtime exports, media presentation hooks, product export renderer contract, and the existing Particle Grid implementation.
- Reference inputs: None; this is a compatibility repair against the checked-in runtime.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, `decision-contract.md`, `core/runtime-boundary.md`, `component-rules.md`, and `renderer-technique.md`; verification-phase contracts are read immediately before proof.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `output-export-required`, `acceptance-product-observable`, and `workflow-required`.
- View interaction intent: `non-spatial`; the output is a flat image transform and uses the existing Toolcraft canvas viewport only.
- Interaction ownership: Source upload stays in the built-in panel `fileDrop`; canvas pan/zoom remains runtime-owned, with no duplicate product interaction surface.
- Decision: Keep `starter/package.json` as the only app manifest and the root `Taskfile.yml` as the only launcher; root `task run` delegates install/dev with `npm --prefix starter`. Restore runtime dependencies removed from the app manifest, consume binary media through runtime presentation URLs, and move image export to the current runtime-owned `exportRenderer` path.
- Alternatives rejected: A second proxy `package.json` because it creates duplicate manifests and lockfiles; npm workspace hoisting because Toolcraft deliberately verifies `starter/node_modules/vite`; editing the signed runtime to restore a removed legacy helper; keeping direct object-URL downloads in product code.
- State/output mapping: the root Taskfile delegates install/dev to the single `starter` manifest; `source.image` resolves to a runtime presentation URL for preview; the cached decoded source plus current `particle.*` state draw preview and the runtime-owned image export frame.
- Performance intent: Ordinary functional repair; no measured performance iteration or full audit was requested or run.
- Verification: The single app install passed with zero vulnerabilities; exact root `task run` started and verified port 3002; browser reload showed the full Toolcraft UI; a real image upload set the Particle Grid output ready with no new browser warnings/errors. Focused TypeScript output contains no errors in the repaired schema, composition, route, or renderer, while the repository-wide typecheck remains blocked by pre-existing acceptance/performance contract drift.
- Risks: The prior Particle Grid port was authored against an older Toolcraft API, so focused compatibility repair may expose additional schema or acceptance drift beyond the startup path.

### Iteration 2 — Figma Particle Grid reference port

- Request: Replace Bayer Dither with the same effect implemented in `inspiration/figma-shaders/particle-grid-effect.js`.
- Task type: Reference shader study, schema/control replacement, custom renderer replacement, image export, acceptance, and targeted performance coverage.
- User-visible result: The app exposes the reference Grid, Particle Shape, Color Mapping, and Dot Pattern controls and renders the uploaded image through the corresponding particle-grid shader.
- Source/reference checked: Full WGSL setup/render implementation and all `defineProperties` entries in `../inspiration/figma-shaders/particle-grid-effect.js`.
- Reference inputs: `../inspiration/figma-shaders/particle-grid-effect.js`.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, reference study, runtime boundary, assembly workflow, decision contract, control selection, layout, schema reference, component rules, acceptance testing, renderer technique, performance, setup/export, and media upload.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `reference-clone-source-of-truth`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Preserve all reference properties and fragment behavior, port WGSL/WebGPU math to GLSL ES 3.0/WebGL2, keep Toolcraft-owned upload/background/export, and keep timeline/layers disabled because the shader is static and single-output.
- Alternatives rejected: Keeping Bayer because the user explicitly requested replacement; Canvas 2D because dense per-pixel loops would block live controls; a standalone WebGPU host because the Figma runtime is unavailable and WebGL2 preserves the needed math with broader browser support; custom controls because built-ins fit every reference value.
- State/output mapping: `source.image` supplies the sampled texture; `particle.*` targets map one-to-one to grid, shape, color/group, and dot uniforms; runtime media transforms map UVs; standard Background and Image Export targets control alpha, encoding, and output size; `actions.output` downloads the final image.
- Files changed: `src/app/app-schema.ts`, `src/app/particle-grid.tsx`, `src/routes/index.tsx`, app acceptance/performance contracts and tests, browser tests, `docs/plans/particle-grid-effect.md`, and this worklog.
- Verification: Targeted acceptance, performance-contract, schema, and TypeScript checks passed during implementation; final Tier 3 browser/build evidence is recorded below.
- Skipped checks: Full performance checkpoint is not required for a post-first-working feature replacement without a performance complaint; timeline, layers, and video remain outside the static single-image reference.
- Risks: Exact floating-point/hash results may vary slightly between WGSL and GLSL implementations; output grouping boundaries, UV transforms, alpha, and export dimensions require browser verification.

### Iteration 1 — Bayer 16x16 image dither

- Request: Develop a very simple Bayer 16x16 dither effect for an image.
- Task type: App assembly, schema controls, media upload, custom renderer, image export, acceptance, and performance.
- User-visible result: A visible image uploader, live Threshold and Scale controls, monochrome Bayer preview, configurable background, and image export.
- Source/reference checked: User request and the neutral local Toolcraft starter.
- Reference inputs: None; no external visual reference was supplied.
- Docs/contracts read: `AGENTS.md`, `workflow.md`, runtime boundary, assembly workflow, decision contract, control selection, layout, schema reference, component rules, acceptance testing, renderer technique, performance, setup/export, and media upload.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `renderer-technique-inventory`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, and `workflow-required`.
- Decision: Use one built-in image `fileDrop`, two live sliders, no layers or timeline, and a cached WebGL2 renderer with an immutable 16x16 Bayer threshold texture.
- Alternatives rejected: CPU `ImageData` loops because large raster work would block live slider feedback; WebGPU because a small WebGL2 shader is sufficient; layers and timeline because there is only one still-image output; localStorage because persistence was not requested.
- State/output mapping: `source.image` selects runtime media; `dither.threshold` and `dither.scale` update shader uniforms; runtime media transforms update shader UV mapping; background controls drive preview and export inclusion; format/resolution drive exported bytes; `actions.output` invokes the standard Toolcraft export path.
- Files changed: `src/app/app-schema.ts`, `src/app/bayer-dither.tsx`, `src/routes/index.tsx`, app acceptance/performance contracts and tests, Playwright product/performance tests, `docs/plans/bayer-16-dither.md`, and `Taskfile.yml`.
- Verification: `npm run test`, `npm run build`, browser acceptance, Playwright fallback browser performance checkpoint, and live `task run` passed.
- Skipped checks: None among required gates; timeline, layers, and video behavior are outside this still-image product.
- Risks: WebGL2 availability remains environment-dependent and 8K export remains memory-intensive; runtime errors reject cleanly and 4K export is browser-measured.

## Decisions

### Renderer

- Decision: One WebGL2 preview/export renderer with named internal GLSL functions for sampling, grid construction, geometry, color, dot pattern, grain, and composition.
- Reason: The coupled creative operations are dense pixel work and currently benefit from sharing intermediate luminance, coordinates, and color inside one GPU pass.
- Evidence: Renderer Technique Decision Matrix, Renderer Layer Inventory, and Render Pipeline Inventory in `docs/plans/particle-grid-effect.md`; typed renderer contracts and schema tests cover the port.

### Timeline

- Decision: No timeline.
- Reason: The requested effect is a still-image transform with no animation or video export.
- Evidence: `appTransferMode.animationIntent` remains `none` and schema omits `panels.timeline`.

### Layers

- Decision: No layers.
- Reason: The product owns exactly one source image and one composited output.
- Evidence: Schema omits `panels.layers`; media deletion and transforms remain in built-in `fileDrop`.

### Controls

- Decision: Source, Grid, Particle Shape, Color Mapping, Dot Pattern, Grain, Background, and Image Export sections using only built-in controls.
- Reason: The experimental shader parameters remain ordinary numeric values; built-in sliders preserve fast visual iteration without custom UI or pipeline controls.
- Evidence: Control inventory in `docs/plans/particle-grid-effect.md`; app acceptance and performance contracts cover every visible target.

### Export

- Decision: Sticky runtime-owned image export with PNG/JPG and 2K/4K/8K settings through `ToolcraftAppComposition.exportRenderer`.
- Reason: Still Toolcraft products require downloadable image output and standardized background/resolution behavior.
- Evidence: The typed `export-image` action delegates allocation, background, encoding, download, and progress to the runtime; `particleGridExportRenderer` supplies only deterministic product pixels.

### Performance

- Decision: GPU pixel transform, cached media decode/texture upload, uniform-only live control updates, and a realistic 1920x1080 heavy baseline for every shader control.
- Reason: All Particle Grid parameters alter fragment output and must remain live without main-thread pixel loops.
- Evidence: `app-performance.ts` gives every `particle.*` target min/default/max coverage and a fully guaranteed 1920x1080 workload fixture.

## Evidence

- Source reviewed: the complete supplied Figma WGSL shader, runtime extension APIs, media lifecycle, export helpers, and local verification contracts.
- Contract applied: the reference renderer is preserved inside Toolcraft runtime surfaces through app-local WebGL2 renderer extensions only.

## Verification

- Run: `npm run verify:quick` passed, including AI workflow checks, docs/integrity checks, 12 script tests, and 259 Vitest acceptance/schema/performance-contract tests.
- Run: `npm run build` passed under Node 22; Vite produced the production bundle.
- Browser: controlled Browser functional checkpoint passed on `http://localhost:3002/`: image upload set `data-source-ready=true`, the WebGL Particle Grid was visibly rendered, Columns and Tint interactions changed output, and browser warnings/errors were empty.
- Run: Playwright browser acceptance passed 12/12 for upload/remove/reset/rotate/flip, every reference control family, background/alpha, PNG/JPG, 2K dimensions, export bytes, WebGL2 output, and render-scale backing pixels.
- Run: targeted Playwright performance checks passed for 1080p import, live Columns and Dot Density interactions, maximum-density preview, zoom stress, and viewport stability.
- Run: `git diff --check` passed and `task run` continued serving the live app with HTTP 200 on port 3002.
- Skipped checks: full performance checkpoint is not required for this post-first-working feature replacement; targeted changed-path scenarios were run instead.

## Risks

- Risk: WGSL and GLSL floating-point hash output may differ by a few pixels across GPU implementations even though the deterministic branch and visual behavior are preserved.
- Risk: WebGL2 initialization can fail on unsupported or disabled GPU environments; the renderer exposes a clear failure instead of silently producing corrupt output.
- Risk: 8K exports can allocate substantial GPU and canvas memory; the supported 2K path and default 4K export flow are browser-tested.
