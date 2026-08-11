# Particle Grid Effect Implementation Plan

## Product spec

- Product goal: replace the Bayer renderer with a faithful Toolcraft port of `inspiration/figma-shaders/particle-grid-effect.js`.
- Visible output: one uploaded image sampled at grid-cell centers and reconstructed as luminance-sized horizontal particles over a configurable background.
- Media flow: one built-in image `fileDrop` targets `source.image`; upload, remove, reset, rotate, and flip remain runtime-owned.
- Canvas: editable 16:9 still output with raster resolution scale; source media covers/crops the output without changing canvas dimensions.
- Timeline/layers: none. The reference shader is static and has one input texture and one composited output.
- Persistence: none. Runtime settings import/export remains enabled.
- Delivery: PNG/JPG at 2K/4K/8K through the sticky `Export PNG` action.

## Reference study

- Reference: `../inspiration/figma-shaders/particle-grid-effect.js`.
- Status: source inspection only. The file imports the Figma-only `figma:shaders` runtime and cannot execute directly in the local browser.
- Shader behavior inspected: cell-center image sampling, luminance-driven width, low-luminance height shrink, soft rectangular masks, original/tint color, brightness/hue grouping, deterministic bright-cell dot patterns, and final background compositing.
- Runtime properties inspected: all 22 `defineProperties` controls and their defaults/ranges.
- Intentional renderer adaptation: WGSL/WebGPU becomes GLSL ES 3.0/WebGL2 for browser compatibility while preserving the fragment math and output semantics.

## Control Section Inventory

| Section | Entity/workflow | Targets | Grouping reason |
| --- | --- | --- | --- |
| Source | Input image | `source.image` | Upload and source transforms form one media lifecycle. |
| Grid | Sampling lattice | `particle.columns`, `particle.rows`, `particle.maxColumnWidth`, `particle.columnGap` | These values define cell count and adjustable horizontal bounds; row gap is fixed at zero. |
| Particle Shape | Cell geometry | `particle.width`, `particle.killBelowWidth`, `particle.minWidth`, `particle.softness` | Width gain controls how quickly luminance reaches the maximum-width cap; Kill below removes particles before Minimum width; width stays centered and spans each row without vertical seams. |
| Color Mapping | Particle colors | `particle.colorMode`, `particle.tintColor`, `particle.groupMode`, `particle.groupColor1..4` | These values reproduce original/tint and brightness/hue grouping branches. |
| Dot Pattern | Bright-cell texture | `particle.dotChance`, `particle.dotPatternBackground`, `particle.dotDensity`, `particle.dotSize` | These values jointly control the deterministic dot sub-pattern. |
| Background | Output background | `export.includeBackground`, `appearance.background` | Inclusion and color define preview/export compositing and PNG alpha. |
| Image Export | Image delivery | `export.image.format`, `export.image.resolution` | Format and resolution jointly define downloaded bytes. |

## Control selection

- Source uses `fileDrop`, the exact owner for user image media.
- Numeric shader parameters use live `slider` controls. Columns and Rows are stepped continuous sliders because their large integer ranges would create excessive discrete markers.
- Color Mode, Color Grouping, Format, and Resolution use `select` controls because they are finite named modes.
- Free colors use built-in `color`; Background inclusion uses `switch`; final delivery uses sticky `panelActions`.
- No custom controls are needed.

## Renderer Technique Decision Matrix

- sourceRepresentation: `image-media`
- productRepresentation: `pixel`
- previewRenderer: `webgl`
- exportRenderer: `webgl` composited through Toolcraft's PNG export canvas
- rendererWorkload: `pixel-output`
- rendererStrategy: `webgl`
- reference renderer change: the Figma-only WebGPU host is unavailable in a standalone browser; WebGL2 supports the same texture sampling, uniform, hash, hue, mask, and compositing math.
- rejected alternatives: Canvas 2D would require full-frame CPU pixel loops; DOM/SVG cannot reproduce the dense source-sampled shader; a new WebGPU host would reduce browser compatibility without changing output semantics.
- fidelity risks: UV orientation/cover crop, source rotation/flip, group boundaries, deterministic hash parity, smooth mask edges, alpha when Background Include is off.
- performance risks: 1920x1080 texture upload, high-resolution preview backing pixels, and 4K/8K export allocation.
- whyNotAlternativeStrategies: Canvas 2D would move pixel work onto the main thread; DOM/SVG cannot reproduce the dense pixel-output shader; standalone WebGPU would narrow compatibility.
- fidelityRisks: cover-crop orientation, rotate/flip parity, color-group boundaries, deterministic hash parity, and transparent gaps.
- performanceRisks: source texture upload, high render scale, dense fragment work, and export allocation.

## Renderer Layer Inventory

- backgroundLayer: low-count WebGL background layer, included only when Background / Include is enabled.
- productForegroundLayer: high-density `product-foreground` WebGL particle output sampled from the source texture.
- editingHandlesLayer: none; Toolcraft owns viewport chrome outside product pixels.
- exportComposite: WebGL product foreground composited with optional background into product-quality PNG/JPG output.

## Render Pipeline Inventory

1. `decode-source`: decode/cache the uploaded image by media id and data URL.
2. `upload-source-texture`: upload only when source media changes.
3. `particle-grid-transform`: sample source and evaluate every particle/grid/color/dot uniform in one GPU fragment pass.
4. `preview-composite`: render at selected Toolcraft resolution scale with optional background alpha.
5. `export-composite`: render selected 2K/4K/8K output and encode PNG/JPG.

Uniform-only control changes invalidate the particle transform and preview composite, never source decode or texture upload. Viewport pan/zoom invalidates no shader pass. Export creates an export-only renderer from the cached decoded source.

Each pass has an explicit `cacheKey`/cache key in `app-performance.ts`. The invalidation matrix names `media-import`, `control-drag`, `control-change`, `viewport-drag`, `viewport-zoom`, and `export` interactions so source decode cannot silently rerun during lightweight edits.

## File plan

1. Replace the schema in `src/app/app-schema.ts` with Particle Grid sections, defaults, and targets.
2. Replace `src/app/bayer-dither.tsx` with `src/app/particle-grid.tsx`, porting WGSL math to a cached WebGL2 renderer and keeping image export.
3. Update `src/routes/index.tsx` to mount the Particle Grid canvas and panel action.
4. Update product readiness, reference study/inventory, acceptance rows, section inventory, and schema tests.
5. Replace Bayer browser/performance checks with Particle Grid control, export, renderer, viewport, and workload checks.
6. Update `docs/toolcraft/agent-worklog.md` with the reference decision trail and verification evidence.

## Verification note

- Verification tier: Tier 3.
- Reason: a post-first-working renderer replacement changes schema controls, GPU output, export, acceptance, and renderer workload without changing Toolcraft runtime internals.
- Run: `npm run ai:check`, `npm run verify:quick`, focused Particle Grid browser acceptance, targeted media/control/preview/export/viewport performance scenarios, production build, and live `task run` URL check.
- Skip: full performance checkpoint because this is a feature replacement after the first working product and the user did not request performance optimization; timeline/layer/video tests remain out of scope for a static single-image shader.
