# Implementation Worklog

## Status

Mode: product

Particle Grid Effect is a single-image Toolcraft product that reconstructs an uploaded image as a configurable luminance-driven particle grid and exports the result as an image.

## Decision Trail

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

- Decision: WebGL2 preview and export renderer porting the supplied WGSL Particle Grid fragment math with a cached source texture.
- Reason: Cell sampling, luminance geometry, grouping, dots, and compositing are dense pixel work that map directly to one GPU pass.
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

- Decision: Source, Grid, Particle Shape, Color Mapping, Dot Pattern, Background, and Image Export sections using only built-in controls.
- Reason: FileDrop, slider, switch, color, select, and panelActions exactly fit all 22 reference properties plus Toolcraft delivery controls.
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
