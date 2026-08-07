# Brick Mosaic Design

## Product Goal

Build a Toolcraft app that accepts one uploaded image and renders the final image as a grid of raised toy-brick tiles. The user can tune the visible brick style, image sampling, monochrome conversion, tonal simplification, and PNG export settings.

## Product Behavior

- Source image is uploaded through a built-in `fileDrop` control.
- Canvas uses `intrinsic-media` sizing so the uploaded image's natural dimensions become the output size.
- The preview and export render the same Canvas 2D brick mosaic, not app UI.
- If no image is loaded, the product renderer still draws a neutral brick preview pattern so controls have visible output.
- Export PNG uses `createToolcraftPngExportCanvas` with runtime `export.includeBackground`, `appearance.background`, `export.image.format`, and `export.image.resolution`.
- The result is still output, so no timeline is enabled.
- The app has one image source and one rendered result, so layers are disabled.
- User-edited settings persist to localStorage; media blobs do not persist.
- Settings transfer uses `auto` because the app exceeds the complexity threshold.

## Control Section Inventory

- Source Image: `media.source`; owns the upload workflow.
- Brick Grid: `brick.detail`, `brick.scale`, `brick.gap`, `brick.rounding`, `brick.edgeDepth`; owns the sampled tile grid and brick body geometry.
- Studs: `stud.include`, `stud.size`, `stud.height`, `stud.highlight`; owns the raised circular studs shown on each brick.
- Tone: `tone.monochrome`, `tone.posterize`, `tone.saturation`, `tone.contrast`, `tone.brightness`; owns source color remapping before bricks are painted.
- Lighting: `lighting.direction`, `lighting.shadow`; owns the apparent relief direction and shadow strength.
- Background: `export.includeBackground`, `appearance.background`; required PNG background controls.
- Image Export: `export.image.format`, `export.image.resolution`; required PNG export controls.

## Control Selection Inventory

- Source upload: built-ins checked `fileDrop`, `imagePicker`; best `fileDrop`; target `media.source`; acceptance proves import and clear affect output.
- Detail: value model integer brick count/quality; built-ins checked `slider`; best `slider` continuous stepped because range has many positions; target `brick.detail`; acceptance proves grid density changes output.
- Scale: value model numeric size multiplier; built-ins checked `slider`; best `slider`; target `brick.scale`.
- Gap: value model pixel spacing; built-ins checked `slider`; best `slider`; target `brick.gap`.
- Corner radius: value model percent roundness; built-ins checked `slider`; best `slider`; target `brick.rounding`.
- Edge depth: value model relief intensity; built-ins checked `slider`; best `slider`; target `brick.edgeDepth`.
- Stud include: value model immediate boolean; built-ins checked `switch`; best `switch`; target `stud.include`.
- Stud size/height/highlight: value model numeric brick-stud parameters; built-ins checked `slider`; best `slider`; targets `stud.size`, `stud.height`, `stud.highlight`.
- Tone toggles and numeric grading: value model immediate boolean plus numeric remaps; built-ins checked `switch`, `slider`; best `switch` and `slider`; targets under `tone.*`.
- Lighting direction: value model two-axis light vector; built-ins checked `vector`, `slider`; best `vector`; target `lighting.direction`; acceptance covers `vector.x` and `vector.y`.
- Background color: value model free hex background; built-ins checked `color`; best `color`; target `appearance.background`.
- PNG include background: value model immediate boolean; built-ins checked `switch`; best `switch`; target `export.includeBackground`.
- Image export format/resolution: value model dropdown choice; built-ins checked `select`, `segmented`; best `select`; targets `export.image.format`, `export.image.resolution`.

## Renderer Technique Decision Matrix

- sourceRepresentation: `image-media`
- productRepresentation: `mixed`
- previewRenderer: `canvas-2d`
- exportRenderer: `canvas-2d`
- rendererWorkload: `simple-composition`
- rendererStrategy: `canvas-2d`
- whyNotAlternativeStrategies: DOM and SVG would create thousands of nodes for dense grids; WebGL/WebGPU are the preferred alternatives for a true `pixel-output` shader pipeline, but this app needs sampled bitmap media plus brick geometry with preview/export parity; the default media renderer cannot draw raised studs, bevels, tone mapping, or product-quality export.
- fidelityRisks: tiny source details are intentionally quantized to brick cells; posterization can flatten subtle gradients.
- performanceRisks: high detail plus 8K export can be expensive; renderer must cache decoded image data and coalesce preview renders.

## Renderer Layer Inventory

- `backgroundLayer`: Canvas 2D background fill, low primitive count, included in preview and export.
- `productForegroundLayer`: Canvas 2D product-foreground with bitmap-media sampling, dense-pattern brick geometry, raised studs, and bevel lighting, high primitive count, visible at `[data-brick-mosaic-canvas]`.
- `exportComposite`: Canvas 2D exportComposite path that uses the same renderer through `createToolcraftPngExportCanvas`.

## Acceptance And Performance

Verification tier: Tier 4
Reason: This turns the starter into the first working product app with schema controls, custom Canvas 2D renderer, media upload, export, acceptance rows, browser tests, and performance scenarios.
Run: `pnpm verify:final`, `pnpm verify:perf`, then `pnpm dev`; targeted browser checks are included in final/perf gates.
Skip: `pnpm install` because dependencies and `node_modules` are already present and no dependency or lockfile changes are planned.
