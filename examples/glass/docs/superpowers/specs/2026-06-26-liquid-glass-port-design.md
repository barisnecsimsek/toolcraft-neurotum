# Liquid Glass Port Design

## Goal

Turn the neutral Toolcraft starter into a liquid-glass shader playground based on `samasante/liquid-glass`, preserving the reference lens algorithm while using the local Toolcraft runtime for shell, controls, canvas sizing, export, acceptance, and performance verification.

## Source And License

Reference source: `https://github.com/samasante/liquid-glass`, inspected at implementation time from the current `main` branch. The reference package is MIT licensed. The app will carry attribution in source comments/worklog and will port the SDF displacement generator plus WebGL shader path rather than copying the reference demo shell.

## Product Behavior

The first screen is the usable Toolcraft editor. The canvas shows an exportable scene with a single configurable liquid-glass lens over a high-contrast procedural backdrop, optionally replaced by an uploaded image. Users can adjust the glass shape, lens dimensions, corner radius, position, opacity, refraction strength, depth, curvature/fisheye, chromatic aberration, edge bend, frost/murkiness, brightness, specular sheen, glow, and export background.

The app is a still-output product. There is no user-facing animation transport, so timeline is absent. Layers are absent because the product edits one glass lens and one source backdrop, not multiple independent editable objects.

## Toolcraft Flow

The route renders `<ToolcraftApp schema={appSchema} canvasContent={<LiquidGlassRenderer />} renderDefaultCanvasMedia={false} />`. Product output stays inside `canvasContent`; controls, panels, canvas sizing, toolbar, settings transfer, reset, and export are runtime-owned.

Canvas sizing uses `editable-output` with default `1920x1080`; WebGL preview enables `canvas.renderScale`. Persistence uses localStorage for `values`, `canvas`, and `panels`. Settings transfer uses `auto` because the app exceeds the complexity threshold.

## Control Section Inventory

`Source`: `source.mode`, `source.preset`, `source.upload`, `source.scale` configure the refracted backdrop and optional image source.

`Glass Shape`: `glass.shape`, `glass.width`, `glass.height`, `glass.radius`, `glass.center`, `glass.opacity` configure the visible lens geometry.

`Refraction`: `glass.strength`, `glass.depth`, `glass.curvature`, `glass.fisheye`, `glass.dispersion`, `glass.splay` configure the SDF dome and RGB split.

`Edge`: `glass.bend`, `glass.bendWidth` configure the rim meniscus from the reference generator.

`Surface`: `glass.frost`, `glass.brightness`, `glass.murkiness`, `source.saturation` configure blur, veil, opacity, and color treatment.

`Highlights`: `glass.specular`, `glass.sheen`, `glass.sheenWidth`, `glass.sheenAngle`, `glass.glow`, `glass.glowSpread` configure the reference B-channel specular lift.

`Background`: required Toolcraft export background row with `export.includeBackground` and `appearance.background`.

`Image Export`: required PNG/JPG format and 2K/4K/8K resolution controls.

## Renderer Technique Decision Matrix

sourceRepresentation: procedural Canvas 2D source frame or uploaded image copied into a source canvas.

productRepresentation: pixel-output WebGL canvas containing backdrop plus refracted rounded-rect lens.

previewRenderer: WebGL2 renderer adapted from `glassWebGL.ts`, with displacement maps from the reference `displacement.ts`.

exportRenderer: Canvas 2D export helper creates the final output size and draws a high-resolution offscreen WebGL render into the PNG canvas for export/copy product-quality output.

rendererWorkload: pixel-output shader sampling, optional frost blur, high-resolution export, uploaded media upload, SDF map generation on shape/optics changes.

rendererStrategy: WebGL is required because the product is a shader-like per-pixel displacement effect. Canvas 2D is used only to prepare source/backdrop frames and to hand off final PNG pixels.

whyNotAlternativeStrategies: DOM `backdrop-filter` is browser-dependent and not a stable export path; iframe/reference shell violates Toolcraft; CPU Canvas 2D displacement would downsample or jank at 4K/8K. SVG filters could approximate a displacement map, but the reference WebGL algorithm gives the closest reference parity and a deterministic exportRenderer.

fidelityRisks: WebGL texture limits can affect 8K export on older GPUs; preview/export use the same shader but export renders a fresh offscreen target at the requested resolution.

performanceRisks: SDF map generation still touches CPU pixels when shape-affecting controls change, so workload tests stress width, height, radius, frost, and export resolution.

## Renderer Layer Inventory

backgroundLayer / `source-texture`: Canvas 2D source pixels from generated presets or uploaded bitmap media. It is included in exportComposite and invalidated by source, background, media, and canvas size changes.

productForegroundLayer / `liquid-glass-webgl`: WebGL product-foreground lens composite with refraction, RGB split, frost, murkiness, and highlights. It is included in exportComposite and exposed in the browser by `[data-liquid-glass-renderer]`.

editingHandlesLayer: none; this app has no canvas handles, layers panel, or direct object manipulation. The Toolcraft canvas backing remains visible behind the product output.

## Render Pipeline Inventory

`source-frame`: Canvas 2D, creates backdrop pixels from preset or uploaded image. Invalidated by source controls, upload, background color, and canvas size.

`displacement-map`: Canvas 2D SDF map from reference algorithm. Invalidated by glass width, height, radius, depth, curvature, fisheye, splay, bend, edge width, sheen/glow shape parameters.

`frost-prepass`: WebGL two-pass blur. Invalidated by source frame and frost.

`lens-composite`: WebGL fullscreen shader. Invalidated by every glass look/geometry value, source frame, and canvas size.

`png-export`: Toolcraft PNG helper plus offscreen WebGL render. Invalidated by final state and image export resolution.

rendererPipeline interactionInvalidation: `control-drag` invalidates source-frame, displacement-map, frost-prepass, and lens-composite according to the touched target; `control-change` covers select/text/switch/color changes; `media-import` redraws the source frame; `viewport-zoom` and `viewport-drag` must not invalidate source-frame, displacement-map, or frost-prepass; export invalidates `png-export` only.

## Acceptance And Verification

Acceptance rows cover source preset/upload, geometry controls, refraction controls, edge/surface/highlight controls, background include/color, image export format/resolution, canvas sizing, persistence reload, settings transfer, toolbar viewport stability, and PNG output.

Performance scenarios cover preview render, shape slider drag, effect slider drag at render scale 2, media import with a 1920x1080 fixture, PNG export at 4K, and viewport zoom stress.

Verification tier: Tier 4.
Run: `pnpm verify:final`, `pnpm verify:perf`, `pnpm dev`, plus real browser smoke checks.
Skip: `pnpm install`, because no dependency or lockfile change is planned.
