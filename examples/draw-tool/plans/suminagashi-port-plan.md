# Suminagashi Port Plan

## Verification Tier

Verification tier: Tier 4
Reason: The starter shell becomes a reference-runtime product with schema controls, custom WebGL canvasContent, image/video export, acceptance tests, browser checks, and performance scenarios.
Run: `pnpm verify:final`, `pnpm verify:perf`, then `pnpm dev`.
Skip: `pnpm install` because dependencies and lockfile are unchanged.

## Product Spec

- Build a Toolcraft-native Suminagashi Draw app from the reference runtime at `https://suminagashi-fjdbyyqi.manus.space/`.
- Keep the Toolcraft shell, panels, toolbar, and command surfaces; render only the product drawing in `canvasContent`.
- Preserve the reference drawing behavior: pointer splats inject dye and velocity, hover stirs water, auto flow adds drops and slow stirring, and Wash dissipates the ink.
- Use the built-in `palette` control for single-ink color choice.
- Render flat beige paper without texture, fiber noise, or vignette.
- Provide still image export and animated video export from the product output.

## Control Section Inventory

- Ink: `ink.mode`, `ink.palette`. Mode chooses cycle or single ink; Palette supplies the family and shade for single mode.
- Flow: `flow.auto`, `flow.washSignal`. Auto optionally enables reference-style idle drops/stirring; Wash temporarily increases dye dissipation.
- Background: `export.includeBackground`, `appearance.background`. Include hides the product background in live preview and PNG while video keeps it; color controls the flat paper color.
- Image Export: `export.image.format`, `export.image.resolution`. Format and resolution drive still export bytes.
- Video Export: `export.video.format`, `export.video.resolution`. Format and resolution drive animated export preference.
- Export footer: `export-video`, `export-image`. Sticky actions perform final delivery.

## Renderer Technique Decision Matrix

- sourceRepresentation: `reference-runtime`.
- productRepresentation: `pixel`.
- previewRenderer: `webgl`.
- exportRenderer: `canvas-2d`.
- rendererWorkload: `pixel-output`.
- rendererStrategy: `webgl`.
- whyNotAlternativeStrategies: DOM and SVG cannot express the absorption-field fluid simulation; Canvas 2D would push dense advection and pressure projection onto the CPU; WebGPU is not needed for the reference-sized solver and has less baseline support.
- fidelityRisks: The reference paper fiber and vignette are intentionally removed to satisfy the flat beige paper requirement; PNG/JPG export composites the current WebGL preview frame through the standard Toolcraft export canvas.
- performanceRisks: Pressure projection uses 28 GPU iterations per simulation step; changing `canvas.renderScale` rebuilds framebuffers; viewport drag and zoom must not rebuild simulation resources.
- previewExportDifferenceReason: Preview owns the live WebGL simulation while export uses Toolcraft helper surfaces for selected background and output resolution.

## Renderer Layer Inventory

- backgroundLayer: kind `background`, renderer `webgl`, content `shader`, exportMode `composited`, uiSelector `[data-suminagashi-canvas]`.
- productForegroundLayer: kind `product-foreground`, renderer `webgl`, content `shader` plus `dense-pattern`, exportMode `included`, uiSelector `[data-suminagashi-canvas]`.
- exportComposite: kind `export-composite`, renderer `canvas-2d`, content `composite`, exportMode `composited`.
- editingHandlesLayer: absent because the product uses direct pointer splats instead of persistent editable handles.

## Render Pipeline Inventory

- Pass `simulation-fbos`: kind `preprocess`, runsOn `gpu`, output `source`, quality `preview`, cacheKey `canvas.size.width`, `canvas.size.height`, `canvas.renderScale`; invalidated by fixed output setup and render scale.
- Pass `ink-splats`: kind `pixel-transform`, runsOn `gpu`, output `intermediate`, quality `preview`, cacheKey `ink.mode`, `ink.palette.family`, `ink.palette.shade`, `pointer.uv`; invalidated by pointer drawing and ink controls.
- Pass `fluid-step`: kind `pixel-transform`, runsOn `gpu`, output `intermediate`, quality `preview`, cacheKey `velocity-fbo`, `dye-fbo`, `flow.auto`, `flow.washSignal`; invalidated by animation-frame, pointer splats, auto flow, and wash.
- Pass `display-composite`: kind `composite`, runsOn `gpu`, output `preview`, quality `retina`, cacheKey `dye-fbo`, `appearance.background`, `export.includeBackground`; invalidated by animation-frame and background controls.
- Pass `image-export`: kind `export`, runsOn `export-only`, output `export`, quality `export`; invalidated by export format, export resolution, and background state.
- Interaction invalidation: `control-drag` for `canvas.renderScale` rebuilds FBOs; `control-change` for ink/background/export controls avoids rebuilding simulation FBOs; `viewport-drag` and `viewport-zoom` coalesce non-essential auto work and must not invalidate simulation passes; `export` invalidates only the export composite.

## Implementation Plan

1. Replace starter readiness with product readiness and reference-runtime transfer metadata.
2. Define Toolcraft schema controls, persistence, fixed canvas output, render scale, required Background/Image Export/Video Export sections, and sticky export actions.
3. Implement a direct WebGL2 fluid renderer with reference constants, FBO passes, pointer splats, auto flow, wash, and flat-paper display shader.
4. Wire the renderer through `ToolcraftApp canvasContent` and handle export actions in `onPanelAction`.
5. Update acceptance, app tests, browser tests, performance matrix, and worklog.
6. Run final Toolcraft verification and leave a dev server URL.
