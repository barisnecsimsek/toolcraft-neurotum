# Liquid Metal 3D — Product Specification

## Product Goal

Build a Toolcraft product that accepts one uploaded 3D model and renders the model with the official Paper Design Liquid Metal shader. The shader implementation, parameters, defaults, ranges, and presets come from `@paper-design/shaders-react` / `@paper-design/shaders` version `0.0.77` and the live reference at `https://shaders.paper.design/liquid-metal`.

## Reference Study

- Reference runtime: Paper Shaders Liquid Metal page, opened and run on 2026-07-10.
- Source inspected: Paper Design `paper-design/shaders` commit `e77c99ede9be8f4842c6bac22ca24902dc41334d`, `packages/shaders/src/shaders/liquid-metal.ts`, `packages/shaders-react/src/shaders/liquid-metal.tsx`, the Liquid Metal docs route, and the parameter definition.
- Package inspected: npm `@paper-design/shaders-react@0.0.77` and `@paper-design/shaders@0.0.77`.
- Runtime behavior checked: default render, exact visible control values, and the Noir preset applying its parameter bundle.
- Important constraint: the Paper shader is a 2D WebGL canvas shader whose `image` or `shape` is an effect mask. It is not a Three.js mesh material.

## 3D Mapping

The uploaded model replaces the reference `image` / predefined `shape` mask. The official Paper Liquid Metal stripe, simplex-noise, distortion, dispersion, softness, contour, tint, and timing math runs directly inside the Three.js mesh fragment shader. The intentional adapter replaces Paper's canvas/image UV and 2D edge mask with a matcap-style view/normal projection driven by a continuously rippled surface normal. Every rasterized model fragment therefore computes Liquid Metal as a view-dependent reflected field; no baked texture tile, rectangular active field, UV unwrap, dominant-axis box projection, or screen-space mask is used.

### Reflection/Matcap projection revision

- Observed defect: dominant-axis world-position projection followed by `fract(uv)` repeats the same rectangular field on separate faces and switches projection abruptly when the dominant normal axis changes.
- Techniques evaluated:
  - authored mesh UVs preserve intentional unwraps but cannot be required for arbitrary OBJ/STL uploads;
  - triplanar mapping is appropriate for UV-less spatial textures, but it remains a position projection and is not by itself metallic reflection;
  - matcap maps a complete baked material from the surface normal relative to the camera;
  - environment mapping derives metal color from the reflected view direction and is the physically relevant basis for reflective metal.
- Chosen adapter: use Three.js' matcap view basis for the Liquid Metal field and bend the mesh normal with continuous object-space simplex noise before projection. The Paper procedural field then behaves as a dynamic reflected environment even on large planar faces, while hard geometric edges retain physically expected reflection changes.
- Scale, rotation, offset, fit, presets, color math, and timeline remain direct uniforms. The surface adapter never calls `fract` on the mapped UV; only Paper's own stripe-phase `fract(direction)` remains, because that is the reference Repetition behavior rather than texture tiling.

### Physically based metal revision

- Observed defect: the non-tiled material still looks graphic because a standalone `ShaderMaterial` writes the final color directly. Its Fresnel and studio highlight are artistic approximations, not a metallic BRDF, and it has no prefiltered environment reflection.
- Implementation research:
  - Three.js and glTF use the metallic-roughness PBR workflow; a conductor uses `metalness = 1`, low roughness produces sharp reflections, and an environment map supplies indirect specular lighting.
  - Three.js `RoomEnvironment` is explicitly designed to feed `PMREMGenerator` and provide image-based lighting to PBR materials.
  - Filament's reference material model evaluates environment radiance from the reflected vector, prefilters it by perceptual roughness, and treats a perturbed normal as part of material shading.
  - pmndrs `MeshDistortMaterial` combines simplex-noise deformation with a standard lit material instead of replacing lighting with an unlit color shader.
- Chosen architecture: use `MeshPhysicalMaterial` with metallic `1`, calibrated low roughness, ACES tone mapping, and a cached PMREM `RoomEnvironment`. Inject Paper's procedural Liquid Metal core through `onBeforeCompile`: it supplies chromatic conductor base color and animated micro-roughness, while its continuous noise perturbs the PBR shading normal. Three.js remains responsible for Fresnel, GGX specular response, energy conservation, and environment reflections.
- The Paper controls and presets remain the only product controls. Physical metal calibration is an implementation constant so the app does not invent reference controls or alter settings-transfer payloads.

The following reference behavior is intentionally changed by the user's 3D request:

- `Upload image` becomes `Model file` and accepts `.glb`, self-contained `.gltf`, `.obj`, and `.stl`.
- `shape` is omitted because the uploaded mesh defines the actual shaded surface coverage. Keeping a second 2D mask would remove Liquid Metal from parts of that surface.

All other visible Paper settings remain available with their reference defaults and ranges:

- `colorBack` `#AAAAAC`;
- `colorTint` `#FFFFFF`;
- `repetition` `2`, range `1..10`;
- `softness` `0.1`, range `0..1`;
- `shiftRed` `0.3`, range `-1..1`;
- `shiftBlue` `0.3`, range `-1..1`;
- `distortion` `0.07`, range `0..1`;
- `contour` `0.4`, range `0..1`;
- `angle` `70`, range `0..360`;
- `speed` `1`, range `0..4`;
- `scale` `0.6`, range `0.2..4` as on the live page;
- `rotation` `0`, range `0..360`;
- `offsetX` / `offsetY` `0`, range `-1..1`, represented by Toolcraft Vector;
- `fit` `contain | cover`.

Reference presets `Default`, `Noir`, `Backdrop`, and `Stripes` apply the exact Paper parameter bundles except their 2D `shape` field, which is replaced by the model geometry.

## Product Behavior

- Empty canvas: neutral Toolcraft backing with no sample model, artwork, prompt, or helper copy.
- Upload: built-in single-file `fileDrop`; clear/remove and Reset remove the uploaded model.
- Model view: centered and normalized automatically; middle-button drag rotates the object while left drag remains Toolcraft canvas pan.
- Environment: Studio, Neutral, Warm, or uploaded Radiance HDR/OpenEXR with live intensity and horizontal rotation; the same source drives preview, PNG, and video.
- Animation: Toolcraft playback timeline owns one normalized forward cycle. The renderer derives a deterministic loop phase from the editable duration; `speed` changes the forward in-cycle pacing while preserving the first/last seam.
- Layers: disabled because the product edits one model.
- Persistence: `storage: "none"`; large uploaded model data is not persisted across reloads.
- Output size: editable `1920x1080`, render scale enabled.
- PNG: PNG/JPG plus 2K/4K/8K, using the standard Toolcraft PNG helper.
- Video: MP4/WebM plus Current/4K, using the runtime timeline duration and standard video size helper.
- Background: required Include switch plus scene background color. PNG can be transparent; video always includes the scene background.

## Control Section Inventory

1. `Model` — uploaded 3D model.
2. `Model Size` — normalized model scale and output framing.
3. `Presets` — Paper's four parameter bundles.
4. `Metal Color` — Paper background/base and burn tint colors.
5. `Metal Pattern` — stripe density, softness, RGB dispersion, distortion, contour, and angle.
6. `Projection` — Paper speed, scale, rotation, offset, and fit.
7. `Environment` — PBR reflection source, conditional HDRI upload, intensity, and rotation.
8. `Background` — scene background inclusion and color.
9. `Image Export` — image format and resolution.
10. `Video Export` — video format and resolution.

## Animation Intent Inventory

- Mode: playback timeline.
- Time owner: Toolcraft timeline.
- User transport: play/pause, scrub, duration, and loop from the top timeline.
- Default duration: `3.333333s`, derived from the Paper fragment shader's dominant stripe phase `t = 0.3 * u_time`; one stripe translation is `1 / 0.3` seconds at speed `1`.
- Direction: forward only; no yoyo or ping-pong.
- Viewport interaction: preview frame uploads/renders are coalesced while canvas drag/zoom/radar interactions are active without changing playback state.

## Renderer Technique Decision Matrix

- sourceRepresentation: mixed — uploaded GLB/GLTF/OBJ/STL geometry, optional worker-decoded HDR/EXR pixels, and Paper's procedural shader source.
- productRepresentation: pixel — Three.js PBR meshes whose fragments combine Paper's procedural core, perturbed shading normals, cached Studio PMREM, or selected equirectangular physical radiance.
- previewRenderer: webgl — one persistent Three.js WebGL scene with a patched `MeshPhysicalMaterial`, Studio PMREM, and cached direct environment texture up to 512px wide.
- exportRenderer: webgl — one isolated Three.js WebGL scene using the same physical material and selected direct environment at up to 2048px for final output.
- rendererWorkload: pixel-output — uploaded triangle count, Paper procedural fragment complexity, GGX/IBL evaluation, Three.js backing resolution, animation frames, and export resolution.
- rendererStrategy: one physical WebGL mesh pass using Studio PMREM or direct equirectangular radiance inside Three's physical indirect-light accumulation.
- whyNotAlternativeStrategies:
  - DOM/SVG cannot preserve the reference shader or rasterize mesh depth at this pixel workload.
  - Canvas 2D would require CPU pixel processing and flatten the model.
  - A CanvasTexture or standalone unlit ShaderMaterial does not provide an energy-conserving metallic BRDF or roughness-filtered environment reflection.
  - WebGPU would require translating the maintained Paper GLSL and narrow compatibility.
- Rejected alternatives: retaining screen-space or triplanar CanvasTexture sampling; relying only on mesh UVs; applying CPU pixel processing; using a static texture; or using the model only as a preprocessed 2D silhouette.
- fidelityRisks: Paper's 2D image/shape mask and responsive canvas-border calculation are intentionally replaced by physical mesh-normal/IBL inputs; the stripe/noise/color core and all user parameters stay mapped one-to-one, while physically lit output is intentionally not pixel-identical to the flat webpage.
- performanceRisks: Studio PMREM and the full procedural/PBR core run at high output sizes; HDR/EXR decode and preview resampling run in a worker, while preview uploads one 512px environment texture and export prepares the same source up to 2048px.

## Renderer Layer Inventory

- backgroundLayer: Three.js clear color from `appearance.background`; kind `background`; content `composite`; export mode `included`.
- productForegroundLayer: depth-tested `MeshPhysicalMaterial` executing the Paper Liquid Metal procedural core as conductor color/micro-roughness with a rippled PBR normal and PMREM reflection; kind `product-foreground`; content `geometry` and `shader`; primitive count `high`; UI selector `[data-liquid-metal-canvas]`; export mode `included`.
- editingHandlesLayer: none; middle-button orbit is input behavior and creates no product/canvas overlay.
- exportComposite: isolated Paper and Three WebGL renderers; kind `export-composite`; content `composite`; export mode `composited`.

## Render Pipeline Inventory

1. `model-decode` — parses the uploaded file; cache key is media asset identity; invalidated only by media import/remove/reset.
2. `model-normalize` — centers/scales geometry; cache key is decoded model identity; invalidated by model decode.
3. `environment-decode` — worker-decodes HDR/EXR and resamples the equirectangular source for preview/export preparation; cache key is environment media identity.
4. `environment-texture-prepare` — uploads/caches the selected procedural or custom equirectangular GPU texture; Studio keeps its constructor-time PMREM.
5. `liquid-metal-uniform-pack` — maps Toolcraft values and timeline frame to direct mesh uniforms; invalidated by Liquid Metal controls and timeline time.
6. `three-surface-composite` — executes Paper's procedural stripe/noise/color core inside Three.js physical GGX/IBL shading and draws the selected environment response plus scene/background.
7. `png-export` — isolated Three surface render at selected image resolution with the same environment recipe.
8. `video-export` — reused isolated Three surface renderer over deterministic timeline frames at selected video size with the same environment recipe.

## Acceptance Summary

Browser coverage must prove model upload/clear/reset, every Liquid Metal control group, all presets, Environment presets/intensity/rotation, conditional HDRI upload/remove/reset, middle-drag model rotation, editable canvas sizing, render scale backing pixels, playback/scrub/duration/loop, background transparency, image formats/resolutions, video formats/resolutions/duration, and stable canvas drag/zoom.

Renderer-specific coverage must also prove the material contains the Paper repetition/softness/dispersion/distortion/contour/angle/time/noise core, uses `MeshPhysicalMaterial`, PMREM environment lighting, metalness, roughness, and continuous normal perturbation, contains no dominant-axis projection or mapped-UV tiling, covers the full visible model, changes paused output when an asymmetric model is rotated, and is shared by preview/export.

## Verification Note

Verification tier: Tier 4 for the physically based Liquid Metal renderer rewrite.

Reason: the iteration replaces the standalone unlit material with a patched physical material, cached PMREM environment, and shared preview/export PBR pipeline; schema and product workflow remain unchanged.

Run: `npm run verify:final`, renderer-source tests, exact `A.obj` full-surface/orbit checks, real PNG/video acceptance, and targeted control/animation/viewport/export performance scenarios; keep the existing dev URL running.

Skip: full performance checkpoint because this is a post-first-working renderer behavior correction and the touched workload paths receive targeted budgets; layers remain unrelated.

## Editable Environment / HDRI Revision

- Product goal: let the user change the reflection/lighting environment that makes the PBR liquid metal readable, including a real equirectangular HDRI upload.
- `Environment` is one product entity and one controls section:
  - `Source` select: `Studio`, `Neutral`, `Warm`, `Custom HDRI`;
  - built-in `fileDrop` for one `.hdr` or `.exr`, visible only for `Custom HDRI`;
  - `Intensity` slider, default `1.35`, range `0..3`;
  - `Rotation` slider, default `0°`, range `0..360°`.
- Control selection inventory:
  - source mode uses built-in `select` because it is a finite named choice;
  - HDRI source uses built-in `fileDrop` because it owns import/remove/reset and media identity;
  - intensity/rotation use built-in continuous `slider` controls because both update the visible PBR response live;
  - no custom control, image picker, layer, or route-local UI is needed.
- Built-in environments remain offline and deterministic: Studio preserves the current `RoomEnvironment` PMREM, while Neutral and Warm use lightweight procedural equirectangular HDR maps. `Custom HDRI` decodes Radiance HDR with `HDRLoader` or OpenEXR with `EXRLoader` inside a module Worker.
- Custom mode without an uploaded file safely keeps the Studio environment. A failed HDRI decode keeps the last valid environment and exposes renderer diagnostics without removing the model.
- `Intensity` and `Rotation` update stable environment uniforms without re-decoding media. Changing the environment source invalidates only worker decode, GPU texture preparation, and the final composite; model decode, normalization, material program, and Liquid Metal uniforms stay cached.
- To keep uploads responsive, preview downsamples the decoded HDRI in the worker to a 512px-wide equirectangular texture before GPU upload; export prepares the same source up to 2048px. Direct radiance is injected before Three's `RE_IndirectSpecular_Physical`, so GGX/Fresnel/conductor response stays physical without a synchronous PMREM rebuild on every user source change.
- Preview, PNG, and video create the same environment recipe from Toolcraft runtime values and the `media.environment` asset. Settings transfer includes source/intensity/rotation values; persistence remains disabled and uploaded HDRI bytes are not saved across reload.
- Layers remain disabled, the existing playback timeline remains unchanged, and Background remains the clear/output background rather than the reflection environment.

Verification tier: Tier 3
Reason: This adds schema controls and a second media source, introduces worker HDR/EXR decode plus direct environment texture preparation, and changes preview/PNG/video lighting while keeping dependencies and Toolcraft runtime unchanged.
Run: `npm run verify:quick`, focused environment loader/source tests, browser preset/intensity/rotation/custom-upload/remove/reset acceptance with a real HDR fixture and `A.obj`, real PNG/video export consistency, plus targeted environment media-import/control/animation/export performance scenarios.
Skip: The full performance checkpoint is not required for this post-first-working feature; only the newly touched environment, animation, and export paths run.

## Model Scale Revision

- Product goal: let the user resize the normalized uploaded model in the output without changing Paper's projected pattern scale.
- Add one built-in continuous `slider` named `Model scale` in `Model Size`, immediately after the standalone `Model` uploader section. FileDrop remains a component-owned standalone section per the Toolcraft media contract.
- Runtime target: `model.scale`; default `1`, range `0.25..3`, step `0.01`, with no unit suffix.
- The value applies to the normalized Three.js model group, so `1` preserves the current framing, lower values add breathing room, and higher values may intentionally crop against the canvas bounds.
- `shader.scale` remains the Paper projection/pattern control in `Projection`; presets continue to modify only Paper values and never reset the model transform.
- Preview, PNG, and video consume the same `LiquidMetal3DSettings.modelScale` value through `LiquidMetalSceneRenderer.setLiquidMetalSettings`.
- Layers, timeline, persistence, environment selection, background, and export settings remain unchanged.
- Render-pipeline invalidation: `model.scale` invalidates only `three-surface-composite`; model decode/normalization, environment decode/texture preparation, and Liquid Metal uniform packing stay cached.

Verification tier: Tier 3
Reason: The feature adds a product control and changes the shared Three.js preview/PNG/video composite, without changing dependencies or the Toolcraft runtime.
Run: `npm run verify:quick`, dedicated browser pixel-bounds acceptance with a paused shader frame, a targeted `model.scale` workload budget, and focused PNG/video export coverage.
Skip: The full performance checkpoint is not required for this post-first-working feature; the directly touched scale and export paths receive targeted coverage.

## Surface Sticker Decals

- Product goal: let the user upload a batch of transparent PNG stickers and place them directly on the uploaded 3D model as geometry-conforming, physically lit surface decals.
- Reference input: `/Users/kusnizza/Library/Containers/ru.keepcoder.Telegram/Data/tmp/telegram-cloud-photo-size-2-5361940565534121530-y.jpg`. The acceptance properties taken from the still are preserved transparent/color artwork, visible overlap order, continuous wrapping over curved metal, and shared scene lighting. The reference is a still, so it does not define interaction timing or hidden controls.
- `Stickers` is one built-in multi-file `fileDrop` targeting `media.stickers`, restricted to PNG. Each imported file remains a distinct runtime media asset with a thumbnail, remove action, rotate/flip transforms, and collection reorder.
- Every new sticker is selected and appended above existing stickers. Runtime media order is the canonical overlap order; reordering thumbnails changes the decal draw order. The most recent/topmost visible decal wins hit testing where stickers overlap.
- Clicking a sticker on the canvas selects it and starts direct manipulation. Pointer movement raycasts the current model, moves the decal projector to the hit point, aligns it to the interpolated surface normal, and rebuilds the clipped decal geometry. Clicking empty canvas preserves normal Toolcraft canvas panning; middle drag preserves model orbit.
- Placement state is stored at `stickers.placements`, keyed by media asset id, as normalized-model-local position and normal tuples. This makes decals inherit model orbit and `model.scale`; direct manipulation previews locally at pointer rate and commits one undoable value on release, giving preview/PNG/video one serializable placement source without rerendering the whole control panel per pointer event.
- A new sticker receives a deterministic center-facing surface placement found by camera raycast. If the exact center misses a hollow model, bounded nearby rays are tried. PNG aspect ratio determines the projector footprint; the long edge uses a fixed product default because size/rotation controls were not requested.
- Three.js `DecalGeometry` clips the projector against every source model mesh so the raster follows curved triangles instead of acting as a screen overlay, UV tile, matcap, or flat plane. The implementation accepts the documented limitation that one planar projector may distort around very sharp corners.
- Sticker material is a transparent `MeshPhysicalMaterial` whose PNG RGB is routed through an emissive/unlit channel with tone mapping disabled, while the regular map continues to preserve PNG alpha. The diffuse-lit contribution is black, so Environment Intensity cannot dim or recolor the artwork; modest clearcoat/specular radiance from Studio PMREM or direct Neutral/Warm/custom HDRI remains as a subtle additive surface reflection.
- Layers panel remains disabled. The built-in sticker media collection already owns import, selection, order, transform, and deletion; enabling generic Layers would also expose unrelated model/HDRI media and blank runtime layers. Internal media layer ids are still selected on canvas click so the runtime's standard media selection semantics remain intact.
- Removing a sticker disposes its texture/material/geometries and prunes stale placement state. Reset removes the whole sticker batch. Preview, PNG, Current video, and 4K video build the same decal stack from the same runtime media order, transforms, placement map, and selected environment.

### Sticker render-pipeline additions

1. `sticker-decode` — decodes each PNG once per media asset identity and applies its runtime rotate/flip transform.
2. `sticker-decal-project` — raycasts default/drag positions and rebuilds `DecalGeometry` only for changed sticker placements, transforms, order, or model geometry.
3. `three-surface-composite` — depth-composites the ordered physical sticker meshes above the Liquid Metal base with the selected environment.
4. `png-export` / `video-export` — reuse the identical sticker decode, projection, ordering, and physical-environment recipe in the isolated export renderer.

Verification tier: Tier 4
Reason: This major post-generation feature changes multi-file media flow, direct canvas manipulation, custom WebGL geometry/material composition, preview/export parity, acceptance, and renderer workload inventory.
Run: `npm run verify:final`, focused sticker source/unit tests, browser batch upload/order/transform/remove/reset/click-drag/conformance/HDRI checks, PNG/video parity, and targeted sticker import/drag/animation/viewport/export performance scenarios.
Skip: The full first-working performance checkpoint is not triggered because this is a post-first-working feature and the touched sticker workloads receive targeted browser budgets; timeline mode, persistence, Toolcraft runtime source, and generic Layers stay unchanged.

### Sticker color-fidelity correction

- The uploaded PNG's sRGB RGB values and alpha are the authoritative sticker artwork. Model lighting, Environment Intensity, exposure, and ACES tone mapping must not make that base artwork dull.
- `map` remains bound for alpha sampling, while `emissiveMap` reproduces the same sRGB texture at full intensity, base diffuse color is black, metalness is zero, and per-material tone mapping is disabled.
- HDRI still affects a deliberately weak clearcoat/specular layer, so changing the environment can move a highlight without multiplying the underlying PNG brightness.
- Preview, PNG export, and video export use the same material factory, so color preservation is identical in every output path.

Verification tier: Tier 3
Reason: The shared Three.js sticker material changes preview and all exports, but schema, runtime state, dependencies, geometry projection, and interaction behavior remain unchanged.
Run: `npm run verify:quick`, focused renderer-source/product tests, and the dedicated sticker browser acceptance with a solid bright-color pixel assertion plus PNG/video export.
Skip: The full performance checkpoint is not triggered by a color-material correction; no geometry, decode, timeline, viewport, or workload cost changes.

## Object-Space Scratch Height Mask

- Product goal: let the user upload one grayscale raster mask and turn its luminance into apparent scratch depth on the Liquid Metal surface, without requiring UV coordinates on the uploaded model.
- Control Section Inventory: component-owned `Scratch Mask` contains only the built-in single-image `fileDrop` at `media.scratches`; adjacent `Surface Scratches` owns `surface.scratchDepth`, `surface.scratchScale`, and `surface.scratchInvert`. The file control owns upload/remove/reset plus rotate/flip transforms; continuous `Depth` and `Scratch scale` sliders tune the GPU result live; `Invert` supports either black-as-groove or white-as-groove source conventions.
- Default convention is black = recessed and white = raised. `Invert` reverses only height polarity; it does not change source bytes or Liquid Metal color.
- The mask is sampled as non-color data with repeat wrapping. Object-local normalized position supplies three planar UV pairs (`YZ`, `ZX`, `XY`), and absolute object-space normal weights blend them with a sharpened normalized triplanar weight. This avoids UV seams, dominant-axis tiles, and world-space swimming when the model rotates or scales.
- The blended height is differentiated in screen space and passed through a tangent-free Mikkelsen-style surface-gradient perturbation. The resulting view normal replaces only the physical shading normal after the existing seamless Liquid Metal ripple, so scratches bend HDRI/specular reflections and read as depth without displacing the silhouette or geometry.
- `Depth` defaults to `0.35`, range `0..1.5`; `Scale` defaults to `6`, range `0.5..20`. Depth zero is a true neutral state. Scale changes object-space repetition while keeping a constant three-sample GPU path.
- The image transform matrix is consumed by all three planar projections. Rotate, Flip H, and Flip V therefore alter the visible scratch direction consistently in preview and export.
- `scratch-mask-decode` caches one decoded bitmap per media identity; transform changes update its texture matrix; depth/scale/invert update stable uniforms only. Mask removal disables the branch and disposes its texture without rebuilding the model, environment, decals, or material program.
- Preview, PNG, and video call the same scene renderer mask setup. Stickers remain above the scratched metal and keep their own color-stable material, so the scratch normal affects the exposed Liquid Metal rather than recoloring sticker artwork.
- Layers remain disabled because the mask is material source data rather than an independently selectable scene object. Timeline, persistence, canvas sizing, environment, sticker placement, and export controls remain unchanged.

Verification tier: Tier 3
Reason: A single-image media source, three product controls, GPU texture decode/sampling, shared physical-normal output, preview/export parity, acceptance, and renderer-pipeline inventory change without dependencies or Toolcraft runtime edits.
Run: `npm run verify:quick`, focused scratch settings/source/product tests, dedicated browser upload/rotate/flip/depth/scale/invert/remove/section-reset/global-reset acceptance with PNG/video parity, and targeted `media.scratches` import plus scratch slider performance scenarios.
Skip: The post-first-working feature does not trigger the full performance checkpoint; only newly touched scratch media, uniform-drag, and export paths run.

## Studio HDRI Presets

- Product goal: provide distinct ready-to-use studio reflection rigs without requiring an external HDR/EXR file.
- Extend `Environment > Source` with four deterministic built-in choices while preserving the existing values: `Studio`, `Softbox`, `Product`, `Rim`, `Chrome`, `Neutral`, `Warm`, and `Custom HDRI`.
- `Studio` remains the cached Three.js `RoomEnvironment` PMREM. `Softbox`, `Product`, `Rim`, and `Chrome` are HDR float equirectangular IBL maps built from a dark studio base plus radiance panels; they are environment lighting, not UV textures or matcaps.
- `Softbox` uses one broad key, a softer fill, and a top card for rounded product highlights. `Product` uses a balanced high-key key/fill/top rig. `Rim` uses a dark base and strong opposing side strips. `Chrome` uses several narrow high-contrast stripboxes that reveal curved reflective surfaces.
- The generator is recipe-driven. Every panel has a horizontal/vertical center, extent, radiance strength, and linear color. Horizontal distance wraps across the equirectangular seam so a stripbox never tears at `u = 0/1`.
- Existing `Intensity` and `Rotation` uniforms apply to every new source. Changing the source invalidates only procedural texture preparation and the final composite; model decode, normalization, Liquid Metal program, stickers, and scratch-mask decode stay cached.
- Preview, PNG, and video consume the same `LiquidMetalEnvironmentPreset` and `setEnvironment` path. The built-in maps are generated locally at fixed float resolution, require no asset download or license, and remain deterministic offline.
- `Custom HDRI` remains the path for photographic studio environments. No new uploader, section, persistence, layer, timeline, dependency, or runtime behavior is introduced.

Verification tier: Tier 3
Reason: The existing Environment select and shared WebGL IBL texture preparation change, affecting preview, PNG, and video without changing dependencies or Toolcraft runtime.
Run: `npm run verify:quick`, focused environment/source tests, real browser coverage for all eight sources, and targeted `lighting.environmentPreset` responsiveness coverage.
Skip: The full performance checkpoint is not required for this post-first-working feature; the directly touched preset switch path receives targeted functional and budget checks.

## Surface-Island Sticker Projection and Transform

- Product goal: keep each PNG decal on the continuous model surface selected by the user, and let every sticker retain an independent size and in-plane rotation.
- Root-cause evidence was collected with `/Users/kusnizza/Desktop/A.obj` and `/Users/kusnizza/Desktop/FW_Premade_Sticker_31.png`. The current fixed-depth box projector produced 244 decal triangles at the reproduced placement: 49 front-facing, 158 bevel, and 37 side-facing triangles. `DecalGeometry` correctly clips a projector volume, but it does not understand the semantic surface island under the pointer; the oversized/deep projector therefore captured unrelated bevels and side walls and made the PNG appear sliced and stretched.
- Keep the standalone built-in multi-PNG `Stickers` uploader. Add the adjacent semantic `Sticker Transform` section with two built-in continuous sliders: `Sticker scale` at `stickers.scale` (default `0.4`, range `0.2..2`, step `0.01`) and `Sticker rotation` at `stickers.rotation` (default `0°`, range `-180..180°`, step `1°`). The conservative default was verified against the supplied narrow `A.obj` stroke so a new sticker is less likely to cross a true hole; the file thumbnail `90°` action remains a source-image transform, while `Sticker rotation` is the decal's continuous rotation on the model.
- A selected sticker owns its own serialized `scale` and `rotationDegrees` inside `stickers.placements`. Selecting a different sticker loads that sticker's values into the schema-backed controls. Dragging either slider updates only the selected sticker. With no selected sticker, the visible controls define the defaults for the next import, so they never become inert.
- Direct surface dragging changes only position and normal and preserves scale/rotation. Existing placement data without these fields imports compatibly as scale `1` and rotation `0°`; newly placed stickers use the visible proxy defaults.
- Projector width and height follow the PNG aspect ratio and per-sticker scale. Projector depth is proportional to the footprint and substantially thinner than the previous fixed `0.52`, reducing back/side capture before filtering.
- After `DecalGeometry` clipping, retain only triangles whose averaged normal remains within the allowed angle of the placement normal. Build shared-edge adjacency for the surviving triangles, seed at the triangle closest to the pointer anchor, and keep only that connected component. When multiple source meshes produce candidates, keep the closest valid surface component and dispose the rest. This is a surface-island decal, not a UV tile, matcap, or screen texture.
- The island rule intentionally crops at a true mesh hole or disconnected piece instead of bridging empty space. Smooth curvature and bevels within the normal threshold remain connected; perpendicular sidewalls and unrelated neighboring strokes do not.
- Preview, PNG export, Current video, and 4K video consume the same ordered placement map and projection implementation. Sticker artwork remains color-stable and preserves the existing weak HDRI clearcoat response.
- Generic Layers remain disabled; built-in sticker selection/order continues to be owned by the media collection and canvas hit testing. Persistence remains disabled. Settings transfer keeps the placement map and transform proxy values.

Verification tier: Tier 3
Reason: This changes schema controls, serialized sticker behavior, decal geometry generation, direct manipulation, preview/export parity, acceptance, and targeted renderer workload without changing dependencies or Toolcraft runtime.
Run: `npm run verify:quick`, focused placement/source/product tests, the sticker browser acceptance, an exact `A.obj` + supplied PNG browser check, and targeted sticker drag/scale/rotation performance scenarios.
Skip: The full performance checkpoint is not required for this post-first-working behavior correction; only the directly touched projection and interaction workloads run.

## Connected-Face Sticker Wrapping Correction

- Product goal: a sticker that crosses a real shared model edge must continue onto the adjacent face without being cut at the edge or collapsing into a projected stripe. True mesh boundaries, holes, disconnected pieces, and non-manifold seams must remain unpainted.
- Root cause: the surface-island pass globally rejected every decal triangle more than `72°` from the placement normal before connectivity traversal. On the supplied single-mesh `A.obj`, locally adjacent bevel triangles turn only a few degrees at a time, but the accumulated turn to the next face exceeds `72°`; the projector depth also ends before the sticker footprint can continue around the corner. Increasing those limits alone would restore Three.js planar-projector distortion because perpendicular faces share almost no projector-plane width.
- Replace the sticker-only box projection with a cached local surface chart. When the model loads, build canonical-coordinate triangles and manifold shared-edge adjacency per source mesh. Raycast placements retain the exact mesh/face seed, with nearest-triangle plus normal fallback for older serialized placements.
- Build the sticker chart from the seed tangent plane and `rotationDegrees`. Traverse genuinely shared manifold edges, unfold each adjacent triangle around the shared edge while preserving its 3D edge lengths, and stop once the chart lies beyond the sticker footprint. This permits accumulated smooth curvature and a hard `90°` exterior transition without using one global normal cone.
- Clip unfolded triangles in chart space to the sticker rectangle, interpolate their 3D positions/normals, and derive continuous `0..1` UVs from the clipped chart. The PNG therefore keeps its proportions across the fold instead of smearing along projector depth.
- Never connect separate meshes/components, boundary edges, or edges with more than two owners. A real hole stays a hole. If a closed surface offers multiple paths into the same triangle, retain the shortest local surface path to avoid duplicate overlapping decal geometry.
- Existing `Stickers` and `Sticker Transform` sections, media stack, per-sticker scale/rotation controls, direct drag, HDRI response, timeline, layers policy, persistence, and preview/PNG/video behavior remain unchanged. No new visible control is introduced.

Verification tier: Tier 3
Reason: The sticker vector-build algorithm, placement seed metadata, direct manipulation, preview/export parity, acceptance, and touched projection workload change without modifying dependencies or the Toolcraft runtime.
Run: `npm run verify:quick`, focused surface-chart unit/source tests, a folded-surface browser regression, exact supplied `A.obj`/PNG verification, and targeted sticker drag/scale/rotation performance scenarios.
Skip: The full performance checkpoint is not required for this post-first-working visual correction; the changed geometry-build and interaction paths receive targeted functional and budget coverage.
