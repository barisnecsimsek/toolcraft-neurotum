# Frozen — Product Specification

## Goal

Create a Toolcraft WebGL app that accepts either a user-supplied 3D model or a
user-supplied image converted into a rounded volumetric slab, then reveals the
source object from top to bottom while the remaining region keeps a noisy ice
shell, surface crystals, and gravity-aligned icicles inspired by
`local-reference://desktop/Geometry Node Freeze Effect.blend`. Add a geometry-aware
thermal brush inspired by the supplied 6.733-second screen recording so users
can locally melt and refreeze that same ice without moving the model.

## Source Flow

- Select either `3D` or `Image` as the active source type.
- In `3D` mode, accept one self-contained `GLB`, plain `OBJ`/`STL`, or a ZIP
  package containing glTF/OBJ plus its BIN, MTL, and texture dependencies.
  Prefer GLB because it embeds the complete model in one browser-portable file.
- In `Image` mode, accept one `PNG`, `JPEG`, `WebP`, or `AVIF`, preserve its
  aspect ratio on the front/back faces, and create a centered rounded slab whose
  depth, two-dimensional corner radius, and physical bevel are independently
  adjustable. The textured caps and side wall share one rounded-rectangle
  extrusion, so the image itself never keeps square corners outside the slab.
- Render the front/back source texture as unlit sRGB with tone mapping and the
  frozen-core tint disabled. HDRI, direct light, and exposure continue to affect
  the card edge and all ice geometry, but never alter the underlying image pixels.
- Accept one optional grayscale image through `source.scratchTexture`; decode it
  to bounded linear luminance and use it as a UV-independent triplanar relief map.
- Keep the empty canvas neutral until a real file is attached.
- Center and uniformly fit the imported object without changing canvas size.
- Preserve imported GLB/glTF and packaged OBJ materials and textures for the
  thawed region; use a neutral PBR fallback for formats without authored data.
- Enforce a 30,000-triangle accepted-source ceiling. Prepare eligible static
  meshes to a user-selected 3,000–30,000 rendered-triangle budget, defaulting to
  6,000 while preserving UVs, normals, tangents, and vertex colors. Skinned,
  morph-targeted, shared, or multi-material meshes remain intact when safe
  topology simplification cannot preserve their semantics.

## Product Behavior

- `Thaw Progress = 0` is fully frozen; `1` is fully thawed.
- The thaw front moves from the model's normalized maximum Y to minimum Y.
- Fractal noise perturbs the front; transition width controls the blend band.
- The frozen region renders an expanded transmissive physical ice shell plus
  instanced crystals, lit and reflected by the Delta 2 HDR environment.
- The physical shader blends a clear low-roughness ice lobe with the current
  frost lobe through an object-space Voronoi mask. Both endpoints remain exact;
  intermediate values create cellular frost islands without requiring UVs.
- Imported 3D sources use downward-facing samples and gravity-aligned tapered
  icicles. Image slabs prioritize the lower rounded contour: downward-facing
  sites create full gravity-aligned icicles, lower wall sites create short roots
  that bend from the outward normal toward gravity, and upward-facing sites keep
  frost/crystals without icicles. Both modes disappear through the same thaw
  field.
- Shell, crystals, icicles, and source visibility consume one normalized
  object-space thaw field transformed by `worldToEffect`, so rotating, fitting,
  or scaling the model cannot detach the mask from its surface.
- The scratch image is sampled triplanarly in effect space. Scale, rotation,
  offset, inversion, contrast, displacement, bump, and roughness influence are
  authored independently from the model UV layout.
- Direct model drag and the Toolcraft orientation gizmo update one shared view
  target. Canvas misses remain available to pan/zoom.
- `Paint melt` locks that view target, hides the orientation gizmo, and claims a
  plain primary drag after either a direct raycast hit or a projected brush-disk
  overlap with visible source geometry. On an edge overlap, the 3D brush center
  stays beneath the pointer outside the object so only the intersecting portion
  of the thermal sphere removes frost.
- Brush input deposits additive heat into a bounded 48³ object-space field.
  Heat changes peak temperature and effective radius, Radius changes the base
  footprint, and Structure perturbs the thermal threshold at two scales.
- Positive Refreeze diffuses and exponentially cools heat after release; zero
  keeps the local melt. A local Refreeze action clears only the thermal field.
- Shell, crystals, icicles, and source-core shading multiply the original
  top-down retained-ice mask by the inverse thermal melt signal, so one stroke
  consistently removes every frozen layer and remains correct on side faces.

## Control Section Inventory

### Source

- `source.mode`: active `3D` or `Image` source workflow.
- `source.model`: single 3D-file upload, visible in `3D` mode.
- `source.modelTriangleBudget`: static preview mesh budget, from 3,000 to the
  complete accepted 30,000-triangle source.
- `source.image`: single image upload, visible in `Image` mode.
- `source.imageThickness`: slab depth relative to its shorter face.
- `source.imageCornerRadius`: shared image/slab corner radius from rectangular at
  0% to half the shorter face at 100%, independent of slab depth.
- `source.imageBevel`: rounded-edge radius bounded by current width, height, and
  depth; this is the physical face-to-side transition, not the 2D silhouette.
- `scene.orientation`: hidden-label, non-keyframeable orientation gizmo target.
- Grouping reason: source type, its conditional asset/geometry controls, and the
  editable 3D view belong to the same product entity.

### Thaw Front

- `effect.progress`: thawed height fraction.
- `effect.transition`: width of the noisy blend band.
- `effect.noiseScale`: spatial frequency of the freeze boundary.
- `effect.turbulence`: boundary displacement amplitude.
- Grouping reason: these values define the top-to-bottom thaw field.

### Melt Brush

- `melt.enabled`: geometry-paint mode and model-orbit lock.
- `melt.heat`: deposited energy and modest heat-driven radius dilation.
- `melt.radius`: base object-space brush footprint.
- `melt.structure`: multi-scale breakup of the local melt threshold.
- `melt.refreeze`: cooling/diffusion rate; zero is persistent.
- `melt.action`: local Refreeze command for the current thermal field.
- Grouping reason: these values and the local command jointly own the one
  pointer-driven thermal field.

### Ice Detail

- `ice.shellThickness`: frozen shell displacement.
- `ice.crystalDensity`: 0–100% geometry-relative surface coverage.
- `ice.crystalSize`, `ice.crystalElongation`, `ice.crystalVariation`: crystal form.
- `ice.icicleDensity`: 0–100% eligible underside coverage for 3D or eligible
  gravity-drainage coverage for image slabs, including exact zero. Image 100%
  covers all physical drainage sites rather than producing spikes on every face.
- `ice.icicleLength`, `ice.icicleRadius`, `ice.icicleVariation`: icicle form,
  including actual zero geometry when density, length, or radius is zero.
- `ice.icicleUnderside`: downward-normal threshold for eligible 3D samples;
  hidden for Image because that mode uses its fixed physical drainage profile.
- Grouping reason: these values control generated frozen geometry and workload.

### Ice Surface

- `ice.color`: ice tint.
- `ice.transmission`: transmitted-light weight.
- `ice.ior`: physical index of refraction.
- `ice.roughness`: frozen-surface roughness.
- `ice.roughnessVariation`: procedural roughness modulation inside the current
  frost material.
- Grouping reason: these values define the ice material.

### Material Mask

- `ice.materialMaskCoverage`: clear-ice to frost balance with exact endpoints.
- `ice.materialMaskScale`: object-space Voronoi cell frequency.
- `ice.materialMaskSoftness`: width of the lobe blend around cell boundaries.
- `ice.materialMaskDistortion`: deterministic cell-center jitter.
- `ice.materialMaskSeed`: deterministic pattern selection.
- Grouping reason: these values jointly author the one two-material blend mask.

### Surface Relief

- `source.scratchTexture`: optional grayscale image.
- `scratch.scale`, `scratch.rotation`, `scratch.offset`: triplanar mapping.
- `scratch.invert`, `scratch.contrast`: luminance shaping.
- `scratch.displacement`, `scratch.bump`, `scratch.roughness`: physical response.
- Grouping reason: the texture resource and all controls that interpret it form
  one surface-relief workflow.

### Lighting

- `lighting.environmentIntensity`: HDR reflection and illumination strength.
- `lighting.environmentRotation`: horizontal environment rotation.
- `lighting.exposure`: ACES tone-mapped output exposure.
- Grouping reason: these values tune the one environment-lighting entity.

### Background

- Runtime `export.includeBackground` plus unlabeled `scene.background` color.

### Image Export

- Runtime image format and 2K/4K/8K resolution controls followed by sticky `Export PNG`.

## Runtime Decisions

- Canvas mode: `editable-output`, default 1920×1080, WebGL render scale enabled.
- Preview: visible canvas CSS bounds multiplied by selected render scale from
  1.0 through 2.0, default 2.0. There is no fixed 512 px or interaction-resolution
  cap; high-frequency updates are coalesced without silently lowering quality.
- Interactive envelope: 30,000 accepted source triangles with a default 6,000
  rendered-triangle mesh budget, or one image decoded at a maximum 2048 px long
  edge and converted into a fixed-complexity rounded rectangle extrusion;
  geometry-derived sample pools remain bounded at 48,000 surface crystals and
  12,000 underside icicles, with 0–100% coverage controls. Crystal instances use
  a four-sided primitive and icicles a five-sided, three-height-segment primitive;
  both retain the full coverage capacity and enable instance-frustum culling.
- Renderer: Three.js/WebGL2, unlit/tone-map-independent image faces plus
  `MeshPhysicalMaterial` for the card edge and frozen geometry,
  PMREM-prefiltered Delta 2 HDRI, ACES Filmic tone mapping for lit materials,
  retained source/texture/environment resources, and one canonical pipeline.
  The melt brush adds one fixed 48³ unsigned-byte temperature texture sampled
  trilinearly by all ice materials plus a camera-keyed projected-triangle cache
  for bounded edge-overlap hit recovery.
- Timeline: none; progress is directly authored, and brush cooling is a bounded
  transient simulation response rather than authored or exportable transport.
- Layers: none; the active model and generated ice are one product output.
- Persistence: localStorage for values, canvas, and panel settings; uploaded
  model/image/texture files and decoded GPU resources are intentionally excluded.
- Export: PNG/JPG settings are visible, with `Export PNG` producing the selected
  2K/4K/8K long edge through the standard Toolcraft export helper and a responsive
  512 px tiled render loop.
- Transfer mode: new Toolcraft app. The Blender file is a mathematical effect
  reference, not a reference UI/runtime clone. The supplied MP4 is recorded as
  a Video Reference Study with seven timecoded states and six transition deltas.

## Verification Classification

Verification tier: Tier 4

Reason: the media-import path, schema workload, source topology preparation,
generated ice topology, renderer cost model, and textured-package behavior all
change in response to a reported preview-performance regression.

Run: importer, simplifier, topology, schema, acceptance, and performance Vitest;
`npm run verify:quick`; focused GLB/ZIP and mesh-budget browser acceptance;
targeted model-prepare and preview/camera/export performance paths; protected
performance refresh; direct integrity; `npm run verify:final`; and the real local
browser using the supplied Night King asset.

Skip: timeline, video-export, and layer checks because those surfaces are not
part of the requested product behavior.
