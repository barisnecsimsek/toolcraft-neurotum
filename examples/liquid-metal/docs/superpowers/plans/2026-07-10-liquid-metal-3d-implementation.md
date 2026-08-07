# Liquid Metal 3D — Implementation Plan

1. Add pinned Paper Shaders dependencies plus Three.js and its types in `package.json`; run `npm install` once because dependencies change.
2. Replace `src/app/app-schema.ts` with the product schema: editable 1920x1080 WebGL output, render scale, model file upload, Paper preset/color/pattern/projection controls, playback timeline, no layers, explicit no-persistence policy, required Background/Image Export/Video Export sections, and sticky PNG/video actions.
3. Add `src/app/liquid-metal-model.ts` for GLB/GLTF/OBJ/STL decoding, normalization, cache identity, and disposal.
4. Add `src/app/liquid-metal-values.ts` for exact Paper defaults/presets and typed Toolcraft-to-Paper settings mapping.
5. Add `src/app/liquid-metal-renderer.tsx` for the official Paper React shader source canvas, Three.js mesh material, model lifecycle, middle-drag rotation, timeline-driven frames, render-scale backing size, viewport coalescing, and an export provider; the later true-3D iteration replaces initial screen-space sampling in the shared scene renderer.
6. Add `src/app/liquid-metal-export.ts` for preset actions, standard PNG helper output, standard video sizing, MediaRecorder capability fallback, timeline-duration recording, downloads, and browser-test export metadata.
7. Update `src/routes/index.tsx` to render `ToolcraftApp` with `canvasContent`, `renderDefaultCanvasMedia={false}`, and `onPanelAction` only.
8. Replace starter metadata in `src/app/acceptance/defaults.ts` with product readiness, reference-runtime clone study/inventory, control section inventory, animation/timeline intent, and acceptance rows for every visible/runtime entity.
9. Replace `src/app/app-performance.ts` with WebGL renderer technique, typed pipeline inventory, workload targets, realistic model/render-scale/export/timeline/viewport scenarios, budgets, and agent-browser policy.
10. Add focused unit tests for exact Paper values/presets, model format routing, schema mappings, export sizing, reference metadata, acceptance validation, and performance validation.
11. Replace starter browser tests with model upload/clear/reset, controls/presets, canvas setup, timeline, orbit, background, PNG/video export, and product-observable checks; add targeted performance scenarios that read values from `app-performance.ts`.
12. Update `index.html` title marker and `docs/toolcraft/agent-worklog.md` to product mode with the reference evidence, state/output mapping, verification results, skipped checks, and risks.
13. Run `npm run verify:quick` during implementation; if any failure appears, invoke `systematic-debugging` before changing code.
14. Run `npm run verify:final`; run the first-working-version browser performance checkpoint with the controlled browser (or `npm run verify:perf` only as allowed fallback); record results; run `npm run dev` and verify the served Toolcraft identity and title at the saved local URL.

## True-3D Material Iteration

1. Update `src/app/liquid-metal-scene.ts` only at the mesh-material boundary: replace screen-space `gl_FragCoord` sampling with two-axis world-position triplanar sampling warped by mesh-normal/view reflection, Fresnel, and analytic metal highlights; compute missing vertex normals once and keep the existing Paper CanvasTexture lifecycle.
2. Update `src/app/app-performance.ts` renderer technique/pipeline descriptions so the declared product representation and composite pass match the form-aware material; schema controls, timeline, layers, persistence, settings transfer, and panel actions remain unchanged.
3. Extend `src/app/app-performance.renderer-source.test.ts` and focused product tests to reject screen-space fragment masking and require position, normal, camera/view direction, reflection, triplanar blending, and Fresnel evidence.
4. Extend `e2e/app-controls.spec.ts` to prove real preview pixels exist, paused model orbit changes visible pixels, and the Paper presets still alter final surface output.
5. Verify the supplied `/Users/kusnizza/Desktop/A.obj` in the running browser, including Default/Noir screenshots and model orbit, then exercise the shared PNG renderer.
6. Run `npm run verify:quick`, focused browser acceptance, and targeted `renderer-animation-frame`, `renderer-animation-viewport-drag`, `renderer-viewport-zoom-stress`, and export performance scenarios. Record the Tier 3 decision trail and why the full performance checkpoint is not required for this post-first-working iteration.

## Direct Procedural Surface Rewrite

1. Add a red renderer-source contract that rejects `CanvasTexture`, `sampler2D uLiquidTexture`, and Paper-canvas sampling while requiring the official Liquid Metal uniforms, simplex noise, stripe color function, surface UV adapter, normal/view Fresnel, and deterministic time.
2. Replace `src/app/liquid-metal-scene.ts` with one direct ShaderMaterial: port Paper's stripe/noise/color-dispersion core, derive full-surface dominant-axis coordinates from normalized mesh geometry, and map every existing setting to uniforms.
3. Update `src/app/liquid-metal-renderer.tsx` to remove the hidden Paper React canvas and send current Toolcraft/timeline settings directly into the persistent Three renderer.
4. Update `src/app/liquid-metal-export.ts` to remove offscreen Paper surfaces; PNG/video use the same direct material and update `u_time` per exported frame. Remove the unused `src/app/liquid-metal-paper.ts` module.
5. Update `src/app/app-performance.ts`, specs, tests, and worklog so the pipeline declares one direct GPU surface pass rather than a Paper-canvas intermediate.
6. Verify immediate upload and full-surface coverage with the supplied `A.obj`, paused orbit, every Paper control/preset, transparent/background PNG, Current/4K video, and no WebGL errors.
7. Run `npm run verify:final` plus targeted media/control/animation/drag/zoom/export budgets. Record that a post-first-working full performance checkpoint is not triggered, while every directly changed workload path is covered.

## Reflection/Matcap Projection Correction

1. Extend `src/app/app-performance.renderer-source.test.ts` with a red contract that rejects dominant-axis branches and `fract(uv)` at the mapping boundary, and requires the Three.js matcap view basis plus continuous procedural normal perturbation.
2. Update only the coordinate adapter in `src/app/liquid-metal-surface-shader.ts`: carry view position/normal from the vertex stage, perturb the world normal with non-repeating simplex noise, compute matcap UV from the view basis, then apply existing Scale/Rotation/Offset/Fit without wrapping the mapped UV.
3. Keep the Paper Liquid Metal core, schema controls, presets, timeline, media flow, layers policy, persistence, panel actions, and shared preview/PNG/video material unchanged.
4. Update `src/app/app-performance.ts`, acceptance descriptions, and the worklog so they identify reflection/matcap mapping rather than dominant-axis surface projection.
5. Verify the exact `/Users/kusnizza/Desktop/A.obj` at a frozen frame: no repeated rectangular tiles, broad faces respond to procedural normal flow, orbit changes material pixels, and console contains no shader/WebGL diagnostics.
6. Run typecheck, focused renderer/product tests, `npm run verify:final`, functional browser controls/export acceptance, and targeted direct-shader animation/drag/zoom/timeline/export budgets; leave the saved dev URL running.

## Physically Based Liquid Metal Correction

1. Add a red renderer-source contract requiring `MeshPhysicalMaterial`, metallic/roughness calibration, `RoomEnvironment`, `PMREMGenerator`, ACES tone mapping, and Paper-driven PBR normal/color injection; reject the standalone `ShaderMaterial` final-output path.
2. Refactor `src/app/liquid-metal-surface-shader.ts` into `onBeforeCompile` vertex/fragment injection snippets: preserve Paper's procedural functions, compute the non-tiled field, perturb the physical shading normal, set conductor base color and animated micro-roughness, and leave final lighting/output to Three.js.
3. Refactor `src/app/liquid-metal-scene.ts` to own one `MeshPhysicalMaterial`, one cached PMREM `RoomEnvironment`, shared uniform objects, ACES output, and deterministic disposal. Preview and export continue constructing the same `LiquidMetalSceneRenderer`.
4. Update renderer technique/pipeline descriptions, source tests, acceptance evidence, and worklog; do not add schema controls, layers, persistence, or route-local state.
5. Verify `/Users/kusnizza/Desktop/A.obj` in the controlled browser at a frozen frame: readable metallic environment reflections, Paper chromatic flow, physical response under orbit, full face coverage, and no shader/WebGL diagnostics.
6. Run typecheck, focused tests, `npm run verify:final`, functional controls/export acceptance, and targeted stress-preview/animation/drag/zoom/timeline/export performance scenarios; keep the saved dev URL running.

## Seamless Forward Loop Correction

Verification tier: Tier 3
Reason: The change touches playback time mapping, animated shader noise, preview rendering, and deterministic video frames, but does not alter the Toolcraft runtime, schema shape, controls, or dependencies.
Run: `npm run verify:quick`, focused loop/source tests, browser pixel comparison at the first/wrapped frame before and after a duration edit, and targeted animation/timeline/video-export performance scenarios.
Skip: The full first-working performance checkpoint is not required for this post-first-working non-performance correction; only the directly touched animation, timeline, and export workloads run.

1. Derive a normalized forward loop progress with `getToolcraftTimelineLoopProgress` from the runtime current time and editable duration for preview, PNG, and video export.
2. Replace the physical shader's linear `u_time` with one `u_loopProgress` uniform shared by the stripe phase, Paper simplex field, and rippled PBR normal.
3. Add a forward translated two-sample simplex blend whose start/end values and derivatives match, avoiding mirror, yoyo, ping-pong, or reverse motion.
4. Keep exactly one stripe cycle per runtime loop; let the existing Speed setting tune monotonic in-cycle pacing while the timeline duration remains the authoritative loop rate.
5. Add source/unit coverage proving runtime-duration phase mapping, wrapped endpoints, periodic simplex use, and the absence of the old linear noise path.
6. Add browser evidence comparing rendered pixels at time zero and the wrapped endpoint, repeat after editing duration, then run the targeted verification set and update the product worklog.

## Editable Environment / HDRI

Verification tier: Tier 3
Reason: Schema controls, conditional file media, worker environment decode/direct texture preparation, shared preview/export lighting, acceptance, and renderer workload inventory change without a dependency or Toolcraft runtime change.
Run: `npm run verify:quick`, focused environment unit/source tests, dedicated browser environment acceptance, exact `A.obj` agent-browser inspection, PNG/video export consistency, and targeted environment import/slider/animation/export performance scenarios.
Skip: The post-first-working feature does not trigger the full performance checkpoint; directly affected paths receive targeted budgets.

1. Update `starterControlSectionInventory` first with one Environment entity covering `lighting.environmentPreset`, `media.environment`, `lighting.environmentIntensity`, and `lighting.environmentRotation`.
2. Add the Environment schema section with built-in select/fileDrop/sliders, conditional custom upload, reset defaults, performance roles, and no persistence/layer/timeline changes.
3. Add `src/app/liquid-metal-environment.ts` to derive runtime environment settings, select the environment media asset, and provide stable source identity.
4. Refactor `LiquidMetalSceneRenderer` to retain Studio PMREM, build Neutral/Warm procedural equirectangular environments, worker-decode HDR/EXR, atomically replace/dispose direct GPU textures, and apply intensity/rotation without re-decoding.
5. Update the preview renderer with a stale-safe environment effect and error observable; update PNG/video export to await the same environment setup before rendering or recording.
6. Extend acceptance, product/source tests, render pipeline inventory, performance scenarios, and browser fixtures for preset changes, both sliders, custom HDR upload/remove/reset, preview pixels, and shared export output.
7. Run the Tier 3 verification set, record exact results and risks in `agent-worklog.md`, confirm the saved dev URL still serves Liquid Metal 3D, and leave playback running.

## Model Scale

Verification tier: Tier 3
Reason: A new Source control changes the shared WebGL composite used by preview, PNG, and video.
Run: `npm run verify:quick`, the dedicated model-scale browser acceptance, the targeted `model.scale` performance scenario, focused export coverage, and an agent-browser check with the supplied `A.obj`.
Skip: No dependency/runtime/layer/timeline changes; the full performance checkpoint is not triggered by this post-first-working feature.

1. Keep the component-owned uploader in standalone `Model`, then add adjacent `Model Size` with a continuous `Model scale` slider targeting `model.scale`, default `1`, range `0.25..3`, step `0.01`.
2. Add `modelScale` to the typed Toolcraft settings mapper and clamp imported values to the visible product range.
3. Apply the mapped value to `LiquidMetalSceneRenderer.modelGroup.scale` so the same renderer path covers preview, PNG, and video without re-decoding or re-normalizing geometry.
4. Extend acceptance and unit coverage to prove the control default/range, settings mapping, live canvas output, stable paused shader phase, and shared export use.
5. Extend the render pipeline and performance matrix so `model.scale` invalidates only the final Three.js composite and runs against the realistic large-model fixture.
6. Run Tier 3 verification, update the worklog, and leave the existing local app URL running.

## Geometry-Conforming PNG Stickers

Verification tier: Tier 4
Reason: Multi-file source media, ordered physical decal geometry, canvas hit-testing/dragging, shared HDRI lighting, preview/export composition, acceptance, and performance declarations change together.
Run: `npm run verify:final`, dedicated source/unit coverage, browser batch/stack/reorder/rotate/flip/remove/reset/drag/conformance/environment/export acceptance, plus targeted media-import, sticker-drag, animated viewport, and export budgets.
Skip: No package or Toolcraft runtime change is planned. The app is already past first-working delivery, so the full performance checkpoint is replaced by targeted budgets for every newly invalidated path.

1. Add `media.stickers` to `starterControlSectionInventory` and `app-schema.ts` as a standalone built-in multi-PNG `fileDrop` immediately after Model Size; keep generic Layers disabled and document media order as the sticker stack authority.
2. Add `src/app/liquid-metal-stickers.ts` with typed placement-map sanitization, ordered sticker asset selection, transform tokens, normalized-model-local position/normal serialization, and stale-placement pruning helpers.
3. Extend `LiquidMetalSceneRenderer` with cached PNG textures, `DecalGeometry` projection against every base model mesh, deterministic center-ray defaults, surface raycast hit/move APIs, topmost selection, ordered polygon offsets/render order, and disposal.
4. Patch each transparent `MeshPhysicalMaterial` with the existing direct-environment uniform block/apply snippet so Studio PMREM and Neutral/Warm/custom HDRI illuminate both the Liquid Metal model and stickers; preserve sRGB/alpha and runtime rotate/flip transforms.
5. Extend `LiquidMetal3DRenderer` pointer ownership: left-down on a decal selects its media layer, previews raycast movement locally, and commits one undoable `controls.setValue` placement on release; left-down on empty product space bubbles to canvas pan, and middle drag remains model orbit. Sync media/order/transform/removal changes without reloading the model.
6. Extend PNG and video export to await the same ordered sticker stack and placement map before rendering frames; dispose export decal resources with the isolated scene.
7. Update readiness, reference evidence, section inventory, acceptance rows, renderer-pipeline passes/invalidation, workload targets, and focused unit/source tests before browser checks.
8. Add browser tests that generate transparent PNG fixtures and curved OBJ geometry, prove batch upload/newest-on-top/reorder/rotate/flip/remove/reset, direct click-drag with surface attachment after orbit, visible HDRI modulation, and PNG/video output parity.
9. Invoke `systematic-debugging` before any corrective edit if a test, build, browser, export, or WebGL check fails; run the Tier 4 gate, record exact evidence and remaining DecalGeometry corner-distortion risk in the worklog, then keep the saved app URL running.

## Sticker PNG Color Fidelity

Verification tier: Tier 3
Reason: Correct one shared material recipe used by preview, PNG export, and video export without changing the schema, runtime, sticker geometry, or dependencies.
Run: `npm run verify:quick`, focused renderer-source/product tests, and the dedicated sticker browser acceptance including bright source-color sampling and PNG/video export.
Skip: No full performance checkpoint or workload rerun; this changes fixed material flags only and does not alter decode, projection, draw-count, animation, or viewport work.

1. Update the sticker `MeshPhysicalMaterial` so the PNG is both the alpha-bearing map and the full-intensity emissive map; set black diffuse color, zero metalness, and disable per-material tone mapping.
2. Retain low-energy clearcoat/specular environment response, keeping the earlier HDRI requirement without using environment brightness as a multiplier for PNG RGB.
3. Tighten renderer-source coverage to require the emissive/tone-mapping recipe and update acceptance wording to distinguish color-stable artwork from additive environment reflection.
4. Extend the curved-model browser acceptance with a solid top sticker and direct canvas pixel sampling that fails when the PNG is physically dimmed.
5. Run the Tier 3 checks, record the root cause and results in the product worklog, and keep the saved development URL serving the corrected app.

## Triplanar Scratch Height Mask

Verification tier: Tier 3
Reason: Add one material media source and three schema controls, extend the shared WebGL normal pipeline, and preserve preview/PNG/video parity without runtime, dependency, layer, timeline, or persistence changes.
Run: `npm run verify:quick`, focused scratch unit/source/contract tests, dedicated browser feature acceptance, targeted production-size mask import and scratch slider budgets, targeted PNG/video export, then `npm run dev` identity verification.
Skip: No full performance checkpoint because this is a post-first-working feature rather than a performance complaint; touched workloads receive targeted checks.

1. Add component-owned `Scratch Mask` plus adjacent `Surface Scratches` to `starterControlSectionInventory` and `app-schema.ts`: built-in single-image `fileDrop` at `media.scratches`, continuous `Depth`/`Scratch scale` sliders, and an `Invert` switch, including defaults, descriptions, performance roles, and reset behavior.
2. Add `src/app/liquid-metal-scratches.ts` to select the single mask asset, sanitize depth/scale/invert values, and derive stable media/transform tokens for preview and export.
3. Extend the typed Liquid Metal settings and uniforms with scratch depth, scale, invert, enabled state, texture, and UV transform; keep Paper preset bundles independent of the new material feature.
4. Decode the grayscale mask once as a non-color repeat texture, update its built-in rotate/flip matrix without model or environment rebuild, dispose stale textures, and expose stale-safe `setScratchMask` on `LiquidMetalSceneRenderer`.
5. Extend the physical shader with object-local position, triplanar `YZ/ZX/XY` sampling, sharpened normal weights, and tangent-free screen-derivative height-to-normal perturbation after the existing looping ripple normal.
6. Wire the React preview effect and both isolated export paths to the same scratch asset/transform and material settings; keep stickers on the separate top decal material.
7. Update readiness, acceptance rows, pipeline passes/cache keys/invalidation, media load profile, scenario lists, source/product/schema tests, and existing file-input indices affected by the new uploader.
8. Add browser fixtures and acceptance proving source upload, visible depth, scale density, invert polarity, rotate/flip, object attachment under orbit, PNG/video presence, remove, section reset, and global reset; add targeted production-size media import and uniform-drag performance cases.
9. Invoke systematic debugging before correcting any failing test or WebGL diagnostic, run the Tier 3 gate, record exact evidence/risks in the worklog, and keep the saved local URL running.

## Studio HDRI Presets

Verification tier: Tier 3
Reason: Extend one schema selector and the shared procedural IBL source used by preview, PNG, and video; no dependency, runtime, media, layer, timeline, or persistence change.
Run: `npm run verify:quick`, focused environment product/source tests, dedicated Environment browser acceptance for all eight options, targeted `lighting.environmentPreset` performance coverage, and `npm run dev` identity verification.
Skip: The full performance checkpoint is not triggered by this post-first-working non-performance feature.

1. Extend the built-in `Environment Source` select with `Softbox`, `Product`, `Rim`, and `Chrome`, keeping existing option values stable and `Custom HDRI` last.
2. Extend `LiquidMetalEnvironmentPreset` parsing and source-key derivation so all new settings survive runtime commands, Reset, settings transfer, preview, and export.
3. Replace the two-branch procedural environment builder with typed, recipe-driven HDR float equirectangular panels for Neutral, Warm, Softbox, Product, Rim, and Chrome; use seam-wrapped horizontal distance and preserve the existing Three texture metadata.
4. Keep `Studio` on cached RoomEnvironment PMREM and Custom on worker-decoded HDR/EXR; route every new preset through the existing direct-radiance/GGX uniforms so Intensity and Rotation remain uniform-only updates.
5. Extend acceptance option coverage, environment settings tests, renderer-source guards, renderer-pipeline wording, and the existing targeted preset performance fixture without adding duplicate scenarios.
6. Update the real Environment browser test to select every visible source, compare product-output pixels, and retain the existing custom HDR upload/remove/reset/export evidence.
7. Run the Tier 3 checks, use systematic debugging before any corrective edit if they fail, record exact evidence and the procedural-vs-photographic HDRI distinction in the worklog, then verify the saved app URL.

## Surface-Island Sticker Projection and Transform

Verification tier: Tier 3
Reason: Per-sticker transform state, schema controls, geometry clipping, preview/export composition, acceptance, and projection workload change together.
Run: `npm run verify:quick`, focused sticker tests, dedicated browser behavior with generated fixtures, exact supplied `A.obj`/PNG verification, and targeted sticker drag/scale/rotation budgets.
Skip: No dependency, runtime, layer, timeline, or persistence change; no full performance checkpoint for this post-first-working correction.

1. Extend `LiquidMetalStickerPlacement` with sanitized `scale` and `rotationDegrees`; preserve both during surface drag and use backward-compatible defaults for imported placement maps.
2. Add `Sticker Transform` to `starterControlSectionInventory` and `app-schema.ts` with built-in continuous `Sticker scale` and `Sticker rotation` sliders. Keep `Stickers` as its required standalone uploader section.
3. In `LiquidMetal3DRenderer`, treat the two schema values as selection proxies: load values when sticker selection changes, write changes into only that sticker's placement, and use the values as defaults when a new sticker is placed.
4. Scale and rotate the Three.js decal projector from the placement data, reduce projector depth, then filter projected triangles by normal alignment and shared-edge connectivity seeded at the closest triangle to the hit anchor. Choose the closest valid component across source meshes.
5. Keep projection tokens, hit testing, direct drag, model scale/orbit, source-image rotate/flip, ordered overlap, physical color-stable sticker material, and isolated PNG/video renderers consistent with the new placement fields.
6. Extend readiness, acceptance rows, renderer-pipeline invalidation, workload targets, performance scenarios, schema/product/source tests, and the existing sticker browser test for independent scale/rotation and transform persistence after drag.
7. Reproduce the supplied failure in the controlled browser and verify that the decal remains on the clicked front/bevel island rather than stretching onto perpendicular side walls; verify all output pixels with no console or WebGL errors.
8. Run the Tier 3 gate, document the measured regression evidence and true-hole cropping behavior in `agent-worklog.md`, then leave the saved application URL serving the updated app.

## Connected-Face Sticker Wrapping Correction

Verification tier: Tier 3
Reason: Replace the sticker geometry projection with a topology-aware surface chart while preserving existing controls, media ownership, runtime shell, and exports.
Run: `npm run verify:quick`, focused surface-chart unit/source tests, folded-surface and exact-file browser checks, targeted `stickers.scale`, `stickers.rotation`, and surface-drag budgets, then `npm run dev` identity verification.
Skip: No dependency, Toolcraft runtime, section, timeline, layer, persistence, or general export-size behavior changes; the full post-first-working performance suite is not triggered.

1. Add a pure sticker-surface geometry module that caches canonical mesh triangles, manifold shared-edge adjacency, vertex normals, and stable mesh/face identifiers at model load.
2. Extend placement serialization with optional seed mesh/face indices; write them from raycasts and retain backward compatibility by resolving the nearest normal-compatible triangle when they are absent or stale.
3. Replace `DecalGeometry` plus the global 72-degree filter with seed-plane chart construction, edge-by-edge triangle unfolding, bounded shortest-path traversal, chart-space rectangle clipping, and continuous UV generation.
4. Wire the cached topology into `LiquidMetalSceneRenderer` rebuild/disposal paths so drag, selected scale/rotation, model replacement, preview, PNG, and video all use one geometry implementation.
5. Add deterministic unit fixtures for a 90-degree fold, disconnected panel, boundary/non-manifold stop, continuous shared-edge UVs, rotation, and scale; update renderer-source guards and pipeline wording.
6. Add acceptance for hard-edge wrapping and a browser folded-prism fixture whose asymmetric bright PNG must render on both connected faces while a disconnected nearby panel stays Liquid Metal.
7. Reproduce with the supplied `A.obj` and PNG, orbit around the transition, inspect for gaps/stretching and WebGL diagnostics, then run targeted sticker interaction budgets.
8. Update `agent-worklog.md` with root-cause, algorithm, verification, skipped full-suite rationale, and residual limits; keep the saved local app URL running.
