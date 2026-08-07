# Mesh FX Lab debranding and runtime independence

## Goal

Rebrand the product-facing application as **Mesh FX Lab**, remove stale inspection artifacts and direct runtime dependencies on the inspected reference host, and keep the existing effects, model upload, camera orbit, orientation gizmo, canvas, and export behavior intact.

The required Toolcraft reference-study metadata and `LICENSE.md` / `NOTICE.md` remain truthful and intact. They are internal verification and legal records, not product-facing branding.

## Product decisions

- Public identity: `Mesh FX Lab`; package/app id `mesh-fx-lab`; settings and image downloads use `mesh-fx` filenames.
- Product controls: unchanged. The controls panel title becomes `Mesh FX` and uploaded-model copy refers to the built-in model rather than a named reference shape.
- Renderer: keep WebGL, current shader graph, material, geometry, orbit, render scale, and export pipeline. Replace the cross-origin gain-map JPEG with a locally generated PMREM studio environment built from Three.js primitives.
- Timeline/layers/persistence: unchanged (no timeline, no layers, no stored user state).
- Provenance: retain mandatory reference-study/feature-inventory evidence and historical worklog entries; do not falsify authorship or remove required legal notices.
- Cleanup: delete generated network captures, browser inspection logs, and stale comparison screenshots; ignore future local browser-inspection output.

## Files

1. Update `index.html`, `package.json`, `package-lock.json`, `src/app/app-schema.ts`, `src/app/panel-actions.ts`, product readiness, renderer selectors, and their tests/e2e selectors with the new public identity.
2. Add a procedural studio-environment renderer module, update `scene-profile.ts` and `three-effects-engine.ts`, and remove the unused gain-map dependency.
3. Update renderer tests and `app-performance.ts` so cache keys and evidence describe the actual local environment.
4. Update `docs/toolcraft/agent-worklog.md` with the debranding decision, behavior mapping, verification, and explicit provenance boundary.
5. Remove transient reference/network/browser artifacts while preserving required Toolcraft docs, licenses, and reference-study metadata.

## Renderer Technique Decision Matrix

- `sourceRepresentation`: mixed procedural geometry plus uploaded GLB, embedded glTF, or OBJ meshes.
- `productRepresentation`: pixel output produced from a physically lit 3D scene and full-screen effects.
- `previewRenderer`: WebGL through Three.js.
- `exportRenderer`: WebGL through the same scene/effects pipeline at the selected product-quality image dimensions.
- `rendererWorkload`: `pixel-output`.
- `rendererStrategy`: `webgl`.
- `whyNotAlternativeStrategies`: DOM and SVG cannot preserve mesh lighting and occlusion; Canvas 2D would move dense per-pixel effects and 8K export work to the CPU; WebGPU adds compatibility cost without improving this workload over the existing Three.js WebGL pipeline.
- `fidelityRisks`: replacing the remote environment changes the exact base-scene reflections, so the procedural panel layout must retain several independent highlights and inner-wall shadow bands before stylization.
- `performanceRisks`: PMREM generation adds one GPU initialization pass; high-poly uploads, DPR × render scale, Bloom/Blur, and 8K export remain the largest workloads.

## Renderer Layer Inventory

- `backgroundLayer`: schema-controlled WebGL clear color; included or transparent according to Background settings.
- `productForegroundLayer`: WebGL mesh, lighting, stylization, and post-processing; included in preview/export.
- `editingHandlesLayer`: DOM/Canvas2D orientation gizmo; interactive in preview and excluded from export.
- `exportComposite`: offscreen WebGL result copied through the Toolcraft PNG export helper.

## Render Pipeline Inventory

- `studio-environment` pass: custom light-panel scene → PMREM texture; `cacheKey` is the fixed panel layout and convolution settings; invalidated only at app/engine initialization.
- `model-decode` pass: uploaded media or built-in model; `cacheKey` is media identity; invalidated by `media-import` / `source.model` only.
- `scene-normalize` pass: decoded model identity → normalized mesh group; cached until the model changes.
- `scene-raster` pass: model, camera, procedural environment, background, canvas size, and render scale → MSAA HalfFloat scene texture; invalidated by model changes, orbit `control-drag`, background, or backing-size changes.
- `effects-composite` pass: cached scene texture plus effect uniforms → preview texture; effect slider `control-drag` updates this pass without redoing environment/model work.
- `animated-present` pass: cached pre-grain texture plus animation-frame time → final preview; viewport-drag and viewport-zoom interactions coalesce non-essential frames.
- `preview-present` pass: final GPU texture → visible canvas.
- `exportComposite` pass: the same renderer at selected export dimensions → PNG/JPG bytes.

Interaction invalidation keeps `studio-environment`, `model-decode`, and `scene-normalize` stable during effect control-drag and viewport-zoom work. Media-import invalidates only model decode/normalize/raster and downstream passes; animation-frame invalidates only the animated/final presentation path.

## Verification

Verification tier: Tier 4

Reason: product identity and selectors change across schema/tests, the WebGL environment source changes, and a dependency is removed. Effects and interaction semantics remain unchanged, but the renderer and dependency graph create broad verification impact.

Run: `npm run ai:check`; focused renderer/product tests; `npm run verify:quick`; focused browser checks for app identity, default model, an effect branch, orbit/gizmo, upload/clear, export filename/output, and WebGL errors; targeted preview-render scenario; `npm run verify:final`; restart/reuse the saved dev URL and verify the Toolcraft identity marker.

Skip: the full performance checkpoint is not required because this is a post-first-working debranding pass and the user did not report a performance regression. A targeted renderer scenario covers the changed environment initialization path.
